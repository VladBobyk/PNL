// Конфігурація Telegram бота
const TELEGRAM_CONFIG = {
    botToken: '7972648152:AAEkEvxuTv4wrX0LEQkNhzSr7RRdRilA4-I',
    chatId: '-1002699091130',
    threads: {
        'trial_lesson': 1809,
        'general': null
    }
};

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
    console.log('Form ID:', formId);
    
    if (formId === 'wf-form-free' ||
        form.classList.contains('forma-free') ||
        form.classList.contains('wf-form-free') ||
        form.dataset.formType === 'free' ||
        form.dataset.formType === 'trial') {
        console.log('Визначено форму пробного уроку');
        return TELEGRAM_CONFIG.threads.trial_lesson;
    }
    
    console.log('Визначено загальну форму');
    return TELEGRAM_CONFIG.threads.general;
}

// Функція для відправки повідомлення в Telegram
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
        
        if (!response.ok) {
            console.error('Telegram API error:', result);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        console.log('Відповідь від Telegram:', result);
        return result.ok;
    } catch (error) {
        console.error('Помилка відправки в Telegram:', error);
        return false;
    }
}

// Функція для витягування UTM міток з URL
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

// Функція для форматування повідомлення
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

// Функція для збору даних з форми
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
    
    console.log('Зібрані дані форми:', formData);
    return formData;
}

// Функція для валідації форми
function validateForm(formData) {
    if (!formData.name && !formData.phone) {
        return false;
    }
    return true;
}

// ГОЛОВНА ЗМІНА: Новий підхід до обробки форми
async function handleFormSubmit(event) {
    const form = event.target;
    if (!form) return;
    
    // Перевіряємо чи форма вже була оброблена
    if (form.dataset.telegramProcessing === 'true') {
        return; // Дозволяємо стандартну відправку
    }
    
    // Збираємо дані БЕЗ блокування форми
    const formData = collectFormData(form);
    
    // Валідація
    if (!validateForm(formData)) {
        event.preventDefault(); // Блокуємо тільки якщо невалідна
        showNotification('Будь ласка, заповніть обов\'язкові поля', 'error');
        return;
    }
    
    // Зберігаємо action форми для редіректу (якщо потрібно fallback)
    const formAction = form.getAttribute('action');
    const formRedirect = form.dataset.redirect || form.getAttribute('data-redirect');
    
    // Маркуємо що форма обробляється
    form.dataset.telegramProcessing = 'true';
    
    // Визначаємо Thread ID
    const threadId = getThreadId(form);
    
    // ВАЖЛИВО: Відправляємо в Telegram АСИНХРОННО без блокування
    sendToTelegram(formData, threadId)
        .then(success => {
            if (success) {
                console.log('✅ Повідомлення відправлено в Telegram');
                showNotification('Заявка успішно відправлена!', 'success');
            } else {
                console.log('⚠️ Помилка відправки в Telegram, але форма відправлена');
            }
        })
        .catch(error => {
            console.error('Помилка:', error);
        })
        .finally(() => {
            // Очищаємо флаг після відправки
            setTimeout(() => {
                form.dataset.telegramProcessing = 'false';
            }, 1000);
        });
    
    // НЕ блокуємо стандартну відправку форми Webflow
    // Форма продовжить свою роботу і виконає редірект
}

// Альтернативний метод з використанням Webflow подій
function initWebflowIntegration() {
    // Якщо є Webflow об'єкт
    if (window.Webflow) {
        window.Webflow.push(function() {
            // Перехоплюємо успішну відправку форми
            $(document).on('submit', 'form', function(e) {
                const form = this;
                
                // Збираємо дані без блокування
                const formData = collectFormData(form);
                if (!validateForm(formData)) return;
                
                const threadId = getThreadId(form);
                
                // Відправляємо в Telegram паралельно
                sendToTelegram(formData, threadId).catch(console.error);
            });
        });
    }
}

// Функція для забезпечення редіректу (fallback)
function ensureRedirect(form) {
    // Зберігаємо оригінальний redirect URL з атрибутів Webflow
    const redirectUrl = form.getAttribute('data-redirect') || 
                       form.querySelector('[data-redirect]')?.getAttribute('data-redirect');
    
    if (redirectUrl) {
        // Додаємо fallback редірект через 3 секунди
        setTimeout(() => {
            if (window.location.href === document.URL) {
                console.log('Fallback redirect to:', redirectUrl);
                window.location.href = redirectUrl;
            }
        }, 3000);
    }
}

// Ініціалізація після завантаження сторінки
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Ініціалізація Telegram Form Sender');
    
    // Ініціалізуємо Webflow інтеграцію
    initWebflowIntegration();
    
    // Знаходимо всі форми
    const forms = document.querySelectorAll('form');
    console.log(`Знайдено форм: ${forms.length}`);
    
    forms.forEach(form => {
        // Видаляємо старі обробники
        form.removeEventListener('submit', handleFormSubmit);
        
        // Додаємо новий обробник з високим пріоритетом
        form.addEventListener('submit', handleFormSubmit, false);
        
        // Додаємо fallback для редіректу
        form.addEventListener('submit', function() {
            ensureRedirect(form);
        });
        
        const threadId = getThreadId(form);
        const threadName = threadId === TELEGRAM_CONFIG.threads.trial_lesson ? 
            'Заявки на пробний урок' : 'Основний чат';
        
        console.log(`✅ Форма "${form.id || 'без ID'}" налаштована для відправки в: ${threadName}`);
    });
});

// Додаємо стилі для повідомлень
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

// API для тестування (без змін)
window.TelegramFormSender = {
    testTrialForm: async function() {
        console.log('🧪 Тестування відправки в гілку "Заявки на пробний урок"');
        const testData = {
            name: 'Тест Пробний Урок',
            phone: '+380123456789',
            field: 'Тест форми пробного уроку',
            formType: 'trial'
        };
        
        const success = await sendToTelegram(testData, TELEGRAM_CONFIG.threads.trial_lesson);
        if (success) {
            console.log('✅ Тест пробного уроку пройшов успішно!');
            showNotification('Тест пробного уроку успішний!', 'success');
        } else {
            console.log('❌ Помилка тестування пробного уроку');
            showNotification('Помилка тесту пробного уроку', 'error');
        }
    },
    
    showForms: function() {
        const forms = document.querySelectorAll('form');
        console.log(`📝 Знайдено ${forms.length} форм на сторінці:`);
        forms.forEach((form, index) => {
            const threadId = getThreadId(form);
            const threadName = threadId === TELEGRAM_CONFIG.threads.trial_lesson ? 
                'Заявки на пробний урок' : 'Основний чат';
            const redirectUrl = form.getAttribute('data-redirect');
            console.log(`${index + 1}. ID: "${form.id || 'немає'}", Redirect: "${redirectUrl || 'немає'}", Відправка в: ${threadName}`);
        });
    }
};
