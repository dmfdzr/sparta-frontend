/* =========================================
   SPARTA - DOKUMENTASI BANGUNAN (FULL MIGRATION)
   ========================================= */

const API_BASE_URL = "https://dokumentasi-bangunan.onrender.com";

// --- DATA CONFIGURATION ---
const CONFIG = {
    // Definisi Lantai
    PAGES: [
        { id: 1, img: './assets/floor.png' },
        { id: 2, img: './assets/floor3.jpeg' }, // Sesuai mapping asli
        { id: 3, img: './assets/floor2.jpeg' }
    ],
    // FULL 38 TITIK (Extracted from FloorPlan.js)
    POINTS: [
        // Page 1
        { id: 1, page: 1, x: 67.8, y: 92.8, label: "KANAN 50 M" },
        { id: 2, page: 1, x: 63.7, y: 97.5, label: "DEPAN KANAN" },
        { id: 3, page: 1, x: 50.5, y: 97.5, label: "DEPAN" },
        { id: 4, page: 1, x: 36.7, y: 97.5, label: "DEPAN KIRI" },
        { id: 5, page: 1, x: 32.9, y: 93.3, label: "KIRI 50 M" },
        { id: 6, page: 1, x: 32.8, y: 85.8, label: "KIRI BAHU JALAN" },
        { id: 7, page: 1, x: 67.8, y: 85.8, label: "KANAN BAHU JALAN" },
        { id: 8, page: 1, x: 66, y: 82.5, label: "TAMPAK KANAN DEPAN KEBELAKANG" },
        { id: 9, page: 1, x: 33.5, y: 81.8, label: "TAMPAK KIRI DEPAN KEBELAKANG" },
        { id: 10, page: 1, x: 65.1, y: 11.3, label: "KANAN BELAKANG BANGUNAN MENGHADAP DEPAN" },
        { id: 11, page: 1, x: 63.7, y: 7.8, label: "KANAN BELAKANG BANGUNAN MENGHADAP SAMPING" },
        { id: 12, page: 1, x: 37.5, y: 7.5, label: "KIRI BELAKANG BANGUNAN MENGHADAP SAMPING" },
        { id: 13, page: 1, x: 35, y: 11, label: "KIRI BELAKANG BANGUNAN MENGHADAP DEPAN" },
        { id: 14, page: 1, x: 58.2, y: 81.7, label: "INSTALASI LISTRIK POLE SIGN" },
        { id: 15, page: 1, x: 56.8, y: 73.3, label: "GUTTER" },
        { id: 16, page: 1, x: 57.6, y: 63.8, label: "KOLOM IWF DUDUKAN LISTPLANK" },
        { id: 17, page: 1, x: 59, y: 60, label: "KANAN TERAS LUAR" },
        { id: 18, page: 1, x: 41.4, y: 60.2, label: "KIRI TERAS LUAR" },
        { id: 19, page: 1, x: 61.5, y: 56.5, label: "KANAN TERAS DALAM" },
        { id: 20, page: 1, x: 39, y: 56.5, label: "KIRI TERAS DALAM" },
        { id: 21, page: 1, x: 48.7, y: 49.4, label: "PINTU KACA ALLUMUNIUM" },
        { id: 22, page: 1, x: 38.8, y: 52.5, label: "SUDUT KIRI DEPAN AREA SALES" },
        { id: 23, page: 1, x: 42.4, y: 45.5, label: "INSTALASI LISTRIK FREEZER" },
        { id: 24, page: 1, x: 58.8, y: 37.5, label: "SUDUT KANAN DEPAN AREA SALES" },
        { id: 25, page: 1, x: 61.1, y: 51, label: "INSTALASI LISTRIK MEJA KASIR" },
        { id: 26, page: 1, x: 61.5, y: 27.5, label: "SUDUT KANAN BELAKANG AREA SALES" },
        { id: 27, page: 1, x: 39, y: 28.2, label: "SUDUT KIRI BELAKANG AREA SALES" },
        { id: 28, page: 1, x: 61.7, y: 22.2, label: "SELASAR + JANITOR" },
        { id: 29, page: 1, x: 59.5, y: 12.5, label: "KAMAR MANDI" },
        { id: 30, page: 1, x: 53.1, y: 16.2, label: "GUDANG SEBELAH KANAN" },
        { id: 31, page: 1, x: 38.6, y: 13, label: "GUDANG SEBELAH KIRI" },
        { id: 32, page: 1, x: 48.5, y: 23.5, label: "INSTALASI LISTRIK & DRAINASE CHILLER" },
        { id: 37, page: 1, x: 59.7, y: 68.8, label: "SEPTICTANK EXISTING" },
        { id: 38, page: 1, x: 41, y: 68.8, label: "SUMUR EXISTING" },
        // Page 2
        { id: 34, page: 2, x: 50, y: 51.8, label: "INSTALASI LISTRIK DAN LISTPLANK" },
        { id: 33, page: 2, x: 61.3, y: 24, label: "AREA DAG TORN" },
        // Page 3
        { id: 35, page: 3, x: 61.1, y: 57.2, label: "CREMONA DIATAS FOLDING GATE" },
        { id: 36, page: 3, x: 61, y: 53.5, label: "INSTALASI LISTRIK DIATAS PLAFOND" }
    ]
};

// --- STATE MANAGEMENT ---
const STATE = {
    user: null,
    formData: {},
    photos: {}, // { id: base64_string }
    currentPage: 1,
    activePoint: null,
    stream: null
};

// --- DOM ELEMENTS ---
const els = {
    // View Sections
    views: {
        form: document.getElementById('view-form'),
        floor: document.getElementById('view-floorplan')
    },
    // Form Elements
    form: document.getElementById('dataForm'),
    inputs: document.querySelectorAll('#dataForm input'),
    inputCabang: document.getElementById('inputCabang'),
    inputNomorUlok: document.getElementById('inputNomorUlok'),
    userDisplay: document.getElementById('userDisplay'),
    // Floor Elements
    floorImage: document.getElementById('floorImage'),
    mapWrapper: document.getElementById('mapWrapper'),
    pageBtns: document.querySelectorAll('.page-btn'),
    progressText: document.getElementById('progressText'),
    btnFinish: document.getElementById('btnFinish'),
    // Camera Elements
    cameraModal: document.getElementById('cameraModal'),
    video: document.getElementById('cameraFeed'),
    canvas: document.getElementById('cameraCanvas'),
    photoPreview: document.getElementById('photoPreview'),
    cameraTitle: document.getElementById('cameraTitle'),
    fileInput: document.getElementById('fileInput'),
    // Actions
    actionCapture: document.getElementById('actionCapture'),
    actionConfirm: document.getElementById('actionConfirm'),
    // Loading & Toast
    loading: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    toast: document.getElementById('toast'),
    warningModal: document.getElementById('warningModal'),
    warningMsg: document.getElementById('warningMsg')
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Auth dari Session Storage (dari login sebelumnya)
    const isAuth = sessionStorage.getItem("authenticated");
    if (isAuth !== "true") {
        alert("Sesi tidak valid. Harap login kembali.");
        window.location.href = "../index.html"; // Redirect ke halaman login utama
        return;
    }

    // 2. Load User Data
    STATE.user = {
        username: sessionStorage.getItem("loggedInUserEmail"),
        cabang: sessionStorage.getItem("loggedInUserCabang") // Cabang disimpan di sini
    };
    els.userDisplay.textContent = `User: ${STATE.user.username} | Cabang: ${STATE.user.cabang}`;
    els.inputCabang.value = STATE.user.cabang;

    // 3. Setup Logic Waktu (06:00 - 18:00 WIB)
    checkOperationalHours();
    setInterval(checkOperationalHours, 60000); // Cek tiap menit

    // 4. Load Data Temp jika ada
    await loadTempData();

    // 5. Setup Event Listeners
    setupEvents();
});

// --- OPERATIONAL HOURS LOGIC ---
function checkOperationalHours() {
    const now = new Date();
    // Convert to WIB (UTC+7)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (7 * 3600000));
    const hour = wib.getHours();

    if (hour >= 18 || hour < 6) {
        showWarningModal(`Sekarang pukul ${wib.getHours()}:${wib.getMinutes()} WIB.\nLogin hanya 06.00-18.00 WIB.`);
    }
}

function showWarningModal(msg) {
    els.warningMsg.textContent = msg;
    els.warningModal.classList.remove('hidden');
    document.getElementById('btnLogoutNow').onclick = () => {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "../index.html";
    };
}

// --- NAVIGATION & FORM LOGIC ---
function switchView(view) {
    els.views.form.classList.add('hidden');
    els.views.floor.classList.add('hidden');
    
    if (view === 'FORM') els.views.form.classList.remove('hidden');
    if (view === 'FLOOR') {
        els.views.floor.classList.remove('hidden');
        renderPoints();
    }
}

async function loadTempData() {
    // Coba load dari LocalStorage dulu (offline support basic)
    const savedForm = localStorage.getItem('formData');
    if (savedForm) {
        const data = JSON.parse(savedForm);
        STATE.formData = data;
        Object.keys(data).forEach(key => {
            const input = els.form.querySelector(`[name="${key}"]`);
            if (input) input.value = data[key];
        });
    }

    // Jika user isi Ulok, coba tarik dari API Backend
    els.inputNomorUlok.addEventListener('blur', async () => {
        const ulok = els.inputNomorUlok.value;
        if (!ulok) return;
        
        showLoading(true, "Mencari Data...");
        try {
            const res = await fetch(`${API_BASE_URL}/get-temp`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ nomorUlok: ulok })
            });
            const json = await res.json();
            if (json.ok && json.data) {
                // Populate form
                Object.keys(json.data).forEach(key => {
                    const input = els.form.querySelector(`[name="${key}"]`);
                    if (input) input.value = json.data[key];
                });
                // Populate photos
                if (json.data.photos && Array.isArray(json.data.photos)) {
                    // Logic restore photos (perlu fetch blob url, disederhanakan disini)
                    console.log("Found existing photos count:", json.data.photos.length);
                }
                showToast("Data ditemukan dan dimuat");
            }
        } catch (e) {
            console.warn("Gagal fetch temp:", e);
        } finally {
            showLoading(false);
        }
    });
}

function setupEvents() {
    // Form Submit
    els.form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(els.form);
        STATE.formData = Object.fromEntries(formData.entries());
        
        // Auto Save Temp
        localStorage.setItem('formData', JSON.stringify(STATE.formData));
        await saveTempData(); // Kirim ke backend
        
        switchView('FLOOR');
    });

    // Pagination Denah
    els.pageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.pageBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            STATE.currentPage = parseInt(btn.dataset.page);
            renderPoints();
        });
    });

    // Button Back
    document.getElementById('btnBackToForm').onclick = () => switchView('FORM');
    document.getElementById('btnBackToDashboard').onclick = () => window.location.href = "../dashboard/index.html";

    // Camera Actions
    document.getElementById('btnCapture').onclick = takePicture;
    document.getElementById('btnCantPhoto').onclick = () => handlePhotoResult('TIDAK BISA DIFOTO');
    document.getElementById('btnRetake').onclick = resetCameraUI;
    document.getElementById('btnCloseCamera').onclick = closeCamera;
    
    // Save Photo
    document.getElementById('btnSavePhoto').onclick = async () => {
        const base64 = els.photoPreview.src;
        await handlePhotoResult(base64);
    };

    // File Upload
    els.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (res) => handlePhotoResult(res.target.result);
            reader.readAsDataURL(file);
        }
    });

    // Final Finish
    els.btnFinish.onclick = finishProcess;
}

// --- FLOOR PLAN & POINTS ---
function renderPoints() {
    // Update Image Background
    const pageConfig = CONFIG.PAGES.find(p => p.id === STATE.currentPage);
    els.floorImage.src = pageConfig.img;

    // Clear existing
    els.mapWrapper.querySelectorAll('.point-btn').forEach(e => e.remove());

    // Filter points for current page
    const points = CONFIG.POINTS.filter(p => p.page === STATE.currentPage);

    points.forEach(p => {
        const btn = document.createElement('div');
        btn.className = `point-btn ${STATE.photos[p.id] ? 'done' : ''}`;
        btn.textContent = p.id;
        btn.style.left = `${p.x}%`;
        btn.style.top = `${p.y}%`;
        
        btn.onclick = () => openCamera(p);
        els.mapWrapper.appendChild(btn);
    });

    updateProgress();
}

function updateProgress() {
    const total = CONFIG.POINTS.length;
    const current = Object.keys(STATE.photos).length;
    els.progressText.textContent = `${current}/${total} Selesai`;
    
    if (current >= total) {
        els.btnFinish.classList.remove('hidden');
    }
}

// --- CAMERA LOGIC ---
async function openCamera(point) {
    STATE.activePoint = point;
    els.cameraTitle.textContent = `#${point.id} ${point.label}`;
    els.cameraModal.classList.remove('hidden');
    resetCameraUI();

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        STATE.stream = stream;
        els.video.srcObject = stream;
    } catch (err) {
        alert("Gagal membuka kamera: " + err.message);
        els.cameraModal.classList.add('hidden');
    }
}

function takePicture() {
    if (!STATE.stream) return;
    
    const w = els.video.videoWidth;
    const h = els.video.videoHeight;
    els.canvas.width = w;
    els.canvas.height = h;
    
    const ctx = els.canvas.getContext('2d');
    ctx.drawImage(els.video, 0, 0, w, h);
    
    // Convert to Base64 (JPEG Quality 0.7)
    const dataUrl = els.canvas.toDataURL('image/jpeg', 0.7);
    
    // Show Preview
    els.photoPreview.src = dataUrl;
    els.photoPreview.classList.remove('hidden');
    els.video.classList.add('hidden');
    
    // Toggle Actions
    els.actionCapture.classList.add('hidden');
    els.actionConfirm.classList.remove('hidden');
}

function resetCameraUI() {
    els.photoPreview.classList.add('hidden');
    els.video.classList.remove('hidden');
    els.actionCapture.classList.remove('hidden');
    els.actionConfirm.classList.add('hidden');
}

function closeCamera() {
    if (STATE.stream) {
        STATE.stream.getTracks().forEach(t => t.stop());
        STATE.stream = null;
    }
    els.cameraModal.classList.add('hidden');
}

async function handlePhotoResult(data) {
    // data bisa berupa Base64 string atau text "TIDAK BISA DIFOTO"
    const pointId = STATE.activePoint.id;
    
    // 1. Simpan ke State Lokal
    // Jika "TIDAK BISA DIFOTO", kita pakai placeholder image (bisa diload dari assets)
    if (data === 'TIDAK BISA DIFOTO') {
        // Gunakan path relatif ke placeholder
        STATE.photos[pointId] = './assets/fototidakbisadiambil.jpeg'; 
    } else {
        STATE.photos[pointId] = data;
    }

    // 2. Kirim ke Backend (Auto Save)
    showLoading(true, "Menyimpan foto...");
    try {
        const payload = {
            nomorUlok: STATE.formData.nomorUlok,
            photoId: pointId,
            // Jika TIDAK BISA DIFOTO, kirim note. Jika ada foto, kirim base64.
            photoNote: data === 'TIDAK BISA DIFOTO' ? 'TIDAK BISA DIFOTO' : null,
            photoBase64: data !== 'TIDAK BISA DIFOTO' ? data : null
        };
        
        await fetch(`${API_BASE_URL}/save-temp`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        showToast(`Foto #${pointId} tersimpan`);
        closeCamera();
        renderPoints();

    } catch (err) {
        alert("Gagal menyimpan ke server: " + err.message);
    } finally {
        showLoading(false);
    }
}

async function saveTempData() {
    try {
        await fetch(`${API_BASE_URL}/save-temp`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(STATE.formData)
        });
    } catch (e) { console.error("Auto-save failed", e); }
}

// --- FINISH & PDF ---
async function finishProcess() {
    if (!confirm("Apakah Anda yakin ingin menyimpan dan memproses PDF?")) return;

    showLoading(true, "Membuat PDF...");

    try {
        // 1. Generate PDF Client-Side using jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.text("DOKUMENTASI BANGUNAN TOKO BARU", 105, 15, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Toko: ${STATE.formData.namaToko} (${STATE.formData.kodeToko})`, 105, 25, null, null, "center");
        doc.text(`Ulok: ${STATE.formData.nomorUlok}`, 105, 32, null, null, "center");

        let yPos = 40;
        let count = 0;
        
        // Loop through all points sorted by ID
        const sortedPoints = CONFIG.POINTS.sort((a,b) => a.id - b.id);
        
        for (const p of sortedPoints) {
            const imgData = STATE.photos[p.id];
            if (imgData) {
                // Tambah Halaman baru setiap 2 foto agar rapi
                if (count > 0 && count % 2 === 0) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFontSize(10);
                doc.text(`#${p.id} - ${p.label}`, 20, yPos);
                
                // Add Image (pastikan base64 valid)
                if (imgData.startsWith('data:image')) {
                    doc.addImage(imgData, 'JPEG', 20, yPos + 5, 120, 90); // Sesuaikan ukuran
                } else {
                     doc.text("[Gambar tidak tersedia]", 20, yPos + 20);
                }
                
                yPos += 110;
                count++;
            }
        }

        const pdfBase64 = doc.output('datauristring'); // Format: "data:application/pdf;base64,..."

        // 2. Kirim ke Backend (saveToko)
        showLoading(true, "Mengirim Data...");
        
        const finalPayload = {
            ...STATE.formData,
            emailPengirim: STATE.user.username,
            pdfBase64: pdfBase64
        };

        const res = await fetch(`${API_BASE_URL}/save-toko`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(finalPayload)
        });
        
        const json = await res.json();
        
        if (json.ok) {
            // 3. Kirim Email (Opsional, backend mungkin sudah handle trigger email)
             await fetch(`${API_BASE_URL}/send-pdf-email`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    email: STATE.user.username,
                    pdfBase64: pdfBase64,
                    filename: `Dokumentasi_${STATE.formData.kodeToko}.pdf`,
                    ...STATE.formData
                })
            });

            alert("Berhasil! Data disimpan dan PDF telah dikirim.");
            localStorage.removeItem('formData'); // Clear temp
            location.reload(); // Refresh
        } else {
            throw new Error(json.error || "Gagal menyimpan data akhir");
        }

    } catch (e) {
        alert("Terjadi kesalahan: " + e.message);
        console.error(e);
    } finally {
        showLoading(false);
    }
}

// --- UI UTILS ---
function showLoading(show, text="Loading...") {
    els.loadingText.textContent = text;
    if (show) els.loading.classList.remove('hidden');
    else els.loading.classList.add('hidden');
}

function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    setTimeout(() => els.toast.classList.add('hidden'), 3000);
}