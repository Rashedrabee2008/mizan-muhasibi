// ================================================================
// UI - واجهة المستخدم
// ================================================================

// ===== التنقل بين الصفحات =====
function navigateTo(pageId) {
  const containers = document.querySelectorAll('.page-container');
  containers.forEach(el => el.classList.remove('active'));
  
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === pageId) {
      item.classList.add('active');
    }
  });

  closeMorePanel();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  refreshPage(pageId);
}

function refreshPage(pageId) {
  if (pageId === 'dashboard') updateDashboard();
  if (pageId === 'inventory') renderProducts();
  if (pageId === 'sales') { populateAllSelects(); renderSales(); }
  if (pageId === 'purchase') { populateAllSelects(); renderAllPurchases(); }
  if (pageId === 'returns') { populateAllSelects(); renderAllReturns(); }
  if (pageId === 'warehouses') renderWarehouses();
  if (pageId === 'permissions') renderPermissions();
  if (pageId === 'customers') renderCustomers();
  if (pageId === 'suppliers') renderSuppliers();
  if (pageId === 'expenses') renderExpenses();
  if (pageId === 'treasury') renderTreasury();
  if (pageId === 'bonds') renderBonds();
  if (pageId === 'invoices') renderAllInvoices();
  if (pageId === 'accounting') updateAccounting();
  if (pageId === 'accounts') renderAccounts();
  if (pageId === 'cashier') renderCashier();
  if (pageId === 'customer_statement') populateCustomerStatement();
  if (pageId === 'supplier_statement') populateSupplierStatement();
  if (pageId === 'profit_analysis') generateProfitAnalysis();
  if (pageId === 'audit') renderAudit();
  if (pageId === 'alerts') updateAlertsUI();
  if (pageId === 'company') loadCompanyData();
  if (pageId === 'backup') renderBackups();
  if (pageId === 'users') renderUsers();
  if (pageId === 'inventory_adjustment') populateAdjustmentProducts();
  if (pageId === 'settings') { updateSettingsUI(); updateLicenseUI(); }
  updateClock();
}

function refreshAllPages() {
  populateAllSelects();
  updateDashboard();
  renderProducts();
  renderSales();
  renderAllPurchases();
  renderAllReturns();
  renderWarehouses();
  renderPermissions();
  renderCustomers();
  renderSuppliers();
  renderExpenses();
  renderTreasury();
  renderBonds();
  renderAllInvoices();
  renderAccounts();
  renderCashier();
  renderAudit();
  updateAlertsUI();
  renderBackups();
  renderUsers();
  loadCompanyData();
  updateAccounting();
  updateSettingsUI();
  updateLicenseUI();
  populateAdjustmentProducts();
  updateClock();
}

// ===== القائمة الجانبية =====
function openMorePanel() {
  const overlay = document.getElementById('moreOverlay');
  const panel = document.getElementById('morePanel');
  if (overlay) overlay.classList.add('open');
  if (panel) panel.classList.add('open');
}

function closeMorePanel() {
  const overlay = document.getElementById('moreOverlay');
  const panel = document.getElementById('morePanel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
}

// ===== تحديث واجهة المستخدم حسب الصلاحيات =====
function updateUIByPermissions() {
  const clearAuditBtn = document.getElementById('clearAuditBtn');
  if (clearAuditBtn) {
    clearAuditBtn.style.display = canViewAudit() ? 'block' : 'none';
  }

  document.querySelectorAll('.btn-danger').forEach(btn => {
    if (!canDelete() && !btn.closest('.actions')?.classList?.contains('no-permission')) {
      btn.style.display = 'none';
    }
  });

  document.querySelectorAll('.btn-warning').forEach(btn => {
    if (!canEdit() && !btn.closest('.actions')?.classList?.contains('no-permission')) {
      btn.style.display = 'none';
    }
  });

  document.querySelectorAll('.btn-primary, .btn-success').forEach(btn => {
    if (btn.textContent.includes('إضافة') || btn.textContent.includes('حفظ') || btn.textContent.includes('تسجيل')) {
      if (!canAdd() && !btn.closest('.actions')?.classList?.contains('no-permission')) {
        btn.style.display = 'none';
      }
    }
  });

  const display = document.getElementById('currentUserDisplay');
  const roleDisplay = document.getElementById('currentRoleDisplay');
  if (display) display.textContent = currentUser.username;
  if (roleDisplay) {
    const roles = { admin: 'مدير', manager: 'مشرف', cashier: 'كاشير', viewer: 'مشاهد' };
    roleDisplay.textContent = roles[currentUser.role] || currentUser.role;
  }
}