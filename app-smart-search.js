// ============================================================
// الميزان 14.0.0 - البحث الذكي
// app-smart-search.js
// ============================================================
// 
// يحوّل القوائم المنسدلة إلى بحث ذكي:
// - العملاء (اسم، هاتف، واتساب)
// - المنتجات (اسم، باركود)
// - الموردين (اسم، هاتف)
// ============================================================

console.log('🔍 تحميل app-smart-search.js - البحث الذكي');

// ═══════════════════════════════════════════════════════════
// 🎨 دوال مساعدة
// ═══════════════════════════════════════════════════════════

// تطبيع النص العربي (إزالة التشكيل والهمزات)
window.normalizeArabic = function(text) {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .trim()
        // إزالة التشكيل
        .replace(/[\u064B-\u0652]/g, '')
        // توحيد الألف
        .replace(/[أإآا]/g, 'ا')
        // توحيد الياء
        .replace(/[يى]/g, 'ي')
        // توحيد التاء المربوطة
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ');
};

// التحقق من مطابقة البحث
window.matchesSearch = function(text, query) {
    if (!query) return true;
    if (!text) return false;
    const normalizedText = normalizeArabic(String(text));
    const normalizedQuery = normalizeArabic(String(query));
    return normalizedText.includes(normalizedQuery);
};

// ═══════════════════════════════════════════════════════════
// 🔧 بناء HTML للبحث الذكي
// ═══════════════════════════════════════════════════════════

// يستبدل select بـ input + dropdown
window.createSmartSelect = function(originalSelectId, options, placeholder, icon = '🔍') {
    const original = $(originalSelectId);
    if (!original) return;
    
    // لو اتعمل قبل كده، نرجع
    if (original.dataset.smartSelect === 'true') {
        return;
    }
    original.dataset.smartSelect = 'true';
    
    // نخفي القائمة الأصلية
    original.style.display = 'none';
    
    // نعمل wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'smart-select-wrapper';
    wrapper.style.cssText = 'position:relative;';
    
    const id = 'smart_' + originalSelectId;
    const currentValue = original.value;
    let currentText = '';
    
    // نجيب النص الحالي
    if (currentValue) {
        const option = original.querySelector(`option[value="${currentValue}"]`);
        if (option) currentText = option.textContent.trim();
    }
    
    wrapper.innerHTML = `
        <input 
            type="text" 
            id="${id}_input"
            class="smart-select-input"
            placeholder="${placeholder}"
            value="${currentText}"
            autocomplete="off"
            data-value="${currentValue}"
        />
        <input type="hidden" id="${id}_hidden" value="${currentValue}" />
        <div id="${id}_dropdown" class="smart-select-dropdown" style="display:none;"></div>
    `;
    
    original.parentNode.insertBefore(wrapper, original);
    wrapper.appendChild(original);
    
    // ═══ الأحداث ═══
    
    const input = document.getElementById(id + '_input');
    const hidden = document.getElementById(id + '_hidden');
    const dropdown = document.getElementById(id + '_dropdown');
    
    // ✅ عند الكتابة
    input.addEventListener('input', function() {
        const query = this.value.trim();
        const filtered = filterSmartOptions(options, query);
        showSmartDropdown(dropdown, filtered, input, hidden, original, options);
    });
    
    // ✅ عند الفوكس
    input.addEventListener('focus', function() {
        const query = this.value.trim();
        const filtered = filterSmartOptions(options, query);
        showSmartDropdown(dropdown, filtered, input, hidden, original, options);
    });
    
    // ✅ عند الخروج
    input.addEventListener('blur', function() {
        setTimeout(() => {
            dropdown.style.display = 'none';
        }, 250);
    });
    
    // ✅ التنقل بالكيبورد
    input.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.smart-select-item');
        const current = dropdown.querySelector('.smart-select-item.active');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!items.length) return;
            if (!current) {
                items[0].classList.add('active');
                items[0].scrollIntoView({ block: 'nearest' });
            } else {
                const idx = Array.from(items).indexOf(current);
                if (idx < items.length - 1) {
                    current.classList.remove('active');
                    items[idx + 1].classList.add('active');
                    items[idx + 1].scrollIntoView({ block: 'nearest' });
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!items.length) return;
            if (!current) {
                items[items.length - 1].classList.add('active');
                items[items.length - 1].scrollIntoView({ block: 'nearest' });
            } else {
                const idx = Array.from(items).indexOf(current);
                if (idx > 0) {
                    current.classList.remove('active');
                    items[idx - 1].classList.add('active');
                    items[idx - 1].scrollIntoView({ block: 'nearest' });
                }
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (current) {
                current.click();
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            input.blur();
        }
    });
    
    return wrapper;
};

// فلترة الخيارات
window.filterSmartOptions = function(options, query) {
    if (!query) return options.slice(0, 50);
    
    return options.filter(opt => {
        return (
            matchesSearch(opt.label, query) ||
            matchesSearch(opt.value, query) ||
            matchesSearch(opt.searchText, query)
        );
    }).slice(0, 50);
};

// عرض القائمة
window.showSmartDropdown = function(dropdown, items, input, hidden, original, allOptions) {
    if (!items.length) {
        dropdown.innerHTML = `<div class="smart-select-empty">❌ لا توجد نتائج</div>`;
        dropdown.style.display = 'block';
        return;
    }
    
    let html = '';
    items.forEach(opt => {
        html += `
            <div class="smart-select-item" 
                 data-value="${opt.value}" 
                 data-label="${opt.label}">
                ${opt.icon ? `<span class="smart-icon">${opt.icon}</span>` : ''}
                <span class="smart-label">${opt.label}</span>
                ${opt.badge ? `<span class="smart-badge">${opt.badge}</span>` : ''}
            </div>
        `;
    });
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
    
    // ✅ عند الاختيار
    dropdown.querySelectorAll('.smart-select-item').forEach(item => {
        item.addEventListener('mousedown', function(e) {
            e.preventDefault();
            const value = this.dataset.value;
            const label = this.dataset.label;
            
            input.value = label;
            hidden.value = value;
            input.dataset.value = value;
            
            // تحديث القائمة الأصلية
            original.value = value;
            
            // إطلاق حدث التغيير
            const event = new Event('change', { bubbles: true });
            original.dispatchEvent(event);
            
            dropdown.style.display = 'none';
        });
    });
};

// ═══════════════════════════════════════════════════════════
// 🔄 تفعيل البحث الذكي على العملاء
// ═══════════════════════════════════════════════════════════

window.enhanceCustomerSearch = function(selectId, includeAll = true) {
    const select = $(selectId);
    if (!select) return;
    
    const options = [];
    
    if (includeAll) {
        options.push({
            value: '',
            label: 'عميل نقدي',
            searchText: 'cash عميل نقدي',
            icon: '💵'
        });
    }
    
    customers.forEach(c => {
        const balance = typeof getCustomerBalance === 'function' ? getCustomerBalance(c.name) : 0;
        options.push({
            value: c.name,
            label: c.name,
            searchText: `${c.name} ${c.phone || ''} ${c.whatsapp || ''}`,
            icon: '👤',
            badge: balance > 0 ? `💳 ${formatMoney(balance)}` : ''
        });
    });
    
    createSmartSelect(selectId, options, '🔍 اكتب اسم العميل...');
};

// ═══════════════════════════════════════════════════════════
// 🔄 تفعيل البحث الذكي على المنتجات
// ═══════════════════════════════════════════════════════════

window.enhanceProductSearch = function(selectId, warehouseId = null) {
    const select = $(selectId);
    if (!select) return;
    
    const options = [];
    
    products.forEach(p => {
        let qty = p.qty;
        let qtyText = `متاح: ${p.qty}`;
        
        // لو في مخزن محدد
        if (warehouseId && typeof getProductStockInWarehouse === 'function') {
            qty = getProductStockInWarehouse(p.id, warehouseId);
            qtyText = `متاح: ${qty}`;
        }
        
        options.push({
            value: p.id,
            label: p.name,
            searchText: `${p.name} ${p.barcode || ''} ${p.id}`,
            icon: '📦',
            badge: qty > 0 ? `${qtyText}` : '❌ غير متاح'
        });
    });
    
    createSmartSelect(selectId, options, '🔍 اكتب اسم المنتج أو الباركود...');
};

// ═══════════════════════════════════════════════════════════
// 🔄 تفعيل البحث الذكي على الموردين
// ═══════════════════════════════════════════════════════════

window.enhanceSupplierSearch = function(selectId) {
    const select = $(selectId);
    if (!select) return;
    
    const options = [];
    
    suppliers.forEach(s => {
        const balance = typeof getSupplierBalance === 'function' ? getSupplierBalance(s.name) : 0;
        options.push({
            value: s.id,
            label: s.name,
            searchText: `${s.name} ${s.phone || ''} ${s.whatsapp || ''}`,
            icon: '🚚',
            badge: balance > 0 ? `📋 ${formatMoney(balance)}` : ''
        });
    });
    
    createSmartSelect(selectId, options, '🔍 اكتب اسم المورد...');
};

// ═══════════════════════════════════════════════════════════
// 🔄 تفعيل البحث الذكي على المخازن
// ═══════════════════════════════════════════════════════════

window.enhanceWarehouseSearch = function(selectId) {
    const select = $(selectId);
    if (!select) return;
    
    const options = [];
    
    warehouses.forEach(w => {
        options.push({
            value: w.id,
            label: w.name,
            searchText: `${w.name} ${w.location || ''} ${w.manager || ''}`,
            icon: '🏪',
            badge: w.isDefault ? '⭐' : ''
        });
    });
    
    createSmartSelect(selectId, options, '🔍 اكتب اسم المخزن...');
};

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة
// ═══════════════════════════════════════════════════════════

window.initSmartSearch = function() {
    console.log('🔍 تفعيل البحث الذكي...');
    
    // ✅ في الكاشير
    enhanceCustomerSearch('saleCustomer');
    enhanceProductSearch('saleProduct');
    
    // ✅ في الشراء
    enhanceSupplierSearch('purSupplier');
    enhanceProductSearch('purProduct');
    
    // ✅ في المرتجعات
    enhanceProductSearch('retProduct');
    
    // ✅ في التحصيل والسداد
    enhanceCustomerSearch('collectCustomer', false);
    enhanceSupplierSearch('paySupplier');
    enhanceCustomerSearch('settleCustomer', false);
    enhanceProductSearch('settleProduct');
    
    // ✅ في المخازن
    enhanceWarehouseSearch('transferFrom');
    enhanceWarehouseSearch('transferTo');
    enhanceWarehouseSearch('stockInWarehouse');
    enhanceWarehouseSearch('stockOutWarehouse');
    enhanceWarehouseSearch('openingWarehouse');
    enhanceWarehouseSearch('adjWarehouse');
    enhanceProductSearch('transferProduct');
    enhanceProductSearch('stockInProduct');
    enhanceProductSearch('stockOutProduct');
    enhanceProductSearch('openingProduct');
    enhanceProductSearch('adjProduct');
    
    console.log('✅ تم تفعيل البحث الذكي على كل القوائم');
};

// ═══════════════════════════════════════════════════════════
// 🔄 إعادة التفعيل عند تغيير البيانات
// ═══════════════════════════════════════════════════════════

// حفظ الدالة الأصلية
const _originalPopulateAllDropdowns = window.populateAllDropdowns;
window.populateAllDropdowns = function() {
    if (_originalPopulateAllDropdowns) _originalPopulateAllDropdowns.apply(this, arguments);
    
    // إعادة التفعيل بعد تحديث القوائم
    setTimeout(() => {
        // نمسح علامة Smart Select من القوائم لتحديثها
        ['saleCustomer', 'saleProduct', 'purSupplier', 'purProduct', 'retProduct', 
         'collectCustomer', 'paySupplier', 'settleCustomer', 'settleProduct',
         'transferFrom', 'transferTo', 'stockInWarehouse', 'stockOutWarehouse',
         'openingWarehouse', 'adjWarehouse', 'transferProduct', 'stockInProduct',
         'stockOutProduct', 'openingProduct', 'adjProduct'].forEach(id => {
            const el = $(id);
            if (el) {
                delete el.dataset.smartSelect;
                // إزالة الـ wrapper القديم
                const wrapper = el.parentNode;
                if (wrapper && wrapper.classList.contains('smart-select-wrapper')) {
                    // نقل الـ select ومسح الـ wrapper
                    wrapper.parentNode.insertBefore(el, wrapper);
                    wrapper.remove();
                    el.style.display = '';
                }
            }
        });
        
        // إعادة التفعيل
        initSmartSearch();
    }, 300);
};

// ═══════════════════════════════════════════════════════════
// 🚀 التشغيل التلقائي
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof customers !== 'undefined' && typeof products !== 'undefined') {
            initSmartSearch();
        }
    }, 2500);
});

// إعادة التفعيل عند التنقل بين الصفحات
const _originalNavigateTo = window.navigateTo;
window.navigateTo = function(page) {
    if (_originalNavigateTo) _originalNavigateTo.apply(this, arguments);
    
    // إعادة تفعيل البحث الذكي بعد التنقل
    setTimeout(() => {
        initSmartSearch();
    }, 500);
};

console.log('✅ تم تحميل app-smart-search.js بنجاح');
console.log('🔍 البحث الذكي جاهز للعملاء والمنتجات والموردين');
