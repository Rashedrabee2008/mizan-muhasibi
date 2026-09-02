// ================================================================
// products.js - إدارة المنتجات
// ================================================================

// ================================================================
// RENDER PRODUCTS
// ================================================================
function renderProducts() {
    if (!window.products || !Array.isArray(window.products)) {
        window.products = [];
        setData('products', window.products);
    }

    safeSetText('totalProducts', window.products.length);

    const lowStock = window.products.filter(p => {
        if (!p) return false;
        const total = window.warehouseProducts?.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) || 0;
        return total <= (p.min || 0);
    });
    safeSetText('lowStock', lowStock.length);

    const totalValue = window.products.reduce((s, p) => {
        if (!p) return s;
        const qty = window.warehouseProducts?.filter(wp => wp.productId === p.id).reduce((sum, wp) => sum + wp.qty, 0) || 0;
        return s + ((p.sellPrice || 0) * qty);
    }, 0);
    safeSetText('totalValue', totalValue.toFixed(2));

    filterProducts();
}

// ================================================================
// FILTER PRODUCTS
// ================================================================
function filterProducts() {
    if (!window.products || !Array.isArray(window.products)) {
        window.products = [];
        const container = document.getElementById('productList');
        if (container) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><span>لا توجد منتجات</span></div>`;
        }
        return;
    }

    const search = document.getElementById('inventorySearch')?.value?.trim()?.toLowerCase() || '';
    const container = document.getElementById('productList');
    if (!container) return;

    const filtered = window.products.filter(p => p && (p.name?.toLowerCase().includes(search) || (p.barcode && p.barcode.includes(search))));

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><span>لا توجد منتجات</span></div>`;
        return;
    }

    const canEditProducts = canEdit();
    const canDeleteProducts = canDelete();

    let html = `<div class="table-header" style="grid-template-columns:1.5fr 1fr 1fr 1fr 1fr 0.8fr;"><span>المنتج</span><span>الباركود</span><span>الشراء</span><span>البيع</span><span>الكمية</span><span></span></div>`;

    filtered.forEach(p => {
        if (!p) return;
        const totalQty = window.warehouseProducts?.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0) || 0;
        const lowClass = totalQty <= (p.min || 0) ? 'style="color:#E06060;font-weight:700;"' : '';
        html += `
            <div class="table-row" style="grid-template-columns:1.5fr 1fr 1fr 1fr 1fr 0.8fr;font-size:12px;">
                <span><strong>${p.name || 'غير معروف'}</strong></span>
                <span style="font-size:10px;">${p.barcode || '-'}</span>
                <span>${(p.buyPrice || 0).toFixed(2)}</span>
                <span>${(p.sellPrice || 0).toFixed(2)}</span>
                <span ${lowClass}>${totalQty}</span>
                <div class="actions">
                    ${canEditProducts ? `<button class="btn btn-warning btn-sm" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDeleteProducts ? `<button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================================================================
// ADD PRODUCT
// ================================================================
function addProduct() {
    if (!canAdd()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }

    const name = document.getElementById('productName')?.value?.trim();
    const buyPrice = parseFloat(document.getElementById('productBuyPrice')?.value);
    const sellPrice = parseFloat(document.getElementById('productSellPrice')?.value);
    const qty = parseInt(document.getElementById('productQty')?.value) || 0;
    const min = parseInt(document.getElementById('productMin')?.value) || 5;
    const barcode = document.getElementById('productBarcode')?.value?.trim() || '';
    const warehouseId = parseInt(document.getElementById('productWarehouse')?.value);

    if (!name) { showToast('⚠️ أدخل اسم المنتج', 'error'); return; }
    if (isNaN(buyPrice) || buyPrice <= 0) { showToast('⚠️ سعر شراء صحيح', 'error'); return; }
    if (isNaN(sellPrice) || sellPrice <= 0) { showToast('⚠️ سعر بيع صحيح', 'error'); return; }

    if (window.products.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ المنتج موجود بالفعل', 'warning');
        return;
    }

    if (barcode && window.products.find(p => p.barcode === barcode)) {
        showToast('⚠️ الباركود مستخدم', 'warning');
        return;
    }

    const product = {
        id: Date.now(),
        name: name,
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        min: min,
        barcode: barcode,
        createdAt: new Date().toISOString()
    };
    window.products.push(product);

    if (warehouseId && qty > 0) {
        const existing = window.warehouseProducts?.find(wp => wp.warehouseId === warehouseId && wp.productId === product.id);
        if (existing) {
            existing.qty += qty;
        } else {
            if (!window.warehouseProducts) window.warehouseProducts = [];
            window.warehouseProducts.push({ warehouseId: warehouseId, productId: product.id, qty: qty });
        }
    }

    saveAll();
    addAuditLog('add', 'product', 
        `إضافة منتج: ${name} - سعر الشراء: ${buyPrice} - سعر البيع: ${sellPrice} - الكمية: ${qty}${barcode ? ' - باركود: ' + barcode : ''}`
    );
    renderProducts();
    populateAllSelects();
    document.getElementById('productName').value = '';
    document.getElementById('productBuyPrice').value = '';
    document.getElementById('productSellPrice').value = '';
    document.getElementById('productQty').value = '';
    document.getElementById('productMin').value = '';
    document.getElementById('productBarcode').value = '';
    showToast('✅ تم إضافة المنتج', 'success');
    if (typeof updateDashboard === 'function') updateDashboard();
}

// ================================================================
// EDIT PRODUCT
// ================================================================
function editProduct(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const p = window.products.find(pr => pr.id === id);
    if (!p) return;

    const html = `
        <div class="form-group"><label>الاسم</label><input type="text" id="editName" value="${p.name}" /></div>
        <div class="form-row">
            <div class="form-group"><label>سعر الشراء</label><input type="number" id="editBuyPrice" value="${p.buyPrice}" min="0.01" step="0.01" /></div>
            <div class="form-group"><label>سعر البيع</label><input type="number" id="editSellPrice" value="${p.sellPrice}" min="0.01" step="0.01" /></div>
        </div>
        <div class="form-group"><label>الحد الأدنى</label><input type="number" id="editMin" value="${p.min}" min="1" step="1" /></div>
        <div class="form-group"><label>الباركود</label><input type="text" id="editBarcode" value="${p.barcode || ''}" /></div>
        <button class="btn btn-primary btn-block" onclick="saveProductEdit(${p.id})"><i class="fas fa-save"></i> حفظ</button>
        ${canDelete() ? `<button class="btn btn-danger btn-block" onclick="deleteProduct(${p.id})" style="margin-top:6px;"><i class="fas fa-trash"></i> حذف</button>` : ''}
    `;
    openModal('✏️ تعديل المنتج', html);
}

function saveProductEdit(id) {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    const p = window.products.find(pr => pr.id === id);
    if (!p) return;

    const name = document.getElementById('editName')?.value?.trim();
    const buyPrice = parseFloat(document.getElementById('editBuyPrice')?.value);
    const sellPrice = parseFloat(document.getElementById('editSellPrice')?.value);
    const min = parseInt(document.getElementById('editMin')?.value) || 5;
    const barcode = document.getElementById('editBarcode')?.value?.trim() || '';

    if (!name) { showToast('⚠️ أدخل الاسم', 'error'); return; }
    if (isNaN(buyPrice) || buyPrice <= 0) { showToast('⚠️ سعر شراء صحيح', 'error'); return; }
    if (isNaN(sellPrice) || sellPrice <= 0) { showToast('⚠️ سعر بيع صحيح', 'error'); return; }
    if (barcode && window.products.find(pr => pr.barcode === barcode && pr.id !== id)) {
        showToast('⚠️ الباركود مستخدم', 'warning');
        return;
    }

    p.name = name;
    p.buyPrice = buyPrice;
    p.sellPrice = sellPrice;
    p.min = min;
    p.barcode = barcode;

    saveAll();
    addAuditLog('edit', 'product', `تعديل منتج: ${name} - سعر الشراء: ${buyPrice} - سعر البيع: ${sellPrice}`);
    renderProducts();
    populateAllSelects();
    closeModal();
    showToast('✅ تم التعديل', 'success');
}

// ================================================================
// DELETE PRODUCT
// ================================================================
function deleteProduct(id) {
    if (!canDelete()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ حذف المنتج؟')) return;

    const p = window.products.find(pr => pr.id === id);
    window.products = window.products.filter(pr => pr.id !== id);
    window.warehouseProducts = window.warehouseProducts?.filter(wp => wp.productId !== id) || [];

    saveAll();
    if (p) {
        addAuditLog('delete', 'product', `حذف منتج: ${p.name} - سعر الشراء: ${p.buyPrice} - سعر البيع: ${p.sellPrice}`);
    }
    renderProducts();
    populateAllSelects();
    showToast('🗑️ تم الحذف', 'info');
    if (typeof updateDashboard === 'function') updateDashboard();
    closeModal();
}

// ================================================================
// QUICK ADD PRODUCT
// ================================================================
let quickAddContext = 'sales';

function openAddProductModal(context) {
    quickAddContext = context || 'sales';
    const warehouseOptions = window.warehouses ? window.warehouses.map(w => 
        `<option value="${w.id}">${w.name} (${w.type})</option>`
    ).join('') : '';

    const html = `
        <div style="background:#0D0D0D;border-radius:10px;padding:10px;border:1px solid #2D2D2D;">
            <h4 style="color:#C9A94E;font-size:15px;margin-bottom:8px;">➕ إضافة منتج جديد</h4>
            <div class="form-group"><label>اسم المنتج</label><input type="text" id="quickProductName" placeholder="مثال: قلم" /></div>
            <div class="form-row">
                <div class="form-group"><label>سعر الشراء</label><input type="number" id="quickProductBuyPrice" placeholder="0.00" min="0.01" step="0.01" /></div>
                <div class="form-group"><label>سعر البيع</label><input type="number" id="quickProductSellPrice" placeholder="0.00" min="0.01" step="0.01" /></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>الكمية</label><input type="number" id="quickProductQty" placeholder="0" min="0" step="1" /></div>
                <div class="form-group"><label>الحد الأدنى</label><input type="number" id="quickProductMin" placeholder="5" min="1" step="1" /></div>
            </div>
            <div class="form-group"><label>الباركود</label><input type="text" id="quickProductBarcode" placeholder="رمز الباركود" /></div>
            <div class="form-group"><label>المخزن</label>
                <select id="quickProductWarehouse">
                    <option value="">اختر مخزن...</option>
                    ${warehouseOptions}
                </select>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
                <button class="btn btn-primary btn-block" onclick="saveQuickProduct()"><i class="fas fa-save"></i> حفظ وإضافة</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إلغاء</button>
            </div>
        </div>
    `;
    openModal('➕ إضافة منتج جديد', html);
}

function saveQuickProduct() {
    const name = document.getElementById('quickProductName')?.value?.trim();
    const buyPrice = parseFloat(document.getElementById('quickProductBuyPrice')?.value);
    const sellPrice = parseFloat(document.getElementById('quickProductSellPrice')?.value);
    const qty = parseInt(document.getElementById('quickProductQty')?.value) || 0;
    const min = parseInt(document.getElementById('quickProductMin')?.value) || 5;
    const barcode = document.getElementById('quickProductBarcode')?.value?.trim() || '';
    const warehouseId = parseInt(document.getElementById('quickProductWarehouse')?.value);

    if (!name) { showToast('⚠️ أدخل اسم المنتج', 'error'); return; }
    if (isNaN(buyPrice) || buyPrice <= 0) { showToast('⚠️ سعر شراء صحيح', 'error'); return; }
    if (isNaN(sellPrice) || sellPrice <= 0) { showToast('⚠️ سعر بيع صحيح', 'error'); return; }

    if (window.products.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast('⚠️ المنتج موجود', 'warning');
        return;
    }

    const product = {
        id: Date.now(),
        name: name,
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        min: min,
        barcode: barcode,
        createdAt: new Date().toISOString()
    };
    window.products.push(product);

    if (warehouseId && qty > 0) {
        const existing = window.warehouseProducts?.find(wp => wp.warehouseId === warehouseId && wp.productId === product.id);
        if (existing) {
            existing.qty += qty;
        } else {
            if (!window.warehouseProducts) window.warehouseProducts = [];
            window.warehouseProducts.push({ warehouseId: warehouseId, productId: product.id, qty: qty });
        }
    }

    saveAll();
    addAuditLog('add', 'product', `إضافة منتج سريع: ${name} - سعر الشراء: ${buyPrice} - سعر البيع: ${sellPrice} - الكمية: ${qty}`);
    renderProducts();
    populateAllSelects();
    closeModal();

    if (quickAddContext === 'sales') {
        const select = document.getElementById('salesItemProduct');
        if (select) {
            select.innerHTML = '<option value="">اختر منتج...</option>';
            window.products.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.name} ${p.barcode ? '🏷️'+p.barcode : ''}</option>`;
            });
            select.value = product.id;
            if (typeof updateSalesPrice === 'function') updateSalesPrice();
        }
    } else if (quickAddContext === 'purchase') {
        const select = document.getElementById('purchaseItemProduct');
        if (select) {
            select.innerHTML = '<option value="">اختر منتج...</option>';
            window.products.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.name} ${p.barcode ? '🏷️'+p.barcode : ''}</option>`;
            });
            select.value = product.id;
        }
    }

    showToast(`✅ تم إضافة المنتج ${name}`, 'success');
    if (typeof updateDashboard === 'function') updateDashboard();
}
