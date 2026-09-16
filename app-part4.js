// ============================================================
// الميزان 14.0.0 - ملف المميزات الإضافية (app-part4.js)
// الطباعة الحرارية فقط (تم نقل الواتساب إلى app-whatsapp.js)
// تم حذف: checkLogin, saveUser, changePassword, renderUsers, 
//         populateLoginUsers, sendInvoiceWhatsApp, sendReceiptWhatsApp,
//         remindCustomerWhatsApp (كلها مكررة)
// ============================================================

console.log('🖨️ تحميل app-part4.js - الطباعة الحرارية');

// ═══════════════════════════════════════════════════════════
// 🖨️ الطباعة الحرارية
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
                body { font-family: 'Courier New', monospace; background: #fff; color: #000; }
                @page { size: ${pageSize} auto; margin: 2mm; }
                .thermal-print { font-family: 'Courier New', monospace; background: #fff; color: #000; padding: 3px; direction: rtl; font-size: 11px; line-height: 1.4; width: 100%; max-width: 100%; }
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
        <body>${printContent.outerHTML}</body>
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
// 🎨 تكامل الطباعة مع عرض الفاتورة
// ═══════════════════════════════════════════════════════════

window.showSaleInvoiceDetails = function(inv) {
    let thermalItemsHtml = '';
    inv.items.forEach((it) => {
        thermalItemsHtml += `<tr><td>${it.name}</td><td>${it.qty}</td><td>${formatMoney(it.price)}</td><td>${formatMoney(it.total)}</td></tr>`;
    });
    
    const logoThermal = companyData.logo ? `<img src="${companyData.logo}" class="th-logo" alt="logo">` : '';
    const pm = inv.paymentMethod || 'cash';
    const isTax = inv.invoiceType === 'tax';
    const subtotal = inv.subtotal !== undefined ? inv.subtotal : inv.total;
    const vatTotal = inv.vatTotal || 0;
    const paid = inv.paidAmount || 0;
    const remaining = inv.remainingAmount !== undefined ? inv.remainingAmount : 0;
    
    const customer = customers.find(c => c.name === inv.customer);
    const hasWhatsapp = !!(customer?.whatsapp || customer?.phone);
    
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
                <thead><tr><th>الصنف</th><th>كمية</th><th>سعر</th><th>إجمالي</th></tr></thead>
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
            ${hasWhatsapp && typeof sendInvoiceWhatsApp === 'function' ? `<button class="whatsapp-btn" onclick="sendInvoiceWhatsApp(${inv.id})" style="flex:1;min-width:100px;justify-content:center;"><i class="fab fa-whatsapp"></i> واتساب</button>` : ''}
            ${remaining > 0 && canAdd() ? `<button class="btn btn-success" onclick="closeModal(); openCollectModal('${inv.customer}')" style="flex:1;min-width:100px;"><i class="fas fa-hand-holding-usd"></i> تحصيل</button>` : ''}
            <button class="btn btn-secondary" onclick="closeModal()" style="flex:1;min-width:100px;"><i class="fas fa-times"></i> إغلاق</button>
        </div>`;
    openModal(html);
};

console.log('✅ تم تحميل app-part4.js - الطباعة الحرارية فقط');
