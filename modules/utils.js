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
// GET TODAY DATE - الحصول على تاريخ اليوم (YYYY-MM-DD)
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
// GET FORMATTED DATE - تاريخ منسق (مثال: 15/09/2026)
// ================================================================
function getFormattedDate() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
}

// ================================================================
// GET ARABIC DATE - تاريخ عربي (مثال: 15 سبتمبر 2026)
// ================================================================
function getArabicDate() {
    const now = new Date();
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    return `${day} ${month} ${year}`;
}

// ================================================================
// UPDATE CLOCK - ✅ تحديث الساعة مع التاريخ (لكل الأماكن)
// ================================================================
function updateClock() {
    const now = new Date();
    const dateStr = getFormattedDate();
    const timeStr = now.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullStr = `${dateStr} ${timeStr}`;

    // ✅ تحديث الساعة في الهيدر
    const clock = document.getElementById('liveDateTime');
    if (clock) {
        clock.textContent = fullStr;
    }

    // ✅ تحديث الساعة في شاشة الدخول (إن وجدت)
    const loginClock = document.getElementById('loginDateTime');
    if (loginClock) {
        loginClock.textContent = fullStr;
    }

    // ✅ تحديث الساعة القديمة (إن وجدت)
    const oldClock = document.getElementById('liveClock');
    if (oldClock) {
        oldClock.textContent = fullStr;
    }

    setTimeout(updateClock, 1000);
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
window.getFormattedDate = getFormattedDate;
window.getArabicDate = getArabicDate;
window.updateClock = updateClock;
window.copyToClipboard = copyToClipboard;
