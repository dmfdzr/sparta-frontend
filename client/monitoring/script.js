document.addEventListener('DOMContentLoaded', () => {
    // 1. Cek Sesi (Standar Keamanan)
    const userRole = sessionStorage.getItem('userRole'); 
    const userCabang = sessionStorage.getItem('loggedInUserCabang'); 
    
    if (!userRole) {
        window.location.href = '../../auth/index.html';
        return;
    }

    // Tampilkan Nama User di Header
    document.getElementById('userNameDisplay').textContent = sessionStorage.getItem('loggedInUserEmail') || 'User';
    document.getElementById('roleBadge').textContent = `${userCabang} - ${userRole}`;

    // 2. Setup Chart.js Defaults
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#666';

    // 3. Render Chart Trend (Bar & Line Combo)
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
            datasets: [
                {
                    label: 'Realisasi SPK (Juta Rp)',
                    data: [150, 230, 180, 320, 290, 350],
                    backgroundColor: '#d62828', // Merah Alfamart
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: 'Target Budget',
                    data: [200, 200, 250, 300, 300, 350],
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

    // 4. Render Chart Lingkup (Doughnut)
    const ctxScope = document.getElementById('scopeChart').getContext('2d');
    new Chart(ctxScope, {
        type: 'doughnut',
        data: {
            labels: ['Sipil', 'ME', 'Renovasi'],
            datasets: [{
                data: [45, 30, 25],
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

    // 5. Render Chart Status (Horizontal Bar)
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    new Chart(ctxStatus, {
        type: 'bar',
        indexAxis: 'y', // Horizontal
        data: {
            labels: ['Draft', 'Approval', 'On Progress', 'Selesai'],
            datasets: [{
                label: 'Jumlah Dokumen',
                data: [5, 8, 15, 42],
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

    // 6. Populate Filter Cabang (Logika sama dengan script.js lain)
    const cabangSelect = document.getElementById('filterCabang');
    // Jika User HO, tampilkan semua. Jika Cabang, lock ke cabangnya.
    const isHO = userCabang === 'HEAD OFFICE';
    
    if(!isHO) {
        cabangSelect.innerHTML = `<option value="${userCabang}">${userCabang}</option>`;
        cabangSelect.disabled = true;
    } else {
        // Di sini bisa ditambahkan logika fetch daftar cabang dari API jika ada
        // Untuk contoh statis:
        ['BANDUNG 1', 'BANDUNG 2', 'CIKOKOL', 'BEKASI', 'SEMARANG'].forEach(cab => {
            const opt = document.createElement('option');
            opt.value = cab;
            opt.textContent = cab;
            cabangSelect.appendChild(opt);
        });
    }

    // 7. Event Listener Filter
    document.getElementById('btnApplyFilter').addEventListener('click', () => {
        alert("Filter diterapkan (Simulasi). Data akan diperbarui.");
        // Di sini nanti panggil fungsi fetch API backend
    });
});