
// URL Apps Script Web App (отримай після Deploy)
const APP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz1E6_ENZGNQ3OUdSHqq-hjpD55tHO4QdOmGja-GDePMzElrFNo-IwfSPc5NxWLPhg/exec';

// Не реальний секрет — це лише захист endpoint від випадкових ботів.
// Має збігатися з SHEET_CONFIG.secretKey в Apps Script.
const APP_SECRET = 'pnl2026secret';

// Куди редіректити після відправки форми
const FORM_REDIRECTS = {
    'wf-form-mini-course':   'https://secure.wayforpay.com/payment/pnl_course_1',
    'wf-form-building':      'https://secure.wayforpay.com/payment/course_pnl_2',
    'wf-form-consultation':  'https://secure.wayforpay.com/payment/pnl_consultation',
    'wf-form-mentoring':     'https://secure.wayforpay.com/payment/pnl_mentorship',
    'wf-form-free':          'https://www.pnl.com.ua/dyakuiemo-za-pokupku-bezkoshtovnogo-mini-kurs',
};

console.log('🚀 Form Sender v4.0');

// ─── UI: Сповіщення ──────────────────────────────────────────

function showNotification(message, type = 'success') {
    document.querySelectorAll('.fs-notification').forEach(n => n.remove());

    const el = document.createElement('div');
    el.className = 'fs-notification';
    el.textContent = message;
    el.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        padding: 14px 20px; border-radius: 8px;
        color: #fff; font-weight: 500; font-size: 14px;
        z-index: 10000; max-width: 320px;
        box-shadow: 0 4px 16px rgba(0,0,0,.15);
        background: ${type === 'success' ? '#2e7d32' : '#c62828'};
        animation: fsSlideIn .3s ease;
    `;

    if (!document.getElementById('fs-style')) {
        const style = document.createElement('style');
        style.id = 'fs-style';
        style.textContent = `
            @keyframes fsSlideIn {
                from { opacity:0; transform:translateX(20px); }
                to   { opacity:1; transform:translateX(0); }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 3000);
    setTimeout(() => el.remove(), 3300);
}

// ─── ЗБІР ДАНИХ ──────────────────────────────────────────────

function collectFormData(form) {
    const get = (...selectors) => {
        for (const sel of selectors) {
            const el = form.querySelector(sel);
            if (el && el.value.trim()) return el.value.trim();
        }
        return '';
    };

    const utmParams = new URLSearchParams(window.location.search);

    return {
        formId:   form.id,
        name:     get('#name', 'input[name="name"]', 'input[type="text"]:not([type="hidden"])'),
        phone:    get('#Phone-2', '#phone', 'input[name="phone"]', 'input[type="tel"]'),
        field:    get('#field', 'textarea', 'input[name="message"]'),
        pageUrl:  window.location.href,
        utm: {
            source:   utmParams.get('utm_source')   || '',
            medium:   utmParams.get('utm_medium')   || '',
            campaign: utmParams.get('utm_campaign') || '',
            term:     utmParams.get('utm_term')     || '',
            content:  utmParams.get('utm_content')  || '',
        },
    };
}

// ─── ВІДПРАВКА в Apps Script (Sheets + Telegram) ────────────

async function sendToBackend(data) {
    if (!APP_ENDPOINT || APP_ENDPOINT.includes('ВСТАВТЕ')) {
        console.warn('⚠️ App endpoint not configured');
        return false;
    }

    try {
        const payload = { ...data, secretKey: APP_SECRET };

        await fetch(APP_ENDPOINT, {
            method:    'POST',
            mode:      'no-cors',
            headers:   { 'Content-Type': 'text/plain' },
            body:      JSON.stringify(payload),
            keepalive: true,
        });

        console.log('Backend: ✅ Request sent');
        return true;
    } catch (err) {
        console.error('Backend error:', err);
        return false;
    }
}

// ─── РЕДІРЕКТ ────────────────────────────────────────────────

function performRedirect(formId, delayMs = 600) {
    const url = FORM_REDIRECTS[formId];
    if (!url) {
        console.warn('No redirect for:', formId);
        return false;
    }
    console.log(`🔄 Redirect → ${url}`);
    setTimeout(() => { window.location.href = url; }, delayMs);
    return true;
}

// ─── ГОЛОВНИЙ ОБРОБНИК ───────────────────────────────────────

async function handleFormSubmit(event) {
    const form = event.target;
    if (!form?.id) return;
    if (form.dataset.processing === 'true') return;

    const data = collectFormData(form);
    if (!data.name && !data.phone) {
        console.log('No contact data — skipping');
        return;
    }

    const hasRedirect = !!FORM_REDIRECTS[form.id];
    if (hasRedirect) {
        event.preventDefault();
        event.stopPropagation();
    }

    form.dataset.processing = 'true';
    const btn = form.querySelector('input[type="submit"], button[type="submit"]');
    if (btn) { btn.disabled = true; btn.style.opacity = '.5'; }

    try {
        console.log(`📝 Submitting: ${form.id}`);

        await sendToBackend(data);
        showNotification('Заявку відправлено! ✓');

        // Дублюємо у Webflow для їхньої аналітики
        if (form.action && !form.action.includes(window.location.pathname)) {
            fetch(form.action, { method: 'POST', body: new FormData(form) }).catch(() => {});
        }

        if (hasRedirect) performRedirect(form.id);

    } catch (err) {
        console.error('Submit error:', err);
        showNotification('Помилка відправки', 'error');
        if (hasRedirect) performRedirect(form.id, 1200);
    } finally {
        setTimeout(() => {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
            form.dataset.processing = 'false';
        }, 2500);
    }
}

// ─── ІНІЦІАЛІЗАЦІЯ ───────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('form[id]');
    console.log(`📦 Found ${forms.length} form(s) with ID`);

    forms.forEach(form => {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit, false);

        const redirect = FORM_REDIRECTS[form.id];
        console.log(`  • ${form.id} → ${redirect ? redirect.slice(0, 45) + '…' : '(no redirect)'}`);
    });

    console.log('✅ Forms ready');
});

// ─── DEBUG API ───────────────────────────────────────────────

window.FormDebug = {
    check:  () => document.querySelectorAll('form[id]').forEach((f, i) =>
                    console.log(`${i}. ${f.id} → ${FORM_REDIRECTS[f.id] || 'no redirect'}`)),
    send:   async (formId) => {
        const form = document.getElementById(formId);
        if (!form) return console.error('Form not found:', formId);
        const data = collectFormData(form);
        const ok = await sendToBackend(data);
        console.log('Test send:', ok ? '✅ OK' : '❌ Failed');
    },
    redirect: (formId) => performRedirect(formId),
};
