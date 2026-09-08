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
                        result.innerHTML += `
                            <div style="margin-top:8px;padding:8px;background:#1C1C1C;border-radius:6px;">
                                <div style="font-weight:700;color:#C9A94E;">${product.name}</div>
                                <div style="font-size:12px;color:#A89070;">💰 ${product.sellPrice || 0} 🇪🇬</div>
                                <button class="btn btn-success btn-sm" onclick="addProductToSale(${product.id})" style="margin-top:4px;">
                                    <i class="fas fa-cart-plus"></i> إضافة للبيع
                                </button>
                            </div>
                        `;
                        showToast(`✅ تم قراءة الباركود: ${product.name}`, 'success');
                    } else {
                        result.innerHTML += `
                            <div style="margin-top:8px;padding:8px;background:#1C1C1C;border-radius:6px;color:#E6A830;">
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
// SEARCH BY BARCODE (مكرر من remaining.js ولكن مع تحسين)
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