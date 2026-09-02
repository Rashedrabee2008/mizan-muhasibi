// ================================================================
// company.js - بيانات الشركة
// ================================================================

// ================================================================
// INIT COMPANY DATA
// ================================================================
function initCompanyData() {
    if (!window.companyData || typeof window.companyData !== 'object') {
        window.companyData = {
            name: 'شركة الميزان',
            phone: '0234567890',
            mobile: '01000000000',
            address: 'القاهرة، مصر',
            taxNumber: '123-456-789',
            commercialRegister: '12345',
            email: 'info@mizan.com',
            vodafone: '01011993799',
            instapay: 'rashedrabia@instapay',
            bankAccount: '2021300000275818',
            cash: '01080591108',
            paymentEmail: 'payment@mizan.com',
            logo: null
        };
        setData('companyData', window.companyData);
    }
}

// ================================================================
// LOAD COMPANY DATA
// ================================================================
function loadCompanyData() {
    initCompanyData();
    const data = window.companyData;
    
    safeSetValue('companyName', data.name || '');
    safeSetValue('companyPhone', data.phone || '');
    safeSetValue('companyMobile', data.mobile || '');
    safeSetValue('companyAddress', data.address || '');
    safeSetValue('companyTax', data.taxNumber || '');
    safeSetValue('companyCommercial', data.commercialRegister || '');
    safeSetValue('companyEmail', data.email || '');
    safeSetValue('companyVodafone', data.vodafone || '');
    safeSetValue('companyInstapay', data.instapay || '');
    safeSetValue('companyBankAccount', data.bankAccount || '');
    safeSetValue('companyCash', data.cash || '');
    safeSetValue('companyPaymentEmail', data.paymentEmail || '');

    const nameDisplay = document.getElementById('companyNameDisplay');
    if (nameDisplay) nameDisplay.textContent = data.name || 'اسم الشركة';
    
    const detailsContainer = document.getElementById('companyDetailsDisplay');
    if (detailsContainer) {
        const details = [];
        if (data.phone) details.push(`📞 ${data.phone}`);
        if (data.mobile) details.push(`📱 ${data.mobile}`);
        if (data.address) details.push(`📍 ${data.address}`);
        if (data.taxNumber) details.push(`🆔 الرقم الضريبي: ${data.taxNumber}`);
        if (data.commercialRegister) details.push(`📋 السجل التجاري: ${data.commercialRegister}`);
        if (data.email) details.push(`📧 ${data.email}`);
        if (data.vodafone) details.push(`📱 فودافون كاش: ${data.vodafone}`);
        if (data.instapay) details.push(`📲 إنستاباي: ${data.instapay}`);
        if (data.bankAccount) details.push(`🏦 بنك: ${data.bankAccount}`);
        if (data.cash) details.push(`💰 كاش: ${data.cash}`);
        if (data.paymentEmail) details.push(`📧 بريد الدفع: ${data.paymentEmail}`);
        detailsContainer.innerHTML = details.join('<br>') ||
            '<div>📞 0234567890</div><div>📱 01000000000</div><div>📍 القاهرة، مصر</div>';
    }

    const displayVodafone = document.getElementById('displayVodafone');
    const displayInstapay = document.getElementById('displayInstapay');
    const displayBankAccount = document.getElementById('displayBankAccount');
    const displayCash = document.getElementById('displayCash');
    if (displayVodafone) displayVodafone.textContent = data.vodafone || '01011993799';
    if (displayInstapay) displayInstapay.textContent = data.instapay || 'rashedrabia@instapay';
    if (displayBankAccount) displayBankAccount.textContent = data.bankAccount || '2021300000275818';
    if (displayCash) displayCash.textContent = data.cash || '01080591108';

    const logoDisplay = document.getElementById('companyLogoDisplay');
    const logoPreview = document.getElementById('logoPreview');
    if (data.logo) {
        if (logoDisplay) logoDisplay.innerHTML = `<img src="${data.logo}" alt="Logo" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
        if (logoPreview) logoPreview.innerHTML = `<img src="${data.logo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
    } else {
        if (logoDisplay) logoDisplay.innerHTML = '<i class="fas fa-store"></i>';
        if (logoPreview) logoPreview.innerHTML = '<i class="fas fa-camera"></i>';
    }
}

// ================================================================
// SAVE COMPANY DATA
// ================================================================
function saveCompanyData() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    
    const data = {
        name: document.getElementById('companyName')?.value?.trim() || '',
        phone: document.getElementById('companyPhone')?.value?.trim() || '',
        mobile: document.getElementById('companyMobile')?.value?.trim() || '',
        address: document.getElementById('companyAddress')?.value?.trim() || '',
        taxNumber: document.getElementById('companyTax')?.value?.trim() || '',
        commercialRegister: document.getElementById('companyCommercial')?.value?.trim() || '',
        email: document.getElementById('companyEmail')?.value?.trim() || '',
        vodafone: document.getElementById('companyVodafone')?.value?.trim() || '',
        instapay: document.getElementById('companyInstapay')?.value?.trim() || '',
        bankAccount: document.getElementById('companyBankAccount')?.value?.trim() || '',
        cash: document.getElementById('companyCash')?.value?.trim() || '',
        paymentEmail: document.getElementById('companyPaymentEmail')?.value?.trim() || '',
        logo: window.companyData?.logo || null
    };
    
    window.companyData = data;
    setData('companyData', data);
    loadCompanyData();
    saveAll();
    addAuditLog('edit', 'company', 'تعديل بيانات الشركة');
    showToast('✅ تم حفظ البيانات', 'success');
}

// ================================================================
// UPLOAD LOGO
// ================================================================
function uploadLogo(event) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        showToast('⚠️ حجم الصورة كبير جداً (حد أقصى 2 ميجابايت)', 'error');
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        if (!window.companyData) window.companyData = {};
        window.companyData.logo = e.target.result;
        setData('companyData', window.companyData);
        loadCompanyData();
        saveAll();
        addAuditLog('edit', 'company', 'رفع شعار الشركة');
        showToast('✅ تم رفع الشعار', 'success');
    };
    reader.readAsDataURL(file);
}
