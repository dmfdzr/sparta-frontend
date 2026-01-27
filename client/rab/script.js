/**
 * REFACTORED RAB ESTIMATOR SCRIPT
 * Focus: Scalability, Maintainability, Performance, Clean Code
 */

// --- Constants & Configuration ---
const CONFIG = {
    API_URL: "https://sparta-backend-5hdj.onrender.com",
    SESSION_START: 6,
    SESSION_END: 18,
    CATEGORIES: {
        Sipil: [
            "PEKERJAAN PERSIAPAN", "PEKERJAAN BOBOKAN / BONGKARAN", "PEKERJAAN TANAH",
            "PEKERJAAN PONDASI & BETON", "PEKERJAAN PASANGAN", "PEKERJAAN BESI",
            "PEKERJAAN KERAMIK", "PEKERJAAN PLUMBING", "PEKERJAAN SANITARY & ACECORIES",
            "PEKERJAAN JANITOR", "PEKERJAAN ATAP", "PEKERJAAN KUSEN, PINTU & KACA",
            "PEKERJAAN FINISHING", "PEKERJAAN BEANSPOT", "PEKERJAAN AREA TERBUKA",
            "PEKERJAAN TAMBAHAN", "PEKERJAAN SBO"
        ],
        ME: [
            "INSTALASI", "FIXTURE", "PEKERJAAN TAMBAHAN", "PEKERJAAN SBO"
        ]
    },
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
    BRANCH_CODES: {
        "LUWU": "2VZ1", "KARAWANG": "1JZ1", "REMBANG": "2AZ1", "BANJARMASIN": "1GZ1",
        "PARUNG": "1MZ1", "TEGAL": "2PZ1", "GORONTALO": "2SZ1", "PONTIANAK": "1PZ1",
        "LOMBOK": "1SZ1", "KOTABUMI": "1VZ1", "SERANG": "2GZ1", "CIANJUR": "2JZ1",
        "BALARAJA": "TZ01", "SIDOARJO": "UZ01", "MEDAN": "WZ01", "BOGOR": "XZ01",
        "JEMBER": "YZ01", "BALI": "QZ01", "PALEMBANG": "PZ01", "KLATEN": "OZ01",
        "MAKASSAR": "RZ01", "PLUMBON": "VZ01", "PEKANBARU": "1AZ1", "JAMBI": "1DZ1",
        "HEAD OFFICE": "Z001", "BANDUNG 1": "BZ01", "BANDUNG 2": "NZ01", "BEKASI": "CZ01",
        "CILACAP": "IZ01", "CILEUNGSI": "JZ01", "SEMARANG": "HZ01", "CIKOKOL": "KZ01",
        "LAMPUNG": "LZ01", "MALANG": "MZ01", "MANADO": "1YZ1", "BATAM": "2DZ1", "MADIUN": "2MZ1"
    }
};

// --- State Management ---
const state = {
    user: {
        email: sessionStorage.getItem('loggedInUserEmail'),
        cabang: sessionStorage.getItem('loggedInUserCabang')?.toUpperCase()
    },
    prices: { Sipil: {}, ME: {} },
    rejectedList: [],
    originalFormData: null
};

// --- Utils ---
const Utils = {
    formatRupiah: (num) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num || 0),
    parseRupiah: (str) => parseFloat(String(str).replace(/Rp\s?|\./g, "").replace(/,/g, ".")) || 0,
    formatNumber: (num) => new Intl.NumberFormat('id-ID').format(num || 0),
    parseNumber: (str) => parseFloat(String(str).replace(/\./g, '').replace(/,/g, '.')) || 0,
    sanitizeDecimalInput: (val) => val.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1').replace(/(\.\d{2})\d+/, '$1'),
    
    showMessage: (msg, type = 'info') => {
        const el = document.getElementById("message");
        el.textContent = msg;
        el.style.display = 'block';
        el.className = type === 'error' ? 'bg-red-500 text-white p-4 rounded' : 
                       type === 'success' ? 'bg-green-500 text-white p-4 rounded' : 
                       'bg-blue-500 text-white p-4 rounded';
        setTimeout(() => el.style.display = 'none', 5000);
    }
};

// --- Core Application Logic ---

const App = {
    init() {
        if (!state.user.cabang) window.location.replace('../../auth/index.html');
        
        this.cacheDOM();
        this.bindEvents();
        this.setupInitialState();
        this.checkSession();
        
        // Timer for session check
        setInterval(this.checkSession, 300000);
    },

    cacheDOM() {
        this.dom = {
            form: document.getElementById("form"),
            container: document.getElementById("dynamic-tables-container"),
            scopeSelect: document.getElementById("lingkup_pekerjaan"),
            cabangSelect: document.getElementById("cabang"),
            locCabang: document.getElementById("lokasi_cabang"),
            submitBtn: document.getElementById("submit-button"),
            totals: {
                grand: document.getElementById("grand-total-amount"),
                round: document.getElementById("pembulatan-amount"),
                ppn: document.getElementById("ppn-amount"),
                final: document.getElementById("final-total-amount")
            }
        };
    },

    bindEvents() {
        // Form Inputs
        document.querySelectorAll('.area-input').forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = Utils.sanitizeDecimalInput(e.target.value);
                this.calculateBuildingArea();
            });
        });

        // Toggle Renovasi
        document.getElementById('toggle_renovasi').addEventListener('change', (e) => {
            const isRenov = e.target.checked;
            document.getElementById('separator_renov').style.display = isRenov ? 'inline' : 'none';
            document.getElementById('suffix_renov').style.display = isRenov ? 'block' : 'none';
            
            const manualInput = document.getElementById('lokasi_manual');
            manualInput.placeholder = isRenov ? "C0B4" : "0001";
            manualInput.value = ""; 
            this.updateUlok();
        });

        // Ulok Generator inputs
        ['lokasi_cabang', 'lokasi_tanggal', 'lokasi_manual'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                if(id === 'lokasi_manual') {
                    const isRenov = document.getElementById('toggle_renovasi').checked;
                    e.target.value = isRenov ? e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() 
                                             : e.target.value.replace(/[^0-9]/g, '');
                }
                this.updateUlok();
            });
        });

        // Scope Change (Build Tables)
        this.dom.scopeSelect.addEventListener('change', async (e) => {
            const scope = e.target.value;
            if (!scope) return;
            
            this.dom.container.innerHTML = ''; // Clear existing
            await this.fetchPrices(scope);
        });

        // Event Delegation for Dynamic Tables (Performance Win)
        this.dom.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-row-btn')) this.handleAddRow(e.target);
            if (e.target.classList.contains('delete-row-btn')) this.handleDeleteRow(e.target);
        });

        this.dom.container.addEventListener('input', (e) => {
            if (e.target.classList.contains('volume') || e.target.classList.contains('harga-upah')) {
                this.calculateRow(e.target.closest('tr'));
            }
        });

        // Submit
        this.dom.submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        document.getElementById('reset-button').addEventListener('click', () => {
            if(confirm("Reset form?")) window.location.reload();
        });
    },

    setupInitialState() {
        // Populate Branch Dropdowns
        const { cabang } = state.user;
        const locSelect = this.dom.locCabang;
        const branchSelect = this.dom.cabangSelect;

        // Logic for Cikokol/Bandung special cases
        const specialBranches = {
            'CIKOKOL': { "CIKOKOL": "KZ01" },
            'BANDUNG': { "BANDUNG 1": "BZ01", "BANDUNG 2": "NZ01" }
        };

        if (specialBranches[cabang]) {
            Object.entries(specialBranches[cabang]).forEach(([name, code]) => {
                locSelect.add(new Option(`${name} (${code})`, code));
            });
        } else if (CONFIG.BRANCH_CODES[cabang]) {
            locSelect.add(new Option(CONFIG.BRANCH_CODES[cabang], CONFIG.BRANCH_CODES[cabang], true, true));
            locSelect.disabled = true;
        }

        // Branch Group Logic
        branchSelect.innerHTML = '';
        const group = CONFIG.BRANCH_GROUPS[cabang];
        if (group) {
            group.forEach(b => branchSelect.add(new Option(b, b)));
            branchSelect.value = cabang;
            branchSelect.disabled = false;
        } else {
            branchSelect.add(new Option(cabang, cabang, true, true));
            branchSelect.disabled = true;
        }

        this.checkSubmissionStatus();
    },

    async checkSubmissionStatus() {
        try {
            const url = `${CONFIG.API_URL}/api/check_status?email=${encodeURIComponent(state.user.email)}&cabang=${encodeURIComponent(state.user.cabang)}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.rejected_submissions?.length) {
                state.rejectedList = data.rejected_submissions;
                Utils.showMessage(`Ditemukan ${data.rejected_submissions.length} pengajuan ditolak. Masukkan No. Ulok untuk revisi.`, 'warn');
            }
        } catch (e) {
            console.error("Status Check Failed", e);
        }
    },

    updateUlok() {
        const code = this.dom.locCabang.value;
        const date = document.getElementById('lokasi_tanggal').value;
        const manual = document.getElementById('lokasi_manual').value;
        const isRenov = document.getElementById('toggle_renovasi').checked;

        if (code && date.length === 4 && manual.length === 4) {
            let ulok = `${code}${date}${manual}`;
            if (isRenov) ulok += "R";
            document.getElementById('lokasi').value = ulok;
            this.checkForRevision(ulok);
        } else {
            document.getElementById('lokasi').value = '';
        }
    },

    checkForRevision(ulok) {
        const cleanUlok = ulok.replace(/-/g, '');
        const scope = this.dom.scopeSelect.value;
        
        if (!scope) return;

        const revision = state.rejectedList.find(r => 
            r['Nomor Ulok'].replace(/-/g, '') === cleanUlok && 
            (r['Lingkup_Pekerjaan'] || r['Lingkup Pekerjaan']) === scope
        );

        if (revision && confirm(`Load revisi data untuk ${ulok}?`)) {
            this.loadHistoryData(revision);
        }
    },

    async fetchPrices(scope) {
        const cabang = this.dom.cabangSelect.value;
        Utils.showMessage(`Memuat harga ${scope}...`);
        
        try {
            // Check cache first
            if (Object.keys(state.prices[scope]).length === 0) {
                const res = await fetch(`${CONFIG.API_URL}/get-data?cabang=${cabang}&lingkup=${scope}`);
                if (!res.ok) throw new Error("Gagal mengambil data harga");
                state.prices[scope] = await res.json();
            }
            
            this.renderTables(scope);
            Utils.showMessage("Data siap.", "success");
        } catch (e) {
            Utils.showMessage(e.message, "error");
        }
    },

    renderTables(scope) {
        const categories = CONFIG.CATEGORIES[scope];
        const container = this.dom.container;
        container.innerHTML = ''; // Clear

        categories.forEach(cat => {
            const section = document.createElement('div');
            section.className = "mb-8 bg-white p-4 rounded shadow-sm border border-gray-100";
            section.innerHTML = `
                <h3 class="text-lg font-bold text-red-600 border-b-2 border-yellow-400 pb-2 mb-4">${cat}</h3>
                <div class="table-container overflow-x-auto">
                    <table class="w-full text-sm border-collapse">
                        <thead>
                            <tr class="bg-red-50 text-red-700">
                                <th class="border p-2">No</th>
                                <th class="border p-2 w-1/3">Item</th>
                                <th class="border p-2">Sat</th>
                                <th class="border p-2">Vol</th>
                                <th class="border p-2">H.Mat</th>
                                <th class="border p-2">H.Upah</th>
                                <th class="border p-2">Tot.Mat</th>
                                <th class="border p-2">Tot.Upah</th>
                                <th class="border p-2">Total</th>
                                <th class="border p-2">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="boq-tbody" data-category="${cat}" data-scope="${scope}"></tbody>
                        <tfoot>
                             <tr><td colspan="8" class="text-right font-bold p-2">Sub Total:</td><td class="sub-total font-bold text-right p-2">Rp 0</td><td></td></tr>
                        </tfoot>
                    </table>
                </div>
                <button type="button" class="add-row-btn mt-3 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700" data-cat="${cat}">+ Tambah Item</button>
            `;
            container.appendChild(section);
        });
    },

    handleAddRow(btn) {
        const cat = btn.dataset.cat;
        const scope = this.dom.scopeSelect.value;
        const tbody = btn.previousElementSibling.querySelector('tbody');
        const rowId = Date.now(); // Unique ID for select2

        const row = document.createElement('tr');
        row.className = "boq-row hover:bg-gray-50";
        row.innerHTML = `
            <td class="row-no text-center border p-1"></td>
            <td class="border p-1"><select class="item-select w-full border rounded px-2 py-1" id="sel_${rowId}"><option value="">-- Pilih --</option></select></td>
            <td class="border p-1"><input class="satuan w-full text-center bg-gray-100" readonly></td>
            <td class="border p-1"><input class="volume w-full text-center border rounded" value="0.00"></td>
            <td class="border p-1"><input class="harga-mat w-full text-right bg-gray-100" readonly value="0"></td>
            <td class="border p-1"><input class="harga-upah w-full text-right bg-gray-100" readonly value="0"></td>
            <td class="border p-1"><input class="tot-mat w-full text-right bg-gray-100" disabled></td>
            <td class="border p-1"><input class="tot-upah w-full text-right bg-gray-100" disabled></td>
            <td class="border p-1"><input class="tot-row w-full text-right font-mono" disabled></td>
            <td class="border p-1 text-center"><button type="button" class="delete-row-btn text-red-500 hover:text-red-700 font-bold">×</button></td>
        `;
        tbody.appendChild(row);

        // Populate Options based on available data
        const items = state.prices[scope][cat] || [];
        const select = row.querySelector('.item-select');
        
        // Filter out already selected items in this category to prevent duplicates
        const existing = Array.from(tbody.querySelectorAll('.item-select')).map(s => s.value);
        
        items.forEach(item => {
            const opt = new Option(item["Jenis Pekerjaan"], item["Jenis Pekerjaan"]);
            if(existing.includes(item["Jenis Pekerjaan"])) opt.disabled = true;
            select.add(opt);
        });

        // Initialize Select2
        $(select).select2({ width: '100%' }).on('change', (e) => {
            this.handleItemSelect(e.target, scope, cat);
        });

        this.updateRowNumbers(tbody);
    },

    handleItemSelect(select, scope, cat) {
        const val = select.value;
        const row = select.closest('tr');
        const data = state.prices[scope][cat].find(i => i["Jenis Pekerjaan"] === val);

        if (!data) return;

        // Set Values
        row.querySelector('.satuan').value = data["Satuan"];
        const isLs = data["Satuan"] === "Ls";
        
        const volInput = row.querySelector('.volume');
        volInput.value = isLs ? "1.00" : "0.00";
        volInput.readOnly = isLs;
        volInput.classList.toggle('bg-gray-100', isLs);

        // Price Logic
        const matInput = row.querySelector('.harga-mat');
        const upahInput = row.querySelector('.harga-upah');

        const matPrice = data["Harga Material"];
        const upahPrice = data["Harga Upah"];
        const isMatCond = matPrice === "Kondisional";
        const isUpahCond = upahPrice === "Kondisional";

        matInput.value = isMatCond ? "0" : Utils.formatNumber(matPrice);
        
        if (isMatCond || isUpahCond) {
            upahInput.readOnly = false;
            upahInput.classList.add('bg-yellow-50');
            upahInput.classList.remove('bg-gray-100');
            upahInput.value = "0";
            upahInput.focus();
        } else {
            upahInput.readOnly = true;
            upahInput.classList.remove('bg-yellow-50');
            upahInput.classList.add('bg-gray-100');
            upahInput.value = Utils.formatNumber(upahPrice);
        }

        // Disable this option in other dropdowns
        const tbody = row.closest('tbody');
        this.refreshDropdowns(tbody);
        this.calculateRow(row);
    },

    calculateRow(row) {
        const vol = Utils.parseNumber(row.querySelector('.volume').value);
        const mat = Utils.parseNumber(row.querySelector('.harga-mat').value);
        const upah = Utils.parseNumber(row.querySelector('.harga-upah').value);

        const totMat = vol * mat;
        const totUpah = vol * upah;
        
        row.querySelector('.tot-mat').value = Utils.formatRupiah(totMat);
        row.querySelector('.tot-upah').value = Utils.formatRupiah(totUpah);
        row.querySelector('.tot-row').value = Utils.formatRupiah(totMat + totUpah);

        this.updateSubTotal(row.closest('tbody'));
    },

    updateSubTotal(tbody) {
        let sum = 0;
        tbody.querySelectorAll('.tot-row').forEach(inp => sum += Utils.parseRupiah(inp.value));
        tbody.parentElement.querySelector('.sub-total').textContent = Utils.formatRupiah(sum);
        this.calculateGrandTotal();
    },

    calculateGrandTotal() {
        let total = 0;
        document.querySelectorAll('.tot-row').forEach(inp => total += Utils.parseRupiah(inp.value));
        
        this.dom.totals.grand.textContent = Utils.formatRupiah(total);
        
        const round = Math.floor(total / 10000) * 10000;
        this.dom.totals.round.textContent = Utils.formatRupiah(round);
        
        const ppn = round * 0.11;
        this.dom.totals.ppn.textContent = Utils.formatRupiah(ppn);
        
        this.dom.totals.final.textContent = Utils.formatRupiah(round + ppn);
    },

    handleDeleteRow(btn) {
        const row = btn.closest('tr');
        const tbody = row.closest('tbody');
        $(row.querySelector('.item-select')).select2('destroy'); // Cleanup select2
        row.remove();
        this.updateRowNumbers(tbody);
        this.refreshDropdowns(tbody);
        this.updateSubTotal(tbody);
    },

    updateRowNumbers(tbody) {
        tbody.querySelectorAll('.row-no').forEach((td, i) => td.textContent = i + 1);
    },

    refreshDropdowns(tbody) {
        // Advanced: Re-enable/Disable options based on selection
        const selected = Array.from(tbody.querySelectorAll('.item-select')).map(s => s.value).filter(v => v);
        tbody.querySelectorAll('.item-select').forEach(sel => {
            Array.from(sel.options).forEach(opt => {
                if (!opt.value) return;
                opt.disabled = selected.includes(opt.value) && opt.value !== sel.value;
            });
        });
    },

    calculateBuildingArea() {
        const lb = parseFloat(document.getElementById("luas_bangunan").value) || 0;
        const lat = parseFloat(document.getElementById("luas_area_terbuka").value) || 0;
        const res = lb + (lat / 2);
        document.getElementById("luas_terbangunan").value = res > 0 ? res.toFixed(2) : "";
    },

    async handleSubmit() {
        // Validation
        if (!this.dom.form.checkValidity()) {
            this.dom.form.reportValidity();
            return;
        }
        
        const lt = parseFloat(document.getElementById("luas_terbangunan").value);
        if(!lt || lt <= 0) {
            alert("Luas Terbangunan tidak valid. Cek input luas.");
            return;
        }

        // Construct Payload
        const formData = new FormData(this.dom.form);
        const payload = Object.fromEntries(formData.entries());
        
        payload["Cabang"] = this.dom.cabangSelect.value;
        payload["Email_Pembuat"] = state.user.email;
        payload["Grand Total"] = Utils.parseRupiah(this.dom.totals.grand.textContent);
        payload["Nama_Toko"] = document.getElementById("nama_toko").value; // explicit

        // Collect Items
        let idx = 1;
        document.querySelectorAll('.boq-row').forEach(row => {
            const cat = row.closest('tbody').dataset.category;
            const item = $(row.querySelector('.item-select')).val();
            const vol = parseFloat(row.querySelector('.volume').value) || 0;

            if (item && vol > 0) {
                payload[`Kategori_Pekerjaan_${idx}`] = cat;
                payload[`Jenis_Pekerjaan_${idx}`] = item;
                payload[`Satuan_Item_${idx}`] = row.querySelector('.satuan').value;
                payload[`Volume_Item_${idx}`] = vol;
                payload[`Harga_Material_Item_${idx}`] = Utils.parseNumber(row.querySelector('.harga-mat').value);
                payload[`Harga_Upah_Item_${idx}`] = Utils.parseNumber(row.querySelector('.harga-upah').value);
                payload[`Total_Harga_Item_${idx}`] = Utils.parseRupiah(row.querySelector('.tot-row').value);
                idx++;
            }
        });

        // Send
        Utils.showMessage("Mengirim...", "info");
        this.dom.submitBtn.disabled = true;

        try {
            const res = await fetch(`${CONFIG.API_URL}/api/submit_rab`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (json.status === "success") {
                Utils.showMessage("Berhasil! Reloading...", "success");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                throw new Error(json.message);
            }
        } catch (e) {
            Utils.showMessage("Error: " + e.message, "error");
            this.dom.submitBtn.disabled = false;
        }
    },

    loadHistoryData(data) {
        // Map fields
        Object.keys(data).forEach(key => {
            const el = document.getElementsByName(key)[0] || document.getElementById(key.toLowerCase().replace(/ /g, '_'));
            if (el) el.value = data[key];
        });

        // Trigger dynamic loads
        this.dom.scopeSelect.value = data["Lingkup_Pekerjaan"] || data["Lingkup Pekerjaan"];
        this.dom.scopeSelect.dispatchEvent(new Event('change'));

        // Wait for prices then populate rows
        const checkLoad = setInterval(() => {
            const scope = this.dom.scopeSelect.value;
            if (state.prices[scope] && Object.keys(state.prices[scope]).length > 0) {
                clearInterval(checkLoad);
                this.populateRows(data);
            }
        }, 500);
    },

    populateRows(data) {
        const itemDetails = data["Item_Details_JSON"] ? JSON.parse(data["Item_Details_JSON"]) : data;
        
        // Loop max 200 items logic from old script
        for (let i = 1; i <= 200; i++) {
            if (!itemDetails[`Jenis_Pekerjaan_${i}`]) continue;
            
            const cat = itemDetails[`Kategori_Pekerjaan_${i}`];
            const btn = document.querySelector(`button[data-cat="${cat}"]`);
            if (btn) {
                this.handleAddRow(btn);
                // Get the last added row
                const tbody = btn.previousElementSibling.querySelector('tbody');
                const row = tbody.lastElementChild;
                
                // Set Values
                const select = $(row.querySelector('.item-select'));
                select.val(itemDetails[`Jenis_Pekerjaan_${i}`]).trigger('change'); // Trigger logic
                
                row.querySelector('.volume').value = itemDetails[`Volume_Item_${i}`];
                
                // Override prices if needed (logic handled by handleItemSelect largely, but ensure specific values)
                if(itemDetails[`Harga_Upah_Item_${i}`]) {
                   // Logic to ensure manual overrides are kept would go here
                }
                this.calculateRow(row);
            }
        }
        this.calculateGrandTotal();
    },

    checkSession() {
        const h = new Date().getHours();
        if (h < CONFIG.SESSION_START || h >= CONFIG.SESSION_END) {
            sessionStorage.clear();
            alert("Sesi berakhir (06:00 - 18:00 WIB).");
            window.location.href = "/login.html";
        }
    }
};

// Start App
document.addEventListener("DOMContentLoaded", () => App.init());