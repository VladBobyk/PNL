// Конфігурація Telegram бота
const TELEGRAM_CONFIG = {
    botToken: '7972648152:AAEkEvxuTv4wrX0LEQkNhzSr7RRdRilA4-I',
    chatId: '-1002699091130',
    threads: {
        'trial_lesson': 1809,
        'general': null
    }
};

// Перевірка Safari/iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

console.log('📱 Device:', { isIOS, isSafari });

// Простий збір даних
function collectFormData(form) {
    const formData = {};
    
    const nameField = form.querySelector('#name, input[name="name"], input[type="text"]');
    const phoneField = form.querySelector('#Phone-2, #phone, input[name="phone"], input[type="tel"]');
    const fieldField = form.querySelector('#field, textarea, input[name="message"]');
    
    if (nameField) formData.name = nameField.value.trim();
    if (phoneField) formData.phone = phoneField.value.trim();
    if (fieldField) formData.field = fieldField.value.trim();
    
    // Визначаємо тип форми
    if (form.id === 'wf-form-free' || form.classList.contains('forma-free')) {
        formData.formType = 'trial';
    } else {
        formData.formType = 'general';
    }
    
    return formData;
}

// Спрощене форматування повідомлення
function formatMessage(formData) {
    const currentTime = new Date().toLocaleString('uk-UA');
    let message = `🔔 Нова заявка з сайту\n`;
    message += `📅 Дата: ${currentTime}\n\n`;
    
    if (formData.name) message += `👤 Ім'я: ${formData.name}\n`;
    if (formData.phone) message += `📱 Телефон: ${formData.phone}\n`;
    if (formData.field) message += `📝 Інфо: ${formData.field}\n`;
    message += `\n🌐 Сторінка: ${window.location.href}`;
    
    return message;
}

// КРИТИЧНО: Використовуємо sendBeacon для Safari
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
        
        // Для Safari/iOS використовуємо sendBeacon
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
            console.log('📤 Sent via sendBeacon');
        } else {
            // Fallback - використовуємо fetch але НЕ чекаємо відповіді
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                keepalive: true // Важливо для Safari!
            }).catch(() => {});
            console.log('📤 Sent via fetch');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ГОЛОВНЕ: Мінімальне втручання в роботу форми
function setupForm(form) {
    // НЕ використовуємо preventDefault!
    // Просто слухаємо подію і відправляємо дані паралельно
    
    form.addEventListener('submit', function(e) {
        // НЕ блокуємо форму!
        // Просто збираємо дані і відправляємо в фоні
        
        try {
            const formData = collectFormData(form);
            
            // Перевірка чи є дані
            if (!formData.name && !formData.phone) {
                return; // Нічого не робимо, даємо Webflow працювати
            }
            
            // Визначаємо thread
            const threadId = (form.id === 'wf-form-free' || form.classList.contains('forma-free')) 
                ? TELEGRAM_CONFIG.threads.trial_lesson 
                : TELEGRAM_CONFIG.threads.general;
            
            // Відправляємо через beacon (не блокує форму!)
            sendToTelegramBeacon(formData, threadId);
            
        } catch (error) {
            console.error('Error in form handler:', error);
            // При помилці - нічого не робимо, даємо формі працювати
        }
        
        // Форма продовжує працювати нормально!
    }, false); // Використовуємо bubble phase
}

// ВАРІАНТ 2: Якщо перший не працює, спробуйте цей
function setupFormAlternative(form) {
    // Використовуємо Webflow події якщо вони доступні
    if (window.Webflow && window.$) {
        const $form = $(form);
        
        // Слухаємо успішну відправку Webflow форми
        $form.on('submit', function() {
            try {
                const formData = collectFormData(form);
                if (formData.name || formData.phone) {
                    const threadId = (form.id === 'wf-form-free') 
                        ? TELEGRAM_CONFIG.threads.trial_lesson 
                        : TELEGRAM_CONFIG.threads.general;
                    sendToTelegramBeacon(formData, threadId);
                }
            } catch (error) {
                console.error('Error:', error);
            }
        });
        
        console.log('✅ Form setup via jQuery');
    }
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Telegram Form Sender Init (Safari-optimized)');
    
    // Чекаємо на Webflow
    if (window.Webflow) {
        window.Webflow.push(function() {
            console.log('📦 Webflow ready');
            initForms();
        });
    } else {
        // Якщо Webflow не знайдено, ініціалізуємо одразу
        setTimeout(initForms, 100);
    }
});

function initForms() {
    const forms = document.querySelectorAll('form');
    console.log(`📋 Found ${forms.length} forms`);
    
    forms.forEach((form, index) => {
        console.log(`Setting up form ${index}: ${form.id || 'no-id'}`);
        
        // Використовуємо простий метод
        setupForm(form);
        
        // Якщо є jQuery - додаємо альтернативний метод
        if (window.$) {
            setupFormAlternative(form);
        }
    });
    
    // Додатковий хак для Safari на iOS
    if (isIOS && isSafari) {
        console.log('🔧 iOS Safari detected - applying additional fixes');
        
        forms.forEach(form => {
            // Додаємо прихований iframe для Safari
            const iframe = document.createElement('iframe');
            iframe.name = 'hidden_iframe_' + Math.random();
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            
            // Встановлюємо target на форму (допомагає з редіректом в Safari)
            if (!form.target) {
                form.target = iframe.name;
                
                // Після відправки форми - робимо редірект вручну
                iframe.onload = function() {
                    const redirectUrl = form.getAttribute('data-redirect') || 
                                      form.getAttribute('redirect');
                    if (redirectUrl) {
                        console.log('Manual redirect to:', redirectUrl);
                        window.location.href = redirectUrl;
                    }
                };
            }
        });
    }
}

// Простий debug helper
window.FormDebug = {
    check: function() {
        document.querySelectorAll('form').forEach((form, i) => {
            console.log(`Form ${i}:`, {
                id: form.id,
                action: form.action,
                redirect: form.getAttribute('data-redirect'),
                target: form.target
            });
        });
    },
    
    testBeacon: function() {
        if (navigator.sendBeacon) {
            console.log('✅ sendBeacon supported');
            const testData = { test: true };
            const blob = new Blob([JSON.stringify(testData)], { type: 'application/json' });
            const result = navigator.sendBeacon('/test', blob);
            console.log('Test beacon sent:', result);
        } else {
            console.log('❌ sendBeacon NOT supported');
        }
    }
};

console.log('💡 Run FormDebug.check() to see all forms');
console.log('💡 Run FormDebug.testBeacon() to test beacon API');
