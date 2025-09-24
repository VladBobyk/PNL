// Конфігурація Telegram бота
const TELEGRAM_CONFIG = {
    botToken: '7972648152:AAEkEvxuTv4wrX0LEQkNhzSr7RRdRilA4-I',
    chatId: '-1002699091130',
    threads: {
        'trial_lesson': 1809,
        'general': null
    }
};

// Визначення браузера
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

console.log('Browser detection:', { isSafari, isIOS, isMacOS });

// Функція для показу повідомлень
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Функція для визначення в яку гілку відправляти
function getThreadId(form) {
    const formId = form.id;
    
    if (formId === 'wf-form-free' ||
        form.classList.contains('forma-free') ||
        form.classList.contains('wf-form-free') ||
        form.dataset.formType === 'free' ||
        form.dataset.formType === 'trial') {
        return TELEGRAM_CONFIG.threads.trial_lesson;
    }
    
    return TELEGRAM_CONFIG.threads.general;
}

// Функція для відправки повідомлення в Telegram (без змін)
async function sendToTelegram(formData, threadId) {
    try {
        const message = formatMessage(formData);
        
        const payload = {
            chat_id: TELEGRAM_CONFIG.chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        };

        if (threadId !== null && threadId !== undefined) {
            payload.message_thread_id = threadId;
        }
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        return result.ok;
    } catch (error) {
        console.error('Помилка відправки в Telegram:', error);
        return false;
    }
}

// Функція для витягування UTM міток
function getUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = {};
    
    const utmKeys = [
        'utm_source', 'utm_medium', 'utm_campaign', 
        'utm_term', 'utm_content', 'utm_id'
    ];
    
    utmKeys.forEach(key => {
        const value = urlParams.get(key);
        if (value) {
            utmParams[key] = value;
        }
    });
    
    return utmParams;
}

// Функція форматування повідомлення
function formatMessage(formData) {
    const currentTime = new Date().toLocaleString('uk-UA');
    const utmParams = getUTMParams();
    
    let message = `🔔 <b>Нова заявка з сайту</b>\n`;
    message += `📅 <b>Дата:</b> ${currentTime}\n`;
    
    if (formData.formType) {
        const typeEmoji = formData.formType === 'trial' ? '🎓' : '📋';
        const typeName = formData.formType === 'trial' ? 'Пробний урок' : 'Загальна заявка';
        message += `${typeEmoji} <b>Тип заявки:</b> ${typeName}\n`;
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
    
    if (Object.keys(utmParams).length > 0) {
        message += `\n\n📊 <b>UTM мітки:</b>\n`;
        Object.entries(utmParams).forEach(([key, value]) => {
            const displayName = key.replace('utm_', '').replace('_', ' ');
            message += `• <b>${displayName}:</b> ${value}\n`;
        });
    }
    
    return message;
}

// Функція збору даних з форми
function collectFormData(form) {
    const formData = {};
    
    const nameField = form.querySelector('#name, input[name="name"], input[type="text"]');
    const phoneField = form.querySelector('#Phone-2, #phone, input[name="phone"], input[type="tel"]');
    const fieldField = form.querySelector('#field, textarea, input[name="message"]');
    
    if (nameField && nameField.value.trim()) {
        formData.name = nameField.value.trim();
    }
    
    if (phoneField && phoneField.value.trim()) {
        formData.phone = phoneField.value.trim();
    }
    
    if (fieldField && fieldField.value.trim()) {
        formData.field = fieldField.value.trim();
    }

    const formId = form.id;
    if (formId === 'wf-form-free' || 
        form.classList.contains('forma-free') ||
        form.classList.contains('wf-form-free') ||
        form.dataset.formType === 'free' ||
        form.dataset.formType === 'trial') {
        formData.formType = 'trial';
    } else {
        formData.formType = 'general';
    }
    
    return formData;
}

// Функція валідації
function validateForm(formData) {
    return !!(formData.name || formData.phone);
}

// Функція для отримання URL редіректу
function getRedirectUrl(form) {
    // Шукаємо redirect URL в різних місцях
    return form.getAttribute('data-redirect') || 
           form.getAttribute('redirect') ||
           form.dataset.redirect ||
           form.querySelector('[data-redirect]')?.getAttribute('data-redirect') ||
           form.querySelector('input[name="redirect"]')?.value ||
           null;
}

// ГОЛОВНА ФУНКЦІЯ - оптимізована для Safari
async function handleFormSubmit(event) {
    const form = event.target;
    if (!form) return;
    
    // Якщо форма вже обробляється - пропускаємо
    if (form.dataset.telegramSending === 'true') {
        return;
    }
    
    // Збираємо дані
    const formData = collectFormData(form);
    
    // Валідація
    if (!validateForm(formData)) {
        if (!isSafari && !isIOS) {
            event.preventDefault();
            showNotification('Будь ласка, заповніть обов\'язкові поля', 'error');
        }
        return;
    }
    
    // Отримуємо URL для редіректу
    const redirectUrl = getRedirectUrl(form);
    console.log('Redirect URL:', redirectUrl);
    
    // Маркуємо форму
    form.dataset.telegramSending = 'true';
    
    // Визначаємо Thread ID
    const threadId = getThreadId(form);
    
    // ВАЖЛИВО: Для Safari використовуємо інший підхід
    if (isSafari || isIOS || isMacOS) {
        // Для Safari: відправляємо в Telegram через beacon API або setTimeout
        const telegramData = {
            formData: formData,
            threadId: threadId
        };
        
        // Використовуємо sendBeacon для Safari (працює навіть при переході на іншу сторінку)
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify({
                url: `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`,
                data: {
                    chat_id: TELEGRAM_CONFIG.chatId,
                    text: formatMessage(formData),
                    parse_mode: 'HTML',
                    message_thread_id: threadId
                }
            })], { type: 'application/json' });
            
            // Відправляємо через beacon
            navigator.sendBeacon('/telegram-proxy', blob);
        }
        
        // Альтернативний метод для Safari
        setTimeout(() => {
            sendToTelegram(formData, threadId).catch(console.error);
        }, 0);
        
        // Додаємо невелику затримку для Safari перед редіректом
        if (redirectUrl) {
            setTimeout(() => {
                form.dataset.telegramSending = 'false';
            }, 100);
        }
        
    } else {
        // Для інших браузерів - стандартний підхід
        sendToTelegram(formData, threadId)
            .then(success => {
                if (success) {
                    console.log('✅ Відправлено в Telegram');
                    showNotification('Заявка відправлена!', 'success');
                }
            })
            .catch(console.error)
            .finally(() => {
                setTimeout(() => {
                    form.dataset.telegramSending = 'false';
                }, 500);
            });
    }
}

// Спеціальна ініціалізація для Safari
function initSafariWorkaround() {
    if (!isSafari && !isIOS && !isMacOS) return;
    
    console.log('🔧 Активовано Safari workaround');
    
    // Для Safari використовуємо MutationObserver для відслідковування змін
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'data-redirect') {
                const form = mutation.target;
                const redirectUrl = form.getAttribute('data-redirect');
                
                if (redirectUrl) {
                    console.log('Safari: знайдено redirect URL:', redirectUrl);
                    // Зберігаємо URL в localStorage для fallback
                    localStorage.setItem('webflow_redirect', redirectUrl);
                }
            }
        });
    });
    
    // Спостерігаємо за всіма формами
    document.querySelectorAll('form').forEach(form => {
        observer.observe(form, {
            attributes: true,
            attributeFilter: ['data-redirect', 'redirect']
        });
    });
}

// Альтернативний метод відправки для Safari
function safariSendToTelegram(formData, threadId) {
    // Створюємо зображення для відправки даних (працює в Safari)
    const img = new Image();
    const params = new URLSearchParams({
        chat_id: TELEGRAM_CONFIG.chatId,
        text: formatMessage(formData),
        parse_mode: 'HTML'
    });
    
    if (threadId) {
        params.append('message_thread_id', threadId);
    }
    
    img.src = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage?${params}`;
    img.onerror = () => console.log('Telegram send attempted');
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Ініціалізація Telegram Form Sender');
    console.log('📱 Платформа:', { isSafari, isIOS, isMacOS });
    
    // Ініціалізуємо Safari workaround
    initSafariWorkaround();
    
    // Для Webflow форм
    if (window.Webflow) {
        window.Webflow.push(function() {
            console.log('🔄 Webflow ready');
            
            // Використовуємо jQuery якщо доступний (Webflow включає jQuery)
            if (window.$ && window.$.fn) {
                $('form').each(function() {
                    const form = this;
                    const $form = $(form);
                    
                    // Зберігаємо оригінальний redirect
                    const originalRedirect = $form.attr('data-redirect') || 
                                           $form.attr('redirect');
                    
                    if (originalRedirect) {
                        form.dataset.originalRedirect = originalRedirect;
                        console.log(`Form ${form.id}: redirect = ${originalRedirect}`);
                    }
                    
                    // Додаємо обробник через jQuery (працює краще в Safari)
                    $form.off('submit.telegram').on('submit.telegram', function(e) {
                        handleFormSubmit(e);
                    });
                });
            }
        });
    }
    
    // Стандартна ініціалізація
    const forms = document.querySelectorAll('form');
    console.log(`Знайдено форм: ${forms.length}`);
    
    forms.forEach((form, index) => {
        // Зберігаємо redirect URL
        const redirectUrl = getRedirectUrl(form);
        if (redirectUrl) {
            form.dataset.originalRedirect = redirectUrl;
            console.log(`Form ${index}: redirect URL = ${redirectUrl}`);
        }
        
        // Додаємо обробник з capture phase для Safari
        form.addEventListener('submit', handleFormSubmit, true);
        
        // Додатковий fallback для Safari
        if (isSafari || isIOS) {
            form.addEventListener('submit', function() {
                const redirect = form.dataset.originalRedirect;
                if (redirect) {
                    setTimeout(() => {
                        if (window.location.href === document.URL) {
                            console.log('Safari fallback redirect to:', redirect);
                            window.location.href = redirect;
                        }
                    }, 2000);
                }
            });
        }
    });
});

// Додаємо стилі
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: 500;
        opacity: 0;
        transition: opacity 0.3s;
        z-index: 10000;
    }
    .notification.show {
        opacity: 1;
    }
    .notification.success {
        background-color: #4CAF50;
    }
    .notification.error {
        background-color: #f44336;
    }
`;
document.head.appendChild(style);

// Debug API
window.TelegramFormSender = {
    checkRedirects: function() {
        const forms = document.querySelectorAll('form');
        console.log('=== Form Redirects ===');
        forms.forEach((form, i) => {
            const redirect = getRedirectUrl(form);
            const original = form.dataset.originalRedirect;
            console.log(`Form ${i} (${form.id}):`, {
                redirect: redirect,
                original: original,
                action: form.action,
                method: form.method
            });
        });
    },
    
    testSafari: function() {
        console.log('Safari test:', { isSafari, isIOS, isMacOS });
        if (navigator.sendBeacon) {
            console.log('✅ sendBeacon підтримується');
        } else {
            console.log('❌ sendBeacon не підтримується');
        }
    }
};

console.log('💡 Для перевірки редіректів виконайте: TelegramFormSender.checkRedirects()');
console.log('💡 Для тесту Safari виконайте: TelegramFormSender.testSafari()');
