// ================================================================
// GENERATE PROFIT ANALYSIS - تحليل الأرباح (نسخة محسنة)
// ================================================================
function generateProfitAnalysis() {
    const container = document.getElementById('profitAnalysisResult');
    if (!container) return;

    // تحديث الإحصائيات أولاً
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

    // حساب الإحصائيات
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

    // تحديث الإحصائيات في الأعلى
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
