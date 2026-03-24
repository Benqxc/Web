# Nobame Bio Site v2.0

Персональный сайт-визитка с системой отслеживания посетителей и улучшенной безопасностью.

## 🚀 Быстрый старт

### Развёртывание на Railway

1. Создайте новый проект на [Railway](https://railway.app)
2. Подключите GitHub репозиторий
3. Настройте переменные окружения (см. ниже)
4. Railway автоматически обнаружит `package.json` и развернёт приложение

### Переменные окружения

Скопируйте `.env.example` в `.env` и настройте:

```bash
# PostgreSQL (для Railway)
DATABASE_URL=postgresql://user:password@host:port/database

# Безопасность
ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting
LOGIN_RATE_LIMIT=5
LOGIN_RATE_WINDOW_MS=900000

# Сервер
PORT=3000
NODE_ENV=production
```

## 📁 Структура проекта

```
├── __tests__/           # Тесты
│   └── api.test.js
├── api/                 # Vercel Serverless функции
│   ├── track.js
│   ├── login.js
│   ├── stats.js
│   ├── visitors.js
│   ├── export.js
│   └── change-password.js
├── public/              # Статические файлы
│   ├── index.html
│   ├── admin.html
│   ├── styles.css
│   ├── admin-styles.css
│   ├── script.js
│   ├── admin-script.js
│   ├── sw.js           # Service Worker
│   └── manifest.json   # PWA манифест
├── server.js           # Express сервер (Railway)
├── package.json
├── jest.config.js      # Конфигурация Jest
└── .env.example        # Шаблон переменных окружения
```

## 🔒 Безопасность (v2.0)

### Новые функции безопасности:

- **Пароль из переменной окружения** - `ADMIN_PASSWORD` вместо хардкода
- **Rate Limiting** - 5 попыток входа за 15 минут (настраивается)
- **CORS с белым списком** - только разрешённые домены
- **Helmet.js** - защищённые HTTP заголовки
- **Хеширование bcrypt** - надёжное хранение паролей

### Рекомендуемые действия:

1. Установите сложный `ADMIN_PASSWORD`
2. Настройте `ALLOWED_ORIGINS` для вашего домена
3. Используйте HTTPS в продакшене

## 📊 Функции

### Для посетителей
- Анимированный фон с градиентом
- 3D эффект наклона карточки
- Анимация печатания имени
- Фоновая музыка (по кнопке)
- Эффект частиц при клике
- **Тёмная/светлая тема с переключателем**
- **Индикатор загрузки (лоадер)**
- **Раздел "Обо мне" с навыками**
- **GitHub API интеграция (кэширование 1 час)**
- **PWA поддержка (офлайн режим)**
- **Система уведомлений (Toast)**

### Для администратора
- Просмотр всех посетителей
- IP адреса, страны, города
- Информация об устройстве (браузер, ОС)
- Время на сайте
- Топ стран, браузеров, ОС
- **Интерактивные графики Chart.js**
- **График посещений по дням**
- **Анимированные счетчики**
- Экспорт в CSV/JSON
- Смена пароля
- Очистка истории

## 🎵 Музыка

Добавьте файл `music.mp3` в папку `public/` для фоновой музыки.

## 📱 PWA

Сайт поддерживает Progressive Web App:
- Работает офлайн
- Может быть установлен на домашний экран
- Быстрая загрузка благодаря кэшированию

## 🔧 Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Запуск в продакшен режиме
npm start

# Запуск тестов
npm test

# Тесты с покрытием
npm run test:coverage
```

Откройте http://localhost:3000

## 🧪 Тестирование

```bash
# Запустить все тесты
npm test

# Запустить с watch режимом
npm run test:watch

# Получить покрытие кода
npm run test:coverage
```

## 📝 API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | /api/track | Трекинг посетителя |
| POST | /api/login | Вход администратора |
| GET | /api/stats | Статистика |
| GET | /api/visitors | Все посетители |
| GET | /api/export/csv | Экспорт CSV |
| GET | /api/export/json | Экспорт JSON |
| DELETE | /api/visitors | Очистить данные |
| POST | /api/change-password | Смена пароля |

## 🛡️ Защита данных

### PostgreSQL (Railway)
Данные хранятся в PostgreSQL базе данных.

### Redis (Vercel)
Для Vercel используется Redis через `@vercel/kv`.

## 🎨 Темы

### Тёмная тема (по умолчанию)
- Градиентный фон с анимацией
- Фиолетово-синяя палитра
- Glassmorphism эффекты

### Светлая тема
- Светлый градиент
- Улучшенная читаемость
- Сохранение в localStorage

## 🔄 Что нового в v2.0

### Безопасность
- ✅ Переменные окружения для пароля
- ✅ Улучшенный rate limiting
- ✅ CORS с белым списком

### Производительность
- ✅ Кэширование GitHub API (1 час)
- ✅ Skeleton loader для репозиториев
- ✅ Оптимизированные запросы

### Дизайн
- ✅ Новый градиентный фон
- ✅ Анимированные карточки
- ✅ Улучшенные hover эффекты
- ✅ Плавные переходы

### Тестирование
- ✅ Jest тесты для API
- ✅ Конфигурация покрытия

## 📄 Лицензия

MIT License - см. файл [LICENSE](LICENSE)

## 👤 Автор

**Nobame**
- GitHub: [@Benqxc](https://github.com/Benqxc)
- Telegram: [@benqxc](https://t.me/benqxc)
