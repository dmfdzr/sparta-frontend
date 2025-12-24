if (!sessionStorage.getItem('loggedInUserCabang')) {
    window.location.replace('../../auth/kontraktor/login.html');
}

const API_BASE_URL = "https://sparta-backend-5hdj.onrender.com/api";
const ENDPOINTS = {
    ulokList: `${API_BASE_URL}/get_ulok_by_email`,
    ganttData: `${API_BASE_URL}/get_gantt_data`,
    insertData: `${API_BASE_URL}/gantt/insert`,
};

let projects = [];
let currentProject = null;
let projectTasks = {};
let ganttApiData = null;
let ganttApiError = null;
let isLoadingGanttData = false;
let hasUserInput = false;
let isProjectLocked = false;
let filteredCategories = null;

// ==================== TASK TEMPLATES ====================
const taskTemplateME = [
    { id: 1, name: 'Instalasi', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 2, name: 'Fixture', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 3, name: 'Pekerjaan Tambahan', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 4, name: 'Pekerjaan SBO', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
];

const taskTemplateSipil = [
    { id: 1, name: 'Pekerjaan Persiapan', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 2, name: 'Pekerjaan Bobokan/Bongkaran', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 3, name: 'Pekerjaan Tanah', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 4, name: 'Pekerjaan Pondasi & Beton', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 5, name: 'Pekerjaan Pasangan', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 6, name: 'Pekerjaan Besi', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 7, name: 'Pekerjaan Keramik', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 8, name: 'Pekerjaan Plumbing', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 9, name: 'Pekerjaan Sanitary & Acecories', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 10, name: 'Pekerjaan Janitor', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 11, name: 'Pekerjaan Atap', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 12, name: 'Pekerjaan Kusen, Pintu, dan Kaca', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 13, name: 'Pekerjaan Finishing', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 14, name: 'Pekerjaan Beanspot', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 15, name: 'Pekerjaan Area Terbuka', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 16, name: 'Pekerjaan Tambahan', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
    { id: 17, name: 'Pekerjaan SBO', start: 0, duration: 0, dependencies: [], manualDependencies: [] },
];

let currentTasks = [];
const totalDaysME = 100;
const totalDaysSipil = 205;

// ==================== HELPER FUNCTIONS ====================
function formatDateID(date) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options);
}

function extractUlokAndLingkup(value) {
    if (!value) return { ulok: '', lingkup: '' };

    const trimmed = String(value).trim();
    const parts = trimmed.split('-');

    if (parts.length < 2) {
        return { ulok: trimmed, lingkup: '' };
    }

    const lingkupRaw = parts.pop();
    const ulok = parts.join('-');
    const lingkupUpper = lingkupRaw.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const lingkup = lingkupUpper === 'ME' ? 'ME' : 'Sipil';

    return { ulok, lingkup };
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showLoadingMessage() {
    const chart = document.getElementById('ganttChart');
    chart.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #6c757d;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏳</div>
            <h2 style="margin-bottom: 15px;">Memuat Data...</h2>
            <p>Sedang mengambil data proyek dari server.</p>
        </div>
    `;
}

function showErrorMessage(message) {
    const chart = document.getElementById('ganttChart');
    chart.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #e53e3e;">
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h2 style="margin-bottom: 15px;">Terjadi Kesalahan</h2>
            <p>${message}</p>
            <button onclick="loadDataAndInit()" style="margin-top: 20px; padding: 10px 20px; background: #3182ce; color: white; border: none; border-radius: 6px; cursor: pointer;">
                🔄 Coba Lagi
            </button>
        </div>
    `;
}

function showSelectProjectMessage() {
    const chart = document.getElementById('ganttChart');
    chart.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #6c757d;">
            <h2 style="margin-bottom: 15px;">📋 Pilih No. Ulok</h2>
            <p>Data berhasil dimuat. Silakan pilih proyek di atas.</p>
        </div>
    `;
    document.getElementById('projectInfo').innerHTML = '';
    document.getElementById('stats').innerHTML = '';
    document.getElementById('exportButtons').style.display = 'none';
    document.getElementById('dependencyManager').style.display = 'none';
    ganttApiData = null;
    ganttApiError = null;
    hasUserInput = false;
    isProjectLocked = false;
    filteredCategories = null;
    renderApiData();
}

function showPleaseInputMessage() {
    const chart = document.getElementById('ganttChart');
    chart.innerHTML = `
        <div style="text-align: center; padding: 60px; color: #6c757d;">
            <div style="font-size: 48px; margin-bottom: 20px;">⏱️</div>
            <h2 style="margin-bottom: 15px;">Silakan Input Jadwal Pengerjaan</h2>
            <p>Masukkan hari mulai dan selesai untuk setiap tahapan di form di atas, kemudian klik <strong>"Terapkan Jadwal"</strong>.</p>
        </div>
    `;
}

// ==================== PARSE PROJECT DATA ====================
function parseProjectFromLabel(label, value) {
    const parts = label.split(' - ');
    const { ulok: ulokClean, lingkup } = extractUlokAndLingkup(value);

    let ulokNumber = ulokClean || value.replace(/-ME|-Sipil/gi, '');
    let projectName = "Reguler";
    let storeName = "Tidak Diketahui";
    let workType = lingkup || 'Sipil';
    let projectType = "Reguler";

    if (label.toUpperCase().includes('(ME)')) {
        workType = 'ME';
    }

    if (parts.length >= 3) {
        projectName = parts[1].replace(/\(ME\)|\(Sipil\)/gi, '').trim();
        storeName = parts[2].trim();
        if (label.toUpperCase().includes('RENOVASI') || ulokNumber.includes('-R')) {
            projectType = "Renovasi";
        }
    } else if (parts.length === 2) {
        storeName = parts[1].replace(/\(ME\)|\(Sipil\)/gi, '').trim();
    }

    return {
        ulok: value,
        ulokClean: ulokClean || ulokNumber,
        ulokNumber: ulokNumber,
        name: projectName,
        store: storeName,
        work: workType,
        lingkup: workType,
        projectType: projectType,
        startDate: new Date().toISOString().split('T')[0],
        durasi: workType === 'ME' ? 37 : 184,
        alamat: "",
        status: "Berjalan"
    };
}

// ==================== FETCH DATA FROM API ====================
async function loadDataAndInit() {
    try {
        showLoadingMessage();
        const userEmail = sessionStorage.getItem('loggedInUserEmail');
        const urlWithParam = `${ENDPOINTS.ulokList}?email=${encodeURIComponent(userEmail)}`;
        const response = await fetch(urlWithParam);
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP Error: ${response.status}`);
        }

        const apiData = await response.json();

        if (!Array.isArray(apiData)) {
            throw new Error("Format data API tidak valid (harus array)");
        }

        projects = apiData.map(item => parseProjectFromLabel(item.label, item.value));

        if (projects.length === 0) {
            showErrorMessage("Tidak ada data proyek ditemukan untuk email ini.");
            return;
        }

        initChart();

    } catch (error) {
        console.error("❌ Error loading data:", error);
        showErrorMessage(`Gagal memuat data: ${error.message}`);
    }
}

function initChart() {
    const ulokSelect = document.getElementById('ulokSelect');
    ulokSelect.innerHTML = '<option value="">-- Pilih Proyek --</option>';

    projects.forEach(project => {
        projectTasks[project.ulok] = [];
        const option = document.createElement('option');
        option.value = project.ulok;
        option.textContent = `${project.ulok} | ${project.store} (${project.work})`;
        ulokSelect.appendChild(option);
    });
    ulokSelect.addEventListener('change', (e) => {
        const selectedUlok = e.target.value;
        if (selectedUlok) {
            localStorage.setItem('lastSelectedUlok', selectedUlok);
        } else {
            localStorage.removeItem('lastSelectedUlok');
        }
        if (!selectedUlok) {
            showSelectProjectMessage();
            return;
        }
        currentProject = projects.find(p => p.ulok === selectedUlok);
        if (projectTasks[selectedUlok]) {
            currentTasks = projectTasks[selectedUlok];
        }
        hasUserInput = false;
        isProjectLocked = false;
        fetchGanttDataForSelection(selectedUlok);
        renderProjectInfo();
        updateStats();
        document.getElementById('exportButtons').style.display = 'block';
        document.getElementById('dependencyManager').style.display = 'none';
    });
    const savedUlok = localStorage.getItem('lastSelectedUlok');
    if (savedUlok) {
        const projectExists = projects.some(p => p.ulok === savedUlok);
        if (projectExists) {
            ulokSelect.value = savedUlok;
            ulokSelect.dispatchEvent(new Event('change'));
        }
    }
    showSelectProjectMessage();
}

// ==================== GANTT DATA FETCH (API) ====================
async function fetchGanttDataForSelection(selectedValue) {
    if (!selectedValue) {
        ganttApiData = null;
        renderApiData();
        return;
    }

    const { ulok, lingkup } = extractUlokAndLingkup(selectedValue);

    isLoadingGanttData = true;
    ganttApiError = null;
    renderApiData();

    const url = `${ENDPOINTS.ganttData}?ulok=${encodeURIComponent(ulok)}&lingkup=${encodeURIComponent(lingkup)}`;
    console.log(`🔗 Fetching Gantt Data from: ${url}`);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Data Gantt tidak ditemukan di server (404).");
            }
            throw new Error(`Gagal mengambil data (Status: ${response.status})`);
        }

        const data = await response.json();
        ganttApiData = data;

        if (currentProject && data?.rab) {
            updateProjectFromRab(data.rab);
        }

        if (data.filtered_categories && Array.isArray(data.filtered_categories)) {
            filteredCategories = data.filtered_categories;
            console.log("📂 Filtered Categories:", filteredCategories);
        } else {
            filteredCategories = null;
        }

        if (data.gantt_data && typeof data.gantt_data === 'object') {
            console.log("📊 gantt_data ditemukan di response");

            const ganttData = data.gantt_data;
            const ganttStatus = String(ganttData.Status || '').trim().toLowerCase();

            if (['terkunci', 'locked', 'published'].includes(ganttStatus)) {
                isProjectLocked = true;
                console.log("🔒 Status Project: TERKUNCI");
            } else {
                isProjectLocked = false;
                console.log("🔓 Status Project: ACTIVE");
            }

            parseGanttDataToTasks(ganttData, selectedValue);
            hasUserInput = true;

        } else {
            console.warn("⚠️ Response API valid, tetapi tidak memiliki properti 'gantt_data'.");
            throw new Error("Format data API tidak valid: 'gantt_data' hilang.");
        }

    } catch (error) {
        console.warn('⚠️ Menggunakan template default:', error.message);
        ganttApiError = null;

        if (currentProject) {
            let templateTasks;
            if (currentProject.work === 'ME') {
                templateTasks = JSON.parse(JSON.stringify(taskTemplateME));
            } else {
                templateTasks = JSON.parse(JSON.stringify(taskTemplateSipil));
            }

            if (filteredCategories && Array.isArray(filteredCategories) && filteredCategories.length > 0) {
                currentTasks = templateTasks.filter(task => {
                    return filteredCategories.some(cat =>
                        task.name.toUpperCase().includes(cat.toUpperCase()) ||
                        cat.toUpperCase().includes(task.name.toUpperCase())
                    );
                });
                currentTasks = currentTasks.map((task, idx) => ({ ...task, id: idx + 1 }));
                console.log(`📋 Tasks filtered: ${currentTasks.length} dari ${templateTasks.length}`);
            } else {
                currentTasks = templateTasks;
            }

            // Initialize with empty ranges
            currentTasks = currentTasks.map(task => ({
                ...task,
                inputData: { ranges: [] }
            }));

            projectTasks[selectedValue] = currentTasks;
            hasUserInput = false;
            isProjectLocked = false;
        }

    } finally {
        isLoadingGanttData = false;
        renderProjectInfo();
        renderApiData();

        if (hasUserInput && currentTasks.length > 0) {
            renderChart();
        } else {
            if (ganttApiError) {
                showErrorMessage(ganttApiError);
            } else {
                showPleaseInputMessage();
            }
        }
        updateStats();
    }
}

// ==================== PARSE GANTT_DATA TO TASKS ====================
function parseGanttDataToTasks(ganttData, selectedValue) {
    if (!currentProject || !ganttData) return;

    let dynamicTasks = [];
    let earliestDate = null;
    let tempTaskList = [];
    let i = 1;

    while (true) {
        const kategoriKey = `Kategori_${i}`;
        const mulaiKey = `Hari_Mulai_Kategori_${i}`;
        const selesaiKey = `Hari_Selesai_Kategori_${i}`;
        const keterlambatanKey = `Keterlambatan_Kategori_${i}`;
        const dependencyKey = `Dependencies_Kategori_${i}`;

        if (!ganttData.hasOwnProperty(kategoriKey)) {
            break;
        }

        const kategoriName = ganttData[kategoriKey];
        const hariMulai = ganttData[mulaiKey];
        const hariSelesai = ganttData[selesaiKey];
        const keterlambatan = parseInt(ganttData[keterlambatanKey]) || 0;
        const dependenciesStr = ganttData[dependencyKey] || '';

        if (kategoriName) {
            let sDate = null;
            if (hariMulai && hariMulai.trim() !== '') {
                sDate = new Date(hariMulai);
                if (!isNaN(sDate.getTime())) {
                    if (!earliestDate || sDate < earliestDate) {
                        earliestDate = sDate;
                    }
                }
            }

            // Parse dependencies (comma-separated task IDs)
            const dependencies = dependenciesStr.split(',')
                .map(d => parseInt(d.trim()))
                .filter(d => !isNaN(d) && d > 0);

            tempTaskList.push({
                id: i,
                name: kategoriName,
                rawStart: sDate,
                rawEnd: hariSelesai ? new Date(hariSelesai) : null,
                keterlambatan: keterlambatan,
                manualDependencies: dependencies
            });
        }
        i++;
    }

    if (!earliestDate) {
        earliestDate = new Date();
    }

    const projectStartDate = earliestDate;
    currentProject.startDate = projectStartDate.toISOString().split('T')[0];
    console.log(`📆 Project Start Date (dari gantt_data): ${currentProject.startDate}`);
    const msPerDay = 1000 * 60 * 60 * 24;

    tempTaskList.forEach(item => {
        let startDay = 0;
        let duration = 0;
        let endDay = 0;

        if (item.rawStart && item.rawEnd && !isNaN(item.rawStart) && !isNaN(item.rawEnd)) {
            const diffStartMs = item.rawStart - projectStartDate;
            const diffEndMs = item.rawEnd - projectStartDate;

            startDay = Math.round(diffStartMs / msPerDay) + 1;
            endDay = Math.round(diffEndMs / msPerDay) + 1;
            duration = endDay - startDay + 1;
        }

        dynamicTasks.push({
            id: item.id,
            name: item.name,
            start: startDay > 0 ? startDay : 0,
            duration: duration > 0 ? duration : 0,
            dependencies: [],
            manualDependencies: item.manualDependencies || [],
            keterlambatan: item.keterlambatan || 0,
            inputData: {
                ranges: startDay > 0 ? [{ start: startDay, end: endDay, duration: duration }] : []
            }
        });
    });
    currentTasks = dynamicTasks;
    projectTasks[selectedValue] = currentTasks;

    console.log(`✅ Data API berhasil diparsing: ${currentTasks.length} tahapan ditemukan.`);
}

// ==================== RENDER API DATA ====================
function renderApiData() {
    const container = document.getElementById('apiData');
    if (!container) return;
    
    if (isLoadingGanttData) {
        container.innerHTML = `
            <div class="api-card">
                <div class="api-card-title">Memuat data...</div>
                <div class="api-row">Mohon tunggu sebentar.</div>
            </div>`;
        return;
    }
    
    if (ganttApiError) {
        container.innerHTML = `
            <div class="api-card api-error">
                <div class="api-card-title">Gagal memuat data</div>
                <div class="api-row">${escapeHtml(ganttApiError)}</div>
            </div>`;
        return;
    }
    
    if (!currentProject) {
        container.innerHTML = '';
        return;
    }
    
    if (isProjectLocked) {
        container.innerHTML = `
            <div class="api-card" style="border: 2px solid #48bb78; background: #f0fff4;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <h3 style="color: #2f855a; margin: 0 0 5px 0;">✅ Jadwal Terkunci</h3>
                        <p style="margin: 0; color: #276749;">Data jadwal sudah diterbitkan dan tidak dapat diubah.</p>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('exportButtons').style.display = 'flex';
        return;
    }
    
    let html = '<div class="api-card task-input-card">';
    html += '<div class="api-card-title">Input Pengerjaan Tahapan (Multi Range)</div>';
    html += '<div class="task-input-container">';

    currentTasks.forEach((task) => {
        const taskData = task.inputData || { ranges: [] };
        const ranges = taskData.ranges || [];
        
        html += `
            <div class="task-input-row-multi" id="task-row-${task.id}">
                <div class="task-input-label-multi">${escapeHtml(task.name)}</div>
                <div class="task-ranges-container" id="ranges-${task.id}">
        `;
        
        if (ranges.length > 0) {
            ranges.forEach((range, idx) => {
                html += `
                    <div class="range-input-group" data-range-idx="${idx}">
                        <div class="input-group">
                            <label>H</label>
                            <input type="number" class="task-day-input" 
                                data-task-id="${task.id}" 
                                data-type="start" 
                                data-range-idx="${idx}"
                                value="${range.start || 0}" min="0">
                        </div>
                        <span class="input-separator">s/d</span>
                        <div class="input-group">
                            <label>H</label>
                            <input type="number" class="task-day-input" 
                                data-task-id="${task.id}" 
                                data-type="end" 
                                data-range-idx="${idx}"
                                value="${range.end || 0}" min="0">
                        </div>
                        <button class="btn-remove-range" onclick="removeRange(${task.id}, ${idx})" title="Hapus range">×</button>
                    </div>
                `;
            });
        } else {
            html += `
                <div class="range-input-group" data-range-idx="0">
                    <div class="input-group">
                        <label>H</label>
                        <input type="number" class="task-day-input" 
                            data-task-id="${task.id}" 
                            data-type="start" 
                            data-range-idx="0"
                            value="0" min="0">
                    </div>
                    <span class="input-separator">s/d</span>
                    <div class="input-group">
                        <label>H</label>
                        <input type="number" class="task-day-input" 
                            data-task-id="${task.id}" 
                            data-type="end" 
                            data-range-idx="0"
                            value="0" min="0">
                    </div>
                    <button class="btn-remove-range" onclick="removeRange(${task.id}, 0)" title="Hapus range">×</button>
                </div>
            `;
        }
        
        html += `
                </div>
                <button class="btn-add-range" onclick="addRange(${task.id})">+ Tambah Hari</button>
            </div>
        `;
    });
    
    html += '</div>';
    html += `
        <div class="task-input-actions">
            <button class="btn-manage-dependencies" onclick="toggleDependencyManager()">⛓️ Atur Dependency</button>
            <button class="btn-apply-schedule" onclick="applyTaskSchedule()">Terapkan Jadwal</button>
            <button class="btn-reset-schedule" onclick="resetTaskSchedule()">Reset</button>
        </div>
        <div class="task-input-actions" style="border-top: none; padding-top: 0;">
            <button class="btn-publish" onclick="confirmAndPublish()">🔒 Kunci Jadwal</button>
        </div>
    `;
    html += '</div>';
    container.innerHTML = html;
}

// ==================== ADD/REMOVE RANGE FUNCTIONS ====================
function addRange(taskId) {
    const rangesContainer = document.getElementById(`ranges-${taskId}`);
    const existingRanges = rangesContainer.querySelectorAll('.range-input-group');
    const newIdx = existingRanges.length;
    
    const newRangeHTML = `
        <div class="range-input-group" data-range-idx="${newIdx}">
            <div class="input-group">
                <label>H</label>
                <input type="number" class="task-day-input" 
                    data-task-id="${taskId}" 
                    data-type="start" 
                    data-range-idx="${newIdx}"
                    value="0" min="0">
            </div>
            <span class="input-separator">s/d</span>
            <div class="input-group">
                <label>H</label>
                <input type="number" class="task-day-input" 
                    data-task-id="${taskId}" 
                    data-type="end" 
                    data-range-idx="${newIdx}"
                    value="0" min="0">
            </div>
            <button class="btn-remove-range" onclick="removeRange(${taskId}, ${newIdx})" title="Hapus range">×</button>
        </div>
    `;
    
    rangesContainer.insertAdjacentHTML('beforeend', newRangeHTML);
}

function removeRange(taskId, rangeIdx) {
    const rangesContainer = document.getElementById(`ranges-${taskId}`);
    const rangeElements = rangesContainer.querySelectorAll('.range-input-group');
    
    if (rangeElements.length <= 1) {
        alert('Minimal harus ada satu range hari!');
        return;
    }
    
    const targetRange = rangesContainer.querySelector(`[data-range-idx="${rangeIdx}"]`);
    if (targetRange) {
        targetRange.remove();
        
        const remainingRanges = rangesContainer.querySelectorAll('.range-input-group');
        remainingRanges.forEach((range, newIdx) => {
            range.setAttribute('data-range-idx', newIdx);
            range.querySelectorAll('input').forEach(input => {
                input.setAttribute('data-range-idx', newIdx);
            });
            const removeBtn = range.querySelector('.btn-remove-range');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `removeRange(${taskId}, ${newIdx})`);
            }
        });
    }
}

// ==================== DEPENDENCY MANAGEMENT ====================
function toggleDependencyManager() {
    const manager = document.getElementById('dependencyManager');
    if (manager.style.display === 'none') {
        renderDependencyManager();
        manager.style.display = 'block';
    } else {
        manager.style.display = 'none';
    }
}

function renderDependencyManager() {
    const container = document.getElementById('dependencyManager');
    if (!currentTasks || currentTasks.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6c757d;">Tidak ada tahapan untuk diatur dependency-nya.</p>';
        return;
    }
    
    let html = '<div class="dependency-card">';
    html += '<div class="dependency-card-title">⛓️ Atur Ketergantungan Tahapan</div>';
    html += '<p class="dependency-description">Pilih tahapan yang bergantung pada tahapan lain. Jika tahapan A bergantung pada B, maka A akan otomatis dimulai setelah B selesai.</p>';
    html += '<div class="dependency-list">';
    
    currentTasks.forEach(task => {
        const deps = task.manualDependencies || [];
        html += `
            <div class="dependency-item">
                <div class="dependency-task-name">
                    <strong>${escapeHtml(task.name)}</strong>
                    <span class="dependency-hint">bergantung pada:</span>
                </div>
                <div class="dependency-checkboxes" id="dep-checks-${task.id}">
        `;
        
        currentTasks.forEach(potentialDep => {
            if (potentialDep.id !== task.id) {
                const isChecked = deps.includes(potentialDep.id);
                html += `
                    <label class="dependency-checkbox-label">
                        <input type="checkbox" 
                            class="dependency-checkbox" 
                            data-task-id="${task.id}" 
                            data-depends-on="${potentialDep.id}"
                            ${isChecked ? 'checked' : ''}>
                        <span>${escapeHtml(potentialDep.name)}</span>
                    </label>
                `;
            }
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    html += '<div class="dependency-actions">';
    html += '<button class="btn-save-dependencies" onclick="saveDependencies()">💾 Simpan Dependency</button>';
    html += '<button class="btn-cancel-dependencies" onclick="toggleDependencyManager()">Tutup</button>';
    html += '</div>';
    html += '</div>';
    
    container.innerHTML = html;
}

function saveDependencies() {
    currentTasks.forEach(task => {
        const checkboxes = document.querySelectorAll(`.dependency-checkbox[data-task-id="${task.id}"]`);
        const dependencies = [];
        
        checkboxes.forEach(cb => {
            if (cb.checked) {
                dependencies.push(parseInt(cb.dataset.dependsOn));
            }
        });
        
        task.manualDependencies = dependencies;
    });
    
    alert('✅ Dependency berhasil disimpan! Klik "Terapkan Jadwal" untuk melihat efeknya.');
    toggleDependencyManager();
}

function calculateDependencyAdjustedSchedule() {
    if (!currentTasks || currentTasks.length === 0) return;
    
    // Create a copy to avoid modifying original data during calculation
    const adjustedTasks = JSON.parse(JSON.stringify(currentTasks));
    
    // Calculate for each task
    adjustedTasks.forEach(task => {
        const deps = task.manualDependencies || [];
        
        if (deps.length > 0) {
            let maxEndDay = 0;
            
            // Find the latest end day from all dependencies
            deps.forEach(depId => {
                const depTask = adjustedTasks.find(t => t.id === depId);
                if (depTask && depTask.inputData && depTask.inputData.ranges) {
                    depTask.inputData.ranges.forEach(range => {
                        if (range.end > maxEndDay) {
                            maxEndDay = range.end;
                        }
                    });
                }
            });
            
            // If there are dependencies with valid end dates, adjust this task's start
            if (maxEndDay > 0) {
                const newStart = maxEndDay + 1; // Start the day after dependency ends
                
                if (task.inputData && task.inputData.ranges && task.inputData.ranges.length > 0) {
                    const currentFirstStart = task.inputData.ranges[0].start;
                    const shift = newStart - currentFirstStart;
                    
                    // Only shift if dependency requires later start
                    if (shift > 0) {
                        task.inputData.ranges = task.inputData.ranges.map(range => ({
                            start: range.start + shift,
                            end: range.end + shift,
                            duration: range.duration
                        }));
                        
                        // Update task's start property
                        task.start = task.inputData.ranges[0].start;
                    }
                }
            }
        }
    });
    
    // Update current tasks with adjusted values
    currentTasks = adjustedTasks;
    projectTasks[currentProject.ulok] = adjustedTasks;
}