// ============================================================
// الميزان 14.0.0 - إدارة الجلسة (مصحح للعمل مع Firebase Auth)
// app-session.js
// ============================================================

console.log('🔐 تحميل app-session.js - إدارة الجلسة');

const SESSION_KEY = 'mizan_session';
const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 أيام

// ═══════════════════════════════════════════════════════════
// 💾 حفظ الجلسة
// ═══════════════════════════════════════════════════════════

window.saveSession = function(user) {
    try {
        const session = {
            userId: user.id,
            userName: user.name,
            userEmail: user.email || '',
            userRole: user.role || 'admin',
            loginTime: Date.now(),
            expiresAt: Date.now() + SESSION_TIMEOUT,
            lastPage: 'dashboard'
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        console.log('✅ تم حفظ الجلسة:', session.userName);
        return true;
    } catch (e) {
        console.error('❌ فشل حفظ الجلسة:', e);
        return false;
    }
};

// ═══════════════════════════════════════════════════════════
// 🔍 قراءة الجلسة
// ═══════════════════════════════════════════════════════════

window.getSession = function() {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        if (!data) return null;
        const session = JSON.parse(data);
        if (session.expiresAt && Date.now() > session.expiresAt) {
            console.log('⏰ انتهت صلاحية الجلسة');
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return session;
    } catch (e) {
        console.error('❌ فشل قراءة الجلسة:', e);
        return null;
    }
};

// ═══════════════════════════════════════════════════════════
// 🗑️ مسح الجلسة
// ═══════════════════════════════════════════════════════════

window.clearSession = function() {
    try {
        localStorage.removeItem(SESSION_KEY);
        console.log('🗑️ تم مسح الجلسة');
        return true;
    } catch (e) { return false; }
};

// ═══════════════════════════════════════════════════════════
// ℹ️ autoRestoreSession - لم تعد ضرورية مع Firebase Auth
// ═══════════════════════════════════════════════════════════

window.autoRestoreSession = function() {
    console.log('ℹ️ autoRestoreSession: Firebase Auth يتولى الاستعادة تلقائياً');
    return false;
};

// ═══════════════════════════════════════════════════════════
// 🔧 حفظ آخر صفحة
// ═══════════════════════════════════════════════════════════

window.addEventListener('mizan_navigate', function(e) {
    if (e.detail && e.detail.page) {
        const page = e.detail.page;
        const session = getSession();
        if (session && page !== 'more' && page !== 'settings') {
            session.lastPage = page;
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    }
});

// ═══════════════════════════════════════════════════════════
// 🔧 تمديد الجلسة تلقائياً
// ═══════════════════════════════════════════════════════════

setInterval(() => {
    if (window.currentUser) {
        const session = getSession();
        if (session) {
            session.expiresAt = Date.now() + SESSION_TIMEOUT;
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        }
    }
}, 60 * 60 * 1000);

// ═══════════════════════════════════════════════════════════
// 🚀 اعتراض setCurrentUser لحفظ الجلسة
// ═══════════════════════════════════════════════════════════

(function() {
    let _originalSetCurrentUser = window.setCurrentUser;
    window.setCurrentUser = function(user) {
        if (_originalSetCurrentUser) _originalSetCurrentUser.apply(this, arguments);
        if (user && window.saveSession) {
            saveSession(user);
        }
    };
})();

// ═══════════════════════════════════════════════════════════
// 🚀 اعتراض lockApp لمسح الجلسة
// ═══════════════════════════════════════════════════════════

(function() {
    let _originalLockApp = window.lockApp;
    window.lockApp = function() {
        clearSession();
        if (_originalLockApp) _originalLockApp.apply(this, arguments);
    };
})();

console.log('✅ تم تحميل app-session.js بنجاح');
