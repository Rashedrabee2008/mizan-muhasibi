// ================================================================
// FIREBASE - تهيئة Firebase
// ================================================================

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCP7vpqviR6A11gPkC7cO6MQJBGKWcnVWE",
  authDomain: "accounting-balance-ab9d3.firebaseapp.com",
  databaseURL: "https://accounting-balance-ab9d3-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "accounting-balance-ab9d3",
  storageBucket: "accounting-balance-ab9d3.firebasestorage.app",
  messagingSenderId: "564321427560",
  appId: "1:564321427560:web:170368d708c4d9dd771bdd",
  measurementId: "G-D6K2GYLBKD"
};

// تهيئة Firebase (Compat SDK)
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// مفتاح التخزين في Firebase
const SYNC_KEY = 'mizan_app_data';

// ================================================================
// دوال Firebase
// ================================================================

/**
 * رفع البيانات إلى Firebase
 */
function syncToFirebase() {
  const badge = document.getElementById('headerBadge');
  if (!badge) return;
  
  badge.textContent = '⏳ جاري...';
  badge.className = 'badge syncing';

  try {
    const data = getSyncData();
    database.ref(SYNC_KEY).set(data)
      .then(() => {
        badge.textContent = '☁️ تم المزامنة';
        badge.className = 'badge synced';
        showToast('☁️ تم رفع البيانات للسحابة', 'success');
        addAuditLog('add', 'sync', 'رفع البيانات للسحابة');
        setTimeout(() => {
          badge.textContent = '☁️ مزامنة';
          badge.className = 'badge';
        }, 3000);
      })
      .catch((error) => {
        console.error('Firebase sync error:', error);
        badge.textContent = '❌ فشل';
        badge.className = 'badge';
        showToast('❌ فشل رفع البيانات: ' + error.message, 'error');
        setTimeout(() => {
          badge.textContent = '☁️ مزامنة';
          badge.className = 'badge';
        }, 3000);
      });
  } catch (error) {
    console.error('Sync error:', error);
    badge.textContent = '❌ فشل';
    badge.className = 'badge';
    showToast('❌ فشل رفع البيانات', 'error');
    setTimeout(() => {
      badge.textContent = '☁️ مزامنة';
      badge.className = 'badge';
    }, 3000);
  }
}

/**
 * جلب البيانات من Firebase
 */
function syncFromFirebase() {
  const badge = document.getElementById('headerBadge');
  if (!badge) return;
  
  badge.textContent = '⏳ جلب...';
  badge.className = 'badge syncing';

  database.ref(SYNC_KEY).get()
    .then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data && typeof data === 'object' && data.products !== undefined) {
          applySyncData(data);
          badge.textContent = '☁️ تم الجلب';
          badge.className = 'badge synced';
          showToast('📥 تم جلب البيانات من السحابة', 'success');
          addAuditLog('add', 'sync', 'جلب البيانات من السحابة');
          setTimeout(() => {
            badge.textContent = '☁️ مزامنة';
            badge.className = 'badge';
          }, 3000);
        } else {
          showToast('⚠️ بيانات غير مكتملة في السحابة', 'warning');
          badge.textContent = '⚠️ غير مكتملة';
          badge.className = 'badge';
          setTimeout(() => {
            badge.textContent = '☁️ مزامنة';
            badge.className = 'badge';
          }, 3000);
        }
      } else {
        showToast('⚠️ لا توجد بيانات في السحابة', 'warning');
        badge.textContent = '⚠️ لا توجد';
        badge.className = 'badge';
        setTimeout(() => {
          badge.textContent = '☁️ مزامنة';
          badge.className = 'badge';
        }, 3000);
      }
    })
    .catch((error) => {
      console.error('Firebase get error:', error);
      badge.textContent = '❌ فشل';
      badge.className = 'badge';
      showToast('❌ فشل جلب البيانات: ' + error.message, 'error');
      setTimeout(() => {
        badge.textContent = '☁️ مزامنة';
        badge.className = 'badge';
      }, 3000);
    });
}

/**
 * الحصول على بيانات التطبيق للتزامن
 */
function getSyncData() {
  return {
    products,
    customers,
    suppliers,
    purchases,
    sales,
    returns,
    expenses,
    treasury,
    bonds,
    warehouses,
    warehouseProducts,
    permissions,
    companyData,
    backups,
    accounts,
    auditLog,
    alerts,
    cashierHistory,
    inventoryAdjustments,
    users,
    currentUser,
    updatedAt: new Date().toISOString()
  };
}

/**
 * تطبيق البيانات المسترجعة من Firebase
 */
function applySyncData(data) {
  if (!data) return;
  
  const keys = ['products', 'customers', 'suppliers', 'purchases', 'sales', 'returns', 'expenses',
    'treasury', 'bonds', 'warehouses', 'warehouseProducts', 'permissions', 'companyData',
    'backups', 'accounts', 'auditLog', 'alerts', 'cashierHistory', 'inventoryAdjustments'
  ];
  
  keys.forEach(k => {
    if (data[k] !== undefined) {
      if (k === 'products') products = data[k];
      else if (k === 'customers') customers = data[k];
      else if (k === 'suppliers') suppliers = data[k];
      else if (k === 'purchases') purchases = data[k];
      else if (k === 'sales') sales = data[k];
      else if (k === 'returns') returns = data[k];
      else if (k === 'expenses') expenses = data[k];
      else if (k === 'treasury') treasury = data[k];
      else if (k === 'bonds') bonds = data[k];
      else if (k === 'warehouses') warehouses = data[k];
      else if (k === 'warehouseProducts') warehouseProducts = data[k];
      else if (k === 'permissions') permissions = data[k];
      else if (k === 'companyData') companyData = data[k] || {};
      else if (k === 'backups') backups = data[k];
      else if (k === 'accounts') accounts = data[k];
      else if (k === 'auditLog') auditLog = data[k];
      else if (k === 'alerts') alerts = data[k];
      else if (k === 'cashierHistory') cashierHistory = data[k] || [];
      else if (k === 'inventoryAdjustments') inventoryAdjustments = data[k] || [];
      
      localStorage.setItem('mizan_' + k, JSON.stringify(data[k]));
    }
  });
  
  if (data.users) {
    users = data.users;
    localStorage.setItem('mizan_users', JSON.stringify(users));
  }
  
  if (data.currentUser) {
    currentUser = data.currentUser;
    localStorage.setItem('mizan_current_user', JSON.stringify(currentUser));
  }
  
  refreshAllPages();
  showToast('✅ تم مزامنة البيانات من السحابة', 'success');
}