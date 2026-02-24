document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('#docTypeTabs .nav-link');
    const docTypeInput = document.getElementById('docTypeInput');
    const lingkupInput = document.getElementById('lingkupInput');

    // Fungsi untuk mengubah UI berdasarkan jenis dokumen
    function applyDocType(docType) {
        docTypeInput.value = docType;

        // Ubah tampilan tab aktif
        tabButtons.forEach(btn => {
            const active = btn.dataset.docType === docType;
            btn.classList.toggle('active', active);
        });

        // Ubah placeholder sesuai tab
        if (docType === 'spk') {
            lingkupInput.placeholder = 'Contoh: Sipil';
        } else {
            lingkupInput.placeholder = 'Contoh: Renovasi Sipil';
        }
    }

    // Event Listener untuk setiap tombol tab
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            applyDocType(btn.dataset.docType);
        });
    });

    // Inisialisasi awal ke tab RAB
    applyDocType('rab');

    // Event Listener untuk form submit
    document.getElementById('resendForm').addEventListener('submit', async function (e) {
        e.preventDefault(); // Mencegah page reload

        // Ambil nilai dari inputan
        const ulok = document.getElementById('ulokInput').value.trim();
        const lingkup = document.getElementById('lingkupInput').value.trim();
        const docType = docTypeInput.value;

        // Elemen UI
        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');
        const alertBox = document.getElementById('alertBox');

        // URL API Render Node.js Anda
        const API_URL = docType === 'spk'
            ? 'https://send-email-app.onrender.com/api/resend-email-spk'
            : 'https://send-email-app.onrender.com/api/resend-email';

        // State: Loading (Tombol disable & animasi memutar)
        submitBtn.disabled = true;
        btnText.textContent = 'Memproses...';
        btnSpinner.classList.remove('d-none');
        alertBox.style.display = 'none';
        
        // Reset class alert ke default agar tidak bentrok warnanya
        alertBox.className = 'alert mt-4 mb-0 shadow-sm'; 

        try {
            // Tembak API Node.js di Render
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ulok: ulok, lingkup: lingkup })
            });

            const result = await response.json();

            // Tangani Response
            if (response.ok) {
                // Berhasil
                alertBox.classList.add('alert-success', 'border-success');
                alertBox.innerHTML = `<i class="fa-solid fa-circle-check me-2"></i> ${result.message} <br> <small class="mt-1 d-block">Terkirim ke: <strong>${result.recipient}</strong> (${result.role})</small>`;
            } else {
                // Error dari server (misal: data tidak ketemu)
                alertBox.classList.add('alert-warning', 'border-warning');
                alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2"></i> ${result.error || result.message || 'Terjadi kesalahan.'}`;
            }

        } catch (error) {
            // Error jaringan atau server mati
            console.error('Fetch error:', error);
            alertBox.classList.add('alert-danger', 'border-danger');
            alertBox.innerHTML = `<i class="fa-solid fa-circle-xmark me-2"></i> Gagal terhubung ke server. Pastikan API berjalan dan internet stabil.`;
        } finally {
            // State: Selesai Loading (Kembalikan tombol seperti semula)
            submitBtn.disabled = false;
            btnText.textContent = 'Kirim Ulang Email';
            btnSpinner.classList.add('d-none');
            alertBox.style.display = 'block'; // Tampilkan alert
        }
    });
});