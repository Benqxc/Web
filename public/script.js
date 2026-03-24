// ============================================
// Уведомления (Toast)
// ============================================
function showToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
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
// Индикатор загрузки
// ============================================
function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 500);
    }
}

// ============================================
// Переключатель темы
// ============================================
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const icon = themeToggle?.querySelector('i');
    
    // Получаем сохранённую тему
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(icon, savedTheme);
    
    themeToggle?.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(icon, newTheme);
        
        showToast(`Тема: ${newTheme === 'light' ? 'Светлая' : 'Тёмная'}`, 'info', 2000);
    });
}

function updateThemeIcon(icon, theme) {
    if (!icon) return;
    icon.className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
}

// ============================================
// Генерация уникального ID сессии
// ============================================
function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

// Получение или создание ID посетителя
function getSessionId() {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
}

// Отправка данных о посетителе
async function trackVisitor(sessionDuration = 0) {
    try {
        const sessionId = getSessionId();
        const screenResolution = `${screen.width}x${screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const language = navigator.language;
        
        await fetch('/api/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId,
                screenResolution,
                timezone,
                language,
                sessionDuration
            })
        });
    } catch (error) {
        console.error('Tracking error:', error);
    }
}

// Отслеживание времени на сайте
let sessionStartTime = Date.now();
let lastTrackTime = Date.now();

function trackSessionDuration() {
    const now = Date.now();
    const duration = Math.floor((now - sessionStartTime) / 1000);
    
    // Отправляем данные каждые 30 секунд
    if (now - lastTrackTime >= 30000) {
        trackVisitor(duration);
        lastTrackTime = now;
    }
}

// Отслеживание при закрытии страницы
window.addEventListener('beforeunload', () => {
    const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
    navigator.sendBeacon('/api/track', JSON.stringify({
        sessionId: getSessionId(),
        sessionDuration: duration
    }));
});

// Начало отслеживания
trackVisitor(0);
setInterval(trackSessionDuration, 30000);

// Анимация печатания для имени
const username = 'nobame';
const typingElement = document.querySelector('.typing-text');
let charIndex = 0;

function typeUsername() {
    if (charIndex < username.length) {
        typingElement.textContent += username.charAt(charIndex);
        charIndex++;
        setTimeout(typeUsername, 150);
    }
}

// Запуск анимации печатания
setTimeout(typeUsername, 500);

// Эффект параллакса для фона
document.addEventListener('mousemove', (e) => {
    const stars = document.querySelector('.stars');
    const stars2 = document.querySelector('.stars2');
    const stars3 = document.querySelector('.stars3');
    
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    stars.style.transform = `translate(-${x * 20}px, -${y * 20}px)`;
    stars2.style.transform = `translate(-${x * 30}px, -${y * 30}px)`;
    stars3.style.transform = `translate(-${x * 40}px, -${y * 40}px)`;
});

// Эффект наклона карточки
const card = document.querySelector('.profile-card');

card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
});

// Музыкальный контрол
const musicBtn = document.getElementById('musicToggle');
const backgroundMusic = document.getElementById('backgroundMusic');
let isPlaying = false;

if (musicBtn) {
    musicBtn.addEventListener('click', () => {
        if (isPlaying) {
            backgroundMusic.pause();
            musicBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            musicBtn.classList.remove('playing');
        } else {
            backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
            musicBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            musicBtn.classList.add('playing');
        }
        isPlaying = !isPlaying;
    });
}

// Добавляем частицы при клике
document.addEventListener('click', (e) => {
    createParticle(e.clientX, e.clientY);
});

function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.width = '5px';
    particle.style.height = '5px';
    particle.style.background = 'rgba(255, 255, 255, 0.5)';
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '1000';
    particle.style.transition = 'all 0.5s ease';
    
    document.body.appendChild(particle);
    
    const angle = Math.random() * Math.PI * 2;
    const velocity = 50 + Math.random() * 50;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    
    setTimeout(() => {
        particle.style.transform = `translate(${tx}px, ${ty}px)`;
        particle.style.opacity = '0';
    }, 10);
    
    setTimeout(() => {
        particle.remove();
    }, 500);
}

// Анимация появления элементов
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация темы
    initThemeToggle();
    
    const elements = document.querySelectorAll('.avatar, .username, .description, .view-counter, .badges, .social-links');
    
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.5s ease';
        
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });
    
    // Загрузка счетчика просмотров
    loadViewCount();
    
    // Загрузка GitHub репозиториев
    loadGitHubRepos();
    
    // Скрываем лоадер после загрузки
    window.addEventListener('load', hideLoader);
    
    // На случай если страница уже загружена
    if (document.readyState === 'complete') {
        hideLoader();
    }
});

// Загрузка счетчика просмотров
async function loadViewCount() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        const viewCountEl = document.getElementById('viewCount');
        if (viewCountEl) {
            animateCounter(viewCountEl, 0, stats.totalVisitors || 0, 2000);
        }
    } catch (error) {
        console.error('Failed to load view count:', error);
    }
}

// Анимация счетчика
function animateCounter(element, start, end, duration) {
    const startTime = Date.now();
    
    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease out quart)
        const ease = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(start + (end - start) * ease);
        
        element.textContent = current.toLocaleString('ru-RU');
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
        
        // ============================================
        // GitHub API - загрузка репозиториев
        // ============================================
        async function loadGitHubRepos() {
            const reposGrid = document.getElementById('reposGrid');
            if (!reposGrid) return;
            
            const username = 'Benqxc';
            
            try {
                const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`);
                
                if (!response.ok) {
                    throw new Error('GitHub API error');
                }
                
                const repos = await response.json();
                
                // Сортируем по количеству звёзд
                const sortedRepos = repos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3);
                
                reposGrid.innerHTML = sortedRepos.map(repo => `
                    <div class="repo-card">
                        <div class="repo-name">
                            <i class="fab fa-github"></i>
                            <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${repo.name}</a>
                        </div>
                        <p class="repo-description">${repo.description || 'Нет описания'}</p>
                        <div class="repo-stats">
                            <span><i class="fas fa-star"></i> ${repo.stargazers_count}</span>
                            <span><i class="fas fa-code-branch"></i> ${repo.forks_count}</span>
                            <span><i class="fas fa-circle"></i> ${repo.language || 'Unknown'}</span>
                        </div>
                    </div>
                `).join('');
                
            } catch (error) {
                console.error('Failed to load GitHub repos:', error);
                reposGrid.innerHTML = `
                    <div class="repo-card">
                        <p class="repo-description">Не удалось загрузить репозитории</p>
                    </div>
                `;
                showToast('Не удалось загрузить GitHub репозитории', 'error');
            }
        }
        
        // ============================================
        // Регистрация Service Worker (PWA)
        // ============================================
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('Service Worker registered:', registration.scope);
                    })
                    .catch(error => {
                        console.log('Service Worker registration failed:', error);
                    });
            });
        }
    }
    
    requestAnimationFrame(update);
}
