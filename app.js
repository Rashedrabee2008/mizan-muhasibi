// ================================================================
// app.js - الإصدار النهائي المعدل بالكامل
// ================================================================

// ===== دالة محسنة للتعامل مع العناصر المفقودة =====
function safeSetText(id, value) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.querySelector('.' + id);
    }
    if (!el) {
        el = document.querySelector('[name="' + id + '"]');
    }
    if (el) {
        el.textContent = value;
        return true;
    } else {
        console.warn('⚠️ عنصر غير موجود، تم تخطيه:', id);
        // إنشاء العنصر تلقائياً كحل أخير
        try {
            const container = document.querySelector('.page-content') || document.body;
            const newEl = document.createElement('span');
            newEl.id = id;
            newEl.textContent = value;
            newEl.style.display = 'none';
            container.appendChild(newEl);
            return true;
        } catch (e) {
            return false;
        }
    }
}

// ===== دالة محسنة للتعامل مع القيم =====
function safeSetValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.value = value;
        return true;
    } else {
        console.warn('⚠️ عنصر غير موجود، تم تخطيه:', id);
        return false;
    }
}

// ===== تحديث الإحصائيات - محصن بالكامل =====
function updateStats() {
    // التأكد من وجود البيانات
    ['products', 'customers', 'suppliers', 'sales', 'purchases', 'returns', 'treasury', 'warehouseProducts', 'warehouses']
    .forEach(key => {
        if (!window[key]) window[key] = [];
    });
    
    try {
        // ===== إجمالي المبيعات =====
        let totalSales = 0;
        let salesCount = 0;
        if (window.sales) {
            window.sales.forEach(s => {
                if (s && s.items) {
                    s.items.forEach(item => { totalSales += (item?.total || 0); });
                } else if (s) {
                    totalSales += (s.total || 0);
                }
                salesCount++;
            });
        }
        safeSetText('dashTotalSales', totalSales.toFixed(2));
        safeSetText('dashSalesCount', salesCount + ' فاتورة');

        // ===== إجمالي المشتريات =====
        let totalPurchases = 0;
        let purchasesCount = 0;
        if (window.purchases) {
            window.purchases.forEach(p => {
                if (p && p.items) {
                    p.items.forEach(item => { totalPurchases += (item?.total || 0); });
                } else if (p) {
                    totalPurchases += (p.total || 0);
                }
                purchasesCount++;
            });
        }
        safeSetText('dashTotalPurchases', totalPurchases.toFixed(2));
        safeSetText('dashPurchasesCount', purchasesCount + ' فاتورة');

        // ===== إجمالي المرتجعات =====
        let totalReturns = 0;
        let returnsCount = 0;
        if (window.returns) {
            window.returns.forEach(r => {
                if (r && r.items) {
                    r.items.forEach(item => { totalReturns += (item?.total || 0); });
                } else if (r) {
                    totalReturns += (r.total || 0);
                }
                returnsCount++;
            });
        }
        safeSetText('dashTotalReturns', totalReturns.toFixed(2));
        safeSetText('dashReturnsCount', returnsCount + ' فاتورة');

        // ===== صافي الربح =====
        const profit = totalSales - totalPurchases - totalReturns;
        safeSetText('dashNetProfit', profit.toFixed(2));
        
        const profitEl = document.getElementById('dashNetProfit');
        const profitStatus = document.getElementById('dashProfitStatus');
        if (profitEl) {
            profitEl.style.color = profit >= 0 ? '#2D8F5E' : '#E06060';
        }
        if (profitStatus) {
            profitStatus.textContent = profit >= 0 ? '📈 ربح' : '📉 خسارة';
            profitStatus.style.color = profit >= 0 ? '#2D8F5E' : '#E06060';
        }

        // ===== المنتجات =====
        safeSetText('dashTotalProducts', (window.products || []).length);

        // ===== العملاء =====
        safeSetText('dashTotalCustomers', (window.customers || []).length);

        // ===== الموردين =====
        safeSetText('dashTotalSuppliers', (window.suppliers || []).length + ' مورد');

        // ===== رصيد الخزنة =====
        let treasuryBalance = 0;
        if (window.treasury) {
            window.treasury.forEach(t => {
                if (t && t.type === 'deposit') treasuryBalance += (t.amount || 0);
                else if (t && t.type === 'withdraw') treasuryBalance -= (t.amount || 0);
            });
        }
        safeSetText('dashTreasuryBalance', treasuryBalance.toFixed(2));

        // ===== قيمة المخزون =====
        let totalQty = 0;
        let totalValue = 0;
        if (window.products && window.warehouseProducts) {
            window.products.forEach(p => {
                if (!p) return;
                let qty = 0;
                window.warehouseProducts.forEach(wp => {
                    if (wp && wp.productId === p.id) qty += (wp.qty || 0);
                });
                totalQty += qty;
                totalValue += ((p.sellPrice || 0) * qty);
            });
        }
        safeSetText('dashInventoryQty', totalQty);
        safeSetText('dashInventoryValue', totalValue.toFixed(2));

        // ===== المخزون المنخفض =====
        let lowStock = [];
        if (window.products && window.warehouseProducts) {
            window.products.forEach(p => {
                if (!p) return;
                let total = 0;
                window.warehouseProducts.forEach(wp => {
                    if (wp && wp.productId === p.id) total += (wp.qty || 0);
                });
                if (total <= (p.min || 0)) lowStock.push(p);
            });
        }
        const lowStockEl = document.getElementById('dashLowStock');
        if (lowStockEl) {
            lowStockEl.textContent = lowStock.length > 0 ? `🔴 ${lowStock.length} منتج` : '✅ جميع المنتجات متوفرة';
            lowStockEl.style.color = lowStock.length > 0 ? '#E06060' : '#2D8F5E';
        }

        // ===== مبيعات اليوم =====
        const today = getTodayDate ? getTodayDate() : new Date().toISOString().split('T')[0];
        let todaySales = 0;
        let todayPurchases = 0;
        
        if (window.sales) {
            window.sales.forEach(s => {
                if (s && s.date === today) {
                    const total = s.totalWithTax || s.total || 0;
                    todaySales += total;
                }
            });
        }
        
        if (window.purchases) {
            window.purchases.forEach(p => {
                if (p && p.date === today) {
                    const total = p.totalWithTax || p.total || 0;
                    todayPurchases += total;
                }
            });
        }
        
        safeSetText('dashTodaySales', todaySales.toFixed(2));
        safeSetText('dashTodayPurchases', todayPurchases.toFixed(2));
        
    } catch (e) {
        console.warn('⚠️ خطأ في تحديث الإحصائيات:', e.message);
        // لا نسمح للخطأ بإيقاف التطبيق
    }
}

// ===== التحقق من تسجيل الدخول - آمن بالكامل =====
function checkLogin() {
    const input = document.getElementById('loginPassword');
    const error = document.getElementById('loginError');
    
    if (!input) {
        console.warn('⚠️ عنصر loginPassword غير موجود');
        return;
    }
    
    const enteredPassword = input.value;
    
    // 🔒 التحقق من كلمة المرور دون طباعتها في السجل
    if (enteredPassword === DEFAULT_PASSWORD || enteredPassword === currentPassword) {
        const loginContainer = document.getElementById('loginContainer');
        const appContent = document.getElementById('appContent');
        
        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContent) appContent.style.display = 'block';
        if (error) error.classList.remove('show');
        
        input.value = '';
        localStorage.setItem('app_unlocked', 'true');

        showToast('🔓 مرحباً بك في الميزان!', 'success');

        setTimeout(() => {
            try {
                if (typeof seedData === 'function') seedData();
                if (typeof populateAllSelects === 'function') populateAllSelects();
                if (typeof refreshAllPages === 'function') refreshAllPages();
                if (typeof startAutoBackup === 'function') startAutoBackup();
                if (typeof updateUIByPermissions === 'function') updateUIByPermissions();
                if (typeof updateClock === 'function') updateClock();
                if (typeof syncFromFirebase === 'function') syncFromFirebase();
            } catch (e) {
                console.warn('⚠️ خطأ في تهيئة التطبيق:', e.message);
            }
        }, 300);
    } else {
        if (error) error.classList.add('show');
        input.value = '';
        input.focus();
        setTimeout(() => {
            if (error) error.classList.remove('show');
        }, 3000);
    }
}

// ===== التهيئة الرئيسية - محصنة بالكامل =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 بدء تشغيل الميزان v3.0.0');
    
    try {
        // تهيئة البيانات
        if (typeof initData === 'function') initData();
        if (typeof seedData === 'function') seedData();
        
        // تفعيل الترخيص
        if (typeof activateDemoLicense === 'function') {
            activateDemoLicense();
            console.log('✅ تم تفعيل الترخيص التجريبي');
        }
        
        // تحديث الواجهة
        if (typeof refreshAllPages === 'function') {
            refreshAllPages();
            console.log('✅ تم تحديث جميع الصفحات');
        }
        
        // التحقق من حالة القفل
        if (localStorage.getItem('app_unlocked') === 'true') {
            const loginContainer = document.getElementById('loginContainer');
            const appContent = document.getElementById('appContent');
            if (loginContainer) loginContainer.classList.add('hidden');
            if (appContent) appContent.style.display = 'block';
            
            setTimeout(() => {
                try {
                    if (typeof populateAllSelects === 'function') populateAllSelects();
                    if (typeof refreshAllPages === 'function') refreshAllPages();
                    if (typeof startAutoBackup === 'function') startAutoBackup();
                    if (typeof syncFromFirebase === 'function') syncFromFirebase();
                    if (typeof updateUIByPermissions === 'function') updateUIByPermissions();
                    if (typeof updateClock === 'function') updateClock();
                } catch (e) {
                    console.warn('⚠️ خطأ في التهيئة:', e.message);
                }
            }, 300);
        }
        
        console.log('✅ الميزان جاهز للاستخدام');
        console.log('🔒 كلمة المرور: 123456');
        console.log('🔑 اضغط 5 مرات على رقم الإصدار في الإعدادات لتفعيل زر توليد المفاتيح');
        
    } catch (e) {
        console.error('❌ خطأ فادح في التهيئة:', e.message);
        showToast('⚠️ حدث خطأ في تهيئة التطبيق، يرجى تحديث الصفحة', 'error');
    }
});

// ===== معالج الأخطاء العالمي =====
window.addEventListener('error', function(e) {
    console.error('⚠️ خطأ غير متوقع:', e.message);
    // عرض رسالة للمستخدم دون إيقاف التطبيق
    showToast('⚠️ حدث خطأ، يرجى المحاولة مرة أخرى', 'error');
    return true; // منع انتشار الخطأ
});

// ===== معالج الرفض (Promise) =====
window.addEventListener('unhandledrejection', function(e) {
    console.warn('⚠️ وعد مرفوض:', e.reason);
    showToast('⚠️ حدث خطأ غير متوقع', 'error');
    e.preventDefault();
});
