// ================================================================
// remaining.js - الدوال المتبقية (تحليل الأرباح، التقارير، إلخ)
// ================================================================

// ================================================================
// GENERATE PROFIT ANALYSIS - تحليل الأرباح
// ================================================================
function generateProfitAnalysis() {
    const container = document.getElementById('profitAnalysisResult');
    if (!container) return;

    const totalProducts = window.products ? window.products.length : 0;
    safeSetText('profitTotalProducts', totalProducts);

    if (!window.sales || window.sales.length === 0) {
        safeSetText('profitAvgMargin', '0');
        safeSetText('profitTopProduct', '0');
        container.innerHTML = `
            <div class="alert-item info">
                <div class="icon"><i class="fas fa-info-circle"></i></div>
                <div class="content">
                    <div class="title">لا توجد بيانات</div>
                    <div class="desc">لا توجد مبيعات مسجلة لعرض تحليل الأرباح</div>
                </div>
            </div>
        `;
        return;
    }

    const productProfits = {};
    let totalProfit = 0;
    let maxProfit = 0;
    let topProduct = '';
    let productCount = 0;
    
    window.sales.forEach(sale => {
        if (sale.items) {
            sale.items.forEach(item => {
                const productName = item.productName || 'منتج غير معروف';
                if (!productProfits[productName]) {
                    productProfits[productName] = {
                        totalRevenue: 0,
                        totalCost: 0,
                        totalQty: 0
                    };
                    productCount++;
                }
                const revenue = item.total || 0;
                productProfits[productName].totalRevenue += revenue;
                productProfits[productName].totalQty += item.qty || 0;
                
                const product = window.products.find(p => p.name === productName);
                if (product) {
                    productProfits[productName].totalCost += (product.buyPrice || 0) * (item.qty || 0);
                }
            });
        }
    });

    let avgMargin = 0;
    Object.keys(productProfits).forEach(name => {
        const data = productProfits[name];
        const profit = data.totalRevenue - data.totalCost;
        totalProfit += profit;
        if (profit > maxProfit) {
            maxProfit = profit;
            topProduct = name;
        }
    });
    
    avgMargin = productCount > 0 ? totalProfit / productCount : 0;

    safeSetText('profitAvgMargin', avgMargin.toFixed(2));
    safeSetText('profitTopProduct', topProduct || 'لا يوجد');

    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 تحليل ربحية المنتجات</h4>
            <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>المنتج</span><span>الكمية</span><span>الإيرادات</span><span>التكلفة</span><span>الربح</span>
                </div>
    `;

    Object.keys(productProfits).forEach(name => {
        const data = productProfits[name];
        const profit = data.totalRevenue - data.totalCost;
        const color = profit >= 0 ? '#2D8F5E' : '#E06060';
        html += `
            <div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                <span><strong>${name}</strong></span>
                <span>${data.totalQty}</span>
                <span style="color:#2D8F5E;">${data.totalRevenue.toFixed(2)}</span>
                <span style="color:#E06060;">${data.totalCost.toFixed(2)}</span>
                <span style="color:${color};font-weight:700;">${profit.toFixed(2)}</span>
            </div>
        `;
    });

    html += `
            </div>
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;font-size:12px;border:1px solid #2D2D2D;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;color:#F5E6C8;">
                    <div><span style="font-weight:600;color:#A89070;">🏆 أعلى ربح:</span> <span style="color:#C9A94E;font-weight:700;">${topProduct || 'لا يوجد'}</span></div>
                    <div><span style="font-weight:600;color:#A89070;">📊 متوسط الربح:</span> <span style="color:#C9A94E;font-weight:700;">${avgMargin.toFixed(2)}</span></div>
                    <div><span style="font-weight:600;color:#A89070;">📦 المنتجات:</span> <span style="color:#C9A94E;font-weight:700;">${productCount}</span></div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    addAuditLog('add', 'report', 'عرض تحليل الأرباح');
}

// ================================================================
// GENERATE REPORT - توليد التقارير
// ================================================================
function generateReport(type) {
    const container = document.getElementById('reportResult');
    if (!container) return;

    let html = '';
    let title = '';
    let details = '';

    switch(type) {
        case 'sales':
            title = '📊 تقرير المبيعات';
            let salesTotal = 0;
            let salesCount = 0;
            if (window.sales) {
                window.sales.forEach(s => {
                    const total = s.totalWithTax || s.total || 0;
                    salesTotal += total;
                    salesCount++;
                });
            }
            details = `
                <div class="detail-row"><span class="detail-label">📊 إجمالي المبيعات</span><span class="detail-value" style="color:#2D8F5E;">${salesTotal.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row"><span class="detail-label">📋 عدد الفواتير</span><span class="detail-value">${salesCount}</span></div>
                <div class="detail-row"><span class="detail-label">📅 اليوم</span><span class="detail-value">${getTodayDate()}</span></div>
            `;
            break;
            
        case 'purchases':
            title = '📊 تقرير المشتريات';
            let purchaseTotal = 0;
            let purchaseCount = 0;
            if (window.purchases) {
                window.purchases.forEach(p => {
                    const total = p.totalWithTax || p.total || 0;
                    purchaseTotal += total;
                    purchaseCount++;
                });
            }
            details = `
                <div class="detail-row"><span class="detail-label">📊 إجمالي المشتريات</span><span class="detail-value" style="color:#E06060;">${purchaseTotal.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row"><span class="detail-label">📋 عدد الفواتير</span><span class="detail-value">${purchaseCount}</span></div>
                <div class="detail-row"><span class="detail-label">📅 اليوم</span><span class="detail-value">${getTodayDate()}</span></div>
            `;
            break;
            
        case 'profit':
            title = '📊 تقرير الأرباح';
            let profitSales = 0;
            let profitPurchases = 0;
            if (window.sales) {
                window.sales.forEach(s => {
                    const total = s.totalWithTax || s.total || 0;
                    profitSales += total;
                });
            }
            if (window.purchases) {
                window.purchases.forEach(p => {
                    const total = p.totalWithTax || p.total || 0;
                    profitPurchases += total;
                });
            }
            const netProfit = profitSales - profitPurchases;
            details = `
                <div class="detail-row"><span class="detail-label">💰 إجمالي المبيعات</span><span class="detail-value" style="color:#2D8F5E;">${profitSales.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row"><span class="detail-label">💸 إجمالي المشتريات</span><span class="detail-value" style="color:#E06060;">${profitPurchases.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row"><span class="detail-label">📈 صافي الربح</span><span class="detail-value" style="color:${netProfit >= 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${netProfit.toFixed(2)} 🇪🇬</span></div>
            `;
            break;
            
        case 'inventory':
            title = '📊 تقرير المخزون';
            let totalQty = 0;
            let totalValue = 0;
            if (window.products && window.warehouseProducts) {
                window.products.forEach(p => {
                    let qty = 0;
                    window.warehouseProducts.forEach(wp => {
                        if (wp.productId === p.id) qty += wp.qty;
                    });
                    totalQty += qty;
                    totalValue += (p.sellPrice || 0) * qty;
                });
            }
            details = `
                <div class="detail-row"><span class="detail-label">📦 عدد المنتجات</span><span class="detail-value">${window.products ? window.products.length : 0}</span></div>
                <div class="detail-row"><span class="detail-label">📊 إجمالي الكمية</span><span class="detail-value">${totalQty}</span></div>
                <div class="detail-row"><span class="detail-label">💰 قيمة المخزون</span><span class="detail-value" style="color:#C9A94E;">${totalValue.toFixed(2)} 🇪🇬</span></div>
            `;
            break;
            
        case 'customers_report':
            title = '📊 تقرير العملاء';
            const activeCustomers = window.customers ? window.customers.filter(c => c.active !== false).length : 0;
            details = `
                <div class="detail-row"><span class="detail-label">👥 إجمالي العملاء</span><span class="detail-value">${window.customers ? window.customers.length : 0}</span></div>
                <div class="detail-row"><span class="detail-label">✅ العملاء النشطون</span><span class="detail-value" style="color:#2D8F5E;">${activeCustomers}</span></div>
                <div class="detail-row"><span class="detail-label">📅 آخر تحديث</span><span class="detail-value">${getTodayDate()}</span></div>
            `;
            break;
            
        case 'warehouse':
            title = '📊 تقرير المخازن';
            let warehouseDetails = '';
            if (window.warehouses) {
                window.warehouses.forEach(w => {
                    const count = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.warehouseId === w.id).reduce((s, wp) => s + wp.qty, 0) : 0;
                    warehouseDetails += `
                        <div class="detail-row"><span class="detail-label">🏢 ${w.name}</span><span class="detail-value">${count} منتج</span></div>
                    `;
                });
            }
            details = warehouseDetails || `
                <div class="detail-row"><span class="detail-label">لا توجد مخازن</span><span class="detail-value">-</span></div>
            `;
            break;
            
        case 'expenses':
            title = '📊 تقرير المصروفات';
            const expensesTotal = window.expenses ? window.expenses.reduce((s, e) => s + e.amount, 0) : 0;
            const expensesCount = window.expenses ? window.expenses.length : 0;
            details = `
                <div class="detail-row"><span class="detail-label">💸 إجمالي المصروفات</span><span class="detail-value" style="color:#E06060;">${expensesTotal.toFixed(2)} 🇪🇬</span></div>
                <div class="detail-row"><span class="detail-label">📋 عدد المصروفات</span><span class="detail-value">${expensesCount}</span></div>
                <div class="detail-row"><span class="detail-label">📅 آخر تحديث</span><span class="detail-value">${getTodayDate()}</span></div>
            `;
            break;
            
        default:
            title = '📊 تقرير غير معروف';
            details = `<div class="detail-row"><span class="detail-label">⚠️</span><span class="detail-value">نوع التقرير غير معروف</span></div>`;
    }

    html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">${title}</h4>
            ${details}
            <div style="margin-top:8px;display:flex;gap:6px;">
                <button class="btn btn-primary btn-block" onclick="printReport()"><i class="fas fa-print"></i> طباعة</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;

    container.innerHTML = html;
    addAuditLog('add', 'report', `عرض تقرير: ${title}`);
}

// ================================================================
// PRINT REPORT
// ================================================================
function printReport() {
    const content = document.querySelector('.accounting-detail-content');
    if (!content) return;
    
    const win = window.open('', '_blank', 'width=600,height=500');
    if (win) {
        win.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تقرير</title>
                <style>
                    body { font-family: 'Tajawal', sans-serif; background: #fff; color: #000; padding: 20px; direction: rtl; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
                    .detail-label { font-weight: 600; color: #555; }
                    .detail-value { font-weight: 700; color: #000; }
                    h4 { color: #C9A94E; }
                    @media print { body { padding: 10px; } }
                </style>
            </head>
            <body>
                ${content.outerHTML}
                <script>window.onload = function() { window.print(); };<\/script>
            </body>
            </html>
        `);
        win.document.close();
    }
}

// ================================================================
// CUSTOMER STATEMENT - كشف حساب العميل
// ================================================================
function generateCustomerStatement() {
    const container = document.getElementById('customerStatementResult');
    if (!container) return;

    const customerId = parseInt(document.getElementById('statementCustomerSelect')?.value);
    const fromDate = document.getElementById('statementFrom')?.value;
    const toDate = document.getElementById('statementTo')?.value;

    if (!customerId) {
        showToast('⚠️ اختر عميلاً', 'error');
        return;
    }

    const customer = window.customers?.find(c => c.id === customerId);
    if (!customer) {
        showToast('⚠️ العميل غير موجود', 'error');
        return;
    }

    let sales = window.sales?.filter(s => 
        s.customer === customer.name && 
        (!fromDate || s.date >= fromDate) && 
        (!toDate || s.date <= toDate)
    ) || [];

    let totalAmount = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📋 كشف حساب العميل: ${customer.name}</h4>
            <div style="font-size:12px;color:#A89070;margin-bottom:6px;">
                📅 من ${fromDate || 'بداية'} إلى ${toDate || 'اليوم'} | 📱 ${customer.phone || 'لا يوجد هاتف'}
            </div>
    `;

    if (sales.length === 0) {
        html += `
            <div class="empty-state" style="padding:16px 0;">
                <i class="fas fa-receipt" style="font-size:28px;"></i>
                <span>لا توجد فواتير للعميل في هذه الفترة</span>
            </div>
        `;
    } else {
        html += `
            <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>التاريخ</span><span>رقم الفاتورة</span><span>المبلغ</span><span>الحالة</span>
                </div>
        `;

        sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            totalAmount += total;
            const status = s.status === 'paid' ? '✅ مدفوع' : '⏳ معلق';
            html += `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                    <span style="font-size:10px;">${s.date}</span>
                    <span>#${s.invoiceNumber || s.id}</span>
                    <span style="color:#2D8F5E;font-weight:700;">${total.toFixed(2)}</span>
                    <span>${status}</span>
                </div>
            `;
        });

        html += `
            </div>
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;border:1px solid #2D2D2D;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;color:#F5E6C8;font-size:13px;">
                    <div><span style="font-weight:600;color:#A89070;">💰 الإجمالي:</span> <span style="color:#C9A94E;font-weight:700;">${totalAmount.toFixed(2)} 🇪🇬</span></div>
                    <div><span style="font-weight:600;color:#A89070;">📋 عدد الفواتير:</span> <span style="color:#C9A94E;font-weight:700;">${sales.length}</span></div>
                </div>
            </div>
        `;
    }

    html += `
        <div style="margin-top:8px;display:flex;gap:6px;">
            <button class="btn btn-primary btn-block" onclick="printStatement()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>
    `;

    container.innerHTML = html;
    addAuditLog('add', 'report', `كشف حساب العميل: ${customer.name}`);
}

// ================================================================
// GENERATE CUSTOMER DETAILED STATEMENT
// ================================================================
function generateCustomerDetailedStatement() {
    // نفس الدالة أعلاه مع تفاصيل إضافية
    generateCustomerStatement();
    showToast('📋 تم عرض الكشف التفصيلي', 'info');
}

// ================================================================
// SUPPLIER STATEMENT - كشف حساب المورد
// ================================================================
function generateSupplierStatement() {
    const container = document.getElementById('supplierStatementResult');
    if (!container) return;

    const supplierId = parseInt(document.getElementById('statementSupplierSelect')?.value);
    const fromDate = document.getElementById('statementSupplierFrom')?.value;
    const toDate = document.getElementById('statementSupplierTo')?.value;

    if (!supplierId) {
        showToast('⚠️ اختر مورداً', 'error');
        return;
    }

    const supplier = window.suppliers?.find(s => s.id === supplierId);
    if (!supplier) {
        showToast('⚠️ المورد غير موجود', 'error');
        return;
    }

    let purchases = window.purchases?.filter(p => 
        p.supplier === supplier.name && 
        (!fromDate || p.date >= fromDate) && 
        (!toDate || p.date <= toDate)
    ) || [];

    let totalAmount = 0;

    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📋 كشف حساب المورد: ${supplier.name}</h4>
            <div style="font-size:12px;color:#A89070;margin-bottom:6px;">
                📅 من ${fromDate || 'بداية'} إلى ${toDate || 'اليوم'} | 📱 ${supplier.phone || 'لا يوجد هاتف'}
            </div>
    `;

    if (purchases.length === 0) {
        html += `
            <div class="empty-state" style="padding:16px 0;">
                <i class="fas fa-shopping-cart" style="font-size:28px;"></i>
                <span>لا توجد فواتير شراء للمورد في هذه الفترة</span>
            </div>
        `;
    } else {
        html += `
            <div style="max-height:300px;overflow-y:auto;font-size:12px;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>التاريخ</span><span>رقم الفاتورة</span><span>المبلغ</span><span>الحالة</span>
                </div>
        `;

        purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            totalAmount += total;
            const status = p.status === 'paid' ? '✅ مدفوع' : '⏳ معلق';
            html += `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                    <span style="font-size:10px;">${p.date}</span>
                    <span>#${p.invoiceNumber || p.id}</span>
                    <span style="color:#E06060;font-weight:700;">${total.toFixed(2)}</span>
                    <span>${status}</span>
                </div>
            `;
        });

        html += `
            </div>
            <div style="margin-top:6px;padding:6px;background:#0D0D0D;border-radius:6px;border:1px solid #2D2D2D;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;color:#F5E6C8;font-size:13px;">
                    <div><span style="font-weight:600;color:#A89070;">💰 الإجمالي:</span> <span style="color:#C9A94E;font-weight:700;">${totalAmount.toFixed(2)} 🇪🇬</span></div>
                    <div><span style="font-weight:600;color:#A89070;">📋 عدد الفواتير:</span> <span style="color:#C9A94E;font-weight:700;">${purchases.length}</span></div>
                </div>
            </div>
        `;
    }

    html += `
        <div style="margin-top:8px;display:flex;gap:6px;">
            <button class="btn btn-primary btn-block" onclick="printStatement()"><i class="fas fa-print"></i> طباعة</button>
            <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
        </div>
    `;

    container.innerHTML = html;
    addAuditLog('add', 'report', `كشف حساب المورد: ${supplier.name}`);
}

// ================================================================
// GENERATE SUPPLIER DETAILED STATEMENT
// ================================================================
function generateSupplierDetailedStatement() {
    generateSupplierStatement();
    showToast('📋 تم عرض الكشف التفصيلي', 'info');
}

// ================================================================
// PRINT STATEMENT
// ================================================================
function printStatement() {
    const content = document.querySelector('.accounting-detail-content');
    if (!content) return;
    
    const win = window.open('', '_blank', 'width=600,height=500');
    if (win) {
        win.document.write(`
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>كشف حساب</title>
                <style>
                    body { font-family: 'Tajawal', sans-serif; background: #fff; color: #000; padding: 20px; direction: rtl; }
                    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
                    .detail-label { font-weight: 600; color: #555; }
                    .detail-value { font-weight: 700; color: #000; }
                    h4 { color: #C9A94E; }
                    .empty-state { text-align: center; padding: 20px; }
                    @media print { body { padding: 10px; } }
                </style>
            </head>
            <body>
                ${content.outerHTML}
                <script>window.onload = function() { window.print(); };<\/script>
            </body>
            </html>
        `);
        win.document.close();
    }
}

// ================================================================
// ACCOUNTING FUNCTIONS - الدوال المحاسبية
// ================================================================
function updateAccounting() {
    let salesTotal = 0;
    let purchasesTotal = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            salesTotal += total;
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            purchasesTotal += total;
        });
    }
    
    const profit = salesTotal - purchasesTotal;
    
    safeSetText('accountingSales', salesTotal.toFixed(2));
    safeSetText('accountingPurchases', purchasesTotal.toFixed(2));
    safeSetText('accountingProfit', profit.toFixed(2));
}

function showLedger() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let html = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📒 دفتر الأستاذ</h4>
            <div style="max-height:400px;overflow-y:auto;font-size:12px;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;font-weight:800;border-bottom:2px solid #C9A94E;color:#F5E6C8;">
                    <span>التاريخ</span><span>النوع</span><span>البيان</span><span>المبلغ</span>
                </div>
    `;
    
    // جمع جميع الحركات
    let entries = [];
    
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            entries.push({
                date: s.date,
                type: '💳 بيع',
                description: `فاتورة بيع - ${s.customer || 'عميل'}`,
                amount: total,
                color: '#2D8F5E'
            });
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            entries.push({
                date: p.date,
                type: '🛒 شراء',
                description: `فاتورة شراء - ${p.supplier || 'مورد'}`,
                amount: total,
                color: '#E06060'
            });
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            entries.push({
                date: e.date,
                type: '💸 مصروف',
                description: e.note,
                amount: e.amount,
                color: '#E6A830'
            });
        });
    }
    
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (entries.length === 0) {
        html += `<div class="empty-state" style="padding:16px 0;"><span>لا توجد حركات</span></div>`;
    } else {
        entries.slice(0, 50).forEach(e => {
            html += `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:4px 0;border-bottom:1px solid #2D2D2D;color:#F5E6C8;">
                    <span style="font-size:10px;">${e.date}</span>
                    <span style="color:${e.color};font-weight:700;">${e.type}</span>
                    <span style="font-size:11px;">${e.description}</span>
                    <span style="color:${e.color};font-weight:700;">${e.amount.toFixed(2)}</span>
                </div>
            `;
        });
    }
    
    html += `</div></div>`;
    container.innerHTML = html;
}

function showAudit() {
    navigateTo('audit');
}

function showTrialBalance() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let totalDebit = 0;
    let totalCredit = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            totalCredit += total;
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            totalDebit += total;
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            totalDebit += e.amount;
        });
    }
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') totalDebit += t.amount;
            else totalCredit += t.amount;
        });
    }
    
    const balance = totalDebit - totalCredit;
    
    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">⚖️ ميزان المراجعة</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:13px;">
                <div style="padding:8px;background:#0D0D0D;border-radius:6px;border:1px solid #2D2D2D;">
                    <div style="color:#E06060;font-weight:700;">📉 المدين</div>
                    <div style="font-size:20px;font-weight:900;color:#E06060;">${totalDebit.toFixed(2)}</div>
                </div>
                <div style="padding:8px;background:#0D0D0D;border-radius:6px;border:1px solid #2D2D2D;">
                    <div style="color:#2D8F5E;font-weight:700;">📈 الدائن</div>
                    <div style="font-size:20px;font-weight:900;color:#2D8F5E;">${totalCredit.toFixed(2)}</div>
                </div>
            </div>
            <div style="margin-top:8px;padding:8px;background:#0D0D0D;border-radius:6px;border:2px solid #C9A94E;text-align:center;">
                <div style="font-weight:700;color:#C9A94E;">الرصيد</div>
                <div style="font-size:18px;font-weight:900;color:${balance >= 0 ? '#E06060' : '#2D8F5E'};">${balance.toFixed(2)}</div>
                <div style="font-size:12px;color:#A89070;">${balance >= 0 ? 'مدين' : 'دائن'}</div>
            </div>
        </div>
    `;
}

function showIncomeStatement() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let revenue = 0;
    let expenses = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            revenue += total;
        });
    }
    
    if (window.expenses) {
        window.expenses.forEach(e => {
            expenses += e.amount;
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            expenses += total;
        });
    }
    
    const netIncome = revenue - expenses;
    
    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📄 قائمة الدخل</h4>
            <div style="font-size:13px;">
                <div style="padding:6px 0;border-bottom:1px solid #2D2D2D;">
                    <span style="font-weight:600;color:#A89070;">💰 الإيرادات</span>
                    <span style="float:left;color:#2D8F5E;font-weight:700;">${revenue.toFixed(2)} 🇪🇬</span>
                </div>
                <div style="padding:6px 0;border-bottom:1px solid #2D2D2D;">
                    <span style="font-weight:600;color:#A89070;">💸 المصروفات</span>
                    <span style="float:left;color:#E06060;font-weight:700;">${expenses.toFixed(2)} 🇪🇬</span>
                </div>
                <div style="padding:8px 0;border-top:2px solid #C9A94E;font-size:16px;">
                    <span style="font-weight:800;color:#C9A94E;">📊 صافي الدخل</span>
                    <span style="float:left;font-weight:900;color:${netIncome >= 0 ? '#2D8F5E' : '#E06060'};">${netIncome.toFixed(2)} 🇪🇬</span>
                </div>
            </div>
        </div>
    `;
}

function showBalanceSheet() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    
    // الأصول (الخزنة + المخزون)
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') assets += t.amount;
        });
    }
    
    if (window.products && window.warehouseProducts) {
        window.products.forEach(p => {
            const qty = window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0);
            assets += (p.sellPrice || 0) * qty;
        });
    }
    
    // الخصوم (السندات غير المدفوعة)
    if (window.bonds) {
        window.bonds.forEach(b => {
            if (b.status === 'pending' || b.status === 'overdue') {
                liabilities += b.amount;
            }
        });
    }
    
    equity = assets - liabilities;
    
    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">📊 الميزانية العمومية</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
                <div style="padding:8px;background:#0D0D0D;border-radius:6px;border:1px solid #2D8F5E;">
                    <div style="color:#2D8F5E;font-weight:700;">🏦 الأصول</div>
                    <div style="font-size:20px;font-weight:900;color:#2D8F5E;">${assets.toFixed(2)}</div>
                </div>
                <div style="padding:8px;background:#0D0D0D;border-radius:6px;border:1px solid #E06060;">
                    <div style="color:#E06060;font-weight:700;">📋 الخصوم</div>
                    <div style="font-size:20px;font-weight:900;color:#E06060;">${liabilities.toFixed(2)}</div>
                </div>
            </div>
            <div style="margin-top:8px;padding:8px;background:#0D0D0D;border-radius:6px;border:2px solid #C9A94E;text-align:center;">
                <div style="font-weight:700;color:#C9A94E;">👑 حقوق الملكية</div>
                <div style="font-size:18px;font-weight:900;color:${equity >= 0 ? '#2D8F5E' : '#E06060'};">${equity.toFixed(2)}</div>
            </div>
            <div style="margin-top:4px;font-size:11px;color:#A89070;text-align:center;">
                الأصول = الخصوم + حقوق الملكية
            </div>
        </div>
    `;
}

function showCashFlow() {
    const container = document.getElementById('accountingResult');
    if (!container) return;
    
    let cashIn = 0;
    let cashOut = 0;
    
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') cashIn += t.amount;
            else cashOut += t.amount;
        });
    }
    
    const netCash = cashIn - cashOut;
    
    container.innerHTML = `
        <div class="accounting-detail-content">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:6px;">💰 التدفقات النقدية</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
                <div style="padding:8px;background:#0D0D0D;border-radius:6px;border:1px solid #2D8F5E;">
                    <div style="color:#2D8F5E;font-weight:700;">📥 التدفقات الداخلة</div>
                    <div style="font-size:20px;font-weight:900;color:#2D8F5E;">${cashIn.toFixed(2)}</div>
                </div>
                <div style="padding:8px;background:#0D0D0D;border-radius:6px;border:1px solid #E06060;">
                    <div style="color:#E06060;font-weight:700;">📤 التدفقات الخارجة</div>
                    <div style="font-size:20px;font-weight:900;color:#E06060;">${cashOut.toFixed(2)}</div>
                </div>
            </div>
            <div style="margin-top:8px;padding:8px;background:#0D0D0D;border-radius:6px;border:2px solid #C9A94E;text-align:center;">
                <div style="font-weight:700;color:#C9A94E;">📊 صافي التدفق النقدي</div>
                <div style="font-size:18px;font-weight:900;color:${netCash >= 0 ? '#2D8F5E' : '#E06060'};">${netCash.toFixed(2)}</div>
            </div>
            <div style="margin-top:4px;font-size:11px;color:#A89070;text-align:center;">
                ${netCash >= 0 ? '✅ التدفق النقدي موجب' : '⚠️ التدفق النقدي سالب'}
            </div>
        </div>
    `;
}

// ================================================================
// SEARCH BY BARCODE - البحث بالباركود
// ================================================================
function searchByBarcode() {
    const barcode = document.getElementById('barcodeSearch')?.value?.trim();
    const result = document.getElementById('barcodeSearchResult');
    if (!result) return;
    
    if (!barcode) {
        result.innerHTML = `<div style="color:#A89070;font-size:12px;padding:8px;">📷 أدخل باركود للبحث</div>`;
        return;
    }
    
    const product = window.products?.find(p => p.barcode === barcode);
    if (product) {
        const totalQty = window.warehouseProducts?.filter(wp => wp.productId === product.id).reduce((s, wp) => s + wp.qty, 0) || 0;
        result.innerHTML = `
            <div style="padding:10px;background:#0D0D0D;border:1px solid #2D8F5E;border-radius:6px;margin-top:6px;">
                <div style="font-weight:700;color:#C9A94E;font-size:14px;">✅ ${product.name}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;margin-top:4px;">
                    <div><span style="color:#A89070;">🏷️ الباركود:</span> ${product.barcode}</div>
                    <div><span style="color:#A89070;">💰 السعر:</span> ${product.sellPrice || 0} 🇪🇬</div>
                    <div><span style="color:#A89070;">📦 الكمية:</span> ${totalQty}</div>
                    <div><span style="color:#A89070;">🛒 سعر الشراء:</span> ${product.buyPrice || 0} 🇪🇬</div>
                </div>
                <div style="margin-top:6px;display:flex;gap:4px;">
                    <button class="btn btn-success btn-sm" onclick="addProductToSale(${product.id})"><i class="fas fa-cart-plus"></i> إضافة للبيع</button>
                    <button class="btn btn-info btn-sm" onclick="showProductDetails(${product.id})"><i class="fas fa-eye"></i> تفاصيل</button>
                </div>
            </div>
        `;
    } else {
        result.innerHTML = `
            <div style="padding:10px;background:#0D0D0D;border:1px solid #E06060;border-radius:6px;margin-top:6px;color:#E06060;">
                <i class="fas fa-exclamation-triangle"></i> لا يوجد منتج بهذا الباركود
            </div>
        `;
    }
}

// ================================================================
// ADD PRODUCT TO SALE - إضافة منتج للبيع من الباركود
// ================================================================
function addProductToSale(productId) {
    const product = window.products?.find(p => p.id === productId);
    if (!product) {
        showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }
    
    const select = document.getElementById('salesItemProduct');
    if (select) {
        select.value = productId;
        if (typeof updateSalesPrice === 'function') updateSalesPrice();
        document.getElementById('salesItemQty').value = 1;
        if (typeof addSalesItem === 'function') addSalesItem();
        showToast(`✅ تم إضافة ${product.name} للفاتورة`, 'success');
        closeModal();
    }
}

// ================================================================
// SHOW PRODUCT DETAILS - عرض تفاصيل المنتج
// ================================================================
function showProductDetails(productId) {
    const product = window.products?.find(p => p.id === productId);
    if (!product) {
        showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }
    
    const totalQty = window.warehouseProducts?.filter(wp => wp.productId === product.id).reduce((s, wp) => s + wp.qty, 0) || 0;
    const warehouses = window.warehouseProducts?.filter(wp => wp.productId === product.id) || [];
    
    let warehouseDetails = '';
    warehouses.forEach(wp => {
        const w = window.warehouses?.find(wh => wh.id === wp.warehouseId);
        warehouseDetails += `<div style="font-size:11px;color:#A89070;">🏢 ${w?.name || 'غير معروف'}: ${wp.qty}</div>`;
    });
    
    const html = `
        <div style="padding:10px;">
            <h4 style="color:#C9A94E;font-size:16px;">${product.name}</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:13px;margin-top:8px;">
                <div><span style="color:#A89070;">🏷️ الباركود:</span> ${product.barcode || '-'}</div>
                <div><span style="color:#A89070;">💰 سعر البيع:</span> <span style="color:#2D8F5E;font-weight:700;">${product.sellPrice || 0} 🇪🇬</span></div>
                <div><span style="color:#A89070;">🛒 سعر الشراء:</span> <span style="color:#E06060;font-weight:700;">${product.buyPrice || 0} 🇪🇬</span></div>
                <div><span style="color:#A89070;">📦 إجمالي الكمية:</span> <span style="color:#C9A94E;font-weight:700;">${totalQty}</span></div>
                <div><span style="color:#A89070;">📋 الحد الأدنى:</span> ${product.min || 5}</div>
                <div><span style="color:#A89070;">📊 الهامش:</span> <span style="color:${(product.sellPrice - product.buyPrice) >= 0 ? '#2D8F5E' : '#E06060'};font-weight:700;">${((product.sellPrice - product.buyPrice) / product.buyPrice * 100).toFixed(1)}%</span></div>
            </div>
            <div style="margin-top:8px;border-top:1px solid #2D2D2D;padding-top:6px;">
                <div style="color:#A89070;font-size:12px;">🏢 التوزيع في المخازن:</div>
                ${warehouseDetails || '<div style="font-size:11px;color:#A89070;">لا توجد كميات في المخازن</div>'}
            </div>
            <div style="margin-top:8px;display:flex;gap:4px;">
                <button class="btn btn-success btn-sm" onclick="addProductToSale(${product.id})"><i class="fas fa-cart-plus"></i> إضافة للبيع</button>
                <button class="btn btn-secondary btn-sm" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;
    openModal(`📦 ${product.name}`, html);
}
