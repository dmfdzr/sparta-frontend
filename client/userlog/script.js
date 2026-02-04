// ==========================================
// 1. CONFIG & AUTHENTICATION
// ==========================================
// Adjust endpoint accordingly. Assuming standard REST structure.
const BASE_URL = "https://sparta-backend-5hdj.onrender.com"; 
let currentUser = null;
let allLogs = [];
let filteredLogs = [];
let currentPage = 1;
const itemsPerPage = 15; // Increased per page since rows are simpler

document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    initApp();
});

function checkAuth() {
    const isAuthenticated = sessionStorage.getItem("authenticated");
    if (isAuthenticated !== "true") {
        // Redirect logic if needed, or just handle gracefully
        window.location.href = "../../auth/index.html"; 
        return;
    }

    currentUser = {
        email: sessionStorage.getItem("loggedInUserEmail") || "",
        cabang: sessionStorage.getItem("loggedInUserCabang") || "Head Office"
    };

    if (document.getElementById("user-name"))
        document.getElementById("user-name").textContent = currentUser.email;
    if (document.getElementById("user-branch"))
        document.getElementById("user-branch").textContent = currentUser.cabang;
}

// ==========================================
// 2. INITIALIZATION & NAVIGATION
// ==========================================
function initApp() {
    // Search & Filter Listeners
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => handleSearch(e.target.value));
    }

    const filterSelect = document.getElementById("filter-cabang");
    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            const keyword = document.getElementById("search-input")?.value || "";
            handleSearch(keyword);
        });
    }

    // Export Buttons
    document.getElementById('exportBtn')?.addEventListener('click', handleExportCSV);
    document.getElementById('btn-export-pdf')?.addEventListener('click', handleExportPDF);

    // Initial Fetch
    fetchLogs();
}

// ==========================================
// 3. DATA FETCHING & TABLE RENDER
// ==========================================
async function fetchLogs() {
    showLoading(true);
    try {
        // TODO: Ensure this endpoint exists in your Backend
        // If your backend stores logs in a specific collection, point to that.
        const url = `${BASE_URL}/api/logs/list`; 

        const res = await fetch(url);
        if (!res.ok) throw new Error("Gagal mengambil data log");

        const rawData = await res.json();
        
        // Handle various response structures
        if (Array.isArray(rawData)) {
            allLogs = rawData;
        } else if (rawData.data && Array.isArray(rawData.data)) {
            allLogs = rawData.data;
        } else {
            allLogs = [];
        }

        updateCabangFilterOptions();
        handleSearch(""); // Initial render

    } catch (err) {
        console.error("Error fetching logs:", err);
        showToast("Gagal memuat data log: " + err.message);
        allLogs = [];
        renderTable();
    } finally {
        showLoading(false);
    }
}

function handleSearch(keyword) {
    const term = (keyword || "").toLowerCase();
    const filterCabang = document.getElementById("filter-cabang")?.value || "";

    filteredLogs = allLogs.filter(log => {
        const email = (log.email || "").toLowerCase();
        const cabang = (log.cabang || "").toString();
        
        // Search by Email match
        const matchText = email.includes(term);
        // Filter by Cabang
        const matchCabang = filterCabang === "" || cabang === filterCabang;

        return matchText && matchCabang;
    });

    // Sort by Date Descending (Newest first)
    // Assuming 'timestamp' or 'created_at' exists
    filteredLogs.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.created_at || 0);
        const dateB = new Date(b.timestamp || b.created_at || 0);
        return dateB - dateA; 
    });

    currentPage = 1;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById("table-body");
    const totalBadge = document.getElementById("total-records");
    const totalCountVal = document.getElementById("total-count-val");

    if (totalBadge && totalCountVal) {
        totalBadge.style.display = "flex";
        totalCountVal.textContent = filteredLogs.length;
    }

    if (!tbody) return;
    tbody.innerHTML = "";

    if (filteredLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color: #666;">Tidak ada data log ditemukan</td></tr>`;
        renderPagination();
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredLogs.slice(startIndex, endIndex);

    paginatedItems.forEach((log, index) => {
        const row = document.createElement("tr");
        
        // Format Timestamp nicely
        const rawTime = log.timestamp || log.created_at || new Date().toISOString();
        const formattedTime = new Date(rawTime).toLocaleString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${log.cabang || "-"}</td>
            <td><span style="font-weight:600; color:#333;">${log.email || "-"}</span></td>
            <td style="color:#555;">${formattedTime}</td>
        `;
        tbody.appendChild(row);
    });

    renderPagination();
}

// ==========================================
// 4. PAGINATION & UTILS
// ==========================================
function renderPagination() {
    const container = document.getElementById("pagination-controls");
    if (!container) return;

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    if (totalPages <= 1) {
        container.style.display = "none";
        return;
    }

    container.style.display = "flex";
    document.getElementById("page-info").textContent = `Halaman ${currentPage} dari ${totalPages}`;

    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");

    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;

    btnPrev.onclick = () => { currentPage--; renderTable(); };
    btnNext.onclick = () => { currentPage++; renderTable(); };
}

function updateCabangFilterOptions() {
    const select = document.getElementById("filter-cabang");
    if (!select) return;

    const currentVal = select.value;
    const cabangSet = new Set();
    
    allLogs.forEach(log => {
        if (log.cabang) cabangSet.add(log.cabang);
    });

    select.innerHTML = '<option value="">Semua Cabang</option>';
    Array.from(cabangSet).sort().forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

function showLoading(show) {
    document.getElementById("loading-overlay").style.display = show ? "flex" : "none";
}

function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = "toast show";
    setTimeout(() => { toast.className = "toast"; }, 3000);
}

// ==========================================
// 5. EXPORT LOGIC
// ==========================================
function handleExportCSV() {
    if (!filteredLogs.length) {
        alert('Tidak ada data untuk diexport!');
        return;
    }

    const headers = ['No', 'Cabang', 'Email User', 'Waktu Akses'];
    const rows = filteredLogs.map((log, i) => {
        const time = log.timestamp || log.created_at || "-";
        return [
            i + 1,
            `"${(log.cabang || "").replace(/"/g, '""')}"`,
            `"${(log.email || "").replace(/"/g, '""')}"`,
            `"${time}"`
        ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `User_Log_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function handleExportPDF() {
    if (!window.jspdf || !filteredLogs.length) {
        alert("Data kosong atau library PDF belum siap.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // Portrait is enough for 4 cols

    // Data Rows
    const tableRows = filteredLogs.map((log, i) => {
        const rawTime = log.timestamp || log.created_at || "-";
        const formattedTime = new Date(rawTime).toLocaleString('id-ID');
        return [i + 1, log.cabang || "-", log.email || "-", formattedTime];
    });

    // Header Info
    doc.setFontSize(16);
    doc.text("Laporan User Log Activity", 14, 15);
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);
    doc.text(`Total Records: ${filteredLogs.length}`, 14, 27);

    // Table
    doc.autoTable({
        startY: 35,
        head: [['No', 'Cabang', 'Email User', 'Waktu Akses']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38], valign: 'middle', halign: 'center' }, // Alfamart Red
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 40 },
            2: { cellWidth: 80 },
            3: { cellWidth: 'auto' }
        }
    });

    doc.save(`User_Log_${new Date().toISOString().slice(0, 10)}.pdf`);
}