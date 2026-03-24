// ============================================
// Уведомления (Toast)
// ============================================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// Конфигурация
// ============================================
let authToken = localStorage.getItem('admin_token');

// Графики Chart.js
let countryChart = null;
let browserChart = null;
let osChart = null;
let visitsChart = null;

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
    // Инициализация графиков с задержкой
    setTimeout(initCharts, 100);
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
    // Уничтожение графиков
    destroyCharts();
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
        
        // Обновление графиков
        updateCharts(stats);
    } catch (error) {
        console.error('Stats load error:', error);
        showToast('Не удалось загрузить статистику', 'error');
    }
}

// ============================================
// Графики Chart.js
// ============================================
function initCharts() {
    // График стран
    const countryCtx = document.getElementById('countryChart');
    if (countryCtx) {
        countryChart = new Chart(countryCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(96, 165, 250, 0.8)',
                        'rgba(52, 211, 153, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(248, 113, 113, 0.8)',
                        'rgba(167, 139, 250, 0.8)',
                        'rgba(251, 146, 170, 0.8)'
                    ],
                    borderColor: 'rgba(20, 20, 20, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#cccccc',
                            font: { size: 11 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Посетители по странам',
                        color: '#ffffff',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        });
    }
    
    // График браузеров
    const browserCtx = document.getElementById('browserChart');
    if (browserCtx) {
        browserChart = new Chart(browserCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Посетители',
                    data: [],
                    backgroundColor: 'rgba(96, 165, 250, 0.6)',
                    borderColor: 'rgba(96, 165, 250, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Посетители по браузерам',
                        color: '#ffffff',
                        font: { size: 14, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#888888' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        ticks: { color: '#888888', font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
    
    // График ОС
    const osCtx = document.getElementById('osChart');
    if (osCtx) {
        osChart = new Chart(osCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(96, 165, 250, 0.8)',
                        'rgba(52, 211, 153, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(248, 113, 113, 0.8)',
                        'rgba(167, 139, 250, 0.8)'
                    ],
                    borderColor: 'rgba(20, 20, 20, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#cccccc',
                            font: { size: 11 }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Посетители по ОС',
                        color: '#ffffff',
                        font: { size: 14, weight: 'bold' }
                    }
                }
            }
        });
    }
    
    // График посещений по дням
    const visitsCtx = document.getElementById('visitsChart');
    if (visitsCtx) {
        visitsChart = new Chart(visitsCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Посещения',
                    data: [],
                    borderColor: 'rgba(96, 165, 250, 1)',
                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(96, 165, 250, 1)',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Посещения по дням (последние 7 дней)',
                        color: '#ffffff',
                        font: { size: 14, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: '#888888' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        ticks: { color: '#888888', font: { size: 10 } },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

function updateCharts(stats) {
    // Обновление графика стран
    if (countryChart && stats.topCountries) {
        countryChart.data.labels = stats.topCountries.map(c => c.country);
        countryChart.data.datasets[0].data = stats.topCountries.map(c => c.count);
        countryChart.update();
    }
    
    // Обновление графика браузеров
    if (browserChart && stats.topBrowsers) {
        browserChart.data.labels = stats.topBrowsers.map(b => b.browser);
        browserChart.data.datasets[0].data = stats.topBrowsers.map(b => b.count);
        browserChart.update();
    }
    
    // Обновление графика ОС
    if (osChart && stats.topOS) {
        osChart.data.labels = stats.topOS.map(o => o.os);
        osChart.data.datasets[0].data = stats.topOS.map(o => o.count);
        osChart.update();
    }
    
    // Обновление графика посещений по дням
    if (visitsChart && stats.visitsByDay) {
        visitsChart.data.labels = stats.visitsByDay.map(d => d.day);
        visitsChart.data.datasets[0].data = stats.visitsByDay.map(d => d.count);
        visitsChart.update();
    }
}

function destroyCharts() {
    if (countryChart) {
        countryChart.destroy();
        countryChart = null;
    }
    if (browserChart) {
        browserChart.destroy();
        browserChart = null;
    }
    if (osChart) {
        osChart.destroy();
        osChart = null;
    }
    if (visitsChart) {
        visitsChart.destroy();
        visitsChart = null;
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
                showToast('История очищена', 'success');
            }
        } catch (error) {
            console.error('Clear error:', error);
            showToast('Ошибка очистки', 'error');
        }
    }
});

// Экспорт CSV
document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    window.open('/api/export/csv', '_blank');
    showToast('Экспорт CSV начат', 'info', 2000);
});

// Экспорт JSON
document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
    window.open('/api/export/json', '_blank');
    showToast('Экспорт JSON начат', 'info', 2000);
});

// Автообновление каждые 30 секунд
setInterval(() => {
    if (authToken) {
        loadStats();
        loadVisitors();
    }
}, 30000);

// Обработка закрытия модального окна смены пароля
document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('Пароли не совпадают', 'error');
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
            showToast('Пароль изменён', 'success');
            document.getElementById('settingsModal').classList.remove('active');
            document.getElementById('changePasswordForm').reset();
        } else {
            showToast(data.error || 'Ошибка смены пароля', 'error');
        }
    } catch (error) {
        showToast('Ошибка подключения', 'error');
    }
});

// Инициализация
checkAuth();
