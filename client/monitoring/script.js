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

    const projectModal = document.getElementById('projectModal');
    const closeModal = document.getElementById('closeModal');
    const totalProyekCard = document.getElementById('card-total-proyek-wrapper');

    // Fungsi untuk menghitung status proyek
    const showProjectDetails = () => {
        const stats = {
            'Approval RAB': 0,
            'Proses PJU': 0,
            'Approval SPK': 0,
            'Ongoing': 0,
            'Kerja Tambah Kurang': 0,
            'Done': 0
        };

        filteredData.forEach(item => {
            const hasSPK = item["Nominal SPK"] && parseCurrency(item["Nominal SPK"]) > 0;
            const hasSerahTerima = item["Tgl Serah Terima"] && item["Tgl Serah Terima"] !== "";
            const hasOpnameFinal = item["Grand Total Opname Final"] && parseCurrency(item["Grand Total Opname Final"]) > 0;

            if (hasOpnameFinal) {
                stats['Done']++;
            } else if (hasSerahTerima) {
                stats['Kerja Tambah Kurang']++;
            } else if (hasSPK) {
                // Ongoing jika SPK sudah ada tapi belum serah terima
                stats['Ongoing']++;
                // Anda juga bisa membagi ini untuk 'Approval SPK' sesuai logic spesifik
            } else if (item["Status RAB"] === "Approved") {
                stats['Approval RAB']++;
            } else {
                stats['Proses PJU']++;
            }
        });

        // Update isi modal
        const grid = document.getElementById('modalStatsGrid');
        grid.innerHTML = Object.entries(stats).map(([label, value]) => `
            <div class="modal-stat-item">
                <span class="modal-stat-label">${label}</span>
                <span class="modal-stat-value">${value}</span>
            </div>
        `).join('');

        projectModal.style.display = 'flex';
    };

    // Event Listeners
    totalProyekCard.addEventListener('click', showProjectDetails);
    closeModal.addEventListener('click', () => projectModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === projectModal) projectModal.style.display = 'none';
    });

    // ==========================================
    // 2. HELPER FUNCTIONS
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
    // 3. FETCH DATA & INIT
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
    // 4. FILTER LOGIC
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
    // 5. RENDER KPI CARDS
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