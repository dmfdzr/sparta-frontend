document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. GLOBAL VARIABLES & AUTH
    // ==========================================
    let rawData = []; // Menyimpan semua data dari API
    let filteredData = []; // Menyimpan data setelah difilter
    
    // --- Chart Instances (Agar bisa di-update/destroy) ---
    let trendChartInstance = null;
    let scopeChartInstance = null;
    let statusChartInstance = null;

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
    
    // Format Rupiah
    const formatRupiah = (num) => {
        return "Rp " + new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    // Parser Angka Aman (Handle #REF!, string, null)
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

    // Parser Tahun dari berbagai format tanggal (6-Jan-2026, 2026-03-13, dll)
    const getYearFromDate = (dateStr) => {
        if (!dateStr) return null;
        // Coba cari 4 digit angka (tahun)
        const match = dateStr.match(/\d{4}/);
        return match ? match[0] : null;
    };

    // Parser Bulan untuk Chart (Jan, Feb, ...)
    const getMonthFromDate = (dateStr) => {
        if (!dateStr) return -1;
        const dateObj = new Date(dateStr);
        if (!isNaN(dateObj)) return dateObj.getMonth(); // 0 = Jan
        
        // Fallback manual parsing jika format "6-Jan-2026"
        const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const parts = dateStr.split(/[- ]/);
        for (let part of parts) {
            const idx = months.findIndex(m => part.includes(m) || m.toLowerCase() === part.toLowerCase());
            if (idx !== -1) return idx;
        }
        return -1;
    };

    // Animasi Angka
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
        
        // Loading State
        document.getElementById('card-total-proyek').textContent = "...";

        try {
            const response = await fetch(API_URL);
            const result = await response.json();

            if (result.status === 'success' && Array.isArray(result.data)) {
                rawData = result.data;
                
                // 1. Setup Filter Opsi dari Data
                populateFilters(rawData);
                
                // 2. Terapkan Filter Default (Semua)
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
    // 4. FILTER LOGIC (DYNAMIC)
    // ==========================================
    function populateFilters(data) {
        const cabangSelect = document.getElementById('filterCabang');
        const tahunSelect = document.getElementById('filterTahun');

        // --- A. Populate Cabang ---
        // Ambil unik cabang, bersihkan string kosong, urutkan abjad
        const uniqueCabang = [...new Set(data.map(item => item.Cabang))]
            .filter(c => c && c.trim() !== "")
            .sort();

        // Reset opsi (sisakan opsi default 'Semua')
        cabangSelect.innerHTML = '<option value="ALL">Semua Cabang</option>';

        // Jika user bukan HO, kunci ke cabangnya sendiri
        const isHO = userCabang === 'HEAD OFFICE';
        if (!isHO) {
            // Hanya masukkan cabang user yang login
            const opt = document.createElement('option');
            opt.value = userCabang;
            opt.textContent = userCabang;
            cabangSelect.appendChild(opt);
            cabangSelect.value = userCabang;
            cabangSelect.disabled = true;
        } else {
            // Jika HO, masukkan semua cabang yang ada di DB
            uniqueCabang.forEach(cab => {
                const opt = document.createElement('option');
                opt.value = cab;
                opt.textContent = cab;
                cabangSelect.appendChild(opt);
            });
        }

        // --- B. Populate Tahun ---
        // Ambil tahun dari 'Awal_SPK' (atau field tanggal lain yg relevan)
        const uniqueTahun = [...new Set(data.map(item => getYearFromDate(item.Awal_SPK)))]
            .filter(y => y) // Hapus null/undefined
            .sort((a, b) => b - a); // Urutkan descending (terbaru diatas)

        tahunSelect.innerHTML = '<option value="ALL">Semua Tahun</option>';
        uniqueTahun.forEach(thn => {
            const opt = document.createElement('option');
            opt.value = thn;
            opt.textContent = thn;
            tahunSelect.appendChild(opt);
        });
        
        // Auto-select tahun terbaru jika ada
        if(uniqueTahun.length > 0) {
            tahunSelect.value = uniqueTahun[0];
        } else {
            tahunSelect.value = "ALL";
        }
    }

    // Fungsi Utama Filter Data
    function applyFilters() {
        const selectedCabang = document.getElementById('filterCabang').value;
        const selectedTahun = document.getElementById('filterTahun').value;

        filteredData = rawData.filter(item => {
            // 1. Cek Cabang
            const matchCabang = (selectedCabang === 'ALL') || (item.Cabang === selectedCabang);
            
            // 2. Cek Tahun (Cek di Awal_SPK, Opname Final, atau Akhir SPK)
            const itemYear = getYearFromDate(item.Awal_SPK) || getYearFromDate(item.tanggal_opname_final);
            const matchTahun = (selectedTahun === 'ALL') || (itemYear == selectedTahun);

            return matchCabang && matchTahun;
        });

        // Update UI dengan data yang sudah difilter
        renderKPI(filteredData);
        renderCharts(filteredData);
    }

    // Event Listener Tombol Filter
    const btnFilter = document.getElementById('btnApplyFilter');
    if(btnFilter) {
        btnFilter.addEventListener('click', (e) => {
            e.preventDefault(); // Mencegah reload form jika ada tag form
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

        data.forEach(item => {
            totalSPK += parseCurrency(item["Nominal SPK"]);
            totalOpname += parseCurrency(item["Grand Total Opname Final"]);
            totalTambah += parseCurrency(item["Kerja_Tambah"]);
            totalKurang += parseCurrency(item["Kerja_Kurang"]);
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
    }

    // ==========================================
    // 6. RENDER CHARTS (DYNAMIC)
    // ==========================================
    function renderCharts(data) {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#666';

        // --- A. DATA PREPARATION FOR CHARTS ---
        
        // 1. Trend Bulanan (Berdasarkan Bulan dari Awal_SPK)
        const monthlySPK = new Array(12).fill(0);
        const monthlyOpname = new Array(12).fill(0);

        data.forEach(item => {
            const monthIndex = getMonthFromDate(item.Awal_SPK);
            if (monthIndex >= 0 && monthIndex < 12) {
                monthlySPK[monthIndex] += parseCurrency(item["Nominal SPK"]);
                monthlyOpname[monthIndex] += parseCurrency(item["Grand Total Opname Final"]);
            }
        });

        // Convert ke Jutaan agar grafik rapi
        const dataSPKMillion = monthlySPK.map(v => v / 1000000);
        const dataOpnameMillion = monthlyOpname.map(v => v / 1000000);

        // 2. Scope Pekerjaan
        let scopeCounts = { 'Sipil': 0, 'ME': 0, 'Renovasi': 0, 'Lainnya': 0 };
        data.forEach(item => {
            const scope = item.Lingkup_Pekerjaan || 'Lainnya';
            // Normalisasi teks (SIPIL -> Sipil)
            if (scope.match(/sipil/i)) scopeCounts['Sipil']++;
            else if (scope.match(/me|mekanikal/i)) scopeCounts['ME']++;
            else if (item.Proyek && item.Proyek.match(/renovasi/i)) scopeCounts['Renovasi']++;
            else scopeCounts['Lainnya']++;
        });

        // 3. Status Dokumen
        let statusCounts = { 'Draft': 0, 'Progress': 0, 'Done': 0, 'Lainnya': 0 };
        data.forEach(item => {
            const status = item["Status Opname Final"] || 'Lainnya';
            if (status.match(/done/i)) statusCounts['Done']++;
            else if (status.match(/progress/i)) statusCounts['Progress']++;
            else if (status.match(/draft/i)) statusCounts['Draft']++;
            else statusCounts['Lainnya']++;
        });

        // --- B. CHART RENDERING ---

        // 1. Trend Chart
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

        // 2. Scope Chart
        const ctxScope = document.getElementById('scopeChart').getContext('2d');
        if (scopeChartInstance) scopeChartInstance.destroy();

        scopeChartInstance = new Chart(ctxScope, {
            type: 'doughnut',
            data: {
                labels: ['Sipil', 'ME', 'Renovasi', 'Lainnya'],
                datasets: [{
                    data: [scopeCounts['Sipil'], scopeCounts['ME'], scopeCounts['Renovasi'], scopeCounts['Lainnya']],
                    backgroundColor: ['#d62828', '#1976d2', '#38a169', '#718096'],
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

        // 3. Status Chart
        const ctxStatus = document.getElementById('statusChart').getContext('2d');
        if (statusChartInstance) statusChartInstance.destroy();

        statusChartInstance = new Chart(ctxStatus, {
            type: 'bar',
            indexAxis: 'y',
            data: {
                labels: ['Done', 'Progress', 'Draft', 'Lainnya'],
                datasets: [{
                    label: 'Jumlah Dokumen',
                    data: [statusCounts['Done'], statusCounts['Progress'], statusCounts['Draft'], statusCounts['Lainnya']],
                    backgroundColor: ['#38a169', '#1976d2', '#cbd5e0', '#718096'],
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
    }

    // Jalankan Init
    initDashboard();
});