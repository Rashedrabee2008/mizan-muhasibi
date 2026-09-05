// ================================================================
// CUSTOMER BALANCE - حساب رصيد العميل
// ================================================================

function getCustomerBalance(customerName) {
    let totalSales = 0;      // إجمالي المبيعات للعميل
    let totalReturns = 0;    // إجمالي مرتجعات العميل
    let totalPaid = 0;       // إجمالي المدفوعات (سندات تحصيل)
    let totalBonds = 0;      // إجمالي السندات (تحصيل عميل)
    
    // حساب المبيعات
    if (window.sales) {
        window.sales.forEach(s => {
            if (s.customer === customerName) {
                const amount = s.totalWithTax || s.total || 0;
                totalSales += amount;
            }
        });
    }
    
    // حساب المرتجعات
    if (window.returns) {
        window.returns.forEach(r => {
            if (r.customer === customerName) {
                const amount = r.total || 0;
                totalReturns += amount;
            }
        });
    }
    
    // حساب سندات التحصيل (المدفوعات)
    if (window.bonds) {
        window.bonds.forEach(b => {
            if (b.customerName === customerName && b.type === 'تحصيل عميل' && b.status === 'paid') {
                totalPaid += b.amount;
            }
        });
    }
    
    // حساب سندات التحصيل المعلقة
    if (window.bonds) {
        window.bonds.forEach(b => {
            if (b.customerName === customerName && b.type === 'تحصيل عميل' && b.status === 'pending') {
                totalBonds += b.amount;
            }
        });
    }
    
    // صافي الرصيد = (المبيعات - المرتجعات) - (المدفوعات + السندات المعلقة)
    const netBalance = (totalSales - totalReturns) - (totalPaid + totalBonds);
    
    return {
        totalSales: totalSales,
        totalReturns: totalReturns,
        totalPaid: totalPaid,
        totalBonds: totalBonds,
        netBalance: netBalance,
        status: netBalance > 0 ? 'عليه فلوس' : netBalance < 0 ? 'له فلوس' : 'مستقر'
    };
}

// ================================================================
// SUPPLIER BALANCE - حساب رصيد المورد
// ================================================================

function getSupplierBalance(supplierName) {
    let totalPurchases = 0;    // إجمالي المشتريات من المورد
    let totalReturns = 0;      // إجمالي مرتجعات المورد
    let totalPaid = 0;         // إجمالي المدفوعات (سندات سداد)
    let totalBonds = 0;        // إجمالي السندات (سداد مورد)
    
    // حساب المشتريات
    if (window.purchases) {
        window.purchases.forEach(p => {
            if (p.supplier === supplierName) {
                const amount = p.totalWithTax || p.total || 0;
                totalPurchases += amount;
            }
        });
    }
    
    // حساب مرتجعات المشتريات (إذا وجدت)
    if (window.returns) {
        window.returns.forEach(r => {
            if (r.supplier === supplierName) {
                const amount = r.total || 0;
                totalReturns += amount;
            }
        });
    }
    
    // حساب سندات السداد (المدفوعات)
    if (window.bonds) {
        window.bonds.forEach(b => {
            if (b.customerName === supplierName && b.type === 'سداد مورد' && b.status === 'paid') {
                totalPaid += b.amount;
            }
        });
    }
    
    // حساب سندات السداد المعلقة
    if (window.bonds) {
        window.bonds.forEach(b => {
            if (b.customerName === supplierName && b.type === 'سداد مورد' && b.status === 'pending') {
                totalBonds += b.amount;
            }
        });
    }
    
    // صافي الرصيد = (المشتريات - المرتجعات) - (المدفوعات + السندات المعلقة)
    const netBalance = (totalPurchases - totalReturns) - (totalPaid + totalBonds);
    
    return {
        totalPurchases: totalPurchases,
        totalReturns: totalReturns,
        totalPaid: totalPaid,
        totalBonds: totalBonds,
        netBalance: netBalance,
        status: netBalance > 0 ? 'له فلوس' : netBalance < 0 ? 'عليه فلوس' : 'مستقر'
    };
}

// ================================================================
// UPDATE CUSTOMER BALANCE DISPLAY - عرض رصيد العميل
// ================================================================

function updateCustomerBalanceDisplay() {
    const select = document.getElementById('salesCustomerSelect');
    const input = document.getElementById('salesCustomer');
    const customerName = select?.value || input?.value;
    
    const balanceDisplay = document.getElementById('customerBalanceDisplay');
    if (!balanceDisplay) return;
    
    if (!customerName) {
        balanceDisplay.innerHTML = '';
        balanceDisplay.style.display = 'none';
        return;
    }
    
    const balance = getCustomerBalance(customerName);
    const color = balance.netBalance > 0 ? '#E06060' : balance.netBalance < 0 ? '#2D8F5E' : '#A89070';
    const icon = balance.netBalance > 0 ? '🔴' : balance.netBalance < 0 ? '🟢' : '⚪';
    
    balanceDisplay.style.display = 'block';
    balanceDisplay.innerHTML = `
        <div style="background:#0D0D0D;border-radius:8px;padding:8px;border:1px solid ${color};margin-top:4px;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;font-size:12px;">
                <span>${icon} <strong>${customerName}</strong></span>
                <span style="color:${color};font-weight:700;">${balance.status}: ${Math.abs(balance.netBalance).toFixed(2)} 🇪🇬</span>
            </div>
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:2px;font-size:10px;color:#A89070;margin-top:2px;">
                <span>💰 مبيعات: ${balance.totalSales.toFixed(2)}</span>
                <span>🔄 مرتجعات: ${balance.totalReturns.toFixed(2)}</span>
                <span>💳 مدفوع: ${balance.totalPaid.toFixed(2)}</span>
                <span>📋 سندات: ${balance.totalBonds.toFixed(2)}</span>
            </div>
        </div>
    `;
}

// ================================================================
// UPDATE SUPPLIER BALANCE DISPLAY - عرض رصيد المورد
// ================================================================

function updateSupplierBalanceDisplay() {
    const select = document.getElementById('purchaseSupplierSelect');
    const input = document.getElementById('purchaseSupplier');
    const supplierName = select?.value || input?.value;
    
    const balanceDisplay = document.getElementById('supplierBalanceDisplay');
    if (!balanceDisplay) return;
    
    if (!supplierName) {
        balanceDisplay.innerHTML = '';
        balanceDisplay.style.display = 'none';
        return;
    }
    
    const balance = getSupplierBalance(supplierName);
    const color = balance.netBalance > 0 ? '#2D8F5E' : balance.netBalance < 0 ? '#E06060' : '#A89070';
    const icon = balance.netBalance > 0 ? '🟢' : balance.netBalance < 0 ? '🔴' : '⚪';
    
    balanceDisplay.style.display = 'block';
    balanceDisplay.innerHTML = `
        <div style="background:#0D0D0D;border-radius:8px;padding:8px;border:1px solid ${color};margin-top:4px;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;font-size:12px;">
                <span>${icon} <strong>${supplierName}</strong></span>
                <span style="color:${color};font-weight:700;">${balance.status}: ${Math.abs(balance.netBalance).toFixed(2)} 🇪🇬</span>
            </div>
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:2px;font-size:10px;color:#A89070;margin-top:2px;">
                <span>🛒 مشتريات: ${balance.totalPurchases.toFixed(2)}</span>
                <span>🔄 مرتجعات: ${balance.totalReturns.toFixed(2)}</span>
                <span>💳 مدفوع: ${balance.totalPaid.toFixed(2)}</span>
                <span>📋 سندات: ${balance.totalBonds.toFixed(2)}</span>
            </div>
        </div>
    `;
}
