document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. GLOBAL VARIABLES & AUTH & ROLE
    // ==========================================
    let rawData = []; 
    let filteredData = []; 
    
    const userRole = sessionStorage.getItem('userRole'); 
    const userCabang = sessionStorage.getItem('loggedInUserCabang'); 
    const isHO = userCabang === 'HEAD OFFICE'; 
    
    if (!userRole) {
        alert("Sesi Anda telah habis. Silakan login kembali.");
        window.location.replace('https://sparta-alfamart.vercel.app');
        return;
    }

    const currentRole = userRole.toUpperCase();
    const isContractor = currentRole === 'KONTRAKTOR';

    // ==========================================
    // 2. RENDER MENU (SISI KANAN)
    // ==========================================
    const MENU_CATALOG = {
        'menu-rab': { href: '../../rab/', title: 'RAB Kontraktor', desc: 'Penawaran final kontraktor.', icon: '/assets/icons/rab.png' },
        'menu-materai': { href: '../../materai/', title: 'RAB Termaterai', desc: 'Dokumen final RAB.', icon: '/assets/icons/materai.png' },
        'menu-spk': { href: '../../spk/', title: 'SPK', desc: 'Surat perintah kerja.', icon: '/assets/icons/spk.png' },
        'menu-pengawasan': { href: '../../inputpic/', title: 'PIC Pengawasan', desc: 'Input PIC proyek.', icon: '/assets/icons/pic.png' },
        'menu-opname': { href: '../../opname/', title: 'Opname', desc: 'Form opname proyek.', icon: '/assets/icons/opname.png' },
        'menu-dokumentasi': { href: '../../ftdokumen/', title: 'Dokumentasi', desc: 'Foto bangunan proyek.', icon: '/assets/icons/dokumentasi.png' },
        'menu-tambahspk': { href: '../../tambahspk/', title: 'Tambahan SPK', desc: 'Pertambahan hari SPK.', icon: '/assets/icons/tambahspk.png' },
        'menu-svdokumen': { href: '../../svdokumen/', title: 'Arsip Dokumen', desc: 'Penyimpanan dokumen.', icon: '/assets/icons/arsip.png' },
        'menu-gantt': { href: '../../gantt/', title: 'Gantt Chart', desc: 'Progress pekerjaan.', icon: '/assets/icons/gantt.png' },
        'menu-userlog': { href: '../../userlog/', title: 'User Log', desc: 'Log aktivitas pengguna.', icon: '/assets/icons/log.png' },
        'menu-resend': { href: '../../resend/', title: 'Resend Email', desc: 'Kirim ulang email approval.', icon: '/assets/icons/email.png' },
        'menu-sp': { href: '../../dashboard/', title: 'Surat Peringatan', desc: 'Form SP.', icon: '/assets/icons/sp.png', onClick: (e) => { e.preventDefault(); alert('Fitur dalam pengembangan.'); } },
    };

    const roleConfig = {
        'BRANCH BUILDING & MAINTENANCE MANAGER': ['menu-spk', 'menu-pengawasan', 'menu-opname', 'menu-tambahspk', 'menu-gantt', 'menu-dokumentasi', 'menu-svdokumen'],
        'BRANCH BUILDING SUPPORT DOKUMENTASI' : ['menu-spk', 'menu-pengawasan', 'menu-opname', 'menu-tambahspk', 'menu-gantt', 'menu-dokumentasi', 'menu-svdokumen'],
        'BRANCH BUILDING COORDINATOR': ['menu-dokumentasi', 'menu-svdokumen','menu-gantt', 'menu-opname'],
        'BRANCH BUILDING SUPPORT': ['menu-dokumentasi', 'menu-opname', 'menu-gantt', 'menu-svdokumen'],
        'KONTRAKTOR': ['menu-rab', 'menu-materai', 'menu-opname', 'menu-gantt']
    };

    let allowedMenuIds = roleConfig[currentRole] ? [...roleConfig[currentRole]] : [];
    if (isHO && !isContractor) allowedMenuIds.push('menu-userlog', 'menu-resend', 'menu-sp');

    const menuContainer = document.getElementById('menu-container');
    menuContainer.innerHTML = ''; 
    allowedMenuIds.forEach(id => {
        const menuData = MENU_CATALOG[id];
        if (!menuData) return; 
        const linkEl = document.createElement('a');
        linkEl.href = menuData.href;
        linkEl.className = 'menu-item';
        if (menuData.onClick) linkEl.addEventListener('click', menuData.onClick);
        linkEl.innerHTML = `
            <img src="${menuData.icon ? menuData.icon : '/assets/default-icon.png'}" onerror="this.style.display='none'"/>
            <div class="menu-text"><h3>${menuData.title}</h3><p>${menuData.desc}</p></div>
        `;
        menuContainer.appendChild(linkEl);
    });

    // ==========================================
    // 3. LOGIC MONITORING PANE (SISI KIRI)
    // ==========================================
    const dashboardLayout = document.getElementById('dashboard-layout');
    const monitoringSection = document.getElementById('monitoring-section');
    
    // Tampilkan Monitoring hanya untuk Head Office
    if (isHO && !isContractor) {
        monitoringSection.style.display = 'block';
        initDashboardData(); 
    } else {
        monitoringSection.style.display = 'none';
        dashboardLayout.classList.add('center-menu');
    }

    // ==========================================
    // 4. API FETCH & DATA PROCESSING
    // ==========================================
    async function initDashboardData() {
        const API_URL = "https://sparta-backend-5hdj.onrender.com/api/opname/summary-data";
        document.getElementById('card-total-proyek').textContent = "...";
        try {
            const response = await fetch(API_URL);
            const result = await response.json();
            if (result.status === 'success' && Array.isArray(result.data)) {
                rawData = result.data;
                populateFilters(rawData);
                applyFilters(); 
            } else {
                document.getElementById('card-total-proyek').textContent = "0";
            }
        } catch (error) {
            console.error("Error Fetching:", error);
            document.getElementById('card-total-proyek').textContent = "Err";
        }
    }

    function populateFilters(data) {
        const cabangSelect = document.getElementById('filterCabang');
        const tahunSelect = document.getElementById('filterTahun');
        const uniqueCabang = [...new Set(data.map(item => item.Cabang))].filter(c => c && c.trim() !== "").sort();

        cabangSelect.innerHTML = '<option value="ALL">Semua Cabang</option>';
        uniqueCabang.forEach(cab => {
            cabangSelect.innerHTML += `<option value="${cab}">${cab}</option>`;
        });

        const uniqueTahun = [...new Set(data.map(item => getYearFromDate(item["Timestamp"])))].filter(y => y).sort((a, b) => b - a);
        tahunSelect.innerHTML = '<option value="ALL">Semua Tahun</option>';
        uniqueTahun.forEach(thn => {
            tahunSelect.innerHTML += `<option value="${thn}">${thn}</option>`;
        });
        if(uniqueTahun.length > 0) tahunSelect.value = uniqueTahun[0];
    }

    function applyFilters() {
        const selectedCabang = document.getElementById('filterCabang').value;
        const selectedTahun = document.getElementById('filterTahun').value;
        
        filteredData = rawData.filter(item => {
            const matchCabang = (selectedCabang === 'ALL') || (item.Cabang === selectedCabang);
            const itemYear = getYearFromDate(item["Timestamp"]);
            const matchTahun = (selectedTahun === 'ALL') || (itemYear == selectedTahun);
            return matchCabang && matchTahun;
        });
        renderKPI(filteredData);
    }

    const btnFilter = document.getElementById('btnApplyFilter');
    if(btnFilter) btnFilter.addEventListener('click', applyFilters);

    function renderKPI(data) {
        let totalProyek = data.length, totalSPK = 0, totalJHK = 0, totalKeterlambatan = 0, totalDenda = 0, totalOpname = 0, totalLuasTerbangun = 0;
        let uniqueUlokLuas = {}, sumNilaiToko = 0, countNilaiToko = 0, countKeterlambatan = 0;
        let sumAvgKontraktor = 0, countKontraktorGroups = 0;
        const groupedKontraktorData = {};
        
        let miniStats = { 'Approval RAB': 0, 'Proses PJU': 0, 'Approval SPK': 0, 'Ongoing': 0, 'Kerja Tambah Kurang': 0, 'Done': 0 };

        data.forEach(item => {
            totalSPK += parseCurrency(item["Nominal SPK"]);
            const nt = parseScore(item["Nilai Toko"]);
            if (nt > 0) { sumNilaiToko += nt; countNilaiToko++; }
            
            const durasiSpk = parseFloat(item["Durasi SPK"]) || 0;
            const tambahSpk = parseFloat(item["tambah_spk"]) || 0;
            const keterlambatan = parseFloat(item["Keterlambatan"]) || 0;
            if (keterlambatan > 0) countKeterlambatan++;
            
            totalJHK += (durasiSpk + tambahSpk + keterlambatan);
            totalKeterlambatan += keterlambatan;
            totalDenda += parseCurrency(item["Denda"]);
            totalOpname += parseCurrency(item["Grand Total Opname Final"]);
            
            const ulok = item["Nomor Ulok"] || 'Tanpa Ulok-' + Math.random();
            const luas = parseFloat(item["Luas Terbangunan"]) || 0;
            if (!uniqueUlokLuas[ulok] && luas > 0) { uniqueUlokLuas[ulok] = luas; totalLuasTerbangun += luas; }

            // Logika Mini Stats
            const hasStatusRab = item["Status_Rab"] && String(item["Status_Rab"]).trim() !== "";
            const hasPenawaranFinal = item["Total Penawaran Final"] && String(item["Total Penawaran Final"]).trim() !== "";
            const hasStatus = item["Status"] && String(item["Status"]).trim() !== "";
            const hasSPK = item["Nominal SPK"] && String(item["Nominal SPK"]).trim() !== "";
            const hasSerahTerima = (item["tanggal_serah_terima"] && String(item["tanggal_serah_terima"]).trim() !== "") || (item["Tgl Serah Terima"] && String(item["Tgl Serah Terima"]).trim() !== "");
            const hasOpnameFinal = item["tanggal_opname_final"] && String(item["tanggal_opname_final"]).trim() !== "";

            if (hasOpnameFinal) miniStats['Done']++;
            else if (hasSerahTerima && !hasOpnameFinal) miniStats['Kerja Tambah Kurang']++;
            else if (hasSPK && !hasSerahTerima) miniStats['Ongoing']++;
            else if (hasStatus && !hasSPK) miniStats['Approval SPK']++;
            else if (hasPenawaranFinal && !hasSPK) miniStats['Proses PJU']++;
            else if (hasStatusRab && !hasPenawaranFinal) miniStats['Approval RAB']++;

            const kontraktor = item["Kontraktor"] && item["Kontraktor"].trim() !== "" ? item["Kontraktor"] : 'Tanpa Kontraktor';
            if (nt > 0) {
                if (!groupedKontraktorData[kontraktor]) groupedKontraktorData[kontraktor] = { total: 0, count: 0 };
                groupedKontraktorData[kontraktor].total += nt;
                groupedKontraktorData[kontraktor].count++;
            }
        });

        const miniContainer = document.getElementById('mini-project-stats');
        if (miniContainer) {
            miniContainer.innerHTML = Object.entries(miniStats).map(([label, count]) => `
                <div class="mini-stat-item"><span class="mini-stat-label">${label}</span><span class="mini-stat-value">${count}</span></div>
            `).join('');
        }

        const avgKeterlambatan = countKeterlambatan > 0 ? Math.round(totalKeterlambatan / countKeterlambatan) : 0;
        const avgCostM2 = totalLuasTerbangun > 0 ? (totalOpname / totalLuasTerbangun) : 0;
        const avgNilaiToko = countNilaiToko > 0 ? (sumNilaiToko / countNilaiToko) : 0;
        const avgJHK = totalProyek > 0 ? Math.round(totalJHK / totalProyek) : 0;

        Object.values(groupedKontraktorData).forEach(g => { sumAvgKontraktor += (g.total / g.count); countKontraktorGroups++; });
        const avgNilaiKontraktor = countKontraktorGroups > 0 ? (sumAvgKontraktor / countKontraktorGroups) : 0;

        const animDuration = 1000; 
        animateValue("card-total-proyek", 0, totalProyek, animDuration);
        animateValue("card-total-spk", 0, totalSPK, animDuration, formatRupiah);
        animateValue("card-jhk", 0, avgJHK, animDuration, (val) => val + " Hari");
        animateValue("card-avg-keterlambatan", 0, avgKeterlambatan, animDuration, (val) => val + " Hari");
        animateValue("card-total-denda", 0, totalDenda, animDuration, formatRupiah);
        animateValue("card-avg-cost-m2", 0, avgCostM2, animDuration, formatRupiah);
        if(document.getElementById('card-nilai-toko')) animateValue("card-nilai-toko", 0, avgNilaiToko, animDuration, formatScore, true);
        if(document.getElementById('card-nilai-kontraktor')) animateValue("card-nilai-kontraktor", 0, avgNilaiKontraktor, animDuration, formatScore, true);
    }

    // ==========================================
    // 5. HELPER FORMATTER FUNCTIONS
    // ==========================================
    const formatRupiah = (num) => "Rp " + new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
    const formatScore = (num) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
    const parseCurrency = (value) => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        const cleanStr = value.replace(/\./g, '').replace(/,/g, '.');
        return isNaN(parseFloat(cleanStr)) ? 0 : parseFloat(cleanStr);
    };
    const parseScore = (value) => {
        if (!value) return 0;
        let num = typeof value === 'number' ? value : parseFloat(value.replace(/,/g, '.'));
        if (isNaN(num)) return 0;
        return num > 100 ? num / 100 : num;
    };
    const getYearFromDate = (dateStr) => {
        if (!dateStr) return null;
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) return dateObj.getFullYear().toString();
        const match = String(dateStr).match(/\d{4}/);
        return match ? match[0] : null;
    };

    const easeOutExpo = (x) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    function animateValue(id, start, end, duration, formatter = (val) => val, isFloat = false) {
        const obj = document.getElementById(id);
        if(!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let currentVal = easeOutExpo(progress) * (end - start) + start;
            if (!isFloat) currentVal = Math.floor(currentVal);
            obj.innerHTML = formatter(currentVal);
            if (progress < 1) window.requestAnimationFrame(step); else obj.innerHTML = formatter(end);
        };
        window.requestAnimationFrame(step);
    }

    // ==========================================
    // 6. MODAL & DRILL-DOWN LOGIC
    // ==========================================
    // (Diambil langsung dari monitoring.js agar semua fitur modal detail berfungsi)
    const projectModal = document.getElementById('projectModal');
    const modalMainTitle = document.getElementById('modalMainTitle'); 
    const modalSummaryView = document.getElementById('modalSummaryView');
    const modalListView = document.getElementById('modalListView');
    const modalStoreDetailView = document.getElementById('modalStoreDetailView');
    const storeListContainer = document.getElementById('storeListContainer');
    const storeDetailContainer = document.getElementById('storeDetailContainer');
    const listStatusTitle = document.getElementById('listStatusTitle');
    const detailStoreTitle = document.getElementById('detailStoreTitle'); 
    const grid = document.getElementById('modalStatsGrid');
    
    let currentGroupedProjects = {}, currentModalContext = 'PROJECT', currentSpkGroups = [], currentCostGroups = [], currentKontraktorGroups = [];

    // FUNGSI: Tampilkan Modal Total Proyek
    const showProjectDetails = () => {
        currentModalContext = 'PROJECT'; 
        modalMainTitle.textContent = "Detail Status Proyek"; 
        modalSummaryView.style.display = 'block'; modalListView.style.display = 'none'; modalStoreDetailView.style.display = 'none';
        currentGroupedProjects = { 'Approval RAB': [], 'Proses PJU': [], 'Approval SPK': [], 'Ongoing': [], 'Kerja Tambah Kurang': [], 'Done': [] };

        filteredData.forEach(item => {
            const hasOpnameFinal = item["tanggal_opname_final"] && String(item["tanggal_opname_final"]).trim() !== "";
            const hasSerahTerima = (item["tanggal_serah_terima"] && String(item["tanggal_serah_terima"]).trim() !== "") || (item["Tgl Serah Terima"] && String(item["Tgl Serah Terima"]).trim() !== "");
            const hasSPK = item["Nominal SPK"] && String(item["Nominal SPK"]).trim() !== "";
            const hasStatus = item["Status"] && String(item["Status"]).trim() !== "";
            const hasPenawaranFinal = item["Total Penawaran Final"] && String(item["Total Penawaran Final"]).trim() !== "";
            const hasStatusRab = item["Status_Rab"] && String(item["Status_Rab"]).trim() !== "";

            if (hasOpnameFinal) currentGroupedProjects['Done'].push(item);
            else if (hasSerahTerima && !hasOpnameFinal) currentGroupedProjects['Kerja Tambah Kurang'].push(item);
            else if (hasSPK && !hasSerahTerima) currentGroupedProjects['Ongoing'].push(item);
            else if (hasStatus && !hasSPK) currentGroupedProjects['Approval SPK'].push(item);
            else if (hasPenawaranFinal && !hasSPK) currentGroupedProjects['Proses PJU'].push(item);
            else if (hasStatusRab && !hasPenawaranFinal) currentGroupedProjects['Approval RAB'].push(item);
        });

        grid.innerHTML = Object.entries(currentGroupedProjects).map(([label, items]) => `
            <div class="modal-stat-item" data-status="${label}">
                <span class="modal-stat-label">${label}</span><span class="modal-stat-value">${items.length}</span>
            </div>`).join('');
        projectModal.style.display = 'flex';
    };

    // Fungsi klik List Toko 
    const renderStoreList = (status) => {
        const items = currentGroupedProjects[status] || [];
        listStatusTitle.textContent = `Daftar Toko: ${status} (${items.length})`;
        storeListContainer.innerHTML = items.length === 0 ? '<div style="text-align:center; padding: 30px;">Tidak ada data.</div>' : items.map((item, idx) => `
            <div class="store-item" data-index="${filteredData.indexOf(item)}">
                <div class="store-info"><strong>${item.Nama_Toko || 'Tanpa Nama'}</strong><span>${item.Cabang || '-'} | ${item.Kode_Toko || '-'}</span></div>
                <div class="store-badge">${item.Kategori || '-'}</div>
            </div>`).join('');
        modalSummaryView.style.display = 'none'; modalListView.style.display = 'block';
    };

    // FUNGSI: Render Detail Item (Bisa diperluas sama persis dengan yang asli)
    const renderStoreDetail = (index) => {
        const item = filteredData[index];
        if (!item) return;
        detailStoreTitle.textContent = `Info: ${item.Nama_Toko || 'Tanpa Nama'}`;
        storeDetailContainer.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><span class="detail-label">Cabang</span><span class="detail-value">${item.Cabang || '-'}</span></div>
                <div class="detail-item"><span class="detail-label">Kode / Ulok</span><span class="detail-value">${item.Kode_Toko || '-'} / ${item["Nomor Ulok"] || '-'}</span></div>
                <div class="detail-item"><span class="detail-label">Kontraktor</span><span class="detail-value">${item.Kontraktor || '-'}</span></div>
                <div class="detail-item"><span class="detail-label">Opname Final</span><span class="detail-value" style="color:#2f855a;">${formatRupiah(parseCurrency(item["Grand Total Opname Final"]))}</span></div>
            </div>
        `;
        modalListView.style.display = 'none'; modalStoreDetailView.style.display = 'block';
    };

    // Binding Modal Events
    document.getElementById('card-total-proyek-wrapper')?.addEventListener('click', showProjectDetails);
    
    grid?.addEventListener('click', (e) => {
        const statItem = e.target.closest('.modal-stat-item');
        if (statItem) renderStoreList(statItem.getAttribute('data-status'));
    });

    storeListContainer?.addEventListener('click', (e) => {
        const storeItem = e.target.closest('.store-item');
        if (storeItem) renderStoreDetail(storeItem.getAttribute('data-index'));
    });

    document.getElementById('btnBackToSummary')?.addEventListener('click', () => { modalListView.style.display = 'none'; modalSummaryView.style.display = 'block'; });
    document.getElementById('btnBackToList')?.addEventListener('click', () => { modalStoreDetailView.style.display = 'none'; modalListView.style.display = 'block'; });
    document.getElementById('closeModal')?.addEventListener('click', () => { projectModal.style.display = 'none'; });
    window.addEventListener('click', (e) => { if (e.target === projectModal) projectModal.style.display = 'none'; });

    // Logout
    document.getElementById('logout-button-form')?.addEventListener('click', (e) => {
        e.preventDefault(); 
        if(confirm("Apakah Anda yakin ingin keluar?")) {
            sessionStorage.clear(); 
            window.location.replace('https://sparta-alfamart.vercel.app');
        }
    });
});