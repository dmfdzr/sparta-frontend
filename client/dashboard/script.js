document.addEventListener('DOMContentLoaded', () => {
    // 1. Ambil Role DAN Cabang dari Session
    const userRole = sessionStorage.getItem('userRole'); 
    const userCabang = sessionStorage.getItem('loggedInUserCabang'); 
    
    // 2. Security Check & Redirect
    if (!userRole) {
        alert("Sesi Anda telah habis. Silakan login kembali.");
        window.location.replace('https://sparta-alfamart.vercel.app');
        return;
    }

    // 3. Centralized Menu Catalog (Single Source of Truth)
    const MENU_CATALOG = {
        'menu-rab': { href: '../../rab/', title: 'Penawaran Final Kontraktor', desc: 'Buat penawaran final.' },
        'menu-materai': { href: '../../materai/', title: 'Dokumen Final RAB Termaterai', desc: 'Buat dan lihat RAB Final Termaterai.' },
        'menu-spk': { href: '../../spk/', title: 'Surat Perintah Kerja', desc: 'Form surat perintah kerja.' },
        'menu-pengawasan': { href: '../../inputpic/', title: 'PIC Pengawasan', desc: 'Form input pic pengawasan.' },
        'menu-opname': { href: '../../opname/', title: 'Opname', desc: 'Form opname proyek toko.' },
        'menu-dokumentasi': { href: '../../ftdokumen/', title: 'Dokumentasi Bangunan', desc: 'Form dokumentasi foto bangunan.' },
        'menu-tambahspk': { href: '../../tambahspk/', title: 'Tambahan SPK', desc: 'Form pertambahan hari SPK.' },
        'menu-svdokumen': { href: '../../svdokumen/', title: 'Penyimpanan Dokumen', desc: 'Form penyimpanan dokumen.' },
        'menu-gantt': { href: '../../gantt/', title: 'Gantt Chart', desc: 'Progress pekerjaan toko.' },
        'menu-userlog': { href: '../../userlog/', title: 'User Log', desc: 'Log aktivitas pengguna.' },
        'menu-resend': { href: '../../resend/', title: 'Resend Email', desc: 'Resend email approval.' },
        'menu-monitoring': { href: '../../monitoring/', title: 'Monitoring', desc: 'Monitoring proyek toko.' },
        'menu-sp': { 
            href: '../../dashboard/', 
            title: 'Surat Peringatan', 
            desc: 'Form surat peringatan.',
            onClick: (e) => { e.preventDefault(); alert('Fitur sedang dalam pengembangan.'); }
        },
    };

    // 4. Role-Based Access Control (RBAC) Config
    const roleConfig = {
        'BRANCH BUILDING & MAINTENANCE MANAGER': ['menu-spk', 'menu-pengawasan', 'menu-opname', 'menu-tambahspk', 'menu-gantt', 'menu-dokumentasi', 'menu-svdokumen'],
        'BRANCH BUILDING SUPPORT DOKUMENTASI' : ['menu-spk', 'menu-pengawasan', 'menu-opname', 'menu-tambahspk', 'menu-gantt', 'menu-dokumentasi', 'menu-svdokumen'],
        'BRANCH BUILDING COORDINATOR': ['menu-dokumentasi', 'menu-svdokumen','menu-gantt', 'menu-opname'],
        'BRANCH BUILDING SUPPORT': ['menu-dokumentasi', 'menu-opname', 'menu-gantt', 'menu-svdokumen'],
        'KONTRAKTOR': ['menu-rab', 'menu-materai', 'menu-opname', 'menu-gantt']
    };

    const currentRole = userRole.toUpperCase();
    const isHeadOffice = userCabang && userCabang.toUpperCase() === 'HEAD OFFICE';
    const isContractor = currentRole === 'KONTRAKTOR';

    let allowedMenuIds = roleConfig[currentRole] ? [...roleConfig[currentRole]] : [];

    if (isHeadOffice && !isContractor) {
        allowedMenuIds.push('menu-userlog', 'menu-resend', 'menu-monitoring', 'menu-sp');
    } 

    if (allowedMenuIds.length === 0) {
        console.warn(`User Role "${currentRole}" tidak dikenali atau tidak memiliki akses menu.`);
    }

    // ==========================================
    // 5. LOGIC TAMPILAN MONITORING (HEAD OFFICE ONLY)
    // ==========================================
    const monitoringSection = document.getElementById('monitoring-section');
    
    if (isHeadOffice && !isContractor) {
        // Tampilkan section monitoring
        monitoringSection.style.display = 'block';
        
        // --- TODO: Ganti ini dengan Fetch API betulan ke Backend Anda ---
        // Mockup Data untuk animasi angka (Contoh)
        const mockDataMonitoring = { total: 124, ongoing: 45, selesai: 60, approval: 19 };
        
        // Fungsi animasi hitung angka (Count Up)
        const animateValue = (id, end, duration) => {
            let start = 0;
            const obj = document.getElementById(id);
            if (!obj) return;
            const increment = end > 0 ? Math.ceil(end / (duration / 16)) : 0;
            const timer = setInterval(() => {
                start += increment;
                if (start >= end) {
                    obj.innerHTML = end;
                    clearInterval(timer);
                } else {
                    obj.innerHTML = start;
                }
            }, 16);
        };

        // Jalankan animasi saat data di-load
        setTimeout(() => {
            animateValue("stat-total", mockDataMonitoring.total, 1000);
            animateValue("stat-ongoing", mockDataMonitoring.ongoing, 1000);
            animateValue("stat-selesai", mockDataMonitoring.selesai, 1000);
            animateValue("stat-approval", mockDataMonitoring.approval, 1000);
        }, 300);
    } else {
        // Sembunyikan untuk role lain (sudah disembunyikan via inline CSS, tapi pastikan lagi)
        monitoringSection.style.display = 'none';
    }

    // ==========================================
    // 6. Dynamic Rendering Engine (Menu)
    // ==========================================
    const menuContainer = document.getElementById('menu-container');
    menuContainer.innerHTML = ''; 

    allowedMenuIds.forEach(id => {
        const menuData = MENU_CATALOG[id];
        if (!menuData) return; 

        const linkEl = document.createElement('a');
        linkEl.href = menuData.href;
        linkEl.className = 'menu-item';
        linkEl.id = id;

        if (typeof menuData.onClick === 'function') {
            linkEl.addEventListener('click', menuData.onClick);
        }

        linkEl.innerHTML = `
            <h3>${menuData.title}</h3>
            <p>${menuData.desc}</p>
        `;

        menuContainer.appendChild(linkEl);
    });

    // 7. Fitur Logout
    const logoutBtn = document.getElementById('logout-button-form');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            if(confirm("Apakah Anda yakin ingin keluar?")) {
                sessionStorage.clear(); 
                window.location.replace('https://sparta-alfamart.vercel.app');
            }
        });
    }
});