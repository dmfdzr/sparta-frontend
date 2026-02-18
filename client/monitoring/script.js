document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. CEK SESI & AUTH (KEAMANAN)
    // ==========================================
    const userRole = sessionStorage.getItem('userRole'); 
    const userCabang = sessionStorage.getItem('loggedInUserCabang'); 
    
    if (!userRole) {
        // Jika tidak ada sesi, lempar ke login
        window.location.href = '../../auth/index.html';
        return;
    }

    // Tampilkan Nama User & Role di Header
    const emailDisplay = sessionStorage.getItem('loggedInUserEmail') || 'User';
    document.getElementById('userNameDisplay').textContent = emailDisplay;
    document.getElementById('roleBadge').textContent = `${userCabang} - ${userRole}`;

    // ==========================================
    // 2. SETUP CHART.JS (Visualisasi Grafik)
    // ==========================================
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#666';

    // --- A. Chart Tren (Budget vs Realisasi) ---
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
            datasets: [
                {
                    label: 'Realisasi SPK (Juta Rp)',
                    data: [150, 230, 180, 320, 290, 350], // Data Dummy
                    backgroundColor: '#d62828', // Merah Alfamart
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: 'Target Budget',
                    data: [200, 200, 250, 300, 300, 350], // Data Dummy
                    type: 'line',
                    borderColor: '#1976d2', // Biru
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                x: { grid: { display: false } }
            }
        }
    });

    // --- B. Chart Scope (Doughnut) ---
    const ctxScope = document.getElementById('scopeChart').getContext('2d');
    new Chart(ctxScope, {
        type: 'doughnut',
        data: {
            labels: ['Sipil', 'ME', 'Renovasi'],
            datasets: [{
                data: [45, 30, 25], // Data Dummy
                backgroundColor: ['#d62828', '#1976d2', '#38a169'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12 } }
            }
        }
    });

    // --- C. Chart Status (Horizontal Bar) ---
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    new Chart(ctxStatus, {
        type: 'bar',
        indexAxis: 'y', // Horizontal
        data: {
            labels: ['Draft', 'Approval', 'On Progress', 'Selesai'],
            datasets: [{
                label: 'Jumlah Dokumen',
                data: [5, 8, 15, 42], // Data Dummy
                backgroundColor: ['#cbd5e0', '#d69e2e', '#1976d2', '#38a169'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { grid: { display: false } }
            }
        }
    });

    // ==========================================
    // 3. INTEGRASI DATA OPNAME (API REAL)
    // ==========================================
    
    // --- Helper Formatter ---
    const formatRupiah = (num) => {
        return "Rp " + new Intl.NumberFormat("id-ID", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    };

    // Helper untuk membersihkan string uang (misal: "13.286.700" -> 13286700)
    // Menghandle kemungkinan #REF! atau string kosong
    const parseCurrency = (str) => {
        if (!str || typeof str !== 'string') return 0;
        if (str.includes('#REF!')) return 0; 
        
        // Hapus titik, ganti koma dengan titik (jika ada desimal), lalu parse
        const cleanStr = str.replace(/\./g, '').replace(/,/g, '.');
        const floatVal = parseFloat(cleanStr);
        return isNaN(floatVal) ? 0 : floatVal;
    };

    // Fungsi Animasi Angka (Counter Up Effect)
    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        if(!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // --- Fungsi Fetch Data API ---
    async function fetchOpnameStats() {
        const API_URL = "https://sparta-backend-5hdj.onrender.com/api/opname/summary-data";
        
        // Set loading state text
        const elProyek = document.getElementById('card-total-proyek');
        if(elProyek) elProyek.textContent = "...";

        try {
            const response = await fetch(API_URL);
            const result = await response.json();

            // Cek apakah status success dan data tersedia
            if (result.status === 'success' && Array.isArray(result.data)) {
                calculateAndRenderCards(result.data);
            } else {
                console.error("Format data API tidak sesuai atau kosong");
                if(elProyek) elProyek.textContent = "0";
            }
        } catch (error) {
            console.error("Gagal mengambil data opname:", error);
            if(elProyek) elProyek.textContent = "Err";
        }
    }

    // --- Fungsi Kalkulasi & Render ke HTML ---
    function calculateAndRenderCards(data) {
        // 1. Inisialisasi Variable Aggregator
        let totalProyek = data.length;
        let totalNilaiSPK = 0;
        let totalNilaiOpname = 0;
        let totalKerjaTambah = 0;
        let totalKerjaKurang = 0;

        // 2. Looping Data untuk Penjumlahan
        data.forEach(item => {
            // Mengambil field sesuai JSON API Anda
            totalNilaiSPK += parseCurrency(item["Nominal SPK"]);
            totalNilaiOpname += parseCurrency(item["Grand Total Opname Final"]);
            totalKerjaTambah += parseCurrency(item["Kerja_Tambah"]);
            totalKerjaKurang += parseCurrency(item["Kerja_Kurang"]);
        });

        // 3. Update DOM Elements (KPI Cards)
        
        // Card 1: Total Proyek (Pakai animasi)
        animateValue("card-total-proyek", 0, totalProyek, 1000);

        // Card 2: Total Nilai SPK
        const elSpk = document.getElementById("card-total-spk");
        if(elSpk) elSpk.textContent = formatRupiah(totalNilaiSPK);

        // Card 3: Total Opname Final
        const elOpname = document.getElementById("card-total-opname");
        if(elOpname) elOpname.textContent = formatRupiah(totalNilaiOpname);

        // Card 4: Kerja Tambah & Kurang
        const elTambah = document.getElementById("card-total-tambah");
        const elKurang = document.getElementById("card-total-kurang");
        
        if(elTambah) elTambah.textContent = formatRupiah(totalKerjaTambah);
        if(elKurang) elKurang.textContent = `Kurang: -${formatRupiah(totalKerjaKurang)}`;

        // Debugging di Console
        console.log("Data Loaded:", {
            totalProyek,
            totalNilaiSPK,
            totalNilaiOpname,
            totalKerjaTambah
        });
    }

    // ==========================================
    // 4. FILTER INTERACTION (Simulasi UI)
    // ==========================================
    const cabangSelect = document.getElementById('filterCabang');
    const isHO = userCabang === 'HEAD OFFICE';
    
    // Logika Filter Cabang
    if(!isHO) {
        // Jika Cabang, kunci pilihan hanya ke cabangnya sendiri
        cabangSelect.innerHTML = `<option value="${userCabang}">${userCabang}</option>`;
        cabangSelect.disabled = true;
    } else {
        // Jika HO, tampilkan daftar cabang (Bisa diganti fetch API Cabang nanti)
        // Saat ini statis dulu untuk demo
        const branches = ['BANDUNG 1', 'BANDUNG 2', 'CIKOKOL', 'BEKASI', 'SEMARANG', 'LOMBOK', 'MEDAN'];
        branches.forEach(cab => {
            const opt = document.createElement('option');
            opt.value = cab;
            opt.textContent = cab;
            cabangSelect.appendChild(opt);
        });
    }

    // Tombol Terapkan Filter
    const btnFilter = document.getElementById('btnApplyFilter');
    if(btnFilter) {
        btnFilter.addEventListener('click', () => {
            // Disini nanti logika reload data berdasarkan filter
            alert(`Filter diterapkan untuk: ${cabangSelect.value}`);
            // fetchOpnameStats(cabangSelect.value); // Contoh pengembangan kedepan
        });
    }

    // ==========================================
    // 5. INISIALISASI AKHIR
    // ==========================================
    // Panggil fetch data Opname saat halaman selesai dimuat
    fetchOpnameStats();
});