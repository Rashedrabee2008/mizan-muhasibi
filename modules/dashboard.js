// ============================================
// ملف dashboard.js - النسخة المعدلة
// تم إصلاح: الاستدعاءات المتكررة
// ============================================

// ========== 1. دوال اللوحة الرئيسية ==========

// دالة تحديث اللوحة
function updateDashboard() {
    console.log('📊 جاري تحديث لوحة المعلومات');
    
    try {
        // جلب البيانات من localStorage
        const sales = JSON.parse(localStorage.getItem('sales_data') || '[]');
        const purchases = JSON.parse(localStorage.getItem('purchases_data') || '[]');
        const inventory = JSON.parse(localStorage.getItem('inventory_data') || '[]');
        
        // حساب الإحصائيات
        const stats = {
            totalSales: sales.reduce((sum, s) => sum + (s.total || 0), 0),
            totalPurchases: purchases.reduce((sum, p) => sum + (p.total || 0), 0),
            totalItems: inventory.length,
            todaySales: sales.filter(s => s.date === getCurrentDateTime().date).length,
        };
        
        // تحديث العناصر في الصفحة
        updateStatsElements(stats);
        
        // تحديث الرسوم البيانية إذا كانت موجودة
        updateCharts(sales, purchases);
        
        console.log('✅ تم تحديث لوحة المعلومات بنجاح');
        return { status: 'success', data: stats };
    } catch (error) {
        console.error('❌ خطأ في تحديث لوحة المعلومات:', error);
        return { status: 'error', message: error.message };
    }
}

// دالة تحديث عناصر الإحصائيات
function updateStatsElements(stats) {
    const elements = {
        'totalSales': stats.totalSales,
        'totalPurchases': stats.totalPurchases,
        'totalItems': stats.totalItems,
        'todaySales': stats.todaySales,
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = typeof value === 'number' ? value.toLocaleString() : value;
        }
    });
}

// دالة تحديث الرسوم البيانية
function updateCharts(sales, purchases) {
    // محاكاة تحديث الرسوم البيانية
    console.log('📈 تحديث الرسوم البيانية');
    // هنا يمكن إضافة كود الرسوم البيانية باستخدام Chart.js أو غيره
}

// دالة تحديث اللوحة (نسخة آمنة)
function refreshDashboard() {
    console.log('🔄 جاري تحديث اللوحة');
    const result = updateDashboard();
    
    if (result.status === 'success') {
        console.log('✅ تم تحديث اللوحة بنجاح');
    } else {
        console.warn('⚠️ فشل في تحديث اللوحة:', result.message);
    }
    
    return result;
}

// ========== 2. دوال التهيئة ==========

// دالة تهيئة اللوحة
function initDashboard() {
    console.log('📊 جاري تهيئة لوحة المعلومات');
    
    try {
        // تحديث اللوحة أول مرة
        refreshDashboard();
        
        // تحديث اللوحة كل 5 دقائق
        setInterval(refreshDashboard, 300000);
        
        console.log('✅ تم تهيئة لوحة المعلومات بنجاح');
        return { status: 'success' };
    } catch (error) {
        console.error('❌ خطأ في تهيئة لوحة المعلومات:', error);
        return { status: 'error', message: error.message };
    }
}

// ========== 3. التصدير ==========

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateDashboard,
        refreshDashboard,
        initDashboard,
    };
}

// ========== 4. التشغيل التلقائي ==========

if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🌐 تم تحميل لوحة المعلومات');
            initDashboard();
        });
    } else {
        console.log('🌐 لوحة المعلومات محملة بالفعل');
        initDashboard();
    }
}

console.log('📁 تم تحميل ملف dashboard.js المعدل');
