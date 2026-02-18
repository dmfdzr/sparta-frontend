document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. GLOBAL VARIABLES & AUTH
    // ==========================================
    let rawData = []; 
    let filteredData = []; 
    
    // --- Chart Instances ---
    let trendChartInstance = null;
    let scopeChartInstance = null;
    let statusChartInstance = null;
    let kategoriChartInstance = null; // Instance baru

    // --- Cek Sesi ---
    const userRole = sessionStorage.getItem('userRole'); 
    const userCabang = sessionStorage.getItem('loggedInUserCabang'); 
    
    if (!userRole) {
        window.location.href = '../../auth/index.html';
        return;
    }

    // Tampilkan User Info
    const emailDisplay = sessionStorage.getItem('loggedInUserEmail') || 'User';
    document.getElementById('userNameDisplay').textContent = emailDisplay;
    document.getElementById('roleBadge').textContent = `${userCabang} - ${userRole}`;

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

    const getMonthFromDate = (dateStr) => {
        if (!dateStr) return -1;
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj)) return dateObj.getMonth();
        
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const parts = dateStr.split(/[- ]/);
        for (let part of parts) {
            const idx = months.findIndex(m => part.includes(m) || m.toLowerCase() === part.toLowerCase());
            if (idx !== -1) return idx;
        }
        return -1;
    };

    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        if(!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) window.requestAnimationFrame(step);
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

        cabangSelect.innerHTML = '<option value="ALL">Semua Cabang</option>';

        const isHO = userCabang === 'HEAD OFFICE';
        if (!isHO) {
            const opt = document.createElement('option');
            opt.value = userCabang;
            opt.textContent = userCabang;
            cabangSelect.appendChild(opt);
            cabangSelect.value = userCabang;
            cabangSelect.disabled = true;
        } else {
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
        renderCharts(filteredData);
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
        let totalOpname = 0;
        let totalTambah = 0;
        let totalKurang = 0;
        let totalDenda = 0; // Var Baru

        data.forEach(item => {
            totalSPK += parseCurrency(item["Nominal SPK"]);
            totalOpname += parseCurrency(item["Grand Total Opname Final"]);
            totalTambah += parseCurrency(item["Kerja_Tambah"]);
            totalKurang += parseCurrency(item["Kerja_Kurang"]);
            totalDenda += parseCurrency(item["Denda"]); // Hitung Denda
        });

        animateValue("card-total-proyek", 0, totalProyek, 800);
        
        const elSpk = document.getElementById("card-total-spk");
        if(elSpk) elSpk.textContent = formatRupiah(totalSPK);

        const elOpname = document.getElementById("card-total-opname");
        if(elOpname) elOpname.textContent = formatRupiah(totalOpname);

        const elTambah = document.getElementById("card-total-tambah");
        const elKurang = document.getElementById("card-total-kurang");
        if(elTambah) elTambah.textContent = formatRupiah(totalTambah);
        if(elKurang) elKurang.textContent = `Kurang: -${formatRupiah(totalKurang)}`;
        
        // Update Card Denda
        const elDenda = document.getElementById("card-total-denda");
        if(elDenda) elDenda.textContent = formatRupiah(totalDenda);
    }

    // ==========================================
    // 6. RENDER CHARTS
    // ==========================================
    function renderCharts(data) {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#666';

        // 1. DATA PREP: Trend
        const monthlySPK = new Array(12).fill(0);
        const monthlyOpname = new Array(12).fill(0);

        data.forEach(item => {
            const monthIndex = getMonthFromDate(item.Awal_SPK);
            if (monthIndex >= 0 && monthIndex < 12) {
                monthlySPK[monthIndex] += parseCurrency(item["Nominal SPK"]);
                monthlyOpname[monthIndex] += parseCurrency(item["Grand Total Opname Final"]);
            }
        });

        const dataSPKMillion = monthlySPK.map(v => v / 1000000);
        const dataOpnameMillion = monthlyOpname.map(v => v / 1000000);

        // 2. DATA PREP: Lingkup Pekerjaan (Hanya Sipil & ME)
        let scopeCounts = { 'Sipil': 0, 'ME': 0 };
        data.forEach(item => {
            const scope = (item.Lingkup_Pekerjaan || '').toLowerCase();
            // Filter ketat sesuai request
            if (scope.includes('sipil')) scopeCounts['Sipil']++;
            else if (scope.includes('me') || scope.includes('mekanikal')) scopeCounts['ME']++;
        });

        // 3. DATA PREP: Status Dokumen (Hanya Done & Progress)
        let statusCounts = { 'Done': 0, 'Progress': 0 };
        data.forEach(item => {
            const status = (item["Status Opname Final"] || '').toLowerCase();
            // Filter ketat sesuai request
            if (status.includes('done')) statusCounts['Done']++;
            else if (status.includes('progress')) statusCounts['Progress']++;
        });

        // 4. DATA PREP: Kategori Toko (Ruko vs Non Ruko) - CHART BARU
        let kategoriCounts = {};
        data.forEach(item => {
            let kat = item.Kategori || 'Tidak Diketahui';
            if(kat.trim() === '') kat = 'Tidak Diketahui';
            
            if(!kategoriCounts[kat]) kategoriCounts[kat] = 0;
            kategoriCounts[kat]++;
        });
        
        // --- CHART RENDERING ---

        // A. Trend Chart
        const ctxTrend = document.getElementById('trendChart').getContext('2d');
        if (trendChartInstance) trendChartInstance.destroy();
        
        trendChartInstance = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                datasets: [
                    {
                        label: 'Opname (Juta Rp)',
                        data: dataOpnameMillion,
                        backgroundColor: '#d62828',
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: 'SPK (Juta Rp)',
                        data: dataSPKMillion,
                        type: 'line',
                        borderColor: '#1976d2',
                        borderWidth: 2,
                        tension: 0.3,
                        pointRadius: 2,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: { 
                    y: { beginAtZero: true },
                    x: { grid: { display: false } }
                }
            }
        });

        // B. Lingkup Pekerjaan Chart (Hanya Sipil & ME)
        const ctxScope = document.getElementById('scopeChart').getContext('2d');
        if (scopeChartInstance) scopeChartInstance.destroy();

        scopeChartInstance = new Chart(ctxScope, {
            type: 'doughnut',
            data: {
                labels: ['Sipil', 'ME'],
                datasets: [{
                    data: [scopeCounts['Sipil'], scopeCounts['ME']],
                    backgroundColor: ['#d62828', '#1976d2'], // Merah & Biru
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // C. Status Chart (Hanya Done & Progress)
        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        if (statusChartInstance) statusChartInstance.destroy();

        statusChartInstance = new Chart(ctxStatus, {
            type: 'bar',
            indexAxis: 'y',
            data: {
                labels: ['Done', 'Progres'],
                datasets: [{
                    label: 'Jumlah Dokumen',
                    data: [statusCounts['Done'], statusCounts['Progress']],
                    backgroundColor: ['#38a169', '#1976d2'], // Hijau & Biru
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { display: false }, y: { grid: { display: false } } }
            }
        });

        // D. Kategori Chart (Baru)
        const ctxKategori = document.getElementById('kategoriChart').getContext('2d');
        if (kategoriChartInstance) kategoriChartInstance.destroy();

        const katLabels = Object.keys(kategoriCounts);
        const katData = Object.values(kategoriCounts);
        // Generate warna dinamis jika kategori banyak, atau fix jika sedikit
        const katColors = ['#e53e3e', '#3182ce', '#38a169', '#d69e2e', '#805ad5'];

        kategoriChartInstance = new Chart(ctxKategori, {
            type: 'pie', // Atau 'bar' sesuai selera
            data: {
                labels: katLabels,
                datasets: [{
                    data: katData,
                    backgroundColor: katColors.slice(0, katLabels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    initDashboard();
});