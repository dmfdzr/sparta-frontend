// ============================================
// KONFIGURASI & STATE
// ============================================
const BASE_URL = "https://penyimpanan-dokumen-s8p6.onrender.com"; // Sesuaikan jika perlu
const CATEGORIES = ["fotoAsal", "fotoRenovasi", "me", "sipil", "sketsaAwal", "pendukung"];

const state = {
    user: JSON.parse(localStorage.getItem("user")) || null,
    docs: [],
    currentPage: 1,
    rowsPerPage: 5,
    filesToUpload: {}, // Menyimpan file baru (Base64)
    existingFiles: {}, // Menyimpan file lama (untuk edit)
    isEditing: false
};

// ============================================
// INISIALISASI
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
    setupNumberInputs();
});

function initApp() {
    if (state.user) {
        showDashboard();
    } else {
        showLogin();
        checkOperationalHours();
    }
}

// ============================================
// AUTHENTICATION
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("username").value.trim().toLowerCase();
    const password = document.getElementById("password").value.trim().toUpperCase();
    const alertBox = document.getElementById("loginAlert");

    setLoading(true);
    alertBox.classList.add("hidden");

    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.ok) {
            state.user = data.user;
            localStorage.setItem("user", JSON.stringify(state.user));
            showDashboard();
            showToast("Login Berhasil!");
        } else {
            throw new Error(data.detail || "Login Gagal");
        }
    } catch (err) {
        alertBox.textContent = err.message;
        alertBox.classList.remove("hidden");
    } finally {
        setLoading(false);
    }
}

function handleLogout() {
    if (confirm("Yakin ingin logout?")) {
        localStorage.removeItem("user");
        state.user = null;
        window.location.reload();
    }
}

// Cek Jam Kerja (Client Side Logic)
function checkOperationalHours() {
    const timeInfo = document.getElementById("timeInfo");
    const updateTime = () => {
        const now = new Date();
        const wibTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        const hour = wibTime.getHours();
        
        if (hour < 6 || hour >= 18) {
            timeInfo.textContent = "⚠️ Di luar jam operasional (06:00 - 18:00 WIB)";
            timeInfo.style.color = "red";
        } else {
            timeInfo.textContent = "✅ Jam Operasional Aktif";
            timeInfo.style.color = "green";
        }
    };
    updateTime();
    setInterval(updateTime, 60000);
}

// ============================================
// DASHBOARD & DATA
// ============================================
async function fetchDocuments() {
    setLoading(true);
    try {
        const userCabang = state.user.cabang === "HEAD OFFICE" ? "" : state.user.cabang;
        // Jika HEAD OFFICE, ambil semua (cabang kosong), jika tidak, filter by cabang
        let url = `${BASE_URL}/documents`;
        if (userCabang) url += `?cabang=${encodeURIComponent(userCabang)}`;

        const res = await fetch(url);
        const data = await res.json();
        
        if (data.ok) {
            state.docs = data.items;
            renderTable();
        }
    } catch (err) {
        console.error(err);
        showToast("Gagal mengambil data dokumen");
    } finally {
        setLoading(false);
    }
}

function renderTable() {
    const tbody = document.getElementById("tableBody");
    const search = document.getElementById("searchInput").value.toLowerCase();
    
    // Filter
    let filtered = state.docs.filter(d => 
        (d.kode_toko || "").toLowerCase().includes(search) || 
        (d.nama_toko || "").toLowerCase().includes(search)
    );

    // Pagination
    const totalPages = Math.ceil(filtered.length / state.rowsPerPage);
    if (state.currentPage > totalPages) state.currentPage = 1;
    
    const start = (state.currentPage - 1) * state.rowsPerPage;
    const currentData = filtered.slice(start, start + state.rowsPerPage);

    tbody.innerHTML = "";
    
    if (currentData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Tidak ada data.</td></tr>`;
        return;
    }

    currentData.forEach((row, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${start + index + 1}</td>
            <td><strong>${row.kode_toko || "-"}</strong></td>
            <td>${row.nama_toko || "-"}</td>
            <td>${row.cabang || "-"}</td>
            <td>${row.waktu_upload || "-"}</td>
            <td>
                <a href="${row.folder_link}" target="_blank" class="action-btn btn-link">📂 Drive</a>
                <button class="action-btn btn-edit" onclick="openEditForm('${row.kode_toko}')">✏️ Edit</button>
                ${state.user.jabatan.includes("COORDINATOR") ? 
                    `<button class="action-btn btn-del" onclick="deleteDocument('${row.kode_toko}')">🗑️ Hapus</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Update Pagination UI
    document.getElementById("pageInfo").textContent = `Halaman ${state.currentPage} dari ${totalPages || 1}`;
    document.getElementById("prevPage").disabled = state.currentPage === 1;
    document.getElementById("nextPage").disabled = state.currentPage >= totalPages;
}

// ============================================
// FORM & UPLOAD LOGIC
// ============================================
function generateUploadFields() {
    const container = document.getElementById("uploadContainer");
    container.innerHTML = "";

    CATEGORIES.forEach(cat => {
        const div = document.createElement("div");
        div.className = "upload-category";
        div.innerHTML = `
            <h4>${formatCategoryName(cat)}</h4>
            <input type="file" multiple onchange="handleFileSelect(event, '${cat}')">
            <div id="preview-${cat}" class="file-preview-list"></div>
        `;
        container.appendChild(div);
    });
}

function handleFileSelect(e, category) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Pastikan array category ada
    if (!state.filesToUpload[category]) state.filesToUpload[category] = [];

    files.forEach(file => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result; // "data:image/jpeg;base64,....."
            
            // Simpan ke state
            state.filesToUpload[category].push({
                filename: file.name,
                type: file.type,
                data: base64, // Penting! Kirim ini ke backend
                category: category
            });

            renderPreviews(category);
        };
    });
    
    // Reset input agar bisa pilih file sama lagi jika perlu
    e.target.value = "";
}

function renderPreviews(category) {
    const container = document.getElementById(`preview-${category}`);
    container.innerHTML = "";

    // 1. Render Existing Files (File Lama)
    const existing = state.existingFiles[category] || [];
    existing.forEach((file, idx) => {
        const el = document.createElement("div");
        el.className = "file-preview";
        el.style.background = "#e0f2fe"; // Pembeda warna
        el.innerHTML = `
            <a href="${file.url}" target="_blank">🔗 ${file.name}</a>
            `;
        container.appendChild(el);
    });

    // 2. Render New Files (File Baru)
    const newFiles = state.filesToUpload[category] || [];
    newFiles.forEach((file, idx) => {
        const el = document.createElement("div");
        el.className = "file-preview";
        el.innerHTML = `
            <span>📄 ${file.filename}</span>
            <button type="button" class="btn-remove-file" onclick="removeNewFile('${category}', ${idx})">×</button>
        `;
        container.appendChild(el);
    });
}

function removeNewFile(category, index) {
    state.filesToUpload[category].splice(index, 1);
    renderPreviews(category);
}

function resetForm() {
    document.getElementById("storeForm").reset();
    state.filesToUpload = {};
    state.existingFiles = {};
    state.isEditing = false;
    document.getElementById("editModeKode").value = "";
    document.getElementById("formTitle").textContent = "Form Dokumen Toko";
    document.getElementById("kodeToko").disabled = false;
    
    // Kosongkan preview
    CATEGORIES.forEach(cat => {
        const el = document.getElementById(`preview-${cat}`);
        if(el) el.innerHTML = "";
    });
}

// Populate form untuk Edit
window.openEditForm = (kodeToko) => {
    const doc = state.docs.find(d => d.kode_toko === kodeToko);
    if (!doc) return;

    resetForm();
    state.isEditing = true;
    document.getElementById("formTitle").textContent = `Edit Toko: ${doc.nama_toko}`;
    document.getElementById("editModeKode").value = doc.kode_toko;
    
    // Isi field
    document.getElementById("kodeToko").value = doc.kode_toko;
    document.getElementById("kodeToko").disabled = true; // Primary key tidak boleh ubah
    document.getElementById("namaToko").value = doc.nama_toko;
    document.getElementById("cabangInput").value = doc.cabang;
    document.getElementById("luasSales").value = formatNumber(doc.luas_sales);
    document.getElementById("luasParkir").value = formatNumber(doc.luas_parkir);
    document.getElementById("luasGudang").value = formatNumber(doc.luas_gudang);

    // Parsing file links dari string spreadsheet
    // Format: "category|filename|url, category|filename|url"
    if (doc.file_links) {
        const links = doc.file_links.split(", ");
        links.forEach(link => {
            const parts = link.split("|");
            if (parts.length >= 3) {
                const [cat, name, url] = parts;
                const cleanCat = cat.trim();
                if (!state.existingFiles[cleanCat]) state.existingFiles[cleanCat] = [];
                state.existingFiles[cleanCat].push({ name, url });
            }
        });
    }

    // Render ulang semua preview
    CATEGORIES.forEach(cat => renderPreviews(cat));

    showForm();
};

async function handleSave(e) {
    e.preventDefault();
    setLoading(true);

    const kodeToko = document.getElementById("kodeToko").value;
    
    // Kumpulkan semua file baru dari state
    let allFiles = [];
    Object.keys(state.filesToUpload).forEach(cat => {
        allFiles = [...allFiles, ...state.filesToUpload[cat]];
    });

    const payload = {
        kode_toko: kodeToko,
        nama_toko: document.getElementById("namaToko").value,
        cabang: document.getElementById("cabangInput").value,
        luas_sales: document.getElementById("luasSales").value,
        luas_parkir: document.getElementById("luasParkir").value,
        luas_gudang: document.getElementById("luasGudang").value,
        files: allFiles // Array of {category, filename, data(base64)}
    };

    try {
        let url = `${BASE_URL}/save-document-base64/`;
        let method = "POST";

        if (state.isEditing) {
            url = `${BASE_URL}/document/${kodeToko}`;
            method = "PUT";
        }

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        const json = await res.json();
        
        if (json.ok) {
            showToast("Data berhasil disimpan!");
            resetForm();
            showListView();
            fetchDocuments(); // Refresh data
        } else {
            throw new Error(json.message || "Gagal menyimpan");
        }
    } catch (err) {
        console.error(err);
        showToast("Error: " + err.message);
    } finally {
        setLoading(false);
    }
}

window.deleteDocument = async (kodeToko) => {
    if (!confirm(`Hapus data toko ${kodeToko}? Data di Drive juga akan terhapus.`)) return;

    setLoading(true);
    try {
        const res = await fetch(`${BASE_URL}/document/${kodeToko}`, {
            method: "DELETE"
        });
        const json = await res.json();
        if (json.ok) {
            showToast("Data dihapus.");
            fetchDocuments();
        } else {
            alert("Gagal hapus: " + json.detail);
        }
    } catch (err) {
        alert("Error server");
    } finally {
        setLoading(false);
    }
};

// ============================================
// HELPER & UTILS
// ============================================
function showLogin() {
    document.getElementById("loginSection").classList.remove("hidden");
    document.getElementById("dashboardSection").classList.add("hidden");
}

function showDashboard() {
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("dashboardSection").classList.remove("hidden");
    document.getElementById("userWelcome").textContent = `Halo, ${state.user.nama}`;
    showListView();
    fetchDocuments();
    generateUploadFields();
}

function showListView() {
    document.getElementById("listView").classList.remove("hidden");
    document.getElementById("formView").classList.add("hidden");
}

function showForm() {
    document.getElementById("listView").classList.add("hidden");
    document.getElementById("formView").classList.remove("hidden");
}

function setLoading(bool) {
    const modal = document.getElementById("loadingModal");
    if (bool) modal.classList.remove("hidden");
    else modal.classList.add("hidden");
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
}

function formatCategoryName(str) {
    // fotoAsal -> Foto Asal
    return str.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
}

function formatNumber(val) {
    if (!val) return "";
    return val.toString(); // Sederhana, bisa ditambah logic ribuan jika perlu
}

function setupEventListeners() {
    // Login & Logout
    document.getElementById("loginForm").addEventListener("submit", handleLogin);
    document.getElementById("logoutBtn").addEventListener("click", handleLogout);
    
    // Toggle Password
    document.getElementById("togglePassword").addEventListener("click", () => {
        const input = document.getElementById("password");
        input.type = input.type === "password" ? "text" : "password";
    });

    // Navigasi View
    document.getElementById("btnAdd").addEventListener("click", () => {
        resetForm();
        showForm();
    });
    document.getElementById("btnBack").addEventListener("click", showListView);
    document.getElementById("btnCancel").addEventListener("click", showListView);
    
    // Form Submit
    document.getElementById("storeForm").addEventListener("submit", handleSave);

    // Search & Pagination
    document.getElementById("searchInput").addEventListener("input", () => {
        state.currentPage = 1;
        renderTable();
    });
    document.getElementById("prevPage").addEventListener("click", () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderTable();
        }
    });
    document.getElementById("nextPage").addEventListener("click", () => {
        state.currentPage++;
        renderTable();
    });
}

function setupNumberInputs() {
    // Auto format angka (sederhana: izinkan angka dan koma)
    document.querySelectorAll(".number-input").forEach(input => {
        input.addEventListener("input", (e) => {
            let val = e.target.value;
            // Hanya angka dan koma
            val = val.replace(/[^0-9,]/g, "");
            e.target.value = val;
        });
    });
}