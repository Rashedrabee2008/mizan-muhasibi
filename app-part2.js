// ═══════════════════════════════════════════════════════════
// 🛒 تحديث سعر المنتج بعد الاختيار
// ═══════════════════════════════════════════════════════════
window.updateSalePrice = function() {
    const id = document.getElementById('saleProduct')?.value;
    const priceInput = document.getElementById('salePrice');
    if (!id) { 
        if (priceInput) priceInput.value = ''; 
        return; 
    }
    const product = products.find(function(pr) { return pr.id == id; });
    if (product && priceInput) {
        priceInput.value = product.sell;
        // ✅ إضافة تأخير بسيط لضمان تحديث القيمة
        setTimeout(() => {
            if (priceInput.value === '' || priceInput.value == '0') {
                priceInput.value = product.sell;
            }
        }, 100);
    }
};

// ═══════════════════════════════════════════════════════════
// 🛒 إضافة صنف للفاتورة (مع حماية كاملة)
// ═══════════════════════════════════════════════════════════
window.addSaleItem = function() {
    if (typeof canAdd === 'function' && !canAdd()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    
    const productSelect = document.getElementById('saleProduct');
    const qtyInput = document.getElementById('saleQty');
    const priceInput = document.getElementById('salePrice');
    const whSelect = document.getElementById('saleWarehouse');
    
    const id = productSelect?.value;
    let qty = parseInt(qtyInput?.value) || 0;
    let price = parseFloat(priceInput?.value) || 0;
    const whId = whSelect?.value;
    
    // ✅ التحقق من اختيار المنتج
    if (!id || id === '') { 
        if (typeof showToast === 'function') showToast('⚠️ اختر منتج', 'error'); 
        return; 
    }
    
    const p = products.find(function(pr) { return pr.id == id; });
    if (!p) {
        if (typeof showToast === 'function') showToast('⚠️ المنتج غير موجود', 'error');
        return;
    }
    
    // ✅ لو السعر فاضي، نجيبه من المنتج
    if (price <= 0) {
        price = p.sell;
        if (priceInput) priceInput.value = price;
    }
    
    // ✅ لو الكمية فاضية، نخليها 1
    if (qty <= 0) {
        qty = 1;
        if (qtyInput) qtyInput.value = 1;
    }
    
    // ✅ التحقق من الكمية المتاحة
    let availableQty = p.qty;
    if (whId && typeof getProductStockInWarehouse === 'function') {
        availableQty = getProductStockInWarehouse(id, whId);
    }
    
    const ex = currentSaleItems.find(function(i) { return i.productId == id; });
    const totalQty = qty + (ex ? ex.qty : 0);
    if (totalQty > availableQty) {
        if (typeof showToast === 'function') showToast('⚠️ الكمية المتاحة: ' + availableQty, 'error');
        return;
    }
    
    // ✅ حساب الضريبة والإجمالي
    const vatPercent = p.vat || vatSettings.defaultVAT || 14;
    const subtotal = qty * price;
    const vatAmount = subtotal * (vatPercent / 100);
    const totalWithVAT = subtotal + vatAmount;
    
    // ✅ إضافة أو تحديث الصنف
    if (ex) {
        ex.qty += qty;
        ex.price = price;
        ex.subtotal = ex.qty * ex.price;
        ex.vatAmount = ex.subtotal * (ex.vatPercent / 100);
        ex.total = ex.subtotal + ex.vatAmount;
    } else {
        currentSaleItems.push({
            productId: p.id, 
            name: p.name, 
            qty: qty, 
            price: price,
            costPrice: p.buy, 
            vatPercent: vatPercent,
            subtotal: subtotal, 
            vatAmount: vatAmount, 
            total: totalWithVAT
        });
    }
    
    // ✅ إعادة تعيين الحقول
    if (qtyInput) qtyInput.value = 1;
    if (priceInput) priceInput.value = '';
    if (productSelect) {
        productSelect.value = '';
        // ✅ إعادة تعيين البحث
        const wrap = productSelect.closest('.srch-wrap');
        if (wrap) {
            const inp = wrap.querySelector('input');
            if (inp) inp.value = '';
        }
        productSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // ✅ إعادة عرض الفاتورة وتحديث الإجماليات
    renderCashier();
    updateSaleTotals();
    
    if (typeof showToast === 'function') showToast('✅ تم إضافة ' + p.name, 'success');
};
