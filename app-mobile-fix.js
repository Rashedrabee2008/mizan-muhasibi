// ============================================================
// الميزان 14.0.0 - حل مشكلة الكيبورد على الموبايل
// app-mobile-fix.js
// ============================================================
// 
// المشكلة: البحث مش بيفتح الكيبورد على الموبايل
// الحل: استخدام touchstart بدل mousedown + تحسينات الموبايل
// ============================================================

console.log('📱 تحميل app-mobile-fix.js - إصلاح الموبايل');

// ═══════════════════════════════════════════════════════════
// 🔍 كشف الموبايل
// ═══════════════════════════════════════════════════════════
window.isMobile = function() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth <= 768;
};

// ═══════════════════════════════════════════════════════════
// 🔧 إعادة بناء القائمة المنسدلة (المصححة للموبايل)
// ═══════════════════════════════════════════════════════════
window.makeSelectSearchableFixed = function(selectId, placeholder, icon) {
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
    
    // لو مفيش خيارات، منعملش حاجة
    if (options.length === 0) {
        original.style.display = '';
        delete original.dataset.searchable;
        return false;
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'smart-select-wrapper';
    wrapper.style.cssText = 'position:relative;';
    const uid = 'smart_' + selectId + '_' + Date.now();
    
    let currentLabel = '';
    const currentOpt = Array.from(original.options).find(o => o.value === original.value);
    if (currentOpt && currentOpt.value !== '') currentLabel = currentOpt.textContent.trim();
    
    wrapper.innerHTML = 
        '<input type="text" id="' + uid + '_input" class="smart-select-input" ' +
        'placeholder="' + placeholder + '" value="' + currentLabel + '" ' +
        'autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" ' +
        'inputmode="text" />' +
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
        
        // ═══ الحل الأساسي: استخدام mousedown على الكمبيوتر + touchend على الموبايل ═══
        dropdown.querySelectorAll('.smart-select-item').forEach(item => {
            const handleSelect = function(e) {
                // ✅ نمنع فقط على الكمبيوتر، مش على الموبايل
                if (!isMobile()) {
                    e.preventDefault();
                }
                
                const value = this.dataset.value;
                const label = this.dataset.label;
                
                input.value = label;
                original.value = value;
                original.dispatchEvent(new Event('change', { bubbles: true }));
                dropdown.style.display = 'none';
                
                // ✅ نرجع الفوكس للخارج (عشان الكيبورد يقفل بعد الاختيار)
                input.blur();
            };
            
            // ✅ للكمبيوتر
            item.addEventListener('mousedown', handleSelect);
            
            // ✅ للموبايل - touchstart أفضل من click
            item.addEventListener('touchstart', function(e) {
                e.preventDefault(); // ✅ مهم عشان مايفتحش الكيبورد تاني
                handleSelect.call(this, e);
            }, { passive: false });
        });
    };
    
    // ═══ الأحداث - محسّنة للموبايل ═══
    
    // ✅ عند الكتابة - بتشتغل على الموبايل والكمبيوتر
    input.addEventListener('input', function() {
        showDropdown(filterOptions(this.value.trim()));
    });
    
    // ✅ عند الفوكس - ما نمنعش الفوكس على الموبايل
    input.addEventListener('focus', function() {
        showDropdown(filterOptions(this.value.trim()));
    });
    
    // ✅ عند الخروج - تأخير بسيط عشان نقدر نختار من القايمة
    input.addEventListener('blur', function() {
        setTimeout(() => { 
            dropdown.style.display = 'none'; 
        }, 300);
    });
    
    // ✅ منع لوحة المفاتيح من التصرف بشكل غريب
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
    
    // ✅ مهم جداً: منع التنقل بالتاب من قفل القائمة
    input.addEventListener('touchstart', function(e) {
        // لا نمنع السلوك الافتراضي، عشان الكيبورد يفتح
    }, { passive: true });
    
    return true;
};

// ═══════════════════════════════════════════════════════════
// 🔄 إعادة بناء البحث (بالنسخة المصححة)
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
        if (makeSelectSearchableFixed(id, placeholder, icon)) applied++;
    });
    
    return applied;
};

// ═══════════════════════════════════════════════════════════
// 🔧 إصلاح الكيبورد على الموبايل - منع Zoom
// ═══════════════════════════════════════════════════════════
window.fixMobileKeyboard = function() {
    // ✅ منع الزووم التلقائي عند الكتابة
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
        metaViewport.setAttribute('content', 
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
    }
    
    // ✅ التأكد من أن كل حقول الإدخال لها حجم مناسب (16px+) لمنع الزووم على iOS
    const style = document.createElement('style');
    style.textContent = `
        /* منع الزووم على iOS */
        input[type="text"],
        input[type="number"],
        input[type="password"],
        input[type="date"],
        input[type="email"],
        input[type="tel"],
        input[type="search"],
        select,
        textarea,
        .smart-select-input {
            font-size: 16px !important;
            -webkit-text-size-adjust: 100%;
            touch-action: manipulation;
        }
        
        /* تحسين النقر على الموبايل */
        .smart-select-item,
        .btn,
        .nav-item,
        button {
            -webkit-tap-highlight-color: rgba(201, 169, 78, 0.3);
            touch-action: manipulation;
        }
        
        /* منع تحديد النص في الأزرار */
        .btn, .nav-item, button, .smart-select-item {
            -webkit-user-select: none;
            -moz-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
        }
        
        /* نسمح بتحديد النص في حقل البحث */
        input, textarea {
            -webkit-user-select: text;
            user-select: text;
        }
        
        /* القائمة المنسدلة على الموبايل */
        @media (max-width: 768px) {
            .smart-select-dropdown {
                position: fixed !important;
                top: auto !important;
                bottom: 0 !important;
                right: 0 !important;
                left: 0 !important;
                max-height: 60vh !important;
                border-radius: 16px 16px 0 0 !important;
                animation: slideUpMobile 0.3s ease-out !important;
                z-index: 99999 !important;
            }
            
            @keyframes slideUpMobile {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }
            
            .smart-select-item {
                padding: 16px 14px !important;
                font-size: 15px !important;
                border-bottom: 1px solid #2D2D2D !important;
            }
            
            .smart-icon {
                font-size: 20px !important;
            }
            
            .smart-label {
                font-size: 15px !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ تم إصلاح إعدادات الموبايل');
};

// ═══════════════════════════════════════════════════════════
// 🚀 التطبيق الشامل
// ═══════════════════════════════════════════════════════════
window.applyMobileFix = function() {
    fixMobileKeyboard();
    const count = rebuildSearch();
    console.log(`📱 تم تطبيق إصلاح الموبايل على ${count} قائمة`);
    return count;
};

// ═══════════════════════════════════════════════════════════
// 🔄 MutationObserver - يراقب القوائم
// ═══════════════════════════════════════════════════════════
window.startMobileObserver = function() {
    const observer = new MutationObserver((mutations) => {
        let needsRebuild = false;
        
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'SELECT') needsRebuild = true;
                    else if (node.querySelector && node.querySelector('select')) needsRebuild = true;
                }
            });
            
            if (m.type === 'childList' && m.target.tagName === 'SELECT') {
                const sel = m.target;
                if (sel.dataset.searchable === 'true') {
                    delete sel.dataset.searchable;
                    needsRebuild = true;
                }
            }
        });
        
        if (needsRebuild) {
            clearTimeout(window._mobileRebuildTimer);
            window._mobileRebuildTimer = setTimeout(() => {
                applyMobileFix();
            }, 150);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
};

// ═══════════════════════════════════════════════════════════
// 🚀 التشغيل
// ═══════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', function() {
    // انتظر حتى تتحمل كل البيانات
    setTimeout(() => {
        applyMobileFix();
        startMobileObserver();
        console.log('📱 التطبيق جاهز للموبايل والكمبيوتر');
    }, 3000);
    
    // إعادة التطبيق أول 15 ثانية
    let count = 0;
    const interval = setInterval(() => {
        count++;
        applyMobileFix();
        if (count >= 15) clearInterval(interval);
    }, 1000);
});

// عند التنقل
const _navMobile = window.navigateTo;
window.navigateTo = function(page) {
    if (_navMobile) _navMobile.apply(this, arguments);
    setTimeout(applyMobileFix, 200);
    setTimeout(applyMobileFix, 600);
};

// عند تحديث القوائم
const _populateMobile = window.populateAllDropdowns;
window.populateAllDropdowns = function() {
    if (_populateMobile) _populateMobile.apply(this, arguments);
    setTimeout(applyMobileFix, 200);
    setTimeout(applyMobileFix, 700);
};

console.log('✅ app-mobile-fix.js جاهز');
console.log('📱 البحث سيعمل على الموبايل والكمبيوتر');
