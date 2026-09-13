// ============================================================
// الميزان 14.0.0 - إدارة الجلسة
// app-session.js
// ============================================================
// 
// يحل مشكلة:
// - Refresh بيرجع لتسجيل الدخول
// - الحفاظ على الجلسة لمدة 7 أيام
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
            userRole: user.role,
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
        
        // التحقق من انتهاء الصلاحية
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
    } catch (e) {
        return false;
    }
};

// ═══════════════════════════════════════════════════════════
// 🔄 استعادة الجلسة تلقائياً
// ═══════════════════════════════════════════════════════════

window.autoRestoreSession = function() {
    const session = getSession();
    if (!session) {
        console.log('ℹ️ لا توجد جلسة محفوظة');
        return false;
    }
    
    // البحث عن المستخدم
    const user = users.find(u => u.id === session.userId);
    if (!user) {
        console.log('⚠️ المستخدم غير موجود');
        clearSession();
        return false;
    }
    
    if (user.active === false) {
        console.log('⚠️ المستخدم موقوف');
        clearSession();
        return false;
    }
    
    // ✅ استعادة الجلسة
    window.currentUser = user;
    console.log('✅ تم استعادة الجلسة تلقائياً:', user.name);
    
    // إظهار التطبيق
    const loginCont = $('loginContainer');
    const appCont = $('appContent');
    if (loginCont) loginCont.classList.add('hidden');
    if (appCont) appCont.style.display = 'block';
    
    // تحديث الواجهة
    if (typeof updateUserUI === 'function') updateUserUI();
    if (typeof applyPermissions === 'function') applyPermissions();
    
    // التسجيل في السجل
    if (typeof addAuditLog === 'function') {
        addAuditLog('login', 'user', `استعادة الجلسة: ${user.name}`, { userId: user.id });
    }
    
    // الانتقال للصفحة الأخيرة
    const lastPage = session.lastPage || 'dashboard';
    if (typeof navigateTo === 'function') {
        navigateTo(lastPage);
    }
    
    return true;
};

// ═══════════════════════════════════════════════════════════
// 🔧 تحسين دالة تسجيل الدخول
// ═══════════════════════════════════════════════════════════

const _originalCheckLogin = window.checkLogin;
window.checkLogin = function() {
    // استدعاء الدالة الأصلية
    const result = _originalCheckLogin ? _originalCheckLogin.apply(this, arguments) : null;
    
    // حفظ الجلسة بعد تأخير بسيط
    setTimeout(() => {
        if (window.currentUser) {
            saveSession(currentUser);
        }
    }, 500);
    
    return result;
};

// ═══════════════════════════════════════════════════════════
// 🔧 تحسين دالة تسجيل الخروج
// ═══════════════════════════════════════════════════════════

const _originalLockApp = window.lockApp;
window.lockApp = function() {
    clearSession();
    if (_originalLockApp) _originalLockApp.apply(this, arguments);
};

// ═══════════════════════════════════════════════════════════
// 🔧 حفظ آخر صفحة
// ═══════════════════════════════════════════════════════════

const _originalNavigateTo = window.navigateTo;
window.navigateTo = function(page) {
    // حفظ الصفحة في الجلسة
    const session = getSession();
    if (session && page !== 'more' && page !== 'settings') {
        session.lastPage = page;
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    
    if (_originalNavigateTo) _originalNavigateTo.apply(this, arguments);
};

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
}, 60 * 60 * 1000); // كل ساعة

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة عند التحميل
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    // انتظر تحميل البيانات
    setTimeout(() => {
        // جرب استعادة الجلسة
        const restored = autoRestoreSession();
        
        if (restored) {
            console.log('🎉 تم استعادة الجلسة - التطبيق جاهز');
        } else {
            console.log('ℹ️ يرجى تسجيل الدخول');
        }
    }, 1500);
});

console.log('✅ تم تحميل app-session.js بنجاح');
console.log('🔐 الجلسة محفوظة لمدة 7 أيام');
