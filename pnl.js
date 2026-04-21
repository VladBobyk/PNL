// Видаліть весь попередній код і використовуйте тільки цей!

// Конфігурація Telegram бота
const TELEGRAM_BOT_CONFIG = {
    botToken: '7972648152:AAEkEvxuTv4wrX0LEQkNhzSr7RRdRilA4-I',
    chatId: '-1002699091130',
    threads: {
        'trial_lesson': 1809,
        'general': null
    }
};

// КОНФІГУРАЦІЯ РЕДІРЕКТІВ
const FORM_REDIRECTS = {
    'wf-form-mini-course': 'https://secure.wayforpay.com/payment/pnl_course_1',
    'wf-form-building': 'https://secure.wayforpay.com/payment/pnl_course_2',
    'wf-form-consultation': 'https://secure.wayforpay.com/payment/pnl_consultation',
    'wf-form-mentoring': 'https://secure.wayforpay.com/payment/pnl_mentorship',
    'wf-form-free': 'https://www.pnl.com.ua/dyakuiemo-za-pokupku-bezkoshtovnogo-mini-kurs'
};

// Перевірка Safari/iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

console.log('🚀 Telegram Form Sender v2.0 (with custom redirects)');
console.log('📱 Device:', { isIOS, isSafari });
console.log('🔗 Redirects configured:', Object.keys(FORM_REDIRECTS).length);

// Функція показу повідомлень
function showNotification(message, type = 'success') {
    // Видаляємо старі повідомлення
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
        transition: opacity 0.3s;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Функція для визначення в яку гілку відправляти
function getThreadId(form) {
    const formId = form.id;
    console.log('Checking thread for form:', formId);
    
    if (formId === 'wf-form-free') {
        console.log('→ Thread: Trial lesson');
        return TELEGRAM_BOT_CONFIG.threads.trial_lesson;
    }
    
    console.log('→ Thread: General');
    return TELEGRAM_BOT_CONFIG.threads.general;
}

// Збір даних з форми
function collectFormData(form) {
    const formData = {};
    
    // Різні селектори для полів
    const nameField = form.querySelector('#name, input[name="name"], input[type="text"]:not([type="hidden"])');
    const phoneField = form.querySelector('#Phone-2, #phone, input[name="phone"], input[type="tel"]');
    const fieldField = form.querySelector('#field, textarea, input[name="message"]');
    
    if (nameField && nameField.value) {
        formData.name = nameField.value.trim();
    }
    
    if (phoneField && phoneField.value) {
        formData.phone = phoneField.value.trim();
    }
    
    if (fieldField && fieldField.value) {
        formData.field = fieldField.value.trim();
    }
    
    formData.formId = form.id;
    formData.formType = form.id === 'wf-form-free' ? 'trial' : 'general';
    
    console.log('Collected form data:', formData);
    return formData;
}

// Форматування повідомлення
function formatMessage(formData) {
    const currentTime = new Date().toLocaleString('uk-UA');
    const utmParams = new URLSearchParams(window.location.search);
    
    let message = `🔔 <b>Нова заявка з сайту</b>\n`;
    message += `📅 <b>Дата:</b> ${currentTime}\n`;
    message += `📋 <b>Форма:</b> ${formData.formId}\n`;
    
    if (formData.formType === 'trial') {
        message += `🎓 <b>Тип:</b> Пробний урок\n`;
    }
    
    message += `\n`;
    
    if (formData.name) {
        message += `👤 <b>Ім'я:</b> ${formData.name}\n`;
    }
    
    if (formData.phone) {
        message += `📱 <b>Телефон:</b> ${formData.phone}\n`;
    }
    
    if (formData.field) {
        message += `📝 <b>Додаткова інформація:</b> ${formData.field}\n`;
    }
    
    message += `\n🌐 <b>Сторінка:</b> ${window.location.href}`;
    
    // UTM мітки
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const utmData = {};
    utmKeys.forEach(key => {
        const value = utmParams.get(key);
        if (value) utmData[key] = value;
    });
    
    if (Object.keys(utmData).length > 0) {
        message += `\n\n📊 <b>UTM мітки:</b>\n`;
        Object.entries(utmData).forEach(([key, value]) => {
            message += `• ${key}: ${value}\n`;
        });
    }
    
    return message;
}

// Відправка в Telegram
async function sendToTelegram(formData, threadId) {
    try {
        const message = formatMessage(formData);
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_CONFIG.botToken}/sendMessage`;
        
        const payload = {
            chat_id: TELEGRAM_BOT_CONFIG.chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        };
        
        if (threadId !== null && threadId !== undefined) {
            payload.message_thread_id = threadId;
        }
        
        console.log('Sending to Telegram:', { threadId, formId: formData.formId });
        
        // Використовуємо fetch з keepalive для надійності
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            keepalive: true
        });
        
        const result = await response.json();
        console.log('Telegram response:', result.ok ? 'Success' : 'Failed');
        return result.ok;
        
    } catch (error) {
        console.error('Error sending to Telegram:', error);
        return false;
    }
}

// Функція для виконання редіректу
function performRedirect(formId) {
    const redirectUrl = FORM_REDIRECTS[formId];
    
    if (redirectUrl) {
        console.log(`🔄 Redirecting form "${formId}" to: ${redirectUrl}`);
        showNotification('Переходимо далі...', 'success');
        
        // Невелика затримка для показу повідомлення
        setTimeout(() => {
            // Для внутрішніх посилань додаємо протокол якщо його немає
            if (redirectUrl.startsWith('www.')) {
                window.location.href = 'https://' + redirectUrl;
            } else {
                window.location.href = redirectUrl;
            }
        }, 500);
        
        return true;
    } else {
        console.warn(`⚠️ No redirect configured for form: ${formId}`);
        return false;
    }
}

// ГОЛОВНА функція обробки форми
async function handleFormSubmit(event) {
    const form = event.target;
    
    // Перевіряємо чи це форма і чи має вона ID
    if (!form || !form.id) {
        console.log('Form without ID, skipping');
        return;
    }
    
    console.log(`\n📝 Form submitted: ${form.id}`);
    
    // Перевіряємо чи вже обробляється
    if (form.dataset.processing === 'true') {
        console.log('Form already processing, skipping');
        return;
    }
    
    // Збираємо дані
    const formData = collectFormData(form);
    
    // Валідація
    if (!formData.name && !formData.phone) {
        console.log('No data to send, allowing default submission');
        return;
    }
    
    // Якщо є налаштований редірект - блокуємо стандартну відправку
    if (FORM_REDIRECTS[form.id]) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Default submission prevented, using custom redirect');
    }
    
    // Маркуємо що обробляється
    form.dataset.processing = 'true';
    
    // Блокуємо кнопку
    const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.style.opacity = '0.5';
    }
    
    try {
        // Визначаємо thread ID
        const threadId = getThreadId(form);
        
        // Відправляємо в Telegram
        const telegramSuccess = await sendToTelegram(formData, threadId);
        
        if (telegramSuccess) {
            showNotification('Заявка відправлена!', 'success');
        }
        
        // Відправляємо форму в Webflow якщо є action
        if (form.action && form.action !== window.location.href) {
            const formDataToSend = new FormData(form);
            
            try {
                await fetch(form.action, {
                    method: 'POST',
                    body: formDataToSend
                });
                console.log('Form sent to Webflow');
            } catch (error) {
                console.error('Error sending to Webflow:', error);
            }
        }
        
        // Виконуємо редірект
        if (FORM_REDIRECTS[form.id]) {
            performRedirect(form.id);
        }
        
    } catch (error) {
        console.error('Error in form handler:', error);
        showNotification('Помилка відправки', 'error');
        
        // Все одно пробуємо редірект
        if (FORM_REDIRECTS[form.id]) {
            setTimeout(() => performRedirect(form.id), 1000);
        }
        
    } finally {
        // Розблоковуємо кнопку через 2 секунди
        setTimeout(() => {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.style.opacity = '1';
            }
            form.dataset.processing = 'false';
        }, 2000);
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log('\n📦 Initializing forms...');
    
    // Знаходимо всі форми
    const forms = document.querySelectorAll('form');
    console.log(`Found ${forms.length} forms`);
    
    forms.forEach((form, index) => {
        if (!form.id) {
            console.log(`Form ${index}: No ID, skipping`);
            return;
        }
        
        console.log(`Form ${index}: ${form.id}`);
        
        // Видаляємо старі обробники якщо є
        form.removeEventListener('submit', handleFormSubmit);
        
        // Додаємо новий обробник
        form.addEventListener('submit', handleFormSubmit, false);
        
        // Показуємо конфігурацію редіректу
        if (FORM_REDIRECTS[form.id]) {
            console.log(`  ✅ Redirect: ${FORM_REDIRECTS[form.id].substring(0, 50)}...`);
        } else {
            console.log(`  ⚠️ No redirect configured`);
        }
    });
    
    console.log('\n✅ Forms initialized successfully');
});

// API для налагодження
window.FormRedirects = {
    // Показати всі форми
    check: function() {
        console.log('\n=== Forms and Redirects ===');
        document.querySelectorAll('form').forEach((form, i) => {
            const redirect = FORM_REDIRECTS[form.id] || 'NOT CONFIGURED';
            console.log(`${i}. ${form.id || 'NO-ID'}: ${redirect}`);
        });
    },
    
    // Тест редіректу
    testRedirect: function(formId) {
        console.log(`\nTesting redirect for: ${formId}`);
        if (performRedirect(formId)) {
            console.log('Redirect initiated');
        } else {
            console.log('No redirect configured');
        }
    },
    
    // Показати конфігурацію
    config: function() {
        console.table(FORM_REDIRECTS);
    },
    
    // Тест відправки в Telegram
    testTelegram: async function(formId) {
        const form = document.getElementById(formId);
        if (form) {
            const data = collectFormData(form);
            const threadId = getThreadId(form);
            const success = await sendToTelegram(data, threadId);
            console.log('Telegram test:', success ? 'SUCCESS' : 'FAILED');
        } else {
            console.error('Form not found:', formId);
        }
    }
};

console.log('\n💡 Debug commands:');
console.log('FormRedirects.check() - show all forms');
console.log('FormRedirects.config() - show redirect configuration');
console.log('FormRedirects.testRedirect("wf-form-free") - test redirect');
console.log('FormRedirects.testTelegram("wf-form-free") - test Telegram');
