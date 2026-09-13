// ============================================================
// الميزان 14.0.0 - البحث القسري في كل التطبيق
// app-search-force.js
// ============================================================
// 
// يستخدم MutationObserver لاكتشاف القوائم فور بنائها
// ويطبّق البحث عليها فوراً
// ============================================================

console.log('🔍 تحميل app-search-force.js');

// ═══════════════════════════════════════════════════════════
// 🎨 تطبيع النص
// ═══════════════════════════════════════════════════════════
window.normalizeArabic = function(text) {
    if (!text) return '';
    return String(text).toLowerCase().trim()
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
// 🔧 القائمة الواحدة
// ═══════════════════════════════════════════════════════════
window.makeSelectSearchable = function(selectId, placeholder, icon) {
    icon = icon || '🔍';
    const original = document.getElementById(selectId);
    if (!original) return false;
    if (original.dataset.searchable === 'true') return true;
    
    original.dataset.searchable = 'true';
    original.style.display = 'none';
    
    const options = [];
    Array.from(original.options).forEach(opt => {
        if (opt.value !== '') {
            options.push({
                value: opt.value,
                label: opt.textContent.trim(),
                searchText: opt.textContent.trim() + ' ' + opt.value,
                icon: icon
            });
        }
    });
    
    const wrapper = document.createElement('div');
    wrapper.className = 'smart-select-wrapper';
    wrapper.style.cssText = 'position:relative;';
    const uid = 'smart_' + selectId + '_' + Date.now();
    
    let currentLabel = '';
    const currentOpt = Array.from(original.options).find(o => o.value === original.value);
    if (currentOpt && currentOpt.value !== '') currentLabel = currentOpt.textContent.trim();
    
    wrapper.innerHTML = 
        '<input type="text" id="' + uid + '_input" class="smart-select-input" placeholder="' + placeholder + '" value="' + currentLabel + '" autocomplete="off" />' +
        '<div id="' + uid + '_dropdown" class="smart-select-dropdown" style="display:none;"></div>';
    
    original.parentNode.insertBefore(wrapper, original);
    wrapper.appendChild(original);
    
    const input = document.getElementById(uid + '_input');
    const dropdown = document.getElementById(uid + '_dropdown');
    
    const filterOptions = (query) => {
        if (!query) return options.slice(0, 100);
        return options.filter(o => 
            matchesSearch(o.label, query) || 
            matchesSearch(o.searchText, query)
        ).slice(0, 100);
    };
    
    const showDropdown = (items) => {
        if (!items.length) {
            dropdown.innerHTML = '<div class="smart-select-empty">❌ لا توجد نتائج</div>';
            dropdown.style.display = 'block';
            return;
        }
        let html = '';
        items.forEach(o => {
            html += '<div class="smart-select-item" data-value="' + o.value + '" data-label="' + o.label + '">' +
                '<span class="smart-icon">' + o.icon + '</span>' +
                '<span class="smart-label">' + o.label + '</span>' +
                '</div>';
        });
        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
        
        dropdown.querySelectorAll('.smart-select-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                input.value = this.dataset.label;
                original.value = this.dataset.value;
                original.dispatchEvent(new Event('change', { bubbles: true }));
                dropdown.style.display = 'none';
            });
        });
    };
    
    input.addEventListener('input', function() { showDropdown(filterOptions(this.value.trim())); });
    input.addEventListener('focus', function() { showDropdown(filterOptions(this.value.trim())); });
    input.addEventListener('blur', function() { setTimeout(() => { dropdown.style.display = 'none'; }, 200); });
    
    input.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.smart-select-item');
        const current = dropdown.querySelector('.smart-select-item.active');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!items.length) return;
            if (!current) { items[0].classList.add('active'); items[0].scrollIntoView({ block: 'nearest' }); }
            else {
                const idx = Array.from(items).indexOf(current);
                if (idx < items.length - 1) { current.classList.remove('active'); items[idx + 1].classList.add('active'); items[idx + 1].scrollIntoView({ block: 'nearest' }); }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!items.length) return;
            if (!current) { items[items.length - 1].classList.add('active'); items[items.length - 1].scrollIntoView({ block: 'nearest' }); }
            else {
                const idx = Array.from(items).indexOf(current);
                if (idx > 0) { current.classList.remove('active'); items[idx - 1].classList.add('active'); items[idx - 1].scrollIntoView({ block: 'nearest' }); }
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
// 🔄 إعادة بناء البحث (مع إزالة القديم)
// ═══════════════════════════════════════════════════════════
window.rebuildSearch = function() {
    // 1. إزالة كل الـ wrappers القديمة
    document.querySelectorAll('.smart-select-wrapper').forEach(wrapper => {
        const sel = wrapper.querySelector('select');
        if (sel) {
            wrapper.parentNode.insertBefore(sel, wrapper);
            sel.style.display = '';
            delete sel.dataset.searchable;
            wrapper.remove();
        }
    });
    
    // 2. تطبيق البحث على كل القوائم
    const configs = [
        // العملاء
        ['saleCustomer', '🔍 اكتب اسم العميل...', '👤'],
        ['collectCustomer', '🔍 اكتب اسم العميل...', '👤'],
        ['settleCustomer', '🔍 اكتب اسم العميل...', '👤'],
        ['retParty', '🔍 اختر الجهة...', '👤'],
        // الموردين
        ['purSupplier', '🔍 اكتب اسم المورد...', '🚚'],
        ['paySupplier', '🔍 اكتب اسم المورد...', '🚚'],
        // المنتجات
        ['saleProduct', '🔍 اكتب اسم المنتج أو الباركود...', '📦'],
        ['purProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['retProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['settleProduct', '🔍 اكتب اسم المنتج...', '📦'],
        // المخازن
        ['saleWarehouse', '🔍 اكتب اسم المخزن...', '🏪'],
        ['purWarehouse', '🔍 اكتب اسم المخزن...', '🏪'],
        ['retWarehouse', '🔍 اكتب اسم المخزن...', '🏪'],
        ['transferFrom', '🔍 من مخزن...', '🏪'],
        ['transferTo', '🔍 إلى مخزن...', '🏪'],
        ['transferProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['stockInWarehouse', '🔍 اكتب اسم المخزن...', '🏪'],
        ['stockInProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['stockOutWarehouse', '🔍 اكتب اسم المخزن...', '🏪'],
        ['stockOutProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['openingWarehouse', '🔍 اكتب اسم المخزن...', '🏪'],
        ['openingProduct', '🔍 اكتب اسم المنتج...', '📦'],
        ['adjWarehouse', '🔍 اكتب اسم المخزن...', '🏪'],
        ['adjProduct', '🔍 اكتب اسم المنتج...', '📦'],
        // الحسابات
        ['jeDebitAccount', '🔍 الحساب المدين...', '📊'],
        ['jeCreditAccount', '🔍 الحساب الدائن...', '📊'],
        ['accParent', '🔍 الحساب الأب...', '📊']
    ];
    
    let applied = 0;
    configs.forEach(([id, placeholder, icon]) => {
        if (makeSelectSearchable(id, placeholder, icon)) applied++;
    });
    
    return applied;
};

// ═══════════════════════════════════════════════════════════
// 🔄 الحقول العادية - زر مسح
// ═══════════════════════════════════════════════════════════
window.enhanceSearchInputs = function() {
    const ids = ['inventorySearch', 'invoiceSearch', 'customerSearch', 'supplierSearch', 'userSearch', 'auditSearch', 'journalSearch'];
    ids.forEach(id => {
        const input = document.getElementById(id);
        if (!input || input.dataset.enhanced === 'true') return;
        input.dataset.enhanced = 'true';
        
        const parent = input.parentNode;
        if (parent && !parent.querySelector('.clear-search-btn')) {
            parent.style.position = 'relative';
            input.style.paddingLeft = '40px';
            
            const btn = document.createElement('button');
            btn.className = 'clear-search-btn';
            btn.innerHTML = '✕';
            btn.style.cssText = 'position:absolute;left:12px;top:50%;transform:translateY(-50%);background:#3D3D3D;border:none;color:#F5E6C8;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:12px;display:none;align-items:center;justify-content:center;font-weight:900;';
            btn.onclick = () => {
                input.value = '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
                btn.style.display = 'none';
                input.focus();
            };
            parent.appendChild(btn);
            
            input.addEventListener('input', () => {
                btn.style.display = input.value ? 'flex' : 'none';
            });
        }
    });
};

// ═══════════════════════════════════════════════════════════
// 🚀 التطبيق الشامل
// ═══════════════════════════════════════════════════════════
window.applySearchNow = function() {
    const count = rebuildSearch();
    enhanceSearchInputs();
    console.log(`✅ تم تفعيل البحث على ${count} قائمة`);
};

// ═══════════════════════════════════════════════════════════
// 🔄 MutationObserver - يراقب القوائم ويطبق البحث فوراً
// ═══════════════════════════════════════════════════════════
window.startSearchObserver = function() {
    const observer = new MutationObserver((mutations) => {
        let needsRebuild = false;
        
        mutations.forEach(m => {
            // لو اتضاف select جديد
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'SELECT') {
                        needsRebuild = true;
                    } else if (node.querySelector && node.querySelector('select')) {
                        needsRebuild = true;
                    }
                }
            });
            
            // لو اتغيرت خيارات select
            if (m.type === 'childList' && m.target.tagName === 'SELECT') {
                // القائمة تحدثت، نعيد تفعيل البحث عليها
                const sel = m.target;
                if (sel.dataset.searchable === 'true') {
                    // نحذف العلامة، عشان نعيد البناء
                    delete sel.dataset.searchable;
                    needsRebuild = true;
                }
            }
        });
        
        if (needsRebuild) {
            clearTimeout(window._rebuildTimer);
            window._rebuildTimer = setTimeout(() => {
                applySearchNow();
            }, 100);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('👀 MutationObserver شغال - سيراقب القوائم');
};

// ═══════════════════════════════════════════════════════════
// 🚀 التشغيل
// ═══════════════════════════════════════════════════════════

// عند فتح الصفحة
window.addEventListener('DOMContentLoaded', function() {
    // انتظر حتى تتحمل كل البيانات
    setTimeout(() => {
        applySearchNow();
        startSearchObserver();
    }, 3000);
    
    // إعادة التطبيق كل ثانية لأول 15 ثانية (عشان نضمن)
    let count = 0;
    const interval = setInterval(() => {
        count++;
        applySearchNow();
        if (count >= 15) clearInterval(interval);
    }, 1000);
});

// عند التنقل بين الصفحات
const _nav = window.navigateTo;
window.navigateTo = function(page) {
    if (_nav) _nav.apply(this, arguments);
    setTimeout(applySearchNow, 200);
    setTimeout(applySearchNow, 600);
    setTimeout(applySearchNow, 1200);
};

// عند تحديث القوائم
const _populate = window.populateAllDropdowns;
window.populateAllDropdowns = function() {
    if (_populate) _populate.apply(this, arguments);
    setTimeout(applySearchNow, 200);
    setTimeout(applySearchNow, 700);
};

// دالة يدوية لو احتجت
window.refreshSearchNow = function() {
    applySearchNow();
    showToast('✅ تم تحديث البحث', 'success');
};

console.log('✅ app-search-force.js جاهز');
