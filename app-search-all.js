// ============================================================
// الميزان 14.0.0 - البحث الشامل في كل التطبيق
// app-search-all.js
// ============================================================
// 
// يضيف بحث ذكي في:
// - العملاء (كل الأماكن)
// - المنتجات (كل الأماكن)
// - الموردين (كل الأماكن)
// - المخازن (كل الأماكن)
// - المخزون
// - الفواتير
// - الفواتير المعلقة
// - سجل النشاطات
// - التقارير
// ============================================================

console.log('🔍 تحميل app-search-all.js - البحث الشامل');

// ═══════════════════════════════════════════════════════════
// 🎨 تطبيع النص العربي
// ═══════════════════════════════════════════════════════════

window.normalizeArabic = function(text) {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .trim()
        .replace(/[\u064B-\u0652]/g, '')
        .replace(/[أإآا]/g, 'ا')
        .replace(/[يى]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ');
};

window.matchesSearch = function(text, query) {
    if (!query) return true;
    if (!text) return false;
    return normalizeArabic(String(text)).includes(normalizeArabic(String(query)));
};

// ═══════════════════════════════════════════════════════════
// 🔧 الدالة الأساسية: تحويل select إلى بحث
// ═══════════════════════════════════════════════════════════

window.makeSelectSearchable = function(selectId, placeholder, icon = '🔍') {
    const original = document.getElementById(selectId);
    if (!original) {
        console.warn(`⚠️ لم أجد العنصر: ${selectId}`);
        return false;
    }
    
    // لو اتعمل قبل كده
    if (original.dataset.searchable === 'true') {
        return true;
    }
    original.dataset.searchable = 'true';
    original.style.display = 'none';
    
    // نبني الخيارات
    const options = [];
    Array.from(original.options).forEach(opt => {
        if (opt.value === '' && original.querySelectorAll('option').length > 1) {
            // خيار افتراضي
            options.push({
                value: '',
                label: opt.textContent.trim(),
                searchText: opt.textContent.trim(),
                icon: icon
            });
        } else if (opt.value !== '') {
            options.push({
                value: opt.value,
                label: opt.textContent.trim(),
                searchText: opt.textContent.trim() + ' ' + opt.value,
                icon: icon
            });
        }
    });
    
    // نبني wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'smart-select-wrapper';
    wrapper.style.cssText = 'position:relative;';
    
    const uid = 'smart_' + selectId + '_' + Date.now();
    
    // القيمة الحالية
    let currentLabel = '';
    const currentOpt = Array.from(original.options).find(o => o.value === original.value);
    if (currentOpt) currentLabel = currentOpt.textContent.trim();
    
    wrapper.innerHTML = `
        <input 
            type="text" 
            id="${uid}_input"
            class="smart-select-input"
            placeholder="${placeholder}"
            value="${currentLabel}"
            autocomplete="off"
        />
        <div id="${uid}_dropdown" class="smart-select-dropdown" style="display:none;"></div>
    `;
    
    original.parentNode.insertBefore(wrapper, original);
    wrapper.appendChild(original);
    
    const input = document.getElementById(uid + '_input');
    const dropdown = document.getElementById(uid + '_dropdown');
    
    // فلترة
    const filterOptions = (query) => {
        if (!query) return options.slice(0, 100);
        return options.filter(opt => 
            matchesSearch(opt.label, query) || 
            matchesSearch(opt.searchText, query) ||
            matchesSearch(opt.value, query)
        ).slice(0, 100);
    };
    
    // عرض القائمة
    const showDropdown = (items) => {
        if (!items.length) {
            dropdown.innerHTML = `<div class="smart-select-empty">❌ لا توجد نتائج</div>`;
            dropdown.style.display = 'block';
            return;
        }
        
        let html = '';
        items.forEach(opt => {
            html += `
                <div class="smart-select-item" data-value="${opt.value}" data-label="${opt.label}">
                    <span class="smart-icon">${opt.icon || ''}</span>
                    <span class="smart-label">${opt.label}</span>
                </div>
            `;
        });
        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
        
        // الاختيار
        dropdown.querySelectorAll('.smart-select-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                const value = this.dataset.value;
                const label = this.dataset.label;
                
                input.value = label;
                original.value = value;
                
                // إطلاق حدث change
                const event = new Event('change', { bubbles: true });
                original.dispatchEvent(event);
                
                dropdown.style.display = 'none';
            });
        });
    };
    
    // الأحداث
    input.addEventListener('input', function() {
        showDropdown(filterOptions(this.value.trim()));
    });
    
    input.addEventListener('focus', function() {
        showDropdown(filterOptions(this.value.trim()));
    });
    
    input.addEventListener('blur', function() {
        setTimeout(() => { dropdown.style.display = 'none'; }, 200);
    });
    
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
            if (current) current.click();
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            input.blur();
        }
    });
    
    return true;
};

// ═══════════════════════════════════════════════════════════
// 🔍 1. البحث في كل صفحات القوائم المنسدلة
// ═══════════════════════════════════════════════════════════

window.applySearchToAllSelects = function() {
    console.log('🔍 تفعيل البحث على كل القوائم المنسدلة...');
    
    // ═══ العملاء ═══
    makeSelectSearchable('saleCustomer', '🔍 اكتب اسم العميل...', '👤');
    makeSelectSearchable('collectCustomer', '🔍 اكتب اسم العميل...', '👤');
    makeSelectSearchable('settleCustomer', '🔍 اكتب اسم العميل...', '👤');
    makeSelectSearchable('retParty', '🔍 اختر العميل أو المورد...', '👤');
    
    // ═══ الموردين ═══
    makeSelectSearchable('purSupplier', '🔍 اكتب اسم المورد...', '🚚');
    makeSelectSearchable('paySupplier', '🔍 اكتب اسم المورد...', '🚚');
    
    // ═══ المنتجات ═══
    makeSelectSearchable('saleProduct', '🔍 اكتب اسم المنتج أو الباركود...', '📦');
    makeSelectSearchable('purProduct', '🔍 اكتب اسم المنتج...', '📦');
    makeSelectSearchable('retProduct', '🔍 اكتب اسم المنتج...', '📦');
    makeSelectSearchable('settleProduct', '🔍 اكتب اسم المنتج...', '📦');
    
    // ═══ المخازن ═══
    makeSelectSearchable('saleWarehouse', '🔍 اكتب اسم المخزن...', '🏪');
    makeSelectSearchable('purWarehouse', '🔍 اكتب اسم المخزن...', '🏪');
    makeSelectSearchable('retWarehouse', '🔍 اكتب اسم المخزن...', '🏪');
    makeSelectSearchable('transferFrom', '🔍 من مخزن...', '🏪');
    makeSelectSearchable('transferTo', '🔍 إلى مخزن...', '🏪');
    makeSelectSearchable('transferProduct', '🔍 اكتب اسم المنتج...', '📦');
    makeSelectSearchable('stockInWarehouse', '🔍 اكتب اسم المخزن...', '🏪');
    makeSelectSearchable('stockInProduct', '🔍 اكتب اسم المنتج...', '📦');
    makeSelectSearchable('stockOutWarehouse', '🔍 اكتب اسم المخزن...', '🏪');
    makeSelectSearchable('stockOutProduct', '🔍 اكتب اسم المنتج...', '📦');
    makeSelectSearchable('openingWarehouse', '🔍 اكتب اسم المخزن...', '🏪');
    makeSelectSearchable('openingProduct', '🔍 اكتب اسم المنتج...', '📦');
    makeSelectSearchable('adjWarehouse', '🔍 اكتب اسم المخزن...', '🏪');
    makeSelectSearchable('adjProduct', '🔍 اكتب اسم المنتج...', '📦');
    
    // ═══ الحسابات ═══
    makeSelectSearchable('jeDebitAccount', '🔍 اكتب اسم الحساب...', '📊');
    makeSelectSearchable('jeCreditAccount', '🔍 اكتب اسم الحساب...', '📊');
    makeSelectSearchable('accParent', '🔍 اكتب اسم الحساب الأب...', '📊');
    
    // ═══ أخرى ═══
    makeSelectSearchable('userRole', '🔍 اختر الدور...', '👤');
    makeSelectSearchable('expCategory', '🔍 اختر التصنيف...', '📂');
    makeSelectSearchable('treasuryType', '🔍 اختر النوع...', '💰');
    makeSelectSearchable('stockInReason', '🔍 اختر السبب...', '📝');
    makeSelectSearchable('stockOutReason', '🔍 اختر السبب...', '📝');
    
    console.log('✅ تم تفعيل البحث على القوائم المنسدلة');
};

// ═══════════════════════════════════════════════════════════
// 🔍 2. تحويل حقول البحث العادية لبحث ذكي
// ═══════════════════════════════════════════════════════════

window.enhanceAllSearchBoxes = function() {
    // كل حقول البحث في التطبيق
    const searchBoxes = [
        'inventorySearch',
        'invoiceSearch',
        'customerSearch',
        'supplierSearch',
        'userSearch',
        'auditSearch',
        'journalSearch'
    ];
    
    searchBoxes.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        if (input.dataset.enhanced === 'true') return;
        input.dataset.enhanced = 'true';
        
        // إضافة زر مسح
        const parent = input.parentNode;
        if (parent && !parent.querySelector('.clear-search-btn')) {
            input.style.paddingLeft = '40px';
            
            const clearBtn = document.createElement('button');
            clearBtn.className = 'clear-search-btn';
            clearBtn.innerHTML = '✕';
            clearBtn.style.cssText = `
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                background: #3D3D3D;
                border: none;
                color: #F5E6C8;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 12px;
                display: none;
                align-items: center;
                justify-content: center;
                font-weight: 900;
            `;
            clearBtn.onclick = () => {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                clearBtn.style.display = 'none';
                input.focus();
            };
            
            parent.style.position = 'relative';
            parent.appendChild(clearBtn);
            
            input.addEventListener('input', () => {
                clearBtn.style.display = input.value ? 'flex' : 'none';
            });
        }
    });
    
    console.log('✅ تم تحسين حقول البحث');
};

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة الشاملة
// ═══════════════════════════════════════════════════════════

window.applySearchEverywhere = function() {
    console.log('🔍 تفعيل البحث في كل التطبيق...');
    applySearchToAllSelects();
    enhanceAllSearchBoxes();
};

// ═══════════════════════════════════════════════════════════
// 🔄 إعادة التفعيل عند التحديث
// ═══════════════════════════════════════════════════════════

// حفظ الدوال الأصلية
const _originalPopulateAll = window.populateAllDropdowns;
window.populateAllDropdowns = function() {
    if (_originalPopulateAll) _originalPopulateAll.apply(this, arguments);
    
    // إعادة تفعيل البحث بعد تحديث القوائم
    setTimeout(() => {
        // إزالة علامة "searchable" لإعادة البناء
        document.querySelectorAll('select[data-searchable="true"]').forEach(sel => {
            const wrapper = sel.closest('.smart-select-wrapper');
            if (wrapper) {
                // إزالة الـ wrapper
                wrapper.parentNode.insertBefore(sel, wrapper);
                wrapper.remove();
                sel.style.display = '';
                delete sel.dataset.searchable;
            }
        });
        applySearchToAllSelects();
    }, 300);
};

// حفظ دالة التنقل
const _originalNavigateTo = window.navigateTo;
window.navigateTo = function(page) {
    if (_originalNavigateTo) _originalNavigateTo.apply(this, arguments);
    
    // إعادة التفعيل عند التنقل
    setTimeout(applySearchToAllSelects, 400);
};

// ═══════════════════════════════════════════════════════════
// 🚀 التشغيل التلقائي
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    // تشغيل بعد تحميل كل الملفات
    setTimeout(() => {
        applySearchEverywhere();
    }, 2500);
    
    // مراقبة التغييرات في DOM
    const observer = new MutationObserver((mutations) => {
        let shouldReapply = false;
        mutations.forEach(m => {
            if (m.addedNodes.length) {
                m.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'SELECT' || node.querySelector?.('select')) {
                            shouldReapply = true;
                        }
                    }
                });
            }
        });
        if (shouldReapply) {
            clearTimeout(window._searchReapplyTimer);
            window._searchReapplyTimer = setTimeout(applySearchToAllSelects, 500);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// ═══════════════════════════════════════════════════════════
// 🔧 دالة يدوية (في حال الحاجة)
// ═══════════════════════════════════════════════════════════

window.refreshSearch = function() {
    applySearchEverywhere();
    showToast('✅ تم تحديث البحث في التطبيق', 'success');
};

console.log('✅ تم تحميل app-search-all.js بنجاح');
console.log('🔍 البحث الشامل جاهز');
