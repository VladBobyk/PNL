// ============================================================
// Telegram Form Sender v3.0 — з Google Sheets + WayForPay
// ============================================================

// ─── КОНФІГУРАЦІЯ ────────────────────────────────────────────

const TELEGRAM_BOT_CONFIG = {
    botToken: '7972648152:AAEkEvxuTv4wrX0LEQkNhzSr7RRdRilA4-I',
    chatId: '-1002699091130',
    threads: {
        'trial_lesson': 1809,
        'general': null,
    },
};

// URL вашого Google Apps Script Web App
// (отримаєте після Deploy → New deployment → Web App)
const SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzt4WFnDw1F6B8kdk8VQzhVmf7NxtQxJy2N7w477O3dCpQBUvI03wW0wdsj7E7fUOEj/exec';

// Секретний ключ — має збігатися з SHEET_CONFIG.secretKey в Apps Script
const SHEETS_SECRET = 'pnl2026secret';

const FORM_REDIRECTS = {
    'wf-form-mini-course':   'https://secure.wayforpay.com/payment/pnl_course_1',
    'wf-form-building':      'https://secure.wayforpay.com/payment/course_pnl_2',
    'wf-form-consultation':  'https://secure.wayforpay.com/payment/pnl_consultation',
    'wf-form-mentoring':     'https://secure.wayforpay.com/payment/pnl_mentorship',
    'wf-form-free':          'https://www.pnl.com.ua/dyakuiemo-za-pokupku-bezkoshtovnogo-mini-kurs',
};

// ─── DEVICE DETECTION ────────────────────────────────────────

const isIOS    = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

console.log('🚀 Form Sender v3.0 — Telegram + Sheets + WayForPay');
console.log('📱 Device:', { isIOS, isSafari });

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

    // Додаємо анімацію якщо ще не є
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
        formType: form.id === 'wf-form-free' ? 'trial' : 'paid',
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

// ─── TELEGRAM ────────────────────────────────────────────────

function getThreadId(form) {
    return form.id === 'wf-form-free'
        ? TELEGRAM_BOT_CONFIG.threads.trial_lesson
        : TELEGRAM_BOT_CONFIG.threads.general;
}

function formatTelegramMessage(data) {
    const { name, phone, field, formId, formType, pageUrl, utm } = data;
    const time = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' });

    const formLabels = {
        'wf-form-mini-course':  '📦 Міні-курс',
        'wf-form-building':     '🏗️ Курс «Будівництво»',
        'wf-form-consultation': '🤝 Консультація',
        'wf-form-mentoring':    '🎓 Менторинг',
        'wf-form-free':         '🎁 Безкоштовний міні-курс',
    };

    let msg = `🔔 <b>Нова заявка</b>\n`;
    msg += `📅 ${time}\n`;
    msg += `📋 ${formLabels[formId] || formId}\n`;
    msg += `\n`;
    if (name)  msg += `👤 <b>Ім'я:</b> ${name}\n`;
    if (phone) msg += `📱 <b>Телефон:</b> ${phone}\n`;
    if (field) msg += `📝 <b>Повідомлення:</b> ${field}\n`;
    msg += `\n🌐 <a href="${pageUrl}">Сторінка</a>`;

    const utmLines = Object.entries(utm).filter(([, v]) => v);
    if (utmLines.length) {
        msg += `\n\n📊 <b>UTM:</b>\n`;
        utmLines.forEach(([k, v]) => { msg += `• ${k}: ${v}\n`; });
    }

    return msg;
}

async function sendToTelegram(data) {
    try {
        const threadId = getThreadId({ id: data.formId });
        const payload  = {
            chat_id:                 TELEGRAM_BOT_CONFIG.chatId,
            text:                    formatTelegramMessage(data),
            parse_mode:              'HTML',
            disable_web_page_preview: false,
        };
        if (threadId !== null && threadId !== undefined) {
            payload.message_thread_id = threadId;
        }

        const res = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_CONFIG.botToken}/sendMessage`,
            { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }
        );
        const json = await res.json();
        console.log('Telegram:', json.ok ? '✅ OK' : '❌ Failed', json.description || '');
        return json.ok;
    } catch (err) {
        console.error('Telegram error:', err);
        return false;
    }
}

// ─── GOOGLE SHEETS ───────────────────────────────────────────

async function sendToSheets(data) {
    if (!SHEETS_ENDPOINT || SHEETS_ENDPOINT.startsWith('ВСТАВТЕ')) {
        console.warn('⚠️ Google Sheets endpoint not configured');
        return false;
    }

    try {
        const payload = { ...data, secretKey: SHEETS_SECRET };

        const res = await fetch(SHEETS_ENDPOINT, {
            method:    'POST',
            mode:      'no-cors', // Apps Script не повертає CORS-заголовки
            headers:   { 'Content-Type': 'text/plain' }, // no-cors обмеження
            body:      JSON.stringify(payload),
            keepalive: true,
        });

        // З no-cors ми не бачимо відповіді, але запит дійде
        console.log('Google Sheets: ✅ Request sent (no-cors)');
        return true;
    } catch (err) {
        console.error('Sheets error:', err);
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
    setTimeout(() => {
        window.location.href = url.startsWith('www.') ? 'https://' + url : url;
    }, delayMs);
    return true;
}

// ─── ГОЛОВНИЙ ОБРОБНИК ───────────────────────────────────────

async function handleFormSubmit(event) {
    const form = event.target;
    if (!form?.id) return;
    if (form.dataset.processing === 'true') return;

    const data = collectFormData(form);

    // Нічого не збирати — форма без контактів
    if (!data.name && !data.phone) {
        console.log('No contact data — skipping');
        return;
    }

    // Якщо є кастомний редірект — перехоплюємо сабміт
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

        // Паралельно: Telegram + Sheets (не блокуємо одне одним)
        const [telegramOk] = await Promise.allSettled([
            sendToTelegram(data),
            sendToSheets(data),
        ]);

        if (telegramOk.value) showNotification('Заявку відправлено! ✓');

        // Відправляємо і в Webflow (для їх власної аналітики)
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
    console.log(`\n📦 Found ${forms.length} form(s) with ID`);

    forms.forEach(form => {
        form.removeEventListener('submit', handleFormSubmit);
        form.addEventListener('submit', handleFormSubmit, false);

        const redirect = FORM_REDIRECTS[form.id];
        console.log(`  • ${form.id} → ${redirect ? redirect.slice(0, 45) + '…' : '(no redirect)'}`);
    });

    console.log('✅ Forms ready\n');
});

// ─── DEBUG API ───────────────────────────────────────────────

window.FormDebug = {
    check:   () => document.querySelectorAll('form[id]').forEach((f, i) =>
                     console.log(`${i}. ${f.id} → ${FORM_REDIRECTS[f.id] || 'no redirect'}`)),
    config:  () => console.table(FORM_REDIRECTS),
    telegram: async (formId) => {
        const form = document.getElementById(formId);
        if (!form) return console.error('Form not found:', formId);
        const data = collectFormData(form);
        const ok = await sendToTelegram(data);
        console.log('Telegram test:', ok ? '✅ OK' : '❌ Failed');
    },
    sheets: async (formId) => {
        const form = document.getElementById(formId);
        if (!form) return console.error('Form not found:', formId);
        const data = collectFormData(form);
        const ok = await sendToSheets(data);
        console.log('Sheets test:', ok ? '✅ Sent' : '❌ Failed');
    },
    redirect: (formId) => performRedirect(formId),
};

console.log('💡 Debug: FormDebug.check() | .telegram("id") | .sheets("id") | .redirect("id")');
