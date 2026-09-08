// ================================================================
// firebase.js - تهيئة Firebase
// ================================================================

// ================================================================
// FIREBASE CONFIG
// ================================================================
const firebaseConfig = {
    apiKey: "AIzaSyCP7vpqviR6A11gPkC7cO6MQJBGKWcnVWE",
    authDomain: "accounting-balance-ab9d3.firebaseapp.com",
    databaseURL: "https://accounting-balance-ab9d3-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "accounting-balance-ab9d3",
    storageBucket: "accounting-balance-ab9d3.firebasestorage.app",
    messagingSenderId: "564321427560",
    appId: "1:564321427560:web:ae44d18b626ad2e5771bdd",
    measurementId: "G-MGT87N4TG4"
};

// ================================================================
// INIT FIREBASE
// ================================================================
let firebaseInitialized = false;

function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.warn('⚠️ Firebase library not loaded');
        return false;
    }

    try {
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        firebaseInitialized = true;
        console.log('✅ Firebase initialized successfully');
        return true;
    } catch (e) {
        console.error('❌ Firebase init error:', e);
        firebaseInitialized = false;
        return false;
    }
}

// ================================================================
// GET FIREBASE INSTANCE
// ================================================================
function getFirebase() {
    if (!firebaseInitialized) {
        initFirebase();
    }
    return firebaseInitialized ? firebase : null;
}

// ================================================================
// GET DATABASE REF
// ================================================================
function getDatabaseRef(path) {
    const fb = getFirebase();
    if (!fb) return null;
    try {
        return fb.database().ref(path);
    } catch(e) {
        console.warn('⚠️ Cannot get database ref:', e);
        return null;
    }
}

// ================================================================
// CHECK FIREBASE CONNECTION
// ================================================================
function checkFirebaseConnection() {
    const ref = getDatabaseRef('.info/connected');
    if (!ref) return Promise.resolve(false);

    return ref.once('value')
        .then(snapshot => snapshot.val() || false)
        .catch(() => false);
}

// ================================================================
// SYNC DATA TO FIREBASE
// ================================================================
function syncToFirebase() {
    const ref = getDatabaseRef('mizan_app_data');
    if (!ref) {
        showToast('⚠️ Firebase غير متصل', 'warning');
        return;
    }

    const data = getBackupData();
    ref.set(data)
        .then(() => {
            showToast('☁️ تم رفع البيانات للسحابة بنجاح', 'success');
            if (typeof addAuditLog === 'function') {
                addAuditLog('sync', 'backup', 'رفع البيانات للسحابة');
            }
            const badge = document.getElementById('headerBadge');
            if (badge) {
                badge.textContent = '☁️ تم المزامنة';
                badge.className = 'badge synced';
                setTimeout(() => {
                    badge.textContent = '☁️ مزامنة';
                    badge.className = 'badge';
                }, 3000);
            }
        })
        .catch((error) => {
            console.error('Firebase sync error:', error);
            showToast('❌ فشل رفع البيانات: ' + error.message, 'error');
        });
}

// ================================================================
// SYNC FROM FIREBASE
// ================================================================
function syncFromFirebase() {
    const ref = getDatabaseRef('mizan_app_data');
    if (!ref) {
        showToast('⚠️ Firebase غير متصل', 'warning');
        return;
    }

    const badge = document.getElementById('headerBadge');
    if (badge) {
        badge.textContent = '⏳ جلب...';
        badge.className = 'badge syncing';
    }

    ref.get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (data && typeof data === 'object') {
                    applySyncData(data);
                    showToast('📥 تم جلب البيانات من السحابة بنجاح', 'success');
                    if (typeof addAuditLog === 'function') {
                        addAuditLog('sync', 'backup', 'جلب البيانات من السحابة');
                    }
                    if (badge) {
                        badge.textContent = '☁️ تم الجلب';
                        badge.className = 'badge synced';
                        setTimeout(() => {
                            badge.textContent = '☁️ مزامنة';
                            badge.className = 'badge';
                        }, 3000);
                    }
                } else {
                    showToast('⚠️ بيانات غير مكتملة في السحابة', 'warning');
                }
            } else {
                showToast('⚠️ لا توجد بيانات في السحابة', 'warning');
                if (badge) {
                    badge.textContent = '⚠️ لا توجد';
                    badge.className = 'badge';
                    setTimeout(() => {
                        badge.textContent = '☁️ مزامنة';
                        badge.className = 'badge';
                    }, 3000);
                }
            }
        })
        .catch((error) => {
            console.error('Firebase get error:', error);
            showToast('❌ فشل جلب البيانات: ' + error.message, 'error');
            if (badge) {
                badge.textContent = '❌ فشل';
                badge.className = 'badge';
                setTimeout(() => {
                    badge.textContent = '☁️ مزامنة';
                    badge.className = 'badge';
                }, 3000);
            }
        });
}

// ================================================================
// APPLY SYNC DATA
// ================================================================
function applySyncData(data) {
    if (!data) return;

    const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
        'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
        'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'
    ];

    keys.forEach(k => {
        if (data[k] !== undefined) {
            window[k] = data[k];
            setData(k, data[k]);
        }
    });

    if (data.users) {
        window.users = data.users;
        setData('users', data.users);
    }

    if (data.currentUser) {
        window.currentUser = data.currentUser;
        localStorage.setItem('mizan_current_user', JSON.stringify(window.currentUser));
    }

    if (typeof refreshAllPages === 'function') refreshAllPages();
}