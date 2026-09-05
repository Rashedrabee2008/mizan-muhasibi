// ============================================
// ملف app.js - النسخة الكاملة المعدلة v3.0.1
// تم إصلاح: الاستدعاء الذاتي، الدوال غير المعرفة، المراجع الدائرية
// تمت إضافة: دوال الوقت والتاريخ، دوال الصلاحيات المتقدمة
// ============================================

// ========== 1. الأدوات المساعدة (Utilities) ==========

// دالة آمنة لطباعة الكائنات مع تجنب المراجع الدائرية
function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return '[Circular]';
            seen.add(value);
        }
        return value;
    }, 2);
}

// دالة للتحقق من وجود دوال قبل استدعائها
function safeCallFunction(fn, ...args) {
    if (typeof fn === 'function') {
        return fn(...args);
    } else {
        console.warn(`⚠️ الدالة غير موجودة: ${fn?.name || 'غير معروفة'}`);
        return null;
    }
}

// دالة للتحقق من وجود عنصر في DOM
function getElementSafe(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`⚠️ العنصر "${id}" غير موجود في الصفحة`);
    }
    return element;
}

// دالة لتنظيف النصوص من الـ HTML
function sanitizeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== 2. دوال الوقت والتاريخ (Date & Time Functions) ==========

// دالة الحصول على الوقت الحالي
function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const arabicMonths = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو', 
                          'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}:${seconds}`,
        dateTime: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
        timestamp: now.getTime(),
        formatted: `${day}/${month}/${year} ${hours}:${minutes}`,
        iso: now.toISOString(),
        arabicDate: `${day} ${arabicMonths[now.getMonth()]} ${year}`,
        arabicDateTime: `${day} ${arabicMonths[now.getMonth()]} ${year} ${hours}:${minutes}`,
        getDate: () => `${year}-${month}-${day}`,
        getTime: () => `${hours}:${minutes}:${seconds}`,
        getTimestamp: () => now.getTime(),
        getFormatted: (format = 'YYYY-MM-DD') => {
            switch(format) {
                case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
                case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
                case 'YYYY-MM-DD HH:mm': return `${year}-${month}-${day} ${hours}:${minutes}`;
                default: return `${year}-${month}-${day}`;
            }
        }
    };
}

// دالة لتنسيق التاريخ حسب الطلب
function formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d)) return null;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    switch(format) {
        case 'YYYY-MM-DD':
            return `${year}-${month}-${day}`;
        case 'DD/MM/YYYY':
            return `${day}/${month}/${year}`;
        case 'YYYY-MM-DD HH:mm':
            return `${year}-${month}-${day} ${hours}:${minutes}`;
        case 'DD/MM/YYYY HH:mm':
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        default:
            return `${year}-${month}-${day}`;
    }
}

// دالة للتحقق من صحة التاريخ
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// دالة لحساب الفرق بين تاريخين
function dateDiff(date1, date2, unit = 'days') {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    if (isNaN(d1) || isNaN(d2)) return null;
    
    const diffMs = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    switch(unit) {
        case 'days': return diffDays;
        case 'hours': return diffDays * 24;
        case 'minutes': return diffDays * 24 * 60;
        case 'seconds': return diffDays * 24 * 60 * 60;
        default: return diffDays;
    }
}

// ========== 3. دوال العملاء (Customer Functions) ==========

// دالة إنشاء كشف حساب العميل
function generateCustomerStatement(customerId, period = 'monthly') {
    console.log(`📊 جاري إنشاء كشف حساب للعميل: ${customerId}`);

    // التحقق من صحة المدخلات
    if (!customerId) {
        console.error('❌ خطأ: معرف العميل مطلوب');
        return null;
    }

    // شرط الإيقاف لمنع التكرار اللانهائي
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validPeriods.includes(period)) {
        console.warn(`⚠️ فترة غير معروفة: ${period}، سيتم استخدام الشهرية`);
        period = 'monthly';
    }

    // محاكاة جلب البيانات
    const now = getCurrentDateTime();
    const statementData = {
        customerId: customerId,
        period: period,
        generatedAt: now.dateTime,
        timestamp: now.timestamp,
        transactions: [
            { date: '2026-09-01', description: 'فاتورة #1001', amount: 1500, type: 'sale' },
            { date: '2026-09-03', description: 'دفعة مستلمة', amount: -500, type: 'payment' },
            { date: '2026-09-05', description: 'فاتورة #1002', amount: 2000, type: 'sale' },
        ],
        summary: {
            totalSales: 3500,
            totalPayments: 500,
            totalDue: 3000,
            transactionCount: 3,
        },
        customerInfo: {
            name: `العميل ${customerId}`,
            phone: '05XXXXXXXX',
            email: `customer${customerId}@example.com`,
        }
    };

    console.log('✅ تم إنشاء كشف الحساب بنجاح');
    return statementData;
}

// دالة إنشاء كشف حساب مفصل
function generateCustomerDetailedStatement(customerId, includeDetails = true) {
    console.log(`📋 جاري إنشاء كشف حساب مفصل للعميل: ${customerId}`);

    if (!customerId) {
        console.error('❌ خطأ: معرف العميل مطلوب');
        return null;
    }

    // جلب الكشف الأساسي (بدون استدعاء ذاتي)
    const baseStatement = generateCustomerStatement(customerId, 'monthly');
    
    if (!baseStatement) {
        console.error('❌ فشل في إنشاء الكشف الأساسي');
        return null;
    }

    // إضافة التفاصيل الموسعة
    const detailedStatement = {
        ...baseStatement,
        isDetailed: true,
        detailedTransactions: baseStatement.transactions.map(t => ({
            ...t,
            details: `تفاصيل المعاملة: ${t.description}`,
            tax: t.amount > 0 ? t.amount * 0.14 : 0,
            netAmount: t.amount > 0 ? t.amount * 0.86 : t.amount,
            paymentMethod: t.type === 'payment' ? 'نقدي' : 'آجل',
            status: t.amount > 0 ? 'مستحق' : 'مدفوع',
        })),
        detailedSummary: {
            totalTax: baseStatement.transactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount * 0.14 : 0), 0),
            netTotal: baseStatement.transactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount * 0.86 : t.amount), 0),
            totalTransactions: baseStatement.transactions.length,
            averageTransaction: baseStatement.transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / baseStatement.transactions.length,
        },
        paymentHistory: [
            { date: '2026-09-01', amount: 500, method: 'نقدي', status: 'مكتمل' },
            { date: '2026-09-04', amount: 300, method: 'تحويل', status: 'مكتمل' },
        ],
        balanceHistory: [
            { date: '2026-09-01', balance: 1500 },
            { date: '2026-09-03', balance: 1000 },
            { date: '2026-09-05', balance: 3000 },
        ],
    };

    console.log('✅ تم إنشاء الكشف المفصل بنجاح');
    return detailedStatement;
}

// ========== 4. دوال الأرباح (Profit Functions) ==========

// دالة تحليل الأرباح
function generateProfitAnalysis(startDate, endDate, granularity = 'daily') {
    console.log(`💰 جاري تحليل الأرباح من ${startDate} إلى ${endDate}`);

    // التحقق من صحة المدخلات
    if (!startDate || !endDate) {
        console.error('❌ خطأ: يجب تحديد تاريخ البداية والنهاية');
        return null;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start) || isNaN(end) || start > end) {
        console.error('❌ خطأ: تواريخ غير صالحة');
        return null;
    }

    // محاكاة حساب الأرباح
    const profitData = {
        startDate: startDate,
        endDate: endDate,
        granularity: granularity,
        generatedAt: getCurrentDateTime().dateTime,
        summary: {
            totalRevenue: 45000,
            totalCost: 28000,
            grossProfit: 17000,
            grossMargin: (17000 / 45000 * 100).toFixed(2) + '%',
            expenses: 5000,
            netProfit: 12000,
            netMargin: (12000 / 45000 * 100).toFixed(2) + '%',
        },
        breakdown: {
            sales: 45000,
            returns: -2000,
            discounts: -3000,
            shipping: 500,
            taxes: 1500,
        },
        dailyBreakdown: [
            { date: '2026-09-01', revenue: 5000, cost: 3000, profit: 2000, margin: '40%' },
            { date: '2026-09-02', revenue: 7000, cost: 4000, profit: 3000, margin: '42.86%' },
            { date: '2026-09-03', revenue: 6500, cost: 3800, profit: 2700, margin: '41.54%' },
            { date: '2026-09-04', revenue: 8000, cost: 5000, profit: 3000, margin: '37.5%' },
            { date: '2026-09-05', revenue: 18500, cost: 12200, profit: 6300, margin: '34.05%' },
        ],
        topProducts: [
            { name: 'منتج أ', revenue: 12000, cost: 7000, profit: 5000 },
            { name: 'منتج ب', revenue: 8000, cost: 4500, profit: 3500 },
            { name: 'منتج ج', revenue: 5000, cost: 3000, profit: 2000 },
        ],
    };

    console.log('✅ تم تحليل الأرباح بنجاح');
    return profitData;
}

// ========== 5. دوال الصلاحيات (Permissions Functions) ==========

// دالة عرض الصلاحيات
function renderPermissions(userRole, permissionsList = []) {
    console.log(`🔐 جاري عرض صلاحيات المستخدم: ${userRole}`);

    if (!userRole) {
        console.error('❌ خطأ: دور المستخدم مطلوب');
        return { error: 'دور المستخدم غير محدد' };
    }

    // قائمة الصلاحيات الافتراضية
    const defaultPermissions = ['read', 'write', 'delete', 'manage_users', 'export', 'print'];
    const effectivePermissions = permissionsList.length > 0 ? permissionsList : defaultPermissions;

    // تحديد الصلاحيات حسب الدور
    let allowedPermissions = [];
    let roleLevel = 0;
    
    const roleConfig = {
        'admin': { level: 100, permissions: effectivePermissions, description: 'مدير كامل الصلاحيات' },
        'manager': { level: 75, permissions: effectivePermissions.filter(p => p !== 'delete' && p !== 'manage_users'), description: 'مدير' },
        'supervisor': { level: 50, permissions: effectivePermissions.filter(p => p === 'read' || p === 'write' || p === 'export'), description: 'مشرف' },
        'user': { level: 25, permissions: effectivePermissions.filter(p => p === 'read' || p === 'write'), description: 'مستخدم' },
        'viewer': { level: 10, permissions: effectivePermissions.filter(p => p === 'read'), description: 'مشاهد' },
    };

    const config = roleConfig[userRole.toLowerCase()] || roleConfig['viewer'];
    allowedPermissions = config.permissions;
    roleLevel = config.level;

    const result = {
        userRole: userRole,
        roleLevel: roleLevel,
        roleDescription: config.description,
        permissions: allowedPermissions,
        hasAccess: allowedPermissions.length > 0,
        isAdmin: userRole.toLowerCase() === 'admin',
        timestamp: getCurrentDateTime().dateTime,
        permissionMap: {
            canRead: allowedPermissions.includes('read'),
            canWrite: allowedPermissions.includes('write'),
            canDelete: allowedPermissions.includes('delete'),
            canManageUsers: allowedPermissions.includes('manage_users'),
            canExport: allowedPermissions.includes('export'),
            canPrint: allowedPermissions.includes('print'),
        }
    };

    console.log('✅ تم عرض الصلاحيات بنجاح');
    return result;
}

// دالة التحقق من صلاحية محددة
function hasPermission(userRole, permission, permissionsList = []) {
    const result = renderPermissions(userRole, permissionsList);
    if (result.error) return false;
    return result.permissions.includes(permission);
}

// ========== 6. دوال العرض (Render Functions) ==========

// دوال العرض - جميعها معرفة الآن
function renderSales(data) {
    console.log('📊 جاري عرض بيانات المبيعات');
    if (!data) {
        console.warn('⚠️ لا توجد بيانات مبيعات للعرض');
        return { status: 'warning', message: 'لا توجد بيانات' };
    }
    
    try {
        // محاكاة عرض البيانات
        const salesData = typeof data === 'object' ? data : { data };
        console.log('✅ تم عرض المبيعات بنجاح:', salesData);
        return { status: 'success', data: salesData };
    } catch (error) {
        console.error('❌ خطأ في عرض المبيعات:', error);
        return { status: 'error', message: error.message };
    }
}

function renderAllPurchases(data) {
    console.log('📦 جاري عرض جميع المشتريات');
    if (!data) {
        console.warn('⚠️ لا توجد بيانات مشتريات للعرض');
        return { status: 'warning', message: 'لا توجد بيانات' };
    }
    
    try {
        console.log('✅ تم عرض المشتريات بنجاح');
        return { status: 'success', data };
    } catch (error) {
        console.error('❌ خطأ في عرض المشتريات:', error);
        return { status: 'error', message: error.message };
    }
}

function renderAllReturns(data) {
    console.log('🔄 جاري عرض جميع المرتجعات');
    if (!data) {
        console.warn('⚠️ لا توجد بيانات مرتجعات للعرض');
        return { status: 'warning', message: 'لا توجد بيانات' };
    }
    
    try {
        console.log('✅ تم عرض المرتجعات بنجاح');
        return { status: 'success', data };
    } catch (error) {
        console.error('❌ خطأ في عرض المرتجعات:', error);
        return { status: 'error', message: error.message };
    }
}

function renderAllInvoices(data) {
    console.log('📄 جاري عرض جميع الفواتير');
    if (!data) {
        console.warn('⚠️ لا توجد بيانات فواتير للعرض');
        return { status: 'warning', message: 'لا توجد بيانات' };
    }
    
    try {
        console.log('✅ تم عرض الفواتير بنجاح');
        return { status: 'success', data };
    } catch (error) {
        console.error('❌ خطأ في عرض الفواتير:', error);
        return { status: 'error', message: error.message };
    }
}

// ========== 7. دوال إدارة البيانات (Data Management) ==========

// دالة حفظ الإعدادات
function saveSettings(settings) {
    console.log('⚙️ جاري حفظ الإعدادات');
    try {
        if (!settings || typeof settings !== 'object') {
            throw new Error('الإعدادات غير صالحة');
        }
        
        const settingsToSave = {
            ...settings,
            savedAt: getCurrentDateTime().dateTime,
            version: '3.0.1',
        };
        
        localStorage.setItem('app_settings', JSON.stringify(settingsToSave));
        console.log('✅ تم حفظ الإعدادات بنجاح');
        return { status: 'success', data: settingsToSave };
    } catch (error) {
        console.error('❌ خطأ في حفظ الإعدادات:', error);
        return { status: 'error', message: error.message };
    }
}

// دالة تحميل الإعدادات
function loadSettings() {
    console.log('📂 جاري تحميل الإعدادات');
    try {
        const saved = localStorage.getItem('app_settings');
        if (!saved) {
            console.warn('⚠️ لا توجد إعدادات محفوظة');
            return { status: 'warning', message: 'لا توجد إعدادات' };
        }
        
        const settings = JSON.parse(saved);
        console.log('✅ تم تحميل الإعدادات بنجاح');
        return { status: 'success', data: settings };
    } catch (error) {
        console.error('❌ خطأ في تحميل الإعدادات:', error);
        return { status: 'error', message: error.message };
    }
}

// دالة حفظ الميزان
function saveBalance(balanceData) {
    console.log('⚖️ جاري حفظ الميزان');
    try {
        if (!balanceData || typeof balanceData !== 'object') {
            throw new Error('بيانات الميزان غير صالحة');
        }
        
        const key = `balance_${balanceData.id || Date.now()}`;
        const balanceToSave = {
            ...balanceData,
            savedAt: getCurrentDateTime().dateTime,
            version: '3.0.1',
        };
        
        localStorage.setItem(key, JSON.stringify(balanceToSave));
        console.log('✅ تم حفظ الميزان بنجاح');
        return { status: 'success', key, data: balanceToSave };
    } catch (error) {
        console.error('❌ خطأ في حفظ الميزان:', error);
        return { status: 'error', message: error.message };
    }
}

// دالة تحميل الميزان
function loadBalance(balanceId) {
    console.log(`📂 جاري تحميل الميزان: ${balanceId}`);
    try {
        if (!balanceId) {
            throw new Error('معرف الميزان مطلوب');
        }
        
        const key = `balance_${balanceId}`;
        const saved = localStorage.getItem(key);
        if (!saved) {
            console.warn(`⚠️ الميزان ${balanceId} غير موجود`);
            return { status: 'warning', message: 'الميزان غير موجود' };
        }
        
        const balance = JSON.parse(saved);
        console.log('✅ تم تحميل الميزان بنجاح');
        return { status: 'success', data: balance };
    } catch (error) {
        console.error('❌ خطأ في تحميل الميزان:', error);
        return { status: 'error', message: error.message };
    }
}

// ========== 8. دوال التهيئة (Initialization) ==========

// دالة تهيئة التطبيق
function initApp() {
    console.log('🚀 جاري تهيئة التطبيق v3.0.1');
    console.log(`🕐 وقت التهيئة: ${getCurrentDateTime().arabicDateTime}`);

    // التحقق من الإعدادات المحفوظة
    const settingsResult = loadSettings();
    if (settingsResult.status === 'success') {
        console.log('📂 تم تحميل الإعدادات المحفوظة');
    }

    // تهيئة الصلاحيات
    const permissions = renderPermissions('admin');
    console.log('🔐 الصلاحيات المهيأة:', permissions);

    // تسجيل معلومات النظام
    console.log('💻 معلومات النظام:');
    console.log(`   - المتصفح: ${navigator.userAgent}`);
    console.log(`   - اللغة: ${navigator.language}`);
    console.log(`   - الوقت الحالي: ${getCurrentDateTime().formatted}`);
    console.log(`   - المنطقة الزمنية: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

    // التحقق من وجود عناصر مهمة في الصفحة
    const importantElements = ['app-root', 'main-content', 'dashboard'];
    importantElements.forEach(id => {
        const element = getElementSafe(id);
        if (element) {
            console.log(`✅ العنصر "${id}" موجود`);
        }
    });

    console.log('✅ تم تهيئة التطبيق بنجاح');
    return { 
        status: 'success', 
        version: '3.0.1',
        timestamp: getCurrentDateTime().timestamp,
        permissions: permissions,
    };
}

// دالة إعادة تهيئة التطبيق
function reinitApp() {
    console.log('🔄 جاري إعادة تهيئة التطبيق');
    // تنظيف أي بيانات مؤقتة
    console.log('🧹 تنظيف البيانات المؤقتة');
    // إعادة التهيئة
    return initApp();
}

// ========== 9. دوال التصدير (Export Functions) ==========

// دالة تصدير البيانات كـ JSON
function exportData(data, filename = 'export') {
    try {
        const jsonString = safeStringify(data);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${getCurrentDateTime().date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('✅ تم تصدير البيانات بنجاح');
        return { status: 'success', filename: link.download };
    } catch (error) {
        console.error('❌ خطأ في تصدير البيانات:', error);
        return { status: 'error', message: error.message };
    }
}

// دالة تصدير البيانات كـ CSV
function exportCSV(data, filename = 'export') {
    try {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('البيانات يجب أن تكون مصفوفة غير فارغة');
        }
        
        const headers = Object.keys(data[0]);
        const rows = data.map(row => headers.map(header => row[header] || '').join(','));
        const csv = [headers.join(','), ...rows].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${getCurrentDateTime().date}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('✅ تم تصدير CSV بنجاح');
        return { status: 'success', filename: link.download };
    } catch (error) {
        console.error('❌ خطأ في تصدير CSV:', error);
        return { status: 'error', message: error.message };
    }
}

// ========== 10. التصدير (Exports) ==========

// إذا كنت تستخدم CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // دوال مساعدة
        safeStringify,
        safeCallFunction,
        getElementSafe,
        sanitizeHTML,
        
        // دوال الوقت
        getCurrentDateTime,
        formatDate,
        isValidDate,
        dateDiff,
        
        // دوال العملاء
        generateCustomerStatement,
        generateCustomerDetailedStatement,
        
        // دوال الأرباح
        generateProfitAnalysis,
        
        // دوال الصلاحيات
        renderPermissions,
        hasPermission,
        
        // دوال العرض
        renderSales,
        renderAllPurchases,
        renderAllReturns,
        renderAllInvoices,
        
        // دوال البيانات
        saveSettings,
        loadSettings,
        saveBalance,
        loadBalance,
        
        // دوال التهيئة
        initApp,
        reinitApp,
        
        // دوال التصدير
        exportData,
        exportCSV,
    };
}

// إذا كنت تستخدم ES6 Modules
// export {
//     safeStringify,
//     safeCallFunction,
//     getElementSafe,
//     sanitizeHTML,
//     getCurrentDateTime,
//     formatDate,
//     isValidDate,
//     dateDiff,
//     generateCustomerStatement,
//     generateCustomerDetailedStatement,
//     generateProfitAnalysis,
//     renderPermissions,
//     hasPermission,
//     renderSales,
//     renderAllPurchases,
//     renderAllReturns,
//     renderAllInvoices,
//     saveSettings,
//     loadSettings,
//     saveBalance,
//     loadBalance,
//     initApp,
//     reinitApp,
//     exportData,
//     exportCSV,
// };

// ========== 11. التشغيل التلقائي ==========

// بدء التطبيق تلقائياً عند تحميل الصفحة
if (typeof window !== 'undefined') {
    // انتظر حتى تحميل DOM بالكامل
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🌐 تم تحميل الصفحة بالكامل');
            initApp();
        });
    } else {
        // إذا كان DOM قد تم تحميله بالفعل
        console.log('🌐 الصفحة محملة بالفعل');
        initApp();
    }
}

console.log('📁 تم تحميل ملف app.js المعدل بالكامل v3.0.1');
console.log('🕐 وقت التحميل:', getCurrentDateTime().arabicDateTime);
