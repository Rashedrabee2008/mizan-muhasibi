// ============================================================
// الميزان 14.0.0 - نظام الحماية والأمان (النسخة النهائية)
// app-security.js
// ============================================================

console.log('🔒 تحميل app-security.js - نظام الحماية المتقدم');

// ═══════════════════════════════════════════════════════════
// 🔐 1. دوال مساعدة للتشفير
// ═══════════════════════════════════════════════════════════

window.hashString = async function(str) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 2. بصمة الجهاز المتقدمة (Canvas + WebGL + Fonts)
// ═══════════════════════════════════════════════════════════

window.getCanvasFingerprint = function() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200; canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.textBaseline = 'top';
        ctx.font = '14px "Arial"';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Mizan,App!@#', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Mizan,App!@#', 4, 17);
        ctx.beginPath();
        ctx.arc(50, 25, 20, 0, Math.PI * 2);
        ctx.fill();
        return canvas.toDataURL();
    } catch (e) { return ''; }
};

window.getWebGLFingerprint = function() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return '';
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return '';
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        return vendor + '|' + renderer;
    } catch (e) { return ''; }
};

window.getFontsFingerprint = function() {
    try {
        const fonts = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Tahoma', 'Tajawal', 'Cairo', 'Amiri'];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        let result = '';
        fonts.forEach(font => {
            ctx.font = '20px "' + font + '"';
            const w = ctx.measureText('MizanTest').width;
            result += font + ':' + w.toFixed(2) + '|';
        });
        return result;
    } catch (e) { return ''; }
};

window.getDeviceFingerprint = async function() {
    try {
        // ✅ جمع المعلومات الأساسية
        const basicInfo = [
            navigator.userAgent || '',
            navigator.language || '',
            (screen.width || 0) + 'x' + (screen.height || 0),
            screen.colorDepth || 0,
            new Date().getTimezoneOffset() || 0,
            navigator.hardwareConcurrency || 0,
            navigator.platform || '',
            navigator.deviceMemory || 0,
            screen.availWidth || 0,
            screen.availHeight || 0,
            screen.pixelDepth || 0,
            window.devicePixelRatio || 1
        ].join('|');
        
        // ✅ البصمات المتقدمة (بدون صوت)
        const canvasFp = getCanvasFingerprint();
        const webglFp = getWebGLFingerprint();
        const fontsFp = getFontsFingerprint();
        
        // ✅ دمج البصمات
        const combined = [
            basicInfo,
            canvasFp.substring(0, 500),
            webglFp,
            fontsFp
        ].join('|||');
        
        // ✅ تشفير
        const fullHash = await hashString(combined);
        return fullHash.substring(0, 32).toUpperCase();
    } catch (e) {
        console.warn('⚠️ خطأ في توليد بصمة الجهاز:', e);
        return 'UNKNOWN_DEVICE';
    }
};

window.getSimpleFingerprint = async function() {
    try {
        const data = [
            navigator.userAgent || '',
            navigator.language || '',
            (screen.width || 0) + 'x' + (screen.height || 0),
            screen.colorDepth || 0,
            new Date().getTimezoneOffset() || 0,
            navigator.hardwareConcurrency || 0,
            navigator.platform || '',
            navigator.deviceMemory || 0
        ].join('|');
        const fullHash = await hashString(data);
        return fullHash.substring(0, 32).toUpperCase();
    } catch (e) {
        return 'UNKNOWN_DEVICE';
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 3. إدارة الأجهزة (حتى 3 أجهزة لكل مستخدم)
// ═══════════════════════════════════════════════════════════

const MAX_DEVICES_PER_USER = 3;

window.getUserDevices = async function(uid) {
    try {
        const snapshot = await firebase.database().ref('mizan_users/' + uid + '/devices').once('value');
        return snapshot.exists() ? snapshot.val() : {};
    } catch (e) {
        console.error('❌ خطأ في جلب الأجهزة:', e);
        return {};
    }
};

window.registerUserDevice = async function(uid, fingerprint) {
    try {
        const devices = await getUserDevices(uid);
        const deviceKeys = Object.keys(devices);
        
        // لو الجهاز مسجل بالفعل
        if (deviceKeys.includes(fingerprint)) {
            await firebase.database().ref('mizan_users/' + uid + '/devices/' + fingerprint).update({
                lastSeen: new Date().toISOString()
            });
            return { success: true, message: 'device_exists' };
        }
        
        // لو عدد الأجهزة وصل الحد الأقصى
        if (deviceKeys.length >= MAX_DEVICES_PER_USER) {
            return {
                success: false,
                message: 'max_devices_reached',
                maxDevices: MAX_DEVICES_PER_USER,
                currentDevices: deviceKeys.length
            };
        }
        
        // تسجيل الجهاز الجديد
        const deviceData = {
            fingerprint: fingerprint,
            userAgent: navigator.userAgent || '',
            platform: navigator.platform || '',
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            status: 'approved',
            label: 'جهاز ' + (deviceKeys.length + 1)
        };
        
        await firebase.database().ref('mizan_users/' + uid + '/devices/' + fingerprint).set(deviceData);
        
        // تسجيل الجهاز في الجدول العام
        await firebase.database().ref('mizan_devices/' + fingerprint).set({
            fingerprint: fingerprint,
            uid: uid,
            userAgent: navigator.userAgent || '',
            platform: navigator.platform || '',
            firstSeen: new Date().toISOString(),
            status: 'approved'
        });
        
        return { success: true, message: 'device_registered' };
    } catch (e) {
        console.error('❌ خطأ في تسجيل الجهاز:', e);
        return { success: false, message: 'error', error: e.message };
    }
};

window.removeUserDevice = async function(uid, fingerprint) {
    try {
        await firebase.database().ref('mizan_users/' + uid + '/devices/' + fingerprint).remove();
        await firebase.database().ref('mizan_devices/' + fingerprint).remove();
        console.log('✅ تم إلغاء ترخيص الجهاز');
        return true;
    } catch (e) {
        console.error('❌ خطأ في إلغاء الترخيص:', e);
        return false;
    }
};

window.checkDeviceAuthorized = async function(uid, fingerprint) {
    try {
        const devices = await getUserDevices(uid);
        const deviceKeys = Object.keys(devices);
        
        if (deviceKeys.includes(fingerprint)) {
            return { authorized: true, isNew: false, deviceCount: deviceKeys.length };
        }
        
        const result = await registerUserDevice(uid, fingerprint);
        
        if (result.success) {
            return { authorized: true, isNew: true, deviceCount: deviceKeys.length + 1 };
        } else {
            return { authorized: false, reason: result.message, maxDevices: MAX_DEVICES_PER_USER, deviceCount: deviceKeys.length };
        }
    } catch (e) {
        console.error('❌ خطأ في التحقق من الجهاز:', e);
        return { authorized: false, reason: 'error', error: e.message };
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 4. تسجيل مستخدم جديد
// ═══════════════════════════════════════════════════════════

window.registerNewUser = async function(email, password, userName, companyName) {
    try {
        if (!email || !password) {
            return { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان' };
        }
        if (password.length < 6) {
            return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
        }
        
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const uid = user.uid;
        
        const deviceFingerprint = await getDeviceFingerprint();
        
        await firebase.database().ref('mizan_users/' + uid).set({
            uid: uid,
            email: email,
            name: userName || email.split('@')[0],
            companyName: companyName || 'شركتي',
            createdAt: new Date().toISOString(),
            status: 'active',
            devices: {}
        });
        
        await registerUserDevice(uid, deviceFingerprint);
        
        console.log('✅ تم إنشاء الحساب بنجاح:', uid);
        return { success: true, uid: uid, email: email };
    } catch (e) {
        console.error('❌ خطأ في التسجيل:', e);
        let errorMsg = 'حدث خطأ في التسجيل';
        if (e.code === 'auth/email-already-in-use') errorMsg = 'البريد الإلكتروني مستخدم بالفعل';
        if (e.code === 'auth/invalid-email') errorMsg = 'البريد الإلكتروني غير صحيح';
        if (e.code === 'auth/weak-password') errorMsg = 'كلمة المرور ضعيفة جداً';
        return { success: false, error: errorMsg };
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 5. تسجيل الدخول مع التحقق من الجهاز
// ═══════════════════════════════════════════════════════════

window.loginWithDeviceCheck = async function(email, password) {
    try {
        if (!email || !password) {
            return { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان' };
        }
        
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const uid = user.uid;
        
        const currentFingerprint = await getDeviceFingerprint();
        
        const userSnapshot = await firebase.database().ref('mizan_users/' + uid).once('value');
        if (!userSnapshot.exists()) {
            return { success: false, error: 'بيانات المستخدم غير موجودة' };
        }
        const userData = userSnapshot.val();
        
        if (userData.status === 'blocked') {
            await firebase.auth().signOut();
            return { success: false, error: 'تم حظر حسابك. يرجى التواصل مع الدعم.' };
        }
        
        const deviceCheck = await checkDeviceAuthorized(uid, currentFingerprint);
        
        if (!deviceCheck.authorized) {
            await firebase.auth().signOut();
            
            if (deviceCheck.reason === 'max_devices_reached') {
                return {
                    success: false,
                    error: 'MAX_DEVICES_REACHED',
                    message: 'لقد وصلت للحد الأقصى من الأجهزة المسجلة (3 أجهزة). لإضافة جهاز جديد، يجب إلغاء ترخيص أحد الأجهزة القديمة.',
                    maxDevices: MAX_DEVICES_PER_USER,
                    deviceCount: deviceCheck.deviceCount
                };
            }
            
            return {
                success: false,
                error: 'DEVICE_NOT_AUTHORIZED',
                message: 'حدث خطأ في التحقق من الجهاز.'
            };
        }
        
        console.log('✅ تم تسجيل الدخول بنجاح:', uid, '- أجهزة:', deviceCheck.deviceCount);
        return {
            success: true,
            uid: uid,
            email: email,
            userData: userData,
            isNewDevice: deviceCheck.isNew,
            deviceCount: deviceCheck.deviceCount
        };
    } catch (e) {
        console.error('❌ خطأ في تسجيل الدخول:', e);
        let errorMsg = 'حدث خطأ في تسجيل الدخول';
        if (e.code === 'auth/user-not-found') errorMsg = 'البريد الإلكتروني غير مسجل';
        if (e.code === 'auth/wrong-password') errorMsg = 'كلمة المرور غير صحيحة';
        if (e.code === 'auth/invalid-email') errorMsg = 'البريد الإلكتروني غير صحيح';
        if (e.code === 'auth/invalid-credential') errorMsg = 'بيانات الدخول غير صحيحة';
        if (e.code === 'auth/too-many-requests') errorMsg = 'تم تجاوز عدد المحاولات. حاول لاحقاً';
        return { success: false, error: errorMsg };
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 6. تسجيل الخروج
// ═══════════════════════════════════════════════════════════

window.logoutFromFirebase = async function() {
    try {
        await firebase.auth().signOut();
        console.log('✅ تم تسجيل الخروج');
        return true;
    } catch (e) {
        console.error('❌ خطأ في تسجيل الخروج:', e);
        return false;
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 7. شاشات تسجيل الدخول والتسجيل
// ═══════════════════════════════════════════════════════════

window.showLoginScreen = function() {
    const html = `
        <div class="login-box">
            <div class="logo"><i class="fas fa-scale-balanced"></i></div>
            <h1>الميزان</h1>
            <p class="subtitle">نظام محاسبة ونقاط بيع</p>
            
            <div class="form-group">
                <label>📧 البريد الإلكتروني</label>
                <input type="email" id="loginEmail" placeholder="your@email.com" />
            </div>
            <div class="form-group">
                <label>🔑 كلمة المرور</label>
                <input type="password" id="loginPassword" placeholder="أدخل كلمة المرور..." onkeydown="if(event.key==='Enter') doLogin()" />
            </div>
            
            <button class="btn btn-primary btn-block" onclick="doLogin()">
                <i class="fas fa-unlock"></i> دخول
            </button>
            
            <div class="error-msg" id="loginError"></div>
            
            <div class="hint" style="margin-top:15px;">
                ليس لديك حساب؟
                <a href="javascript:void(0)" onclick="showSignUpScreen()" style="color:#C9A94E;font-weight:700;">إنشاء حساب جديد</a>
            </div>
            
            <div class="device-info" style="margin-top:15px;font-size:10px;color:#5D5D5D;">
                🔒 بصمة الجهاز: <span id="deviceFpDisplay">...</span>
            </div>
        </div>
    `;
    const container = document.getElementById('loginContainer');
    if (container) container.innerHTML = html;
    
    getDeviceFingerprint().then(fp => {
        const el = document.getElementById('deviceFpDisplay');
        if (el) el.textContent = fp;
    });
};

window.showSignUpScreen = function() {
    const html = `
        <div class="login-box">
            <div class="logo"><i class="fas fa-user-plus"></i></div>
            <h1>حساب جديد</h1>
            <p class="subtitle">أنشئ حسابك في الميزان</p>
            
            <div class="form-group">
                <label>📧 البريد الإلكتروني *</label>
                <input type="email" id="signupEmail" placeholder="your@email.com" />
            </div>
            <div class="form-group">
                <label>🔑 كلمة المرور * (6 أحرف على الأقل)</label>
                <input type="password" id="signupPassword" placeholder="••••••••" />
            </div>
            <div class="form-group">
                <label>👤 اسمك</label>
                <input type="text" id="signupName" placeholder="اسمك الكامل" />
            </div>
            <div class="form-group">
                <label>🏢 اسم الشركة</label>
                <input type="text" id="signupCompany" placeholder="اسم شركتك" />
            </div>
            
            <button class="btn btn-success btn-block" onclick="doSignUp()">
                <i class="fas fa-check"></i> إنشاء الحساب
            </button>
            <button class="btn btn-secondary btn-block" onclick="showLoginScreen()" style="margin-top:6px;">
                <i class="fas fa-arrow-right"></i> لدي حساب بالفعل
            </button>
            
            <div class="error-msg" id="signupError"></div>
            
            <div style="margin-top:15px;padding:10px;background:#0D0D0D;border-radius:8px;border:1px solid #3D3D3D;">
                <div style="font-size:11px;color:#A89070;line-height:1.6;">
                    ⚠️ <strong>ملاحظة مهمة:</strong><br>
                    يمكنك استخدام التطبيق على <strong>حتى 3 أجهزة</strong>.<br>
                    أول جهاز سيتم ربطه تلقائياً بهذا الحساب.
                </div>
            </div>
        </div>
    `;
    const container = document.getElementById('loginContainer');
    if (container) container.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// 🔐 8. تنفيذ تسجيل الدخول
// ═══════════════════════════════════════════════════════════

window.doLogin = async function() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const errorEl = document.getElementById('loginError');
    
    if (!email || !password) {
        if (errorEl) { errorEl.textContent = '⚠️ أدخل البريد وكلمة المرور'; errorEl.classList.add('show'); }
        return;
    }
    if (errorEl) errorEl.classList.remove('show');
    
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...'; }
    
    const result = await loginWithDeviceCheck(email, password);
    
    if (result.success) {
        const container = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        if (container) container.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';
        
        if (typeof window.setCurrentUser === 'function') {
            window.setCurrentUser({
                id: result.uid,
                name: result.userData.name || email,
                email: email,
                role: 'admin',
                active: true
            });
        }
        
        setTimeout(() => {
            if (typeof window.navigateTo === 'function') window.navigateTo('dashboard');
            if (typeof window.updateDashboard === 'function') window.updateDashboard();
        }, 500);
        
        let msg = '🔓 مرحباً ' + (result.userData.name || email);
        if (result.isNewDevice) {
            msg += ' — تم ربط جهازك رقم ' + result.deviceCount + ' من 3';
        }
        if (typeof showToast === 'function') showToast(msg, 'success');
        
    } else if (result.error === 'MAX_DEVICES_REACHED') {
        showMaxDevicesScreen(result.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-unlock"></i> دخول'; }
    } else if (result.error === 'DEVICE_NOT_AUTHORIZED') {
        showDeviceMismatchScreen(result.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-unlock"></i> دخول'; }
    } else {
        if (errorEl) {
            errorEl.textContent = '❌ ' + result.error;
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 4000);
        }
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-unlock"></i> دخول'; }
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 9. تنفيذ إنشاء حساب
// ═══════════════════════════════════════════════════════════

window.doSignUp = async function() {
    const email = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;
    const userName = document.getElementById('signupName')?.value.trim();
    const companyName = document.getElementById('signupCompany')?.value.trim();
    const errorEl = document.getElementById('signupError');
    
    if (!email || !password) {
        if (errorEl) { errorEl.textContent = '⚠️ أدخل البريد وكلمة المرور'; errorEl.classList.add('show'); }
        return;
    }
    if (errorEl) errorEl.classList.remove('show');
    
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...'; }
    
    const result = await registerNewUser(email, password, userName, companyName);
    
    if (result.success) {
        if (typeof showToast === 'function') showToast('✅ تم إنشاء الحساب. جاري تسجيل الدخول...', 'success');
        setTimeout(() => doLogin(), 1000);
    } else {
        if (errorEl) {
            errorEl.textContent = '❌ ' + result.error;
            errorEl.classList.add('show');
            setTimeout(() => errorEl.classList.remove('show'), 4000);
        }
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> إنشاء الحساب'; }
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 10. شاشة "جهاز غير مصرح"
// ═══════════════════════════════════════════════════════════

window.showDeviceMismatchScreen = function(message) {
    const html = `
        <div class="login-box" style="border-color:#E06060;">
            <div class="logo" style="color:#E06060;"><i class="fas fa-shield-alt"></i></div>
            <h1 style="color:#E06060;">جهاز غير مصرح</h1>
            <p class="subtitle">هذا الحساب مسجل على جهاز آخر</p>
            
            <div style="background:#1A0D0D;border:2px solid #E06060;border-radius:10px;padding:15px;margin:15px 0;">
                <div style="font-size:13px;color:#F5E6C8;line-height:1.7;text-align:center;">
                    ${message || 'حدث خطأ في التحقق من الجهاز.'}
                </div>
            </div>
            
            <div style="background:#0D0D0D;border-radius:8px;padding:12px;margin:10px 0;border:1px solid #3D3D3D;">
                <div style="font-size:11px;color:#A89070;margin-bottom:5px;">🔒 بصمة هذا الجهاز:</div>
                <div style="font-size:11px;color:#C9A94E;font-family:monospace;word-break:break-all;" id="mismatchFp">...</div>
            </div>
            
            <button class="btn btn-primary btn-block" onclick="showLoginScreen()">
                <i class="fas fa-arrow-right"></i> رجوع لتسجيل الدخول
            </button>
            <button class="btn btn-danger btn-block" onclick="logoutFromFirebase().then(()=>showLoginScreen())" style="margin-top:6px;">
                <i class="fas fa-sign-out-alt"></i> تسجيل خروج
            </button>
        </div>
    `;
    const container = document.getElementById('loginContainer');
    if (container) {
        container.classList.remove('hidden');
        container.innerHTML = html;
    }
    const appContent = document.getElementById('appContent');
    if (appContent) appContent.style.display = 'none';
    
    getDeviceFingerprint().then(fp => {
        const el = document.getElementById('mismatchFp');
        if (el) el.textContent = fp;
    });
};

// ═══════════════════════════════════════════════════════════
// 🔐 11. شاشة "وصلت للحد الأقصى من الأجهزة"
// ═══════════════════════════════════════════════════════════

window.showMaxDevicesScreen = function(message) {
    const html = `
        <div class="login-box" style="border-color:#E6A830;">
            <div class="logo" style="color:#E6A830;"><i class="fas fa-mobile-alt"></i></div>
            <h1 style="color:#E6A830;">وصلت للحد الأقصى</h1>
            <p class="subtitle">لا يمكن إضافة المزيد من الأجهزة</p>
            
            <div style="background:#1A150D;border:2px solid #E6A830;border-radius:10px;padding:15px;margin:15px 0;">
                <div style="font-size:13px;color:#F5E6C8;line-height:1.7;text-align:center;">
                    ${message || 'لقد وصلت للحد الأقصى من الأجهزة المسجلة (3 أجهزة).'}
                </div>
            </div>
            
            <div style="background:#0D0D0D;border-radius:8px;padding:12px;margin:10px 0;border:1px solid #3D3D3D;">
                <div style="font-size:11px;color:#A89070;margin-bottom:5px;">💡 للحل:</div>
                <div style="font-size:11px;color:#F5E6C8;line-height:1.7;">
                    1. سجّل دخول من أحد الأجهزة القديمة.<br>
                    2. اذهب إلى "الإعدادات" → "الأجهزة المسجلة".<br>
                    3. احذف أحد الأجهزة القديمة.<br>
                    4. أعد المحاولة هنا.
                </div>
            </div>
            
            <div style="background:#0D0D0D;border-radius:8px;padding:12px;margin:10px 0;border:1px solid #3D3D3D;">
                <div style="font-size:11px;color:#A89070;margin-bottom:5px;">🔒 بصمة هذا الجهاز:</div>
                <div style="font-size:11px;color:#C9A94E;font-family:monospace;word-break:break-all;" id="maxDevicesFp">...</div>
            </div>
            
            <button class="btn btn-primary btn-block" onclick="showLoginScreen()">
                <i class="fas fa-arrow-right"></i> رجوع لتسجيل الدخول
            </button>
            <button class="btn btn-danger btn-block" onclick="logoutFromFirebase().then(()=>showLoginScreen())" style="margin-top:6px;">
                <i class="fas fa-sign-out-alt"></i> تسجيل خروج
            </button>
        </div>
    `;
    const container = document.getElementById('loginContainer');
    if (container) {
        container.classList.remove('hidden');
        container.innerHTML = html;
    }
    const appContent = document.getElementById('appContent');
    if (appContent) appContent.style.display = 'none';
    
    getDeviceFingerprint().then(fp => {
        const el = document.getElementById('maxDevicesFp');
        if (el) el.textContent = fp;
    });
};

// ═══════════════════════════════════════════════════════════
// 🔐 12. مراقبة حالة تسجيل الدخول
// ═══════════════════════════════════════════════════════════

window.initAuthListener = function() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.warn('⚠️ Firebase Auth غير متاح');
        return;
    }
    
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
            console.log('✅ مستخدم مسجل:', user.email);
            
            const currentFp = await getDeviceFingerprint();
            
            try {
                const snapshot = await firebase.database().ref('mizan_users/' + user.uid).once('value');
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    
                    const deviceCheck = await checkDeviceAuthorized(user.uid, currentFp);
                    
                    if (!deviceCheck.authorized) {
                        await firebase.auth().signOut();
                        if (deviceCheck.reason === 'max_devices_reached') {
                            showMaxDevicesScreen('لقد وصلت للحد الأقصى من الأجهزة المسجلة (3 أجهزة).');
                        } else {
                            showDeviceMismatchScreen('حدث خطأ في التحقق من الجهاز.');
                        }
                        return;
                    }
                    
                    const container = document.getElementById('loginContainer');
                    const appContent = document.getElementById('appContent');
                    if (container) container.classList.add('hidden');
                    if (appContent) appContent.style.display = 'block';
                    
                    if (typeof window.setCurrentUser === 'function') {
                        window.setCurrentUser({
                            id: user.uid,
                            name: userData.name || user.email,
                            email: user.email,
                            role: 'admin',
                            active: true
                        });
                    }
                }
            } catch (e) {
                console.warn('⚠️ خطأ في التحقق:', e);
            }
        } else {
            console.log('ℹ️ لا يوجد مستخدم مسجل');
        }
    });
};

// ═══════════════════════════════════════════════════════════
// 🔐 13. لوحة إدارة الأجهزة (للمدير)
// ═══════════════════════════════════════════════════════════

window.showDevicesManager = async function() {
    if (!window.currentUser) {
        showToast('⚠️ يرجى تسجيل الدخول أولاً', 'error');
        return;
    }
    
    const uid = window.currentUser.id;
    const devices = await getUserDevices(uid);
    const deviceKeys = Object.keys(devices);
    const currentFp = await getDeviceFingerprint();
    
    let devicesHtml = '';
    if (deviceKeys.length === 0) {
        devicesHtml = '<div class="empty-state"><i class="fas fa-mobile-alt"></i><span>لا توجد أجهزة مسجلة</span></div>';
    } else {
        deviceKeys.forEach((fp, index) => {
            const device = devices[fp];
            const isCurrent = fp === currentFp;
            const lastSeen = device.lastSeen ? new Date(device.lastSeen).toLocaleString('ar-EG') : 'غير معروف';
            
            devicesHtml += `
                <div class="device-card ${isCurrent ? 'current' : ''}">
                    <div class="device-icon">
                        <i class="fas ${device.platform && device.platform.includes('Win') ? 'fa-desktop' : 'fa-mobile-alt'}"></i>
                    </div>
                    <div class="device-info">
                        <div class="device-label">
                            ${device.label || 'جهاز ' + (index + 1)}
                            ${isCurrent ? '<span class="current-badge">الحالي</span>' : ''}
                        </div>
                        <div class="device-detail">
                            <div>🖥️ ${device.platform || 'غير معروف'}</div>
                            <div>📅 آخر ظهور: ${lastSeen}</div>
                            <div class="device-fp">🔒 ${fp.substring(0, 16)}...</div>
                        </div>
                    </div>
                    <div class="device-actions">
                        ${!isCurrent ? `
                            <button class="btn btn-danger btn-sm" onclick="removeDeviceFromManager('${fp}')">
                                <i class="fas fa-trash"></i> حذف
                            </button>
                        ` : '<span class="current-tag">لا يمكن حذف الجهاز الحالي</span>'}
                    </div>
                </div>
            `;
        });
    }
    
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📱 الأجهزة المسجلة</h3>
        
        <div class="devices-summary">
            <div class="summary-item">
                <div class="summary-value">${deviceKeys.length}</div>
                <div class="summary-label">أجهزة مسجلة</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${MAX_DEVICES_PER_USER}</div>
                <div class="summary-label">الحد الأقصى</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${MAX_DEVICES_PER_USER - deviceKeys.length}</div>
                <div class="summary-label">متبقي</div>
            </div>
        </div>
        
        <div class="devices-list">
            ${devicesHtml}
        </div>
        
        <div class="devices-note">
            💡 <strong>ملاحظة:</strong> يمكنك استخدام التطبيق على حتى ${MAX_DEVICES_PER_USER} أجهزة. 
            عند حذف جهاز، سيتم إلغاء ترخيصه ولن يستطيع الدخول.
        </div>
        
        <div style="display:flex;gap:6px;margin-top:12px;">
            <button class="btn btn-secondary btn-block" onclick="closeModal()">
                <i class="fas fa-times"></i> إغلاق
            </button>
        </div>
    `;
    if (typeof openModal === 'function') openModal(html);
};

window.removeDeviceFromManager = async function(fingerprint) {
    if (!window.currentUser) return;
    
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الجهاز؟ سيتم إلغاء ترخيصه ولن يستطيع الدخول.')) return;
    
    const success = await removeUserDevice(window.currentUser.id, fingerprint);
    
    if (success) {
        showToast('✅ تم حذف الجهاز بنجاح', 'success');
        setTimeout(() => showDevicesManager(), 500);
    } else {
        showToast('❌ فشل حذف الجهاز', 'error');
    }
};

console.log('✅ تم تحميل app-security.js بنجاح (نظام متقدم - بدون تحذيرات)');
