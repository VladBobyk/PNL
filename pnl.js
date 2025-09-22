
        // Конфігурація Telegram бота
        const TELEGRAM_CONFIG = {
            botToken: '7972648152:AAEkEvxuTv4wrX0LEQkNhzSr7RRdRilA4-I', // Замініть на токен вашого бота
            chatId: '-1002699091130'      // Замініть на ID вашої групи
        };

        // Функція для показу повідомлень
        function showNotification(message, type = 'success') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            document.body.appendChild(notification);
            
            // Показати повідомлення
            setTimeout(() => notification.classList.add('show'), 100);
            
            // Приховати через 3 секунди
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => document.body.removeChild(notification), 300);
            }, 3000);
        }

        // Функція для відправки повідомлення в Telegram
        async function sendToTelegram(formData) {
            try {
                const message = formatMessage(formData);
                
                const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CONFIG.chatId,
                        text: message,
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
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
            
            // Список можливих UTM параметрів
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
            message += `📅 <b>Дата:</b> ${currentTime}\n\n`;
            
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
            
            // Додаємо UTM мітки якщо вони є
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
            
            // Збираємо дані з полів
            const nameField = form.querySelector('#name');
            const phoneField = form.querySelector('#Phone-2');
            const fieldField = form.querySelector('#field');
            
            if (nameField && nameField.value.trim()) {
                formData.name = nameField.value.trim();
            }
            
            if (phoneField && phoneField.value.trim()) {
                formData.phone = phoneField.value.trim();
            }
            
            if (fieldField && fieldField.value.trim()) {
                formData.field = fieldField.value.trim();
            }
            
            return formData;
        }

        // Функція для валідації форми
        function validateForm(formData) {
            // Спрощена валідація - перевіряємо тільки основні поля
            // Webflow сам валідує обов'язкові поля
            if (!formData.name && !formData.phone) {
                return false; // Немає даних для відправки
            }
            
            return true;
        }

        // Основна функція обробки форми
        async function handleFormSubmit(event) {
            const form = event.target.closest('form');
            if (!form) return;
            
            const submitButton = form.querySelector('#button_form');
            
            try {
                // Збираємо дані
                const formData = collectFormData(form);
                
                // Валідуємо дані
                if (!validateForm(formData)) {
                    event.preventDefault(); // Зупиняємо тільки якщо валідація не пройшла
                    return;
                }
                
                // Відправляємо в Telegram паралельно з Webflow
                sendToTelegram(formData).then(success => {
                    if (success) {
                        console.log('✅ Повідомлення відправлено в Telegram');
                    } else {
                        console.log('❌ Помилка відправки в Telegram');
                    }
                });
                
                // Дозволяємо Webflow обробити форму як зазвичай
                // event.preventDefault() не викликаємо, тому Webflow продовжить роботу
                
            } catch (error) {
                console.error('Помилка обробки форми:', error);
                // Навіть при помилці дозволяємо Webflow працювати
            }
        }

        // Ініціалізація після завантаження сторінки
        document.addEventListener('DOMContentLoaded', function() {
            // Перевіряємо конфігурацію
            if (TELEGRAM_CONFIG.botToken === 'YOUR_BOT_TOKEN' || TELEGRAM_CONFIG.chatId === 'YOUR_CHAT_ID') {
                console.warn('⚠️ Увага: Потрібно налаштувати TELEGRAM_CONFIG з вашими даними!');
            }
            
            // Знаходимо всі форми з id="wf-form"
            const forms = document.querySelectorAll('form[id="wf-form"]');
            
            forms.forEach(form => {
                // Додаємо обробник на submit форми (не на кнопку)
                // Це дозволить Webflow працювати як зазвичай
                form.addEventListener('submit', handleFormSubmit);
                
                console.log('✅ Форма налаштована для відправки в Telegram (+ Webflow)');
            });
        });

        // Додаткові функції для налаштування
        window.TelegramFormSender = {
            // Функція для зміни конфігурації
            setConfig: function(botToken, chatId) {
                TELEGRAM_CONFIG.botToken = botToken;
                TELEGRAM_CONFIG.chatId = chatId;
            },
            
            // Функція для тестування
            test: function() {
                const testData = {
                    name: 'Тест',
                    phone: '+380123456789',
                    field: 'Тестове повідомлення'
                };
                
                sendToTelegram(testData).then(success => {
                    if (success) {
                        console.log('✅ Тест пройшов успішно!');
                    } else {
                        console.log('❌ Помилка тестування. Перевірте конфігурацію.');
                    }
                });
            }
        };
    
