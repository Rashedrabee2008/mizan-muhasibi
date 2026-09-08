// ================================================================
// utils.js - دوال مساعدة
// ================================================================

// ================================================================
// SAFE SET TEXT - تعيين نص بأمان
// ================================================================
function safeSetText(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value !== undefined && value !== null ? value : '0';
    }
}

// ================================================================
// SAFE SET VALUE - تعيين قيمة بأمان
// ================================================================
function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.value = value !== undefined && value !== null ? value : '';
    }
}

// ================================================================
// GET TODAY DATE - الحصول على تاريخ اليوم
// ================================================================
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// ================================================================
// GET CURRENT TIME - الحصول على الوقت الحالي
// ================================================================
function getCurrentTime() {
    return new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ================================================================
// GET CURRENT DATE TIME - الحصول على التاريخ والوقت
// ================================================================
function getCurrentDateTime() {
    const now = new Date();
    return {
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        full: now.toLocaleString('ar')
    };
}

// ================================================================
// COPY TO CLIPBOARD - نسخ للنص
// ================================================================
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showToast('✅ تم النسخ', 'success'))
            .catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('✅ تم النسخ', 'success');
    } catch(e) {
        showToast('❌ فشل النسخ', 'error');
    }
    document.body.removeChild(textarea);
}

// ================================================================
// EXPOSE FUNCTIONS - تعريض الدوال
// ================================================================
window.safeSetText = safeSetText;
window.safeSetValue = safeSetValue;
window.getTodayDate = getTodayDate;
window.getCurrentTime = getCurrentTime;
window.getCurrentDateTime = getCurrentDateTime;
window.copyToClipboard = copyToClipboard;
