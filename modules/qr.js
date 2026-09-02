// ================================================================
// qr.js - مشاركة البيانات عبر QR Code
// ================================================================

let qrScannerActive = false;
let qrStream = null;

// ================================================================
// GENERATE QR CODE
// ================================================================
function generateQRCode() {
    const data = getBackupData();
    const json = JSON.stringify(data);
    localStorage.setItem('mizan_qr_data', json);
    
    const modalHtml = `
        <div style="text-align:center;">
            <h4 style="color:#C9A94E;">📱 امسح الكود لنقل البيانات</h4>
            <div id="qrContainer" style="display:flex;justify-content:center;padding:10px;background:#fff;border-radius:8px;min-height:200px;"></div>
            <p style="font-size:11px;color:#A89070;margin-top:8px;">يمكنك مسح هذا الكود من جهاز آخر لاستقبال البيانات</p>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
                <button class="btn btn-primary btn-block" onclick="downloadBackupQR()"><i class="fas fa-download"></i> تحميل الصورة</button>
                <button class="btn btn-success btn-block" onclick="copyQRData()"><i class="fas fa-copy"></i> نسخ البيانات</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;
    openModal('📱 مشاركة QR', modalHtml);
    
    setTimeout(() => {
        const container = document.getElementById('qrContainer');
        if (container && typeof QRCode !== 'undefined') {
            try {
                container.innerHTML = '';
                new QRCode(container, {
                    text: json,
                    width: 256,
                    height: 256,
                    colorDark: '#C9A94E',
                    colorLight: '#0D0D0D',
                    correctLevel: QRCode.CorrectLevel.H
                });
                showToast('✅ تم إنشاء QR Code', 'success');
            } catch(e) {
                console.error('QR Error:', e);
                container.innerHTML = `
                    <div style="color:#E06060;padding:20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size:32px;"></i>
                        <p>حدث خطأ في إنشاء QR Code</p>
                        <button class="btn btn-primary btn-sm" onclick="copyQRData()" style="margin-top:8px;">
                            <i class="fas fa-copy"></i> نسخ البيانات كبديل
                        </button>
                    </div>
                `;
            }
        } else {
            container.innerHTML = `
                <div style="color:#E6A830;padding:20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size:32px;"></i>
                    <p>جاري تحميل مكتبة QR...</p>
                </div>
            `;
        }
    }, 300);
}

// ================================================================
// COPY QR DATA
// ================================================================
function copyQRData() {
    let data = localStorage.getItem('mizan_qr_data');
    if (!data) {
        const backupData = getBackupData();
        data = JSON.stringify(backupData);
        localStorage.setItem('mizan_qr_data', data);
    }
    copyToClipboard(data);
}

// ================================================================
// DOWNLOAD BACKUP QR
// ================================================================
function downloadBackupQR() {
    const canvas = document.querySelector('#qrContainer canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = 'mizan_backup_qr.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('📥 تم تحميل الصورة', 'success');
    } else {
        const data = localStorage.getItem('mizan_qr_data') || JSON.stringify(getBackupData());
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mizan_backup_data.json';
        link.click();
        URL.revokeObjectURL(url);
        showToast('📥 تم تحميل البيانات كملف JSON', 'success');
    }
}

// ================================================================
// START QR SCANNER
// ================================================================
function startQRScanner() {
    const modalHtml = `
        <div style="text-align:center;">
            <h4 style="color:#C9A94E;">📷 مسح QR Code</h4>
            <div id="qrScannerContainer" style="position:relative;background:#000;border-radius:10px;overflow:hidden;margin:10px 0;min-height:300px;">
                <video id="qrVideo" style="width:100%;height:auto;display:block;"></video>
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:70%;height:70%;border:3px solid #C9A94E;border-radius:8px;pointer-events:none;"></div>
            </div>
            <div id="qrScanResult" class="qr-result" style="min-height:50px;color:#A89070;">
                <span>⏳ جاري تشغيل الكاميرا...</span>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
                <button class="btn btn-danger btn-block" onclick="stopQRScanner()"><i class="fas fa-stop"></i> إيقاف</button>
                <button class="btn btn-secondary btn-block" onclick="pasteQRData()"><i class="fas fa-paste"></i> لصق بيانات</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;
    openModal('📷 مسح QR Code', modalHtml);
    
    setTimeout(() => {
        initQRScanner();
    }, 500);
}

// ================================================================
// INIT QR SCANNER
// ================================================================
function initQRScanner() {
    const video = document.getElementById('qrVideo');
    const result = document.getElementById('qrScanResult');
    
    if (!video) return;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (result) {
            result.innerHTML = '<span style="color:#E06060;">❌ الكاميرا غير مدعومة في هذا المتصفح</span>';
            result.className = 'qr-result error';
        }
        showToast('❌ الكاميرا غير مدعومة', 'error');
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
            qrStream = stream;
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            video.play();
            qrScannerActive = true;
            if (result) {
                result.innerHTML = '<span style="color:#2D8F5E;">📷 الكاميرا تعمل... ضع QR Code أمام الكاميرا</span>';
                result.className = 'qr-result';
            }
            scanQRFrame(video, result);
        })
        .catch((err) => {
            console.error('Camera error:', err);
            if (result) {
                result.innerHTML = '<span style="color:#E06060;">❌ لا يمكن تشغيل الكاميرا: ' + err.message + '</span>';
                result.className = 'qr-result error';
            }
            showToast('❌ لا يمكن تشغيل الكاميرا', 'error');
        });
}

// ================================================================
// SCAN QR FRAME
// ================================================================
function scanQRFrame(video, result) {
    if (!qrScannerActive) return;
    
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
                    try {
                        const data = JSON.parse(code.data);
                        if (data.products !== undefined || data.customers !== undefined || data.sales !== undefined) {
                            qrScannerActive = false;
                            stopQRScanner();
                            if (result) {
                                result.innerHTML = '<span style="color:#2D8F5E;">✅ تم قراءة QR Code بنجاح!</span>';
                                result.className = 'qr-result success';
                            }
                            if (confirm('✅ تم قراءة البيانات بنجاح! هل تريد استعادة البيانات؟')) {
                                restoreBackupData(data);
                                closeModal();
                            }
                            return;
                        }
                    } catch(e) {
                        if (result) {
                            result.innerHTML = '<span style="color:#E6A830;">⚠️ QR Code غير صالح للبيانات</span>';
                            result.className = 'qr-result warning';
                        }
                    }
                }
            }
        } catch(e) {
            // خطأ في jsQR
        }
    }
    
    if (qrScannerActive) {
        requestAnimationFrame(() => scanQRFrame(video, result));
    }
}

// ================================================================
// STOP QR SCANNER
// ================================================================
function stopQRScanner() {
    qrScannerActive = false;
    if (qrStream) {
        qrStream.getTracks().forEach(track => track.stop());
        qrStream = null;
    }
    const video = document.getElementById('qrVideo');
    if (video) {
        video.srcObject = null;
    }
    const result = document.getElementById('qrScanResult');
    if (result && !result.textContent.includes('✅')) {
        result.innerHTML = '<span style="color:#A89070;">📷 تم إيقاف الكاميرا</span>';
        result.className = 'qr-result';
    }
    showToast('📷 تم إيقاف الكاميرا', 'info');
}

// ================================================================
// PASTE QR DATA
// ================================================================
function pasteQRData() {
    if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText()
            .then(text => {
                try {
                    const data = JSON.parse(text);
                    if (data.products !== undefined || data.customers !== undefined || data.sales !== undefined) {
                        if (confirm('✅ تم قراءة البيانات من الحافظة! هل تريد استعادتها؟')) {
                            restoreBackupData(data);
                            closeModal();
                        }
                    } else {
                        showToast('⚠️ البيانات غير صالحة', 'warning');
                    }
                } catch(e) {
                    showToast('❌ بيانات غير صالحة', 'error');
                }
            })
            .catch(() => {
                const hiddenInput = document.createElement('textarea');
                hiddenInput.style.position = 'fixed';
                hiddenInput.style.opacity = '0';
                document.body.appendChild(hiddenInput);
                hiddenInput.focus();
                document.execCommand('paste');
                const text = hiddenInput.value;
                document.body.removeChild(hiddenInput);
                if (text) {
                    try {
                        const data = JSON.parse(text);
                        if (data.products !== undefined || data.customers !== undefined || data.sales !== undefined) {
                            if (confirm('✅ تم قراءة البيانات! هل تريد استعادتها؟')) {
                                restoreBackupData(data);
                                closeModal();
                            }
                        } else {
                            showToast('⚠️ البيانات غير صالحة', 'warning');
                        }
                    } catch(e) {
                        showToast('❌ بيانات غير صالحة', 'error');
                    }
                } else {
                    showToast('⚠️ لا توجد بيانات في الحافظة', 'warning');
                }
            });
    } else {
        showToast('⚠️ لا يمكن الوصول للحافظة', 'warning');
    }
}

// ================================================================
// SHOW QR SHARE TEXT
// ================================================================
function showQRShareText() {
    const data = getBackupData();
    const json = JSON.stringify(data, null, 2);
    
    const modalHtml = `
        <div style="text-align:center;">
            <h4 style="color:#C9A94E;">📝 مشاركة البيانات كنص</h4>
            <div style="background:#0D0D0D;border-radius:8px;padding:10px;border:1px solid #2D2D2D;max-height:300px;overflow-y:auto;text-align:left;font-size:11px;font-family:monospace;white-space:pre-wrap;word-break:break-all;color:#A89070;">
                ${json}
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
                <button class="btn btn-primary btn-block" onclick="copyQRData()"><i class="fas fa-copy"></i> نسخ</button>
                <button class="btn btn-secondary btn-block" onclick="closeModal()"><i class="fas fa-times"></i> إغلاق</button>
            </div>
        </div>
    `;
    openModal('📝 مشاركة البيانات', modalHtml);
    localStorage.setItem('mizan_qr_data', json);
}
