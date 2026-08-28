// ================================================================
// DATA - إدارة البيانات (localStorage)
// ================================================================

// ===== تحميل البيانات =====
function loadAllData() {
  try {
    products = JSON.parse(localStorage.getItem('mizan_products')) || [];
    customers = JSON.parse(localStorage.getItem('mizan_customers')) || [];
    suppliers = JSON.parse(localStorage.getItem('mizan_suppliers')) || [];
    sales = JSON.parse(localStorage.getItem('mizan_sales')) || [];
    purchases = JSON.parse(localStorage.getItem('mizan_purchases')) || [];
    returns = JSON.parse(localStorage.getItem('mizan_returns')) || [];
    expenses = JSON.parse(localStorage.getItem('mizan_expenses')) || [];
    treasury = JSON.parse(localStorage.getItem('mizan_treasury')) || [];
    bonds = JSON.parse(localStorage.getItem('mizan_bonds')) || [];
    warehouses = JSON.parse(localStorage.getItem('mizan_warehouses')) || [];
    warehouseProducts = JSON.parse(localStorage.getItem('mizan_warehouseProducts')) || [];
    permissions = JSON.parse(localStorage.getItem('mizan_permissions')) || [];
    accounts = JSON.parse(localStorage.getItem('mizan_accounts')) || [];
    cashierHistory = JSON.parse(localStorage.getItem('mizan_cashierHistory')) || [];
    auditLog = JSON.parse(localStorage.getItem('mizan_auditLog')) || [];
    alerts = JSON.parse(localStorage.getItem('mizan_alerts')) || [];
    backups = JSON.parse(localStorage.getItem('mizan_backups')) || [];
    companyData = JSON.parse(localStorage.getItem('mizan_companyData')) || {};
    inventoryAdjustments = JSON.parse(localStorage.getItem('mizan_inventoryAdjustments')) || [];
    users = JSON.parse(localStorage.getItem('mizan_users')) || [
      { id: 1, username: 'مدير', role: 'admin' },
      { id: 2, username: 'مشرف', role: 'manager' },
      { id: 3, username: 'كاشير', role: 'cashier' },
      { id: 4, username: 'مشاهد', role: 'viewer' }
    ];
  } catch(e) {
    console.warn('⚠️ Error loading data:', e);
  }
}

// ===== حفظ البيانات =====
function saveAll() {
  try {
    localStorage.setItem('mizan_products', JSON.stringify(products));
    localStorage.setItem('mizan_customers', JSON.stringify(customers));
    localStorage.setItem('mizan_suppliers', JSON.stringify(suppliers));
    localStorage.setItem('mizan_sales', JSON.stringify(sales));
    localStorage.setItem('mizan_purchases', JSON.stringify(purchases));
    localStorage.setItem('mizan_returns', JSON.stringify(returns));
    localStorage.setItem('mizan_expenses', JSON.stringify(expenses));
    localStorage.setItem('mizan_treasury', JSON.stringify(treasury));
    localStorage.setItem('mizan_bonds', JSON.stringify(bonds));
    localStorage.setItem('mizan_warehouses', JSON.stringify(warehouses));
    localStorage.setItem('mizan_warehouseProducts', JSON.stringify(warehouseProducts));
    localStorage.setItem('mizan_permissions', JSON.stringify(permissions));
    localStorage.setItem('mizan_accounts', JSON.stringify(accounts));
    localStorage.setItem('mizan_cashierHistory', JSON.stringify(cashierHistory));
    localStorage.setItem('mizan_auditLog', JSON.stringify(auditLog));
    localStorage.setItem('mizan_alerts', JSON.stringify(alerts));
    localStorage.setItem('mizan_backups', JSON.stringify(backups));
    localStorage.setItem('mizan_companyData', JSON.stringify(companyData));
    localStorage.setItem('mizan_inventoryAdjustments', JSON.stringify(inventoryAdjustments));
    localStorage.setItem('mizan_users', JSON.stringify(users));
  } catch(e) {
    console.warn('⚠️ Save error:', e);
  }
}

// ===== بيانات أولية (تم إصلاحها) =====
function seedData() {
  // المخازن
  if (warehouses.length === 0) {
    warehouses = [
      { id: 1, name: 'المخزن الرئيسي', type: 'رئيسي', address: 'القاهرة' },
      { id: 2, name: 'مخزن المحل', type: 'محل', address: 'المنصورة' }
    ];
    localStorage.setItem('mizan_warehouses', JSON.stringify(warehouses));
  }
  
  // المنتجات
  if (products.length === 0) {
    products = [
      { id: 1, name: 'منتج تجريبي 1', buyPrice: 50, sellPrice: 100, min: 5, barcode: '123456789' },
      { id: 2, name: 'منتج تجريبي 2', buyPrice: 30, sellPrice: 75, min: 3, barcode: '987654321' }
    ];
    localStorage.setItem('mizan_products', JSON.stringify(products));
    
    // ربط المنتجات بالمخازن
    warehouseProducts = [
      { warehouseId: 1, productId: 1, qty: 50 },
      { warehouseId: 1, productId: 2, qty: 30 },
      { warehouseId: 2, productId: 1, qty: 10 },
      { warehouseId: 2, productId: 2, qty: 5 }
    ];
    localStorage.setItem('mizan_warehouseProducts', JSON.stringify(warehouseProducts));
  }
  
  // العملاء
  if (customers.length === 0) {
    customers = [{ 
      id: 1, 
      name: 'أحمد محمد', 
      phone: '01234567890', 
      whatsapp: '01011993799', 
      email: 'ahmed@test.com', 
      address: 'القاهرة', 
      active: true 
    }];
    localStorage.setItem('mizan_customers', JSON.stringify(customers));
  }
  
  // الموردين
  if (suppliers.length === 0) {
    suppliers = [{ 
      id: 1, 
      name: 'شركة الاتصالات', 
      phone: '0234567890', 
      whatsapp: '01158767633', 
      email: 'info@telecom.com', 
      address: 'القاهرة', 
      active: true 
    }];
    localStorage.setItem('mizan_suppliers', JSON.stringify(suppliers));
  }
  
  // الحسابات المحاسبية
  if (accounts.length === 0) {
    accounts = [
      { id: 1, name: 'أصول', type: 'assets', parentId: null },
      { id: 2, name: 'خصوم', type: 'liabilities', parentId: null },
      { id: 3, name: 'حقوق ملكية', type: 'equity', parentId: null },
      { id: 4, name: 'إيرادات', type: 'revenue', parentId: null },
      { id: 5, name: 'مصروفات', type: 'expenses', parentId: null }
    ];
    localStorage.setItem('mizan_accounts', JSON.stringify(accounts));
  }
  
  // بيانات الشركة
  if (Object.keys(companyData).length === 0) {
    companyData = { 
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
    localStorage.setItem('mizan_companyData', JSON.stringify(companyData));
  }
  
  // حفظ جميع البيانات
  saveAll();
  
  console.log('✅ تم تهيئة البيانات الأولية');
}

// ===== جعل الدوال عامة =====
window.loadAllData = loadAllData;
window.saveAll = saveAll;
window.seedData = seedData;
