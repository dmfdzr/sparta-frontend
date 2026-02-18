document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek Sesi (Sama seperti dashboard/script.js)
    const userRole = sessionStorage.getItem('userRole'); 
    const userCabang = sessionStorage.getItem('loggedInUserCabang'); 
    
    if (!userRole) {
        alert("Sesi habis.");
        window.location.href = '../../auth/index.html';
        return;
    }
    document.getElementById('user-cabang-display').textContent = `${userCabang} (${userRole})`;

    // 2. Setup Chart Instances
    let trendChart, scopeChart, statusChart;

    // 3. Konfigurasi Awal
    const ctxTrend = document.getElementById('chartTrend').getContext('2d');
    const ctxScope = document.getElementById('chartScope').getContext('2d');
    const ctxStatus = document.getElementById('chartStatus').getContext('2d');

    // 4. Fungsi Render Chart (Menggunakan Data Dummy dulu)
    function renderCharts(data) {
        // --- CHART 1: Bar & Line Combo (RAB vs SPK) ---
        if (trendChart) trendChart.destroy();
        trendChart = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
                datasets: [
                    {
                        label: 'Total Nilai RAB (Juta Rp)',
                        data: [120, 190, 300, 250, 200, 350],
                        backgroundColor: '#005a9e',
                        borderRadius: 4,
                        order: 2
                    },
                    {
                        label: 'Target/Budget',
                        data: [150, 200, 250, 250, 250, 300],
                        type: 'line',
                        borderColor: '#dc2626',
                        borderWidth: 2,
                        tension: 0.3,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // --- CHART 2: Doughnut (Sipil vs ME) ---
        if (scopeChart) scopeChart.destroy();
        scopeChart = new Chart(ctxScope, {
            type: 'doughnut',
            data: {
                labels: ['Sipil', 'Mekanikal Elektrikal (ME)', 'Renovasi'],
                datasets: [{
                    data: [55, 30, 15],
                    backgroundColor: ['#005a9e', '#e53e3e', '#38a169'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // --- CHART 3: Horizontal Bar (Status Proyek) ---
        if (statusChart) statusChart.destroy();
        statusChart = new Chart(ctxStatus, {
            type: 'bar',
            indexAxis: 'y', // Horizontal
            data: {
                labels: ['Draft', 'Waiting Approval BM', 'Approved', 'On Progress', 'Done', 'Rejected'],
                datasets: [{
                    label: 'Jumlah Dokumen',
                    data: [5, 8, 12, 15, 20, 3],
                    backgroundColor: [
                        '#cbd5e0', '#ecc94b', '#4299e1', '#805ad5', '#48bb78', '#f56565'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
    }

    // 5. Fungsi Update KPI (Simulasi)
    function updateKPI(filterCabang) {
        // Di sini Anda nanti melakukan fetch ke backend API
        // const res = await fetch(`${PYTHON_API_BASE_URL}/api/get_stats?cabang=${filterCabang}`);
        
        // Simulasi update angka
        const multiplier = filterCabang === 'ALL' ? 1 : 0.2;
        
        document.getElementById('kpi-total-rab').textContent = "Rp " + (new Intl.NumberFormat('id-ID').format(2500000000 * multiplier));
        document.getElementById('kpi-total-spk').textContent = Math.floor(145 * multiplier);
        document.getElementById('kpi-pending').textContent = Math.floor(12 * multiplier);
        document.getElementById('kpi-avg-duration').textContent = "24";
    }

    // 6. Handle Filter Submit
    document.getElementById('filter-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedCabang = document.getElementById('filter-cabang').value;
        const selectedTahun = document.getElementById('filter-tahun').value;
        
        console.log(`Filter applied: ${selectedCabang} - ${selectedTahun}`);
        
        // Reload chart dengan data baru
        updateKPI(selectedCabang);
        renderCharts(); // Nanti pass data baru ke sini
    });

    // 7. Initialize
    // Populate Cabang Dropdown (Copy logic dari spk/script.js branchGroups)
    const cabangSelect = document.getElementById('filter-cabang');
    // ... Logika populate cabang ...
    
    // Render awal
    updateKPI('ALL');
    renderCharts();
});