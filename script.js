document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().slice(0, 10);
    if (document.getElementById('todayDate')) document.getElementById('todayDate').value = today;

    hideAll();
    document.getElementById('loginPage').classList.remove('hidden');
    loadServicesList();

    // معاينة الملفات في صفحة المريض
    if (document.getElementById('patientFiles')) {
        document.getElementById('patientFiles').addEventListener('change', function(e) {
            previewFiles(e.target.files, 'filePreview');
        });
    }
    
    // إعداد الخزينة
    if (document.getElementById('transactionType')) {
        document.getElementById('transactionType').addEventListener('change', function() {
            const type = this.value;
            document.getElementById('internalSection').style.display = type === 'internal' ? 'block' : 'none';
            document.getElementById('otherSection').style.display = type === 'other' ? 'block' : 'none';
        });
    }
    
    // تحميل المرضى عند فتح صفحة الملفات الطبية
    if (document.getElementById('medicalSearch')) {
        document.getElementById('medicalSearch').addEventListener('input', loadMedicalFiles);
    }
    
    // تحميل المرضى عند فتح صفحة ملفات الخدمات
    if (document.getElementById('serviceSearch')) {
        document.getElementById('serviceSearch').addEventListener('input', loadServiceFiles);
    }
});

let validUsers = JSON.parse(localStorage.getItem('hospitalUsers')) || [
    { username: "zozo", password: "1234", role: "admin", permissions: [] }
];

let servicesList = JSON.parse(localStorage.getItem('hospitalServices')) || [];
let patients = JSON.parse(localStorage.getItem('hospitalPatients')) || [];
let currentDay = localStorage.getItem('currentDay');
let treasuryTransactions = JSON.parse(localStorage.getItem('treasuryTransactions')) || [];

function saveUsers() { localStorage.setItem('hospitalUsers', JSON.stringify(validUsers)); }
function saveServices() { localStorage.setItem('hospitalServices', JSON.stringify(servicesList)); }
function savePatients() { localStorage.setItem('hospitalPatients', JSON.stringify(patients)); }
function saveTreasury() { localStorage.setItem('treasuryTransactions', JSON.stringify(treasuryTransactions)); }

// ================ تسجيل الدخول ================
function checkLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const user = validUsers.find(u => u.username === username && u.password === password);

    if (user) {
        localStorage.setItem('currentUserRole', user.role);
        localStorage.setItem('currentUserPermissions', JSON.stringify(user.permissions || []));
        hideAll();
        document.getElementById('mainPage').classList.remove('hidden');
        applyPermissions();
        document.getElementById('loginMsg').textContent = '';
    } else {
        document.getElementById('loginMsg').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
}

function logout() {
    localStorage.removeItem('currentUserRole');
    localStorage.removeItem('currentUserPermissions');
    hideAll();
    document.getElementById('loginPage').classList.remove('hidden');
}

function hideAll() {
    document.querySelectorAll('.box').forEach(box => box.classList.add('hidden'));
}

function backToMain() {
    hideAll();
    document.getElementById('mainPage').classList.remove('hidden');
    applyPermissions();
}

function applyPermissions() {
    const role = localStorage.getItem('currentUserRole');
    const permissions = JSON.parse(localStorage.getItem('currentUserPermissions') || '[]');

    const mapping = {
        patiententry: 'btnPatientEntry',
        lab: 'btnLab',
        radiology: 'btnRadiology',
        pharmacy: 'btnPharmacy',
        medicalservices: 'btnMedicalServices',
        otherservices: 'btnOtherServices',
        patientsaccounts: 'btnPatientsAccounts',
        invoice: 'btnInvoice',
        medicalfiles: 'btnMedicalFiles',
        servicefiles: 'btnServiceFiles',
        reports: 'btnReports',
        statistics: 'btnStatistics',
        servicesprices: 'btnServicesPrices',
        usersmanagement: 'btnUsersManagement',
        treasury: 'btnTreasury'
    };

    Object.keys(mapping).forEach(key => {
        const btn = document.getElementById(mapping[key]);
        if (btn) {
            btn.style.display = (role === 'admin' || permissions.includes(key)) ? 'block' : 'none';
        }
    });
}

// ================ قائمة الخدمات ================
function loadServicesList() {
    const tbody = document.getElementById('servicesListBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    servicesList.forEach((service, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${service.name}</td>
            <td>${service.price} جنيه</td>
            <td><button style="background:#ff4444;" onclick="deleteService(${index})">حذف</button></td>
        `;
        tbody.appendChild(row);
    });
}

function deleteService(index) {
    servicesList.splice(index, 1);
    saveServices();
    loadServicesList();
}

function addNewService() {
    const name = document.getElementById('newServiceName').value.trim();
    const price = parseFloat(document.getElementById('newServicePrice').value) || 0;
    if (!name) return alert('أدخل اسم الخدمة');
    servicesList.push({ name, price });
    saveServices();
    loadServicesList();
    document.getElementById('newServiceName').value = '';
    document.getElementById('newServicePrice').value = '0';
}

function createServiceDropdown() {
    let options = '<option value="">اختر خدمة...</option>';
    servicesList.forEach(service => {
        options += `<option value="${service.name}" data-price="${service.price || 0}">${service.name} (${service.price} جنيه)</option>`;
    });
    return options;
}

// ================ دوال إضافة السطور ================
function addServiceRow(tableBodyId, totalId) {
    const tbody = document.getElementById(tableBodyId);
    const row = document.createElement('tr');

    const selectTd = document.createElement('td');
    const select = document.createElement('select');
    select.innerHTML = createServiceDropdown();
    select.onchange = function() {
        const price = this.selectedOptions[0].dataset.price || 0;
        row.querySelector('.priceInput').value = price;
        calculateSectionTotal(totalId);
    };
    selectTd.appendChild(select);

    const priceTd = document.createElement('td');
    const priceInput = document.createElement('input');
    priceInput.type = 'number';
    priceInput.className = 'priceInput';
    priceInput.value = 0;
    priceInput.oninput = () => calculateSectionTotal(totalId);
    priceTd.appendChild(priceInput);

    const delTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'حذف';
    delBtn.style.background = '#ff4444';
    delBtn.style.padding = '5px 10px';
    delBtn.onclick = () => {
        row.remove();
        calculateSectionTotal(totalId);
    };
    delTd.appendChild(delBtn);

    row.appendChild(selectTd);
    row.appendChild(priceTd);
    row.appendChild(delTd);
    tbody.appendChild(row);
}

function addLabRow() { addServiceRow('labTableBody', 'labTotal'); }
function addRadRow() { addServiceRow('radTableBody', 'radTotal'); }
function addMedRow() { addServiceRow('medTableBody', 'medTotal'); }
function addOtherRow() { addServiceRow('otherTableBody', 'otherTotal'); }

// ================ الصيدلية ================
function addPharmRow() {
    const tbody = document.getElementById('pharmTableBody');
    const row = document.createElement('tr');
    
    const nameTd = document.createElement('td');
    const select = document.createElement('select');
    select.style.width = '100%';
    select.style.padding = '5px';
    select.innerHTML = createServiceDropdown();
    
    select.onchange = function() {
        const price = this.selectedOptions[0].dataset.price || 0;
        const unitInput = row.querySelector('.unitPriceInput');
        if (unitInput) unitInput.value = price;
        calculatePharmRowTotal(row);
        calculateSectionTotal('pharmTotal');
    };
    nameTd.appendChild(select);
    
    const qtyTd = document.createElement('td');
    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.value = 1;
    qtyInput.min = 1;
    qtyInput.style.width = '80px';
    qtyInput.oninput = () => {
        calculatePharmRowTotal(row);
        calculateSectionTotal('pharmTotal');
    };
    qtyTd.appendChild(qtyInput);
    
    const unitTd = document.createElement('td');
    const unitInput = document.createElement('input');
    unitInput.type = 'number';
    unitInput.className = 'unitPriceInput';
    unitInput.value = 0;
    unitInput.min = 0;
    unitInput.style.width = '100px';
    unitInput.oninput = () => {
        calculatePharmRowTotal(row);
        calculateSectionTotal('pharmTotal');
    };
    unitTd.appendChild(unitInput);
    
    const totalTd = document.createElement('td');
    const totalSpan = document.createElement('span');
    totalSpan.className = 'rowTotal';
    totalSpan.textContent = '0';
    totalSpan.style.fontWeight = 'bold';
    totalSpan.style.color = '#ff8c00';
    totalTd.appendChild(totalSpan);
    
    const delTd = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'حذف';
    delBtn.style.background = '#ff4444';
    delBtn.style.padding = '5px 10px';
    delBtn.onclick = () => {
        row.remove();
        calculateSectionTotal('pharmTotal');
    };
    delTd.appendChild(delBtn);
    
    row.appendChild(nameTd);
    row.appendChild(qtyTd);
    row.appendChild(unitTd);
    row.appendChild(totalTd);
    row.appendChild(delTd);
    tbody.appendChild(row);
}

function calculatePharmRowTotal(row) {
    const qtyInput = row.querySelector('input[type="number"]:nth-of-type(1)');
    const priceInput = row.querySelector('.unitPriceInput');
    const totalSpan = row.querySelector('.rowTotal');
    
    if (qtyInput && priceInput && totalSpan) {
        const qty = parseFloat(qtyInput.value) || 1;
        const price = parseFloat(priceInput.value) || 0;
        const total = qty * price;
        totalSpan.textContent = total.toFixed(2);
        return total;
    }
    return 0;
}

function calculateSectionTotal(totalId) {
    let total = 0;
    const tbodyId = totalId.replace('Total', 'TableBody');
    const tbody = document.getElementById(tbodyId);
    
    if (!tbody) return;
    
    if (tbodyId === 'pharmTableBody') {
        tbody.querySelectorAll('tr').forEach(row => {
            const totalSpan = row.querySelector('.rowTotal');
            if (totalSpan) {
                total += parseFloat(totalSpan.textContent) || 0;
            }
        });
    } else {
        tbody.querySelectorAll('tr').forEach(row => {
            const priceInput = row.querySelector('.priceInput');
            if (priceInput) {
                total += parseFloat(priceInput.value) || 0;
            }
        });
    }
    document.getElementById(totalId).textContent = total.toFixed(2);
}

// ================ دوال عرض الصفحات ================
function showPatientEntry() { 
    hideAll(); 
    document.getElementById('patientEntryPage').classList.remove('hidden'); 
    const today = new Date().toISOString().slice(0, 10); 
    document.getElementById('todayDate').value = today;
}

function showLab() { 
    hideAll(); 
    document.getElementById('labPage').classList.remove('hidden'); 
    document.getElementById('labTableBody').innerHTML = ''; 
    addServiceRow('labTableBody', 'labTotal'); 
}

function showRadiology() { 
    hideAll(); 
    document.getElementById('radiologyPage').classList.remove('hidden'); 
    document.getElementById('radTableBody').innerHTML = ''; 
    addServiceRow('radTableBody', 'radTotal'); 
}

function showPharmacy() { 
    hideAll(); 
    document.getElementById('pharmacyPage').classList.remove('hidden'); 
    document.getElementById('pharmTableBody').innerHTML = '';
    for (let i = 0; i < 3; i++) addPharmRow();
    calculateSectionTotal('pharmTotal');
}

function showMedicalServices() { 
    hideAll(); 
    document.getElementById('medicalServicesPage').classList.remove('hidden'); 
    document.getElementById('medTableBody').innerHTML = ''; 
    addServiceRow('medTableBody', 'medTotal'); 
}

function showOtherServices() { 
    hideAll(); 
    document.getElementById('otherServicesPage').classList.remove('hidden'); 
    document.getElementById('otherTableBody').innerHTML = ''; 
    addServiceRow('otherTableBody', 'otherTotal'); 
}

function showPatientsAccounts() { 
    hideAll(); 
    document.getElementById('patientsAccountsPage').classList.remove('hidden'); 
    loadPatientsAccounts(); 
}

function showInvoice() { 
    hideAll(); 
    document.getElementById('invoicePage').classList.remove('hidden'); 
}

function showMedicalFiles() {
    hideAll();
    document.getElementById('medicalFilesPage').classList.remove('hidden');
    loadMedicalFiles();
}

function showServiceFiles() {
    hideAll();
    document.getElementById('serviceFilesPage').classList.remove('hidden');
    loadServiceFiles();
}

function showReports() { 
    hideAll(); 
    document.getElementById('reportPage').classList.remove('hidden'); 
}

function showStatistics() {
    hideAll();
    document.getElementById('statisticsPage').classList.remove('hidden');
    loadStatistics('today');
}

function showServicesPrices() { 
    hideAll(); 
    document.getElementById('servicesPricesPage').classList.remove('hidden'); 
    loadServicesList(); 
}

function showUsersManagement() { 
    if (localStorage.getItem('currentUserRole') !== 'admin') return alert('للأدمن فقط');
    hideAll(); 
    document.getElementById('usersManagementPage').classList.remove('hidden'); 
    loadUsersTable(); 
}

function showCreateAccount() { hideAll(); document.getElementById('createAccountPage').classList.remove('hidden'); }

function showTreasury() {
    hideAll();
    document.getElementById('treasuryPage').classList.remove('hidden');
    checkDayStatus();
    updateBalance();
}

// ================ حفظ المريض الجديد - معدل ================
function savePatient() {
    event.preventDefault();
    
    const code = document.getElementById('patientCode').value.trim();
    const name = document.getElementById('patientName').value.trim();
    if (!code || !name) {
        alert('كود واسم المريض مطلوبان');
        return;
    }

    let patient = patients.find(p => p.code === code);
    if (!patient) {
        patient = { 
            code, 
            name, 
            files: [],
            medicalFiles: [],
            serviceFiles: [],
            entryDate: document.getElementById('entryDate').value || new Date().toISOString().slice(0, 10),
            transactions: []
        };
        patients.push(patient);
    } else {
        patient.name = name;
    }

    // حفظ جميع الحقول
    patient.accommodationPrice = parseFloat(document.getElementById('accommodationPrice').value) || 0;
    patient.entryPayment = parseFloat(document.getElementById('entryPayment').value) || 0;
    patient.roomNumber = document.getElementById('roomNumber').value;
    patient.caseType = document.getElementById('caseType').value;
    patient.roomLevel = document.getElementById('roomLevel').value;
    patient.address = document.getElementById('address').value;
    patient.phones = document.getElementById('phones').value;
    patient.idNumber = document.getElementById('idNumber').value;
    patient.doctor = document.getElementById('doctor').value;
    patient.responsible = document.getElementById('responsible').value;
    patient.responsibleNationalId = document.getElementById('responsibleNationalId').value;
    patient.kinship = document.getElementById('kinship').value;
    patient.residence = document.getElementById('residence').value;
    patient.status = 'نشط';

    // رفع الملفات
    const filesInput = document.getElementById('patientFiles');
    if (filesInput.files.length > 0) {
        let loaded = 0;
        const totalFiles = filesInput.files.length;
        Array.from(filesInput.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                patient.files.push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: e.target.result,
                    uploadDate: new Date().toISOString()
                });
                loaded++;
                if (loaded === totalFiles) {
                    savePatients();
                    showSuccessMessage('تم حفظ المريض والملفات بنجاح');
                    clearPatientEntryFields();
                    showUploadedFiles(code);
                }
            };
            reader.readAsDataURL(file);
        });
    } else {
        savePatients();
        showSuccessMessage('تم حفظ المريض بنجاح');
        clearPatientEntryFields();
    }
    
    // إضافة معاملة للخزينة إذا كان هناك دفعة دخول
    if (patient.entryPayment > 0) {
        addTreasuryTransaction({
            date: new Date().toISOString().slice(0, 10),
            type: 'internal',
            patientCode: code,
            patientName: name,
            description: `دفعة دخول - ${name}`,
            amount: patient.entryPayment,
            category: 'دفعة',
            receiptNumber: generateReceiptNumber()
        });
    }
}

function clearPatientEntryFields() {
    const fields = [
        'patientCode', 'patientName', 'roomNumber', 'caseType', 'roomLevel',
        'accommodationPrice', 'address', 'phones', 'idNumber', 'doctor',
        'responsible', 'responsibleNationalId', 'kinship', 'residence',
        'entryPayment'
    ];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.type === 'select-one') {
                field.selectedIndex = 0;
            } else if (field.type === 'number') {
                field.value = '0';
            } else {
                field.value = '';
            }
        }
    });
    
    document.getElementById('patientFiles').value = '';
    document.getElementById('filePreview').innerHTML = '';
    document.getElementById('uploadedFilesList').innerHTML = '';
}

function showSuccessMessage(msg) {
    const msgElement = document.getElementById('msg');
    msgElement.innerHTML = `
        <div style="background: #4CAF50; color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">✅ ${msg}</h3>
        </div>
    `;
    setTimeout(() => {
        msgElement.innerHTML = '';
    }, 3000);
}

// ================ الملفات ================
function showUploadedFiles(code) {
    const patient = findPatient(code);
    const list = document.getElementById('uploadedFilesList');
    if (!patient || !patient.files || patient.files.length === 0) {
        list.innerHTML = '<p style="color:#aaa;">لا يوجد ملفات مرفوعة سابقًا</p>';
        return;
    }

    let html = '<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:15px;">';
    patient.files.forEach((file, index) => {
        html += `
            <div style="border:1px solid #ff8c00; border-radius:10px; padding:10px; background:#0f2b44; text-align:center;">`;

        if (file.type.startsWith('image/')) {
            html += `<img src="${file.data}" style="max-width:100%; max-height:150px; border-radius:8px;">`;
        } else if (file.type === 'application/pdf') {
            html += `<iframe src="${file.data}" style="width:100%; height:200px; border:none;"></iframe>`;
        } else {
            html += `<p>ملف: ${file.name}</p>`;
        }

        html += `
                <p style="color:#ff8c00; margin:10px 0; word-break:break-all;">${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
                <a href="${file.data}" download="${file.name}" style="background:#4CAF50; padding:8px; margin:5px; display:inline-block; border-radius:8px; color:white; text-decoration:none;">تحميل</a>
                <button onclick="deletePatientFile('${code}', ${index})" style="background:#ff4444; padding:8px; margin:5px; border-radius:8px;">حذف</button>
            </div>`;
    });
    html += '</div>';
    list.innerHTML = html;
}

function deletePatientFile(code, index) {
    const patient = findPatient(code);
    if (patient && patient.files) {
        patient.files.splice(index, 1);
        savePatients();
        showUploadedFiles(code);
    }
}

// ================ ملفات طبية ================
function loadMedicalFiles() {
    const searchTerm = document.getElementById('medicalSearch') ? document.getElementById('medicalSearch').value.toLowerCase() : '';
    const container = document.getElementById('medicalPatientsList');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    const filteredPatients = patients.filter(p => 
        !searchTerm || 
        p.code.toLowerCase().includes(searchTerm) || 
        (p.name && p.name.toLowerCase().includes(searchTerm))
    );
    
    if (filteredPatients.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#aaa;">لا يوجد مرضى</p>';
        return;
    }
    
    filteredPatients.forEach(patient => {
        const patientDiv = document.createElement('div');
        patientDiv.className = 'patient-item';
        patientDiv.style.cssText = `
            background: rgba(255,140,0,0.1);
            padding: 15px;
            margin: 10px 0;
            border-radius: 10px;
            border: 1px solid #ff8c00;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            <strong>${patient.code} - ${patient.name || 'بدون اسم'}</strong><br>
            <small>ملفات طبية: ${(patient.medicalFiles || []).length}</small>
        `;
        
        const button = document.createElement('button');
        button.textContent = 'رفع ملفات';
        button.style.cssText = 'background: #4CAF50; padding: 8px 15px;';
        button.onclick = () => selectPatientForMedicalUpload(patient.code);
        
        patientDiv.appendChild(infoDiv);
        patientDiv.appendChild(button);
        container.appendChild(patientDiv);
    });
}

function selectPatientForMedicalUpload(patientCode) {
    const patient = patients.find(p => p.code === patientCode);
    if (!patient) return;
    
    document.getElementById('medicalCurrentPatient').textContent = `مريض: ${patient.name} (${patient.code})`;
    document.getElementById('medicalFileUploadSection').style.display = 'block';
    
    // إعداد معاينة الملفات
    const fileInput = document.getElementById('medicalFilesInput');
    fileInput.onchange = function(e) {
        previewFiles(e.target.files, 'medicalFilesPreview');
    };
    fileInput.value = '';
    document.getElementById('medicalFilesPreview').innerHTML = '';
}

function uploadMedicalFiles() {
    const patientCode = document.getElementById('medicalCurrentPatient').textContent.match(/\((.*?)\)/);
    if (!patientCode) return alert('لم يتم تحديد مريض');
    
    const patient = patients.find(p => p.code === patientCode[1]);
    if (!patient) return alert('المريض غير موجود');
    
    const filesInput = document.getElementById('medicalFilesInput');
    if (filesInput.files.length === 0) {
        alert('لم تقم باختيار أي ملفات');
        return;
    }
    
    patient.medicalFiles = patient.medicalFiles || [];
    
    Array.from(filesInput.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            patient.medicalFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result,
                uploadDate: new Date().toISOString(),
                uploadedBy: localStorage.getItem('currentUserRole') || 'غير معروف'
            });
        };
        reader.readAsDataURL(file);
    });
    
    savePatients();
    showSuccessMessage(`تم رفع ${filesInput.files.length} ملف طبي للمريض ${patient.name}`);
    
    // تفريغ الحقول
    filesInput.value = '';
    document.getElementById('medicalFilesPreview').innerHTML = '';
    loadMedicalFiles();
}

// ================ ملفات خدمات ================
function loadServiceFiles() {
    const searchTerm = document.getElementById('serviceSearch') ? document.getElementById('serviceSearch').value.toLowerCase() : '';
    const container = document.getElementById('servicePatientsList');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    const filteredPatients = patients.filter(p => 
        !searchTerm || 
        p.code.toLowerCase().includes(searchTerm) || 
        (p.name && p.name.toLowerCase().includes(searchTerm))
    );
    
    if (filteredPatients.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#aaa;">لا يوجد مرضى</p>';
        return;
    }
    
    filteredPatients.forEach(patient => {
        const patientDiv = document.createElement('div');
        patientDiv.className = 'patient-item';
        patientDiv.style.cssText = `
            background: rgba(0,255,170,0.1);
            padding: 15px;
            margin: 10px 0;
            border-radius: 10px;
            border: 1px solid #00ffaa;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            <strong>${patient.code} - ${patient.name || 'بدون اسم'}</strong><br>
            <small>ملفات خدمات: ${(patient.serviceFiles || []).length}</small>
        `;
        
        const button = document.createElement('button');
        button.textContent = 'رفع ملفات';
        button.style.cssText = 'background: #2196F3; padding: 8px 15px;';
        button.onclick = () => selectPatientForServiceUpload(patient.code);
        
        patientDiv.appendChild(infoDiv);
        patientDiv.appendChild(button);
        container.appendChild(patientDiv);
    });
}

function selectPatientForServiceUpload(patientCode) {
    const patient = patients.find(p => p.code === patientCode);
    if (!patient) return;
    
    document.getElementById('serviceCurrentPatient').textContent = `مريض: ${patient.name} (${patient.code})`;
    document.getElementById('serviceFileUploadSection').style.display = 'block';
    
    // إعداد معاينة الملفات
    const fileInput = document.getElementById('serviceFilesInput');
    fileInput.onchange = function(e) {
        previewFiles(e.target.files, 'serviceFilesPreview');
    };
    fileInput.value = '';
    document.getElementById('serviceFilesPreview').innerHTML = '';
}

function uploadServiceFiles() {
    const patientCode = document.getElementById('serviceCurrentPatient').textContent.match(/\((.*?)\)/);
    if (!patientCode) return alert('لم يتم تحديد مريض');
    
    const patient = patients.find(p => p.code === patientCode[1]);
    if (!patient) return alert('المريض غير موجود');
    
    const serviceType = document.getElementById('serviceType').value;
    if (!serviceType) {
        alert('اختر نوع الخدمة');
        return;
    }
    
    const filesInput = document.getElementById('serviceFilesInput');
    if (filesInput.files.length === 0) {
        alert('لم تقم باختيار أي ملفات');
        return;
    }
    
    patient.serviceFiles = patient.serviceFiles || [];
    
    Array.from(filesInput.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            patient.serviceFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result,
                uploadDate: new Date().toISOString(),
                serviceType: serviceType,
                uploadedBy: localStorage.getItem('currentUserRole') || 'غير معروف'
            });
        };
        reader.readAsDataURL(file);
    });
    
    savePatients();
    showSuccessMessage(`تم رفع ${filesInput.files.length} ملف خدمة للمريض ${patient.name}`);
    
    // تفريغ الحقول
    filesInput.value = '';
    document.getElementById('serviceType').selectedIndex = 0;
    document.getElementById('serviceFilesPreview').innerHTML = '';
    loadServiceFiles();
}

// ================ تحميل أسماء المرضى ================
function loadPatientForLab() { loadPatientName('labPatientCode', 'labPatientName'); }
function loadPatientForRadiology() { loadPatientName('radPatientCode', 'radPatientName'); }
function loadPatientForPharmacy() { loadPatientName('pharmPatientCode', 'pharmPatientName'); }
function loadPatientForMedical() { loadPatientName('medPatientCode', 'medPatientName'); }
function loadPatientForOther() { loadPatientName('otherPatientCode', 'otherPatientName'); }

function loadPatientName(codeId, nameId) {
    const code = document.getElementById(codeId).value.trim();
    const patient = patients.find(p => p.code === code);
    document.getElementById(nameId).value = patient ? patient.name : '';
}

// ================ حفظ بيانات الأقسام ================
function saveLabData() {
    const code = document.getElementById('labPatientCode').value.trim();
    const patient = patients.find(p => p.code === code);
    if (!patient) return alert('المريض غير موجود');

    patient.lab = [];
    document.getElementById('labTableBody').querySelectorAll('tr').forEach(row => {
        const name = row.querySelector('select').value;
        const price = parseFloat(row.querySelector('.priceInput').value) || 0;
        if (name) patient.lab.push({ name, price });
    });
    patient.labProvider = document.getElementById('labProvider').value;
    savePatients();
    document.getElementById('labMsg').textContent = 'تم الحفظ';
    
    document.getElementById('labPatientCode').value = '';
    document.getElementById('labPatientName').value = '';
    document.getElementById('labProvider').value = '';
    document.getElementById('labTableBody').innerHTML = '';
    document.getElementById('labTotal').textContent = '0';
    addServiceRow('labTableBody', 'labTotal');
}

function saveRadData() {
    const code = document.getElementById('radPatientCode').value.trim();
    const patient = patients.find(p => p.code === code);
    if (!patient) return alert('المريض غير موجود');

    patient.rad = [];
    document.getElementById('radTableBody').querySelectorAll('tr').forEach(row => {
        const name = row.querySelector('select').value;
        const price = parseFloat(row.querySelector('.priceInput').value) || 0;
        if (name) patient.rad.push({ name, price });
    });
    patient.radProvider = document.getElementById('radProvider').value;
    savePatients();
    document.getElementById('radMsg').textContent = 'تم الحفظ';
    
    document.getElementById('radPatientCode').value = '';
    document.getElementById('radPatientName').value = '';
    document.getElementById('radProvider').value = '';
    document.getElementById('radTableBody').innerHTML = '';
    document.getElementById('radTotal').textContent = '0';
    addServiceRow('radTableBody', 'radTotal');
}

// ================ حفظ الصيدلية ================
function savePharmData() {
    // إلغاء أي سلوك افتراضي
    if (event) event.preventDefault();
    
    const code = document.getElementById('pharmPatientCode').value.trim();
    if (!code) {
        alert('أدخل كود المريض أولاً!');
        return;
    }
    
    let patient = patients.find(p => p.code === code);
    if (!patient) {
        alert('المريض غير موجود! تحقق من الكود.');
        return;
    }
    
    // تجميع الأدوية من الجدول
    const pharmData = [];
    let totalAmount = 0;
    let hasValidData = false;
    
    const rows = document.getElementById('pharmTableBody').querySelectorAll('tr');
    rows.forEach(row => {
        const select = row.querySelector('select');
        const qtyInput = row.querySelector('input[type="number"]:nth-of-type(1)');
        const priceInput = row.querySelector('.unitPriceInput');
        
        if (select && select.value && select.value.trim() !== '' && 
            qtyInput && priceInput && parseFloat(priceInput.value) > 0) {
            
            const medicineName = select.value.trim();
            const quantity = parseFloat(qtyInput.value) || 1;
            const unitPrice = parseFloat(priceInput.value) || 0;
            const total = quantity * unitPrice;
            
            if (medicineName && unitPrice > 0) {
                pharmData.push({
                    name: medicineName,
                    quantity: quantity,
                    unitPrice: unitPrice,
                    total: total,
                    date: new Date().toISOString().slice(0, 10)
                });
                totalAmount += total;
                hasValidData = true;
            }
        }
    });
    
    if (!hasValidData) {
        alert('لم تقم بإضافة أي أدوية صالحة! تأكد من:\n1. اختيار دواء من القائمة\n2. إدخال سعر أكبر من صفر');
        return;
    }
    
    // حفظ البيانات
    patient.pharm = pharmData;
    patient.pharmProvider = document.getElementById('pharmProvider').value;
    
    // حفظ المريض
    savePatients();
    
    // عرض رسالة النجاح
    const msgElement = document.getElementById('pharmMsg');
    msgElement.innerHTML = `
        <div style="background: #4CAF50; color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 10px 0;">✅ تم الحفظ بنجاح</h3>
            <p style="margin: 5px 0;">تم حفظ ${pharmData.length} دواء للمريض <strong>${patient.name}</strong></p>
            <p style="margin: 5px 0;">إجمالي الصيدلية: <strong>${totalAmount.toFixed(2)} جنيه</strong></p>
        </div>
    `;
    
    // تفريغ الحقول بعد 2 ثانية
    setTimeout(() => {
        clearPharmacyFields();
        msgElement.innerHTML = '';
    }, 2000);
    
    // تحديث حسابات المرضى إذا كانت الصفحة مفتوحة
    if (!document.getElementById('patientsAccountsPage').classList.contains('hidden')) {
        setTimeout(() => {
            loadPatientsAccounts();
        }, 500);
    }
}

function clearPharmacyFields() {
    document.getElementById('pharmPatientCode').value = '';
    document.getElementById('pharmPatientName').value = '';
    document.getElementById('pharmProvider').value = '';
    document.getElementById('pharmTableBody').innerHTML = '';
    document.getElementById('pharmTotal').textContent = '0';
    
    // إضافة 3 أسطر جديدة
    for (let i = 0; i < 3; i++) {
        addPharmRow();
    }
}

function saveMedData() {
    const code = document.getElementById('medPatientCode').value.trim();
    const patient = patients.find(p => p.code === code);
    if (!patient) return alert('المريض غير موجود');

    patient.med = [];
    document.getElementById('medTableBody').querySelectorAll('tr').forEach(row => {
        const name = row.querySelector('select').value;
        const price = parseFloat(row.querySelector('.priceInput').value) || 0;
        if (name) patient.med.push({ name, price });
    });
    patient.medProvider = document.getElementById('medProvider').value;
    savePatients();
    document.getElementById('medMsg').textContent = 'تم الحفظ';
    
    document.getElementById('medPatientCode').value = '';
    document.getElementById('medPatientName').value = '';
    document.getElementById('medProvider').value = '';
    document.getElementById('medTableBody').innerHTML = '';
    document.getElementById('medTotal').textContent = '0';
    addServiceRow('medTableBody', 'medTotal');
}

function saveOtherData() {
    const code = document.getElementById('otherPatientCode').value.trim();
    const patient = patients.find(p => p.code === code);
    if (!patient) return alert('المريض غير موجود');

    patient.other = [];
    document.getElementById('otherTableBody').querySelectorAll('tr').forEach(row => {
        const name = row.querySelector('select').value;
        const price = parseFloat(row.querySelector('.priceInput').value) || 0;
        if (name) patient.other.push({ name, price });
    });
    patient.otherProvider = document.getElementById('otherProvider').value;
    savePatients();
    document.getElementById('otherMsg').textContent = 'تم الحفظ';
    
    document.getElementById('otherPatientCode').value = '';
    document.getElementById('otherPatientName').value = '';
    document.getElementById('otherProvider').value = '';
    document.getElementById('otherTableBody').innerHTML = '';
    document.getElementById('otherTotal').textContent = '0';
    addServiceRow('otherTableBody', 'otherTotal');
}

function findPatient(code) {
    return patients.find(p => p.code === code);
}

// ================ حسابات المرضى ================
function showPatientExit(code) {
    const patient = findPatient(code);
    if (!patient) return alert('المريض غير موجود');
    
    if (confirm(`هل تريد تسجيل خروج المريض ${patient.name}؟`)) {
        patient.status = 'خرج';
        patient.exitDate = new Date().toISOString().slice(0, 10);
        savePatients();
        loadPatientsAccounts();
        alert('تم تسجيل خروج المريض بنجاح');
    }
}

function loadPatientsAccounts() {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const searchInput = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';
    
    patients.forEach(p => {
        // فلترة حسب البحث
        if (searchInput && 
            !p.code.toLowerCase().includes(searchInput) && 
            !(p.name || '').toLowerCase().includes(searchInput)) {
            return;
        }
        
        // حساب جميع الخدمات
        const acc = parseFloat(p.accommodationPrice) || 0;
        const lab = (p.lab || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        const rad = (p.rad || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        const med = (p.med || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        const other = (p.other || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        
        // حساب الصيدلية بشكل صحيح
        let pharm = 0;
        if (p.pharm && Array.isArray(p.pharm)) {
            p.pharm.forEach(item => {
                if (item && typeof item === 'object') {
                    if (item.total !== undefined) {
                        pharm += parseFloat(item.total) || 0;
                    } else if (item.quantity !== undefined && item.unitPrice !== undefined) {
                        pharm += (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                    } else if (item.price !== undefined) {
                        pharm += parseFloat(item.price) || 0;
                    }
                }
            });
        }
        
        const totalServices = acc + lab + rad + pharm + med + other;
        const totalPaid = (parseFloat(p.entryPayment) || 0) + (parseFloat(p.paidAmount) || 0);
        const due = Math.max(0, totalServices - totalPaid);
        const surplus = totalPaid > totalServices ? totalPaid - totalServices : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${p.code}</strong></td>
            <td>${p.name || ''}</td>
            <td>${acc.toFixed(2)}</td>
            <td>${lab.toFixed(2)}</td>
            <td>${rad.toFixed(2)}</td>
            <td style="color: ${pharm > 0 ? '#ff8c00' : '#aaa'}; font-weight: ${pharm > 0 ? 'bold' : 'normal'}">
                ${pharm.toFixed(2)}
            </td>
            <td>${med.toFixed(2)}</td>
            <td>${other.toFixed(2)}</td>
            <td>${totalPaid.toFixed(2)}</td>
            <td style="color: ${due > 0 ? '#ff4444' : '#4CAF50'}; font-weight: bold">
                ${due.toFixed(2)}
            </td>
            <td style="color: ${surplus > 0 ? '#4CAF50' : '#aaa'}">
                ${surplus > 0 ? surplus.toFixed(2) : '-'}
            </td>
            <td>
                <button onclick="showPatientExit('${p.code}')" style="background: #ff4444; padding: 5px 10px;">
                    خروج
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ================ الفاتورة ================
function loadPatientForInvoice() {
    const code = document.getElementById('invoicePatientCode').value.trim();
    const patient = findPatient(code);
    
    if (!patient) {
        alert('المريض غير موجود');
        document.getElementById('invoiceContent').innerHTML = '';
        return;
    }
    
    // حساب الإجماليات
    const accommodation = parseFloat(patient.accommodationPrice) || 0;
    const lab = (patient.lab || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const rad = (patient.rad || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const med = (patient.med || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const other = (patient.other || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    
    // حساب الصيدلية
    let pharm = 0;
    if (patient.pharm && Array.isArray(patient.pharm)) {
        patient.pharm.forEach(item => {
            if (item && typeof item === 'object') {
                if (item.total !== undefined) {
                    pharm += parseFloat(item.total) || 0;
                } else if (item.quantity !== undefined && item.unitPrice !== undefined) {
                    pharm += (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
                }
            }
        });
    }
    
    const totalServices = accommodation + lab + rad + pharm + med + other;
    const totalPaid = (parseFloat(patient.entryPayment) || 0) + (parseFloat(patient.paidAmount) || 0);
    const due = Math.max(0, totalServices - totalPaid);
    const surplus = totalPaid > totalServices ? totalPaid - totalServices : 0;
    
    // إنشاء الفاتورة
    let html = `
        <div style="border: 2px solid #ff8c00; padding: 20px; border-radius: 10px; background: #0f2b44; color: white; max-width: 800px; margin: 0 auto;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #ff8c00; margin: 0;">مستشفى أبو العزايم</h1>
                <h2 style="color: white; margin: 10px 0;">فاتورة خدمات طبية</h2>
                <p style="color: #aaa;">${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                <div>
                    <h3 style="color: #ff8c00; border-bottom: 1px solid #ff8c00; padding-bottom: 5px;">بيانات المريض</h3>
                    <p><strong>الكود:</strong> ${patient.code || ''}</p>
                    <p><strong>الاسم:</strong> ${patient.name || ''}</p>
                    <p><strong>رقم الغرفة:</strong> ${patient.roomNumber || ''}</p>
                    <p><strong>نوع الحالة:</strong> ${patient.caseType || ''}</p>
                </div>
                <div>
                    <h3 style="color: #ff8c00; border-bottom: 1px solid #ff8c00; padding-bottom: 5px;">بيانات إضافية</h3>
                    <p><strong>الطبيب المعالج:</strong> ${patient.doctor || ''}</p>
                    <p><strong>مسئول الحالة:</strong> ${patient.responsible || ''}</p>
                    <p><strong>رقم التليفون:</strong> ${patient.phones || ''}</p>
                </div>
            </div>
            
            <h3 style="color: #ff8c00; border-bottom: 1px solid #ff8c00; padding-bottom: 5px; margin-bottom: 15px;">تفاصيل الخدمات</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: rgba(255, 140, 0, 0.2);">
                        <th style="padding: 10px; border: 1px solid #ff8c00; text-align: right;">الخدمة</th>
                        <th style="padding: 10px; border: 1px solid #ff8c00; text-align: center;">المبلغ</th>
                    </tr>
                </thead>
                <tbody>`;
    
    // إضافة الصفوف
    const services = [
        { name: 'الإقامة', amount: accommodation },
        { name: 'المعمل', amount: lab },
        { name: 'الأشعة', amount: rad },
        { name: 'الصيدلية', amount: pharm },
        { name: 'الخدمات الطبية', amount: med },
        { name: 'خدمات أخرى', amount: other }
    ];
    
    services.forEach(service => {
        if (service.amount > 0) {
            html += `<tr>
                <td style="padding: 8px; border: 1px solid #ff8c00; text-align: right;">${service.name}</td>
                <td style="padding: 8px; border: 1px solid #ff8c00; text-align: center;">${service.amount.toFixed(2)} جنيه</td>
            </tr>`;
        }
    });
    
    html += `
                </tbody>
                <tfoot>
                    <tr style="background: rgba(255, 140, 0, 0.1); font-weight: bold;">
                        <td style="padding: 10px; border: 1px solid #ff8c00; text-align: right;">الإجمالي</td>
                        <td style="padding: 10px; border: 1px solid #ff8c00; text-align: center;">${totalServices.toFixed(2)} جنيه</td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: rgba(76, 175, 80, 0.1); padding: 15px; border-radius: 8px;">
                    <h4 style="color: #4CAF50; margin-top: 0;">المدفوع</h4>
                    <p style="font-size: 24px; font-weight: bold; color: #4CAF50; margin: 10px 0;">${totalPaid.toFixed(2)} جنيه</p>
                </div>
                <div style="background: rgba(${due > 0 ? '255,68,68' : '76,175,80'}, 0.1); padding: 15px; border-radius: 8px;">
                    <h4 style="color: ${due > 0 ? '#ff4444' : '#4CAF50'}; margin-top: 0;">${due > 0 ? 'المستحق' : 'الفائض'}</h4>
                    <p style="font-size: 24px; font-weight: bold; color: ${due > 0 ? '#ff4444' : '#4CAF50'}; margin: 10px 0;">
                        ${due > 0 ? due.toFixed(2) : surplus.toFixed(2)} جنيه
                    </p>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ff8c00;">
                <p style="color: #aaa; font-size: 14px;">شكراً لثقتكم في مستشفى أبو العزايم</p>
                <p style="color: #aaa; font-size: 12px;">هذه الفاتورة وثيقة رسمية ولا ترد</p>
            </div>
        </div>
    `;
    
    document.getElementById('invoiceContent').innerHTML = html;
}

// ================ التقارير ================
function showOccupancyReport() {
    const content = document.getElementById('reportContent');
    content.innerHTML = '<h2>تقرير الإشغال</h2><p>جاري تحميل التقرير...</p>';
    
    setTimeout(() => {
        const activePatients = patients.filter(p => p.status !== 'خرج' && p.status !== 'مغادر');
        const totalRooms = 100;
        
        let html = `
            <div style="background: rgba(255,140,0,0.1); padding: 20px; border-radius: 10px;">
                <h3 style="color:#ff8c00;">إحصائيات الإشغال</h3>
                <p>إجمالي الغرف: ${totalRooms}</p>
                <p>الغرف المشغولة: ${activePatients.length}</p>
                <p>الغرف المتاحة: ${totalRooms - activePatients.length}</p>
                <p>نسبة الإشغال: ${((activePatients.length / totalRooms) * 100).toFixed(1)}%</p>
            </div>
            
            <h3 style="margin-top: 20px;">تفاصيل المرضى النشطين</h3>
            <table style="width:100%">
                <thead>
                    <tr>
                        <th>الكود</th>
                        <th>الاسم</th>
                        <th>رقم الغرفة</th>
                        <th>نوع الحالة</th>
                        <th>تاريخ الدخول</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        activePatients.forEach(patient => {
            html += `
                <tr>
                    <td>${patient.code}</td>
                    <td>${patient.name || 'بدون اسم'}</td>
                    <td>${patient.roomNumber || 'غير محدد'}</td>
                    <td>${patient.caseType || 'غير محدد'}</td>
                    <td>${patient.entryDate || 'غير محدد'}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        content.innerHTML = html;
    }, 500);
}

function showExitedPatientsReport() {
    const content = document.getElementById('reportContent');
    const exitedPatients = patients.filter(p => p.status === 'خرج');
    
    let html = `
        <h2>تقرير المرضى المغادرين</h2>
        <div style="background: rgba(255,68,68,0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color:#ff4444;">الإحصائيات</h3>
            <p>إجمالي المرضى المغادرين: ${exitedPatients.length}</p>
        </div>
    `;
    
    if (exitedPatients.length > 0) {
        html += `
            <table style="width:100%">
                <thead>
                    <tr>
                        <th>الكود</th>
                        <th>الاسم</th>
                        <th>تاريخ الدخول</th>
                        <th>تاريخ الخروج</th>
                        <th>مدة الإقامة</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        exitedPatients.forEach(patient => {
            const entryDate = new Date(patient.entryDate || patient.createdAt);
            const exitDate = new Date(patient.exitDate || new Date());
            const days = Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24));
            
            html += `
                <tr>
                    <td>${patient.code}</td>
                    <td>${patient.name || 'بدون اسم'}</td>
                    <td>${patient.entryDate || 'غير محدد'}</td>
                    <td>${patient.exitDate || 'غير محدد'}</td>
                    <td>${days} يوم</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
    } else {
        html += '<p style="text-align:center; color:#aaa;">لا يوجد مرضى مغادرين</p>';
    }
    
    content.innerHTML = html;
}

function showFinancialReport() {
    const content = document.getElementById('reportContent');
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    patients.forEach(patient => {
        totalRevenue += (parseFloat(patient.entryPayment) || 0);
        totalRevenue += (parseFloat(patient.paidAmount) || 0);
    });
    
    // حساب إيرادات الخدمات
    patients.forEach(patient => {
        const lab = (patient.lab || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        const rad = (patient.rad || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        const pharm = (patient.pharm || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        const med = (patient.med || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        const other = (patient.other || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        totalRevenue += lab + rad + pharm + med + other;
    });
    
    const netProfit = totalRevenue - totalExpenses;
    
    const html = `
        <h2>التقرير المالي</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0;">
            <div style="background: rgba(76,175,80,0.1); padding: 20px; border-radius: 10px; text-align: center;">
                <h3 style="color:#4CAF50;">إجمالي الإيرادات</h3>
                <p style="font-size: 28px; font-weight: bold;">${totalRevenue.toFixed(2)} جنيه</p>
            </div>
            <div style="background: rgba(255,68,68,0.1); padding: 20px; border-radius: 10px; text-align: center;">
                <h3 style="color:#ff4444;">إجمالي المصروفات</h3>
                <p style="font-size: 28px; font-weight: bold;">${totalExpenses.toFixed(2)} جنيه</p>
            </div>
            <div style="background: rgba(255,140,0,0.1); padding: 20px; border-radius: 10px; text-align: center;">
                <h3 style="color:#ff8c00;">صافي الربح</h3>
                <p style="font-size: 28px; font-weight: bold;">${netProfit.toFixed(2)} جنيه</p>
            </div>
        </div>
        
        <h3>تفصيل الإيرادات</h3>
        <table style="width:100%">
            <thead>
                <tr>
                    <th>نوع الإيراد</th>
                    <th>المبلغ</th>
                    <th>النسبة</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>دفعات المرضى</td>
                    <td>${patients.reduce((sum, p) => sum + (parseFloat(p.paidAmount) || 0), 0).toFixed(2)} جنيه</td>
                    <td>${((patients.reduce((sum, p) => sum + (parseFloat(p.paidAmount) || 0), 0) / totalRevenue) * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>دفعات الدخول</td>
                    <td>${patients.reduce((sum, p) => sum + (parseFloat(p.entryPayment) || 0), 0).toFixed(2)} جنيه</td>
                    <td>${((patients.reduce((sum, p) => sum + (parseFloat(p.entryPayment) || 0), 0) / totalRevenue) * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td>إيرادات الخدمات</td>
                    <td>${(totalRevenue - patients.reduce((sum, p) => sum + (parseFloat(p.paidAmount) || 0) + (parseFloat(p.entryPayment) || 0), 0)).toFixed(2)} جنيه</td>
                    <td>${(((totalRevenue - patients.reduce((sum, p) => sum + (parseFloat(p.paidAmount) || 0) + (parseFloat(p.entryPayment) || 0), 0)) / totalRevenue) * 100).toFixed(1)}%</td>
                </tr>
            </tbody>
        </table>
    `;
    
    content.innerHTML = html;
}

function showRevenueReport() {
    const content = document.getElementById('reportContent');
    content.innerHTML = '<h2>تقرير الإيرادات الشهرية</h2><p>جاري تحميل التقرير...</p>';
    
    setTimeout(() => {
        const monthlyRevenue = {};
        
        patients.forEach(patient => {
            const month = patient.entryDate ? patient.entryDate.substring(0, 7) : 'غير محدد';
            if (!monthlyRevenue[month]) monthlyRevenue[month] = 0;
            monthlyRevenue[month] += (parseFloat(patient.entryPayment) || 0) + (parseFloat(patient.paidAmount) || 0);
        });
        
        let html = `
            <table style="width:100%">
                <thead>
                    <tr>
                        <th>الشهر</th>
                        <th>عدد المرضى</th>
                        <th>إجمالي الإيرادات</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const [month, revenue] of Object.entries(monthlyRevenue)) {
            const monthPatients = patients.filter(p => p.entryDate && p.entryDate.startsWith(month)).length;
            html += `
                <tr>
                    <td>${month}</td>
                    <td>${monthPatients}</td>
                    <td>${revenue.toFixed(2)} جنيه</td>
                </tr>
            `;
        }
        
        html += '</tbody></table>';
        content.innerHTML = html;
    }, 500);
}

function showServicesReport() {
    const content = document.getElementById('reportContent');
    
    let servicesSummary = {
        'المعمل': 0,
        'الأشعة': 0,
        'الصيدلية': 0,
        'الخدمات الطبية': 0,
        'خدمات أخرى': 0
    };
    
    patients.forEach(patient => {
        servicesSummary['المعمل'] += (patient.lab || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        servicesSummary['الأشعة'] += (patient.rad || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        servicesSummary['الصيدلية'] += (patient.pharm || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
        servicesSummary['الخدمات الطبية'] += (patient.med || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        servicesSummary['خدمات أخرى'] += (patient.other || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    });
    
    let html = `
        <h2>تقرير الخدمات</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
    `;
    
    for (const [service, total] of Object.entries(servicesSummary)) {
        html += `
            <div style="background: rgba(33,150,243,0.1); padding: 20px; border-radius: 10px; text-align: center;">
                <h3 style="color:#2196F3;">${service}</h3>
                <p style="font-size: 24px; font-weight: bold;">${total.toFixed(2)} جنيه</p>
            </div>
        `;
    }
    
    html += `
        </div>
        <h3>تفاصيل الخدمات</h3>
        <table style="width:100%">
            <thead>
                <tr>
                    <th>نوع الخدمة</th>
                    <th>الإجمالي</th>
                    <th>النسبة</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const totalServices = Object.values(servicesSummary).reduce((a, b) => a + b, 0);
    
    for (const [service, total] of Object.entries(servicesSummary)) {
        const percentage = total > 0 ? ((total / totalServices) * 100).toFixed(1) : '0.0';
        html += `
            <tr>
                <td>${service}</td>
                <td>${total.toFixed(2)} جنيه</td>
                <td>${percentage}%</td>
            </tr>
        `;
    }
    
    html += '</tbody></table>';
    content.innerHTML = html;
}

function showPatientsReport() {
    const content = document.getElementById('reportContent');
    
    const caseTypes = {};
    const roomTypes = {};
    
    patients.forEach(patient => {
        const caseType = patient.caseType || 'غير محدد';
        const roomType = patient.roomLevel || 'غير محدد';
        
        caseTypes[caseType] = (caseTypes[caseType] || 0) + 1;
        roomTypes[roomType] = (roomTypes[roomType] || 0) + 1;
    });
    
    let html = `
        <h2>تقرير المرضى</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
            <div style="background: rgba(255,140,0,0.1); padding: 20px; border-radius: 10px;">
                <h3 style="color:#ff8c00;">توزيع الحالات</h3>
    `;
    
    for (const [type, count] of Object.entries(caseTypes)) {
        const percentage = ((count / patients.length) * 100).toFixed(1);
        html += `<p>${type}: ${count} (${percentage}%)</p>`;
    }
    
    html += `
            </div>
            <div style="background: rgba(0,255,170,0.1); padding: 20px; border-radius: 10px;">
                <h3 style="color:#00ffaa;">توزيع أنواع الغرف</h3>
    `;
    
    for (const [type, count] of Object.entries(roomTypes)) {
        const percentage = ((count / patients.length) * 100).toFixed(1);
        html += `<p>${type}: ${count} (${percentage}%)</p>`;
    }
    
    html += `
            </div>
        </div>
        <h3>إحصائيات عامة</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0;">
            <div style="background: rgba(76,175,80,0.1); padding: 15px; border-radius: 10px; text-align: center;">
                <p style="font-size: 18px; font-weight: bold;">إجمالي المرضى</p>
                <p style="font-size: 24px;">${patients.length}</p>
            </div>
            <div style="background: rgba(255,68,68,0.1); padding: 15px; border-radius: 10px; text-align: center;">
                <p style="font-size: 18px; font-weight: bold;">المرضى النشطين</p>
                <p style="font-size: 24px;">${patients.filter(p => p.status !== 'خرج').length}</p>
            </div>
            <div style="background: rgba(33,150,243,0.1); padding: 15px; border-radius: 10px; text-align: center;">
                <p style="font-size: 18px; font-weight: bold;">المرضى المغادرين</p>
                <p style="font-size: 24px;">${patients.filter(p => p.status === 'خرج').length}</p>
            </div>
            <div style="background: rgba(255,140,0,0.1); padding: 15px; border-radius: 10px; text-align: center;">
                <p style="font-size: 18px; font-weight: bold;">متوسط الإقامة</p>
                <p style="font-size: 24px;">${calculateAverageStay()} يوم</p>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

function calculateAverageStay() {
    const exitedPatients = patients.filter(p => p.status === 'خرج' && p.entryDate && p.exitDate);
    if (exitedPatients.length === 0) return 0;
    
    const totalDays = exitedPatients.reduce((sum, patient) => {
        const entryDate = new Date(patient.entryDate);
        const exitDate = new Date(patient.exitDate);
        const days = Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24));
        return sum + days;
    }, 0);
    
    return (totalDays / exitedPatients.length).toFixed(1);
}

function exportToExcel() {
    // هذا يتطلب مكتبة xlsx
    alert('ميزة التصدير إلى Excel تتطلب تثبيت المكتبة المناسبة');
}

// ================ الإحصائيات ================
function loadStatistics(period) {
    const content = document.getElementById('statisticsContent');
    content.innerHTML = '<h2>جاري تحميل الإحصائيات...</h2>';
    
    setTimeout(() => {
        let filteredPatients = patients;
        const now = new Date();
        
        if (period === 'today') {
            const today = now.toISOString().slice(0, 10);
            filteredPatients = patients.filter(p => p.entryDate === today);
        } else if (period === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            filteredPatients = patients.filter(p => new Date(p.entryDate) >= weekAgo);
        } else if (period === 'month') {
            const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
            filteredPatients = patients.filter(p => new Date(p.entryDate) >= monthAgo);
        }
        
        const activePatients = filteredPatients.filter(p => p.status !== 'خرج');
        const dischargedPatients = filteredPatients.filter(p => p.status === 'خرج');
        
        const totalRevenue = filteredPatients.reduce((sum, p) => {
            return sum + (parseFloat(p.entryPayment) || 0) + (parseFloat(p.paidAmount) || 0);
        }, 0);
        
        // إحصائيات الخدمات
        let labTotal = 0, radTotal = 0, pharmTotal = 0, medTotal = 0, otherTotal = 0;
        
        filteredPatients.forEach(patient => {
            labTotal += (patient.lab || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
            radTotal += (patient.rad || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
            pharmTotal += (patient.pharm || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
            medTotal += (patient.med || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
            otherTotal += (patient.other || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        });
        
        const servicesRevenue = labTotal + radTotal + pharmTotal + medTotal + otherTotal;
        
        const html = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0;">
                <div style="background: rgba(255,140,0,0.1); padding: 20px; border-radius: 10px; text-align: center;">
                    <h3 style="color:#ff8c00;">المرضى النشطين</h3>
                    <p style="font-size: 32px; font-weight: bold;">${activePatients.length}</p>
                </div>
                <div style="background: rgba(255,68,68,0.1); padding: 20px; border-radius: 10px; text-align: center;">
                    <h3 style="color:#ff4444;">المرضى المغادرين</h3>
                    <p style="font-size: 32px; font-weight: bold;">${dischargedPatients.length}</p>
                </div>
                <div style="background: rgba(76,175,80,0.1); padding: 20px; border-radius: 10px; text-align: center;">
                    <h3 style="color:#4CAF50;">إجمالي المرضى</h3>
                    <p style="font-size: 32px; font-weight: bold;">${filteredPatients.length}</p>
                </div>
                <div style="background: rgba(33,150,243,0.1); padding: 20px; border-radius: 10px; text-align: center;">
                    <h3 style="color:#2196F3;">إجمالي الإيرادات</h3>
                    <p style="font-size: 32px; font-weight: bold;">${totalRevenue.toFixed(2)} جنيه</p>
                </div>
            </div>
            
            <h3>إيرادات الخدمات</h3>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0;">
                <div style="background: rgba(255,140,0,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 14px;">المعمل</p>
                    <p style="font-size: 18px; font-weight: bold;">${labTotal.toFixed(2)}</p>
                </div>
                <div style="background: rgba(33,150,243,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 14px;">الأشعة</p>
                    <p style="font-size: 18px; font-weight: bold;">${radTotal.toFixed(2)}</p>
                </div>
                <div style="background: rgba(76,175,80,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 14px;">الصيدلية</p>
                    <p style="font-size: 18px; font-weight: bold;">${pharmTotal.toFixed(2)}</p>
                </div>
                <div style="background: rgba(156,39,176,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 14px;">طبية</p>
                    <p style="font-size: 18px; font-weight: bold;">${medTotal.toFixed(2)}</p>
                </div>
                <div style="background: rgba(0,255,170,0.1); padding: 15px; border-radius: 8px; text-align: center;">
                    <p style="font-size: 14px;">أخرى</p>
                    <p style="font-size: 18px; font-weight: bold;">${otherTotal.toFixed(2)}</p>
                </div>
            </div>
            
            <h3>توزيع الحالات</h3>
            <table style="width:100%">
                <thead>
                    <tr>
                        <th>نوع الحالة</th>
                        <th>عدد المرضى</th>
                        <th>النسبة</th>
                    </tr>
                </thead>
                <tbody>
                    ${getCaseTypeStatistics(filteredPatients)}
                </tbody>
            </table>
        `;
        
        content.innerHTML = html;
    }, 500);
}

function getCaseTypeStatistics(patientList) {
    const caseTypes = {};
    patientList.forEach(patient => {
        const type = patient.caseType || 'غير محدد';
        caseTypes[type] = (caseTypes[type] || 0) + 1;
    });
    
    let html = '';
    for (const [type, count] of Object.entries(caseTypes)) {
        const percentage = patientList.length > 0 ? ((count / patientList.length) * 100).toFixed(1) : '0.0';
        html += `
            <tr>
                <td>${type}</td>
                <td>${count}</td>
                <td>${percentage}%</td>
            </tr>
        `;
    }
    return html;
}

function exportStatistics() {
    alert('تم تصدير الإحصائيات (ميزة التصدير الكامل تتطلب تطوير إضافي)');
}

// ================ الخزينة الجديدة ================
function openDay() {
    if (currentDay) {
        alert('اليوم مفتوح بالفعل');
        return;
    }
    
    currentDay = new Date().toISOString().slice(0, 10);
    localStorage.setItem('currentDay', currentDay);
    checkDayStatus();
    
    // إضافة معاملة افتتاحية
    addTreasuryTransaction({
        date: currentDay,
        type: 'other',
        description: 'رصيد افتتاحي',
        amount: 0,
        category: 'ايرادات',
        openingBalance: true
    });
    
    alert(`تم فتح يوم ${currentDay} بنجاح`);
}

function closeDay() {
    if (!currentDay) {
        alert('لا يوجد يوم مفتوح');
        return;
    }
    
    if (confirm(`هل تريد قفل يوم ${currentDay}؟`)) {
        // حفظ تقرير اليوم قبل القفل
        saveDayReport();
        
        currentDay = null;
        localStorage.removeItem('currentDay');
        checkDayStatus();
        alert('تم قفل اليوم بنجاح');
    }
}

function saveDayReport() {
    const todayTransactions = treasuryTransactions.filter(t => t.date === currentDay);
    const report = {
        date: currentDay,
        transactions: todayTransactions,
        totalRevenue: todayTransactions.filter(t => t.category === 'ايرادات' || t.category === 'دفعة').reduce((sum, t) => sum + t.amount, 0),
        totalExpenses: todayTransactions.filter(t => t.category === 'مصروفات' || t.category === 'مرتجعات').reduce((sum, t) => sum + t.amount, 0),
        closingTime: new Date().toISOString()
    };
    
    let dayReports = JSON.parse(localStorage.getItem('dayReports') || '[]');
    dayReports.push(report);
    localStorage.setItem('dayReports', JSON.stringify(dayReports));
}

function checkDayStatus() {
    const status = document.getElementById('dayStatus');
    if (currentDay) {
        status.innerHTML = `<span style="color:#4CAF50">اليوم مفتوح: ${currentDay}</span>`;
    } else {
        status.innerHTML = '<span style="color:#ff4444">اليوم مغلق</span>';
    }
}

function loadInternalPatient() {
    const code = document.getElementById('internalPatientCode').value.trim();
    if (!code) return;
    
    const patient = patients.find(p => p.code === code);
    if (!patient) {
        alert('المريض غير موجود');
        return;
    }
    
    document.getElementById('internalPatientName').value = patient.name || '';
    
    // حساب المبلغ المستحق
    const acc = parseFloat(patient.accommodationPrice) || 0;
    const lab = (patient.lab || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const rad = (patient.rad || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const pharm = (patient.pharm || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const med = (patient.med || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const other = (patient.other || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const totalServices = acc + lab + rad + pharm + med + other;
    const totalPaid = (parseFloat(patient.entryPayment) || 0) + (parseFloat(patient.paidAmount) || 0);
    const due = Math.max(0, totalServices - totalPaid);
    
    document.getElementById('internalDescription').value = `دفعة من المريض ${patient.name} - مستحق: ${due} جنيه`;
    document.getElementById('transactionAmount').value = due > 0 ? due : 0;
}

function addTransaction() {
    if (!currentDay) {
        alert('اليوم مغلق. افتح اليوم أولاً');
        return;
    }
    
    const type = document.getElementById('transactionType').value;
    const amount = parseFloat(document.getElementById('transactionAmount').value) || 0;
    const category = document.getElementById('transactionCategory').value;
    
    if (amount <= 0) {
        alert('أدخل مبلغ صحيح');
        return;
    }
    
    let description = '';
    let patientCode = '';
    let patientName = '';
    
    if (type === 'internal') {
        patientCode = document.getElementById('internalPatientCode').value.trim();
        patientName = document.getElementById('internalPatientName').value;
        description = document.getElementById('internalDescription').value;
        
        if (!patientCode) {
            alert('أدخل كود المريض أولاً');
            return;
        }
        
        // تحديث حساب المريض
        const patient = patients.find(p => p.code === patientCode);
        if (patient) {
            patient.paidAmount = (parseFloat(patient.paidAmount) || 0) + amount;
            savePatients();
        }
    } else {
        description = document.getElementById('otherDescription').value;
        if (!description.trim()) {
            alert('أدخل وصف للمعاملة');
            return;
        }
    }
    
    const transaction = {
        id: Date.now(),
        date: currentDay,
        type: type,
        patientCode: patientCode,
        patientName: patientName,
        description: description,
        amount: amount,
        category: category,
        timestamp: new Date().toISOString(),
        receiptNumber: generateReceiptNumber(),
        user: localStorage.getItem('currentUserRole') || 'غير معروف'
    };
    
    treasuryTransactions.push(transaction);
    saveTreasury();
    
    // تحديث الرصيد
    updateBalance();
    
    // إظهار الإيصال
    showReceipt(transaction);
    
    // تفريغ الحقول
    document.getElementById('internalPatientCode').value = '';
    document.getElementById('internalPatientName').value = '';
    document.getElementById('internalDescription').value = '';
    document.getElementById('otherDescription').value = '';
    document.getElementById('transactionAmount').value = '0';
    
    alert('تم إضافة المعاملة بنجاح');
}

function addTreasuryTransaction(transaction) {
    transaction.id = Date.now();
    treasuryTransactions.push(transaction);
    saveTreasury();
}

function updateBalance() {
    if (!currentDay) return;
    
    const todayTransactions = treasuryTransactions.filter(t => t.date === currentDay);
    
    const totalRevenue = todayTransactions
        .filter(t => t.category === 'ايرادات' || t.category === 'دفعة')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = todayTransactions
        .filter(t => t.category === 'مصروفات' || t.category === 'مرتجعات')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const netBalance = totalRevenue - totalExpenses;
    
    document.getElementById('totalRevenue').textContent = totalRevenue.toFixed(2);
    document.getElementById('totalExpenses').textContent = totalExpenses.toFixed(2);
    document.getElementById('netBalance').textContent = netBalance.toFixed(2);
}

function showDailyTransactions() {
    if (!currentDay) {
        alert('اليوم مغلق');
        return;
    }
    
    const container = document.getElementById('dailyTransactions');
    const tbody = document.getElementById('transactionsBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const todayTransactions = treasuryTransactions.filter(t => t.date === currentDay);
    
    if (todayTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#aaa;">لا توجد معاملات لهذا اليوم</td></tr>';
    } else {
        todayTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${transaction.date}</td>
                <td>${transaction.description}</td>
                <td style="color: ${transaction.category === 'مصروفات' ? '#ff4444' : '#4CAF50'}">
                    ${transaction.amount.toFixed(2)} جنيه
                </td>
                <td>${transaction.category}</td>
                <td>
                    <button onclick="deleteTransaction(${transaction.id})" style="background:#ff4444; padding:5px 10px;">حذف</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    container.style.display = 'block';
}

function deleteTransaction(id) {
    if (!confirm('هل تريد حذف هذه المعاملة؟')) return;
    
    const index = treasuryTransactions.findIndex(t => t.id === id);
    if (index !== -1) {
        treasuryTransactions.splice(index, 1);
        saveTreasury();
        updateBalance();
        showDailyTransactions();
        alert('تم حذف المعاملة');
    }
}

function showReceipt(transaction) {
    const receiptContent = document.getElementById('receiptContent');
    
    if (!receiptContent) return;
    
    receiptContent.innerHTML = `
        <div style="text-align: center; padding: 20px; background: white; color: black; border-radius: 10px;">
            <h2 style="color: #ff8c00;">مستشفى أبو العزايم</h2>
            <h3>إيصال استلام</h3>
            <hr>
            <p><strong>رقم الإيصال:</strong> ${transaction.receiptNumber}</p>
            <p><strong>التاريخ:</strong> ${new Date().toLocaleString('ar-EG')}</p>
            <p><strong>البيان:</strong> ${transaction.description}</p>
            <p><strong>المبلغ:</strong> ${transaction.amount.toFixed(2)} جنيه</p>
            <p><strong>النوع:</strong> ${transaction.category}</p>
            <hr>
            <p style="margin-top: 20px;">شكراً لتعاملكم مع مستشفى أبو العزايم</p>
            <p style="font-size: 12px;">هذا الإيصال وثيقة رسمية</p>
        </div>
    `;
    
    const receiptSection = document.getElementById('receiptSection');
    if (receiptSection) {
        receiptSection.style.display = 'block';
    }
}

function printReceipt() {
    const printContent = document.getElementById('receiptContent').innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    location.reload();
}

function generateReceiptNumber() {
    return 'RCPT-' + Date.now().toString().slice(-8);
}

// ================ إدارة المستخدمين ================
function loadUsersTable() {
    const div = document.getElementById('usersTable');
    if (!div) return;

    let html = `
        <h2 style="color:#ff8c00; text-align:center;">قائمة المستخدمين</h2>
        <table style="width:100%; border-collapse:collapse; margin-top:20px;">
            <thead>
                <tr style="background:#0f2b44; color:#ff8c00;">
                    <th style="padding:12px; border:1px solid #ff8c00;">اسم المستخدم</th>
                    <th style="padding:12px; border:1px solid #ff8c00;">الدور</th>
                    <th style="padding:12px; border:1px solid #ff8c00;">الصلاحيات (الصفحات المتاحة)</th>
                    <th style="padding:12px; border:1px solid #ff8c00;">إجراء</th>
                </tr>
            </thead>
            <tbody>`;

    if (validUsers.length === 0) {
        html += `<tr><td colspan="4" style="text-align:center; padding:20px; color:#aaa;">لا يوجد مستخدمين بعد</td></tr>`;
    } else {
        validUsers.forEach((user, index) => {
            const permMap = {
                patiententry: "دخول مريض جديد",
                lab: "معمل",
                radiology: "أشعة",
                pharmacy: "صيدلية",
                medicalservices: "خدمات طبية",
                otherservices: "خدمات أخرى",
                patientsaccounts: "حسابات المرضى",
                invoice: "فاتورة",
                medicalfiles: "ملفات طبية",
                servicefiles: "ملفات خدمات",
                reports: "تقارير",
                statistics: "إحصائيات",
                servicesprices: "أسعار الخدمات",
                usersmanagement: "إدارة المستخدمين",
                treasury: "خزينة"
            };

            let permText = "";
            if (user.role === "admin") {
                permText = "<strong style='color:#00ffaa;'>كامل الصلاحيات (مدير)</strong>";
            } else if (user.permissions && user.permissions.length > 0) {
                permText = user.permissions.map(p => permMap[p] || p).join("<br>");
            } else {
                permText = "<span style='color:#ff4444;'>لا يوجد صلاحيات</span>";
            }

            html += `
                <tr style="background:rgba(15,43,68,0.6);">
                    <td style="padding:12px; border:1px solid #ff8c00; text-align:center;">${user.username}</td>
                    <td style="padding:12px; border:1px solid #ff8c00; text-align:center;">${user.role === 'admin' ? 'مدير' : 'مستخدم عادي'}</td>
                    <td style="padding:12px; border:1px solid #ff8c00; text-align:right;">${permText}</td>
                    <td style="padding:12px; border:1px solid #ff8c00; text-align:center;">
                        <button style="background:#ff4444; padding:8px 15px;" onclick="deleteUser(${index})">حذف</button>
                    </td>
                </tr>`;
        });
    }

    html += `</tbody></table>`;
    div.innerHTML = html;
}

function deleteUser(index) {
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟ هذا الإجراء لا يمكن التراجع عنه')) {
        validUsers.splice(index, 1);
        saveUsers();
        loadUsersTable();
        alert('تم حذف المستخدم بنجاح');
    }
}

function createNewAccount() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    if (!username || !password) return alert('البيانات ناقصة');

    if (validUsers.find(u => u.username === username)) return alert('المستخدم موجود');

    const permissions = [];
    document.querySelectorAll('.permission:checked').forEach(cb => permissions.push(cb.value));

    validUsers.push({ username, password, role, permissions });
    saveUsers();
    document.getElementById('createMsg').textContent = 'تم الإنشاء';
}

// ================ دوال مساعدة ================
function previewFiles(files, containerId) {
    const preview = document.getElementById(containerId);
    if (!preview) return;
    
    preview.innerHTML = '';

    if (files.length === 0) return;

    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(ev) {
            const div = document.createElement('div');
            div.style.cssText = `
                border: 1px solid #ff8c00;
                border-radius: 10px;
                padding: 10px;
                text-align: center;
                background: #0f2b44;
            `;

            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = ev.target.result;
                img.style.cssText = 'max-width:100%; max-height:150px; border-radius:8px;';
                div.appendChild(img);
            } else if (file.type === 'application/pdf') {
                const iframe = document.createElement('iframe');
                iframe.src = ev.target.result;
                iframe.style.cssText = 'width:100%; height:200px; border:none;';
                div.appendChild(iframe);
            } else {
                div.textContent = 'نوع الملف غير مدعوم للمعاينة';
            }

            const name = document.createElement('p');
            name.textContent = file.name;
            name.style.cssText = 'color:#ff8c00; margin-top:8px; word-break:break-all;';
            div.appendChild(name);

            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}