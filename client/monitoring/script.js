document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. GLOBAL VARIABLES & AUTH
    // ==========================================
    let rawData = []; 
    
    // Variabel Pagination
    let currentPage = 1;
    const rowsPerPage = 10;

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
    
    const roleBadgeEl = document.getElementById('roleBadge');
    if(roleBadgeEl) {
        roleBadgeEl.textContent = `${userCabang || '-'} - ${userRole || '-'}`;
    }

    // ==========================================
    // 2. HELPER FUNCTIONS
    // ==========================================
    
    const formatRupiah = (num) => {
        if (isNaN(num)) return "Rp 0";
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

    // ==========================================
    // 3. FETCH DATA & INIT
    // ==========================================
    async function initDashboard() {
        const API_URL = "https://sparta-backend-5hdj.onrender.com/api/opname/summary-data";

        try {
            const response = await fetch(API_URL);
            const result = await response.json();

            if (result.status === 'success' && Array.isArray(result.data)) {
                rawData = result.data;
                currentPage = 1; // Reset ke halaman pertama setiap load data
                renderTable(rawData); 
            } else {
                console.error("Data API kosong atau format salah.");
                document.getElementById('table-body').innerHTML = `<tr><td colspan="13" style="text-align:center; color: red;">Format data API tidak sesuai</td></tr>`;
            }
        } catch (error) {
            console.error("Error Fetching:", error);
            document.getElementById('table-body').innerHTML = `<tr><td colspan="13" style="text-align:center; color: red;">Gagal mengambil data dari server. Periksa koneksi atau API Anda.</td></tr>`;
        }
    }

    // ==========================================
    // 4. RENDER DATA TABLE & PAGINATION
    // ==========================================
    function renderTable(data) {
        const tbody = document.getElementById('table-body');
        if(!tbody) return;
        
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;">Data tidak ditemukan</td></tr>`;
            updatePaginationInfo(0);
            return;
        }

        // Tentukan index awal dan akhir dari data per halaman
        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedData = data.slice(startIndex, endIndex);

        paginatedData.forEach(item => {
            const tr = document.createElement('tr');
            
            // Perhitungan & Parsing Nilai Rupiah
            const luasTerbangun = parseCurrency(item["Luas Terbangunan"]);
            const grandTotal = parseCurrency(item["Grand Total Opname Final"]);
            const denda = parseCurrency(item["Denda"]);
            const kerjaTambah = parseCurrency(item["Kerja_Tambah"]);
            const kerjaKurang = parseCurrency(item["Kerja_Kurang"]);
            
            // Hitung Cost/m2 (Cegah pembagian dengan nol)
            let costM2 = 0;
            if (luasTerbangun > 0) {
                costM2 = grandTotal / luasTerbangun;
            }

            // Menyusun konten tabel
            tr.innerHTML = `
                <td>${item["Nama_Toko"] || '-'}</td>
                <td>${item["Kode_Toko"] || '-'}</td>
                <td>${item["Lingkup_Pekerjaan"] || '-'}</td>
                <td>${item["Awal_SPK"] || '-'}</td>
                <td>${item["Akhir_SPK"] || '-'}</td>
                <td>${item["tambah_spk"] || '-'}</td>
                <td>${item["tanggal_serah_terima"] || '-'}</td>
                <td>${item["Keterlambatan"] || '-'}</td>
                <td>${formatRupiah(denda)}</td>
                <td>${formatRupiah(kerjaTambah)}</td>
                <td>${formatRupiah(kerjaKurang)}</td>
                <td>${formatRupiah(grandTotal)}</td>
                <td style="font-weight:600; color:#0f766e;">${formatRupiah(costM2)}</td>
            `;
            
            tbody.appendChild(tr);
        });

        updatePaginationInfo(data.length);
    }

    function updatePaginationInfo(totalItems) {
        const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
        
        const pageInfo = document.getElementById('pageInfo');
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');

        if (pageInfo) {
            pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
        }

        if (btnPrev) {
            btnPrev.disabled = currentPage === 1;
        }

        if (btnNext) {
            btnNext.disabled = currentPage === totalPages || totalPages === 0;
        }
    }

    // ==========================================
    // 5. EVENT LISTENERS
    // ==========================================
    document.getElementById('btnPrev')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable(rawData);
        }
    });

    document.getElementById('btnNext')?.addEventListener('click', () => {
        const totalPages = Math.ceil(rawData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable(rawData);
        }
    });

    // Memanggil inisialisasi awal saat DOM siap
    initDashboard();
});