// ============================================================
// الميزان 14.0.0 - رسائل واتساب الاحترافية
// app-whatsapp.js
// ============================================================
// 
// تحسينات:
// - رموز Unicode آمنة (تعمل على كل الأجهزة)
// - تنسيق احترافي بخطوط
// - رسائل مفصلة ومنظمة
// - أرقام عربية (اختياري)
// ============================================================

console.log('📱 تحميل app-whatsapp.js - رسائل واتساب الاحترافية');

// ═══════════════════════════════════════════════════════════
// 🔧 أدوات مساعدة
// ═══════════════════════════════════════════════════════════

// خطوط التنسيق (Unicode آمنة)
const WA_LINE = '━━━━━━━━━━━━━━━━━━━━';
const WA_LINE_SHORT = '━━━━━━━━━━━━━━';
const WA_DOT_LINE = '┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈';

// رموز آمنة (لا تظهر كـ �)
const ICONS = {
    invoice: '🧾',
    store: '🏪',
    phone: '☎️',
    user: '👤',
    calendar: '📅',
    clock: '🕐',
    money: '💰',
    box: '📦',
    check: '✅',
    warning: '⚠️',
    receipt: '🧾',
    truck: '🚚',
    whatsapp: '💬',
    cart: '🛒',
    wallet: '💰',
    chart: '📊',
    star: '⭐',
    fire: '🔥',
    new: '🆕',
    thanks: '🙏',
    arrow: '◄',
    point: '●',
    bullet: '▸',
    tax: '🧮',
    discount: '🎁',
    note: '📝',
    time: '⏰',
    search: '🔍'
};

// تنسيق التاريخ بشكل جميل
function formatWhatsAppDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return `${day} ${months[d.getMonth()]} ${year}`;
    } catch (e) { return dateStr; }
}

// تنسيق المبلغ بشكل جميل
function formatWhatsAppMoney(amount) {
    return new Intl.NumberFormat('ar-EG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

// ═══════════════════════════════════════════════════════════
// 🧾 رسالة فاتورة البيع
// ═══════════════════════════════════════════════════════════

window.sendInvoiceWhatsApp = function(invoiceId) {
    const inv = sales.find(s => s.id === invoiceId);
    if (!inv) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }
    
    const customer = customers.find(c => c.name === inv.customer);
    let phone = customer?.whatsapp || customer?.phone || '';
    if (!phone) { showToast('⚠️ العميل ليس لديه رقم واتساب', 'error'); return; }
    
    phone = cleanPhoneNumber(phone);
    
    // تفاصيل الأصناف
    let itemsText = '';
    inv.items.forEach((it, i) => {
        itemsText += `\n${ICONS.bullet} *${it.name}*\n`;
        itemsText += `   ${ICONS.box} الكمية: ${it.qty}\n`;
        itemsText += `   ${ICONS.money} السعر: ${formatWhatsAppMoney(it.price)} ج.م\n`;
        itemsText += `   ${ICONS.check} الإجمالي: ${formatWhatsAppMoney(it.total)} ج.م\n`;
    });
    
    const isTax = inv.invoiceType === 'tax';
    const isPaid = inv.status === 'paid';
    const remaining = inv.remainingAmount || 0;
    const paid = inv.paidAmount || 0;
    
    let paymentStatus = '';
    if (isPaid) {
        paymentStatus = `\n${ICONS.check} *الحالة: مدفوعة بالكامل* ${ICONS.check}\n`;
    } else if (remaining > 0 && paid > 0) {
        paymentStatus = `\n${ICONS.warning} *الحالة: مدفوعة جزئياً* ${ICONS.warning}\n`;
    } else {
        paymentStatus = `\n${ICONS.warning} *الحالة: غير مدفوعة* ${ICONS.warning}\n`;
    }
    
    const msg = 
`${ICONS.invoice} *فاتورة مبيعات*
${WA_LINE}
${ICONS.store} *${companyData.name || 'الميزان'}*
${companyData.phone ? `${ICONS.phone} ${companyData.phone}\n` : ''}${companyData.address ? `📍 ${companyData.address}\n` : ''}${companyData.tax ? `${ICONS.tax} الرقم الضريبي: ${companyData.tax}` : ''}
${WA_LINE}
${ICONS.new} *رقم الفاتورة:* #${inv.number}
${ICONS.calendar} *التاريخ:* ${formatWhatsAppDate(inv.date)}
${ICONS.clock} *الوقت:* ${inv.time || ''}
${ICONS.user} *العميل:* ${inv.customer}
${ICONS.wallet} *طريقة الدفع:* ${inv.paymentMethod === 'cash' ? 'نقدي' : inv.paymentMethod === 'settlement' ? 'مقاصة' : 'آجل'}
${isTax ? `${ICONS.tax} *نوع الفاتورة:* ضريبية` : `${ICONS.invoice} *نوع الفاتورة:* عادية`}
${WA_LINE}
${ICONS.cart} *تفاصيل الأصناف:*${itemsText}
${WA_LINE}
${ICONS.chart} *ملخص الفاتورة:*
   المجموع: ${formatWhatsAppMoney(inv.subtotal || inv.total)} ج.م
${isTax && inv.vatTotal ? `   الضريبة (${vatSettings.defaultVAT}%): ${formatWhatsAppMoney(inv.vatTotal)} ج.م\n` : ''}${WA_LINE_SHORT}
${ICONS.money} *الإجمالي: ${formatWhatsAppMoney(inv.total)} ج.م*
${paid > 0 ? `${ICONS.check} المدفوع: ${formatWhatsAppMoney(paid)} ج.م\n` : ''}${remaining > 0 ? `${ICONS.warning} *المتبقي: ${formatWhatsAppMoney(remaining)} ج.م*\n` : ''}${paymentStatus}${WA_LINE}
${companyData.footer || `${ICONS.thanks} شكراً لتعاملكم معنا`}
${ICONS.store} *${companyData.name || 'الميزان'}*`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    addAuditLog('edit', 'sale', `إرسال فاتورة #${inv.number} واتساب إلى ${inv.customer}`);
    showToast('✅ تم فتح واتساب', 'success');
};

// ═══════════════════════════════════════════════════════════
// 🛒 رسالة فاتورة الشراء
// ═══════════════════════════════════════════════════════════

window.sendPurchaseWhatsApp = function(purchaseId) {
    const inv = purchases.find(p => p.id === purchaseId);
    if (!inv) { showToast('⚠️ الفاتورة غير موجودة', 'error'); return; }
    
    const supplier = suppliers.find(s => s.name === inv.supplierName);
    let phone = supplier?.whatsapp || supplier?.phone || '';
    if (!phone) { showToast('⚠️ المورد ليس لديه رقم واتساب', 'error'); return; }
    
    phone = cleanPhoneNumber(phone);
    
    // تفاصيل الأصناف
    let itemsText = '';
    inv.items.forEach((it, i) => {
        itemsText += `\n${ICONS.bullet} *${it.name}*\n`;
        itemsText += `   ${ICONS.box} الكمية: ${it.qty}\n`;
        itemsText += `   ${ICONS.money} السعر: ${formatWhatsAppMoney(it.price)} ج.م\n`;
        itemsText += `   ${ICONS.check} الإجمالي: ${formatWhatsAppMoney(it.total)} ج.م\n`;
    });
    
    const isTax = inv.invoiceType === 'tax';
    const isPaid = inv.status === 'paid';
    const remaining = inv.remainingAmount || 0;
    const paid = inv.paidAmount || 0;
    
    let paymentStatus = '';
    if (isPaid) {
        paymentStatus = `\n${ICONS.check} *الحالة: مسددة بالكامل* ${ICONS.check}\n`;
    } else if (remaining > 0 && paid > 0) {
        paymentStatus = `\n${ICONS.warning} *الحالة: مسددة جزئياً* ${ICONS.warning}\n`;
    } else {
        paymentStatus = `\n${ICONS.warning} *الحالة: غير مسددة* ${ICONS.warning}\n`;
    }
    
    const msg = 
`${ICONS.cart} *فاتورة مشتريات*
${WA_LINE}
${ICONS.store} *${companyData.name || 'الميزان'}*
${companyData.phone ? `${ICONS.phone} ${companyData.phone}\n` : ''}${companyData.tax ? `${ICONS.tax} الرقم الضريبي: ${companyData.tax}` : ''}
${WA_LINE}
${ICONS.new} *رقم الفاتورة:* #${inv.number}
${ICONS.calendar} *التاريخ:* ${formatWhatsAppDate(inv.date)}
${ICONS.clock} *الوقت:* ${inv.time || ''}
${ICONS.truck} *المورد:* ${inv.supplierName}
${ICONS.wallet} *طريقة الدفع:* ${inv.payment === 'cash' ? 'نقدي' : 'آجل'}
${isTax ? `${ICONS.tax} *نوع الفاتورة:* ضريبية` : `${ICONS.invoice} *نوع الفاتورة:* عادية`}
${WA_LINE}
${ICONS.box} *تفاصيل الأصناف:*${itemsText}
${WA_LINE}
${ICONS.chart} *ملخص الفاتورة:*
   المجموع: ${formatWhatsAppMoney(inv.subtotal || inv.total)} ج.م
${isTax && inv.vatTotal ? `   الضريبة (${vatSettings.defaultVAT}%): ${formatWhatsAppMoney(inv.vatTotal)} ج.م\n` : ''}${WA_LINE_SHORT}
${ICONS.money} *الإجمالي: ${formatWhatsAppMoney(inv.total)} ج.م*
${paid > 0 ? `${ICONS.check} المسدد: ${formatWhatsAppMoney(paid)} ج.م\n` : ''}${remaining > 0 ? `${ICONS.warning} *المتبقي: ${formatWhatsAppMoney(remaining)} ج.م*\n` : ''}${paymentStatus}${WA_LINE}
${companyData.footer || `${ICONS.thanks} شكراً لتعاملكم معنا`}
${ICONS.store} *${companyData.name || 'الميزان'}*`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    addAuditLog('edit', 'purchase', `إرسال فاتورة شراء #${inv.number} واتساب إلى ${inv.supplierName}`);
    showToast('✅ تم فتح واتساب', 'success');
};

// ═══════════════════════════════════════════════════════════
// 🔄 رسالة المرتجع
// ═══════════════════════════════════════════════════════════

window.sendReturnWhatsApp = function(returnId) {
    const ret = returns.find(r => r.id === returnId);
    if (!ret) { showToast('⚠️ المرتجع غير موجود', 'error'); return; }
    
    let phone = '';
    let personName = ret.party;
    if (ret.type === 'sale') {
        const customer = customers.find(c => c.name === ret.party);
        phone = customer?.whatsapp || customer?.phone || '';
    } else {
        const supplier = suppliers.find(s => s.name === ret.party);
        phone = supplier?.whatsapp || supplier?.phone || '';
    }
    
    if (!phone) { showToast('⚠️ ليس لديه رقم واتساب', 'error'); return; }
    phone = cleanPhoneNumber(phone);
    
    // تفاصيل الأصناف
    let itemsText = '';
    ret.items.forEach((it, i) => {
        itemsText += `\n${ICONS.bullet} *${it.name}*\n`;
        itemsText += `   ${ICONS.box} الكمية: ${it.qty}\n`;
        itemsText += `   ${ICONS.money} السعر: ${formatWhatsAppMoney(it.price)} ج.م\n`;
        itemsText += `   ${ICONS.check} الإجمالي: ${formatWhatsAppMoney(it.total)} ج.م\n`;
    });
    
    const isSaleReturn = ret.type === 'sale';
    const title = isSaleReturn ? 'مرتجع مبيعات' : 'مرتجع مشتريات';
    const personLabel = isSaleReturn ? 'العميل' : 'المورد';
    const personIcon = isSaleReturn ? ICONS.user : ICONS.truck;
    
    const msg = 
`🔄 *${title}*
${WA_LINE}
${ICONS.store} *${companyData.name || 'الميزان'}*
${companyData.phone ? `${ICONS.phone} ${companyData.phone}\n` : ''}
${WA_LINE}
${ICONS.new} *رقم المرتجع:* #${ret.number}
${ICONS.calendar} *التاريخ:* ${formatWhatsAppDate(ret.date)}
${ICONS.clock} *الوقت:* ${ret.time || ''}
${personIcon} *${personLabel}:* ${personName}
${ret.originalInvoiceNumber ? `${ICONS.invoice} *الفاتورة الأصلية:* #${ret.originalInvoiceNumber}\n` : ''}${WA_LINE}
${ICONS.box} *تفاصيل الأصناف المرتجعة:*${itemsText}
${WA_LINE}
${ICONS.chart} *ملخص المرتجع:*
${ICONS.money} *الإجمالي: ${formatWhatsAppMoney(ret.total)} ج.م*
${WA_LINE}
${companyData.footer || `${ICONS.thanks} شكراً لتعاملكم معنا`}
${ICONS.store} *${companyData.name || 'الميزان'}*`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    addAuditLog('edit', 'return', `إرسال مرتجع #${ret.number} واتساب`);
    showToast('✅ تم فتح واتساب', 'success');
};

// ═══════════════════════════════════════════════════════════
// 💰 رسالة تحصيل/سداد
// ═══════════════════════════════════════════════════════════

window.sendReceiptWhatsApp = function(paymentId) {
    const pay = payments.find(p => p.id === paymentId);
    if (!pay) { showToast('⚠️ العملية غير موجودة', 'error'); return; }
    
    const person = pay.type === 'collect' 
        ? customers.find(c => c.name === pay.party)
        : suppliers.find(s => s.name === pay.party);
    let phone = person?.whatsapp || person?.phone || '';
    if (!phone) { showToast('⚠️ ليس لديه رقم واتساب', 'error'); return; }
    
    phone = cleanPhoneNumber(phone);
    const isCollect = pay.type === 'collect';
    
    // الفواتير المرتبطة
    let invoicesText = '';
    if (pay.relatedInvoices && pay.relatedInvoices.length > 0) {
        invoicesText = `\n${WA_LINE}\n${ICONS.invoice} *الفواتير المسددة:*\n`;
        pay.relatedInvoices.forEach(ri => {
            invoicesText += `   ${ICONS.check} فاتورة #${ri.invoiceNumber}: ${formatWhatsAppMoney(ri.amount)} ج.م\n`;
        });
    }
    
    const title = isCollect ? 'إيصال استلام نقدية' : 'إيصال دفع نقدية';
    const personLabel = isCollect ? 'العميل' : 'المورد';
    const personIcon = isCollect ? ICONS.user : ICONS.truck;
    const amountLabel = isCollect ? 'المبلغ المستلم' : 'المبلغ المدفوع';
    const receiptEmoji = isCollect ? '💵' : '💸';
    
    const msg = 
`${receiptEmoji} *${title}*
${WA_LINE}
${ICONS.store} *${companyData.name || 'الميزان'}*
${companyData.phone ? `${ICONS.phone} ${companyData.phone}\n` : ''}
${WA_LINE}
${ICONS.new} *رقم الإيصال:* #${String(pay.id).slice(-6)}
${ICONS.calendar} *التاريخ:* ${formatWhatsAppDate(pay.date)}
${ICONS.clock} *الوقت:* ${pay.time || ''}
${personIcon} *${personLabel}:* ${pay.party}
${WA_LINE_SHORT}
${ICONS.wallet} *${amountLabel}:*
${ICONS.money} *${formatWhatsAppMoney(pay.amount)} ج.م*${invoicesText}
${WA_LINE}
${pay.note ? `${ICONS.note} ملاحظات: ${pay.note}\n${WA_LINE}` : ''}
${companyData.footer || `${ICONS.thanks} شكراً لتعاملكم معنا`}
${ICONS.store} *${companyData.name || 'الميزان'}*`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    addAuditLog('edit', 'payment', `إرسال إيصال ${pay.type === 'collect' ? 'تحصيل' : 'سداد'} واتساب`);
    showToast('✅ تم فتح واتساب', 'success');
};

// ═══════════════════════════════════════════════════════════
// 🔔 رسالة تذكير بالمديونية
// ═══════════════════════════════════════════════════════════

window.remindCustomerWhatsApp = function(customerName) {
    const customer = customers.find(c => c.name === customerName);
    if (!customer) { showToast('⚠️ العميل غير موجود', 'error'); return; }
    
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
    
    // تفاصيل الفواتير
    let invoicesText = '';
    unpaidInvoices.forEach((inv, i) => {
        const remaining = inv.remainingAmount || inv.total;
        invoicesText += `\n${ICONS.bullet} *فاتورة #${inv.number}*\n`;
        invoicesText += `   ${ICONS.calendar} ${formatWhatsAppDate(inv.date)}\n`;
        invoicesText += `   ${ICONS.money} المتبقي: ${formatWhatsAppMoney(remaining)} ج.م\n`;
    });
    
    // تاريخ اليوم بالعربي
    const now = new Date();
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const todayArabic = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    
    const msg = 
`${ICONS.warning} *تذكير بمديونية*
${WA_LINE}
${ICONS.store} *${companyData.name || 'الميزان'}*
${companyData.phone ? `${ICONS.phone} ${companyData.phone}\n` : ''}${companyData.address ? `📍 ${companyData.address}\n` : ''}${WA_LINE}
${ICONS.user} عزيزي/عزيزتي *${customerName}*،
السلام عليكم ورحمة الله وبركاته 🌸

نود تذكيركم بلطف بوجود مبالغ مستحقة لصالحنا، وفقاً للتفاصيل التالية:

${ICONS.invoice} *الفواتير غير المسددة:*${invoicesText}
${WA_LINE}
${ICONS.chart} *ملخص المديونية:*
${ICONS.money} *إجمالي المديونية: ${formatWhatsAppMoney(balance)} ج.م*
${ICONS.invoice} عدد الفواتير: ${unpaidInvoices.length}
${WA_LINE}
${ICONS.note} *ملاحظة:*
نرجو التكرم بالسداد في أقرب وقت ممكن. في حال وجود أي استفسار، يرجى التواصل معنا.

${ICONS.calendar} *تاريخ التذكير:* ${todayArabic}
${WA_LINE}
${companyData.footer || `${ICONS.thanks} نتشرف بخدمتكم دائماً`}
${ICONS.store} *${companyData.name || 'الميزان'}*`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    addAuditLog('edit', 'customer', `إرسال تذكير بالمديونية إلى ${customerName}`);
    showToast('✅ تم فتح واتساب', 'success');
};

// ═══════════════════════════════════════════════════════════
// 🚚 رسالة تذكير بمديونية المورد
// ═══════════════════════════════════════════════════════════

window.remindSupplierWhatsApp = function(supplierName) {
    const supplier = suppliers.find(s => s.name === supplierName);
    if (!supplier) { showToast('⚠️ المورد غير موجود', 'error'); return; }
    
    let phone = supplier.whatsapp || supplier.phone || '';
    if (!phone) { showToast('⚠️ المورد ليس لديه رقم واتساب', 'error'); return; }
    
    const balance = getSupplierBalance(supplierName);
    if (balance <= 0) { showToast('⚠️ ليس هناك مستحقات', 'warning'); return; }
    
    phone = cleanPhoneNumber(phone);
    
    const unpaidInvoices = purchases.filter(p => 
        p.supplierName === supplierName && 
        p.payment === 'credit' && 
        (p.status === 'unpaid' || p.status === 'partial')
    ).sort((a, b) => a.id - b.id);
    
    let invoicesText = '';
    unpaidInvoices.forEach(inv => {
        const remaining = inv.remainingAmount || inv.total;
        invoicesText += `\n${ICONS.bullet} *فاتورة #${inv.number}*\n`;
        invoicesText += `   ${ICONS.calendar} ${formatWhatsAppDate(inv.date)}\n`;
        invoicesText += `   ${ICONS.money} المتبقي: ${formatWhatsAppMoney(remaining)} ج.م\n`;
    });
    
    const msg = 
`${ICONS.truck} *إشعار بمديونية*
${WA_LINE}
${ICONS.store} *${companyData.name || 'الميزان'}*
${companyData.phone ? `${ICONS.phone} ${companyData.phone}\n` : ''}${WA_LINE}
${ICONS.truck} السيد/ *${supplierName}*
السلام عليكم ورحمة الله وبركاته 🌸

نود إعلامكم بوجود مبالغ مستحقة لصالحكم لدينا:

${ICONS.invoice} *الفواتير غير المسددة:*${invoicesText}
${WA_LINE}
${ICONS.chart} *ملخص المديونية:*
${ICONS.money} *إجمالي المستحق: ${formatWhatsAppMoney(balance)} ج.م*
${ICONS.invoice} عدد الفواتير: ${unpaidInvoices.length}
${WA_LINE}
${ICONS.note} نرجو إرسال كشف حساب لتأكيد المبالغ، وسيتم السداد في أقرب وقت.

${WA_LINE}
${companyData.footer || `${ICONS.thanks} شكراً لتعاملكم معنا`}
${ICONS.store} *${companyData.name || 'الميزان'}*`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    addAuditLog('edit', 'supplier', `إرسال إشعار مديونية إلى ${supplierName}`);
    showToast('✅ تم فتح واتساب', 'success');
};

// ═══════════════════════════════════════════════════════════
// 💬 رسالة ترحيب بعميل جديد
// ═══════════════════════════════════════════════════════════

window.sendWelcomeWhatsApp = function(customerName) {
    const customer = customers.find(c => c.name === customerName);
    if (!customer) { showToast('⚠️ العميل غير موجود', 'error'); return; }
    
    let phone = customer.whatsapp || customer.phone || '';
    if (!phone) { showToast('⚠️ العميل ليس لديه رقم واتساب', 'error'); return; }
    
    phone = cleanPhoneNumber(phone);
    
    const msg = 
`${ICONS.star} *أهلاً وسهلاً بكم*
${WA_LINE}
${ICONS.store} *${companyData.name || 'الميزان'}*
${companyData.phone ? `${ICONS.phone} ${companyData.phone}\n` : ''}${companyData.address ? `📍 ${companyData.address}\n` : ''}${WA_LINE}
${ICONS.user} عزيزي/عزيزتي *${customerName}*

يسعدنا انضمامكم لعملائنا الكرام! 🌸

${ICONS.check} *نحن نوفر لكم:*
${ICONS.bullet} أفضل الأسعار التنافسية
${ICONS.bullet} خدمة عملاء سريعة
${ICONS.bullet} منتجات عالية الجودة
${ICONS.bullet} عروض وخصومات دورية

${ICONS.chart} *نتشرف بخدمتكم دائماً*
${WA_LINE}
${companyData.footer || `${ICONS.thanks} شكراً لثقتكم بنا`}
${ICONS.store} *${companyData.name || 'الميزان'}*`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    showToast('✅ تم فتح واتساب', 'success');
};

// ═══════════════════════════════════════════════════════════
// 📊 تقرير مبيعات اليوم
// ═══════════════════════════════════════════════════════════

window.sendDailyReportWhatsApp = function(phoneNumber) {
    if (!phoneNumber) {
        phoneNumber = prompt('📱 أدخل رقم الواتساب للإرسال إليه:');
        if (!phoneNumber) return;
    }
    phoneNumber = cleanPhoneNumber(phoneNumber);
    
    const today = getTodayDate();
    const todaySales = sales.filter(s => s.date === today);
    const totalSales = todaySales.reduce((s, i) => s + (i.total || 0), 0);
    const cashSales = todaySales.filter(s => s.paymentMethod === 'cash').reduce((s, i) => s + (i.total || 0), 0);
    const creditSales = todaySales.filter(s => s.paymentMethod === 'credit').reduce((s, i) => s + (i.total || 0), 0);
    const todayExpenses = expenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount || 0), 0);
    const cogs = getCOGS(todaySales);
    const profit = totalSales - cogs - todayExpenses;
    
    const now = new Date();
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const todayArabic = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    
    const msg = 
`${ICONS.chart} *تقرير مبيعات اليوم*
${WA_LINE}
${ICONS.store} *${companyData.name || 'الميزان'}*
${ICONS.calendar} ${todayArabic}
${WA_LINE}
${ICONS.money} *إجمالي المبيعات:* ${formatWhatsAppMoney(totalSales)} ج.م
${ICONS.wallet} نقدي: ${formatWhatsAppMoney(cashSales)} ج.م
${ICONS.receipt} آجل: ${formatWhatsAppMoney(creditSales)} ج.م
${ICONS.invoice} عدد الفواتير: ${todaySales.length}
${WA_LINE}
${ICONS.cart} *تكلفة البضاعة:* ${formatWhatsAppMoney(cogs)} ج.م
${ICONS.wallet} *المصروفات:* ${formatWhatsAppMoney(todayExpenses)} ج.م
${WA_LINE}
${profit >= 0 ? ICONS.check : ICONS.warning} *صافي الربح:* ${formatWhatsAppMoney(profit)} ج.م
${WA_LINE}
${ICONS.store} *${companyData.name || 'الميزان'}*`;

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    showToast('✅ تم فتح واتساب', 'success');
};

// ═══════════════════════════════════════════════════════════
// 🔄 التكامل مع النظام
// ═══════════════════════════════════════════════════════════

// إضافة زر واتساب في نافذة فاتورة الشراء
const originalViewPurchase = window.viewPurchase;
window.viewPurchase = function(id) {
    if (originalViewPurchase) originalViewPurchase(id);
    
    setTimeout(() => {
        const inv = purchases.find(p => p.id === id);
        if (!inv) return;
        
        const supplier = suppliers.find(s => s.name === inv.supplierName);
        const hasWhatsapp = !!(supplier?.whatsapp || supplier?.phone);
        if (!hasWhatsapp) return;
        
        // إضافة زر واتساب للنافذة
        const modalBox = document.querySelector('#modalOverlay .modal-box');
        if (!modalBox) return;
        const btnContainer = modalBox.querySelector('div[style*="display:flex"]:last-child');
        if (!btnContainer) return;
        if (btnContainer.querySelector('.whatsapp-purchase-btn')) return;
        
        const waBtn = document.createElement('button');
        waBtn.className = 'whatsapp-btn whatsapp-purchase-btn';
        waBtn.style.flex = '1';
        waBtn.style.minWidth = '100px';
        waBtn.style.justifyContent = 'center';
        waBtn.innerHTML = '<i class="fab fa-whatsapp"></i> واتساب';
        waBtn.onclick = () => sendPurchaseWhatsApp(id);
        btnContainer.insertBefore(waBtn, btnContainer.lastChild);
    }, 200);
};

console.log('✅ تم تحميل app-whatsapp.js بنجاح');
console.log('💬 رسائل واتساب الاحترافية جاهزة');