// ============================================================
// الميزان 14.0.0 - نظام الحماية والأمان
// app-security.js (جديد)
// ============================================================

console.log('🔒 تحميل app-security.js - نظام الحماية');

// ═══════════════════════════════════════════════════════════
// 🔐 1. دوال بصمة الجهاز (Device Fingerprint)
// ═══════════════════════════════════════════════════════════

window.hashString = async function(str) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        // fallback: hash بسيط
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
};

window.getDeviceFingerprint = async function() {
    try {
        const data = [
            navigator.userAgent || '',
            navigator.language || '',
            (screen.width || 0) + 'x' + (screen.height || 0),
            screen.colorDepth || 0,
            new Date().getTimezoneOffset() || 0,
            navigator.hardwareConcurrency || 0,
            navigator.platform || '',
            navigator.deviceMemory || 0,
            screen.availWidth || 0,
            screen.availHeight || 0
        ].join('|');
        
        const fullHash = await hashString(data);
        return fullHash.substring(0, 32).toUpperCase();
    } catch (e) {
        console.warn('⚠️ خطأ في توليد بصمة الجهاز:', e);
        return 'UNKNOWN_DEVICE';
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 2. تسجيل مستخدم جديد (Sign Up)
// ═══════════════════════════════════════════════════════════

window.registerNewUser = async function(email, password, userName, companyName) {
    try {
        if (!email || !password) {
            return { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان' };
        }
        if (password.length < 6) {
            return { success: false, error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
        }
        
        // 1. إنشاء الحساب في Firebase Authentication
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const uid = user.uid;
        
        // 2. الحصول على بصمة الجهاز
        const deviceFingerprint = await getDeviceFingerprint();
        
        // 3. حفظ بيانات المستخدم في Realtime Database
        await firebase.database().ref('mizan_users/' + uid).set({
            uid: uid,
            email: email,
            name: userName || email.split('@')[0],
            companyName: companyName || 'شركتي',
            createdAt: new Date().toISOString(),
            deviceFingerprint: deviceFingerprint,
            status: 'active'
        });
        
        // 4. تسجيل الجهاز
        await firebase.database().ref('mizan_devices/' + deviceFingerprint).set({
            fingerprint: deviceFingerprint,
            uid: uid,
            email: email,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            firstSeen: new Date().toISOString(),
            status: 'approved'
        });
        
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
// 🔐 3. تسجيل الدخول (Sign In) مع التحقق من الجهاز
// ═══════════════════════════════════════════════════════════

window.loginWithDeviceCheck = async function(email, password) {
    try {
        if (!email || !password) {
            return { success: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان' };
        }
        
        // 1. تسجيل الدخول في Firebase Authentication
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        const uid = user.uid;
        
        // 2. الحصول على بصمة الجهاز الحالي
        const currentFingerprint = await getDeviceFingerprint();
        
        // 3. قراءة بيانات المستخدم من Firebase
        const userSnapshot = await firebase.database().ref('mizan_users/' + uid).once('value');
        if (!userSnapshot.exists()) {
            return { success: false, error: 'بيانات المستخدم غير موجودة' };
        }
        const userData = userSnapshot.val();
        
        // 4. التحقق من حالة المستخدم
        if (userData.status === 'blocked') {
            await firebase.auth().signOut();
            return { success: false, error: 'تم حظر حسابك. يرجى التواصل مع الدعم.' };
        }
        
        // 5. التحقق من بصمة الجهاز
        if (userData.deviceFingerprint !== currentFingerprint) {
            // جهاز مختلف!
            await firebase.auth().signOut();
            return {
                success: false,
                error: 'DEVICE_MISMATCH',
                message: 'هذا الحساب مسجل على جهاز آخر. يرجى تسجيل الدخول من الجهاز المسجل.'
            };
        }
        
        console.log('✅ تم تسجيل الدخول بنجاح:', uid);
        return { success: true, uid: uid, email: email, userData: userData };
        
    } catch (e) {
        console.error('❌ خطأ في تسجيل الدخول:', e);
        let errorMsg = 'حدث خطأ في تسجيل الدخول';
        if (e.code === 'auth/user-not-found') errorMsg = 'البريد الإلكتروني غير مسجل';
        if (e.code === 'auth/wrong-password') errorMsg = 'كلمة المرور غير صحيحة';
        if (e.code === 'auth/invalid-email') errorMsg = 'البريد الإلكتروني غير صحيح';
        if (e.code === 'auth/too-many-requests') errorMsg = 'تم تجاوز عدد المحاولات. حاول لاحقاً';
        return { success: false, error: errorMsg };
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 4. تسجيل الخروج
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
// 🔐 5. شاشة تسجيل الدخول الجديدة
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
            
            <div class="error-msg" id="loginError">❌ بيانات الدخول غير صحيحة</div>
            
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
    
    // عرض بصمة الجهاز
    getDeviceFingerprint().then(fp => {
        const el = document.getElementById('deviceFpDisplay');
        if (el) el.textContent = fp;
    });
};

// ═══════════════════════════════════════════════════════════
// 🔐 6. شاشة إنشاء حساب جديد
// ═══════════════════════════════════════════════════════════

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
                    سيتم ربط حسابك بالجهاز الحالي فقط.<br>
                    لن تستطيع تسجيل الدخول من جهاز آخر.
                </div>
            </div>
        </div>
    `;
    const container = document.getElementById('loginContainer');
    if (container) container.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// 🔐 7. تنفيذ تسجيل الدخول
// ═══════════════════════════════════════════════════════════

window.doLogin = async function() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const errorEl = document.getElementById('loginError');
    
    if (!email || !password) {
        if (errorEl) { errorEl.textContent = '⚠️ أدخل البريد وكلمة المرور'; errorEl.classList.add('show'); }
        return;
    }
    
    if (errorEl) { errorEl.classList.remove('show'); }
    
    // زر التحميل
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...'; }
    
    const result = await loginWithDeviceCheck(email, password);
    
    if (result.success) {
        console.log('✅ تم تسجيل الدخول');
        // إخفاء شاشة الدخول
        const container = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        if (container) container.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';
        
        // تحديث بيانات المستخدم
        if (typeof window.setCurrentUser === 'function') {
            window.setCurrentUser({
                id: result.uid,
                name: result.userData.name || email,
                email: email,
                role: 'admin',
                active: true
            });
        }
        
        // إعادة تحميل التطبيق
        setTimeout(() => {
            if (typeof window.navigateTo === 'function') window.navigateTo('dashboard');
            if (typeof window.updateDashboard === 'function') window.updateDashboard();
        }, 500);
        
        if (typeof showToast === 'function') showToast('🔓 مرحباً ' + (result.userData.name || email), 'success');
        
    } else {
        if (result.error === 'DEVICE_MISMATCH') {
            showDeviceMismatchScreen(result.message);
        } else {
            if (errorEl) {
                errorEl.textContent = '❌ ' + result.error;
                errorEl.classList.add('show');
                setTimeout(() => errorEl.classList.remove('show'), 4000);
            }
        }
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-unlock"></i> دخول'; }
    }
};

// ═══════════════════════════════════════════════════════════
// 🔐 8. تنفيذ إنشاء حساب
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
    
    if (errorEl) { errorEl.classList.remove('show'); }
    
    const btn = event?.target;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...'; }
    
    const result = await registerNewUser(email, password, userName, companyName);
    
    if (result.success) {
        if (typeof showToast === 'function') showToast('✅ تم إنشاء الحساب. جاري تسجيل الدخول...', 'success');
        // تسجيل الدخول تلقائياً
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
// 🔐 9. شاشة "الجهاز غير مصرح"
// ═══════════════════════════════════════════════════════════

window.showDeviceMismatchScreen = function(message) {
    const html = `
        <div class="login-box" style="border-color:#E06060;">
            <div class="logo" style="color:#E06060;"><i class="fas fa-shield-alt"></i></div>
            <h1 style="color:#E06060;">جهاز غير مصرح</h1>
            <p class="subtitle">هذا الحساب مسجل على جهاز آخر</p>
            
            <div style="background:#1A0D0D;border:2px solid #E06060;border-radius:10px;padding:15px;margin:15px 0;">
                <div style="font-size:13px;color:#F5E6C8;line-height:1.7;text-align:center;">
                    ${message || 'هذا الحساب مرتبط بجهاز واحد فقط. لاستخدام التطبيق على هذا الجهاز، يرجى التواصل مع الدعم لإلغاء ربط الجهاز السابق.'}
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
    
    // عرض بصمة الجهاز
    getDeviceFingerprint().then(fp => {
        const el = document.getElementById('mismatchFp');
        if (el) el.textContent = fp;
    });
};

// ═══════════════════════════════════════════════════════════
// 🔐 10. مراقبة حالة تسجيل الدخول
// ═══════════════════════════════════════════════════════════

window.initAuthListener = function() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
        console.warn('⚠️ Firebase Auth غير متاح');
        return;
    }
    
    firebase.auth().onAuthStateChanged(async function(user) {
        if (user) {
            console.log('✅ مستخدم مسجل:', user.email);
            
            // التحقق من بصمة الجهاز
            const currentFp = await getDeviceFingerprint();
            try {
                const snapshot = await firebase.database().ref('mizan_users/' + user.uid).once('value');
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    if (userData.deviceFingerprint && userData.deviceFingerprint !== currentFp) {
                        console.warn('⚠️ الجهاز مختلف!');
                        await firebase.auth().signOut();
                        showDeviceMismatchScreen('هذا الحساب مسجل على جهاز آخر. يرجى تسجيل الدخول من الجهاز الأصلي.');
                        return;
                    }
                    // إخفاء شاشة الدخول وإظهار التطبيق
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

console.log('✅ تم تحميل app-security.js بنجاح');
