// ============================================
// ملف inventory_adjustment.js - النسخة المعدلة
// تم إصلاح: دالة getCurrentDateTime غير معرفة
// تمت إضافة: دوال إدارة المخزون المتقدمة
// ============================================

// ========== 1. التحقق من وجود الدوال الأساسية ==========

// التأكد من وجود دالة getCurrentDateTime
// إذا لم تكن موجودة، نقوم بتعريفها
if (typeof getCurrentDateTime === 'undefined') {
    console.warn('⚠️ دالة getCurrentDateTime غير موجودة، سيتم تعريفها محلياً');
    
    function getCurrentDateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        return {
            date: `${year}-${month}-${day}`,
            time: `${hours}:${minutes}:${seconds}`,
            dateTime: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
            timestamp: now.getTime(),
            formatted: `${day}/${month}/${year} ${hours}:${minutes}`,
            iso: now.toISOString(),
            getDate: () => `${year}-${month}-${day}`,
            getTime: () => `${hours}:${minutes}:${seconds}`,
            getTimestamp: () => now.getTime(),
        };
    }
}

// ========== 2. دوال إدارة المخزون ==========

// دالة تحديث وقت التعديل
function updateAdjustmentDateTime() {
    try {
        // التحقق من وجود الدالة
        if (typeof getCurrentDateTime !== 'function') {
            console.error('❌ الدالة getCurrentDateTime غير معرفة');
            return null;
        }
        
        const now = getCurrentDateTime();
        console.log('🕐 تحديث وقت التعديل:', now.dateTime);
        
        // تحديث حقل الوقت الرئيسي
        const dateTimeField = document.getElementById('adjustmentDateTime');
        if (dateTimeField) {
            dateTimeField.value = now.dateTime;
            dateTimeField.setAttribute('data-timestamp', now.timestamp);
        } else {
            console.warn('⚠️ عنصر adjustmentDateTime غير موجود في الصفحة');
        }
        
        // تحديث حقل التاريخ
        const dateField = document.getElementById('adjustmentDate');
        if (dateField) {
            dateField.value = now.date;
        }
        
        // تحديث حقل الوقت
        const timeField = document.getElementById('adjustmentTime');
        if (timeField) {
            timeField.value = now.time;
        }
        
        // تحديث أي عناصر أخرى تحتاج الوقت
        const timestampFields = document.querySelectorAll('[data-time]');
        timestampFields.forEach(field => {
            const type = field.getAttribute('data-time');
            if (type === 'datetime') field.textContent = now.dateTime;
            else if (type === 'date') field.textContent = now.date;
            else if (type === 'time') field.textContent = now.time;
            else if (type === 'timestamp') field.textContent = now.timestamp;
        });
        
        return now;
    } catch (error) {
        console.error('❌ خطأ في تحديث وقت التعديل:', error);
        return null;
    }
}

// ========== 3. دوال إدارة المخزون ==========

// دالة إضافة تعديل مخزون
function addInventoryAdjustment(productId, quantity, type, reason) {
    console.log(`📦 جاري إضافة تعديل مخزون للمنتج: ${productId}`);
    
    try {
        if (!productId) {
            throw new Error('معرف المنتج مطلوب');
        }
        
        if (!quantity || quantity <= 0) {
            throw new Error('الكمية يجب أن تكون أكبر من صفر');
        }
        
        const adjustment = {
            id: `adj_${Date.now()}`,
            productId: productId,
            quantity: type === 'add' ? quantity : -quantity,
            type: type,
            reason: reason || 'تعديل يدوي',
            date: getCurrentDateTime().date,
            time: getCurrentDateTime().time,
            timestamp: getCurrentDateTime().timestamp,
            status: 'completed',
            createdBy: 'admin',
            notes: `تم تعديل المخزون: ${reason || 'بدون سبب'}`,
        };
        
        // حفظ التعديل في localStorage
        const adjustments = JSON.parse(localStorage.getItem('inventory_adjustments') || '[]');
        adjustments.push(adjustment);
        localStorage.setItem('inventory_adjustments', JSON.stringify(adjustments));
        
        console.log('✅ تم إضافة تعديل المخزون بنجاح');
        return { status: 'success', data: adjustment };
    } catch (error) {
        console.error('❌ خطأ في إضافة تعديل المخزون:', error);
        return { status: 'error', message: error.message };
    }
}

// دالة جلب تعديلات المخزون
function getInventoryAdjustments(productId = null) {
    console.log('📂 جاري جلب تعديلات المخزون');
    try {
        const adjustments = JSON.parse(localStorage.getItem('inventory_adjustments') || '[]');
        
        if (productId) {
            const filtered = adjustments.filter(adj => adj.productId === productId);
            console.log(`✅ تم جلب ${filtered.length} تعديل للمنتج ${productId}`);
            return { status: 'success', data: filtered };
        }
        
        console.log(`✅ تم جلب ${adjustments.length} تعديل`);
        return { status: 'success', data: adjustments };
    } catch (error) {
        console.error('❌ خطأ في جلب تعديلات المخزون:', error);
        return { status: 'error', message: error.message };
    }
}

// دالة حذف تعديل مخزون
function deleteInventoryAdjustment(adjustmentId) {
    console.log(`🗑️ جاري حذف تعديل المخزون: ${adjustmentId}`);
    try {
        if (!adjustmentId) {
            throw new Error('معرف التعديل مطلوب');
        }
        
        const adjustments = JSON.parse(localStorage.getItem('inventory_adjustments') || '[]');
        const index = adjustments.findIndex(adj => adj.id === adjustmentId);
        
        if (index === -1) {
            throw new Error('التعديل غير موجود');
        }
        
        const deleted = adjustments.splice(index, 1)[0];
        localStorage.setItem('inventory_adjustments', JSON.stringify(adjustments));
        
        console.log('✅ تم حذف تعديل المخزون بنجاح');
        return { status: 'success', data: deleted };
    } catch (error) {
        console.error('❌ خطأ في حذف تعديل المخزون:', error);
        return { status: 'error', message: error.message };
    }
}

// ========== 4. دوال عرض المخزون ==========

// دالة عرض تعديلات المخزون في الجدول
function renderInventoryAdjustments(containerId = 'adjustmentsTable', adjustments = null) {
    console.log('📊 جاري عرض تعديلات المخزون');
    try {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`⚠️ العنصر "${containerId}" غير موجود`);
            return { status: 'warning', message: 'العنصر غير موجود' };
        }
        
        // جلب التعديلات إذا لم يتم تمريرها
        const adjustmentsData = adjustments || getInventoryAdjustments().data || [];
        
        if (adjustmentsData.length === 0) {
            container.innerHTML = `<tr><td colspan="6" style="text-align: center;">لا توجد تعديلات مخزون</td></tr>`;
            console.log('ℹ️ لا توجد تعديلات للعرض');
            return { status: 'success', data: [] };
        }
        
        // عرض التعديلات في الجدول
        let html = '';
        adjustmentsData.forEach(adj => {
            const typeClass = adj.type === 'add' ? 'text-success' : 'text-danger';
            const typeText = adj.type === 'add' ? 'إضافة' : 'خصم';
            html += `
                <tr>
                    <td>${adj.id}</td>
                    <td>${adj.productId}</td>
                    <td class="${typeClass}">${adj.quantity}</td>
                    <td><span class="badge ${typeClass}">${typeText}</span></td>
                    <td>${adj.reason}</td>
                    <td>${adj.date} ${adj.time}</td>
                    <td>
                        <button onclick="deleteInventoryAdjustment('${adj.id}')" class="btn btn-danger btn-sm">
                            حذف
                        </button>
                    </td>
                </tr>
            `;
        });
        
        container.innerHTML = html;
        console.log(`✅ تم عرض ${adjustmentsData.length} تعديل`);
        return { status: 'success', data: adjustmentsData };
    } catch (error) {
        console.error('❌ خطأ في عرض تعديلات المخزون:', error);
        return { status: 'error', message: error.message };
    }
}

// ========== 5. دوال التهيئة ==========

// دالة تهيئة صفحة تعديل المخزون
function initInventoryPage() {
    console.log('📦 جاري تهيئة صفحة تعديل المخزون');
    
    try {
        // تحديث الوقت
        updateAdjustmentDateTime();
        
        // عرض التعديلات المحفوظة
        renderInventoryAdjustments('adjustmentsTable');
        
        // إضافة مستمعات للأحداث
        const form = document.getElementById('adjustmentForm');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('📝 تم تقديم نموذج التعديل');
                // معالجة النموذج...
            });
        }
        
        // تحديث الوقت كل دقيقة
        setInterval(updateAdjustmentDateTime, 60000);
        
        console.log('✅ تم تهيئة صفحة تعديل المخزون بنجاح');
        return { status: 'success' };
    } catch (error) {
        console.error('❌ خطأ في تهيئة صفحة تعديل المخزون:', error);
        return { status: 'error', message: error.message };
    }
}

// ========== 6. التصدير ==========

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCurrentDateTime,
        updateAdjustmentDateTime,
        addInventoryAdjustment,
        getInventoryAdjustments,
        deleteInventoryAdjustment,
        renderInventoryAdjustments,
        initInventoryPage,
    };
}

// ========== 7. التشغيل التلقائي ==========

// تهيئة الصفحة عند التحميل
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🌐 تم تحميل صفحة المخزون');
            initInventoryPage();
        });
    } else {
        console.log('🌐 صفحة المخزون محملة بالفعل');
        initInventoryPage();
    }
}

console.log('📁 تم تحميل ملف inventory_adjustment.js المعدل');
