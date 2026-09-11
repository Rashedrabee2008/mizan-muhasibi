// ============================================================
// الميزان 14.0.0 - ملف المميزات الإضافية (app-part4.js)
// الطباعة الحرارية + تشفير كلمات المرور + إشعارات واتساب
// ============================================================
// 
// ⚠️ ملاحظة مهمة:
// - هذا الملف معزول تماماً عن الملفات الأصلية
// - لو حصل أي مشكلة، امسح السطر من index.html وترجع زي الأول
// - لا يحتاج تعديل أي ملف آخر
//
// ============================================================

console.log('🚀 تحميل app-part4.js - المميزات الإضافية');

// ═══════════════════════════════════════════════════════════
// 🔒 1. تشفير كلمات المرور (SHA-256)
// ═══════════════════════════════════════════════════════════

window.hashPassword = async function(password) {
    if (!password) return '';
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + '_MIZAN_SALT_2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        console.error('❌ فشل التشفير:', e);
        return password;
    }
};

window.verifyPassword = async function(plainPassword, hashedPassword) {
    if (!hashedPassword) return false;
    // دعم كلمات المرور القديمة (غير المشفرة)
    if (hashedPassword.length !== 64) {
        return plainPassword === hashedPassword;
    }
    const hash = await hashPassword(plainPassword);
    return hash === hashedPassword;
};

// 🔐 إعادة كتابة checkLogin لدعم التشفير
window.checkLogin = async function() {
    const userIdEl = $('loginUsername');
    const passwordEl = $('loginPassword');
    const error = $('loginError');
    if (!userIdEl || !passwordEl) return;
    const userId = userIdEl.value;
    const password = passwordEl.value;
    if (!userId) { if (error) error.classList.add('show'); return; }
    const user = users.find(u => u.id == userId);
    if (!user) { if (error) error.classList.add('show'); return; }
    
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
        if (error) error.classList.add('show');
        passwordEl.value = '';
        passwordEl.focus();
        setTimeout(() => { if (error) error.classList.remove('show'); }, 3000);
        return;
    }
    
    // تحديث كلمة المرور للتشفير تلقائياً
    if (user.password.length !== 64) {
        user.password = await hashPassword(password);
        setData('users', users);
        console.log('🔒 تم تشفير كلمة مرور المستخدم:', user.name);
    }
    
    window.currentUser = user;
    localStorage.setItem(STORAGE_KEY + 'current_user', JSON.stringify({ id: user.id, name: user.name, role: user.role }));
    if (error) error.classList.remove('show');
    passwordEl.value = '';
    const loginCont = $('loginContainer');
    const appCont = $('appContent');
    if (loginCont) loginCont.classList.add('hidden');
    if (appCont) appCont.style.display = 'block';
    updateUserUI();
    applyPermissions();
    addAuditLog('login', 'user', `تسجيل دخول: ${user.name}`, { userId: user.id, role: user.role });
    showToast(`🔓 مرحباً ${user.name}!`, 'success');
    navigateTo('dashboard');
};

// 🔐 إعادة كتابة saveUser لدعم التشفير
window.saveUser = async function() {
    if (!canManageUsers()) { showToast('⚠️ المدير فقط', 'error'); return; }
    const id = $('userId').value;
    const name = $('userName').value.trim();
    const password = $('userPassword').value.trim();
    const role = $('userRole').value;
    if (!name) { showToast('⚠️ أدخل اسم المستخدم', 'error'); return; }
    if (!password || password.length < 4) { showToast('⚠️ كلمة المرور 4 أحرف على الأقل', 'error'); return; }
    
    const hashedPassword = await hashPassword(password);
    
    if (id) {
        const idx = users.findIndex(u => u.id == id);
        if (idx > -1) {
            if (users[idx].role === 'admin' && role !== 'admin') {
                const otherAdmins = users.filter(u => u.role === 'admin' && u.id != id);
                if (otherAdmins.length === 0) { showToast('⚠️ لا يمكن تغيير دور المدير الأخير', 'error'); return; }
            }
            users[idx] = { ...users[idx], name, password: hashedPassword, role, encrypted: true };
            addAuditLog('edit', 'user', `تعديل مستخدم: ${name}`);
            showToast('✅ تم تعديل المستخدم', 'success');
        }
    } else {
        if (users.find(u => u.name === name)) { showToast('⚠️ اسم المستخدم موجود', 'warning'); return; }
        users.push({ 
            id: Date.now(), name, password: hashedPassword, role, 
            active: true, encrypted: true,
            createdAt: new Date().toISOString()
        });
        addAuditLog('add', 'user', `إضافة مستخدم: ${name}`);
        showToast('✅ تم إضافة المستخدم', 'success');
    }
    setData('users', users);
    resetUserForm(); renderUsers(); populateLoginUsers(); renderSettings();
};

// 🔐 إعادة كتابة changePassword لدعم التشفير
window.changePassword = async function() {
    if (!currentUser) { showToast('⚠️ غير مسجل دخول', 'error'); return; }
    const oldP = $('oldPassword').value;
    const newP = $('newPassword').value;
    const conP = $('confirmPassword').value;
    
    const isValid = await verifyPassword(oldP, currentUser.password);
    if (!isValid) { showToast('❌ كلمة المرور الحالية خاطئة', 'error'); return; }
    if (newP.length < 4) { showToast('❌ 4 أحرف على الأقل', 'error'); return; }
    if (newP !== conP) { showToast('❌ غير متطابقة', 'error'); return; }
    
    const hashedPassword = await hashPassword(newP);
    
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx > -1) {
        users[idx].password = hashedPassword;
        users[idx].encrypted = true;
        currentUser.password = hashedPassword;
        setData('users', users);
        addAuditLog('edit', 'user', `تغيير كلمة المرور: ${currentUser.name}`);
    }
    $('oldPassword').value = ''; $('newPassword').value = ''; $('confirmPassword').value = '';
    showToast('✅ تم تغيير كلمة المرور بنجاح', 'success');
};

// ═══════════════════════════════════════════════════════════
// 🖨️ 2. الطباعة الحرارية
// ═══════════════════════════════════════════════════════════

window.thermalSize = 'thermal-58';

window.setThermalSize = function(size, btn) {
    window.thermalSize = size;
    document.querySelectorAll('.thermal-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const container = document.getElementById('thermalPrintContainer');
    if (!container) return;
    container.classList.remove('thermal-58', 'thermal-80');
    if (size === 'thermal-58') {
        container.classList.add('thermal-58');
        container.style.maxWidth = '58mm';
        container.style.width = '58mm';
    } else if (size === 'thermal-80') {
        container.classList.add('thermal-80');
        container.style.maxWidth = '80mm';
        container.style.width = '80mm';
    } else {
        container.style.maxWidth = '100%';
        container.style.width = '100%';
    }
};

window.printThermal = function() {
    const printContent = document.getElementById('thermalPrintContainer');
    if (!printContent) { showToast('⚠️ لا يوجد محتوى للطباعة', 'error'); return; }
    
    const pageSize = window.thermalSize === 'thermal-80' ? '80mm' : '58mm';
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>طباعة حرارية</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Courier New', monospace; 
                    background: #fff;
                    color: #000;
                }
                @page { size: ${pageSize} auto; margin: 2mm; }
                .thermal-print {
                    font-family: 'Courier New', monospace;
                    background: #fff;
                    color: #000;
                    padding: 3px;
                    direction: rtl;
                    font-size: 11px;
                    line-height: 1.4;
                    width: 100%;
                    max-width: 100%;
                }
                .th-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
                .th-header h2 { font-size: 14px; font-weight: 900; margin: 3px 0; color: #000; }
                .th-header p { font-size: 10px; margin: 1px 0; color: #000; }
                .th-logo { max-width: 40mm; max-height: 15mm; margin: 3px auto; display: block; filter: grayscale(100%); }
                .th-info { font-size: 10px; padding: 3px 0; border-bottom: 1px dashed #000; margin-bottom: 5px; }
                .th-info div { display: flex; justify-content: space-between; padding: 2px 0; }
                .th-info .lbl { font-weight: 900; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; margin: 5px 0; }
                table th { background: #000; color: #fff; padding: 3px 2px; font-size: 10px; text-align: center; border: none; }
                table td { padding: 3px 2px; text-align: center; border-bottom: 1px dotted #000; font-size: 10px; color: #000; }
                .th-totals { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
                .th-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; color: #000; }
                .th-row.grand { border-top: 1px solid #000; border-bottom: 1px solid #000; font-size: 14px; font-weight: 900; padding: 4px 0; margin: 3px 0; }
                .th-footer { text-align: center; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; font-size: 10px; }
            </style>
        </head>
        <body>
            ${printContent.outerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        setTimeout(() => printWindow.close(), 100);
    }, 500);
};

// ═══════════════════════════════════════════════════════════
// 🔔 3. إشعارات واتساب
// ═══════════════════════════════════════════════════════════

window.cleanPhoneNumber = function(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) cleaned = '2' + cleaned;
    if (!cleaned.startsWith('2') && cleaned.length === 10) cleaned = '20' + cleaned;
    return cleaned;
};

window.sendInvoiceWhatsApp = function(invoiceId) {
    const inv = sales.find(s => s.id === invoiceId);
    if (!inv) return;
    
    const customer = customers.find(c => c.name === inv.customer);
    let phone = customer?.whatsapp || customer?.phone || '';
    if (!phone) { showToast('⚠️ العميل ليس لديه رقم واتساب', 'error'); return; }
    
    phone = cleanPhoneNumber(phone);
    
    let itemsText = '';
    inv.items.forEach((it, i) => {
        itemsText += `${i + 1}. ${it.name}\n   ${it.qty} × ${formatMoney(it.price)} = ${formatMoney(it.total)} ج.م\n`;
    });
    
    const msg = `🧾 *فاتورة رقم #${inv.number}*
━━━━━━━━━━━━━━━━
🏪 *${companyData.name || 'الميزان'}*
${companyData.phone ? `📞 ${companyData.phone}\n` : ''}
━━━━━━━━━━━━━━━━
👤 العميل: ${inv.customer}
📅 التاريخ: ${inv.date}
🕐 الوقت: ${inv.time || ''}
━━━━━━━━━━━━━━━━
*الأصناف:*
${itemsText}
━━━━━━━━━━━━━━━━
المجموع: ${formatMoney(inv.subtotal || inv.total)} ج.م
${inv.vatTotal ? `الضريبة: ${formatMoney(inv.vatTotal)} ج.م\n` : ''}
*الإجمالي: ${formatMoney(inv.total)} ج.م*
${inv.paidAmount ? `المدفوع: ${formatMoney(inv.paidAmount)} ج.م\n` : ''}
${inv.remainingAmount > 0 ? `*المتبقي: ${formatMoney(inv.remainingAmount)} ج.م*\n` : ''}
━━━━━━━━━━━━━━━━
${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}`;
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    addAuditLog('edit', 'sale', `إرسال فاتورة #${inv.number} واتساب إلى ${inv.customer}`);
    showToast('✅ تم فتح واتساب', 'success');
};

window.sendReceiptWhatsApp = function(paymentId) {
    const pay = payments.find(p => p.id === paymentId);
    if (!pay) return;
    
    const person = pay.type === 'collect' 
        ? customers.find(c => c.name === pay.party)
        : suppliers.find(s => s.name === pay.party);
    let phone = person?.whatsapp || person?.phone || '';
    if (!phone) { showToast('⚠️ ليس لديه رقم واتساب', 'error'); return; }
    
    phone = cleanPhoneNumber(phone);
    const isCollect = pay.type === 'collect';
    
    const msg = `✅ *إيصال ${isCollect ? 'استلام' : 'دفع'} نقدية*
━━━━━━━━━━━━━━━━
🏪 *${companyData.name || 'الميزان'}*
━━━━━━━━━━━━━━━━
${isCollect ? '👤 العميل' : '🚚 المورد'}: ${pay.party}
📅 التاريخ: ${pay.date}
🕐 الوقت: ${pay.time || ''}
💰 *المبلغ: ${formatMoney(pay.amount)} ج.م*
${pay.note ? `📝 ملاحظات: ${pay.note}\n` : ''}
━━━━━━━━━━━━━━━━
${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}`;
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    showToast('✅ تم فتح واتساب', 'success');
};

window.remindCustomerWhatsApp = function(customerName) {
    const customer = customers.find(c => c.name === customerName);
    if (!customer) return;
    
    let phone = customer.whatsapp || customer.phone || '';
    if (!phone) { showToast('⚠️ العميل ليس لديه رقم واتساب', 'error'); return; }
    
    const balance = getCustomerBalance(customerName);
    if (balance <= 0) { showToast('⚠️ العميل ليس عليه مديونية', 'warning'); return; }
    
    phone = cleanPhoneNumber(phone);
    
    const unpaidInvoices = sales.filter(s => 
        s.customer === customerName && 
        s.paymentMethod === 'credit' && 
        (s.status === 'unpaid' || s.status === 'partial')
    ).sort((a, b) => a.id - b.id);
    
    let invoicesText = '';
    unpaidInvoices.forEach(inv => {
        invoicesText += `• فاتورة #${inv.number} (${inv.date}): ${formatMoney(inv.remainingAmount || inv.total)} ج.م\n`;
    });
    
    const msg = `🔔 *تذكير بمديونية*
━━━━━━━━━━━━━━━━
🏪 *${companyData.name || 'الميزان'}*
${companyData.phone ? `📞 ${companyData.phone}\n` : ''}
━━━━━━━━━━━━━━━━
👤 عزيزي/عزيزتي *${customerName}*

نود تذكيركم بمديونية مستحقة لدينا:

*الفواتير غير المسددة:*
${invoicesText}
━━━━━━━━━━━━━━━━
💰 *إجمالي المديونية: ${formatMoney(balance)} ج.م*
━━━━━━━━━━━━━━━━

نرجو التكرم بالسداد في أقرب وقت.
شكراً لتعاملكم معنا 🌟`;
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    showToast('✅ تم فتح واتساب', 'success');
};

// ═══════════════════════════════════════════════════════════
// 🎨 4. تكامل الطباعة والواتساب مع عرض الفاتورة
// ═══════════════════════════════════════════════════════════

// 🔄 إعادة كتابة showSaleInvoiceDetails لتشمل الطباعة الحرارية والواتساب
window.showSaleInvoiceDetails = function(inv) {
    let itemsHtml = '';
    inv.items.forEach((it, i) => {
        itemsHtml += `<tr><td>${i + 1}</td><td>${it.name}</td><td>${it.qty}</td><td>${formatMoney(it.price)}</td><td>${formatMoney(it.total)}</td></tr>`;
    });
    
    let thermalItemsHtml = '';
    inv.items.forEach((it) => {
        thermalItemsHtml += `<tr><td>${it.name}</td><td>${it.qty}</td><td>${formatMoney(it.price)}</td><td>${formatMoney(it.total)}</td></tr>`;
    });
    
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="inv-logo" alt="logo">` : '';
    const logoThermal = companyData.logo ? `<img src="${companyData.logo}" class="th-logo" alt="logo">` : '';
    const pm = inv.paymentMethod || 'cash';
    const isTax = inv.invoiceType === 'tax';
    const taxBadge = isTax ? `<span class="tax-badge">🧾 فاتورة ضريبية</span>` : '';
    const subtotal = inv.subtotal !== undefined ? inv.subtotal : inv.total;
    const vatTotal = inv.vatTotal || 0;
    const paid = inv.paidAmount || 0;
    const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : 0;
    const status = inv.status || (pm === 'cash' ? 'paid' : 'unpaid');
    const relatedPayments = (inv.relatedPayments || []).map(pid => payments.find(p => p.id === pid)).filter(Boolean);
    const relatedReturns = (inv.relatedReturns || []).map(rid => returns.find(r => r.id === rid)).filter(Boolean);
    
    const customer = customers.find(c => c.name === inv.customer);
    const hasWhatsapp = !!(customer?.whatsapp || customer?.phone);
    
    let paymentsHtml = '';
    if (relatedPayments.length > 0) {
        paymentsHtml = `<div class="invoice-related-section" style="border-right-color:#2D8F5E;">
            <h4>💰 الدفعات (${relatedPayments.length})</h4>
            ${relatedPayments.map(p => `<div class="invoice-related-item"><span>${p.date} ${p.time || ''}</span><span style="color:#2D8F5E;font-weight:700;">${formatMoney(p.amount)} ج.م</span></div>`).join('')}
        </div>`;
    }
    
    let returnsHtml = '';
    if (relatedReturns.length > 0) {
        returnsHtml = `<div class="invoice-related-section" style="border-right-color:#E6A830;">
            <h4>🔄 المرتجعات (${relatedReturns.length})</h4>
            ${relatedReturns.map(r => `<div class="invoice-related-item"><span>#${r.number} - ${r.date}</span><span style="color:#E6A830;font-weight:700;">${formatMoney(r.total)} ج.م</span></div>`).join('')}
        </div>`;
    }
    
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📄 فاتورة #${inv.number}</h3>
        
        <div class="thermal-options">
            <button class="thermal-btn active" onclick="setThermalSize('thermal-58', this)">🧾 58mm</button>
            <button class="thermal-btn" onclick="setThermalSize('thermal-80', this)">🧾 80mm</button>
            <button class="thermal-btn" onclick="setThermalSize('normal', this)">📄 عادي</button>
        </div>
        
        <div class="invoice-detail">
            <div class="detail-row"><span>العميل:</span><span>${inv.customer}</span></div>
            <div class="detail-row"><span>التاريخ:</span><span>${inv.date} ${inv.time || ''}</span></div>
            <div class="detail-row"><span>الإجمالي:</span><span style="color:#C9A94E;font-weight:900;">${formatMoney(inv.total)} ج.م</span></div>
            <div class="detail-row"><span>المتبقي:</span><span style="color:#E06060;font-weight:700;">${formatMoney(remaining)} ج.م</span></div>
        </div>
        
        ${paymentsHtml}
        ${returnsHtml}
        
        <!-- 🖨️ محتوى الطباعة الحرارية -->
        <div id="thermalPrintContainer" class="thermal-print thermal-58">
            <div class="th-header">
                ${logoThermal}
                <h2>${companyData.name || 'الميزان'}</h2>
                ${companyData.phone ? `<p>📞 ${companyData.phone}</p>` : ''}
                ${companyData.address ? `<p>📍 ${companyData.address}</p>` : ''}
                ${companyData.tax ? `<p>🆔 ${companyData.tax}</p>` : ''}
            </div>
            
            <div class="th-info">
                <div><span class="lbl">فاتورة:</span><span>#${inv.number}</span></div>
                <div><span class="lbl">التاريخ:</span><span>${inv.date}</span></div>
                <div><span class="lbl">الوقت:</span><span>${inv.time || ''}</span></div>
                <div><span class="lbl">العميل:</span><span>${inv.customer}</span></div>
                <div><span class="lbl">الدفع:</span><span>${pm === 'cash' ? 'نقدي' : pm === 'settlement' ? 'مقاصة' : 'آجل'}</span></div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>الصنف</th>
                        <th>كمية</th>
                        <th>سعر</th>
                        <th>إجمالي</th>
                    </tr>
                </thead>
                <tbody>${thermalItemsHtml}</tbody>
            </table>
            
            <div class="th-totals">
                <div class="th-row"><span>المجموع:</span><span>${formatMoney(subtotal)}</span></div>
                ${isTax ? `<div class="th-row"><span>الضريبة:</span><span>${formatMoney(vatTotal)}</span></div>` : ''}
                <div class="th-row grand"><span>الإجمالي:</span><span>${formatMoney(inv.total)} ج.م</span></div>
                ${paid > 0 ? `<div class="th-row"><span>المدفوع:</span><span>${formatMoney(paid)}</span></div>` : ''}
                ${remaining > 0 ? `<div class="th-row"><span>المتبقي:</span><span>${formatMoney(remaining)}</span></div>` : ''}
            </div>
            
            <div class="th-footer">
                <p>${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</p>
                <p style="font-size:9px;margin-top:5px;">${new Date().toLocaleString('ar')}</p>
            </div>
        </div>
        
        <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="printThermal()" style="flex:1;min-width:100px;"><i class="fas fa-print"></i> طباعة حرارية</button>
            <button class="btn btn-secondary" onclick="window.print()" style="flex:1;min-width:100px;"><i class="fas fa-file-pdf"></i> طباعة A4</button>
            ${hasWhatsapp ? `<button class="whatsapp-btn" onclick="sendInvoiceWhatsApp(${inv.id})" style="flex:1;min-width:100px;justify-content:center;"><i class="fab fa-whatsapp"></i> واتساب</button>` : ''}
            ${remaining > 0 && canAdd() ? `<button class="btn btn-success" onclick="closeModal(); openCollectModal('${inv.customer}')" style="flex:1;min-width:100px;"><i class="fas fa-hand-holding-usd"></i> تحصيل</button>` : ''}
            <button class="btn btn-secondary" onclick="closeModal()" style="flex:1;min-width:100px;"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
};

// 🔄 إعادة كتابة viewCustomerStatement لتشمل زر الواتساب
window.viewCustomerStatement = function(customerName) {
    const custSales = sales.filter(s => s.customer === customerName);
    const custReturns = returns.filter(r => r.type === 'sale' && r.party === customerName);
    const custPayments = payments.filter(p => p.type === 'collect' && p.party === customerName);
    const balance = getCustomerBalance(customerName);
    
    const customer = customers.find(c => c.name === customerName);
    const hasWhatsapp = !!(customer?.whatsapp || customer?.phone);
    
    const allOps = [
        ...custSales.map(s => ({ date: s.date, time: s.time, type: 'sale',
            desc: `فاتورة #${s.number} (${s.paymentMethod === 'credit' ? 'آجل' : s.paymentMethod === 'settlement' ? 'مقاصة' : 'نقدي'})`,
            amount: s.total })),
        ...custReturns.map(r => ({ date: r.date, time: r.time, type: 'return',
            desc: `مرتجع #${r.number}${r.originalInvoiceNumber ? ` (فاتورة #${r.originalInvoiceNumber})` : ''}`,
            amount: -r.total })),
        ...custPayments.map(p => ({ date: p.date, time: p.time, type: 'collect',
            desc: `تحصيل${p.note ? ' - ' + p.note : ''}`,
            amount: -p.amount }))
    ].sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));

    let rowsHtml = '';
    if (allOps.length === 0) {
        rowsHtml = `<tr><td colspan="3" style="text-align:center;color:#A89070;padding:12px;">لا توجد حركات</td></tr>`;
    } else {
        allOps.forEach(op => {
            const color = op.amount > 0 ? '#E06060' : '#2D8F5E';
            const sign = op.amount > 0 ? '+' : '';
            const icon = op.type === 'sale' ? '💰' : op.type === 'return' ? '🔄' : '✅';
            rowsHtml += `<tr>
                <td style="font-size:10px;">${op.date}<br>${op.time || ''}</td>
                <td style="font-size:11px;">${icon} ${op.desc}</td>
                <td style="color:${color};font-weight:700;font-size:11px;">${sign}${formatMoney(Math.abs(op.amount))}</td>
            </tr>`;
        });
    }
    
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3>📋 كشف حساب: ${customerName}</h3>
        <div class="invoice-print">
            <div class="inv-header"><h2>${companyData.name || 'الميزان'}</h2><p>كشف حساب عميل</p></div>
            <div class="inv-info">
                <div><span class="lbl">العميل:</span> ${customerName}</div>
                <div><span class="lbl">التاريخ:</span> ${getTodayDate()}</div>
                <div style="grid-column: 1 / -1; text-align:center; margin-top:8px;">
                    <span class="lbl">الرصيد الحالي:</span>
                    <span style="color:${balance > 0 ? '#E06060' : '#2D8F5E'};font-weight:900;font-size:18px;">${formatMoney(balance)} 🇪🇬</span>
                </div>
            </div>
            <table style="margin-top:10px;"><thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead><tbody>${rowsHtml}</tbody></table>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="window.print()" style="flex:1;min-width:100px;"><i class="fas fa-print"></i> طباعة</button>
            ${hasWhatsapp && balance > 0 ? `<button class="whatsapp-btn" onclick="remindCustomerWhatsApp('${customerName}')" style="flex:1;min-width:100px;justify-content:center;"><i class="fab fa-whatsapp"></i> تذكير بالمديونية</button>` : ''}
            <button class="btn btn-secondary" onclick="closeModal()" style="flex:1;min-width:100px;"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
};

// 🔄 إعادة كتابة showReceipt لتشمل زر الواتساب
window.showReceipt = function(pay) {
    const isCollect = pay.type === 'collect';
    const color = isCollect ? '#2D8F5E' : '#E06060';
    const label = isCollect ? 'إيصال استلام نقدية' : 'إيصال دفع نقدية';
    const logoHtml = companyData.logo ? `<img src="${companyData.logo}" class="rec-logo" alt="logo">` : '';
    
    const person = isCollect 
        ? customers.find(c => c.name === pay.party)
        : suppliers.find(s => s.name === pay.party);
    const hasWhatsapp = !!(person?.whatsapp || person?.phone);
    
    let invoicesHtml = '';
    if (pay.relatedInvoices && pay.relatedInvoices.length > 0) {
        invoicesHtml = `
            <div style="background:#1C1C1C;border-radius:8px;padding:10px;margin-bottom:10px;">
                <div style="font-size:11px;color:#C9A94E;font-weight:700;margin-bottom:6px;">🔗 الفواتير المسددة:</div>
                ${pay.relatedInvoices.map(ri => `
                    <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;color:#F5E6C8;border-bottom:1px solid #2D2D2D;">
                        <span>فاتورة #${ri.invoiceNumber}</span>
                        <span style="color:${color};font-weight:700;">${formatMoney(ri.amount)} ج.م</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    const html = `
        <button class="modal-close" onclick="closeModal()">&times;</button>
        <h3 style="color:${color};">🧾 ${label}</h3>
        <div class="receipt-print" style="border-color:${color};">
            <div class="rec-header" style="border-color:${color};">
                ${logoHtml}
                <h2 style="color:${color};">${companyData.name || 'الميزان'}</h2>
                <p>${label}</p>
            </div>
            <div class="rec-info">
                <div><span class="lbl">رقم الإيصال:</span> #${pay.id.toString().slice(-6)}</div>
                <div><span class="lbl">التاريخ:</span> ${pay.date}</div>
                <div><span class="lbl">الوقت:</span> ${pay.time}</div>
                <div><span class="lbl">${isCollect ? 'العميل' : 'المورد'}:</span> ${pay.party}</div>
            </div>
            <div class="rec-amount" style="border-color:${color};">
                <div class="lbl">${isCollect ? 'المبلغ المستلم' : 'المبلغ المدفوع'}</div>
                <div class="value" style="color:${color};">${formatMoney(pay.amount)} 🇪🇬</div>
            </div>
            ${invoicesHtml}
            ${pay.note ? `<div style="text-align:center;font-size:11px;color:#A89070;margin-bottom:10px;">📝 ${pay.note}</div>` : ''}
            <div class="rec-footer">${companyData.footer || 'شكراً لتعاملكم معنا 🌟'}</div>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="window.print()" style="flex:1;min-width:100px;"><i class="fas fa-print"></i> طباعة</button>
            ${hasWhatsapp ? `<button class="whatsapp-btn" onclick="sendReceiptWhatsApp(${pay.id})" style="flex:1;min-width:100px;justify-content:center;"><i class="fab fa-whatsapp"></i> واتساب</button>` : ''}
            <button class="btn btn-secondary" onclick="closeModal()" style="flex:1;min-width:100px;"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
};

// 🔄 إعادة كتابة populateLoginUsers لدعم المستخدمين المشفرين
window.populateLoginUsers = function() {
    const sel = $('loginUsername');
    if (!sel) return;
    sel.innerHTML = '';
    users.forEach(u => {
        if (u.active !== false) {
            sel.innerHTML += `<option value="${u.id}">${u.name} (${ROLES[u.role]?.name || u.role})</option>`;
        }
    });
};

// ═══════════════════════════════════════════════════════════
// 🎨 5. تحسينات إضافية
// ═══════════════════════════════════════════════════════════

// ✅ إضافة مؤشر تشفير في جدول المستخدمين
const originalRenderUsers = window.renderUsers;
window.renderUsers = function() {
    const c = $('userList');
    if (!c || !canManageUsers()) {
        if (originalRenderUsers) originalRenderUsers();
        return;
    }
    
    const search = ($('userSearch')?.value || '').trim().toLowerCase();
    let filtered = users;
    if (search) filtered = users.filter(u => u.name.toLowerCase().includes(search));
    if (filtered.length === 0) {
        c.innerHTML = `<div class="empty-state"><i class="fas fa-users-cog"></i><span>لا يوجد مستخدمين</span></div>`;
        return;
    }
    let html = `<div class="table-header" style="grid-template-columns: 1.5fr 1fr 0.8fr 1.3fr;"><span>الاسم</span><span>الدور</span><span>الحالة</span><span></span></div>`;
    filtered.forEach(u => {
        const roleInfo = ROLES[u.role] || { name: u.role, icon: '❓', color: '#5D5D5D' };
        const isMe = u.id === (currentUser ? currentUser.id : null);
        const isActive = u.active !== false;
        const isEncrypted = u.password && u.password.length === 64;
        html += `<div class="table-row" style="grid-template-columns: 1.5fr 1fr 0.8fr 1.3fr;">
            <span><strong>${u.name}</strong>${isMe ? ' <small style="color:#C9A94E;">(أنت)</small>' : ''}${isEncrypted ? ' <span class="encrypted-badge">🔒</span>' : ''}</span>
            <span><span class="role-badge ${u.role}">${roleInfo.icon} ${roleInfo.name}</span></span>
            <span style="color:${isActive ? '#2D8F5E' : '#E06060'};font-size:11px;font-weight:700;">${isActive ? '✅ نشط' : '⏸️ موقوف'}</span>
            <div style="display:flex;gap:4px;">
                <button class="btn btn-warning btn-sm" onclick="editUser(${u.id})"><i class="fas fa-edit"></i></button>
                ${!isMe ? `
                    <button class="btn btn-info btn-sm" onclick="toggleUserActive(${u.id})"><i class="fas ${isActive ? 'fa-pause' : 'fa-play'}"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>
                ` : ''}
            </div>
        </div>`;
    });
    c.innerHTML = html;
};

// ═══════════════════════════════════════════════════════════
// 🚀 التهيئة
// ═══════════════════════════════════════════════════════════

// ✅ تشفير كلمات المرور القديمة تلقائياً عند التحميل
window.addEventListener('DOMContentLoaded', async function() {
    // انتظر تحميل البيانات الأساسية
    setTimeout(async () => {
        if (typeof users !== 'undefined' && users.length > 0) {
            let encryptedCount = 0;
            for (let i = 0; i < users.length; i++) {
                if (users[i].password && users[i].password.length !== 64) {
                    const oldPass = users[i].password;
                    users[i].password = await hashPassword(oldPass);
                    users[i].encrypted = true;
                    encryptedCount++;
                }
            }
            if (encryptedCount > 0) {
                setData('users', users);
                console.log(`🔒 تم تشفير ${encryptedCount} كلمة مرور تلقائياً`);
                showToast(`🔒 تم تشفير ${encryptedCount} كلمة مرور`, 'success');
            }
        }
    }, 1000);
});

console.log('✅ تم تحميل app-part4.js بنجاح');
console.log('🔒 تشفير SHA-256 | 🖨️ طباعة حرارية | 🔔 واتساب');