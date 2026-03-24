// Конфигурация
let authToken = localStorage.getItem('admin_token');

// Проверка авторизации
function checkAuth() {
    if (authToken) {
        showAdminPanel();
    } else {
        showLogin();
    }
}

// Показать страницу входа
function showLogin() {
    document.getElementById('loginCard').style.display = 'block';
    document.getElementById('adminPanel').style.display = 'none';
}

// Показать админ-панель
function showAdminPanel() {
    document.getElementById('loginCard').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadStats();
    loadVisitors();
}

// Обработка формы входа
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('passwordInput').value;
    const errorElement = document.getElementById('loginError');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('admin_token', authToken);
            errorElement.textContent = '';
            document.getElementById('passwordInput').value = '';
            showAdminPanel();
        } else {
            errorElement.textContent = data.error || 'Неверный пароль';
        }
    } catch (error) {
        errorElement.textContent = 'Ошибка подключения';
    }
});

// Выход
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    authToken = null;
    showLogin();
});

// Настройки
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeModal = document.getElementById('closeModal');

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('active');
    });
}

if (closeModal) {
    closeModal.addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });
}

settingsModal?.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
});

// Смена пароля
document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }
    
    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Пароль изменён');
            settingsModal.classList.remove('active');
            document.getElementById('changePasswordForm').reset();
        } else {
            alert(data.error || 'Ошибка смены пароля');
        }
    } catch (error) {
        alert('Ошибка подключения');
    }
});

// Загрузка статистики
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('totalVisitors').textContent = stats.totalVisitors || 0;
        document.getElementById('uniqueIPs').textContent = stats.uniqueIPs || 0;
        document.getElementById('todayVisitors').textContent = stats.todayVisitors || 0;
        document.getElementById('weekVisitors').textContent = stats.weekVisitors || 0;
        document.getElementById('avgDuration').textContent = (stats.avgSessionDuration || 0) + 'с';
        
        if (stats.lastVisit) {
            const lastDate = new Date(stats.lastVisit);
            document.getElementById('lastVisit').textContent = lastDate.toLocaleDateString('ru-RU');
        } else {
            document.getElementById('lastVisit').textContent = '-';
        }
        
        // Топ стран
        const countriesEl = document.getElementById('topCountries');
        if (countriesEl && stats.topCountries) {
            countriesEl.innerHTML = stats.topCountries.map(c => `
                <div class="chart-item">
                    <span>${c.country}</span>
                    <span class="count">${c.count}</span>
                </div>
            `).join('');
        }
        
        // Топ браузеров
        const browsersEl = document.getElementById('topBrowsers');
        if (browsersEl && stats.topBrowsers) {
            browsersEl.innerHTML = stats.topBrowsers.map(b => `
                <div class="chart-item">
                    <span>${b.browser}</span>
                    <span class="count">${b.count}</span>
                </div>
            `).join('');
        }
        
        // Топ ОС
        const osEl = document.getElementById('topOS');
        if (osEl && stats.topOS) {
            osEl.innerHTML = stats.topOS.map(o => `
                <div class="chart-item">
                    <span>${o.os}</span>
                    <span class="count">${o.count}</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Stats load error:', error);
    }
}

// Загрузка посетителей
async function loadVisitors() {
    try {
        const response = await fetch('/api/visitors');
        const visitors = await response.json();
        
        const tableBody = document.getElementById('visitorsTableBody');
        
        if (visitors.length === 0) {
            tableBody.innerHTML = '<div class="empty-message">Нет данных о посетителях</div>';
            return;
        }
        
        tableBody.innerHTML = '';
        
        visitors.forEach((visitor, index) => {
            const row = document.createElement('div');
            row.className = 'table-row';
            
            const date = new Date(visitor.created_at);
            const formattedDate = date.toLocaleDateString('ru-RU');
            const formattedTime = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            
            row.innerHTML = `
                <span data-label="№">${visitors.length - index}</span>
                <span class="ip-cell" data-label="IP адрес">${visitor.ip}</span>
                <span class="country-cell" data-label="Страна">${visitor.country}</span>
                <span data-label="Браузер">${visitor.browser}</span>
                <span data-label="ОС">${visitor.os}</span>
                <span class="duration-cell" data-label="Время">${visitor.session_duration}с</span>
                <span class="date-cell" data-label="Дата">${formattedDate} ${formattedTime}</span>
            `;
            
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Visitors load error:', error);
    }
}

// Очистка истории
document.getElementById('clearBtn')?.addEventListener('click', async () => {
    if (confirm('Вы уверены, что хотите очистить всю историю посещений?')) {
        try {
            const response = await fetch('/api/visitors', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadStats();
                loadVisitors();
            }
        } catch (error) {
            console.error('Clear error:', error);
        }
    }
});

// Экспорт CSV
document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    window.open('/api/export/csv', '_blank');
});

// Экспорт JSON
document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
    window.open('/api/export/json', '_blank');
});

// Автообновление каждые 30 секунд
setInterval(() => {
    if (authToken) {
        loadStats();
        loadVisitors();
    }
}, 30000);

// Инициализация
checkAuth();
