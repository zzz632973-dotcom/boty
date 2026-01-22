// Инициализация Telegram Web App
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();
} else {
    // Режим разработки - создаем заглушку
    console.warn('Telegram Web App API недоступен. Режим разработки.');
    tg = {
        initData: '',
        expand: () => {},
        enableClosingConfirmation: () => {},
        showAlert: (msg) => alert(msg)
    };
}

let currentProfile = null;
let selectedTags = [];
let currentRating = 5.0;
let bonus = 0;

// Получение initData для авторизации
function getInitData() {
    return tg.initData || '';
}

// API функции
async function apiCall(endpoint, options = {}) {
    const initData = getInitData();
    
    const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': initData,
            ...options.headers
        }
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка запроса');
    }
    
    return response.json();
}

// Загрузка случайного профиля
async function loadRandomProfile() {
    try {
        const data = await apiCall('/random-profile');
        currentProfile = data.profile;
        displayProfile(currentProfile);
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        tg.showAlert('Не удалось загрузить профиль. Попробуйте еще раз.');
    }
}

// Отображение профиля
function displayProfile(profile) {
    document.getElementById('profilePhoto').src = profile.photoUrl;
    document.getElementById('profileName').textContent = profile.name;
    document.getElementById('averageRating').textContent = profile.averageRating || '0.0';
    
    // Сброс выбранных тегов
    selectedTags = [];
    document.querySelectorAll('.tag').forEach(tag => {
        tag.classList.remove('active');
    });
    
    // Сброс рейтинга
    currentRating = 5.0;
    document.getElementById('ratingSlider').value = 5;
    document.getElementById('ratingValue').textContent = '5.0';
}

// Оценка профиля
async function rateProfile() {
    if (!currentProfile) {
        tg.showAlert('Профиль не загружен');
        return;
    }
    
    try {
        const bonus = selectedTags.length * 0.5;
        const finalScore = Math.min(10, parseFloat(currentRating) + bonus);
        
        await apiCall('/rate', {
            method: 'POST',
            body: JSON.stringify({
                profileId: currentProfile._id,
                score: finalScore,
                tags: selectedTags,
                bonus: bonus
            })
        });
        
        tg.showAlert(`✅ Оценка ${finalScore.toFixed(1)} поставлена!`);
        
        // Загружаем следующий профиль
        setTimeout(() => {
            loadRandomProfile();
        }, 1000);
    } catch (error) {
        console.error('Ошибка оценки:', error);
        tg.showAlert('Не удалось поставить оценку. Попробуйте еще раз.');
    }
}

// Загрузка собственного профиля
async function loadMyProfile() {
    try {
        const data = await apiCall('/my-profile');
        currentProfile = data.profile;
        displayProfile(currentProfile);
        tg.showAlert(`Ваш рейтинг: ${data.profile.averageRating}\nВсего оценок: ${data.profile.totalRatings}`);
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        tg.showAlert('Профиль не найден. Создайте профиль через бота.');
    }
}

// Загрузка топ-5
async function loadTop5() {
    try {
        const data = await apiCall('/top-5');
        const modal = document.getElementById('top5Modal');
        const list = document.getElementById('top5List');
        
        if (data.topUsers.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #888;">Пока нет пользователей в топе</p>';
        } else {
            list.innerHTML = data.topUsers.map((user, index) => `
                <div class="top5-item">
                    <div style="font-size: 24px; font-weight: 700; color: #8a2be2;">${index + 1}</div>
                    <img src="${user.photoUrl}" alt="${user.name}">
                    <div class="top5-item-info">
                        <div class="top5-item-name">${user.name}</div>
                        <div class="top5-item-rating">⭐ ${user.averageRating}</div>
                        <div style="font-size: 12px; color: #888;">${user.totalRatings} оценок</div>
                    </div>
                </div>
            `).join('');
        }
        
        modal.classList.add('active');
    } catch (error) {
        console.error('Ошибка загрузки топа:', error);
        tg.showAlert('Не удалось загрузить топ-5');
    }
}

// Инициализация событий
document.addEventListener('DOMContentLoaded', () => {
    // Слайдер рейтинга
    const ratingSlider = document.getElementById('ratingSlider');
    const ratingValue = document.getElementById('ratingValue');
    
    ratingSlider.addEventListener('input', (e) => {
        currentRating = parseFloat(e.target.value);
        ratingValue.textContent = currentRating.toFixed(1);
    });
    
    // Кнопки быстрого выбора рейтинга
    document.querySelectorAll('.rating-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const rating = parseFloat(btn.dataset.rating);
            currentRating = rating;
            ratingSlider.value = rating;
            ratingValue.textContent = rating.toFixed(1);
            
            document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Теги
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const tagName = tag.dataset.tag;
            
            if (tag.classList.contains('active')) {
                tag.classList.remove('active');
                selectedTags = selectedTags.filter(t => t !== tagName);
            } else {
                tag.classList.add('active');
                selectedTags.push(tagName);
            }
        });
    });
    
    // Кнопки thumbs
    document.getElementById('thumbsUp').addEventListener('click', () => {
        currentRating = Math.min(10, currentRating + 1);
        ratingSlider.value = currentRating;
        ratingValue.textContent = currentRating.toFixed(1);
    });
    
    document.getElementById('thumbsDown').addEventListener('click', () => {
        currentRating = Math.max(1, currentRating - 1);
        ratingSlider.value = currentRating;
        ratingValue.textContent = currentRating.toFixed(1);
    });
    
    // Основные кнопки
    document.getElementById('rateBtn').addEventListener('click', rateProfile);
    document.getElementById('skipBtn').addEventListener('click', loadRandomProfile);
    document.getElementById('myProfileBtn').addEventListener('click', loadMyProfile);
    document.getElementById('top5Btn').addEventListener('click', loadTop5);
    
    // Premium кнопка
    document.getElementById('premiumBtn').addEventListener('click', () => {
        tg.showAlert('Premium функция в разработке. Скоро будет доступна подписка через Telegram Payments!');
    });
    
    // Закрытие модального окна
    document.getElementById('closeTop5').addEventListener('click', () => {
        document.getElementById('top5Modal').classList.remove('active');
    });
    
    // Закрытие по клику вне модального окна
    document.getElementById('top5Modal').addEventListener('click', (e) => {
        if (e.target.id === 'top5Modal') {
            e.target.classList.remove('active');
        }
    });
    
    // Загрузка первого профиля
    loadRandomProfile();
});

