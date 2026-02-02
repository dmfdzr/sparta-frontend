const API_BASE_URL = "https://sparta-backend-5hdj.onrender.com";

// --- KONFIGURASI ---
const CONFIG = {
    PAGES: [
        { id: 1, img: '../../assets/floor.png' },
        { id: 2, img: '../../assets/floor3.jpeg' }, 
        { id: 3, img: '../../assets/floor2.jpeg' }
    ],
    // DAFTAR TITIK LENGKAP (38 TITIK)
    POINTS: [
        { id: 1, page: 1, x: 67.8, y: 92.8, label: "KANAN 50 M" },
        { id: 2, page: 1, x: 63.7, y: 97.5, label: "DEPAN KANAN" },
        { id: 3, page: 1, x: 50.5, y: 97.5, label: "DEPAN" },
        { id: 4, page: 1, x: 36.7, y: 97.5, label: "DEPAN KIRI" },
        { id: 5, page: 1, x: 32.9, y: 93.3, label: "KIRI 50 M" },
        { id: 6, page: 1, x: 32.8, y: 85.8, label: "KIRI BAHU JALAN" },
        { id: 7, page: 1, x: 67.8, y: 85.8, label: "KANAN BAHU JALAN" },
        { id: 8, page: 1, x: 66, y: 82.5, label: "TAMPAK KANAN DEPAN KEBELAKANG" },
        { id: 9, page: 1, x: 33.5, y: 81.8, label: "TAMPAK KIRI DEPAN KEBELAKANG" },
        { id: 10, page: 1, x: 65.1, y: 11.3, label: "KANAN BELAKANG BANGUNAN" },
        { id: 11, page: 1, x: 63.7, y: 7.8, label: "KANAN BELAKANG SAMPING" },
        { id: 12, page: 1, x: 37.5, y: 7.5, label: "KIRI BELAKANG SAMPING" },
        { id: 13, page: 1, x: 35, y: 11, label: "KIRI BELAKANG DEPAN" },
        { id: 14, page: 1, x: 58.2, y: 81.7, label: "INSTALASI LISTRIK POLE SIGN" },
        { id: 15, page: 1, x: 56.8, y: 73.3, label: "GUTTER" },
        { id: 16, page: 1, x: 57.6, y: 63.8, label: "KOLOM IWF" },
        { id: 17, page: 1, x: 59, y: 60, label: "KANAN TERAS LUAR" },
        { id: 18, page: 1, x: 41.4, y: 60.2, label: "KIRI TERAS LUAR" },
        { id: 19, page: 1, x: 61.5, y: 56.5, label: "KANAN TERAS DALAM" },
        { id: 20, page: 1, x: 39, y: 56.5, label: "KIRI TERAS DALAM" },
        { id: 21, page: 1, x: 48.7, y: 49.4, label: "PINTU KACA ALLUMUNIUM" },
        { id: 22, page: 1, x: 38.8, y: 52.5, label: "SUDUT KIRI DEPAN" },
        { id: 23, page: 1, x: 42.4, y: 45.5, label: "INSTALASI FREEZER" },
        { id: 24, page: 1, x: 58.8, y: 37.5, label: "SUDUT KANAN DEPAN" },
        { id: 25, page: 1, x: 61.1, y: 51, label: "INSTALASI MEJA KASIR" },
        { id: 26, page: 1, x: 61.5, y: 27.5, label: "SUDUT KANAN BELAKANG" },
        { id: 27, page: 1, x: 39, y: 28.2, label: "SUDUT KIRI BELAKANG" },
        { id: 28, page: 1, x: 61.7, y: 22.2, label: "SELASAR + JANITOR" },
        { id: 29, page: 1, x: 59.5, y: 12.5, label: "KAMAR MANDI" },
        { id: 30, page: 1, x: 53.1, y: 16.2, label: "GUDANG SEBELAH KANAN" },
        { id: 31, page: 1, x: 38.6, y: 13, label: "GUDANG SEBELAH KIRI" },
        { id: 32, page: 1, x: 48.5, y: 23.5, label: "INSTALASI DRAINASE CHILLER" },
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

// --- STATE ---
const STATE = {
    user: null,
    formData: {},
    photos: {}, // { id: base64 }
    currentPage: 1,
    activePoint: null,
    stream: null
};

// --- DOM ELEMENTS ---
const els = {
    headerCabang: document.getElementById('headerCabangText'),
    inputCabang: document.getElementById('inputCabang'),
    inputUlok: document.getElementById('inputNomorUlok'),
    views: {
        form: document.getElementById('view-form'),
        floor: document.getElementById('view-floorplan')
    },
    // Floor Elements
    floorImage: document.getElementById('floorImage'),
    pointsContainer: document.getElementById('pointsContainer'),
    photoGrid: document.getElementById('photoGrid'),
    progressFill: document.getElementById('progressBarFill'),
    progressText: document.getElementById('progressText'),
    countPhoto: document.getElementById('countPhoto'),
    fpStoreName: document.getElementById('fpStoreName'),
    fpDate: document.getElementById('fpDate'),
    completionSection: document.getElementById('completionSection'),
    // Camera
    cameraModal: document.getElementById('cameraModal'),
    video: document.getElementById('cameraFeed'),
    canvas: document.getElementById('cameraCanvas'),
    preview: document.getElementById('photoPreview'),
    cameraTitle: document.getElementById('cameraTitle'),
    fileInput: document.getElementById('fileInput')
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Auth dari Session Storage (dari login page sebelumnya)
    const isAuth = sessionStorage.getItem("authenticated");
    if (isAuth !== "true") {
        alert("Sesi tidak valid. Harap login kembali.");
        window.location.href = "../index.html"; 
        return;
    }

    // 2. Load User Info
    STATE.user = {
        username: sessionStorage.getItem("loggedInUserEmail"),
        cabang: sessionStorage.getItem("loggedInUserCabang")
    };
    
    // Update Header
    els.headerCabang.textContent = `Building & Maintenance — ${STATE.user.cabang}`;
    els.inputCabang.value = STATE.user.cabang;

    // 3. Operational Hours Check
    checkTime();
    setInterval(checkTime, 60000);

    // 4. Load Temp Data (jika ada)
    loadLocalData();

    // 5. Setup Events
    setupEvents();
});

// --- HELPER FUNCTIONS ---
function checkTime() {
    const now = new Date();
    // Konversi ke WIB UTC+7
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const wib = new Date(utc + (7 * 3600000));
    const h = wib.getHours();
    
    if (h >= 18 || h < 6) {
        document.getElementById('warningMsg').textContent = `Sekarang pukul ${h}:${wib.getMinutes()} WIB.\nLogin hanya 06.00-18.00 WIB.`;
        document.getElementById('warningModal').classList.remove('hidden');
        document.getElementById('btnLogoutNow').onclick = () => {
            sessionStorage.clear();
            window.location.href = "../index.html";
        };
    }
}

function loadLocalData() {
    const saved = localStorage.getItem('sparta_formData');
    if (saved) {
        STATE.formData = JSON.parse(saved);
        // Isi form field
        for (const [key, val] of Object.entries(STATE.formData)) {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) input.value = val;
        }
    }
    
    // Tarik data temp dari server jika Ulok diisi
    els.inputUlok.addEventListener('blur', async () => {
        const ulok = els.inputUlok.value;
        if(ulok.length > 5) {
            showLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/get-temp`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ nomorUlok: ulok })
                });
                const json = await res.json();
                if(json.ok && json.data) {
                    STATE.formData = { ...STATE.formData, ...json.data };
                    // Populate Form
                    for (const [key, val] of Object.entries(STATE.formData)) {
                        const input = document.querySelector(`[name="${key}"]`);
                        if (input) input.value = val;
                    }
                    showToast("Data ditemukan dan dimuat");
                }
            } catch(e) { console.error(e); }
            showLoading(false);
        }
    });
}

// --- NAVIGATION & LOGIC ---
function setupEvents() {
    // Submit Form
    document.getElementById('dataForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        STATE.formData = Object.fromEntries(fd.entries());
        
        // Simpan Local
        localStorage.setItem('sparta_formData', JSON.stringify(STATE.formData));
        
        // Pindah ke View Floor Plan
        switchView('FLOOR');
    });

    // Pagination
    document.querySelectorAll('.pagination-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pagination-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            STATE.currentPage = parseInt(btn.dataset.page);
            renderFloorPlan();
        });
    });

    // Back Buttons
    document.getElementById('btnBackToDashboard').onclick = () => window.location.href = "../dashboard/index.html";
    document.getElementById('btnBackToForm').onclick = () => switchView('FORM');

    // Camera Buttons
    document.getElementById('btnCapture').onclick = takePhoto;
    document.getElementById('btnCantPhoto').onclick = () => savePhotoResult('TIDAK BISA DIFOTO');
    document.getElementById('btnRetake').onclick = resetCamera;
    document.getElementById('btnCloseCamera').onclick = closeCamera;
    
    // Save Photo (Confirm)
    document.getElementById('btnSavePhoto').onclick = () => {
        savePhotoResult(els.preview.src);
    };

    // Upload File
    els.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (evt) => savePhotoResult(evt.target.result);
            reader.readAsDataURL(file);
        }
    });
    
    // Finish
    document.getElementById('btnFinish').onclick = finishProcess;
}

function switchView(view) {
    els.views.form.classList.add('hidden');
    els.views.floor.classList.add('hidden');
    
    if (view === 'FORM') els.views.form.classList.remove('hidden');
    if (view === 'FLOOR') {
        els.views.floor.classList.remove('hidden');
        initFloorPlanView();
    }
}

function initFloorPlanView() {
    // Set Info Header
    els.fpStoreName.textContent = `${STATE.formData.namaToko || '-'} (${STATE.formData.kodeToko || '-'})`;
    els.fpDate.textContent = STATE.formData.tanggalAmbilFoto || '-';
    
    renderFloorPlan();
    renderPhotoGrid(); // Render grid foto di bawah
}

// --- RENDER FUNCTIONS ---
function renderFloorPlan() {
    // Ganti Gambar
    const pageCfg = CONFIG.PAGES.find(p => p.id === STATE.currentPage);
    els.floorImage.src = pageCfg.img;

    // Bersihkan titik
    els.pointsContainer.innerHTML = '';

    // Render titik
    const points = CONFIG.POINTS.filter(p => p.page === STATE.currentPage);
    points.forEach(p => {
        const btn = document.createElement('div');
        const isDone = STATE.photos[p.id];
        btn.className = `point-btn ${isDone ? 'done' : ''}`;
        btn.textContent = p.id;
        btn.style.left = `${p.x}%`;
        btn.style.top = `${p.y}%`;
        btn.onclick = () => openCamera(p);
        
        // Cek urutan (harus urut)
        // Logic simple: Boleh klik kalau titik sebelumnya sudah ada, atau ini titik pertama
        // const prevDone = p.id === 1 || STATE.photos[p.id - 1]; 
        // if(!prevDone && !isDone) btn.style.opacity = '0.5'; // Optional styling
        
        els.pointsContainer.appendChild(btn);
    });
}

function renderPhotoGrid() {
    els.photoGrid.innerHTML = '';
    const sortedPoints = CONFIG.POINTS.sort((a,b) => a.id - b.id);
    let doneCount = 0;

    sortedPoints.forEach(p => {
        const photoData = STATE.photos[p.id];
        if(photoData) doneCount++;

        const div = document.createElement('div');
        div.className = `photo-item ${photoData ? 'completed' : ''}`;
        
        let thumbHtml = `<div class="photo-placeholder"><i class="fa-solid fa-camera"></i></div>`;
        if (photoData) {
            if (photoData === 'TIDAK BISA DIFOTO') {
                thumbHtml = `<div class="photo-placeholder" style="background:#fee2e2; color:#ef4444;"><i class="fa-solid fa-ban"></i></div>`;
            } else {
                thumbHtml = `<img src="${photoData}" class="photo-thumb">`;
            }
        }

        div.innerHTML = `
            <div class="photo-number">${p.id}</div>
            <div class="photo-label" title="${p.label}">${p.label}</div>
            ${thumbHtml}
        `;
        els.photoGrid.appendChild(div);
    });

    // Update Progress Bar
    const percent = (doneCount / 38) * 100;
    els.progressFill.style.width = `${percent}%`;
    els.progressText.textContent = `Progress: ${doneCount}/38 foto`;
    els.countPhoto.textContent = doneCount;

    if(doneCount === 38) {
        els.completionSection.classList.remove('hidden');
    } else {
        els.completionSection.classList.add('hidden');
    }
}

// --- CAMERA FUNCTIONS ---
async function openCamera(point) {
    STATE.activePoint = point;
    els.cameraTitle.textContent = `Foto #${point.id}: ${point.label}`;
    els.cameraModal.classList.remove('hidden');
    resetCamera();
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        STATE.stream = stream;
        els.video.srcObject = stream;
    } catch(e) {
        alert("Gagal akses kamera: " + e.message);
    }
}

function takePhoto() {
    if(!STATE.stream) return;
    els.canvas.width = els.video.videoWidth;
    els.canvas.height = els.video.videoHeight;
    const ctx = els.canvas.getContext('2d');
    ctx.drawImage(els.video, 0, 0);
    
    // Preview
    els.preview.src = els.canvas.toDataURL('image/jpeg', 0.7);
    els.preview.classList.remove('hidden');
    els.video.classList.add('hidden');
    
    // Toggle Buttons
    document.getElementById('actionCapture').classList.add('hidden');
    document.getElementById('actionConfirm').classList.remove('hidden');
}

function resetCamera() {
    els.preview.classList.add('hidden');
    els.video.classList.remove('hidden');
    document.getElementById('actionCapture').classList.remove('hidden');
    document.getElementById('actionConfirm').classList.add('hidden');
}

function closeCamera() {
    if(STATE.stream) {
        STATE.stream.getTracks().forEach(t => t.stop());
        STATE.stream = null;
    }
    els.cameraModal.classList.add('hidden');
}

async function savePhotoResult(data) {
    // Simpan ke state
    STATE.photos[STATE.activePoint.id] = data;
    
    // Simpan ke server (Temp)
    const payload = {
        nomorUlok: STATE.formData.nomorUlok,
        photoId: STATE.activePoint.id,
        photoNote: data === 'TIDAK BISA DIFOTO' ? 'TIDAK BISA DIFOTO' : null,
        photoBase64: data !== 'TIDAK BISA DIFOTO' ? data : null
    };

    showLoading(true, "Menyimpan...");
    try {
        await fetch(`${API_BASE_URL}/save-temp`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        showToast("Foto tersimpan");
    } catch(e) {
        console.error(e);
        showToast("Gagal simpan ke server (Saved Locally)");
    }
    showLoading(false);

    closeCamera();
    renderFloorPlan(); // Refresh titik di denah
    renderPhotoGrid(); // Refresh grid di bawah
}

// --- PDF & FINISH ---
async function finishProcess() {
    if(!confirm("Yakin ingin menyimpan dan memproses PDF?")) return;
    
    showLoading(true, "Membuat PDF...");
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Cover
        doc.setFontSize(16);
        doc.text("DOKUMENTASI BANGUNAN TOKO BARU", 105, 20, null, null, "center");
        doc.setFontSize(12);
        doc.text(`Toko: ${STATE.formData.namaToko} (${STATE.formData.kodeToko})`, 105, 30, null, null, "center");
        
        let y = 40;
        let pIndex = 0;
        const points = CONFIG.POINTS.sort((a,b)=>a.id-b.id);
        
        for(let i=0; i<points.length; i++) {
            const p = points[i];
            const imgData = STATE.photos[p.id];
            
            if(imgData && imgData !== 'TIDAK BISA DIFOTO') {
                if(y > 250) { doc.addPage(); y = 20; }
                
                doc.setFontSize(10);
                doc.text(`#${p.id} ${p.label}`, 20, y);
                doc.addImage(imgData, 'JPEG', 20, y+5, 80, 60);
                
                // Layout 2 kolom (simple logic for now vertical)
                y += 80;
            }
        }
        
        const pdfBase64 = doc.output('datauristring');
        
        // Final Save
        const finalData = { ...STATE.formData, emailPengirim: STATE.user.username, pdfBase64 };
        const res = await fetch(`${API_BASE_URL}/save-toko`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(finalData)
        });
        
        const json = await res.json();
        if(json.ok) {
            alert("Berhasil! Data tersimpan.");
            localStorage.removeItem('sparta_formData');
            window.location.reload();
        } else {
            throw new Error(json.error);
        }
        
    } catch(e) {
        alert("Error: " + e.message);
    }
    showLoading(false);
}

// --- UI UTILS ---
function showLoading(show, txt) {
    const el = document.getElementById('loadingOverlay');
    if(show) {
        if(txt) document.getElementById('loadingText').textContent = txt;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(()=>t.classList.add('hidden'), 3000);
}