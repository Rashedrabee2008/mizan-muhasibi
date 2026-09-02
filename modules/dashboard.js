// ================================================================
// dashboard.js - لوحة التحكم
// ================================================================

// ================================================================
// REFRESH DASHBOARD
// ================================================================
function refreshDashboard() {
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
    if (typeof updateDashboardDetails === 'function') {
        updateDashboardDetails();
    }
}

// ================================================================
// UPDATE DASHBOARD
// ================================================================
function updateDashboard() {
    // التأكد من وجود البيانات
    if (!window.products) window.products = [];
    if (!window.customers) window.customers = [];
    if (!window.suppliers) window.suppliers = [];
    if (!window.sales) window.sales = [];
    if (!window.purchases) window.purchases = [];
    if (!window.returns) window.returns = [];
    if (!window.treasury) window.treasury = [];
    if (!window.warehouseProducts) window.warehouseProducts = [];
    if (!window.warehouses) window.warehouses = [];
    
    updateStats();
    renderSalesChart();
    updateAlertsUI();
    checkLowStockAlert();
    renderActivityLog();
    renderLowStockList();
    updateDashboardDetails();
}

// ================================================================
// UPDATE STATS
// ================================================================
function updateStats() {
    // ===== إجمالي المبيعات =====
    let totalSales = 0;
    let salesCount = 0;
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.items) {
                s.items.forEach(item => { totalSales += (item.total || 0); });
            } else {
                totalSales += (s.total || 0);
            }
            salesCount++;
        });
    }
    safeSetText('dashTotalSales', totalSales.toFixed(2));
    safeSetText('dashSalesCount', salesCount + ' فاتورة');

    // ===== إجمالي المشتريات =====
    let totalPurchases = 0;
    let purchasesCount = 0;
    if (window.purchases) {
        window.purchases.forEach(p => {
            if (p.items) {
                p.items.forEach(item => { totalPurchases += (item.total || 0); });
            } else {
                totalPurchases += (p.total || 0);
            }
            purchasesCount++;
        });
    }
    safeSetText('dashTotalPurchases', totalPurchases.toFixed(2));
    safeSetText('dashPurchasesCount', purchasesCount + ' فاتورة');

    // ===== إجمالي المرتجعات =====
    let totalReturns = 0;
    let returnsCount = 0;
    if (window.returns) {
        window.returns.forEach(r => {
            if (r.items) {
                r.items.forEach(item => { totalReturns += (item.total || 0); });
            } else {
                totalReturns += (r.total || 0);
            }
            returnsCount++;
        });
    }
    safeSetText('dashTotalReturns', totalReturns.toFixed(2));
    safeSetText('dashReturnsCount', returnsCount + ' فاتورة');

    // ===== صافي الربح =====
    const profit = totalSales - totalPurchases - totalReturns;
    safeSetText('dashNetProfit', profit.toFixed(2));
    
    const profitEl = document.getElementById('dashNetProfit');
    const profitStatus = document.getElementById('dashProfitStatus');
    if (profitEl) {
        profitEl.style.color = profit >= 0 ? '#2D8F5E' : '#E06060';
    }
    if (profitStatus) {
        profitStatus.textContent = profit >= 0 ? '📈 ربح' : '📉 خسارة';
        profitStatus.style.color = profit >= 0 ? '#2D8F5E' : '#E06060';
    }

    // ===== المنتجات =====
    safeSetText('dashTotalProducts', (window.products || []).length);

    // ===== العملاء =====
    safeSetText('dashTotalCustomers', (window.customers || []).length);

    // ===== الموردين =====
    safeSetText('dashTotalSuppliers', (window.suppliers || []).length + ' مورد');

    // ===== رصيد الخزنة =====
    let treasuryBalance = 0;
    if (window.treasury) {
        window.treasury.forEach(t => {
            if (t.type === 'deposit') treasuryBalance += t.amount;
            else treasuryBalance -= t.amount;
        });
    }
    safeSetText('dashTreasuryBalance', treasuryBalance.toFixed(2));

    // ===== قيمة المخزون =====
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
    safeSetText('dashInventoryQty', totalQty);
    safeSetText('dashInventoryValue', totalValue.toFixed(2));

    // ===== المخزون المنخفض =====
    let lowStock = [];
    if (window.products && window.warehouseProducts) {
        window.products.forEach(p => {
            let total = 0;
            window.warehouseProducts.forEach(wp => {
                if (wp.productId === p.id) total += wp.qty;
            });
            if (total <= (p.min || 0)) lowStock.push(p);
        });
    }
    const lowStockEl = document.getElementById('dashLowStock');
    if (lowStockEl) {
        lowStockEl.textContent = lowStock.length > 0 ? `🔴 ${lowStock.length} منتج` : '✅ جميع المنتجات متوفرة';
        lowStockEl.style.color = lowStock.length > 0 ? '#E06060' : '#2D8F5E';
    }

    // ===== مبيعات اليوم =====
    const today = getTodayDate();
    let todaySales = 0;
    let todayPurchases = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.date === today) {
                const total = s.totalWithTax || s.total || 0;
                todaySales += total;
            }
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            if (p.date === today) {
                const total = p.totalWithTax || p.total || 0;
                todayPurchases += total;
            }
        });
    }
    
    safeSetText('dashTodaySales', todaySales.toFixed(2));
    safeSetText('dashTodayPurchases', todayPurchases.toFixed(2));
}

// ================================================================
// RENDER SALES CHART
// ================================================================
function renderSalesChart() {
    const chart = document.getElementById('salesChart');
    if (!chart) return;

    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    let monthSales = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let monthPurchases = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    if (window.sales) {
        window.sales.forEach(s => {
            try {
                const m = new Date(s.date).getMonth();
                if (s.items) {
                    s.items.forEach(item => { monthSales[m] += (item.total || 0); });
                } else {
                    monthSales[m] += (s.total || 0);
                }
            } catch(e) {}
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            try {
                const m = new Date(p.date).getMonth();
                if (p.items) {
                    p.items.forEach(item => { monthPurchases[m] += (item.total || 0); });
                } else {
                    monthPurchases[m] += (p.total || 0);
                }
            } catch(e) {}
        });
    }

    const maxValue = Math.max(...monthSales, ...monthPurchases, 1);
    
    chart.innerHTML = '';
    
    months.forEach((month, i) => {
        const salesHeight = (monthSales[i] / maxValue) * 100;
        const purchasesHeight = (monthPurchases[i] / maxValue) * 100;
        
        chart.innerHTML += `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:30px;">
                <div style="display:flex;align-items:flex-end;gap:2px;width:100%;height:100px;">
                    <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;position:relative;">
                        <div class="bar sales-bar" style="height:${Math.max(salesHeight, 4)}px;width:100%;background:linear-gradient(180deg, #2D8F5E, #1A5A3E);border-radius:4px 4px 0 0;position:relative;min-height:4px;">
                            ${monthSales[i] > 0 ? `<span class="bar-value" style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:700;color:#2D8F5E;white-space:nowrap;">${monthSales[i].toFixed(0)}</span>` : ''}
                        </div>
                    </div>
                    <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;position:relative;">
                        <div class="bar purchases-bar" style="height:${Math.max(purchasesHeight, 4)}px;width:100%;background:linear-gradient(180deg, #E06060, #A04040);border-radius:4px 4px 0 0;position:relative;min-height:4px;">
                            ${monthPurchases[i] > 0 ? `<span class="bar-value" style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);font-size:8px;font-weight:700;color:#E06060;white-space:nowrap;">${monthPurchases[i].toFixed(0)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="bar-label" style="font-size:8px;color:#A89070;margin-top:2px;">${month}</div>
            </div>
        `;
    });
    
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;justify-content:center;gap:16px;margin-top:8px;font-size:11px;color:#F5E6C8;flex-wrap:wrap;';
    legend.innerHTML = `
        <div><span style="display:inline-block;width:12px;height:12px;background:#2D8F5E;border-radius:3px;vertical-align:middle;margin-left:4px;"></span> المبيعات</div>
        <div><span style="display:inline-block;width:12px;height:12px;background:#E06060;border-radius:3px;vertical-align:middle;margin-left:4px;"></span> المشتريات</div>
    `;
    chart.appendChild(legend);
}

// ================================================================
// RENDER ACTIVITY LOG
// ================================================================
function renderActivityLog() {
    const container = document.getElementById('activityLog');
    if (!container) return;

    let activities = [];

    // فواتير البيع
    if (window.sales) {
        window.sales.forEach(s => {
            const total = s.totalWithTax || s.total || 0;
            const type = s.invoiceType === 'tax' ? 'ضريبية' : 'عادية';
            const itemsCount = s.items ? s.items.length : 0;
            activities.push({
                date: s.date,
                time: s.time || '--:--',
                type: 'sale',
                action: 'إضافة',
                icon: 'fa-receipt',
                color: '#2D8F5E',
                details: `🧾 فاتورة بيع ${type} - العميل: ${s.customer} - ${itemsCount} صنف - الإجمالي: ${total.toFixed(2)} 🇪🇬`,
                id: s.id
            });
        });
    }

    // فواتير الشراء
    if (window.purchases) {
        window.purchases.forEach(p => {
            const total = p.totalWithTax || p.total || 0;
            const type = p.invoiceType === 'tax' ? 'ضريبية' : 'عادية';
            const itemsCount = p.items ? p.items.length : 0;
            activities.push({
                date: p.date,
                time: p.time || '--:--',
                type: 'purchase',
                action: 'إضافة',
                icon: 'fa-shopping-cart',
                color: '#E06060',
                details: `🛒 فاتورة شراء ${type} - المورد: ${p.supplier} - ${itemsCount} صنف - الإجمالي: ${total.toFixed(2)} 🇪🇬`,
                id: p.id
            });
        });
    }

    // المرتجعات
    if (window.returns) {
        window.returns.forEach(r => {
            const total = r.items ? r.items.reduce((sum, item) => sum + (item.total || 0), 0) : (r.total || 0);
            const itemsCount = r.items ? r.items.length : 0;
            activities.push({
                date: r.date,
                time: r.time || '--:--',
                type: 'return',
                action: 'إضافة',
                icon: 'fa-undo-alt',
                color: '#E6A830',
                details: `🔄 مرتجع - العميل: ${r.customer} - ${itemsCount} صنف - الإجمالي: ${total.toFixed(2)} 🇪🇬`,
                id: r.id
            });
        });
    }

    // الخزنة
    if (window.treasury) {
        window.treasury.forEach(t => {
            const typeName = t.type === 'deposit' ? 'إيداع' : 'سحب';
            const color = t.type === 'deposit' ? '#2D8F5E' : '#E06060';
            const icon = t.type === 'deposit' ? 'fa-arrow-down' : 'fa-arrow-up';
            activities.push({
                date: t.date,
                time: t.time || '--:--',
                type: 'treasury',
                action: typeName,
                icon: icon,
                color: color,
                details: `🏦 ${typeName} - ${t.note || 'حركة خزنة'} - ${t.amount.toFixed(2)} 🇪🇬`,
                id: t.id
            });
        });
    }

    // سجل التدقيق
    if (window.auditLog) {
        window.auditLog.forEach(a => {
            const actionMap = {
                'add': { icon: 'fa-plus-circle', color: '#2D8F5E', label: 'إضافة' },
                'edit': { icon: 'fa-edit', color: '#E6A830', label: 'تعديل' },
                'delete': { icon: 'fa-trash-alt', color: '#E06060', label: 'حذف' },
                'sale': { icon: 'fa-receipt', color: '#2D8F5E', label: 'بيع' },
                'purchase': { icon: 'fa-shopping-cart', color: '#E06060', label: 'شراء' },
                'return': { icon: 'fa-undo-alt', color: '#E6A830', label: 'مرتجع' },
                'sync': { icon: 'fa-sync', color: '#4A8AB5', label: 'مزامنة' },
                'backup': { icon: 'fa-cloud-upload-alt', color: '#4A8AB5', label: 'نسخ' },
                'cashier': { icon: 'fa-cash-register', color: '#C9A94E', label: 'كاشف' },
                'adjustment': { icon: 'fa-balance-scale', color: '#C9A94E', label: 'تسوية' },
                'treasury': { icon: 'fa-vault', color: '#4A8AB5', label: 'خزنة' },
                'permission': { icon: 'fa-exchange-alt', color: '#4A8AB5', label: 'إذن' },
                'warehouse': { icon: 'fa-warehouse', color: '#4A8AB5', label: 'مخزن' },
                'product': { icon: 'fa-box', color: '#2D8F5E', label: 'منتج' },
                'customer': { icon: 'fa-user', color: '#2D8F5E', label: 'عميل' },
                'supplier': { icon: 'fa-truck', color: '#E06060', label: 'مورد' },
                'expense': { icon: 'fa-money-bill-wave', color: '#E06060', label: 'مصروف' },
                'bond': { icon: 'fa-file-signature', color: '#C9A94E', label: 'سند' }
            };
            const info = actionMap[a.action] || { icon: 'fa-circle', color: '#A89070', label: a.action };
            
            activities.push({
                date: a.date ? a.date.split('T')[0] : getTodayDate(),
                time: a.date ? new Date(a.date).toLocaleTimeString('ar') : '--:--',
                type: a.type || 'نشاط',
                action: info.label,
                icon: info.icon,
                color: info.color,
                details: a.details || '',
                user: a.user || 'admin',
                id: a.id
            });
        });
    }

    // ترتيب حسب التاريخ (الأحدث أولاً)
    activities.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

    const displayActivities = activities.slice(0, 50);

    if (displayActivities.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:30px 0;"><i class="fas fa-clock" style="font-size:36px;color:#3D3D3D;"></i><span style="font-size:14px;color:#A89070;">لا توجد نشاطات حتى الآن</span></div>`;
        return;
    }

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:4px;">
            <span style="font-size:12px;color:#A89070;">📊 إجمالي النشاطات: ${activities.length}</span>
            <span style="font-size:12px;color:#A89070;">📅 آخر ${Math.min(displayActivities.length, 50)} نشاط</span>
            <button class="btn btn-info btn-sm" onclick="navigateTo('audit')" style="font-size:10px;padding:2px 12px;">
                <i class="fas fa-history"></i> عرض الكل
            </button>
        </div>
        <div style="max-height:400px;overflow-y:auto;padding:4px 0;">
    `;

    displayActivities.forEach((activity, index) => {
        const bgColor = index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent';
        
        html += `
            <div style="display:grid;grid-template-columns:0.8fr 1fr 2.8fr 0.6fr;gap:4px;padding:5px 6px;border-bottom:1px solid #2D2D2D;font-size:11px;background:${bgColor};border-radius:4px;align-items:center;">
                <span style="font-size:9px;color:#A89070;">${activity.date} ${activity.time}</span>
                <div style="display:flex;align-items:center;gap:4px;">
                    <i class="fas ${activity.icon}" style="color:${activity.color};font-size:12px;width:16px;text-align:center;"></i>
                    <span style="color:${activity.color};font-weight:700;font-size:10px;">${activity.type}</span>
                    <span style="color:#A89070;font-size:9px;">${activity.action}</span>
                </div>
                <span style="color:#F5E6C8;font-size:10px;line-height:1.3;">${activity.details}</span>
                <span style="font-size:9px;color:#5D5D5D;text-align:center;">${activity.user || '-'}</span>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ================================================================
// RENDER LOW STOCK LIST
// ================================================================
function renderLowStockList() {
    const container = document.getElementById('lowStockList');
    if (!container) return;

    let lowStockItems = [];
    if (window.products && window.warehouseProducts) {
        window.products.forEach(p => {
            let total = 0;
            let warehouses = [];
            window.warehouseProducts.forEach(wp => {
                if (wp.productId === p.id) {
                    total += wp.qty;
                    const w = window.warehouses.find(wh => wh.id === wp.warehouseId);
                    warehouses.push({
                        name: w ? w.name : 'غير محدد',
                        qty: wp.qty
                    });
                }
            });
            if (total <= (p.min || 0)) {
                lowStockItems.push({
                    product: p,
                    total: total,
                    min: p.min || 5,
                    warehouses: warehouses
                });
            }
        });
    }

    if (lowStockItems.length === 0) {
        container.innerHTML = `
            <div class="alert-item success">
                <div class="icon"><i class="fas fa-check-circle" style="color:#2D8F5E;"></i></div>
                <div class="content">
                    <div class="title">جميع المنتجات متوفرة</div>
                    <div class="desc">لا توجد منتجات منخفضة المخزون</div>
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    lowStockItems.forEach(item => {
        const percentage = (item.total / item.min) * 100;
        const color = percentage <= 30 ? '#E06060' : percentage <= 60 ? '#E6A830' : '#4A8AB5';
        const warehousesText = item.warehouses.map(w => `${w.name}: ${w.qty}`).join(' | ');
        
        html += `
            <div class="alert-item danger" style="border-right-color:${color};">
                <div class="icon"><i class="fas fa-exclamation-triangle" style="color:${color};"></i></div>
                <div class="content" style="flex:1;">
                    <div class="title" style="color:${color};">${item.product.name}</div>
                    <div class="desc">
                        <span style="font-weight:700;">الكمية: ${item.total}</span>
                        <span style="color:#A89070;margin-right:8px;">| الحد الأدنى: ${item.min}</span>
                        <span style="color:#A89070;margin-right:8px;font-size:10px;">| ${warehousesText}</span>
                    </div>
                    <div style="width:100%;height:4px;background:#2D2D2D;border-radius:2px;margin-top:4px;">
                        <div style="width:${Math.min(percentage, 100)}%;height:100%;background:${color};border-radius:2px;transition:width 0.5s;"></div>
                    </div>
                </div>
                <div class="time" style="font-size:10px;color:${color};">
                    ${percentage <= 30 ? '🔴 حرج' : percentage <= 60 ? '🟡 منخفض' : '🟢 متوسط'}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// UPDATE DASHBOARD DETAILS
// ================================================================
function updateDashboardDetails() {
    const today = getTodayDate();
    let todaySales = 0;
    let todayPurchases = 0;
    let todayReturns = 0;
    
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.date === today) {
                const total = s.totalWithTax || s.total || 0;
                todaySales += total;
            }
        });
    }
    
    if (window.purchases) {
        window.purchases.forEach(p => {
            if (p.date === today) {
                const total = p.totalWithTax || p.total || 0;
                todayPurchases += total;
            }
        });
    }
    
    if (window.returns) {
        window.returns.forEach(r => {
            if (r.date === today) {
                const total = r.items ? r.items.reduce((sum, item) => sum + (item.total || 0), 0) : (r.total || 0);
                todayReturns += total;
            }
        });
    }
    
    safeSetText('dashTodaySales', todaySales.toFixed(2));
    safeSetText('dashTodayPurchases', todayPurchases.toFixed(2));
    safeSetText('dashTodayReturns', todayReturns.toFixed(2));
    
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
    safeSetText('dashInventoryQty', totalQty);
    safeSetText('dashInventoryValue', totalValue.toFixed(2));
}
