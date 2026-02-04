document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil Role DAN Cabang dari Session
    const userRole = sessionStorage.getItem('userRole'); 
    const userCabang = sessionStorage.getItem('loggedInUserCabang'); // <-- Ambil data cabang
    
    // 2. Security Check: Jika tidak ada role, tendang ke login
    if (!userRole) {
        alert("Sesi Anda telah habis. Silakan login kembali.");
        window.location.href = 'https://sparta-alfamart.vercel.app';
        return;
    }

    // 3. Konfigurasi Role (Default berdasarkan Role)
    const roleConfig = {
        'BRANCH BUILDING & MAINTENANCE MANAGER': [
            'menu-spk', 'menu-pengawasan', 'menu-opname', 
            'menu-tambahspk', 'menu-gantt', 'menu-dokumentasi', 
            'menu-svdokumen', 'menu-sp', 'menu-userlog'
        ],
        'BRANCH BUILDING COORDINATOR': [
            'menu-dokumentasi', 'menu-svdokumen','menu-gantt', 'menu-opname', 'menu-userlog'
        ],
        'BRANCH BUILDING SUPPORT': [
            'menu-dokumentasi', 'menu-opname', 'menu-gantt', 'menu-svdokumen', 'menu-userlog'
        ],
        'KONTRAKTOR': [
            'menu-rab', 'menu-materai', 'menu-opname', 'menu-gantt'
        ]
    };

    // 4. Logika Filter Menu
    const currentRole = userRole.toUpperCase(); 
    
    // Default: Ambil menu berdasarkan Role
    let allowedMenus = roleConfig[currentRole] || [];

    // --- [LOGIKA BARU] Override untuk HEAD OFFICE ---
    // Cek apakah userCabang ada isinya, lalu uppercase biar aman dari typo (Head Office vs HEAD OFFICE)
    if (userCabang && userCabang.toUpperCase() === 'HEAD OFFICE') {
        console.log("User terdeteksi dari HEAD OFFICE. Memberikan akses menu khusus.");
        
        // Tentukan menu apa saja yang tampil untuk HEAD OFFICE.
        // Contoh di bawah ini: HEAD OFFICE dapat melihat SEMUA MENU.
        allowedMenus = [
            'menu-rab', 'menu-materai', 'menu-spk', 'menu-pengawasan',
            'menu-opname', 'menu-dokumentasi', 'menu-tambahspk',
            'menu-svdokumen', 'menu-gantt', 'menu-sp', 'menu-userlog'
        ];
    }
    // ------------------------------------------------

    // Jika role/cabang tidak dikenali atau tidak punya akses
    if (allowedMenus.length === 0) {
        console.warn(`User Role "${currentRole}" atau Cabang "${userCabang}" tidak memiliki akses menu.`);
    }

    // Loop semua item menu untuk Show/Hide
    const allMenuItems = document.querySelectorAll('.menu-item');
    allMenuItems.forEach(item => {
        if (allowedMenus.includes(item.id)) {
            item.style.display = 'block'; 
        } else {
            item.style.display = 'none';
        }
    });

    // 5. Fitur Logout
    const logoutBtn = document.getElementById('logout-button-form');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            if(confirm("Apakah Anda yakin ingin keluar?")) {
                sessionStorage.clear(); // Hapus semua session (Role & Cabang)
                window.location.href = 'https://sparta-alfamart.vercel.app';
            }
        });
    }
});