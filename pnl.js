        // Конфігурація Telegram бота
        const TELEGRAM_CONFIG = {
            botToken: '7972648152:AAEkEvxuTv4wrX0LEQkNhzSr7RRdRilA4-I',
            chatId: '-1002699091130',
            // Thread ID для різних гілок
            threads: {
                'trial_lesson': 1809,  // "Заявки на пробний урок"
                'general': null        // null = основний чат без гілки
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
            // Перевіряємо ID форми
            const formId = form.id;
            console.log('Form ID:', formId); // Для налагодження
            
            // Перевіряємо форму пробного уроку
            if (formId === 'wf-form-free') {
                console.log('Визначено форму пробного уроку (wf-form-free)');
                return TELEGRAM_CONFIG.threads.trial_lesson;
            }
            
            // Також перевіряємо наявність класу або data-атрибуту
            if (form.classList.contains('forma-free') || 
                form.classList.contains('wf-form-free') ||
                form.dataset.formType === 'free' ||
                form.dataset.formType === 'trial') {
                console.log('Визначено форму пробного уроку за класом або data-атрибутом');
                return TELEGRAM_CONFIG.threads.trial_lesson;
            }
            
            // Всі інші форми йдуть в загальні заявки
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

                // Додаємо message_thread_id тільки якщо він визначений і не null
                if (threadId !== null && threadId !== undefined) {
                    payload.message_thread_id = threadId;
                    console.log('Відправляємо з message_thread_id:', threadId);
                } else {
                    console.log('Відправляємо без message_thread_id (основний чат)');
                }
                
                console.log('Payload для відправки:', payload); // Для налагодження
                
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
            
            // Додаємо тип форми
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
            
            // Збираємо дані з полів (підтримка різних селекторів)
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

            // Визначаємо тип форми
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
            
            console.log('Зібрані дані форми:', formData); // Для налагодження
            return formData;
        }

        // Функція для валідації форми
        function validateForm(formData) {
            if (!formData.name && !formData.phone) {
                return false;
            }
            return true;
        }

        // Основна функція обробки форми
        async function handleFormSubmit(event) {
            const form = event.target;
            if (!form) return;
            
            // Зупиняємо стандартну відправку форми тимчасово
            event.preventDefault();
            
            // Флаг для визначення чи була форма вже оброблена
            if (form.dataset.telegramSent === 'true') {
                // Якщо вже відправлено в Telegram, дозволяємо стандартну відправку
                form.dataset.telegramSent = 'false';
                return true;
            }
            
            // Блокуємо кнопку відправки
            const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.classList.add('loading');
            }
            
            try {
                // Збираємо дані
                const formData = collectFormData(form);
                
                // Валідуємо дані
                if (!validateForm(formData)) {
                    showNotification('Будь ласка, заповніть обов\'язкові поля', 'error');
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.classList.remove('loading');
                    }
                    return false;
                }

                // Визначаємо Thread ID
                const threadId = getThreadId(form);
                
                // Логування для налагодження
                const threadName = threadId === TELEGRAM_CONFIG.threads.trial_lesson ? 
                    'Заявки на пробний урок' : 'Основний чат';
                console.log(`📤 Відправляємо форму "${form.id}" в гілку: ${threadName} (Thread ID: ${threadId})`);
                
                // Відправляємо в Telegram
                const success = await sendToTelegram(formData, threadId);
                
                if (success) {
                    console.log(`✅ Повідомлення відправлено в гілку: ${threadName}`);
                    showNotification(`Заявка успішно відправлена!`, 'success');
                    
                    // Встановлюємо флаг що форма відправлена в Telegram
                    form.dataset.telegramSent = 'true';
                    
                    // Розблоковуємо кнопку
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.classList.remove('loading');
                    }
                    
                    // Відправляємо форму стандартним способом
                    setTimeout(() => {
                        // Програмно відправляємо форму
                        form.submit();
                    }, 100);
                    
                } else {
                    console.log('❌ Помилка відправки в Telegram, але продовжуємо стандартну відправку');
                    showNotification('Помилка відправки в Telegram, але форма буде відправлена', 'error');
                    
                    // Розблоковуємо кнопку
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.classList.remove('loading');
                    }
                    
                    // Все одно відправляємо форму стандартним способом
                    setTimeout(() => {
                        form.dataset.telegramSent = 'true';
                        form.submit();
                    }, 100);
                }
                
            } catch (error) {
                console.error('Помилка обробки форми:', error);
                showNotification('Виникла помилка, але форма буде відправлена', 'error');
                
                // Розблоковуємо кнопку
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.classList.remove('loading');
                }
                
                // Відправляємо форму навіть якщо виникла помилка
                setTimeout(() => {
                    form.dataset.telegramSent = 'true';
                    form.submit();
                }, 100);
            }
        }

        // Ініціалізація після завантаження сторінки
        document.addEventListener('DOMContentLoaded', function() {
            console.log('🚀 Ініціалізація Telegram Form Sender');
            console.log('Конфігурація:', TELEGRAM_CONFIG);
            
            // Знаходимо всі форми
            const forms = document.querySelectorAll('form');
            console.log(`Знайдено форм: ${forms.length}`);
            
            forms.forEach(form => {
                // Видаляємо старі обробники якщо є
                form.removeEventListener('submit', handleFormSubmit);
                // Додаємо новий обробник
                form.addEventListener('submit', handleFormSubmit);
                
                const threadId = getThreadId(form);
                const threadName = threadId === TELEGRAM_CONFIG.threads.trial_lesson ? 
                    'Заявки на пробний урок' : 'Основний чат';
                
                console.log(`✅ Форма "${form.id || 'без ID'}" налаштована для відправки в: ${threadName}`);
                
                // Особлива перевірка для форми пробного уроку
                if (form.id === 'wf-form-free') {
                    console.log('⭐ Знайдено форму пробного уроку: wf-form-free');
                }
            });
        });

        // API для тестування
        window.TelegramFormSender = {
            // Тест відправки в гілку пробного уроку
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
            
            // Тест відправки в основний чат
            testGeneralForm: async function() {
                console.log('🧪 Тестування відправки в основний чат');
                const testData = {
                    name: 'Тест Загальна Заявка',
                    phone: '+380123456789',
                    field: 'Тест загальної форми',
                    formType: 'general'
                };
                
                const success = await sendToTelegram(testData, TELEGRAM_CONFIG.threads.general);
                if (success) {
                    console.log('✅ Тест загальної заявки пройшов успішно!');
                    showNotification('Тест загальної заявки успішний!', 'success');
                } else {
                    console.log('❌ Помилка тестування загальної заявки');
                    showNotification('Помилка тесту загальної заявки', 'error');
                }
            },
            
            // Показати поточну конфігурацію
            showConfig: function() {
                console.log('📋 Поточна конфігурація:', TELEGRAM_CONFIG);
            },
            
            // Перевірити thread ID
            checkThreadId: async function(threadId) {
                console.log(`🔍 Перевірка thread ID: ${threadId}`);
                const testData = {
                    name: `Тест Thread ${threadId}`,
                    phone: '+380123456789',
                    formType: 'test'
                };
                
                const success = await sendToTelegram(testData, threadId);
                if (success) {
                    console.log(`✅ Thread ID ${threadId} працює!`);
                } else {
                    console.log(`❌ Thread ID ${threadId} не працює`);
                }
            },
            
            // Показати всі форми на сторінці
            showForms: function() {
                const forms = document.querySelectorAll('form');
                console.log(`📝 Знайдено ${forms.length} форм на сторінці:`);
                forms.forEach((form, index) => {
                    const threadId = getThreadId(form);
                    const threadName = threadId === TELEGRAM_CONFIG.threads.trial_lesson ? 
                        'Заявки на пробний урок' : 'Основний чат';
                    console.log(`${index + 1}. ID: "${form.id || 'немає'}", Класи: "${form.className || 'немає'}", Відправка в: ${threadName}`);
                });
            }
        };


