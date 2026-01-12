// ==========================================
// 1. CONFIG & AUTHENTICATION
// ==========================================
const BASE_URL = "https://sparta-backend-5hdj.onrender.com";
let currentUser = null;
let allDocuments = [];
let filteredDocuments = [];
let isEditing = false;
let currentEditId = null;
let deleteTargetCode = null; // State untuk target delete

// === STATE MANAGEMENT UNTUK FILE ===
let newFilesBuffer = {};
let deletedFilesList = [];
let originalFileLinks = "";
let existingFilesFromUI = [];

const UPLOAD_CATEGORIES = [
    { key: "fotoAsal", label: "Foto Toko Existing" },
    { key: "fotoRenovasi", label: "Foto Proses Renovasi" },
    { key: "me", label: "Gambar ME" },
    { key: "sipil", label: "Gambar Sipil" },
    { key: "sketsaAwal", label: "Sketsa Awal (Layout)" },
    { key: "pendukung", label: "Dokumen Pendukung (NIDI, SLO, dll)" },
];

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    initApp();
    setupAutoLogout();
});

function checkAuth() {
    const isAuthenticated = sessionStorage.getItem("authenticated");
    if (isAuthenticated !== "true") {
        window.location.href = "sparta-alfamart.vercel.app";
        return;
    }

    currentUser = {
        email: sessionStorage.getItem("loggedInUserEmail") || "",
        cabang: sessionStorage.getItem("loggedInUserCabang") || "",
        role: sessionStorage.getItem("userRole") || ""
    };

    if (document.getElementById("user-name"))
        document.getElementById("user-name").textContent = currentUser.email || "User";
    if (document.getElementById("user-branch"))
        document.getElementById("user-branch").textContent = currentUser.cabang || "Cabang";

    const btnAddNew = document.getElementById("btn-add-new");
    const filterCabang = document.getElementById("filter-cabang");

    // Logic Role Head Office
    if (currentUser.cabang.toLowerCase() === "head office") {
        if (filterCabang) filterCabang.style.display = "inline-block";
        if (btnAddNew) btnAddNew.style.display = "none";
    } else {
        if (filterCabang) filterCabang.style.display = "none";
        if (btnAddNew) btnAddNew.style.display = "inline-block";
    }
}

// ==========================================
// 2. INITIALIZATION & NAVIGATION
// ==========================================
function initApp() {
    // Navigasi
    const btnAddNew = document.getElementById("btn-add-new");
    if (btnAddNew) btnAddNew.addEventListener("click", () => showForm());
    document.getElementById("btn-back").addEventListener("click", () => showTable());

    // Modal Actions General
    document.getElementById("cancel-logout").addEventListener("click", () => hideModal("modal-logout"));
    document.getElementById("confirm-logout").addEventListener("click", handleLogout);
    document.getElementById("btn-close-error").addEventListener("click", () => hideModal("modal-error"));
    document.getElementById("btn-close-success").addEventListener("click", () => hideModal("modal-success"));

    // === MODAL ACTIONS DELETE (BARU) ===
    // Pastikan ID ini ada di HTML
    const btnCancelDelete = document.getElementById("btn-cancel-delete");
    const btnConfirmDelete = document.getElementById("btn-confirm-delete");
    
    if (btnCancelDelete) btnCancelDelete.addEventListener("click", () => hideModal("modal-delete"));
    if (btnConfirmDelete) btnConfirmDelete.addEventListener("click", executeDelete);

    // Form Handling
    document.getElementById("store-form").addEventListener("submit", handleFormSubmit);

    // Auto-Capitalize Input Logic
    const uppercaseFields = ['kodeToko', 'namaToko'];
    uppercaseFields.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                const start = this.selectionStart;
                const end = this.selectionEnd;
                this.value = this.value.toUpperCase();
                this.setSelectionRange(start, end);
            });
        }
    });

    // Live Formatting Input Angka
    document.querySelectorAll(".input-decimal").forEach(input => {
        input.addEventListener("input", (e) => {
            e.target.value = formatDecimalInput(e.target.value);
        });
    });

    // Search & Filter
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => handleSearch(e.target.value));
    }

    const filterSelect = document.getElementById("filter-cabang");
    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            const keyword = document.getElementById("search-input") ? document.getElementById("search-input").value : "";
            handleSearch(keyword);
        });
    }

    // Load Data Awal
    renderUploadSections();
    fetchDocuments();
}

function resetFormState() {
    newFilesBuffer = {};
    UPLOAD_CATEGORIES.forEach(cat => {
        newFilesBuffer[cat.key] = [];
    });
    deletedFilesList = [];
    originalFileLinks = ""; 
    existingFilesFromUI = []; 

    document.querySelectorAll(".file-preview").forEach(el => el.innerHTML = "");
    document.querySelectorAll(".existing-files-list").forEach(el => el.innerHTML = "");
    document.querySelectorAll("input[type='file']").forEach(el => el.value = "");

    document.getElementById("store-form").reset();
    document.getElementById("error-msg").textContent = "";
}

function showTable() {
    document.getElementById("view-table").style.display = "block";
    document.getElementById("view-form").style.display = "none";
    resetFormState();
    isEditing = false;
    currentEditId = null;
    fetchDocuments();
}

function showForm(data = null) {
    document.getElementById("view-table").style.display = "none";
    document.getElementById("view-form").style.display = "block";
    resetFormState();

    const title = document.getElementById("form-title");
    const inputs = document.querySelectorAll("#store-form input");
    const btnSave = document.getElementById("btn-save");
    const isHeadOffice = currentUser.cabang?.toLowerCase() === "head office";

    inputs.forEach(input => input.disabled = false);
    if (btnSave) btnSave.style.display = "inline-block";

    renderUploadSections(isHeadOffice);

    if (data) {
        // === MODE EDIT ===
        isEditing = true;
        currentEditId = data._id || data.id || data.doc_id || data.kode_toko;

        document.getElementById("kodeToko").value = data.kode_toko || "";
        document.getElementById("namaToko").value = data.nama_toko || "";
        document.getElementById("luasSales").value = formatDecimalInput(data.luas_sales);
        document.getElementById("luasParkir").value = formatDecimalInput(data.luas_parkir);
        document.getElementById("luasGudang").value = formatDecimalInput(data.luas_gudang);

        originalFileLinks = data.file_links || "";
        if (data.file_links) {
            renderExistingFiles(data.file_links);
        }

        if (isHeadOffice) {
            title.textContent = `Detail Data Toko: ${data.nama_toko}`;
            inputs.forEach(input => input.disabled = true);
            if (btnSave) btnSave.style.display = "none";
        } else {
            title.textContent = `Edit Data Toko: ${data.nama_toko}`;
            document.getElementById("kodeToko").disabled = true; // Kode biasanya tidak boleh diubah saat edit
        }
    } else {
        // === MODE TAMBAH ===
        isEditing = false;
        currentEditId = null;
        title.textContent = "Tambah Data Toko Baru";
    }
}

// ==========================================
// 3. UI HELPERS & RENDERERS
// ==========================================
function renderUploadSections(isReadOnly = false) {
    const container = document.getElementById("upload-container");
    if (!container) return;
    container.innerHTML = "";

    const groups = [
        { title: "Foto (JPG, JPEG, PNG)", keys: ["fotoAsal", "fotoRenovasi"] },
        { title: "Gambar (PDF, Gambar)", keys: ["me", "sipil", "sketsaAwal"] },
        { title: "Dokumen (PDF, Gambar)", keys: ["pendukung"] }
    ];

    groups.forEach(group => {
        const groupWrapper = document.createElement("div");
        groupWrapper.className = "upload-section-group";
        groupWrapper.innerHTML = `<h4 class="upload-section-title">📂 ${group.title}</h4>`;

        const gridDiv = document.createElement("div");
        gridDiv.className = "upload-grid";

        group.keys.forEach(key => {
            const cat = UPLOAD_CATEGORIES.find(c => c.key === key);
            if (!cat) return;
            if (!newFilesBuffer[key]) newFilesBuffer[key] = [];

            const section = document.createElement("div");
            section.className = "upload-group";
            const displayInput = isReadOnly ? "none" : "block";

            section.innerHTML = `
                <label class="upload-label">${cat.label}</label>
                <div id="existing-${cat.key}" class="existing-files-list"></div>
                <input type="file" id="file-${cat.key}" multiple accept="image/*,.pdf" 
                       style="margin-top: auto; display: ${displayInput};">
                <div class="file-preview" id="preview-${cat.key}"></div>
            `;
            gridDiv.appendChild(section);
        });
        groupWrapper.appendChild(gridDiv);
        container.appendChild(groupWrapper);
    });

    if (!isReadOnly) {
        UPLOAD_CATEGORIES.forEach(cat => {
            const input = document.getElementById(`file-${cat.key}`);
            if (input) {
                input.addEventListener("change", (e) => {
                    const files = Array.from(e.target.files);
                    if (files.length === 0) return;
                    files.forEach(f => {
                        const isDuplicate = newFilesBuffer[cat.key].some(existing => existing.name === f.name);
                        if (!isDuplicate) {
                            newFilesBuffer[cat.key].push(f);
                        }
                    });
                    updatePreviewUI(cat.key);
                    input.value = "";
                });
            }
        });
    }
}

function updatePreviewUI(categoryKey) {
    const previewDiv = document.getElementById(`preview-${categoryKey}`);
    if (!previewDiv) return;
    previewDiv.innerHTML = "";

    const files = newFilesBuffer[categoryKey];
    files.forEach((file, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "preview-wrapper";

        const btnRemove = document.createElement("button");
        btnRemove.className = "btn-remove-preview";
        btnRemove.innerHTML = "&times;";
        btnRemove.type = "button";
        btnRemove.onclick = () => {
            newFilesBuffer[categoryKey].splice(index, 1);
            updatePreviewUI(categoryKey);
        };

        if (file.type.startsWith('image/')) {
            const img = document.createElement("img");
            img.className = "preview-thumb";
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(file);
            wrapper.appendChild(img);
        } else {
            const docEl = document.createElement("div");
            docEl.className = "preview-file-item";
            let icon = "📄";
            if (file.type.includes('pdf')) icon = "📑";
            docEl.innerHTML = `<span class="preview-file-icon">${icon}</span> <span class="preview-file-name">${file.name}</span>`;
            wrapper.appendChild(docEl);
        }
        wrapper.appendChild(btnRemove);
        previewDiv.appendChild(wrapper);
    });
}

function renderExistingFiles(fileLinksString) {
    if (!fileLinksString) return;
    const entries = fileLinksString.split(",").map(s => s.trim()).filter(Boolean);
    const isHeadOffice = currentUser.cabang?.toLowerCase() === "head office";
    existingFilesFromUI = [...entries];

    entries.forEach(entry => {
        const parts = entry.split("|");
        let category = "pendukung";
        let name = "File";
        let url = "#";

        if (parts.length === 3) {
            category = parts[0].trim();
            name = parts[1].trim();
            url = parts[2].trim();
        } else if (parts.length === 2) {
            name = parts[0].trim();
            url = parts[1].trim();
        } else {
            url = entry.trim();
        }

        const container = document.getElementById(`existing-${category}`) || document.getElementById("existing-pendukung");
        if (container) {
            const fileItem = document.createElement("div");
            fileItem.className = "existing-file-item";
            let deleteBtnHtml = "";
            if (!isHeadOffice) {
                const safeCategory = category.replace(/'/g, "\\'");
                const safeName = name.replace(/'/g, "\\'");
                const safeUrl = url.trim().replace(/'/g, "\\'");
                deleteBtnHtml = `<button type="button" class="btn-delete-existing" onclick="markFileForDeletion(this, '${safeCategory}', '${safeName}', '${safeUrl}')">🗑️ Hapus</button>`;
            }
            fileItem.innerHTML = `
                <a href="${url}" target="_blank" class="file-link">📎 ${name}</a>
                ${deleteBtnHtml}
            `;
            container.appendChild(fileItem);
        }
    });
}

window.markFileForDeletion = function (btnElement, category, fileName, fileUrl) {
    if (!fileUrl || fileUrl === "#" || fileUrl.trim() === "") {
        alert("URL file tidak valid.");
        return;
    }
    if (confirm(`Hapus file "${fileName}"?\nFile akan hilang permanen setelah Anda klik tombol Simpan.`)) {
        const deleteItem = { category: category.trim(), filename: fileName.trim(), url: fileUrl.trim() };
        const isDuplicate = deletedFilesList.some(item => item.url === deleteItem.url && item.filename === deleteItem.filename);
        if (!isDuplicate) deletedFilesList.push(deleteItem);
        const parent = btnElement.closest(".existing-file-item");
        if (parent) parent.style.display = "none";
    }
};

// ==========================================
// 4. DATA FETCHING & TABLE
// ==========================================
async function fetchDocuments() {
    showLoading(true);
    try {
        let url = `${BASE_URL}/api/doc/list`;
        if (currentUser.cabang && currentUser.cabang.toLowerCase() !== "head office") {
            url += `?cabang=${encodeURIComponent(currentUser.cabang)}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Gagal mengambil data dari server");
        const rawData = await res.json();
        
        if (Array.isArray(rawData)) {
            allDocuments = rawData;
        } else if (rawData.items && Array.isArray(rawData.items)) {
            allDocuments = rawData.items;
        } else if (rawData.data && Array.isArray(rawData.data)) {
            allDocuments = rawData.data;
        } else {
            allDocuments = [];
        }

        updateCabangFilterOptions();
        const searchInput = document.getElementById("search-input");
        const keyword = searchInput ? searchInput.value : "";
        handleSearch(keyword);
    } catch (err) {
        console.error("Error fetching:", err);
        showToast("Gagal memuat data: " + err.message);
        allDocuments = [];
        renderTable();
    } finally {
        showLoading(false);
    }
}

function handleSearch(keyword) {
    if (typeof keyword !== 'string') keyword = "";
    const term = keyword.toLowerCase();
    const filterSelect = document.getElementById("filter-cabang");
    const filterCabang = filterSelect ? filterSelect.value : "";

    filteredDocuments = allDocuments.filter(doc => {
        const kode = (doc.kode_toko || "").toString().toLowerCase();
        const nama = (doc.nama_toko || "").toString().toLowerCase();
        const cabang = (doc.cabang || "").toString();
        const matchText = kode.includes(term) || nama.includes(term);
        const matchCabang = filterCabang === "" || cabang === filterCabang;
        return matchText && matchCabang;
    });
    filteredDocuments.reverse();
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById("table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (filteredDocuments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #666;">Tidak ada data ditemukan</td></tr>`;
        return;
    }

    const isHeadOffice = currentUser.cabang?.toLowerCase() === "head office";
    const actionLabel = isHeadOffice ? "Lihat" : "Edit";
    const actionClass = isHeadOffice ? "btn-view" : "btn-edit";

    filteredDocuments.forEach((doc, index) => {
        const row = document.createElement("tr");
        const folderUrl = doc.folder_link || doc.folder_drive || doc.folder_url || "";
        const linkHtml = folderUrl
            ? `<a href="${folderUrl}" target="_blank" style="text-decoration: none; color: #007bff; font-weight:500;">📂 Buka Folder</a>`
            : `<span style="color: #999;">-</span>`;

        // === LOGIC BUTTON DELETE ===
        // Hanya muncul jika BUKAN Head Office
        let deleteButtonHtml = "";
        if (!isHeadOffice) {
            deleteButtonHtml = `
                <button class="btn-action btn-delete" 
                    onclick="prepareDelete('${doc.kode_toko}', '${doc.nama_toko}')">
                    Hapus
                </button>
            `;
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${doc.kode_toko || "-"}</td>
            <td><b>${doc.nama_toko || "-"}</b></td>
            <td>${doc.cabang || "-"}</td>
            <td>${linkHtml}</td>
            <td>
                <button class="btn-action ${actionClass}" onclick="handleEditClick('${doc._id || doc.id || doc.kode_toko}')">${actionLabel}</button>
                ${deleteButtonHtml} 
            </td>
        `;
        tbody.appendChild(row);
    });
}

// === NEW: LOGIC DELETE DATA ===
window.prepareDelete = function(kodeToko, namaToko) {
    deleteTargetCode = kodeToko;
    
    // Update teks di modal biar informatif
    const targetNameEl = document.getElementById("delete-target-name");
    const targetCodeEl = document.getElementById("delete-target-code");
    
    if (targetNameEl) targetNameEl.textContent = namaToko;
    if (targetCodeEl) targetCodeEl.textContent = kodeToko;
    
    showModal("modal-delete");
};

async function executeDelete() {
    if (!deleteTargetCode) return;
    
    showLoading(true);
    hideModal("modal-delete"); // Tutup modal konfirmasi
    
    try {
        // === FIX ENDPOINT SESUAI REQUEST ===
        // Endpoint: /api/doc/delete/<kode_toko>
        const url = `${BASE_URL}/api/doc/delete/${encodeURIComponent(deleteTargetCode)}`; 
        
        const res = await fetch(url, {
            method: "DELETE",
            headers: { 
                "Content-Type": "application/json" 
            }
        });

        // Handle response jika text kosong atau JSON
        let result;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            result = await res.json();
        } else {
            result = { message: await res.text() };
        }

        if (!res.ok) throw new Error(result.message || result.detail || "Gagal menghapus data");

        showToast("Data toko berhasil dihapus");
        
        // Refresh tabel
        fetchDocuments();

    } catch (err) {
        console.error("Delete Error:", err);
        document.getElementById("error-msg").textContent = "Gagal hapus: " + err.message;
        showModal("modal-error");
    } finally {
        showLoading(false);
        deleteTargetCode = null; // Reset state
    }
}

window.handleEditClick = function (idOrCode) {
    const doc = allDocuments.find(d =>
        String(d._id) === String(idOrCode) ||
        String(d.id) === String(idOrCode) ||
        String(d.kode_toko) === String(idOrCode)
    );
    if (doc) {
        showForm(doc);
    } else {
        console.error("Dokumen tidak ditemukan untuk ID:", idOrCode);
    }
};

function updateCabangFilterOptions() {
    const select = document.getElementById("filter-cabang");
    if (!select) return;
    const currentValue = select.value;
    const cabangSet = new Set();
    allDocuments.forEach(doc => { if (doc.cabang) cabangSet.add(doc.cabang); });
    select.innerHTML = '<option value="">Semua Cabang</option>';
    Array.from(cabangSet).sort().forEach(cabang => {
        const option = document.createElement("option");
        option.value = cabang;
        option.textContent = cabang;
        select.appendChild(option);
    });
    if (currentValue && cabangSet.has(currentValue)) select.value = currentValue;
}

// ==========================================
// 5. SUBMIT HANDLER
// ==========================================
async function handleFormSubmit(e) {
    e.preventDefault();
    showLoading(true);
    document.getElementById("error-msg").textContent = "";

    try {
        const payload = {
            kode_toko: document.getElementById("kodeToko").value,
            nama_toko: document.getElementById("namaToko").value,
            luas_sales: document.getElementById("luasSales").value,
            luas_parkir: document.getElementById("luasParkir").value,
            luas_gudang: document.getElementById("luasGudang").value,
            cabang: currentUser.cabang || "",
            pic_name: currentUser.email || "",
            files: []
        };

        deletedFilesList.forEach(item => {
            payload.files.push({ category: item.category, filename: item.filename, deleted: true });
        });

        const fileToBase64 = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        };

        const filePromises = [];
        UPLOAD_CATEGORIES.forEach(cat => {
            const filesInBuffer = newFilesBuffer[cat.key] || [];
            filesInBuffer.forEach(file => {
                const promise = fileToBase64(file).then(base64String => {
                    payload.files.push({
                        category: cat.key,
                        filename: file.name,
                        type: file.type,
                        data: base64String
                    });
                });
                filePromises.push(promise);
            });
        });

        await Promise.all(filePromises);

        let url = `${BASE_URL}/api/doc/save`;
        let method = "POST";
        if (isEditing && currentEditId) {
            url = `${BASE_URL}/api/doc/update/${currentEditId}`;
            method = "PUT";
        }

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.detail || result.message || "Gagal menyimpan data");

        showModal("modal-success");

    } catch (err) {
        console.error(err);
        document.getElementById("error-msg").textContent = err.message;
        showModal("modal-error");
    } finally {
        showLoading(false);
    }
}

// ==========================================
// 6. UTILS & MODAL ACTIONS
// ==========================================
function formatDecimalInput(value) {
    if (!value) return "";
    let str = value.toString().replace(/[^0-9]/g, "");
    if (str.length === 0) return "";
    if (str.length <= 2) return "0," + str.padStart(2, "0");
    const before = str.slice(0, -2);
    const after = str.slice(-2);
    return `${parseInt(before, 10)},${after}`;
}

function showModal(id) { document.getElementById(id).style.display = "flex"; }
function hideModal(id) {
    document.getElementById(id).style.display = "none";
    if (id === "modal-success") showTable();
}

function showLoading(show) {
    const el = document.getElementById("loading-overlay");
    if (el) el.style.display = show ? "flex" : "none";
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = "toast show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
}

function handleLogout() {
    sessionStorage.clear();
    window.location.href = "sparta-alfamart.vercel.app";
}

let idleTime = 0;
function setupAutoLogout() {
    setInterval(() => {
        idleTime++;
        if (idleTime >= 30) handleLogout();
    }, 60000);
    ['mousemove', 'keypress', 'click', 'scroll'].forEach(evt => document.addEventListener(evt, () => idleTime = 0));
}