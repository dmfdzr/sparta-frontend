document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil Role DAN Cabang dari Session
    const userRole = sessionStorage.getItem('userRole'); 
    const userCabang = sessionStorage.getItem('loggedInUserCabang'); 
    
    // 2. Security Check
    if (!userRole) {
        alert("Sesi Anda telah habis. Silakan login kembali.");
        window.location.href = 'https://sparta-alfamart.vercel.app';
        return;
    }

    // 3. Konfigurasi Role (HANYA MENU STANDAR CABANG)
    // PERHATIAN: Hapus 'menu-userlog' dan 'menu-sp' dari sini agar cabang tidak bisa lihat.
    const roleConfig = {
        'BRANCH BUILDING & MAINTENANCE MANAGER': [
            'menu-spk', 'menu-pengawasan', 'menu-opname', 
            'menu-tambahspk', 'menu-gantt', 'menu-dokumentasi', 
            'menu-svdokumen' 
            // 'menu-userlog' & 'menu-sp' DIHAPUS dari sini
        ],
        'BRANCH BUILDING COORDINATOR': [
            'menu-dokumentasi', 'menu-svdokumen','menu-gantt', 'menu-opname'
            // 'menu-userlog' DIHAPUS dari sini
        ],
        'BRANCH BUILDING SUPPORT': [
            'menu-dokumentasi', 'menu-opname', 'menu-gantt', 'menu-svdokumen'
            // 'menu-userlog' DIHAPUS dari sini
        ],
        'KONTRAKTOR': [
            'menu-rab', 'menu-materai', 'menu-opname', 'menu-gantt'
        ]
    };

    // 4. Logika Filter Menu
    const currentRole = userRole.toUpperCase(); 
    
    // Default: Ambil menu dasar (yang sudah aman/dibatasi)
    let allowedMenus = roleConfig[currentRole] || [];

    // --- [LOGIKA HEAD OFFICE] ---
    // Cek apakah userCabang = HEAD OFFICE
    const isHeadOffice = userCabang && userCabang.toUpperCase() === 'HEAD OFFICE';

    if (isHeadOffice) {
        console.log("Akses HEAD OFFICE: Membuka semua fitur.");
        
        // LIST LENGKAP KHUSUS HEAD OFFICE
        // Masukkan menu-userlog, menu-sp, dll hanya di sini
        allowedMenus = [
            'menu-rab', 'menu-materai', 'menu-spk', 'menu-pengawasan',
            'menu-opname', 'menu-dokumentasi', 'menu-tambahspk',
            'menu-svdokumen', 'menu-gantt', 
            'menu-sp',       // <--- Menu Khusus HO
            'menu-userlog'   // <--- Menu Khusus HO
        ];
    } 
    // ----------------------------

    // Debugging (Opsional)
    console.log(`Role: ${currentRole}, Cabang: ${userCabang}, Menus:`, allowedMenus);

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
                sessionStorage.clear(); 
                window.location.href = 'https://sparta-alfamart.vercel.app';
            }
        });
    }
});