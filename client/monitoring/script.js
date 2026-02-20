document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. GLOBAL VARIABLES & AUTH
    // ==========================================
    let rawData = []; 
    let filteredData = []; 
    
    // --- Cek Sesi ---
    const userRole = sessionStorage.getItem('userRole'); 
    const userCabang = sessionStorage.getItem('loggedInUserCabang'); 
    const isHO = userCabang === 'HEAD OFFICE'; // Deteksi apakah user adalah HEAD OFFICE
    
    if (!userRole) {
        window.location.href = '../../auth/index.html';
        return;
    }

    // Tampilkan User Info
    const emailDisplay = sessionStorage.getItem('loggedInUserEmail') || 'User';
    document.getElementById('userNameDisplay').textContent = emailDisplay;
    document.getElementById('roleBadge').textContent = `${userCabang} - ${userRole}`;

    // --- Sembunyikan Box Filter jika bukan HEAD OFFICE ---
    const controlsDiv = document.querySelector('.controls');
    if (!isHO && controlsDiv) {
        controlsDiv.style.display = 'none';
    }

    // ==========================================
    // 2. MODAL & DRILL-DOWN LOGIC
    // ==========================================
    const projectModal = document.getElementById('projectModal');
    const closeModal = document.getElementById('closeModal');
    const totalProyekCard = document.getElementById('card-total-proyek-wrapper');

    // Variabel View List Toko
    const modalSummaryView = document.getElementById('modalSummaryView');
    const modalListView = document.getElementById('modalListView');
    const storeListContainer = document.getElementById('storeListContainer');
    const listStatusTitle = document.getElementById('listStatusTitle');
    const btnBackToSummary = document.getElementById('btnBackToSummary');
    const grid = document.getElementById('modalStatsGrid');

    let currentGroupedProjects = {}; // Menyimpan data yang sudah dikelompokkan

    // Fungsi untuk menghitung & mengelompokkan status proyek
    const showProjectDetails = () => {
        // Reset View ke Summary setiap kali modal baru dibuka
        if(modalSummaryView && modalListView) {
            modalSummaryView.style.display = 'block';
            modalListView.style.display = 'none';
        }

        currentGroupedProjects = {
            'Approval RAB': [],
            'Proses PJU': [],
            'Approval SPK': [],
            'Ongoing': [],
            'Kerja Tambah Kurang': [],
            'Done': []
        };

        filteredData.forEach(item => {
            const hasSPK = item["Nominal SPK"] && parseCurrency(item["Nominal SPK"]) > 0;
            // Handle perbedaan penamaan key JSON (Tgl Serah Terima vs tanggal_serah_terima)
            const hasSerahTerima = (item["tanggal_serah_terima"] && item["tanggal_serah_terima"] !== "") || 
                                   (item["Tgl Serah Terima"] && item["Tgl Serah Terima"] !== "");
            const hasOpnameFinal = item["Grand Total Opname Final"] && parseCurrency(item["Grand Total Opname Final"]) > 0;

            if (hasOpnameFinal) {
                currentGroupedProjects['Done'].push(item);
            } else if (hasSerahTerima) {
                currentGroupedProjects['Kerja Tambah Kurang'].push(item);
            } else if (hasSPK) {
                currentGroupedProjects['Ongoing'].push(item);
            } else if (item["Status RAB"] === "Approved") {
                currentGroupedProjects['Approval RAB'].push(item);
            } else {
                currentGroupedProjects['Proses PJU'].push(item);
            }
        });

        // Update isi modal dengan Atribut 'data-status'
        if(grid) {
            grid.innerHTML = Object.entries(currentGroupedProjects).map(([label, items], index) => `
                <div class="modal-stat-item" data-status="${label}" style="animation-delay: ${0.1 + (index * 0.05)}s; cursor: pointer;">
                    <span class="modal-stat-label">${label}</span>
                    <span class="modal-stat-value">${items.length}</span>
                </div>
            `).join('');
        }

        if(projectModal) projectModal.style.display = 'flex';
    };

    // Fungsi untuk menampilkan daftar toko ketika status diklik
    const renderStoreList = (status) => {
        const items = currentGroupedProjects[status] || [];
        if(listStatusTitle) {
            listStatusTitle.textContent = `Daftar Toko: ${status} (${items.length})`;
        }
        
        if (!storeListContainer) return;

        if (items.length === 0) {
            storeListContainer.innerHTML = '<div style="text-align:center; color:#718096; padding: 30px;">Tidak ada toko dalam status ini.</div>';
        } else {
            storeListContainer.innerHTML = items.map(item => {
                // Tambahan informasi opsional (misal: tampilkan tgl awal SPK jika Ongoing)
                let extraInfo = '';
                if (status === 'Ongoing' && item["Awal_SPK"]) {
                    extraInfo = ` | Mulai SPK: ${item["Awal_SPK"]}`;
                }

                return `
                <div class="store-item">
                    <div class="store-info">
                        <strong>${item.Nama_Toko || 'Tanpa Nama'}</strong>
                        <span>${item.Cabang || '-'} | ${item.Kode_Toko || '-'}${extraInfo}</span>
                    </div>
                    <div class="store-badge">${item.Kategori || '-'}</div>
                </div>
            `}).join('');
        }

        // Animasi pergantian view
        if(modalSummaryView && modalListView) {
            modalSummaryView.style.display = 'none';
            modalListView.style.display = 'block';
        }
    };

    // Event Listeners untuk interaksi Modal
    if(totalProyekCard) totalProyekCard.addEventListener('click', showProjectDetails);
    
    // Event Delegation: Menangkap klik pada card stat di dalam modal
    if(grid) {
        grid.addEventListener('click', (e) => {
            const statItem = e.target.closest('.modal-stat-item');
            if (!statItem) return; // Jika klik di luar card, abaikan
            
            const status = statItem.getAttribute('data-status');
            renderStoreList(status);
        });
    }

    if(btnBackToSummary) {
        btnBackToSummary.addEventListener('click', () => {
            modalListView.style.display = 'none';
            modalSummaryView.style.display = 'block';
        });
    }

    if(closeModal) {
        closeModal.addEventListener('click', () => {
            if(projectModal) projectModal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === projectModal) {
            projectModal.style.display = 'none';
        }
    });

    // ==========================================
    // 3. HELPER FUNCTIONS
    // ==========================================
    
    const formatRupiah = (num) => {
        return "Rp " + new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    const parseCurrency = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            if (value.includes('#REF!') || value.includes('Error')) return 0;
            const cleanStr = value.replace(/\./g, '').replace(/,/g, '.');
            const floatVal = parseFloat(cleanStr);
            return isNaN(floatVal) ? 0 : floatVal;
        }
        return 0;
    };

    const getYearFromDate = (dateStr) => {
        if (!dateStr) return null;
        const match = dateStr.match(/\d{4}/);
        return match ? match[0] : null;
    };

    const easeOutExpo = (x) => {
        return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    };

    function animateValue(id, start, end, duration, formatter = (val) => val) {
        const obj = document.getElementById(id);
        if(!obj) return;
        let startTimestamp = null;
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const timeProgress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easedProgress = easeOutExpo(timeProgress);
            
            const currentVal = Math.floor(easedProgress * (end - start) + start);
            obj.innerHTML = formatter(currentVal);
            
            if (timeProgress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = formatter(end); 
            }
        };
        window.requestAnimationFrame(step);
    }

    // ==========================================
    // 4. FETCH DATA & INIT
    // ==========================================
    async function initDashboard() {
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
                console.error("Data API kosong/format salah");
                document.getElementById('card-total-proyek').textContent = "0";
            }
        } catch (error) {
            console.error("Error Fetching:", error);
            document.getElementById('card-total-proyek').textContent = "Err";
        }
    }

    // ==========================================
    // 5. FILTER LOGIC
    // ==========================================
    function populateFilters(data) {
        const cabangSelect = document.getElementById('filterCabang');
        const tahunSelect = document.getElementById('filterTahun');

        const uniqueCabang = [...new Set(data.map(item => item.Cabang))]
            .filter(c => c && c.trim() !== "")
            .sort();

        cabangSelect.innerHTML = ''; 

        if (!isHO) {
            // Jika bukan HO, set option satu-satunya ke cabang user tersebut (tersembunyi)
            const opt = document.createElement('option');
            opt.value = userCabang;
            opt.textContent = userCabang;
            cabangSelect.appendChild(opt);
            cabangSelect.value = userCabang;
        } else {
            // Jika HO, tampilkan semua cabang
            cabangSelect.innerHTML = '<option value="ALL">Semua Cabang</option>';
            uniqueCabang.forEach(cab => {
                const opt = document.createElement('option');
                opt.value = cab;
                opt.textContent = cab;
                cabangSelect.appendChild(opt);
            });
        }

        const uniqueTahun = [...new Set(data.map(item => getYearFromDate(item.Awal_SPK)))]
            .filter(y => y)
            .sort((a, b) => b - a);

        tahunSelect.innerHTML = '<option value="ALL">Semua Tahun</option>';
        uniqueTahun.forEach(thn => {
            const opt = document.createElement('option');
            opt.value = thn;
            opt.textContent = thn;
            tahunSelect.appendChild(opt);
        });
        
        if(uniqueTahun.length > 0) tahunSelect.value = uniqueTahun[0];
        else tahunSelect.value = "ALL";
    }

    function applyFilters() {
        const selectedCabang = document.getElementById('filterCabang').value;
        const selectedTahun = document.getElementById('filterTahun').value;

        filteredData = rawData.filter(item => {
            const matchCabang = (selectedCabang === 'ALL') || (item.Cabang === selectedCabang);
            const itemYear = getYearFromDate(item.Awal_SPK) || getYearFromDate(item.tanggal_opname_final);
            const matchTahun = (selectedTahun === 'ALL') || (itemYear == selectedTahun);
            return matchCabang && matchTahun;
        });

        renderKPI(filteredData);
    }

    const btnFilter = document.getElementById('btnApplyFilter');
    if(btnFilter) {
        btnFilter.addEventListener('click', (e) => {
            e.preventDefault();
            applyFilters();
        });
    }

    // ==========================================
    // 6. RENDER KPI CARDS
    // ==========================================
    function renderKPI(data) {
        let totalProyek = data.length;
        let totalSPK = 0;
        let totalJHK = 0;
        let totalKeterlambatan = 0;
        let totalDenda = 0;
        let totalOpname = 0;
        let totalLuasTerbangun = 0;

        data.forEach(item => {
            totalSPK += parseCurrency(item["Nominal SPK"]);
            
            const durasiSpk = parseFloat(item["Durasi SPK"]) || 0;
            const tambahSpk = parseFloat(item["tambah_spk"]) || 0;
            const keterlambatan = parseFloat(item["Keterlambatan"]) || 0;
            
            totalJHK += (durasiSpk + tambahSpk + keterlambatan);
            totalKeterlambatan += keterlambatan;
            totalDenda += parseCurrency(item["Denda"]);
            
            totalOpname += parseCurrency(item["Grand Total Opname Final"]);
            totalLuasTerbangun += parseFloat(item["Luas Terbangunan"]) || 0;
        });

        const avgKeterlambatan = totalProyek > 0 ? Math.round(totalKeterlambatan / totalProyek) : 0;
        const avgCostM2 = totalLuasTerbangun > 0 ? (totalOpname / totalLuasTerbangun) : 0;

        const animDuration = 1500; 
        
        animateValue("card-total-proyek", 0, totalProyek, animDuration);
        animateValue("card-total-spk", 0, totalSPK, animDuration, formatRupiah);
        animateValue("card-jhk", 0, totalJHK, animDuration, (val) => val + " Hari");
        animateValue("card-avg-keterlambatan", 0, avgKeterlambatan, animDuration, (val) => val + " Hari");
        animateValue("card-total-denda", 0, totalDenda, animDuration, formatRupiah);
        animateValue("card-avg-cost-m2", 0, avgCostM2, animDuration, formatRupiah);
    }

    initDashboard();
});