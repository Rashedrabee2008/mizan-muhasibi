// ================================================================
// UPDATE DASHBOARD - نسخة متطورة
// ================================================================
function updateDashboard() {
    // --- حساب الإجماليات ---
    const totalSales = window.sales ? window.sales.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalPurchases = window.purchases ? window.purchases.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalExpenses = window.expenses ? window.expenses.reduce((s, e) => s + e.amount, 0) : 0;
    const totalReturns = window.returns ? window.returns.reduce((s, i) => {
        if (i.items) return s + i.items.reduce((sum, item) => sum + (item.total || 0), 0);
        return s + (i.total || 0);
    }, 0) : 0;

    const totalTreasury = window.treasury ? window.treasury.reduce((s, t) => {
        if (t.type === 'deposit') return s + t.amount;
        else return s - t.amount;
    }, 0) : 0;

    const netProfit = totalSales - totalPurchases - totalExpenses - totalReturns;

    // عرض الإحصائيات
    safeSetText('dashTotalSales', totalSales.toFixed(2));
    safeSetText('dashTotalPurchases', totalPurchases.toFixed(2));
    safeSetText('dashTotalProducts', window.products ? window.products.length : 0);
    safeSetText('dashTotalCustomers', window.customers ? window.customers.length : 0);

    // --- عرض التنبيهات ---
    const lowStock = window.products ? window.products.filter(p => {
        const total = window.warehouseProducts ? window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) : 0;
        return total <= p.min;
    }) : [];

    const lowStockEl = document.getElementById('dashLowStock');
    if (lowStockEl) {
        lowStockEl.textContent = lowStock.length > 0 ? `🔴 ${lowStock.length} منتج منخفض` : '✅ المخزون جيد';
        lowStockEl.style.color = lowStock.length > 0 ? '#E06060' : '#2D8F5E';
    }

    // --- الرسم البياني للمبيعات الشهرية (أفضل شكل) ---
    const chart = document.getElementById('salesChart');
    if (chart) {
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthSales = Array(12).fill(0);
        const monthPurchases = Array(12).fill(0);
        const monthProfit = Array(12).fill(0);

        if (window.sales) {
            window.sales.forEach(s => {
                const m = new Date(s.date).getMonth();
                if (s.items) {
                    monthSales[m] += s.items.reduce((sum, item) => sum + (item.total || 0), 0);
                } else {
                    monthSales[m] += (s.total || 0);
                }
            });
        }

        if (window.purchases) {
            window.purchases.forEach(p => {
                const m = new Date(p.date).getMonth();
                if (p.items) {
                    monthPurchases[m] += p.items.reduce((sum, item) => sum + (item.total || 0), 0);
                } else {
                    monthPurchases[m] += (p.total || 0);
                }
            });
        }

        // حساب الأرباح الشهرية
        for (let i = 0; i < 12; i++) {
            monthProfit[i] = monthSales[i] - monthPurchases[i];
        }

        const max = Math.max(...monthSales, ...monthPurchases, 1);
        const currentMonth = new Date().getMonth();

        chart.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 4px;flex-wrap:wrap;gap:4px;">
                <div style="display:flex;align-items:center;gap:12px;font-size:11px;">
                    <span><span style="display:inline-block;width:12px;height:12px;background:#C9A94E;border-radius:3px;"></span> المبيعات</span>
                    <span><span style="display:inline-block;width:12px;height:12px;background:#E06060;border-radius:3px;"></span> المشتريات</span>
                    <span><span style="display:inline-block;width:12px;height:12px;background:#2D8F5E;border-radius:3px;"></span> الأرباح</span>
                </div>
                <span style="font-size:10px;color:#A89070;">${months[currentMonth]} ${new Date().getFullYear()}</span>
            </div>
            <div style="display:flex;align-items:flex-end;height:140px;gap:4px;padding:8px 0;border-bottom:1px solid #2D2D2D;">
                ${months.map((name, i) => {
                    const salesHeight = (monthSales[i] / max) * 100;
                    const purchasesHeight = (monthPurchases[i] / max) * 100;
                    const profitHeight = (monthProfit[i] / max) * 100;
                    const isCurrent = i === currentMonth;
                    return `
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end;gap:2px;">
                            <div style="display:flex;gap:1px;align-items:flex-end;height:120px;width:100%;">
                                <div style="width:28%;background:${isCurrent ? '#C9A94E' : '#8B7A3A'};border-radius:2px 2px 0 0;min-height:4px;height:${Math.max(salesHeight, 4)}%;transition:0.5s;position:relative;">
                                    ${monthSales[i] > 0 ? `<span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:7px;color:#C9A94E;font-weight:700;">${monthSales[i].toFixed(0)}</span>` : ''}
                                </div>
                                <div style="width:28%;background:${isCurrent ? '#E06060' : '#8A3A3A'};border-radius:2px 2px 0 0;min-height:4px;height:${Math.max(purchasesHeight, 4)}%;transition:0.5s;position:relative;">
                                    ${monthPurchases[i] > 0 ? `<span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:7px;color:#E06060;font-weight:700;">${monthPurchases[i].toFixed(0)}</span>` : ''}
                                </div>
                                <div style="width:28%;background:${isCurrent ? '#2D8F5E' : '#1A5A3A'};border-radius:2px 2px 0 0;min-height:4px;height:${Math.max(profitHeight, 4)}%;transition:0.5s;position:relative;">
                                    ${monthProfit[i] > 0 ? `<span style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:7px;color:#2D8F5E;font-weight:700;">${monthProfit[i].toFixed(0)}</span>` : ''}
                                </div>
                            </div>
                            <div style="font-size:8px;color:${isCurrent ? '#C9A94E' : '#5D5D5D'};font-weight:${isCurrent ? '700' : '400'};margin-top:2px;">${name}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;padding:6px 4px 0;font-size:9px;color:#5D5D5D;">
                <span>💰 إجمالي المبيعات: ${totalSales.toFixed(2)}</span>
                <span>📊 صافي الربح: ${netProfit.toFixed(2)}</span>
                <span>📦 ${window.products ? window.products.length : 0} منتج</span>
            </div>
        `;
    }

    // --- تحديث التنبيهات ---
    updateAlertsUI();
    checkLowStockAlert();
}