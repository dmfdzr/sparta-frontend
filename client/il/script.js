/**
 * Script Instruksi Lapangan (IL)
 * Integrasi: Auth, Layout Baru, Auto-Calculation
 */

// --- 1. Configuration & Constants ---
const CONFIG = {
    API_BASE_URL: "https://sparta-backend-5hdj.onrender.com",
    SIPIL_CATEGORIES: [
        "PEKERJAAN PERSIAPAN", "PEKERJAAN BOBOKAN / BONGKARAN", "PEKERJAAN TANAH",
        "PEKERJAAN PONDASI & BETON", "PEKERJAAN PASANGAN", "PEKERJAAN BESI",
        "PEKERJAAN KERAMIK", "PEKERJAAN PLUMBING", "PEKERJAAN SANITARY & ACECORIES",
        "PEKERJAAN JANITOR", "PEKERJAAN ATAP", "PEKERJAAN KUSEN, PINTU & KACA",
        "PEKERJAAN FINISHING", "PEKERJAAN BEANSPOT", "PEKERJAAN AREA TERBUKA",
        "PEKERJAAN TAMBAHAN", "PEKERJAAN SBO"
    ],
    ME_CATEGORIES: [
        "INSTALASI", "FIXTURE", "PEKERJAAN TAMBAHAN", "PEKERJAAN SBO"
    ],
    BRANCH_GROUPS: {
        "BANDUNG 1": ["BANDUNG 1", "BANDUNG 2"],
        "BANDUNG 2": ["BANDUNG 1", "BANDUNG 2"],
        "LOMBOK": ["LOMBOK", "SUMBAWA"],
        "SUMBAWA": ["LOMBOK", "SUMBAWA"],
        "MEDAN": ["MEDAN", "ACEH"],
        "ACEH": ["MEDAN", "ACEH"],
        "PALEMBANG": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "BENGKULU": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "BANGKA": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "BELITUNG": ["PALEMBANG", "BENGKULU", "BANGKA", "BELITUNG"],
        "SIDOARJO": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "SIDOARJO BPN_SMD": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "MANOKWARI": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "NTT": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"],
        "SORONG": ["SIDOARJO", "SIDOARJO BPN_SMD", "MANOKWARI", "NTT", "SORONG"]
    },
    BRANCH_ULOK_MAP: {
        "LUWU": "2VZ1", "KARAWANG": "1JZ1", "REMBANG": "2AZ1",
        "BANJARMASIN": "1GZ1", "PARUNG": "1MZ1", "TEGAL": "2PZ1", "GORONTALO": "2SZ1",
        "PONTIANAK": "1PZ1", "LOMBOK": "1SZ1", "KOTABUMI": "1VZ1", "SERANG": "2GZ1",
        "CIANJUR": "2JZ1", "BALARAJA": "TZ01", "SIDOARJO": "UZ01", "MEDAN": "WZ01",
        "BOGOR": "XZ01", "JEMBER": "YZ01", "BALI": "QZ01", "PALEMBANG": "PZ01",
        "KLATEN": "OZ01", "MAKASSAR": "RZ01", "PLUMBON": "VZ01", "PEKANBARU": "1AZ1",
        "JAMBI": "1DZ1", "HEAD OFFICE": "Z001", "BANDUNG 1": "BZ01", "BANDUNG 2": "NZ01",
        "BEKASI": "CZ01", "CILACAP": "IZ01", "CILEUNGSI2": "JZ01", "SEMARANG": "HZ01",
        "CIKOKOL": "KZ01", "LAMPUNG": "LZ01", "MALANG": "MZ01", "MANADO": "1YZ1",
        "BATAM": "2DZ1", "MADIUN": "2MZ1"
    }
};

// --- 2. State Management ---
const STATE = {
    categorizedPrices: { sipil: {}, me: {} },
    pendingStoreCodes: [],
    approvedStoreCodes: [],
    rejectedSubmissionsList: [],
    originalFormData: null
};

// --- 3. DOM References ---
let DOM = {};

// --- 4. Utilities ---
const Utils = {
    formatRupiah: (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n),
    parseRupiah: (s) => parseFloat(String(s).replace(/Rp\s?|\./g, "").replace(/,/g, ".")) || 0,
    formatNumberWithSeparators: (num) => (num === null || isNaN(num)) ? '0' : new Intl.NumberFormat('id-ID').format(num),
    parseFormattedNumber: (str) => typeof str !== 'string' ? (Number(str) || 0) : (parseFloat(String(str).replace(/\./g, '').replace(/,/g, '.')) || 0),
    
    initializeSelect2: (selector) => { $(selector).select2({ width: '100%' }); },

    toggleMessage: (text, type = 'info') => {
        DOM.messageDiv.textContent = text;
        DOM.messageDiv.style.display = 'block';
        DOM.messageDiv.className = ''; // Reset class
        
        if (type === 'error') {
            DOM.messageDiv.classList.add('bg-red-100', 'text-red-700', 'border', 'border-red-200');
        } else if (type === 'success') {
            DOM.messageDiv.classList.add('bg-green-100', 'text-green-700', 'border', 'border-green-200');
        } else if (type === 'warning') {
            DOM.messageDiv.classList.add('bg-yellow-100', 'text-yellow-800', 'border', 'border-yellow-200');
        } else {
            DOM.messageDiv.classList.add('bg-blue-100', 'text-blue-700', 'border', 'border-blue-200');
        }
        
        // Auto scroll to message
        DOM.messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    getCurrentFormData: () => {
        const formData = new FormData(DOM.form);
        const data = Object.fromEntries(formData.entries());
        let itemIndex = 1;
        document.querySelectorAll(".boq-table-body:not(.hidden) .boq-item-row").forEach(row => {
            if (row.querySelector('.jenis-pekerjaan').value && parseFloat(row.querySelector('.volume').value) > 0) {
                // Simplified for comparison
                data[`row_${itemIndex}`] = row.querySelector('.jenis-pekerjaan').value + row.querySelector('.volume').value;
                itemIndex++;
            }
        });
        return JSON.stringify(data);
    }
};

const handleCurrencyInput = (event) => {
    const input = event.target;
    let numericValue = input.value.replace(/[^0-9]/g, '');
    input.value = numericValue === '' ? '' : Utils.formatNumberWithSeparators(parseInt(numericValue, 10));
    calculateTotalPrice(input);
};

// --- 5. Core Logic ---
const populateJenisPekerjaanOptionsForNewRow = (rowElement) => {
    const category = rowElement.dataset.category;
    const scope = rowElement.dataset.scope;
    const selectEl = rowElement.querySelector(".jenis-pekerjaan");
    const dataSource = (scope === "Sipil") ? STATE.categorizedPrices.sipil : STATE.categorizedPrices.me;
    const itemsInCategory = dataSource ? (dataSource[category] || []) : [];

    const selectedValues = Array.from(document.querySelectorAll(`.boq-table-body[data-category="${category}"] .jenis-pekerjaan`)).map(sel => sel.value).filter(v => v !== "");

    selectEl.innerHTML = '<option value="">-- Pilih Jenis Pekerjaan --</option>';
    if (itemsInCategory.length > 0) {
        itemsInCategory.forEach(item => {
            const option = document.createElement("option");
            option.value = item["Jenis Pekerjaan"];
            option.textContent = item["Jenis Pekerjaan"];
            if (selectedValues.includes(item["Jenis Pekerjaan"])) option.disabled = true;
            selectEl.appendChild(option);
        });
    }
};

const refreshJenisPekerjaanOptions = (category) => {
    const selects = document.querySelectorAll(`.boq-table-body[data-category="${category}"] .jenis-pekerjaan`);
    const selectedValues = Array.from(selects).map(sel => sel.value).filter(v => v !== "");
    selects.forEach(select => {
        const currentValue = select.value;
        Array.from(select.options).forEach(opt => {
            if (opt.value === "") return;
            opt.disabled = (opt.value !== currentValue && selectedValues.includes(opt.value));
        });
    });
};

const autoFillPrices = (selectElement) => {
    const row = selectElement.closest("tr");
    if (!row) return;

    const selectedJenisPekerjaan = selectElement.value;
    const currentCategory = row.dataset.category;
    const scope = DOM.lingkupPekerjaanSelect.value;
    const dataSource = (scope === "Sipil") ? STATE.categorizedPrices.sipil : STATE.categorizedPrices.me;
    
    const els = {
        volume: row.querySelector(".volume"),
        material: row.querySelector(".harga-material"),
        upah: row.querySelector(".harga-upah"),
        satuan: row.querySelector(".satuan")
    };

    Object.values(els).forEach(el => el.classList.remove('auto-filled', 'kondisional-input'));

    if (!selectedJenisPekerjaan) {
        els.volume.value = "0.00"; els.volume.readOnly = false;
        els.material.value = "0"; els.material.readOnly = true;
        els.upah.value = "0"; els.upah.readOnly = true;
        els.satuan.value = "";
    } else {
        const selectedItem = dataSource[currentCategory]?.find(item => item["Jenis Pekerjaan"] === selectedJenisPekerjaan);
        if (selectedItem) {
            els.satuan.value = selectedItem["Satuan"];
            els.satuan.classList.add('auto-filled');
            
            if (selectedItem["Satuan"] === "Ls") {
                els.volume.value = "1.00"; els.volume.readOnly = true; els.volume.classList.add('auto-filled');
            } else {
                els.volume.value = "0.00"; els.volume.readOnly = false;
            }

            const isMatKondisional = selectedItem["Harga Material"] === "Kondisional";
            const isUpahKondisional = selectedItem["Harga Upah"] === "Kondisional";

            els.material.value = isMatKondisional ? "0" : Utils.formatNumberWithSeparators(selectedItem["Harga Material"]);
            els.material.readOnly = true; // Material selalu readonly sesuai request awal
            els.material.classList.add("auto-filled");

            if (isMatKondisional || isUpahKondisional) {
                els.upah.value = "0"; els.upah.readOnly = false;
                els.upah.classList.add("kondisional-input");
                els.upah.addEventListener("input", handleCurrencyInput);
            } else {
                els.upah.value = Utils.formatNumberWithSeparators(selectedItem["Harga Upah"]);
                els.upah.readOnly = true;
                els.upah.classList.add("auto-filled");
            }
        }
    }
    calculateTotalPrice(selectElement);
};

// --- 6. DOM Creation ---
const createBoQRow = (category, scope) => {
    const row = document.createElement("tr");
    row.className = "boq-item-row";
    row.dataset.scope = scope;
    row.dataset.category = category;

    row.innerHTML = `
        <td class="col-no"><span class="row-number"></span></td>
        <td class="col-jenis-pekerjaan"><select class="jenis-pekerjaan form-select" required><option value="">-- Pilih --</option></select></td>
        <td class="col-satuan"><input type="text" class="satuan form-input auto-filled" readonly /></td>
        <td class="col-volume"><input type="text" class="volume form-input" value="0.00" inputmode="decimal" oninput="this.value = this.value.replace(/[^0-9.]/g, '')" /></td>
        <td class="col-harga"><input type="text" class="harga-material form-input auto-filled" readonly /></td>
        <td class="col-harga"><input type="text" class="harga-upah form-input auto-filled" readonly /></td>
        <td class="col-total"><input type="text" class="total-material form-input auto-filled" disabled /></td>
        <td class="col-total"><input type="text" class="total-upah form-input auto-filled" disabled /></td>
        <td class="col-total-harga"><input type="text" class="total-harga form-input auto-filled" disabled /></td>
        <td class="col-aksi"><button type="button" class="delete-row-btn">Hapus</button></td>
    `;

    row.querySelector(".volume").addEventListener("input", (e) => calculateTotalPrice(e.target));
    row.querySelector(".delete-row-btn").addEventListener("click", () => {
        $(row.querySelector('.jenis-pekerjaan')).select2('destroy');
        row.remove();
        updateAllRowNumbersAndTotals();
        refreshJenisPekerjaanOptions(category);
    });

    const sel = row.querySelector('.jenis-pekerjaan');
    $(sel).on('change', (e) => { autoFillPrices(e.target); refreshJenisPekerjaanOptions(category); });
    Utils.initializeSelect2(sel);

    return row;
};

function createTableStructure(categoryName, scope) {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-container';
    wrapper.style.display = 'none';

    const title = document.createElement('h2');
    title.className = 'section-title font-bold text-lg';
    title.textContent = categoryName;

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr><th rowspan="2">No</th><th rowspan="2">Jenis Pekerjaan</th><th rowspan="2">Satuan</th><th>Volume</th><th colspan="2">Harga Satuan (Rp)</th><th colspan="2">Total Harga Satuan (Rp)</th><th>Total (Rp)</th><th rowspan="2">Aksi</th></tr>
            <tr><th>a</th><th>Material (b)</th><th>Upah (c)</th><th>Material</th><th>Upah</th><th>(Total)</th></tr>
        </thead>
        <tbody class="boq-table-body" data-category="${categoryName}" data-scope="${scope}"></tbody>
        <tfoot><tr><td colspan="8" class="text-right font-bold p-2">Sub Total:</td><td class="sub-total-amount text-center font-bold p-2">Rp 0</td><td></td></tr></tfoot>
    `;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'add-row-btn';
    btn.textContent = `+ Tambah Item ${categoryName}`;
    btn.onclick = () => {
        wrapper.style.display = 'block';
        const tbody = table.querySelector('tbody');
        const row = createBoQRow(categoryName, scope);
        tbody.appendChild(row);
        populateJenisPekerjaanOptionsForNewRow(row);
        updateAllRowNumbersAndTotals();
    };

    const container = document.createElement('div');
    container.appendChild(title);
    container.appendChild(wrapper);
    wrapper.appendChild(table);
    container.appendChild(btn);
    return container;
}

// --- 7. Data Fetching ---
async function fetchAndPopulatePrices() {
    const cab = DOM.cabangSelect.value;
    const scp = DOM.lingkupPekerjaanSelect.value;
    if (!cab || !scp) return;

    Utils.toggleMessage(`Memuat data harga...`, 'info');
    try {
        const res = await fetch(`${CONFIG.API_BASE_URL}/get-data?cabang=${cab}&lingkup=${scp}`);
        const data = await res.json();
        
        const wrapper = scp === 'Sipil' ? DOM.sipilTablesWrapper : DOM.meTablesWrapper;
        wrapper.innerHTML = '';
        const cats = scp === 'Sipil' ? CONFIG.SIPIL_CATEGORIES : CONFIG.ME_CATEGORIES;
        
        cats.forEach(c => wrapper.appendChild(createTableStructure(c, scp)));
        if (scp === 'Sipil') STATE.categorizedPrices.sipil = data;
        else STATE.categorizedPrices.me = data;
        
        DOM.messageDiv.style.display = 'none';
    } catch (e) { Utils.toggleMessage(`Gagal memuat harga: ${e.message}`, 'error'); }
}

// --- 8. Calculation ---
const updateAllRowNumbersAndTotals = () => {
    document.querySelectorAll(".boq-table-body").forEach(tbody => {
        tbody.querySelectorAll(".boq-item-row").forEach((row, idx) => {
            row.querySelector(".row-number").textContent = idx + 1;
        });
        let sub = 0;
        tbody.querySelectorAll(".total-harga").forEach(i => sub += Utils.parseRupiah(i.value));
        tbody.closest("table").querySelector(".sub-total-amount").textContent = Utils.formatRupiah(sub);
    });
    
    let grand = 0;
    document.querySelectorAll(".boq-table-body:not(.hidden) .total-harga").forEach(i => grand += Utils.parseRupiah(i.value));
    
    // Logic Pembulatan
    const pembulatan = Math.floor(grand / 10000) * 10000;
    const ppn = pembulatan * 0.11;
    const final = pembulatan + ppn;

    DOM.grandTotalAmount.textContent = Utils.formatRupiah(grand); // Hidden element logic
    DOM.pembulatanAmount.textContent = Utils.formatRupiah(pembulatan);
    DOM.ppnAmount.textContent = Utils.formatRupiah(ppn);
    DOM.finalTotalAmount.textContent = Utils.formatRupiah(final);
};

function calculateTotalPrice(input) {
    const row = input.closest("tr");
    const vol = parseFloat(row.querySelector(".volume").value) || 0;
    const mat = Utils.parseFormattedNumber(row.querySelector(".harga-material").value);
    const upah = Utils.parseFormattedNumber(row.querySelector(".harga-upah").value);
    
    const totMat = vol * mat;
    const totUpah = vol * upah;
    
    row.querySelector(".total-material").value = Utils.formatRupiah(totMat);
    row.querySelector(".total-upah").value = Utils.formatRupiah(totUpah);
    row.querySelector(".total-harga").value = Utils.formatRupiah(totMat + totUpah);
    
    updateAllRowNumbersAndTotals();
}

// --- 9. Auth & Init ---
const Auth = {
    init: async () => {
        // Handle URL Params for Cross-Domain
        const p = new URLSearchParams(window.location.search);
        if (p.has('user')) {
            try {
                const u = JSON.parse(atob(p.get('user')));
                if(u.email && u.cabang) {
                    sessionStorage.setItem("loggedInUserEmail", u.email);
                    sessionStorage.setItem("loggedInUserCabang", u.cabang);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch(e) {}
        }

        const email = sessionStorage.getItem("loggedInUserEmail");
        const cabang = sessionStorage.getItem("loggedInUserCabang");

        if (!email || !cab) {
            alert("Sesi habis. Silakan login kembali.");
            window.location.href = "../index.html";
            return;
        }

        // Setup Logout -> Back Button
        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg> Kembali
            `;
            btnLogout.onclick = (e) => {
                e.preventDefault();
                if (document.referrer && document.referrer.includes('opname')) window.history.back();
                else window.location.href = "../opname/index.html";
            };
        }

        initializePage();
    }
};

async function initializePage() {
    DOM = {
        form: document.getElementById("form"),
        submitButton: document.getElementById("submit-button"),
        messageDiv: document.getElementById("message"),
        grandTotalAmount: document.getElementById("grand-total-amount"),
        pembulatanAmount: document.getElementById("pembulatan-amount"),
        ppnAmount: document.getElementById("ppn-amount"),
        finalTotalAmount: document.getElementById("final-total-amount"),
        lingkupPekerjaanSelect: document.getElementById("lingkup_pekerjaan"),
        cabangSelect: document.getElementById("cabang"),
        lokasiCabang: document.getElementById('lokasi_cabang'),
        lokasiTanggal: document.getElementById('lokasi_tanggal'),
        lokasiManual: document.getElementById('lokasi_manual'),
        lokasi: document.getElementById('lokasi'),
        sipilTablesWrapper: document.getElementById("sipil-tables-wrapper"),
        meTablesWrapper: document.getElementById("me-tables-wrapper"),
        toggleRenovasi: document.getElementById('toggle_renovasi'),
        separatorRenov: document.getElementById('separator_renov'),
        suffixRenov: document.getElementById('suffix_renov'),
        resetButton: document.querySelector("button[type='reset']")
    };

    // Renovasi Logic
    DOM.toggleRenovasi.addEventListener('change', () => {
        const isRenov = DOM.toggleRenovasi.checked;
        DOM.separatorRenov.style.display = isRenov ? 'inline' : 'none';
        DOM.suffixRenov.style.display = isRenov ? 'block' : 'none';
        updateNomorUlok();
    });

    const updateNomorUlok = () => {
        const c = DOM.lokasiCabang.value;
        const t = DOM.lokasiTanggal.value;
        const m = DOM.lokasiManual.value;
        if(c && t.length===4 && m.length===4) {
            DOM.lokasi.value = `${c}${t}${m}${DOM.toggleRenovasi.checked ? 'R' : ''}`;
        }
    };
    
    [DOM.lokasiCabang, DOM.lokasiTanggal, DOM.lokasiManual].forEach(el => {
        el.addEventListener('input', updateNomorUlok);
        el.addEventListener('change', updateNomorUlok);
    });

    // Load Initial Data (Cabang/Lokasi)
    const userCabang = sessionStorage.getItem('loggedInUserCabang')?.toUpperCase();
    
    // Lokasi Cabang Options
    DOM.lokasiCabang.innerHTML = '<option value="">-- Kode --</option>';
    if(userCabang) {
        if(userCabang === 'CIKOKOL') {
             DOM.lokasiCabang.add(new Option("CIKOKOL (KZ01)", "KZ01"));
        } else {
             const code = CONFIG.BRANCH_ULOK_MAP[userCabang];
             if(code) {
                 DOM.lokasiCabang.add(new Option(code, code));
                 DOM.lokasiCabang.value = code;
             }
        }
    }

    // Main Cabang Options
    DOM.cabangSelect.innerHTML = '';
    if(userCabang) {
        const grp = CONFIG.BRANCH_GROUPS[userCabang];
        if(grp) grp.forEach(b => DOM.cabangSelect.add(new Option(b, b)));
        else DOM.cabangSelect.add(new Option(userCabang, userCabang));
        DOM.cabangSelect.value = userCabang;
    }

    // Listeners
    DOM.lingkupPekerjaanSelect.disabled = false;
    DOM.lingkupPekerjaanSelect.addEventListener("change", () => {
        const s = DOM.lingkupPekerjaanSelect.value;
        DOM.sipilTablesWrapper.classList.toggle("hidden", s !== 'Sipil');
        DOM.meTablesWrapper.classList.toggle("hidden", s !== 'ME');
        if(DOM.cabangSelect.value && s) fetchAndPopulatePrices();
    });

    DOM.attachment_pdf = document.getElementById('attachment_pdf');
    DOM.attachment_pdf.addEventListener('change', (e) => {
        const lbl = document.querySelector('.file-info-label');
        if(e.target.files.length) {
            lbl.textContent = `File: ${e.target.files[0].name}`;
            lbl.classList.add('text-blue-600', 'font-bold');
        }
    });

    DOM.submitButton.onclick = async (e) => {
        e.preventDefault();
        if(!DOM.form.checkValidity()) { DOM.form.reportValidity(); return; }
        if(!DOM.lokasi.value || DOM.lokasi.value.length < 12) { Utils.toggleMessage('Nomor Ulok tidak lengkap', 'warning'); return; }

        DOM.submitButton.disabled = true;
        DOM.submitButton.innerText = "Mengirim...";
        
        try {
            const fd = new FormData();
            fd.append("nama_toko", document.getElementById('nama_toko').value);
            fd.append("Cabang", DOM.cabangSelect.value);
            fd.append("Email_Pembuat", sessionStorage.getItem("loggedInUserEmail"));
            fd.append("Nomor Ulok", DOM.lokasi.value);
            fd.append("Lingkup_Pekerjaan", DOM.lingkupPekerjaanSelect.value);
            fd.append("Grand Total", Utils.parseRupiah(DOM.finalTotalAmount.textContent)); // Kirim yg sudah PPN
            
            // Items
            let idx = 1;
            document.querySelectorAll(".boq-table-body:not(.hidden) .boq-item-row").forEach(row => {
                const j = row.querySelector('.jenis-pekerjaan').value;
                const v = parseFloat(row.querySelector('.volume').value);
                if(j && v > 0) {
                    fd.append(`Kategori_Pekerjaan_${idx}`, row.dataset.category);
                    fd.append(`Jenis_Pekerjaan_${idx}`, j);
                    fd.append(`Satuan_Item_${idx}`, row.querySelector('.satuan').value);
                    fd.append(`Volume_Item_${idx}`, v);
                    fd.append(`Harga_Material_Item_${idx}`, Utils.parseFormattedNumber(row.querySelector('.harga-material').value));
                    fd.append(`Harga_Upah_Item_${idx}`, Utils.parseFormattedNumber(row.querySelector('.harga-upah').value));
                    idx++;
                }
            });

            if(DOM.attachment_pdf.files[0]) fd.append("file_pdf", DOM.attachment_pdf.files[0]);

            const res = await fetch(`${CONFIG.API_BASE_URL}/api/submit_rab_kedua`, { method: "POST", body: fd });
            const json = await res.json();
            
            if(json.status === "success") {
                Utils.toggleMessage("Berhasil tersimpan!", 'success');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                throw new Error(json.message);
            }
        } catch(err) {
            Utils.toggleMessage(err.message, 'error');
            DOM.submitButton.disabled = false;
            DOM.submitButton.innerText = "Kirim Data";
        }
    };
    
    // Check initial state
    STATE.originalFormData = Utils.getCurrentFormData();
}

document.addEventListener("DOMContentLoaded", Auth.init);