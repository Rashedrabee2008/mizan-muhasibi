// ================================================================
// alerts.js - نظام التنبيهات
// ================================================================

// ================================================================
// INIT ALERTS
// ================================================================
function initAlerts() {
    if (!window.alerts || !Array.isArray(window.alerts)) {
        window.alerts = [];
        setData('alerts', window.alerts);
    }
}

// ================================================================
// ADD ALERT
// ================================================================
function addAlert(title, desc, type = 'info') {
    initAlerts();
    
    const alert = { 
        id: Date.now(), 
        title: title, 
        desc: desc, 
        type: type, 
        date: new Date().toISOString(), 
        read: false 
    };
    
    window.alerts.unshift(alert);
    if (window.alerts.length > 100) window.alerts = window.alerts.slice(0, 100);
    setData('alerts', window.alerts);
    updateAlertsUI();
}

// ================================================================
// UPDATE ALERTS UI
// ================================================================
function updateAlertsUI() {
    initAlerts();
    
    const unread = window.alerts.filter(a => !a.read).length;
    safeSetText('alertCount', unread);
    safeSetText('alertBadge', unread);

    const container = document.getElementById('alertsList');
    const fullContainer = document.getElementById('alertsFullList');

    if (container) {
        const recent = window.alerts.slice(0, 3);
        if (recent.length === 0) {
            container.innerHTML = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">لا توجد تنبيهات</div><div class="desc">كل شيء على ما يرام</div></div></div>`;
        } else {
            container.innerHTML = recent.map(a => `
                <div class="alert-item ${a.type}">
                    <div class="icon"><i class="fas ${a.type === 'danger' ? 'fa-exclamation-triangle' : a.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i></div>
                    <div class="content"><div class="title">${a.title}</div><div class="desc">${a.desc}</div></div>
                    <div class="time">${new Date(a.date).toLocaleDateString('ar')}</div>
                </div>
            `).join('');
        }
    }

    if (fullContainer) {
        if (window.alerts.length === 0) {
            fullContainer.innerHTML = `<div class="alert-item info"><div class="icon"><i class="fas fa-info-circle"></i></div><div class="content"><div class="title">لا توجد تنبيهات</div><div class="desc">كل شيء على ما يرام</div></div></div>`;
        } else {
            fullContainer.innerHTML = window.alerts.map(a => `
                <div class="alert-item ${a.type} ${a.read ? '' : 'unread'}" onclick="markAlertRead(${a.id})" style="${a.read ? 'opacity:0.6;' : ''}">
                    <div class="icon"><i class="fas ${a.type === 'danger' ? 'fa-exclamation-triangle' : a.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i></div>
                    <div class="content"><div class="title">${a.title} ${a.read ? '✅' : ''}</div><div class="desc">${a.desc}</div></div>
                    <div class="time">${new Date(a.date).toLocaleString('ar')}</div>
                </div>
            `).join('');
        }
    }
}

// ================================================================
// MARK ALERT READ
// ================================================================
function markAlertRead(id) {
    initAlerts();
    const alert = window.alerts.find(a => a.id === id);
    if (alert) { 
        alert.read = true; 
        setData('alerts', window.alerts); 
        updateAlertsUI(); 
    }
}

// ================================================================
// CLEAR ALL ALERTS
// ================================================================
function clearAllAlerts() {
    if (!canEdit()) { showToast('⚠️ ليس لديك صلاحية', 'error'); return; }
    if (!confirm('⚠️ تحديد جميع التنبيهات كمقروءة؟')) return;

    initAlerts();
    window.alerts.forEach(a => a.read = true);
    setData('alerts', window.alerts);
    updateAlertsUI();
    showToast('✅ تم تحديد الكل كمقروء', 'success');
}

// ================================================================
// CHECK LOW STOCK ALERT
// ================================================================
function checkLowStockAlert() {
    if (!window.products || !window.warehouseProducts) return;
    initAlerts();
    
    window.products.forEach(p => {
        const total = window.warehouseProducts.filter(wp => wp.productId === p.id).reduce((s, wp) => s + wp.qty, 0);
        if (total <= p.min) {
            const exists = window.alerts.some(a => a.title.includes(p.name) && !a.read);
            if (!exists) {
                addAlert(`⚠️ مخزون منخفض: ${p.name}`, `الكمية: ${total} (الحد الأدنى: ${p.min})`, 'danger');
            }
        }
    });
}
