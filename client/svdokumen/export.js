// export.js
// Ambil parameter filter dari query string
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        cabang: params.get('cabang') || '',
        status: params.get('status') || ''
    };
}

// Ambil data dokumen dari localStorage (atau bisa fetch dari API jika ingin real-time)
function getFilteredDocuments(cabang, status) {
    // Asumsi data sudah disimpan di localStorage oleh halaman utama
    const allDocs = JSON.parse(localStorage.getItem('svdokumen_filtered')) || [];
    return allDocs.filter(doc => {
        let match = true;
        if (cabang) match = match && (doc.cabang === cabang);
        if (status) match = match && (doc.status === status);
        return match;
    });
}

function renderExportInfo(params) {
    const infoDiv = document.getElementById('export-info');
    infoDiv.innerHTML = `<b>Cabang:</b> ${params.cabang || 'Semua'} | <b>Status:</b> ${params.status || 'Semua'}`;
}

function renderTable(docs) {
    const container = document.getElementById('export-table-container');
    if (docs.length === 0) {
        container.innerHTML = '<p>Tidak ada data sesuai filter.</p>';
        return;
    }
    let html = '<table class="table"><thead><tr>' +
        '<th>No</th><th>Kode Toko</th><th>Nama Toko</th><th>Cabang</th><th>Status</th></tr></thead><tbody>';
    docs.forEach((doc, i) => {
        html += `<tr><td>${i + 1}</td><td>${doc.kodeToko}</td><td>${doc.namaToko}</td><td>${doc.cabang}</td><td>${doc.status === 'complete' ? 'Sudah Lengkap' : 'Belum Lengkap'}</td></tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function downloadCSV(docs) {
    if (!docs.length) return;
    const header = ['No', 'Kode Toko', 'Nama Toko', 'Cabang', 'Status'];
    const rows = docs.map((doc, i) => [i + 1, doc.kodeToko, doc.namaToko, doc.cabang, doc.status === 'complete' ? 'Sudah Lengkap' : 'Belum Lengkap']);
    let csvContent = header.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export_dokumen.csv';
    a.click();
    URL.revokeObjectURL(url);
}

window.addEventListener('DOMContentLoaded', () => {
    const params = getQueryParams();
    renderExportInfo(params);
    const docs = getFilteredDocuments(params.cabang, params.status);
    renderTable(docs);
    document.getElementById('downloadCsvBtn').addEventListener('click', () => downloadCSV(docs));
});
