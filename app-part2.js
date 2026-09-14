// ============================================================
// الميزان 14.0.0 - الجزء 2: العمليات
// app-part2.js (نسخة كاملة مع الخزائن)
// ============================================================

console.log('📦 تحميل app-part2.js - العمليات + البحث + الخزائن');

// ═══════════════════════════════════════════════════════════
// 🔍 نظام البحث الذكي
// ═══════════════════════════════════════════════════════════
window._srchTimers = {};

window._normAr = function(t) {
    if (!t) return '';
    return String(t).toLowerCase().trim()
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/[أإآا]/g, 'ا')
        .replace(/[يى]/g, 'ي')
        .replace(/ة/g, 'ه');
};

window._makeSearchable = function(selectId, placeholder, icon) {
    icon = icon || '🔍';
    const sel = document.getElementById(selectId);
    if (!sel) return false;
    
    // تنظيف أي wrapper قديم
    const oldWrappers = document.querySelectorAll('.srch-wrap');
    oldWrappers.forEach(function(w) {
        const innerSel = w.querySelector('#' + selectId);
        if (innerSel) {
            w.parentNode.insertBefore(innerSel, w);
            innerSel.style.display = '';
            delete innerSel.dataset.srch;
            w.remove();
        }
    });
    
    if (sel.dataset.srch === 'true') return false;
    
    const opts = [];
    Array.from(sel.options).forEach(function(o) {
        if (o.value !== '') opts.push({ v: o.value, t: o.textContent.trim() });
    });
    if (opts.length === 0) return false;
    
    sel.dataset.srch = 'true';
    sel.style.display = 'none';
    
    const wrap = document.createElement('div');
    wrap.className = 'srch-wrap';
    wrap.style.cssText = 'position:relative;width:100%;';
    const uid = 'srch_' + selectId + '_' + Date.now();
    
    let cur = '';
    const c = Array.from(sel.options).find(function(o) { return o.value === sel.value; });
    if (c && c.value !== '') cur = c.textContent.trim();
    
    wrap.innerHTML = 
        '<input type="text" id="' + uid + '" placeholder="' + placeholder + '" value="' + cur + '" autocomplete="off" inputmode="search" style="width:100%;font-size:15px;padding:11px 12px;border-radius:8px;border:2px solid #3D3D3D;background:#0D0D0D;color:#F5E6C8;font-family:inherit;box-sizing:border-box;outline:none;">' +
        '<div id="' + uid + '_d" style="display:none;position:absolute;top:calc(100% + 4px);right:0;left:0;background:#1C1C1C;border:2px solid #C9A94E;border-radius:10px;max-height:280px;overflow-y:auto;z-index:99999;box-shadow:0 12px 32px rgba(0,0,0,0.6);"></div>';
    
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    
    const inp = document.getElementById(uid);
    const dd = document.getElementById(uid + '_d');
    
    const showList = function(q) {
        const q2 = _normAr(q);
        const list = q2 ? opts.filter(function(o) { return _normAr(o.t).includes(q2); }) : opts;
        if (!list.length) {
            dd.innerHTML = '<div style="padding:16px;text-align:center;color:#5D5D5D;font-size:14px;">لا توجد نتائج</div>';
            dd.style.display = 'block';
            return;
        }
        let h = '';
        list.slice(0, 100).forEach(function(o) {
            h += '<div class="srch-item" data-v="' + o.v + '" data-t="' + o.t.replace(/"/g, '&quot;') + '" style="padding:13px;cursor:pointer;border-bottom:1px solid #2D2D2D;color:#F5E6C8;font-size:14px;display:flex;align-items:center;gap:8px;"><span style="font-size:16px;">' + icon + '</span><span>' + o.t + '</span></div>';
        });
        dd.innerHTML = h;
        dd.style.display = 'block';
        
        dd.querySelectorAll('.srch-item').forEach(function(it) {
            const pick = function(ev) {
                ev.stopPropagation();
                
                // ✅ حفظ القيمة
                sel.value = it.dataset.v;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                
                // ✅ تفضية الحقل
                inp.value = '';
                
                // ✅ إغلاق القائمة
                dd.style.display = 'none';
                inp.blur();
            };
            it.addEventListener('touchend', pick, { passive: true });
            it.addEventListener('click', pick);
        });
    };
    
    inp.addEventListener('input', function() {
        clearTimeout(window._srchTimers[selectId]);
        const q = this.value;
        window._srchTimers[selectId] = setTimeout(function() { showList(q); }, 100);
    });
    inp.addEventListener('focus', function() { showList(this.value); });
    inp.addEventListener('blur', function() {
        setTimeout(function() { dd.style.display = 'none'; }, 250);
    });
    
    return true;
};

window._applyAllSearch = function() {
    const list = [
        ['saleCustomer', '🔍 اكتب اسم العميل...', '👤'],
        ['saleProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['purSupplier', '🔍 اكتب اسم المورد...', '🚚'],
        ['purProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['retParty', '🔍 اختر الجهة...', '👤'],
        ['retProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['collectCustomer', '🔍 اكتب اسم العميل...', '👤'],
        ['paySupplier', '🔍 اكتب اسم المورد...', '🚚'],
        ['settleCustomer', '🔍 اكتب اسم العميل...', '👤'],
        ['settleProduct', '🔍 اكتب اسم المنتج...', '📦']
    ];
    let n = 0;
    list.forEach(function(cfg) {
        if (_makeSearchable(cfg[0], cfg[1], cfg[2])) n++;
    });
    return n;
};

// ═══════════════════════════════════════════════════════════
// 🏪 تعبئة المخازن (قوائم عادية)
// ═══════════════════════════════════════════════════════════

window.populateSaleWarehouse = function() {
    const sel = document.getElementById('saleWarehouse'); if (!sel) return;
    
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    delete sel.dataset.srch;
    
    const cv = sel.value;
    let whs = [];
    try {
        if (typeof warehouses !== 'undefined' && Array.isArray(warehouses) && warehouses.length > 0) {
            whs = warehouses;
        } else {
            whs = JSON.parse(localStorage.getItem('mizan_warehouses') || '[]');
        }
    } catch (e) { whs = []; }
    
    if (whs.length === 0) {
        whs = [{ id: 1, name: 'المخزن الرئيسي', location: 'المركز الرئيسي', isDefault: true, active: true }];
        localStorage.setItem('mizan_warehouses', JSON.stringify(whs));
        if (typeof window.warehouses !== 'undefined') window.warehouses = whs;
    }
    
    let html = '<option value="">اختر المخزن...</option>';
    whs.forEach(function(w) {
        const isDef = w.isDefault ? ' ⭐' : '';
        html += '<option value="' + w.id + '">' + w.name + isDef + '</option>';
    });
    sel.innerHTML = html;
    sel.value = cv || (whs.find(function(w) { return w.isDefault; })?.id || '');
    sel.style.display = '';
    sel.style.visibility = 'visible';
};

window.populatePurWarehouse = function() {
    const sel = document.getElementById('purWarehouse'); if (!sel) return;
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    delete sel.dataset.srch;
    
    const cv = sel.value;
    let whs = [];
    try {
        if (typeof warehouses !== 'undefined' && Array.isArray(warehouses) && warehouses.length > 0) {
            whs = warehouses;
        } else {
            whs = JSON.parse(localStorage.getItem('mizan_warehouses') || '[]');
        }
    } catch (e) { whs = []; }
    
    if (whs.length === 0) {
        whs = [{ id: 1, name: 'المخزن الرئيسي', location: 'المركز الرئيسي', isDefault: true, active: true }];
    }
    
    let html = '<option value="">اختر المخزن...</option>';
    whs.forEach(function(w) {
        const isDef = w.isDefault ? ' ⭐' : '';
        html += '<option value="' + w.id + '">' + w.name + isDef + '</option>';
    });
    sel.innerHTML = html;
    sel.value = cv || (whs.find(function(w) { return w.isDefault; })?.id || '');
    sel.style.display = '';
    sel.style.visibility = 'visible';
};

window.populateRetWarehouse = function() {
    const sel = document.getElementById('retWarehouse'); if (!sel) return;
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    delete sel.dataset.srch;
    
    const cv = sel.value;
    let whs = [];
    try {
        if (typeof warehouses !== 'undefined' && Array.isArray(warehouses) && warehouses.length > 0) {
            whs = warehouses;
        } else {
            whs = JSON.parse(localStorage.getItem('mizan_warehouses') || '[]');
        }
    } catch (e) { whs = []; }
    
    if (whs.length === 0) {
        whs = [{ id: 1, name: 'المخزن الرئيسي', location: 'المركز الرئيسي', isDefault: true, active: true }];
    }
    
    let html = '<option value="">اختر المخزن...</option>';
    whs.forEach(function(w) {
        const isDef = w.isDefault ? ' ⭐' : '';
        html += '<option value="' + w.id + '">' + w.name + isDef + '</option>';
    });
    sel.innerHTML = html;
    sel.value = cv || (whs.find(function(w) { return w.isDefault; })?.id || '');
    sel.style.display = '';
    sel.style.visibility = 'visible';
};

// ═══════════════════════════════════════════════════════════
// 🛒 نظام المبيعات
// ═══════════════════════════════════════════════════════════

window.populateSaleProducts = function() {
    const sel = document.getElementById('saleProduct'); if (!sel) return;
    const cv = sel.value;
    const whId = document.getElementById('saleWarehouse')?.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    if (typeof products !== 'undefined') {
        products.forEach(function(p) {
            let qty = p.qty;
            if (whId && typeof getProductStockInWarehouse === 'function') {
                qty = getProductStockInWarehouse(p.id, whId);
            }
            sel.innerHTML += '<option value="' + p.id + '">' + p.name + ' (متاح: ' + qty + ')</option>';
        });
    }
    sel.value = cv;
    delete sel.dataset.srch;
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    setTimeout(_applyAllSearch, 50);
};

window.populateSaleCustomers = function() {
    const sel = document.getElementById('saleCustomer'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">عميل نقدي</option>';
    if (typeof customers !== 'undefined') {
        customers.forEach(function(c) {
            sel.innerHTML += '<option value="' + c.name + '">' + c.name + '</option>';
        });
    }
    sel.value = cv;
    delete sel.dataset.srch;
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    setTimeout(_applyAllSearch, 50);
};

window.onWarehouseChange = function() {
    populateSaleProducts();
};

window.updateSalePrice = function() {
    const id = document.getElementById('saleProduct')?.value;
    if (!id) { const p = document.getElementById('salePrice'); if (p) p.value = ''; return; }
    const product = products.find(function(pr) { return pr.id == id; });
    if (product) {
        const el = document.getElementById('salePrice');
        if (el) el.value = product.sell;
    }
};

// ✅ عرض/إخفاء حقل الخزنة
window.toggleCashBoxField = function(fieldId, show) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.style.display = show ? '' : 'none';
    }
};

// ✅ في الكاشير: إظهار/إخفاء حقل الخزنة
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        const radios = document.querySelectorAll('input[name="salePaymentMethod"]');
        radios.forEach(function(radio) {
            radio.addEventListener('change', function() {
                const isCash = this.value === 'cash';
                toggleCashBoxField('saleCashBoxField', isCash);
            });
        });
    }, 2000);
});

window.addSaleItem = function() {
    if (typeof canAdd === 'function' && !canAdd()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    const id = document.getElementById('saleProduct')?.value;
    const qty = parseInt(document.getElementById('saleQty')?.value) || 0;
    const price = parseFloat(document.getElementById('salePrice')?.value) || 0;
    const whId = document.getElementById('saleWarehouse')?.value;
    
    if (!id) { if (typeof showToast === 'function') showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { if (typeof showToast === 'function') showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { if (typeof showToast === 'function') showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    
    const p = products.find(function(pr) { return pr.id == id; }); if (!p) return;
    
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
    
    const vatPercent = p.vat || vatSettings.defaultVAT;
    const subtotal = qty * price;
    const vatAmount = subtotal * (vatPercent / 100);
    const totalWithVAT = subtotal + vatAmount;
    
    if (ex) {
        ex.qty += qty;
        ex.subtotal = ex.qty * ex.price;
        ex.vatAmount = ex.subtotal * (ex.vatPercent / 100);
        ex.total = ex.subtotal + ex.vatAmount;
    } else {
        currentSaleItems.push({
            productId: p.id, name: p.name, qty: qty, price: price,
            costPrice: p.buy, vatPercent: vatPercent,
            subtotal: subtotal, vatAmount: vatAmount, total: totalWithVAT
        });
    }
    
    const qtyEl = document.getElementById('saleQty'); if (qtyEl) qtyEl.value = 1;
    const priceEl = document.getElementById('salePrice'); if (priceEl) priceEl.value = '';
    const prodEl = document.getElementById('saleProduct'); 
    if (prodEl) {
        prodEl.value = '';
        prodEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    renderCashier();
    updateSaleTotals();
    if (typeof showToast === 'function') showToast('✅ تم إضافة الصنف', 'success');
};

window.removeSaleItem = function(i) {
    currentSaleItems.splice(i, 1);
    renderCashier();
    updateSaleTotals();
};

window.renderCashier = function() {
    const c = document.getElementById('saleItemsContainer'); 
    const tb = document.getElementById('saleTotalBox');
    if (!c) return;
    
    const badge = document.getElementById('itemsCountBadge');
    if (badge) badge.textContent = currentSaleItems.length;
    
    if (currentSaleItems.length === 0) {
        c.innerHTML = '<div class="empty-items"><i class="fas fa-shopping-cart"></i><span>لا توجد أصناف</span><small>أضف صنف من الأعلى</small></div>';
        if (tb) tb.style.display = 'none';
        return;
    }
    
    let html = '<div class="items-header-row"><span>ID</span><span>اسم الصنف</span><span>الوحدة</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>';
    
    currentSaleItems.forEach(function(it, i) {
        const prod = products.find(function(p) { return p.id == it.productId; });
        const unit = prod?.unit || 'قطعة';
        const itemId = String(it.productId).slice(-4);
        html += '<div class="item-row">' +
            '<span class="item-id">#' + itemId + '</span>' +
            '<span class="item-name">' + it.name + '</span>' +
            '<span class="item-unit">' + unit + '</span>' +
            '<span class="item-qty">' + it.qty + '</span>' +
            '<span class="item-price">' + formatMoney(it.price) + '</span>' +
            '<span class="item-total">' + formatMoney(it.total) + '</span>' +
            '<button class="item-delete" onclick="removeSaleItem(' + i + ')"><i class="fas fa-times"></i></button>' +
            '</div>';
    });
    
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
};

window.updateSaleTotals = function() {
    const subtotal = currentSaleItems.reduce(function(s, i) { return s + (i.subtotal || i.total); }, 0);
    const vatTotal = currentSaleItems.reduce(function(s, i) { return s + (i.vatAmount || 0); }, 0);
    const totalQty = currentSaleItems.reduce(function(s, i) { return s + i.qty; }, 0);
    const invoiceType = typeof getRadioValue === 'function' ? getRadioValue('saleInvoiceType', 'simple') : 'simple';
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const grandTotal = subtotal + finalVAT;
    
    const e1 = document.getElementById('statItemsCount'); if (e1) e1.textContent = currentSaleItems.length;
    const e2 = document.getElementById('statTotalQty'); if (e2) e2.textContent = totalQty;
    const e3 = document.getElementById('saleSubtotal'); if (e3) e3.textContent = formatMoney(subtotal);
    const e4 = document.getElementById('saleVAT'); if (e4) e4.textContent = isTaxInvoice ? formatMoney(finalVAT) : '0.00';
    const e5 = document.getElementById('saleTotal'); if (e5) e5.textContent = formatMoney(grandTotal) + ' ج.م';
};

window.updateInvoiceHeader = function() {
    const today = new Date();
    const e1 = document.getElementById('invDateDisplay');
    if (e1) {
        e1.textContent = String(today.getDate()).padStart(2, '0') + '/' +
            String(today.getMonth() + 1).padStart(2, '0') + '/' + today.getFullYear();
    }
    const e2 = document.getElementById('invTimeDisplay');
    if (e2) {
        e2.textContent = today.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
    const e3 = document.getElementById('nextInvNum');
    if (e3) e3.textContent = '#' + (sales.length + 1);
};

window.printCurrentInvoice = function() {
    if (currentSaleItems.length === 0) {
        if (typeof showToast === 'function') showToast('⚠️ لا توجد أصناف للطباعة', 'warning');
        return;
    }
    
    const customer = document.getElementById('saleCustomer')?.value || 'عميل نقدي';
    const whName = document.getElementById('saleWarehouse')?.selectedOptions[0]?.text || 'المخزن';
    const cashBoxName = document.getElementById('saleCashBox')?.selectedOptions[0]?.text || 'نقدي';
    const subtotal = currentSaleItems.reduce(function(s, i) { return s + (i.subtotal || i.total); }, 0);
    const vatTotal = currentSaleItems.reduce(function(s, i) { return s + (i.vatAmount || 0); }, 0);
    const invoiceType = document.querySelector('input[name="saleInvoiceType"]:checked')?.value || 'simple';
    const isTax = invoiceType === 'tax';
    const finalVAT = isTax ? vatTotal : 0;
    const total = subtotal + finalVAT;
    
    let itemsHtml = '';
    currentSaleItems.forEach(function(it, i) {
        itemsHtml += '<tr>' +
            '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + (i + 1) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd;">' + it.name + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + it.qty + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + formatMoney(it.price) + '</td>' +
            '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + formatMoney(it.total) + '</td>' +
            '</tr>';
    });
    
    const printHtml = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>فاتورة بيع</title>' +
        '<style>* { margin:0; padding:0; box-sizing:border-box; font-family:Arial, sans-serif; }' +
        'body { padding:20px; background:#fff; color:#000; }' +
        '.header { text-align:center; padding-bottom:15px; border-bottom:2px dashed #333; margin-bottom:15px; }' +
        '.header h1 { color:#333; font-size:24px; margin-bottom:5px; }' +
        '.header p { color:#666; font-size:12px; }' +
        '.info { display:flex; justify-content:space-between; margin-bottom:15px; padding:10px; background:#f5f5f5; border-radius:5px; font-size:13px; flex-wrap:wrap; gap:10px; }' +
        'table { width:100%; border-collapse:collapse; margin-bottom:15px; font-size:13px; }' +
        'table th { background:#333; color:#fff; padding:10px 8px; border:1px solid #333; }' +
        'table td { padding:8px; border:1px solid #ddd; }' +
        '.totals { width:300px; margin-right:auto; font-size:14px; margin-top:15px; }' +
        '.totals .row { display:flex; justify-content:space-between; padding:6px 10px; border-bottom:1px solid #eee; }' +
        '.totals .total { background:#333; color:#fff; font-weight:900; font-size:18px; padding:12px; margin-top:8px; border-radius:5px; }' +
        '.footer { text-align:center; margin-top:20px; padding-top:15px; border-top:2px dashed #333; font-size:12px; color:#666; }' +
        '</style></head><body>' +
        '<div class="header"><h1>' + (companyData.name || 'الميزان') + '</h1>' +
        (companyData.phone ? '<p>📞 ' + companyData.phone + '</p>' : '') +
        (companyData.address ? '<p>📍 ' + companyData.address + '</p>' : '') +
        '<p style="margin-top:8px;font-size:14px;font-weight:bold;">فاتورة بيع ' + (isTax ? 'ضريبية' : 'عادية') + '</p></div>' +
        '<div class="info"><div><strong>العميل:</strong> ' + customer + '</div>' +
        '<div><strong>المخزن:</strong> ' + whName + '</div>' +
        '<div><strong>الخزنة:</strong> ' + cashBoxName + '</div>' +
        '<div><strong>التاريخ:</strong> ' + getTodayDate() + '</div>' +
        '<div><strong>الوقت:</strong> ' + getNowTime() + '</div></div>' +
        '<table><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>' +
        '<tbody>' + itemsHtml + '</tbody></table>' +
        '<div class="totals">' +
        '<div class="row"><span>المجموع:</span><span>' + formatMoney(subtotal) + ' ج.م</span></div>' +
        (isTax ? '<div class="row"><span>الضريبة:</span><span>' + formatMoney(finalVAT) + ' ج.م</span></div>' : '') +
        '<div class="row total"><span>الإجمالي:</span><span>' + formatMoney(total) + ' ج.م</span></div></div>' +
        '<div class="footer">' + (companyData.footer || 'شكراً لتعاملكم معنا 🌟') + '</div>' +
        '<script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close();},1000);},200);};<\/script>' +
        '</body></html>';
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(printHtml);
    printWindow.document.close();
    if (typeof showToast === 'function') showToast('🖨️ جاري الطباعة...', 'info');
};

window.saveSale = function() {
    if (typeof canAdd === 'function' && !canAdd()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (currentSaleItems.length === 0) {
        if (typeof showToast === 'function') showToast('⚠️ لا توجد أصناف', 'error');
        return;
    }
    
    const whId = document.getElementById('saleWarehouse')?.value;
    const cashBoxId = typeof getSaleCashBox === 'function' ? getSaleCashBox() : null;
    
    for (let i = 0; i < currentSaleItems.length; i++) {
        const it = currentSaleItems[i];
        const p = products.find(function(pr) { return pr.id == it.productId; });
        if (!p) { if (typeof showToast === 'function') showToast('⚠️ المنتج غير موجود: ' + it.name, 'error'); return; }
        let available = p.qty;
        if (whId && typeof getProductStockInWarehouse === 'function') {
            available = getProductStockInWarehouse(it.productId, whId);
        }
        if (available < it.qty) {
            if (typeof showToast === 'function') showToast('⚠️ الكمية غير كافية: ' + it.name + ' (متاح: ' + available + ')', 'error');
            return;
        }
    }
    
    const subtotal = currentSaleItems.reduce(function(s, i) { return s + (i.subtotal || i.total); }, 0);
    const vatTotal = currentSaleItems.reduce(function(s, i) { return s + (i.vatAmount || 0); }, 0);
    const customer = document.getElementById('saleCustomer')?.value || 'عميل نقدي';
    const paymentMethod = typeof getRadioValue === 'function' ? getRadioValue('salePaymentMethod', 'cash') : 'cash';
    const invoiceType = typeof getRadioValue === 'function' ? getRadioValue('saleInvoiceType', 'simple') : 'simple';
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const total = subtotal + finalVAT;
    const today = getTodayDate();
    
    if (paymentMethod === 'credit' && customer === 'عميل نقدي') {
        if (typeof showToast === 'function') showToast('⚠️ اختر عميل مسجل للبيع الآجل', 'error');
        return;
    }
    
    let cogsTotal = 0;
    const itemChanges = [];
    currentSaleItems.forEach(function(it) {
        const p = products.find(function(pr) { return pr.id == it.productId; });
        if (p) {
            it.costPrice = p.buy;
            cogsTotal += (p.buy * it.qty);
            const before = p.qty;
            p.qty -= it.qty;
            if (whId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, whId);
                setProductStockInWarehouse(it.productId, whId, Math.max(0, whBefore - it.qty));
            }
            itemChanges.push({ item: it, before: before, after: p.qty });
        }
    });
    
    const inv = {
        id: Date.now(), number: sales.length + 1, customer: customer,
        customerId: customers.find(function(c) { return c.name === customer; })?.id || null,
        warehouseId: whId,
        cashBoxId: cashBoxId,
        paymentMethod: paymentMethod,
        invoiceType: isTaxInvoice ? 'tax' : 'simple',
        subtotal: subtotal, vatTotal: finalVAT, cogs: cogsTotal, total: total,
        paidAmount: paymentMethod === 'cash' ? total : 0,
        remainingAmount: paymentMethod === 'cash' ? 0 : total,
        status: paymentMethod === 'cash' ? 'paid' : 'unpaid',
        items: JSON.parse(JSON.stringify(currentSaleItems)),
        relatedPayments: [], relatedReturns: [], journalEntryId: null,
        date: today, time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    sales.push(inv);
    
    itemChanges.forEach(function(ch) {
        if (typeof logInventoryMovement === 'function') {
            logInventoryMovement({
                productId: ch.item.productId, productName: ch.item.name,
                type: 'out', qty: ch.item.qty, price: ch.item.costPrice,
                reason: 'sale', refType: 'sale', refId: inv.id, refNumber: inv.number,
                warehouseId: whId,
                balanceBefore: ch.before, balanceAfter: ch.after
            });
        }
    });
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('النقدية بالخزنة') : null;
        const arAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('العملاء') : null;
        const salesAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('إيرادات المبيعات') : null;
        const vatAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('ضريبة القيمة المضافة (دائن)') : null;
        const cogsAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('تكلفة البضاعة') : null;
        const invAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('المخزون') : null;
        
        if (paymentMethod === 'cash' && cashAcc) {
            lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: total, credit: 0 });
        } else if (arAcc) {
            lines.push({ accountId: arAcc.id, accountName: arAcc.name, debit: total, credit: 0 });
        }
        if (salesAcc) lines.push({ accountId: salesAcc.id, accountName: salesAcc.name, debit: 0, credit: subtotal });
        if (finalVAT > 0 && vatAcc) lines.push({ accountId: vatAcc.id, accountName: vatAcc.name, debit: 0, credit: finalVAT });
        if (cogsAcc && cogsTotal > 0) lines.push({ accountId: cogsAcc.id, accountName: cogsAcc.name, debit: cogsTotal, credit: 0 });
        if (invAcc && cogsTotal > 0) lines.push({ accountId: invAcc.id, accountName: invAcc.name, debit: 0, credit: cogsTotal });
        
        if (lines.length >= 2 && typeof createJournalEntry === 'function') {
            journalEntry = createJournalEntry('فاتورة بيع #' + inv.number + ' - ' + customer, 'SALE-' + inv.number, today, lines, 'sale', inv.id);
            if (journalEntry) inv.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    if (paymentMethod === 'cash') {
        const cashBoxName = document.getElementById('saleCashBox')?.selectedOptions[0]?.text || 'نقدي';
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: 'فاتورة بيع #' + inv.number + ' - ' + customer,
            partyName: customer, invoiceNumber: inv.number,
            cashBoxId: cashBoxId,
            cashBoxName: cashBoxName,
            refType: 'sale', refId: inv.id, journalEntryId: inv.journalEntryId,
            date: today, time: getNowTime()
        });
    }
    
    if (typeof setData === 'function') {
        setData('products', products);
        setData('sales', sales);
        setData('treasury', treasury);
    }
    if (typeof addAuditLog === 'function') {
        addAuditLog('add', 'sale', 'فاتورة بيع #' + inv.number + ' - ' + customer + ' - ' + formatMoney(total) + ' ج.م');
    }
    
    currentSaleItems = [];
    const custEl = document.getElementById('saleCustomer'); if (custEl) custEl.value = '';
    if (typeof setRadioValue === 'function') {
        setRadioValue('salePaymentMethod', 'cash');
        setRadioValue('saleInvoiceType', 'simple');
    }
    
    renderCashier();
    updateSaleTotals();
    populateSaleProducts();
    if (typeof populateSaleWarehouse === 'function') populateSaleWarehouse();
    if (typeof populateCashBoxDropdowns === 'function') populateCashBoxDropdowns();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    updateInvoiceHeader();
    
    if (typeof showToast === 'function') showToast('✅ فاتورة #' + inv.number + ' بمبلغ ' + formatMoney(total) + ' 🇪🇬', 'success');
};

window.clearSale = function() {
    if (currentSaleItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    currentSaleItems = [];
    const custEl = document.getElementById('saleCustomer'); if (custEl) custEl.value = '';
    if (typeof setRadioValue === 'function') {
        setRadioValue('salePaymentMethod', 'cash');
        setRadioValue('saleInvoiceType', 'simple');
    }
    renderCashier(); updateSaleTotals();
    if (typeof showToast === 'function') showToast('🗑️ تم الإلغاء', 'info');
};

// ═══════════════════════════════════════════════════════════
// 🛍️ نظام المشتريات
// ═══════════════════════════════════════════════════════════

window.populatePurSuppliers = function() {
    const sel = document.getElementById('purSupplier'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    if (typeof suppliers !== 'undefined') {
        suppliers.forEach(function(s) {
            sel.innerHTML += '<option value="' + s.id + '">' + s.name + '</option>';
        });
    }
    sel.value = cv;
    delete sel.dataset.srch;
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    setTimeout(_applyAllSearch, 50);
};

window.populatePurProducts = function() {
    const sel = document.getElementById('purProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    if (typeof products !== 'undefined') {
        products.forEach(function(p) {
            sel.innerHTML += '<option value="' + p.id + '">' + p.name + '</option>';
        });
    }
    sel.value = cv;
    delete sel.dataset.srch;
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    setTimeout(_applyAllSearch, 50);
};

window.updatePurPrice = function() {
    const id = document.getElementById('purProduct')?.value;
    if (!id) { const p = document.getElementById('purPrice'); if (p) p.value = ''; return; }
    const product = products.find(function(pr) { return pr.id == id; });
    if (product) {
        const el = document.getElementById('purPrice');
        if (el) el.value = product.buy;
    }
};

window.addPurItem = function() {
    if (typeof canAdd === 'function' && !canAdd()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    const id = document.getElementById('purProduct')?.value;
    const qty = parseInt(document.getElementById('purQty')?.value) || 0;
    const price = parseFloat(document.getElementById('purPrice')?.value) || 0;
    if (!id) { if (typeof showToast === 'function') showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { if (typeof showToast === 'function') showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { if (typeof showToast === 'function') showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(function(pr) { return pr.id == id; }); if (!p) return;
    const vatPercent = p.vat || vatSettings.defaultVAT;
    const subtotal = qty * price;
    const vatAmount = subtotal * (vatPercent / 100);
    const totalWithVAT = subtotal + vatAmount;
    const ex = currentPurItems.find(function(i) { return i.productId == id; });
    if (ex) {
        ex.qty += qty;
        ex.subtotal = ex.qty * ex.price;
        ex.vatAmount = ex.subtotal * (ex.vatPercent / 100);
        ex.total = ex.subtotal + ex.vatAmount;
    } else {
        currentPurItems.push({
            productId: p.id, name: p.name, qty: qty, price: price,
            vatPercent: vatPercent, subtotal: subtotal,
            vatAmount: vatAmount, total: totalWithVAT
        });
    }
    const qtyEl = document.getElementById('purQty'); if (qtyEl) qtyEl.value = 1;
    const priceEl = document.getElementById('purPrice'); if (priceEl) priceEl.value = '';
    const prodEl = document.getElementById('purProduct');
    if (prodEl) {
        prodEl.value = '';
        prodEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    renderPurItems();
    updatePurTotals();
    if (typeof showToast === 'function') showToast('✅ تم الإضافة', 'success');
};

window.removePurItem = function(i) {
    currentPurItems.splice(i, 1);
    renderPurItems();
    updatePurTotals();
};

window.renderPurItems = function() {
    const c = document.getElementById('purItemsContainer'); 
    const tb = document.getElementById('purTotalBox');
    if (!c) return;
    if (currentPurItems.length === 0) {
        c.innerHTML = '<div class="empty-items"><i class="fas fa-shopping-cart"></i><span>لا توجد أصناف</span><small>أضف صنف من الأعلى</small></div>';
        if (tb) tb.style.display = 'none';
        return;
    }
    let html = '<div class="items-header-row"><span>ID</span><span>اسم الصنف</span><span>الوحدة</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>';
    currentPurItems.forEach(function(it, i) {
        const prod = products.find(function(p) { return p.id == it.productId; });
        const unit = prod?.unit || 'قطعة';
        const itemId = String(it.productId).slice(-4);
        html += '<div class="item-row">' +
            '<span class="item-id">#' + itemId + '</span>' +
            '<span class="item-name">' + it.name + '</span>' +
            '<span class="item-unit">' + unit + '</span>' +
            '<span class="item-qty">' + it.qty + '</span>' +
            '<span class="item-price">' + formatMoney(it.price) + '</span>' +
            '<span class="item-total" style="color:#E06060;">' + formatMoney(it.total) + '</span>' +
            '<button class="item-delete" onclick="removePurItem(' + i + ')"><i class="fas fa-times"></i></button>' +
            '</div>';
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
};

window.updatePurTotals = function() {
    const subtotal = currentPurItems.reduce(function(s, i) { return s + (i.subtotal || i.total); }, 0);
    const vatTotal = currentPurItems.reduce(function(s, i) { return s + (i.vatAmount || 0); }, 0);
    const totalQty = currentPurItems.reduce(function(s, i) { return s + i.qty; }, 0);
    const invoiceType = typeof getRadioValue === 'function' ? getRadioValue('purInvoiceType', 'simple') : 'simple';
    const isTaxInvoice = invoiceType === 'tax';
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const grandTotal = subtotal + finalVAT;
    const e1 = document.getElementById('purStatItemsCount'); if (e1) e1.textContent = currentPurItems.length;
    const e2 = document.getElementById('purStatTotalQty'); if (e2) e2.textContent = totalQty;
    const e3 = document.getElementById('purSubtotal'); if (e3) e3.textContent = formatMoney(subtotal);
    const e4 = document.getElementById('purVAT'); if (e4) e4.textContent = isTaxInvoice ? formatMoney(finalVAT) : '0.00';
    const e5 = document.getElementById('purTotal'); if (e5) e5.textContent = formatMoney(grandTotal) + ' ج.م';
};

window.savePurchase = function() {
    if (typeof canAdd === 'function' && !canAdd()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (currentPurItems.length === 0) {
        if (typeof showToast === 'function') showToast('⚠️ لا توجد أصناف', 'error');
        return;
    }
    const sid = document.getElementById('purSupplier')?.value;
    if (!sid) { if (typeof showToast === 'function') showToast('⚠️ اختر مورد', 'error'); return; }
    const supplier = suppliers.find(function(s) { return s.id == sid; }); if (!supplier) return;
    const whId = document.getElementById('purWarehouse')?.value;
    const cashBoxId = typeof getPurCashBox === 'function' ? getPurCashBox() : null;
    const paymentEl = document.getElementById('purPayment');
    const payment = paymentEl ? paymentEl.value : 'cash';
    const invoiceType = typeof getRadioValue === 'function' ? getRadioValue('purInvoiceType', 'simple') : 'simple';
    const isTaxInvoice = invoiceType === 'tax';
    const subtotal = currentPurItems.reduce(function(s, i) { return s + (i.subtotal || i.total); }, 0);
    const vatTotal = currentPurItems.reduce(function(s, i) { return s + (i.vatAmount || 0); }, 0);
    const finalVAT = isTaxInvoice ? vatTotal : 0;
    const total = subtotal + finalVAT;
    const today = getTodayDate();
    
    const itemChanges = [];
    currentPurItems.forEach(function(it) {
        const p = products.find(function(pr) { return pr.id == it.productId; });
        if (p) {
            const before = p.qty;
            p.qty += it.qty;
            p.buy = it.price;
            if (whId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, whId);
                setProductStockInWarehouse(it.productId, whId, whBefore + it.qty);
            }
            itemChanges.push({ item: it, before: before, after: p.qty });
        }
    });
    
    const inv = {
        id: Date.now(), number: purchases.length + 1,
        supplierId: supplier.id, supplierName: supplier.name,
        warehouseId: whId,
        cashBoxId: cashBoxId,
        invoiceType: isTaxInvoice ? 'tax' : 'simple',
        subtotal: subtotal, vatTotal: finalVAT,
        items: JSON.parse(JSON.stringify(currentPurItems)),
        total: total,
        paidAmount: payment === 'cash' ? total : 0,
        remainingAmount: payment === 'cash' ? 0 : total,
        payment: payment, status: payment === 'cash' ? 'paid' : 'unpaid',
        relatedPayments: [], relatedReturns: [], journalEntryId: null,
        date: today, time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    purchases.push(inv);
    
    itemChanges.forEach(function(ch) {
        if (typeof logInventoryMovement === 'function') {
            logInventoryMovement({
                productId: ch.item.productId, productName: ch.item.name,
                type: 'in', qty: ch.item.qty, price: ch.item.price,
                reason: 'purchase', refType: 'purchase', refId: inv.id, refNumber: inv.number,
                warehouseId: whId,
                balanceBefore: ch.before, balanceAfter: ch.after
            });
        }
    });
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('النقدية بالخزنة') : null;
        const apAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('الموردين') : null;
        const invAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('المخزون') : null;
        const vatAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('ضريبة القيمة المضافة (مدين)') : null;
        if (invAcc) lines.push({ accountId: invAcc.id, accountName: invAcc.name, debit: subtotal, credit: 0 });
        if (finalVAT > 0 && vatAcc) lines.push({ accountId: vatAcc.id, accountName: vatAcc.name, debit: finalVAT, credit: 0 });
        if (payment === 'cash' && cashAcc) {
            lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: 0, credit: total });
        } else if (apAcc) {
            lines.push({ accountId: apAcc.id, accountName: apAcc.name, debit: 0, credit: total });
        }
        if (lines.length >= 2 && typeof createJournalEntry === 'function') {
            journalEntry = createJournalEntry('فاتورة شراء #' + inv.number + ' - ' + supplier.name, 'PUR-' + inv.number, today, lines, 'purchase', inv.id);
            if (journalEntry) inv.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    if (payment === 'cash') {
        const cashBoxName = document.getElementById('purCashBox')?.selectedOptions[0]?.text || 'نقدي';
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: total,
            note: 'فاتورة شراء #' + inv.number + ' - ' + supplier.name,
            partyName: supplier.name, invoiceNumber: inv.number,
            cashBoxId: cashBoxId,
            cashBoxName: cashBoxName,
            refType: 'purchase', refId: inv.id, journalEntryId: inv.journalEntryId,
            date: today, time: getNowTime()
        });
    }
    
    if (typeof setData === 'function') {
        setData('products', products);
        setData('purchases', purchases);
        setData('treasury', treasury);
    }
    if (typeof addAuditLog === 'function') {
        addAuditLog('add', 'purchase', 'فاتورة شراء #' + inv.number + ' - ' + supplier.name + ' - ' + formatMoney(total) + ' ج.م');
    }
    
    currentPurItems = [];
    const supEl = document.getElementById('purSupplier'); if (supEl) supEl.value = '';
    if (typeof setRadioValue === 'function') setRadioValue('purInvoiceType', 'simple');
    renderPurItems();
    updatePurTotals();
    renderPurchases();
    populatePurProducts();
    if (typeof populatePurWarehouse === 'function') populatePurWarehouse();
    if (typeof populateCashBoxDropdowns === 'function') populateCashBoxDropdowns();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof showToast === 'function') showToast('✅ فاتورة شراء #' + inv.number + ' بمبلغ ' + formatMoney(total) + ' 🇪🇬', 'success');
};

window.clearPurchase = function() {
    if (currentPurItems.length === 0) return;
    if (!confirm('⚠️ إلغاء الفاتورة؟')) return;
    currentPurItems = [];
    const supEl = document.getElementById('purSupplier'); if (supEl) supEl.value = '';
    if (typeof setRadioValue === 'function') setRadioValue('purInvoiceType', 'simple');
    renderPurItems(); updatePurTotals();
    if (typeof showToast === 'function') showToast('🗑️ تم الإلغاء', 'info');
};

window.renderPurchases = function() {
    const tc = purchases.length;
    const ta = purchases.reduce(function(s, i) { return s + (i.total || 0); }, 0);
    const pa = purchases.filter(function(i) { return i.status === 'unpaid' || i.status === 'partial'; })
                        .reduce(function(s, i) { return s + (i.remainingAmount || i.total || 0); }, 0);
    const today = getTodayDate();
    const tda = purchases.filter(function(i) { return i.date === today; }).reduce(function(s, i) { return s + (i.total || 0); }, 0);
    const e1 = document.getElementById('purTotalCount'); if (e1) e1.textContent = tc;
    const e2 = document.getElementById('purTotalAmount'); if (e2) e2.textContent = formatMoney(ta);
    const e3 = document.getElementById('purPendingAmount'); if (e3) e3.textContent = formatMoney(pa);
    const e4 = document.getElementById('purTodayAmount'); if (e4) e4.textContent = formatMoney(tda);
    const c = document.getElementById('purchasesList'); if (!c) return;
    if (purchases.length === 0) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-shopping-cart"></i><span>لا توجد فواتير شراء</span></div>';
        return;
    }
    const sorted = [...purchases].sort(function(a, b) { return b.id - a.id; }).slice(0, 30);
    let html = '<div class="table-header" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.6fr 0.8fr 1.2fr;"><span>#</span><span>المورد</span><span>المبلغ</span><span>النوع</span><span>الدفع</span><span></span></div>';
    sorted.forEach(function(inv) {
        const sc = inv.status === 'paid' ? '#2D8F5E' : '#E6A830';
        const st = inv.status === 'paid' ? '✅ نقدي' : (inv.status === 'partial' ? '⚠️ جزئي' : '⏳ آجل');
        const isTax = inv.invoiceType === 'tax';
        html += '<div class="table-row" style="grid-template-columns: 0.5fr 1.3fr 1fr 0.6fr 0.8fr 1.2fr;">' +
            '<span>#' + inv.number + '</span><span>' + inv.supplierName + '</span>' +
            '<span style="color:#E06060;font-weight:700;">' + formatMoney(inv.total) + '</span>' +
            '<span style="color:' + (isTax ? '#9B59B6' : '#5D5D5D') + ';font-size:10px;font-weight:700;">' + (isTax ? '🧾' : '📋') + '</span>' +
            '<span style="color:' + sc + ';font-weight:700;font-size:10px;">' + st + '</span>' +
            '<div style="display:flex;gap:4px;">' +
            '<button class="btn btn-info btn-sm" onclick="viewPurchase(' + inv.id + ')"><i class="fas fa-eye"></i></button>' +
            (typeof canDelete === 'function' && canDelete() ? '<button class="btn btn-danger btn-sm" onclick="deletePurchase(' + inv.id + ')"><i class="fas fa-trash"></i></button>' : '') +
            '</div></div>';
    });
    c.innerHTML = html;
};

window.viewPurchase = function(id) {
    const inv = purchases.find(function(p) { return p.id === id; }); if (!inv) return;
    let itemsHtml = '';
    inv.items.forEach(function(it, i) {
        itemsHtml += '<tr><td>' + (i + 1) + '</td><td>' + it.name + '</td><td>' + it.qty + '</td><td>' + formatMoney(it.price) + '</td><td>' + formatMoney(it.total) + '</td></tr>';
    });
    const logoHtml = companyData.logo ? '<img src="' + companyData.logo + '" class="inv-logo" alt="logo">' : '';
    const isTax = inv.invoiceType === 'tax';
    const taxBadge = isTax ? '<span class="tax-badge">🧾 فاتورة ضريبية</span>' : '';
    const subtotal = inv.subtotal !== undefined ? inv.subtotal : inv.total;
    const vatTotal = inv.vatTotal || 0;
    
    const html = '<button class="modal-close" onclick="closeModal()">&times;</button>' +
        '<h3>🛒 فاتورة شراء #' + inv.number + '</h3>' +
        '<div class="invoice-print ' + (isTax ? 'tax-invoice' : '') + '">' +
        '<div class="inv-header">' + taxBadge + logoHtml +
        '<h2>' + (companyData.name || 'الميزان') + '</h2>' +
        '<p>فاتورة شراء</p>' +
        (companyData.phone ? '<p>📞 ' + companyData.phone + '</p>' : '') +
        '</div>' +
        '<div class="inv-info">' +
        '<div><span class="lbl">رقم:</span> #' + inv.number + '</div>' +
        '<div><span class="lbl">التاريخ:</span> ' + inv.date + '</div>' +
        '<div><span class="lbl">المورد:</span> ' + inv.supplierName + '</div>' +
        '<div><span class="lbl">الدفع:</span> ' + (inv.status === 'paid' ? '✅ نقدي' : '⏳ آجل') + '</div>' +
        '</div>' +
        '<table><thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead><tbody>' + itemsHtml + '</tbody></table>' +
        '<div class="inv-totals">' +
        '<div class="inv-total-row"><span>المجموع:</span><span>' + formatMoney(subtotal) + ' ج.م</span></div>' +
        (isTax ? '<div class="inv-total-row"><span>الضريبة:</span><span style="color:#9B59B6;">' + formatMoney(vatTotal) + ' ج.م</span></div>' : '') +
        '<div class="inv-total-row grand"><span>الإجمالي:</span><span>' + formatMoney(inv.total) + ' 🇪🇬</span></div>' +
        '</div>' +
        '<div class="inv-footer">' + (companyData.footer || 'شكراً لتعاملكم معنا 🌟') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;margin-top:12px;">' +
        '<button class="btn btn-primary btn-block" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>' +
        '<button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>' +
        '</div>';
    if (typeof openModal === 'function') openModal(html);
};

window.deletePurchase = function(id) {
    if (typeof canDelete === 'function' && !canDelete()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    const inv = purchases.find(function(p) { return p.id === id; }); if (!inv) return;
    if (!confirm('⚠️ حذف فاتورة الشراء #' + inv.number + '؟')) return;
    inv.items.forEach(function(it) {
        const p = products.find(function(pr) { return pr.id == it.productId; });
        if (p) {
            const before = p.qty;
            p.qty -= it.qty;
            if (inv.warehouseId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, inv.warehouseId);
                setProductStockInWarehouse(it.productId, inv.warehouseId, Math.max(0, whBefore - it.qty));
            }
        }
    });
    treasury = treasury.filter(function(t) { return !((t.refType === 'purchase' || t.refType === 'purchase_credit') && t.refId === id); });
    purchases = purchases.filter(function(p) { return p.id !== id; });
    if (typeof setData === 'function') {
        setData('products', products);
        setData('purchases', purchases);
        setData('treasury', treasury);
    }
    if (typeof addAuditLog === 'function') addAuditLog('delete', 'purchase', 'حذف فاتورة شراء #' + inv.number);
    renderPurchases();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof showToast === 'function') showToast('🗑️ تم الحذف', 'info');
};

// ═══════════════════════════════════════════════════════════
// 🔄 نظام المرتجعات
// ═══════════════════════════════════════════════════════════

window.toggleReturnCustomer = function() {
    const typeEl = document.getElementById('retType');
    if (!typeEl) return;
    const type = typeEl.value;
    const lbl = document.getElementById('retPartyLabel');
    if (lbl) lbl.textContent = type === 'sale' ? 'العميل' : 'المورد';
    if (type === 'sale') populateRetCustomers();
    else populateRetSuppliers();
    const invSel = document.getElementById('retOriginalInvoice');
    if (invSel) invSel.innerHTML = '<option value="">بدون ربط بفاتورة</option>';
};

window.populateRetCustomers = function() {
    const sel = document.getElementById('retParty'); if (!sel) return;
    sel.innerHTML = '<option value="">اختر عميل...</option>';
    if (typeof customers !== 'undefined') {
        customers.forEach(function(c) {
            sel.innerHTML += '<option value="' + c.name + '">' + c.name + '</option>';
        });
    }
    delete sel.dataset.srch;
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    setTimeout(_applyAllSearch, 50);
};

window.populateRetSuppliers = function() {
    const sel = document.getElementById('retParty'); if (!sel) return;
    sel.innerHTML = '<option value="">اختر مورد...</option>';
    if (typeof suppliers !== 'undefined') {
        suppliers.forEach(function(s) {
            sel.innerHTML += '<option value="' + s.name + '">' + s.name + '</option>';
        });
    }
    delete sel.dataset.srch;
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    setTimeout(_applyAllSearch, 50);
};

window.populateRetProducts = function() {
    const sel = document.getElementById('retProduct'); if (!sel) return;
    const cv = sel.value;
    sel.innerHTML = '<option value="">اختر منتج...</option>';
    if (typeof products !== 'undefined') {
        products.forEach(function(p) {
            sel.innerHTML += '<option value="' + p.id + '">' + p.name + '</option>';
        });
    }
    sel.value = cv;
    delete sel.dataset.srch;
    const wrap = sel.closest('.srch-wrap');
    if (wrap) {
        wrap.parentNode.insertBefore(sel, wrap);
        sel.style.display = '';
        wrap.remove();
    }
    setTimeout(_applyAllSearch, 50);
};

window.loadReturnInvoices = function() {
    const typeEl = document.getElementById('retType');
    const partyEl = document.getElementById('retParty');
    const invSel = document.getElementById('retOriginalInvoice');
    if (!typeEl || !partyEl || !invSel) return;
    const type = typeEl.value;
    const party = partyEl.value;
    invSel.innerHTML = '<option value="">بدون ربط بفاتورة</option>';
    if (!party) return;
    if (type === 'sale') {
        const customerInvoices = sales.filter(function(s) { return s.customer === party; }).sort(function(a, b) { return b.id - a.id; });
        customerInvoices.forEach(function(inv) {
            invSel.innerHTML += '<option value="' + inv.id + '">#' + inv.number + ' - ' + inv.date + ' - ' + formatMoney(inv.total) + ' ج.م</option>';
        });
    } else {
        const supplierInvoices = purchases.filter(function(p) { return p.supplierName === party; }).sort(function(a, b) { return b.id - a.id; });
        supplierInvoices.forEach(function(inv) {
            invSel.innerHTML += '<option value="' + inv.id + '">#' + inv.number + ' - ' + inv.date + ' - ' + formatMoney(inv.total) + ' ج.م</option>';
        });
    }
};

window.updateRetPrice = function() {
    const id = document.getElementById('retProduct')?.value;
    const typeEl = document.getElementById('retType');
    const type = typeEl ? typeEl.value : 'sale';
    if (!id) { const p = document.getElementById('retPrice'); if (p) p.value = ''; return; }
    const product = products.find(function(pr) { return pr.id == id; });
    if (product) {
        const el = document.getElementById('retPrice');
        if (el) el.value = type === 'sale' ? product.sell : product.buy;
    }
};

window.addRetItem = function() {
    if (typeof canAdd === 'function' && !canAdd()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    const id = document.getElementById('retProduct')?.value;
    const qty = parseInt(document.getElementById('retQty')?.value) || 0;
    const price = parseFloat(document.getElementById('retPrice')?.value) || 0;
    if (!id) { if (typeof showToast === 'function') showToast('⚠️ اختر منتج', 'error'); return; }
    if (qty <= 0) { if (typeof showToast === 'function') showToast('⚠️ أدخل كمية صحيحة', 'error'); return; }
    if (price <= 0) { if (typeof showToast === 'function') showToast('⚠️ أدخل سعر صحيح', 'error'); return; }
    const p = products.find(function(pr) { return pr.id == id; }); if (!p) return;
    const typeEl = document.getElementById('retType');
    const type = typeEl ? typeEl.value : 'sale';
    if (type === 'purchase' && qty > p.qty) {
        if (typeof showToast === 'function') showToast('⚠️ الكمية المتاحة: ' + p.qty, 'error');
        return;
    }
    const ex = currentRetItems.find(function(i) { return i.productId == id; });
    if (ex) { ex.qty += qty; ex.total = ex.qty * ex.price; }
    else currentRetItems.push({
        productId: p.id, name: p.name, qty: qty, price: price,
        costPrice: p.buy, total: qty * price
    });
    const qtyEl = document.getElementById('retQty'); if (qtyEl) qtyEl.value = 1;
    const priceEl = document.getElementById('retPrice'); if (priceEl) priceEl.value = '';
    const prodEl = document.getElementById('retProduct');
    if (prodEl) {
        prodEl.value = '';
        prodEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    renderRetItems();
    if (typeof showToast === 'function') showToast('✅ تم الإضافة', 'success');
};

window.removeRetItem = function(i) {
    currentRetItems.splice(i, 1);
    renderRetItems();
};

window.renderRetItems = function() {
    const c = document.getElementById('retItemsContainer'); 
    const tb = document.getElementById('retTotalBox'); 
    const te = document.getElementById('retTotal');
    if (!c) return;
    if (currentRetItems.length === 0) {
        c.innerHTML = '<div class="empty-items"><i class="fas fa-undo-alt"></i><span>لا توجد أصناف</span><small>أضف صنف من الأعلى</small></div>';
        if (tb) tb.style.display = 'none';
        return;
    }
    const total = currentRetItems.reduce(function(s, i) { return s + i.total; }, 0);
    let html = '<div class="items-header-row"><span>ID</span><span>اسم الصنف</span><span>الوحدة</span><span>الكمية</span><span>السعر</span><span>الإجمالي</span><span></span></div>';
    currentRetItems.forEach(function(it, i) {
        const prod = products.find(function(p) { return p.id == it.productId; });
        const unit = prod?.unit || 'قطعة';
        const itemId = String(it.productId).slice(-4);
        html += '<div class="item-row">' +
            '<span class="item-id">#' + itemId + '</span>' +
            '<span class="item-name">' + it.name + '</span>' +
            '<span class="item-unit">' + unit + '</span>' +
            '<span class="item-qty">' + it.qty + '</span>' +
            '<span class="item-price">' + formatMoney(it.price) + '</span>' +
            '<span class="item-total" style="color:#E6A830;">' + formatMoney(it.total) + '</span>' +
            '<button class="item-delete" onclick="removeRetItem(' + i + ')"><i class="fas fa-times"></i></button>' +
            '</div>';
    });
    c.innerHTML = html;
    if (tb) tb.style.display = 'block';
    if (te) te.textContent = formatMoney(total) + ' ج.م';
};

window.saveReturn = function() {
    if (typeof canAdd === 'function' && !canAdd()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    if (currentRetItems.length === 0) {
        if (typeof showToast === 'function') showToast('⚠️ لا توجد أصناف', 'error');
        return;
    }
    const typeEl = document.getElementById('retType');
    const type = typeEl ? typeEl.value : 'sale';
    const party = document.getElementById('retParty')?.value;
    if (!party) { if (typeof showToast === 'function') showToast('⚠️ اختر العميل/المورد', 'error'); return; }
    const whId = document.getElementById('retWarehouse')?.value;
    const cashBoxId = typeof getRetCashBox === 'function' ? getRetCashBox() : null;
    const originalInvoiceId = document.getElementById('retOriginalInvoice')?.value || null;
    const originalInvoice = originalInvoiceId
        ? (type === 'sale' ? sales.find(function(s) { return s.id == originalInvoiceId; }) : purchases.find(function(p) { return p.id == originalInvoiceId; }))
        : null;
    const total = currentRetItems.reduce(function(s, i) { return s + i.total; }, 0);
    const today = getTodayDate();
    
    const itemChanges = [];
    currentRetItems.forEach(function(it) {
        const p = products.find(function(pr) { return pr.id == it.productId; });
        if (p) {
            const before = p.qty;
            if (type === 'sale') p.qty += it.qty;
            else p.qty -= it.qty;
            if (whId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, whId);
                if (type === 'sale') setProductStockInWarehouse(it.productId, whId, whBefore + it.qty);
                else setProductStockInWarehouse(it.productId, whId, Math.max(0, whBefore - it.qty));
            }
            itemChanges.push({ item: it, before: before, after: p.qty });
        }
    });
    
    const ret = {
        id: Date.now(), number: returns.length + 1, type: type, party: party,
        partyId: (type === 'sale' ? customers.find(function(c) { return c.name === party; })?.id : suppliers.find(function(s) { return s.name === party; })?.id) || null,
        warehouseId: whId,
        cashBoxId: cashBoxId,
        originalInvoiceId: originalInvoiceId,
        originalInvoiceNumber: originalInvoice?.number || null,
        paymentMethod: 'cash',
        items: JSON.parse(JSON.stringify(currentRetItems)),
        total: total, journalEntryId: null,
        date: today, time: getNowTime(),
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    returns.push(ret);
    
    itemChanges.forEach(function(ch) {
        if (typeof logInventoryMovement === 'function') {
            logInventoryMovement({
                productId: ch.item.productId, productName: ch.item.name,
                type: type === 'sale' ? 'in' : 'out', qty: ch.item.qty, price: ch.item.price,
                reason: type === 'sale' ? 'return_sale' : 'return_purchase',
                refType: 'return', refId: ret.id, refNumber: ret.number,
                warehouseId: whId,
                balanceBefore: ch.before, balanceAfter: ch.after
            });
        }
    });
    
    if (originalInvoice) {
        if (!originalInvoice.relatedReturns) originalInvoice.relatedReturns = [];
        originalInvoice.relatedReturns.push(ret.id);
        if (typeof setData === 'function') {
            setData('sales', sales);
            setData('purchases', purchases);
        }
    }
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('النقدية بالخزنة') : null;
        const salesAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('إيرادات المبيعات') : null;
        const invAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('المخزون') : null;
        if (type === 'sale') {
            if (salesAcc) lines.push({ accountId: salesAcc.id, accountName: salesAcc.name, debit: total, credit: 0 });
            if (cashAcc) lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: 0, credit: total });
        } else {
            if (cashAcc) lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: total, credit: 0 });
            if (invAcc) lines.push({ accountId: invAcc.id, accountName: invAcc.name, debit: 0, credit: total });
        }
        if (lines.length >= 2 && typeof createJournalEntry === 'function') {
            journalEntry = createJournalEntry('مرتجع ' + (type === 'sale' ? 'بيع' : 'شراء') + ' #' + ret.number + ' - ' + party, 'RET-' + ret.number, today, lines, 'return', ret.id);
            if (journalEntry) ret.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    const cashBoxName = document.getElementById('retCashBox')?.selectedOptions[0]?.text || 'نقدي';
    if (type === 'sale') {
        treasury.push({
            id: Date.now() + 1, type: 'withdraw', amount: total,
            note: 'مرتجع بيع #' + ret.number + ' - ' + party,
            partyName: party, invoiceNumber: originalInvoice?.number || null,
            cashBoxId: cashBoxId,
            cashBoxName: cashBoxName,
            refType: 'return', refId: ret.id, journalEntryId: ret.journalEntryId,
            date: today, time: getNowTime()
        });
    } else {
        treasury.push({
            id: Date.now() + 1, type: 'deposit', amount: total,
            note: 'مرتجع شراء #' + ret.number + ' - ' + party,
            partyName: party, invoiceNumber: originalInvoice?.number || null,
            cashBoxId: cashBoxId,
            cashBoxName: cashBoxName,
            refType: 'return', refId: ret.id, journalEntryId: ret.journalEntryId,
            date: today, time: getNowTime()
        });
    }
    
    if (typeof setData === 'function') {
        setData('products', products);
        setData('returns', returns);
        setData('treasury', treasury);
    }
    if (typeof addAuditLog === 'function') {
        addAuditLog('add', 'return', 'مرتجع ' + (type === 'sale' ? 'بيع' : 'شراء') + ' #' + ret.number + ' - ' + party + ' - ' + formatMoney(total) + ' ج.م');
    }
    
    currentRetItems = [];
    const partyEl = document.getElementById('retParty'); if (partyEl) partyEl.value = '';
    const invEl = document.getElementById('retOriginalInvoice'); if (invEl) invEl.innerHTML = '<option value="">بدون ربط بفاتورة</option>';
    renderRetItems();
    renderReturns();
    populateRetProducts();
    if (typeof populateRetWarehouse === 'function') populateRetWarehouse();
    if (typeof populateCashBoxDropdowns === 'function') populateCashBoxDropdowns();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof showToast === 'function') showToast('✅ مرتجع #' + ret.number + ' بمبلغ ' + formatMoney(total) + ' 🇪🇬', 'success');
};

window.clearReturn = function() {
    if (currentRetItems.length === 0) return;
    if (!confirm('⚠️ إلغاء المرتجع؟')) return;
    currentRetItems = [];
    const partyEl = document.getElementById('retParty'); if (partyEl) partyEl.value = '';
    renderRetItems();
    if (typeof showToast === 'function') showToast('🗑️ تم الإلغاء', 'info');
};

window.renderReturns = function() {
    const tc = returns.length;
    const ta = returns.reduce(function(s, i) { return s + (i.total || 0); }, 0);
    const e1 = document.getElementById('retTotalCount'); if (e1) e1.textContent = tc;
    const e2 = document.getElementById('retTotalAmount'); if (e2) e2.textContent = formatMoney(ta);
    const c = document.getElementById('returnsList'); if (!c) return;
    if (returns.length === 0) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-undo-alt"></i><span>لا توجد مرتجعات</span></div>';
        return;
    }
    const sorted = [...returns].sort(function(a, b) { return b.id - a.id; }).slice(0, 30);
    let html = '<div class="table-header" style="grid-template-columns: 0.5fr 1fr 1.2fr 1fr 1fr 0.8fr;"><span>#</span><span>النوع</span><span>العميل/المورد</span><span>المبلغ</span><span>الفاتورة</span><span></span></div>';
    sorted.forEach(function(r) {
        const tt = r.type === 'sale' ? '🔄 بيع' : '🔄 شراء';
        const tc2 = r.type === 'sale' ? '#E6A830' : '#E06060';
        html += '<div class="table-row" style="grid-template-columns: 0.5fr 1fr 1.2fr 1fr 1fr 0.8fr;">' +
            '<span>#' + r.number + '</span>' +
            '<span style="color:' + tc2 + ';font-weight:700;font-size:10px;">' + tt + '</span>' +
            '<span>' + r.party + '</span>' +
            '<span style="color:#E6A830;font-weight:700;">' + formatMoney(r.total) + '</span>' +
            '<span style="font-size:10px;color:#A89070;">' + (r.originalInvoiceNumber ? '#' + r.originalInvoiceNumber : '—') + '</span>' +
            (typeof canDelete === 'function' && canDelete() ? '<button class="btn btn-danger btn-sm" onclick="deleteReturn(' + r.id + ')"><i class="fas fa-trash"></i></button>' : '<span></span>') +
            '</div>';
    });
    c.innerHTML = html;
};

window.deleteReturn = function(id) {
    if (typeof canDelete === 'function' && !canDelete()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    const r = returns.find(function(x) { return x.id === id; }); if (!r) return;
    if (!confirm('⚠️ حذف المرتجع #' + r.number + '؟')) return;
    r.items.forEach(function(it) {
        const p = products.find(function(pr) { return pr.id == it.productId; });
        if (p) {
            if (r.type === 'sale') p.qty -= it.qty;
            else p.qty += it.qty;
            if (r.warehouseId && typeof getProductStockInWarehouse === 'function' && typeof setProductStockInWarehouse === 'function') {
                const whBefore = getProductStockInWarehouse(it.productId, r.warehouseId);
                if (r.type === 'sale') setProductStockInWarehouse(it.productId, r.warehouseId, Math.max(0, whBefore - it.qty));
                else setProductStockInWarehouse(it.productId, r.warehouseId, whBefore + it.qty);
            }
        }
    });
    treasury = treasury.filter(function(t) { return !(t.refType === 'return' && t.refId === id); });
    returns = returns.filter(function(x) { return x.id !== id; });
    if (typeof setData === 'function') {
        setData('products', products);
        setData('returns', returns);
        setData('treasury', treasury);
    }
    if (typeof addAuditLog === 'function') addAuditLog('delete', 'return', 'حذف مرتجع #' + r.number);
    renderReturns();
    if (typeof renderProducts === 'function') renderProducts();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof showToast === 'function') showToast('🗑️ تم الحذف', 'info');
};

// ═══════════════════════════════════════════════════════════
// 💸 نظام المصروفات
// ═══════════════════════════════════════════════════════════

window.saveExpense = function() {
    if (typeof canAdd === 'function' && !canAdd()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    const note = document.getElementById('expNote')?.value.trim();
    const amount = parseFloat(document.getElementById('expAmount')?.value) || 0;
    const category = document.getElementById('expCategory')?.value;
    const date = document.getElementById('expDate')?.value || getTodayDate();
    const cashBoxId = typeof getExpenseCashBox === 'function' ? getExpenseCashBox() : null;
    
    if (!note) { if (typeof showToast === 'function') showToast('⚠️ أدخل البيان', 'error'); return; }
    if (amount <= 0) { if (typeof showToast === 'function') showToast('⚠️ أدخل مبلغ صحيح', 'error'); return; }
    if (typeof getTreasuryBalance === 'function' && getTreasuryBalance() < amount) {
        if (typeof showToast === 'function') showToast('⚠️ رصيد الخزنة غير كافي', 'error');
        return;
    }
    
    const exp = {
        id: Date.now(), note: note, amount: amount, category: category, date: date,
        cashBoxId: cashBoxId,
        time: getNowTime(), journalEntryId: null,
        createdAt: new Date().toISOString(),
        createdBy: currentUser ? currentUser.name : 'unknown'
    };
    expenses.push(exp);
    
    let journalEntry = null;
    try {
        const lines = [];
        const cashAcc = typeof getAccountByNameContains === 'function' ? getAccountByNameContains('النقدية بالخزنة') : null;
        let expenseAcc = null;
        if (typeof getAccountByNameContains === 'function') {
            if (category === 'مرتبات') expenseAcc = getAccountByNameContains('رواتب');
            else if (category === 'إيجار') expenseAcc = getAccountByNameContains('إيجار');
            else if (category === 'كهرباء' || category === 'مياه') expenseAcc = getAccountByNameContains('كهرباء');
            else if (category === 'صيانة') expenseAcc = getAccountByNameContains('صيانة');
            else expenseAcc = getAccountByNameContains('مصروفات متنوعة');
        }
        if (expenseAcc) lines.push({ accountId: expenseAcc.id, accountName: expenseAcc.name, debit: amount, credit: 0 });
        if (cashAcc) lines.push({ accountId: cashAcc.id, accountName: cashAcc.name, debit: 0, credit: amount });
        if (lines.length >= 2 && typeof createJournalEntry === 'function') {
            journalEntry = createJournalEntry('مصروف (' + category + ') - ' + note, 'EXP-' + exp.id, date, lines, 'expense', exp.id);
            if (journalEntry) exp.journalEntryId = journalEntry.id;
        }
    } catch (e) { console.warn('⚠️ فشل القيد:', e); }
    
    const cashBoxName = document.getElementById('expenseCashBox')?.selectedOptions[0]?.text || 'نقدي';
    treasury.push({
        id: Date.now() + 1, type: 'withdraw', amount: amount,
        note: 'مصروف (' + category + ') - ' + note,
        partyName: null, invoiceNumber: null,
        cashBoxId: cashBoxId,
        cashBoxName: cashBoxName,
        refType: 'expense', refId: exp.id, journalEntryId: exp.journalEntryId,
        date: date, time: getNowTime()
    });
    if (typeof setData === 'function') {
        setData('expenses', expenses);
        setData('treasury', treasury);
    }
    if (typeof addAuditLog === 'function') {
        addAuditLog('add', 'expense', 'مصروف: ' + note + ' - ' + formatMoney(amount) + ' ج.م');
    }
    const noteEl = document.getElementById('expNote'); if (noteEl) noteEl.value = '';
    const amtEl = document.getElementById('expAmount'); if (amtEl) amtEl.value = '';
    renderExpenses();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof showToast === 'function') showToast('✅ تم الإضافة ' + formatMoney(amount) + ' 🇪🇬', 'success');
};

window.renderExpenses = function() {
    const tc = expenses.length;
    const ta = expenses.reduce(function(s, e) { return s + (e.amount || 0); }, 0);
    const today = getTodayDate();
    const tda = expenses.filter(function(e) { return e.date === today; }).reduce(function(s, e) { return s + (e.amount || 0); }, 0);
    const month = today.substring(0, 7);
    const ma = expenses.filter(function(e) { return (e.date || '').startsWith(month); }).reduce(function(s, e) { return s + (e.amount || 0); }, 0);
    const e1 = document.getElementById('expTotalCount'); if (e1) e1.textContent = tc;
    const e2 = document.getElementById('expTotalAmount'); if (e2) e2.textContent = formatMoney(ta);
    const e3 = document.getElementById('expTodayAmount'); if (e3) e3.textContent = formatMoney(tda);
    const e4 = document.getElementById('expMonthAmount'); if (e4) e4.textContent = formatMoney(ma);
    const c = document.getElementById('expensesList'); if (!c) return;
    if (expenses.length === 0) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-money-bill-wave"></i><span>لا توجد مصروفات</span></div>';
        return;
    }
    const sorted = [...expenses].sort(function(a, b) { return b.id - a.id; }).slice(0, 30);
    let html = '<div class="table-header" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 0.6fr;"><span>البيان</span><span>المبلغ</span><span>التصنيف</span><span>التاريخ</span><span></span></div>';
    sorted.forEach(function(e) {
        html += '<div class="table-row" style="grid-template-columns: 1.5fr 1fr 1fr 1fr 0.6fr;">' +
            '<span>' + e.note + '</span>' +
            '<span style="color:#E06060;font-weight:700;">' + formatMoney(e.amount) + '</span>' +
            '<span style="font-size:11px;color:#A89070;">' + (e.category || 'عام') + '</span>' +
            '<span style="font-size:10px;color:#A89070;">' + e.date + '</span>' +
            (typeof canDelete === 'function' && canDelete() ? '<button class="btn btn-danger btn-sm" onclick="deleteExpense(' + e.id + ')"><i class="fas fa-trash"></i></button>' : '<span></span>') +
            '</div>';
    });
    c.innerHTML = html;
};

window.deleteExpense = function(id) {
    if (typeof canDelete === 'function' && !canDelete()) {
        if (typeof showToast === 'function') showToast('⚠️ ليس لديك صلاحية', 'error');
        return;
    }
    const e = expenses.find(function(x) { return x.id === id; }); if (!e) return;
    if (!confirm('⚠️ حذف هذا المصروف؟')) return;
    treasury = treasury.filter(function(t) { return !(t.refType === 'expense' && t.refId === id); });
    expenses = expenses.filter(function(x) { return x.id !== id; });
    if (typeof setData === 'function') {
        setData('expenses', expenses);
        setData('treasury', treasury);
    }
    if (typeof addAuditLog === 'function') addAuditLog('delete', 'expense', 'حذف مصروف: ' + e.note);
    renderExpenses();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof renderTreasury === 'function') renderTreasury();
    if (typeof showToast === 'function') showToast('🗑️ تم الحذف', 'info');
};

// ═══════════════════════════════════════════════════════════
// 🔄 التهيئة والتنقل
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        populateSaleWarehouse();
        populatePurWarehouse();
        populateRetWarehouse();
        const n = _applyAllSearch();
        console.log('🔍 تم تفعيل البحث على ' + n + ' قائمة');
    }, 2500);
    
    setTimeout(function() {
        populateSaleWarehouse();
        populatePurWarehouse();
        populateRetWarehouse();
        _applyAllSearch();
        if (typeof populateCashBoxDropdowns === 'function') populateCashBoxDropdowns();
        if (typeof updateInvoiceHeader === 'function') updateInvoiceHeader();
    }, 4500);
});

// تحديث الوقت
setInterval(function() {
    if (document.getElementById('invTimeDisplay') && typeof updateInvoiceHeader === 'function') {
        updateInvoiceHeader();
    }
}, 60000);

// ربط التنقل
(function() {
    let _navOriginal = window.navigateTo;
    window.navigateTo = function(page) {
        if (_navOriginal) _navOriginal.apply(this, arguments);
        setTimeout(function() {
            if (page === 'cashier') {
                populateSaleWarehouse();
                populateSaleProducts();
                populateSaleCustomers();
                if (typeof populateCashBoxDropdowns === 'function') populateCashBoxDropdowns();
                _applyAllSearch();
                if (typeof updateInvoiceHeader === 'function') updateInvoiceHeader();
            }
            if (page === 'purchases') {
                populatePurWarehouse();
                populatePurProducts();
                populatePurSuppliers();
                if (typeof populateCashBoxDropdowns === 'function') populateCashBoxDropdowns();
                _applyAllSearch();
            }
            if (page === 'returns') {
                populateRetWarehouse();
                populateRetProducts();
                if (typeof populateCashBoxDropdowns === 'function') populateCashBoxDropdowns();
                _applyAllSearch();
            }
            if (page === 'cash-boxes') {
                if (typeof renderCashBoxes === 'function') renderCashBoxes();
                if (typeof renderCashBoxTransfers === 'function') renderCashBoxTransfers();
            }
        }, 300);
    };
})();

// ═══════════════════════════════════════════════════════════
// 🏪 ربط المنتج بالمخزن
// ═══════════════════════════════════════════════════════════

// ✅ تعبئة قائمة المخازن في نموذج المنتج
window.populateProductWarehouse = function() {
    try {
        const sel = document.getElementById('productWarehouse');
        if (!sel) return;
        
        const cv = sel.value;
        let whs = [];
        
        if (typeof warehouses !== 'undefined' && Array.isArray(warehouses) && warehouses.length > 0) {
            whs = warehouses;
        } else {
            try {
                whs = JSON.parse(localStorage.getItem('mizan_warehouses') || '[]');
            } catch (e) { whs = []; }
        }
        
        if (whs.length === 0) {
            whs = [{
                id: 1,
                name: 'المخزن الرئيسي',
                isDefault: true,
                active: true
            }];
        }
        
        let html = '<option value="">توزيع على المخزن الرئيسي</option>';
        whs.forEach(function(w) {
            const isDef = w.isDefault ? ' ⭐' : '';
            html += '<option value="' + w.id + '">' + w.name + isDef + '</option>';
        });
        sel.innerHTML = html;
        sel.value = cv;
    } catch (e) {
        console.warn('⚠️ خطأ في populateProductWarehouse:', e.message);
    }
};

// ✅ تعديل دالة saveProduct لإضافة الكمية للمخزن
(function() {
    let _originalSaveProduct = window.saveProduct;
    
    window.saveProduct = function() {
        try {
            // استدعاء الدالة الأصلية
            if (_originalSaveProduct) {
                _originalSaveProduct.apply(this, arguments);
            }
            
            // ✅ بعد الحفظ، نضيف الكمية للمخزن
            setTimeout(function() {
                try {
                    const productName = document.getElementById('productName')?.value?.trim();
                    if (!productName) return;
                    
                    const product = products.find(function(p) {
                        return p.name === productName;
                    });
                    
                    if (!product) return;
                    
                    // المخزن المختار
                    const warehouseId = document.getElementById('productWarehouse')?.value;
                    const defaultWh = typeof getDefaultWarehouse === 'function' 
                        ? getDefaultWarehouse() 
                        : (warehouses && warehouses[0]);
                    
                    const targetWhId = warehouseId || (defaultWh ? defaultWh.id : null);
                    
                    if (!targetWhId) {
                        console.warn('⚠️ لا يوجد مخزن محدد');
                        return;
                    }
                    
                    // ✅ إضافة الكمية للمخزن
                    if (typeof productWarehouseStock === 'undefined' || !productWarehouseStock) {
                        window.productWarehouseStock = {};
                    }
                    
                    if (!productWarehouseStock[product.id]) {
                        productWarehouseStock[product.id] = {};
                    }
                    
                    // ✅ نحدث فقط لو ماكانش مضاف (عشان ما يتكررش)
                    const currentQty = productWarehouseStock[product.id][targetWhId] || 0;
                    
                    // نتحقق: هل الكمية في المخزن أقل من كمية المنتج؟
                    if (currentQty < product.qty) {
                        const diff = product.qty - currentQty;
                        productWarehouseStock[product.id][targetWhId] = currentQty + diff;
                        
                        // حفظ
                        if (typeof setData === 'function') {
                            setData('productWarehouseStock', productWarehouseStock);
                        } else {
                            localStorage.setItem('mizan_productWarehouseStock', JSON.stringify(productWarehouseStock));
                        }
                        
                        console.log('✅ تم إضافة ' + diff + ' ' + productName + ' لمخزن ' + targetWhId);
                    }
                    
                    // ✅ إعادة تعبئة القائمة
                    populateProductWarehouse();
                    
                    // ✅ تحديث عرض المنتجات
                    if (typeof renderProducts === 'function') renderProducts();
                    if (typeof renderWarehouseStatsOnDashboard === 'function') renderWarehouseStatsOnDashboard();
                    
                } catch (e) {
                    console.warn('⚠️ خطأ في ربط المنتج بالمخزن:', e.message);
                }
            }, 300);
            
        } catch (e) {
            console.warn('⚠️ خطأ في saveProduct:', e.message);
        }
    };
})();

// ✅ تعبئة القائمة عند فتح الصفحة
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        populateProductWarehouse();
    }, 3500);
});

// ✅ إعادة التعبئة عند التنقل
(function() {
    let _navOriginal = window.navigateTo;
    window.navigateTo = function(page) {
        if (_navOriginal) _navOriginal.apply(this, arguments);
        setTimeout(function() {
            if (page === 'inventory') {
                populateProductWarehouse();
            }
        }, 500);
    };
})();

console.log('✅ تم تحميل ربط المنتج بالمخزن');
