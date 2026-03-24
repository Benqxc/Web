// Генерация уникального ID сессии
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
    const elements = document.querySelectorAll('.avatar, .username, .description, .badges, .social-links');
    
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.5s ease';
        
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });
});
