// ================================================================
// barcode.js - ماسح الباركود
// ================================================================

let barcodeScannerActive = false;
let barcodeStream = null;

// ================================================================
// START BARCODE SCANNER
// ================================================================
function startBarcodeScanner() {
    const container = document.getElementById('barcode-scanner');
    const result = document.getElementById('barcodeResult');
    if (!container || !result) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        result.innerHTML = '<p style="color:#E06060;">❌ الكاميرا غير مدعومة</p>';
        result.className = 'barcode-result error';
        showToast('❌ الكاميرا غير مدعومة', 'error');
        return;
    }

    result.innerHTML = '<p style="color:#E6A830;">⏳ جاري تشغيل الكاميرا...</p>';
    result.className = 'barcode-result';

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
            barcodeStream = stream;
            barcodeScannerActive = true;

            const video = document.createElement('video');
            video.setAttribute('playsinline', true);
            video.style.width = '100%';
            video.style.height = 'auto';
            video.style.borderRadius = '8px';
            video.style.background = '#000';

            container.innerHTML = '';
            container.appendChild(video);

            video.srcObject = stream;
            video.play();

            result.innerHTML = '<p style="color:#2D8F5E;">📷 الكاميرا تعمل... ضع الباركود أمام الكاميرا</p>';
            result.className = 'barcode-result';

            scanBarcodeFrame(video, result);
            showToast('📷 الكاميرا تعمل', 'info');
        })
        .catch((err) => {
            console.error('Camera error:', err);
            result.innerHTML = `<p style="color:#E06060;">❌ لا يمكن تشغيل الكاميرا: ${err.message}</p>`;
            result.className = 'barcode-result error';
            showToast('❌ لا يمكن تشغيل الكاميرا', 'error');
        });
}

// ================================================================
// SCAN BARCODE FRAME
// ================================================================
function scanBarcodeFrame(video, result) {
    if (!barcodeScannerActive) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
            if (typeof jsQR !== 'undefined') {
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                    barcodeScannerActive = false;
                    stopBarcodeScanner();

                    const barcode = code.data.trim();
                    result.innerHTML = `<p style="color:#2D8F5E;">✅ تم قراءة الباركود: <strong>${barcode}</strong></p>`;
                    result.className = 'barcode-result success';

                    // البحث عن المنتج
                    const product = window.products?.find(p => p.barcode === barcode);
                    if (product) {
                        const totalQty = window.warehouseProducts?.filter(wp => wp.productId === product.id).reduce((s, wp) => s + wp.qty, 0) || 0;
                        result.innerHTML += `
                            <div style="margin-top:8px;padding:10px;background:#1C1C1C;border-radius:8px;border:1px solid #2D8F5E;">
                                <div style="font-weight:700;color:#C9A94E;font-size:16px;">${product.name}</div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px;margin-top:4px;">
                                    <div><span style="color:#A89070;">💰 السعر:</span> ${product.sellPrice || 0} 🇪🇬</div>
                                    <div><span style="color:#A89070;">📦 الكمية:</span> ${totalQty}</div>
                                </div>
                                <button class="btn btn-success btn-sm" onclick="addProductToSale(${product.id})" style="margin-top:6px;">
                                    <i class="fas fa-cart-plus"></i> إضافة للبيع
                                </button>
                            </div>
                        `;
                        showToast(`✅ تم قراءة الباركود: ${product.name}`, 'success');
                    } else {
                        result.innerHTML += `
                            <div style="margin-top:8px;padding:10px;background:#1C1C1C;border-radius:8px;border:1px solid #E6A830;color:#E6A830;">
                                ⚠️ لا يوجد منتج بهذا الباركود
                            </div>
                        `;
                        showToast('⚠️ منتج غير موجود', 'warning');
                    }
                    return;
                }
            }
        } catch(e) {
            // خطأ في jsQR
        }
    }

    if (barcodeScannerActive) {
        requestAnimationFrame(() => scanBarcodeFrame(video, result));
    }
}

// ================================================================
// STOP BARCODE SCANNER
// ================================================================
function stopBarcodeScanner() {
    barcodeScannerActive = false;
    if (barcodeStream) {
        barcodeStream.getTracks().forEach(track => track.stop());
        barcodeStream = null;
    }

    const container = document.getElementById('barcode-scanner');
    const result = document.getElementById('barcodeResult');
    if (container) {
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;min-height:200px;color:#A89070;flex-direction:column;gap:8px;">
                <i class="fas fa-camera" style="font-size:32px;color:#3D3D3D;"></i>
                <span style="font-size:13px;">اضغط "بدء" لتشغيل الكاميرا</span>
            </div>
        `;
    }
    if (result) {
        result.innerHTML = '<p style="color:#A89070;">📷 تم إيقاف الكاميرا</p>';
        result.className = 'barcode-result';
    }
    showToast('📷 تم إيقاف الكاميرا', 'info');
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
        const qtyInput = document.getElementById('salesItemQty');
        if (qtyInput) qtyInput.value = 1;
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

// ================================================================
// EXPOSE FUNCTIONS
// ================================================================
window.startBarcodeScanner = startBarcodeScanner;
window.stopBarcodeScanner = stopBarcodeScanner;
window.searchByBarcode = searchByBarcode;
window.addProductToSale = addProductToSale;
window.showProductDetails = showProductDetails;