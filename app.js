// ================================================================
// NAVIGATION - التنقل بين الصفحات
// ================================================================

function navigateTo(pageId) {
    // إخفاء جميع الصفحات
    document.querySelectorAll('.page-container').forEach(el => el.classList.remove('active'));
    
    // إظهار الصفحة المطلوبة
    const target = document.getElementById('page-' + pageId);
    if (target) {
        target.classList.add('active');
    } else {
        console.warn('⚠️ الصفحة غير موجودة:', pageId);
        return;
    }

    // تحديث شريط التنقل السفلي
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // إغلاق القائمة المنسدلة
    if (typeof closeMorePanel === 'function') {
        closeMorePanel();
    }
    
    // التمرير للأعلى
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // تحديث الصفحة
    if (typeof refreshPage === 'function') {
        refreshPage(pageId);
    }
}

// ================================================================
// REFRESH PAGE - تحديث الصفحة
// ================================================================

function refreshPage(pageId) {
    // تحديث البيانات حسب الصفحة
    switch(pageId) {
        case 'dashboard':
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof updateDashboardDetails === 'function') updateDashboardDetails();
            if (typeof refreshDashboard === 'function') refreshDashboard();
            break;
        case 'inventory':
            if (typeof renderProducts === 'function') renderProducts();
            break;
        case 'warehouses':
            if (typeof renderWarehouses === 'function') renderWarehouses();
            break;
        case 'customers':
            if (typeof renderCustomers === 'function') renderCustomers();
            break;
        case 'suppliers':
            if (typeof renderSuppliers === 'function') renderSuppliers();
            break;
        case 'expenses':
            if (typeof renderExpenses === 'function') renderExpenses();
            break;
        case 'treasury':
            if (typeof renderTreasury === 'function') renderTreasury();
            break;
        case 'bonds':
            if (typeof renderBonds === 'function') renderBonds();
            break;
        case 'invoices':
            if (typeof renderAllInvoices === 'function') renderAllInvoices();
            break;
        case 'accounting':
            if (typeof updateAccounting === 'function') updateAccounting();
            break;
        case 'cashier':
            if (typeof renderCashier === 'function') renderCashier();
            break;
        case 'settings':
            if (typeof updateSettingsUI === 'function') updateSettingsUI();
            if (typeof updateLicenseUI === 'function') updateLicenseUI();
            break;
        case 'company':
            if (typeof loadCompanyData === 'function') loadCompanyData();
            break;
        case 'backup':
            if (typeof renderBackups === 'function') renderBackups();
            break;
        case 'accounts':
            if (typeof renderAccounts === 'function') renderAccounts();
            break;
        case 'audit':
            if (typeof renderAudit === 'function') renderAudit();
            break;
        case 'alerts':
            if (typeof updateAlertsUI === 'function') updateAlertsUI();
            break;
        case 'profit_analysis':
            if (typeof generateProfitAnalysis === 'function') generateProfitAnalysis();
            break;
        case 'license_generator':
            if (typeof renderGeneratedKeys === 'function') renderGeneratedKeys();
            if (typeof updateLicensePrice === 'function') updateLicensePrice();
            break;
        case 'sales':
        case 'purchase':
        case 'returns':
            if (typeof populateAllSelects === 'function') populateAllSelects();
            break;
        case 'customer_statement':
            if (typeof populateCustomerStatement === 'function') populateCustomerStatement();
            break;
        case 'supplier_statement':
            if (typeof populateSupplierStatement === 'function') populateSupplierStatement();
            break;
        case 'users':
            if (typeof renderUsers === 'function') renderUsers();
            if (typeof populateUsersSelect === 'function') populateUsersSelect();
            updateUIByPermissions();
            break;
        case 'inventory_adjustment':
            if (typeof populateAdjustmentProducts === 'function') populateAdjustmentProducts();
            if (typeof renderAdjustmentHistory === 'function') renderAdjustmentHistory();
            if (typeof updateAdjustmentDateTime === 'function') updateAdjustmentDateTime();
            break;
        default:
            console.log('📄 صفحة:', pageId);
    }

    updateUIByPermissions();
    updateClock();
}

// ================================================================
// OPEN MORE PANEL - فتح القائمة المنسدلة
// ================================================================

function openMorePanel() {
    const overlay = document.getElementById('moreOverlay');
    const panel = document.getElementById('morePanel');
    if (overlay) overlay.classList.add('open');
    if (panel) panel.classList.add('open');
}

// ================================================================
// CLOSE MORE PANEL - إغلاق القائمة المنسدلة
// ================================================================

function closeMorePanel() {
    const overlay = document.getElementById('moreOverlay');
    const panel = document.getElementById('morePanel');
    if (overlay) overlay.classList.remove('open');
    if (panel) panel.classList.remove('open');
}
