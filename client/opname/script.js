/* ==========================================================================
   APP CONFIGURATION & STATE MANAGEMENT
   ========================================================================== */
const CONFIG = {
    // Menggunakan URL backend yang tertera di file OpnameForm.js
    API_BASE_URL: "https://opnamebnm-mgbe.onrender.com", 
    INACTIVITY_LIMIT_MS: 60 * 60 * 1000, // 1 Jam
    // Mock stores data karena file StoreSelectionPage tidak tersedia lengkap
    // Di produksi, ini harusnya fetch dari API
};

// Global State (pengganti useState/useContext)
const AppState = {
    user: null,
    loading: true,
    view: 'login', // login, dashboard, store-selection, opname, etc.
    idleTimer: null,
    
    // Data Context
    selectedStore: null,
    selectedUlok: null,
    selectedLingkup: null,
    opnameItems: [],
    
    // UI Helpers
    showPassword: false
};

/* ==========================================================================
   UTILITY FUNCTIONS
   ========================================================================== */

const Utils = {
    formatRupiah: (number) => {
        const numericValue = Number(number) || 0;
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(numericValue);
    },

    toNumInput: (v) => {
        if (v === null || v === undefined) return 0;
        const s = String(v).trim().replace(",", ".");
        const n = Number(s);
        return Number.isFinite(n) ? n : 0;
    },

    toNumID: (v) => {
        if (v === null || v === undefined) return 0;
        const s = String(v).trim();
        const cleaned = s.replace(/[^\d,.-]/g, "");
        const normalized = cleaned.replace(/\./g, "").replace(",", ".");
        const n = Number(normalized);
        return Number.isFinite(n) ? n : 0;
    },

    // Session Management (LocalStorage/SessionStorage logic from AuthContext)
    saveSession: (user) => {
        sessionStorage.setItem("user", JSON.stringify(user));
        // Remove from local storage as per original code cleanup
        try { localStorage.removeItem("user"); } catch {}
    },

    getSession: () => {
        const saved = sessionStorage.getItem("user");
        return saved ? JSON.parse(saved) : null;
    },

    clearSession: () => {
        sessionStorage.removeItem("user");
        localStorage.removeItem("user");
    }
};

/* ==========================================================================
   API SERVICE
   ========================================================================== */
const API = {
    async login(username, password) {
        // Time Validation (06:00 - 18:00 WIB)
        const now = new Date();
        const wibTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        const hour = wibTime.getHours();
        
        if (hour < 6 || hour >= 24) { // Logic from source says < 6 or >= 24 (midnite)
             const currentTime = wibTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
             throw new Error(`Sesi Anda telah berakhir.\nLogin hanya 06.00–18.00 WIB.\nSekarang pukul ${currentTime} WIB.`);
        }

        const res = await fetch(`${CONFIG.API_BASE_URL}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Login failed");
        return data;
    },

    async fetchUloks(kodeToko) {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/uloks?kode_toko=${kodeToko}`);
        return res.json();
    },

    async fetchOpnameItems(kodeToko, noUlok, lingkup) {
        let url = `${CONFIG.API_BASE_URL}/api/opname?kode_toko=${encodeURIComponent(kodeToko)}&no_ulok=${encodeURIComponent(noUlok)}`;
        if (lingkup) url += `&lingkup=${encodeURIComponent(lingkup)}`;
        
        // Fallback logic mimic from OpnameForm.js
        try {
            let res = await fetch(url);
            let data = await res.json();
            
            // Logic handling if empty array returned (try specific lingkups)
            if (!Array.isArray(data) || data.length === 0) {
                 if(!lingkup) {
                    // Try ME
                    let resME = await fetch(url + `&lingkup=ME`);
                    let dataME = await resME.json();
                    if(Array.isArray(dataME) && dataME.length > 0) return { data: dataME, detectedLingkup: 'ME' };
                    
                    // Try SIPIL
                    let resSipil = await fetch(url + `&lingkup=SIPIL`);
                    let dataSipil = await resSipil.json();
                    return { data: dataSipil, detectedLingkup: 'SIPIL' };
                 }
            }
            return { data, detectedLingkup: lingkup };
        } catch (e) {
            console.error("Fetch Opname Error", e);
            return { data: [], detectedLingkup: null };
        }
    },

    async uploadFile(file) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/upload`, {
            method: "POST",
            body: formData,
        });
        if(!res.ok) throw new Error("Upload failed");
        return res.json();
    },

    async submitItem(itemData) {
        const res = await fetch(`${CONFIG.API_BASE_URL}/api/opname/item/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemData),
        });
        if(!res.ok) throw new Error("Submit failed");
        return res.json();
    },

    async checkStatus(ulok, lingkup) {
        const res = await fetch(`https://sparta-backend-5hdj.onrender.com/api/check_status_item_opname?no_ulok=${ulok}&lingkup_pekerjaan=${lingkup}`);
        return res.json();
    },

    async lockOpname(payload) {
        const res = await fetch(`https://sparta-backend-5hdj.onrender.com/api/opname_locked`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if(!res.ok) throw new Error(json.message);
        return json;
    }
};

/* ==========================================================================
   AUTH CONTROLLER
   ========================================================================== */
const Auth = {
    init: () => {
        const user = Utils.getSession();
        if (user) {
            AppState.user = user;
            Auth.startIdleTimer();
            Auth.attachActivityListeners();
            AppState.view = 'dashboard';
        } else {
            AppState.view = 'login';
        }
        AppState.loading = false;
        Render.app();
    },

    login: async (username, password) => {
        try {
            Render.setLoading(true, "Sedang Login...");
            const userData = await API.login(username, password);
            AppState.user = userData;
            Utils.saveSession(userData);
            Auth.startIdleTimer();
            Auth.attachActivityListeners();
            AppState.view = 'dashboard';
            Render.app();
        } catch (error) {
            alert(error.message);
        } finally {
            Render.setLoading(false);
        }
    },

    logout: (isAuto = false) => {
        AppState.user = null;
        Utils.clearSession();
        clearTimeout(AppState.idleTimer);
        AppState.view = 'login';
        if (isAuto) console.log("Auto-logout by inactivity.");
        Render.app();
    },

    startIdleTimer: () => {
        clearTimeout(AppState.idleTimer);
        AppState.idleTimer = setTimeout(() => {
            Auth.logout(true);
        }, CONFIG.INACTIVITY_LIMIT_MS);
    },

    onUserActivity: () => {
        if (AppState.user) Auth.startIdleTimer();
    },

    attachActivityListeners: () => {
        const events = ["click", "keydown", "mousemove", "scroll", "touchstart", "wheel"];
        events.forEach(evt => window.addEventListener(evt, Auth.onUserActivity, { passive: true }));
    }
};

/* ==========================================================================
   RENDER ENGINE & UI COMPONENTS
   ========================================================================== */
const Render = {
    app: () => {
        const appDiv = document.getElementById('app');
        
        if (AppState.loading) {
            appDiv.innerHTML = `
                <div class="loading-screen">
                    <div style="font-size: 48px; margin-bottom: 16px; color: var(--alfamart-red);">🏪</div>
                    <h2 style="color: var(--alfamart-red);">Loading...</h2>
                </div>`;
            return;
        }

        if (!AppState.user) {
            Render.login(appDiv);
            return;
        }

        // Router sederhana
        switch (AppState.view) {
            case 'dashboard':
                Render.dashboard(appDiv);
                break;
            case 'store-selection':
                Render.storeSelection(appDiv);
                break;
            case 'opname':
                Render.opnameForm(appDiv);
                break;
            default:
                Render.dashboard(appDiv);
        }
    },

    setLoading: (isLoading, text = "Loading...") => {
        const btn = document.querySelector('.btn-submit-custom');
        if(btn) {
            if(isLoading) {
                btn.disabled = true;
                btn.innerText = text;
            } else {
                btn.disabled = false;
                btn.innerText = "Login";
            }
        }
    },

    /* --- LOGIN VIEW --- */
    login: (container) => {
        container.innerHTML = `
            <div class="login-wrapper">
                <div class="card login-card">
                    <a href="https://sparta-alfamart.vercel.app/dashboard/pic/index.html" class="btn-back" style="border:none; display:flex; margin-bottom:1rem; padding:0; align-items:center; gap:5px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        Kembali
                    </a>
                    <div style="margin-bottom: 2rem;">
                        <h1 style="color:var(--alfamart-blue); font-size:1.5rem;">Building & Maintenance</h1>
                        <h3 style="color:var(--gray-800);">Opname</h3>
                    </div>
                    <form id="loginForm">
                        <div class="form-group">
                            <label class="form-label">Username / Email</label>
                            <input type="text" id="username" class="form-input" placeholder="Masukkan email Anda" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Password</label>
                            <div class="password-wrapper">
                                <input type="password" id="password" class="form-input" placeholder="Masukkan kata sandi" required>
                                <button type="button" class="toggle-password-btn" id="togglePass">
                                    👁️
                                </button>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary btn-submit-custom" style="width:100%;">Login</button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('loginForm').onsubmit = (e) => {
            e.preventDefault();
            const u = document.getElementById('username').value;
            const p = document.getElementById('password').value;
            Auth.login(u, p);
        };

        document.getElementById('togglePass').onclick = () => {
            const pInput = document.getElementById('password');
            pInput.type = pInput.type === 'password' ? 'text' : 'password';
        };
    },

    /* --- HEADER COMPONENT --- */
    header: () => {
        return `
            <header style="background:var(--white); border-bottom:1px solid var(--gray-300); padding:1rem; display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <div style="font-weight:bold; color:var(--alfamart-red);">Opname System</div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span>Hai, ${AppState.user.name || AppState.user.username}</span>
                    <button class="btn btn-back" onclick="Auth.logout()">Logout</button>
                </div>
            </header>
        `;
    },

    /* --- DASHBOARD VIEW --- */
    dashboard: (container) => {
        const isPic = AppState.user.role === 'pic';
        const isKontraktor = AppState.user.role === 'kontraktor';

        let buttonsHtml = '';
        if (isPic) {
            buttonsHtml = `
                <button class="btn btn-primary" style="height:120px; flex-direction:column;" onclick="Handlers.goToStoreSelection('opname')">
                    <span style="font-size:32px;">📝</span> Input Opname Harian
                </button>
                <button class="btn btn-success" style="height:120px; flex-direction:column;" onclick="alert('Fitur Opname Final View belum diporting penuh di demo ini')">
                    <span style="font-size:32px;">📄</span> Lihat Opname Final
                </button>
            `;
        } else if (isKontraktor) {
            buttonsHtml = `
                <button class="btn btn-info" style="height:120px; flex-direction:column;" onclick="alert('Fitur Approval belum diporting penuh di demo ini')">
                    <span style="font-size:32px;">🔔</span> Persetujuan Opname
                </button>
            `;
        }

        container.innerHTML = `
            ${Render.header()}
            <div class="container">
                <div class="card text-center">
                    <h2 style="color:var(--alfamart-red);">Selamat Datang, ${AppState.user.kontraktor_username || AppState.user.name}!</h2>
                    <p style="margin-bottom:32px; color:var(--gray-600);">Silakan pilih menu di bawah ini</p>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:20px;">
                        ${buttonsHtml}
                    </div>
                </div>
            </div>
        `;
    },

    /* --- STORE SELECTION (MOCK) --- */
    storeSelection: (container) => {
        // Karena tidak ada API endpoint 'getStores' yang jelas di file, 
        // kita buat form input manual kode toko atau mock data jika user PIC
        
        container.innerHTML = `
            ${Render.header()}
            <div class="container">
                <div class="card">
                    <div class="d-flex justify-between" style="margin-bottom:20px;">
                        <button class="btn btn-back" onclick="AppState.view='dashboard'; Render.app();">Kembali</button>
                        <h2 style="color:var(--alfamart-red);">Pilih Toko</h2>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Masukkan Kode Toko</label>
                        <div style="display:flex; gap:10px;">
                            <input type="text" id="kodeTokoInput" class="form-input" placeholder="Contoh: T123">
                            <button class="btn btn-primary" id="searchStoreBtn">Cari</button>
                        </div>
                        <small style="color:gray;">*Simulasi: Masukkan kode toko apapun untuk lanjut</small>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('searchStoreBtn').onclick = () => {
            const kode = document.getElementById('kodeTokoInput').value;
            if(!kode) return alert("Kode toko harus diisi");
            
            // Mock selected store logic
            AppState.selectedStore = {
                kode_toko: kode.toUpperCase(),
                nama_toko: `TOKO ${kode.toUpperCase()}`,
                alamat: "Alamat Simulasi"
            };
            
            // Reset state opname
            AppState.selectedUlok = null;
            AppState.selectedLingkup = null;
            AppState.opnameItems = [];
            
            AppState.view = 'opname';
            Render.app();
        };
    },

    /* --- OPNAME FORM VIEW (Main Logic) --- */
    opnameForm: async (container) => {
        container.innerHTML = `
            ${Render.header()}
            <div class="container" id="opnameContainer">
                <div class="card">
                    <h3 class="text-center">Memuat Data...</h3>
                </div>
            </div>
        `;

        // 1. Jika belum pilih ULOK
        if (!AppState.selectedUlok) {
            try {
                const uloks = await API.fetchUloks(AppState.selectedStore.kode_toko);
                Render.renderUlokSelection(document.getElementById('opnameContainer'), uloks);
            } catch (e) {
                document.getElementById('opnameContainer').innerHTML = `<div class="card">Error: ${e.message} <button class="btn btn-back" onclick="AppState.view='store-selection'; Render.app()">Back</button></div>`;
            }
            return;
        }

        // 2. Jika belum pilih Lingkup
        if (!AppState.selectedLingkup) {
            Render.renderLingkupSelection(document.getElementById('opnameContainer'));
            return;
        }

        // 3. Render Table Opname
        // Jika data kosong, fetch dulu
        if (AppState.opnameItems.length === 0) {
            const { data, detectedLingkup } = await API.fetchOpnameItems(
                AppState.selectedStore.kode_toko, 
                AppState.selectedUlok, 
                AppState.selectedLingkup
            );
            
            // Mapping data agar sesuai format UI
            AppState.opnameItems = data.map((task, index) => {
                const volRab = Utils.toNumInput(task.vol_rab);
                const volAkhirNum = Utils.toNumInput(task.volume_akhir);
                const hargaMaterial = Utils.toNumID(task.harga_material);
                const hargaUpah = Utils.toNumID(task.harga_upah);
                const total_harga = volAkhirNum * (hargaMaterial + hargaUpah);
                const alreadySubmitted = task.isSubmitted === true || !!task.item_id || ["PENDING", "APPROVED", "REJECTED"].includes((task.approval_status || "").toUpperCase());

                return {
                    ...task,
                    internalId: index, // ID unik untuk frontend manipulation
                    vol_rab: volRab,
                    harga_material: hargaMaterial,
                    harga_upah: hargaUpah,
                    isSubmitted: alreadySubmitted,
                    approval_status: task.approval_status || (alreadySubmitted ? "Pending" : undefined),
                    volume_akhir: alreadySubmitted ? String(volAkhirNum) : "",
                    selisih: (Math.round((volAkhirNum - volRab + Number.EPSILON) * 100) / 100).toFixed(2),
                    total_harga,
                    isUploading: false,
                    isSubmitting: false
                };
            });
        }

        Render.renderOpnameTable(document.getElementById('opnameContainer'));
    },

    renderUlokSelection: (container, uloks) => {
        if(uloks.length === 0) {
            container.innerHTML = `<div class="card">Tidak ada data ULOK untuk toko ini. <button class="btn btn-back" onclick="AppState.view='store-selection'; Render.app()">Kembali</button></div>`;
            return;
        }
        // Auto select if only 1
        if(uloks.length === 1) {
            AppState.selectedUlok = uloks[0];
            Render.app(); // Re-trigger flow
            return;
        }

        const options = uloks.map(u => `<option value="${u}">${u}</option>`).join('');
        container.innerHTML = `
            <div class="card">
                <button class="btn btn-back" onclick="AppState.view='store-selection'; Render.app()">Kembali</button>
                <h2 style="color:var(--alfamart-red); margin: 20px 0;">Pilih No. ULOK</h2>
                <select id="ulokSelect" class="form-select">
                    <option value="">-- Pilih ULOK --</option>
                    ${options}
                </select>
            </div>
        `;
        document.getElementById('ulokSelect').onchange = (e) => {
            if(e.target.value) {
                AppState.selectedUlok = e.target.value;
                Render.app();
            }
        };
    },

    renderLingkupSelection: (container) => {
        // Mock Lingkup Selection UI
        container.innerHTML = `
            <div class="card text-center">
                 <button class="btn btn-back" style="float:left;" onclick="AppState.selectedUlok=null; Render.app()">Kembali</button>
                 <div style="clear:both;"></div>
                 <h2 class="mt-4">Pilih Lingkup Pekerjaan</h2>
                 <p class="mb-4">Toko: ${AppState.selectedStore.nama_toko} | ULOK: ${AppState.selectedUlok}</p>
                 <div class="d-flex" style="justify-content:center; gap:20px; margin-top:20px;">
                    <button class="btn btn-primary" onclick="Handlers.selectLingkup('SIPIL')">SIPIL</button>
                    <button class="btn btn-info" onclick="Handlers.selectLingkup('ME')">ME</button>
                 </div>
            </div>
        `;
    },

    renderOpnameTable: async (container) => {
        const items = AppState.opnameItems;
        
        // Calculate Totals
        const totalVal = items.reduce((sum, item) => sum + (item.total_harga || 0), 0);
        const ppn = totalVal * 0.11;
        const grandTotal = totalVal + ppn;

        // Check Status for Final Button
        let canFinalize = false;
        let isFinalized = false;
        
        try {
            // Cek status ke API (asynchronous, tapi kita render dulu UI nya agar cepat)
            // Di implementasi nyata, ini sebaiknya ditunggu atau pakai state loading partial
            const statusData = await API.checkStatus(AppState.selectedUlok, AppState.selectedLingkup);
            if(statusData.status === 'approved') {
                if(statusData.tanggal_opname_final) isFinalized = true;
                else canFinalize = true;
            }
        } catch(e) { console.error(e); }

        const rows = items.map(item => {
            const trStyle = item.approval_status === 'REJECTED' ? 'background:#ffe5e5;' : 
                           item.is_il ? 'background:#fff9c4;' : 
                           item.isSubmitted ? 'background:#f0fff0;' : '';
            
            const badgeClass = item.approval_status === 'PENDING' ? 'badge-warning' :
                               item.approval_status === 'APPROVED' ? 'badge-success' :
                               item.approval_status === 'REJECTED' ? 'badge-error' : 'badge-light';

            // Action Button Logic
            let actionBtn = '';
            if (item.approval_status === 'REJECTED') {
                actionBtn = `<button class="btn btn-warning" style="padding:4px 8px; font-size:12px;" onclick="Handlers.reviseItem(${item.internalId})">Perbaiki</button>`;
            } else if (item.isSubmitted) {
                actionBtn = `<div style="color:green; font-size:12px;"><strong>Tersimpan</strong><br>${item.submissionTime || ''}</div>`;
            } else {
                actionBtn = `<button class="btn btn-primary" style="padding:4px 8px; font-size:12px;" onclick="Handlers.submitItem(${item.internalId})" ${item.isSubmitting || !item.volume_akhir ? 'disabled' : ''}>Simpan</button>`;
            }

            // Input Volume Logic
            const inputDisabled = item.isSubmitted ? 'disabled' : '';
            
            return `
            <tr style="${trStyle}">
                <td>${item.kategori_pekerjaan}</td>
                <td>${item.jenis_pekerjaan}</td>
                <td class="text-center">${item.vol_rab}</td>
                <td class="text-center">${item.satuan}</td>
                <td style="text-align:right;">${Utils.formatRupiah(item.harga_material)}</td>
                <td style="text-align:right;">${Utils.formatRupiah(item.harga_upah)}</td>
                <td class="text-center">
                    <input type="number" class="form-input" style="width:80px; padding:4px;" 
                        value="${item.volume_akhir}" 
                        oninput="Handlers.updateVolume(${item.internalId}, this.value)"
                        ${inputDisabled}
                    >
                </td>
                <td class="text-center">${item.selisih || '-'}</td>
                <td style="text-align:right; font-weight:bold;">${Utils.formatRupiah(item.total_harga)}</td>
                <td class="text-center">
                    ${!item.isSubmitted ? `
                        <label class="btn btn-secondary" style="padding:4px 8px; font-size:12px; cursor:pointer;">
                            ${item.isUploading ? '...' : 'Foto'}
                            <input type="file" accept="image/*" style="display:none;" onchange="Handlers.uploadPhoto(${item.internalId}, this.files[0])">
                        </label>
                    ` : ''}
                    ${item.foto_url ? `<br><a href="${item.foto_url}" target="_blank" style="font-size:11px;">Lihat</a>` : ''}
                </td>
                <td><small>${item.catatan || '-'}</small></td>
                <td class="text-center"><span class="badge ${badgeClass}">${item.approval_status || '-'}</span></td>
                <td class="text-center">${actionBtn}</td>
            </tr>
            `;
        }).join('');

        const finalBtnColor = isFinalized ? '#28a745' : canFinalize ? '#007bff' : '#6c757d';
        const finalBtnText = isFinalized ? "Opname Selesai (Final)" : canFinalize ? "Opname Final" : "Menunggu Approval Semua Item";
        const finalBtnDisabled = (!canFinalize || isFinalized) ? 'disabled' : '';

        container.innerHTML = `
            <div class="card" style="border-radius:0; width:100%; max-width:100%;">
                <div class="d-flex gap-2" style="margin-bottom:20px;">
                    <button class="btn btn-back" onclick="AppState.selectedLingkup=null; Render.app()">Kembali</button>
                    <h2 style="color:var(--alfamart-red);">Input Opname Harian</h2>
                </div>
                
                <h4 style="margin-bottom:10px;">ULOK: ${AppState.selectedUlok} | Lingkup: ${AppState.selectedLingkup}</h4>
                
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Kategori</th>
                                <th>Jenis</th>
                                <th>Vol RAB</th>
                                <th>Satuan</th>
                                <th>Mat (Rp)</th>
                                <th>Upah (Rp)</th>
                                <th>Vol Akhir</th>
                                <th>Selisih</th>
                                <th>Total (Rp)</th>
                                <th>Foto</th>
                                <th>Catatan</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>

                <div class="card" style="background:#f8f9fa; padding:16px;">
                    <div class="d-flex justify-between"><span>Total:</span> <b>${Utils.formatRupiah(totalVal)}</b></div>
                    <div class="d-flex justify-between"><span>PPN 11%:</span> <b>${Utils.formatRupiah(ppn)}</b></div>
                    <hr style="margin:10px 0;">
                    <div class="d-flex justify-between" style="font-size:1.2rem;"><span>GRAND TOTAL:</span> <b style="color:var(--alfamart-red);">${Utils.formatRupiah(grandTotal)}</b></div>
                </div>

                <div style="margin-top:20px;">
                    <button class="btn" onclick="Handlers.finalizeOpname()" style="width:100%; background-color:${finalBtnColor}; color:white;" ${finalBtnDisabled}>
                        ${finalBtnText}
                    </button>
                </div>
            </div>
        `;
    }
};

/* ==========================================================================
   EVENT HANDLERS
   ========================================================================== */
const Handlers = {
    goToStoreSelection: (nextContext) => {
        AppState.view = 'store-selection';
        Render.app();
    },

    selectLingkup: (lingkup) => {
        AppState.selectedLingkup = lingkup;
        Render.app();
    },

    updateVolume: (internalId, val) => {
        const item = AppState.opnameItems[internalId];
        if (item.isSubmitted) return;

        const volAkhir = Utils.toNumInput(val);
        const volRab = Utils.toNumInput(item.vol_rab);
        const selisih = volAkhir - volRab;
        
        // Update State
        item.volume_akhir = val; // keep string for input
        item.selisih = selisih.toFixed(2);
        item.total_harga = selisih * (item.harga_material + item.harga_upah);
        
        // Re-render whole table is expensive, better update DOM specific row and total
        // But for simplicity in this porting, we re-render app. 
        // Optimization: Debounce this or update DOM directly. 
        // Let's re-render for accuracy of totals.
        Render.renderOpnameTable(document.getElementById('opnameContainer'));
    },

    uploadPhoto: async (internalId, file) => {
        if(!file) return;
        const item = AppState.opnameItems[internalId];
        item.isUploading = true;
        Render.renderOpnameTable(document.getElementById('opnameContainer')); // Show loading state

        try {
            const res = await API.uploadFile(file);
            item.foto_url = res.link;
        } catch(e) {
            alert("Gagal upload: " + e.message);
        } finally {
            item.isUploading = false;
            Render.renderOpnameTable(document.getElementById('opnameContainer'));
        }
    },

    submitItem: async (internalId) => {
        const item = AppState.opnameItems[internalId];
        if (!item.volume_akhir) return alert("Volume akhir harus diisi");

        item.isSubmitting = true;
        Render.renderOpnameTable(document.getElementById('opnameContainer'));

        const payload = {
            kode_toko: AppState.selectedStore.kode_toko,
            nama_toko: AppState.selectedStore.nama_toko,
            alamat: AppState.selectedStore.alamat || "",
            pic_username: AppState.user.username,
            no_ulok: AppState.selectedUlok,
            kategori_pekerjaan: item.kategori_pekerjaan,
            jenis_pekerjaan: item.jenis_pekerjaan,
            vol_rab: item.vol_rab,
            satuan: item.satuan,
            volume_akhir: item.volume_akhir,
            selisih: item.selisih,
            foto_url: item.foto_url,
            harga_material: item.harga_material,
            harga_upah: item.harga_upah,
            total_harga_akhir: item.total_harga,
            lingkup_pekerjaan: item.lingkup_pekerjaan || AppState.selectedLingkup,
            rab_key: item.rab_key || "",
            is_il: item.is_il
        };

        try {
            const res = await API.submitItem(payload);
            item.isSubmitted = true;
            item.approval_status = "Pending";
            item.submissionTime = res.tanggal_submit;
            item.item_id = res.item_id;
        } catch (e) {
            alert("Gagal simpan: " + e.message);
        } finally {
            item.isSubmitting = false;
            Render.renderOpnameTable(document.getElementById('opnameContainer'));
        }
    },

    reviseItem: (internalId) => {
        const item = AppState.opnameItems[internalId];
        item.isSubmitted = false;
        item.approval_status = "Pending";
        item.volume_akhir = "";
        item.selisih = "";
        item.total_harga = 0;
        Render.renderOpnameTable(document.getElementById('opnameContainer'));
    },

    finalizeOpname: async () => {
        if (!confirm("Apakah Anda yakin ingin melakukan Opname Final? Tindakan ini tidak dapat dibatalkan.")) return;
        
        try {
            await API.lockOpname({
                status: "locked",
                ulok: AppState.selectedUlok,
                lingkup_pekerjaan: AppState.selectedLingkup
            });
            alert("Opname berhasil difinalisasi!");
            Render.renderOpnameTable(document.getElementById('opnameContainer'));
        } catch(e) {
            alert("Gagal: " + e.message);
        }
    }
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});