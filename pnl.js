// Конфігурація Telegram бота
const TELEGRAM_CONFIG = {
    botToken: '7972648152:AAEkEvxuTv4wrX0LEQkNhzSr7RRdRilA4-I',
    chatId: '-1002699091130',
    threads: {
        'trial_lesson': 1809,
        'general': null
    }
};

// КОНФІГУРАЦІЯ РЕДІРЕКТІВ
const FORM_REDIRECTS = {
    'wf-form-mini-course': 'https://secure.wayforpay.com/button/bd657e01a78cf',
    'wf-form-building': 'https://secure.wayforpay.com/button/b00942ef5e150',
    'wf-form-consultation': 'https://secure.wayforpay.com/button/b02d2b96f6458',
    'wf-form-mentoring': 'https://secure.wayforpay.com/button/bda5beed8e82d',
    'wf-form-free': 'https://www.pnl.com.ua/dyakuiemo-za-pokupku-bezkoshtovnogo-mini-kurs'
};

// Перевірка Safari/iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

console.log('📱 Device:', { isIOS, isSafari });
console.log('🔗 Redirects configured:', FORM_REDIRECTS);

// Функція показу повідомлень
function showNotification(message, type = 'success') {
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
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 3000);
}

// Збір даних з форми
function collectFormData(form) {
    const formData = {};
    
    const nameField = form.querySelector('#name, input[name="name"], input[type="text"]');
    const phoneField = form.querySelector('#Phone-2, #phone, input[name="phone"], input[type="tel"]');
    const fieldField = form.querySelector('#field, textarea, input[name="message"]');
    
    if (nameField) formData.name = nameField.value.trim();
    if (phoneField) formData.phone = phoneField.value.trim();
    if (fieldField) formData.field = fieldField.value.trim();
    
    // Визначаємо тип форми
    formData.formId = form.id;
    formData.formType = form.id === 'wf-form-free' ? 'trial' : 'general';
    
    return formData;
}

// Форматування повідомлення
function formatMessage(formData) {
    const currentTime = new Date().toLocaleString('uk-UA');
    let message = `🔔 <b>Нова заявка з сайту</b>\n`;
    message += `📅 <b>Дата:</b> ${currentTime}\n`;
    message += `📋 <b>Форма:</b> ${formData.formId}\n\n`;
    
    if (formData.name) message += `👤 <b>Ім'я:</b> ${formData.name}\n`;
    if (formData.phone) message += `📱 <b>Телефон:</b> ${formData.phone}\n`;
    if (formData.field) message += `📝 <b>Інфо:</b> ${formData.field}\n`;
    message += `\n🌐 <b>Сторінка:</b> ${window.location.href}`;
    
    return message;
}

// Відправка в Telegram через sendBeacon (для Safari)
function sendToTelegramBeacon(formData, threadId) {
    try {
        const message = formatMessage(formData);
        const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
        
        const data = {
            chat_id: TELEGRAM_CONFIG.chatId,
            text: message,
            parse_mode: 'HTML'
        };
        
        if (threadId) {
            data.message_thread_id = threadId;
        }
        
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
        } else {
            // Fallback через fetch з keepalive
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true
            }).catch(() => {});
        }
    } catch (error) {
        console.error('Error sending to Telegram:', error);
    }
}

// Функція редіректу
function performRedirect(formId) {
    const redirectUrl = FORM_REDIRECTS[formId];
    
    if (redirectUrl) {
        console.log(`🔄 Redirecting form ${formId} to: ${redirectUrl}`);
        showNotification('Переходимо до оплати...', 'success');
        
        // Затримка для показу повідомлення
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 500);
    } else {
        console.warn(`⚠️ No redirect URL configured for form: ${formId}`);
    }
}

// Головна функція обробки форми
function handleFormSubmit(event) {
    const form = event.target;
    if (!form || !form.id) return;
    
    // Перевіряємо чи форма вже обробляється
    if (form.dataset.processing === 'true') return;
    
    console.log(`📝 Processing form: ${form.id}`);
    
    // Збираємо дані
    const formData = collectFormData(form);
    
    // Валідація
    if (!formData.name && !formData.phone) {
        return; // Пропускаємо якщо немає даних
    }
    
    // Маркуємо форму
    form.dataset.processing = 'true';
    
    // Визначаємо thread ID
    const threadId = form.id === 'wf-form-free' 
        ? TELEGRAM_CONFIG.threads.trial_lesson 
        : TELEGRAM_CONFIG.threads.general;
    
    // Відправляємо в Telegram (асинхронно, не блокуємо форму)
    sendToTelegramBeacon(formData, threadId);
    
    // Блокуємо стандартний редірект Webflow
    event.preventDefault();
    event.stopPropagation();
    
    // Відправляємо форму через AJAX для Webflow
    const formElement = form;
    const formData2 = new FormData(formElement);
    
    // Знаходимо action URL
    const actionUrl = form.action || form.getAttribute('action') || window.location.href;
    
    // Відправляємо форму
    fetch(actionUrl, {
        method: 'POST',
        body: formData2
    })
    .then(response => {
        console.log('✅ Form submitted to Webflow');
        // Робимо наш редірект
        performRedirect(form.id);
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        // Все одно робимо редірект
        performRedirect(form.id);
    })
    .finally(() => {
        setTimeout(() => {
            form.dataset.processing = 'false';
        }, 1000);
    });
    
    return false; // Блокуємо стандартну поведінку
}

// Альтернативний метод для Safari
function setupFormForSafari(form) {
    if (!form.id || !FORM_REDIRECTS[form.id]) return;
    
    // Для Safari на iOS використовуємо інший підхід
    const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
    
    if (submitButton) {
        submitButton.addEventListener('click', function(e) {
            // Не блокуємо клік, просто готуємо редірект
            setTimeout(() => {
                if (form.checkValidity && form.checkValidity()) {
                    const formData = collectFormData(form);
                    
                    if (formData.name || formData.phone) {
                        // Відправляємо в Telegram
                        const threadId = form.id === 'wf-form-free' 
                            ? TELEGRAM_CONFIG.threads.trial_lesson 
                            : TELEGRAM_CONFIG.threads.general;
                        sendToTelegramBeacon(formData, threadId);
                        
                        // Редірект через затримку
                        setTimeout(() => {
                            performRedirect(form.id);
                        }, 1000);
                    }
                }
            }, 100);
        });
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Telegram Form Sender with Custom Redirects');
    
    // Чекаємо на Webflow
    if (window.Webflow) {
        window.Webflow.push(function() {
            console.log('📦 Webflow ready');
            initializeForms();
        });
    } else {
        setTimeout(initializeForms, 100);
    }
});

function initializeForms() {
    const forms = document.querySelectorAll('form');
    console.log(`📋 Found ${forms.length} forms`);
    
    forms.forEach(form => {
        if (!form.id) {
            console.warn('⚠️ Form without ID found, skipping');
            return;
        }
        
        console.log(`Setting up form: ${form.id}`);
        
        // Видаляємо Webflow redirect атрибути
        form.removeAttribute('data-redirect');
        form.removeAttribute('redirect');
        
        // Основний обробник
        form.addEventListener('submit', handleFormSubmit, true);
        
        // Додатковий обробник для Safari
        if (isIOS || isSafari) {
            setupFormForSafari(form);
        }
        
        // Показуємо налаштований редірект
        const redirectUrl = FORM_REDIRECTS[form.id];
        if (redirectUrl) {
            console.log(`✅ Form ${form.id} → ${redirectUrl}`);
        } else {
            console.log(`❌ Form ${form.id} → No redirect configured`);
        }
    });
}

// Debug API
window.FormRedirects = {
    // Показати всі форми та їх редіректи
    check: function() {
        console.log('=== Form Redirects Configuration ===');
        document.querySelectorAll('form').forEach(form => {
            const redirectUrl = FORM_REDIRECTS[form.id];
            console.log(`${form.id}: ${redirectUrl || 'NOT CONFIGURED'}`);
        });
    },
    
    // Тест редіректу для конкретної форми
    testRedirect: function(formId) {
        if (FORM_REDIRECTS[formId]) {
            console.log(`Testing redirect for ${formId}...`);
            performRedirect(formId);
        } else {
            console.error(`No redirect configured for form: ${formId}`);
        }
    },
    
    // Тест відправки форми
    testSubmit: function(formId) {
        const form = document.getElementById(formId);
        if (form) {
            console.log(`Testing submit for ${formId}...`);
            const event = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(event);
        } else {
            console.error(`Form not found: ${formId}`);
        }
    },
    
    // Показати конфігурацію
    showConfig: function() {
        console.table(FORM_REDIRECTS);
    }
};

console.log('💡 Команди для налагодження:');
console.log('FormRedirects.check() - показати всі форми');
console.log('FormRedirects.showConfig() - показати конфігурацію редіректів');
console.log('FormRedirects.testRedirect("wf-form-free") - тест редіректу');
