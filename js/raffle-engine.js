﻿/**
 * RAFFLE ENGINE MODULE
 * Відповідає за логіку розіграшу, анімації та налаштування
 */

// ===== НАЛАШТУВАННЯ АНІМАЦІЇ =====

// Налаштування анімації за замовчуванням
const DEFAULT_ANIMATION_SETTINGS = {
    spinDuration: 3, // секунди - тривалість обертання барабанів
    spinSpeed: 100, // мілісекунди - швидкість зміни елементів барабанів
    slowDownDuration: 2, // секунди - тривалість ефекту уповільнення барабанів
    slowDownEffect: true, // увімкнути/вимкнути ефект уповільнення
    popupRotations: 1, // кількість обертів popup при появі (можна дробові: 0.5, 1.5, тощо)
    popupAnimationSpeed: 0.8, // швидкість наближення popup (0.1-1.0, де 0.1 - дуже повільно, 1.0 - різко)
    resultHighlightDuration: 1, // секунди - тривалість підсвічування
    popupCountdownTime: 10, // секунди
    enableSound: false
};

let animationSettings = { ...DEFAULT_ANIMATION_SETTINGS };

// ===== ЛОГІКА РОЗІГРАШУ =====

function startRaffle() {
    // Отримуємо дані з DataManager
    const participants = window.DataManager.participants;
    const prizes = window.DataManager.prizes;

    if (participants.length === 0) {
        alert('Додайте учасників для розіграшу!');
        return;
    }

    if (prizes.length === 0) {
        alert('Додайте призи для розіграшу!');
        return;
    }

    // Ініціалізація розіграшу
    window.DataManager.availableParticipants = [...participants];
    const availablePrizes = [];
    
    // Розгорнути призи за кількістю
    prizes.forEach(prize => {
        for (let i = 0; i < prize.count; i++) {
            availablePrizes.push(prize.name);
        }
    });
    window.DataManager.availablePrizes = availablePrizes;

    window.DataManager.results = [];
    window.DataManager.currentRound = 0;
    window.DataManager.isRaffleActive = true;

    const startBtn = document.getElementById('start-raffle-btn');
    if (startBtn) startBtn.style.display = 'none';
    
    // Оновити статистику
    if (typeof updateRaffleStats === 'function') updateRaffleStats();
    window.DataManager.markAsChanged(); // Зберегти початок розіграшу
    nextRound();
}

function nextRound() {
    const availableParticipants = window.DataManager.availableParticipants;
    const availablePrizes = window.DataManager.availablePrizes;

    if (availableParticipants.length === 0 || availablePrizes.length === 0) {
        endRaffle();
        return;
    }

    window.DataManager.currentRound++;
    
    // Оновити статистику
    if (typeof updateRaffleStats === 'function') updateRaffleStats();

    // Анімація барабанів
    const participantDrum = document.getElementById('participant-drum');
    const prizeDrum = document.getElementById('prize-drum');

    if (participantDrum) participantDrum.classList.add('spinning');
    if (prizeDrum) prizeDrum.classList.add('spinning');

    // Показати випадкові імена під час обертання
    const spinInterval = setInterval(() => {
        if (participantDrum && availableParticipants.length > 0) {
            setDrumText(participantDrum, availableParticipants[Math.floor(Math.random() * availableParticipants.length)].name);
        }
        if (prizeDrum && availablePrizes.length > 0) {
            setDrumText(prizeDrum, availablePrizes[Math.floor(Math.random() * availablePrizes.length)]);
        }
    }, animationSettings.spinSpeed);

    // Зупинити через налаштований час і показати результат
    setTimeout(() => {
        // Спочатку зупинити зміну тексту
        clearInterval(spinInterval);
        
        // Вибір переможця з урахуванням ваги
        const winner = selectWeightedRandom(availableParticipants);
        const prizeIndex = Math.floor(Math.random() * availablePrizes.length);
        const wonPrize = availablePrizes[prizeIndex];

        // Встановити фінальний результат
        setDrumText(participantDrum, winner.name);
        setDrumText(prizeDrum, wonPrize);

        // Додати ефект уповільнення замість миттєвої зупинки (якщо увімкнено)
        if (animationSettings.slowDownEffect) {
            if (participantDrum) {
                participantDrum.classList.remove('spinning');
                participantDrum.classList.add('slowing-down');
                // Динамічно встановити тривалість анімації уповільнення
                participantDrum.style.animationDuration = `${animationSettings.slowDownDuration}s`;
            }
            if (prizeDrum) {
                prizeDrum.classList.remove('spinning');
                prizeDrum.classList.add('slowing-down');
                // Динамічно встановити тривалість анімації уповільнення
                prizeDrum.style.animationDuration = `${animationSettings.slowDownDuration}s`;
            }
        } else {
            // Миттєва зупинка без ефекту уповільнення
            if (participantDrum) participantDrum.classList.remove('spinning');
            if (prizeDrum) prizeDrum.classList.remove('spinning');
        }

        // Прибрати клас уповільнення та додати підсвічування після завершення анімації
        const highlightDelay = animationSettings.slowDownEffect ? animationSettings.slowDownDuration * 1000 : 0;
        setTimeout(() => {
            if (participantDrum) {
                participantDrum.classList.remove('slowing-down');
                participantDrum.classList.add('result-highlight');
                // Додати підсвічування до всього барабану
                const participantDrumContainer = participantDrum.closest('.drum');
                if (participantDrumContainer) participantDrumContainer.classList.add('result-highlight');
                // Скинути стиль тривалості анімації
                participantDrum.style.animationDuration = '';
            }
            if (prizeDrum) {
                prizeDrum.classList.remove('slowing-down');
                prizeDrum.classList.add('result-highlight');
                // Додати підсвічування до всього барабану
                const prizeDrumContainer = prizeDrum.closest('.drum');
                if (prizeDrumContainer) prizeDrumContainer.classList.add('result-highlight');
                // Скинути стиль тривалості анімації
                prizeDrum.style.animationDuration = '';
            }
            
            // Прибрати підсвічування через налаштований час
            setTimeout(() => {
                if (participantDrum) {
                    participantDrum.classList.remove('result-highlight');
                    // Прибрати підсвічування з барабану
                    const participantDrumContainer = participantDrum.closest('.drum');
                    if (participantDrumContainer) participantDrumContainer.classList.remove('result-highlight');
                }
                if (prizeDrum) {
                    prizeDrum.classList.remove('result-highlight');
                    // Прибрати підсвічування з барабану
                    const prizeDrumContainer = prizeDrum.closest('.drum');
                    if (prizeDrumContainer) prizeDrumContainer.classList.remove('result-highlight');
                }

                // Показати popup з привітанням переможця після завершення всіх анімацій
                showWinnerPopup(winner.name, winner.division, wonPrize);

            }, animationSettings.resultHighlightDuration * 1000);
            
        }, highlightDelay); // Тривалість анімації уповільнення або 0

        // Зберегти результат
        const results = window.DataManager.results;
        results.push({
            round: window.DataManager.currentRound,
            winner: winner.name,
            winnerDivision: winner.division,
            prize: wonPrize
        });
        window.DataManager.results = results;

        // Видалити переможця та приз
        const newAvailableParticipants = availableParticipants.filter(p => p.name !== winner.name);
        availablePrizes.splice(prizeIndex, 1);
        
        window.DataManager.availableParticipants = newAvailableParticipants;
        window.DataManager.availablePrizes = availablePrizes;

        // Оновити статистику
        if (typeof updateRaffleStats === 'function') updateRaffleStats();
        window.DataManager.markAsChanged(); // Зберегти поточний стан

    }, animationSettings.spinDuration * 1000);

    const nextBtn = document.getElementById('next-round-btn');
    if (nextBtn) nextBtn.style.display = 'none';
}

function selectWeightedRandom(participants) {
    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const participant of participants) {
        random -= participant.weight;
        if (random <= 0) {
            return participant;
        }
    }

    return participants[participants.length - 1];
}

function endRaffle() {
    window.DataManager.isRaffleActive = false;
    
    const nextBtn = document.getElementById('next-round-btn');
    const startBtn = document.getElementById('start-raffle-btn');
    const newBtn = document.getElementById('new-raffle-btn');
    
    if (nextBtn) nextBtn.style.display = 'none';
    if (startBtn) startBtn.style.display = 'none';
    if (newBtn) newBtn.style.display = 'inline-block';
    
    window.DataManager.markAsChanged(); // Зберегти завершений стан
    window.DataManager.saveToStorage(); // Автоматично зберегти результати
}

function startNewRaffle() {
    if (confirm('Розпочати новий розіграш? Попередні результати будуть збережені.')) {
        // Скидаємо тільки поточний стан розіграшу, але зберігаємо результати
        window.DataManager.currentRound = 0;
        window.DataManager.isRaffleActive = false;
        window.DataManager.availableParticipants = [];
        window.DataManager.availablePrizes = [];
        
        const participantDrum = document.getElementById('participant-drum');
        const prizeDrum = document.getElementById('prize-drum');
        const startBtn = document.getElementById('start-raffle-btn');
        const nextBtn = document.getElementById('next-round-btn');
        const newBtn = document.getElementById('new-raffle-btn');
        
        setDrumText(participantDrum, 'Готовий до розіграшу!');
        setDrumText(prizeDrum, 'Готовий до розіграшу!');
        if (startBtn) startBtn.style.display = 'inline-block';
        if (nextBtn) nextBtn.style.display = 'none';
        if (newBtn) newBtn.style.display = 'none';
        
        // Оновити статистику
        if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
        window.DataManager.markAsChanged(); // Зберегти новий стан
    }
}

function resetRaffle() {
    if (!confirm('Ви впевнені, що хочете скинути розіграш? Всі поточні результати будуть втрачені.')) {
        return;
    }

    // createBackup() видалено - автозбереження достатньо для захисту даних

    window.DataManager.currentRound = 0;
    window.DataManager.isRaffleActive = false;
    window.DataManager.availableParticipants = [];
    window.DataManager.availablePrizes = [];
    window.DataManager.results = [];
    
    const participantDrum = document.getElementById('participant-drum');
    const prizeDrum = document.getElementById('prize-drum');
    const startBtn = document.getElementById('start-raffle-btn');
    const nextBtn = document.getElementById('next-round-btn');
    const newBtn = document.getElementById('new-raffle-btn');
    
    setDrumText(participantDrum, 'Готовий до розіграшу!');
    setDrumText(prizeDrum, 'Готовий до розіграшу!');
    if (startBtn) startBtn.style.display = 'inline-block';
    if (nextBtn) nextBtn.style.display = 'none';
    if (newBtn) newBtn.style.display = 'none';
    
    // Оновити статистику та результати
    if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
    if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
    window.DataManager.markAsChanged();
}

// ===== POPUP ПЕРЕМОЖЦЯ =====

let popupCountdownInterval = null;
let popupAutoCloseTimeout = null;

function showWinnerPopup(winnerName, winnerDivision, prizeName) {
    const popup = document.getElementById('winner-popup');
    if (!popup) return;
    
    const popupContent = popup.querySelector('.popup-content');
    const winnerNameEl = document.getElementById('winner-name');
    const winnerDivisionEl = document.getElementById('winner-division');
    const winnerPrizeEl = document.getElementById('winner-prize');
    const countdownTimer = document.getElementById('countdown-timer');
    
    // Оновити інформацію про переможця
    if (winnerNameEl) winnerNameEl.textContent = winnerName;
    if (winnerDivisionEl) winnerDivisionEl.textContent = winnerDivision || 'Не вказано';
    if (winnerPrizeEl) winnerPrizeEl.textContent = prizeName;
    
    // Показати popup
    popup.style.display = 'flex';
    
    // Застосувати динамічну анімацію на основі налаштувань
    if (popupContent) {
        const rotations = animationSettings.popupRotations;
        const animationSpeed = animationSettings.popupAnimationSpeed;
        const duration = 0.5 + (1.5 / animationSpeed); // Від 0.5 до 2 секунд залежно від швидкості
        
        // Розрахувати початкову та кінцеву позицію
        const totalRotationDegrees = rotations * 360;
        const startRotation = -(totalRotationDegrees % 360);
        
        // Очистити попередні анімації
        popupContent.style.animation = 'none';
        popupContent.style.transform = `scale(0.1) rotate(${startRotation}deg)`;
        popupContent.style.opacity = '0';
        
        // Додати нову просту анімацію
        setTimeout(() => {
            // Створити простіші keyframes тільки з початком і кінцем
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                @keyframes smoothPopupAppear {
                    0% {
                        transform: scale(0.1) rotate(${startRotation}deg);
                        opacity: 0;
                    }
                    100% {
                        transform: scale(1) rotate(0deg);
                        opacity: 1;
                    }
                }
            `;
            
            // Видалити попередні стилі та додати нові
            const oldStyle = document.getElementById('dynamic-popup-style');
            if (oldStyle) oldStyle.remove();
            
            styleSheet.id = 'dynamic-popup-style';
            document.head.appendChild(styleSheet);
            
            // Застосувати анімацію
            const easingFunction = animationSpeed > 0.5 ? 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'ease-out';
            popupContent.style.animation = `smoothPopupAppear ${duration}s ${easingFunction} forwards`;
            
            // Очистити анімацію після завершення
            setTimeout(() => {
                popupContent.style.animation = 'none';
                popupContent.style.transform = 'scale(1) rotate(0deg)';
                popupContent.style.opacity = '1';
            }, duration * 1000 + 50);
        }, 50);
    }
    
    // Запустити countdown таймер
    if (countdownTimer) {
        let timeLeft = animationSettings.popupCountdownTime;
        countdownTimer.textContent = timeLeft;
        
        popupCountdownInterval = setInterval(() => {
            timeLeft--;
            countdownTimer.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(popupCountdownInterval);
            }
        }, 1000);
    }
    
    // Автоматично сховати через налаштований час
    popupAutoCloseTimeout = setTimeout(() => {
        hideWinnerPopup();
    }, animationSettings.popupCountdownTime * 1000);

    // Показати кнопку наступного раунду або завершити розіграш
    const availableParticipants = window.DataManager.availableParticipants;
    const availablePrizes = window.DataManager.availablePrizes;
    const nextBtn = document.getElementById('next-round-btn');
    
    if (availableParticipants.length > 0 && availablePrizes.length > 0) {
        if (nextBtn) nextBtn.style.display = 'inline-block';
    } else {
        // Якщо немає більше учасників або призів, завершити розіграш
        setTimeout(() => {
            endRaffle();
        }, 2000); // Дати час користувачеві побачити popup
    }
}

function hideWinnerPopup() {
    const popup = document.getElementById('winner-popup');
    if (!popup) return;
    
    // Очистити всі таймери
    if (popupCountdownInterval) {
        clearInterval(popupCountdownInterval);
        popupCountdownInterval = null;
    }
    
    if (popupAutoCloseTimeout) {
        clearTimeout(popupAutoCloseTimeout);
        popupAutoCloseTimeout = null;
    }
    
    // Сховати popup
    popup.style.display = 'none';
}

// ===== НАЛАШТУВАННЯ АНІМАЦІЇ =====

function showAnimationSettings() {
    // Приховати всі сторінки
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    // Показати сторінку налаштувань
    const settingsPage = document.getElementById('animation-settings-page');
    if (settingsPage) settingsPage.classList.add('active');
    
    // Завантажити поточні налаштування
    loadAnimationSettingsToForm();
}

function hideAnimationSettings() {
    const settingsPage = document.getElementById('animation-settings-page');
    if (settingsPage) settingsPage.classList.remove('active');
    
    // Повернутися на сторінку даних
    if (typeof showPage === 'function') showPage('data');
}

function loadAnimationSettingsToForm() {
    const spinDuration = document.getElementById('spin-duration');
    const spinSpeed = document.getElementById('spin-speed');
    const slowDownDuration = document.getElementById('slow-down-duration');
    const slowDownEffect = document.getElementById('slow-down-effect');
    const popupRotations = document.getElementById('popup-rotations');
    const popupAnimationSpeed = document.getElementById('popup-animation-speed');
    const resultHighlightDuration = document.getElementById('result-highlight-duration');
    const popupCountdownTime = document.getElementById('popup-countdown-time');
    const enableSound = document.getElementById('enable-sound');
    
    if (spinDuration) spinDuration.value = animationSettings.spinDuration;
    if (spinSpeed) spinSpeed.value = animationSettings.spinSpeed;
    if (slowDownDuration) slowDownDuration.value = animationSettings.slowDownDuration;
    if (slowDownEffect) slowDownEffect.checked = animationSettings.slowDownEffect;
    if (popupRotations) popupRotations.value = animationSettings.popupRotations;
    if (popupAnimationSpeed) popupAnimationSpeed.value = animationSettings.popupAnimationSpeed;
    if (resultHighlightDuration) resultHighlightDuration.value = animationSettings.resultHighlightDuration;
    if (popupCountdownTime) popupCountdownTime.value = animationSettings.popupCountdownTime;
    if (enableSound) enableSound.checked = animationSettings.enableSound;
}

function saveAnimationSettings() {
    const spinDuration = document.getElementById('spin-duration');
    const spinSpeed = document.getElementById('spin-speed');
    const slowDownDuration = document.getElementById('slow-down-duration');
    const slowDownEffect = document.getElementById('slow-down-effect');
    const popupRotations = document.getElementById('popup-rotations');
    const popupAnimationSpeed = document.getElementById('popup-animation-speed');
    const resultHighlightDuration = document.getElementById('result-highlight-duration');
    const popupCountdownTime = document.getElementById('popup-countdown-time');
    const enableSound = document.getElementById('enable-sound');
    
    animationSettings = {
        spinDuration: parseFloat(spinDuration?.value) || DEFAULT_ANIMATION_SETTINGS.spinDuration,
        spinSpeed: parseInt(spinSpeed?.value) || DEFAULT_ANIMATION_SETTINGS.spinSpeed,
        slowDownDuration: parseFloat(slowDownDuration?.value) || DEFAULT_ANIMATION_SETTINGS.slowDownDuration,
        slowDownEffect: slowDownEffect?.checked !== false, // За замовчуванням true
        popupRotations: parseFloat(popupRotations?.value) || DEFAULT_ANIMATION_SETTINGS.popupRotations,
        popupAnimationSpeed: parseFloat(popupAnimationSpeed?.value) || DEFAULT_ANIMATION_SETTINGS.popupAnimationSpeed,
        resultHighlightDuration: parseFloat(resultHighlightDuration?.value) || DEFAULT_ANIMATION_SETTINGS.resultHighlightDuration,
        popupCountdownTime: parseInt(popupCountdownTime?.value) || DEFAULT_ANIMATION_SETTINGS.popupCountdownTime,
        enableSound: enableSound?.checked || false
    };
    
    // Зберегти в localStorage
    localStorage.setItem(window.DataManager.STORAGE_KEYS.ANIMATION_SETTINGS, JSON.stringify(animationSettings));
    
    alert('Налаштування анімації збережено!');
}

function resetAnimationSettings() {
    if (confirm('Скинути всі налаштування анімації на значення за замовчуванням?')) {
        animationSettings = { ...DEFAULT_ANIMATION_SETTINGS };
        localStorage.setItem(window.DataManager.STORAGE_KEYS.ANIMATION_SETTINGS, JSON.stringify(animationSettings));
        loadAnimationSettingsToForm();
        alert('Налаштування скинуто на значення за замовчуванням!');
    }
}

function loadAnimationSettings() {
    try {
        const savedSettings = localStorage.getItem(window.DataManager.STORAGE_KEYS.ANIMATION_SETTINGS);
        if (savedSettings) {
            animationSettings = { ...DEFAULT_ANIMATION_SETTINGS, ...JSON.parse(savedSettings) };
        } else {
            animationSettings = { ...DEFAULT_ANIMATION_SETTINGS };
        }
    } catch (error) {
        console.error('Помилка завантаження налаштувань анімації:', error);
        animationSettings = { ...DEFAULT_ANIMATION_SETTINGS };
    }
}

// ===== ІНІЦІАЛІЗАЦІЯ POPUP ОБРОБНИКІВ =====

function initializePopupHandlers() {
    const popup = document.getElementById('winner-popup');
    if (popup) {
        const overlay = popup.querySelector('.popup-overlay');
        
        if (overlay) {
            overlay.addEventListener('click', hideWinnerPopup);
        }
        
        // Закрити popup при натисканні Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && popup.style.display === 'flex') {
                hideWinnerPopup();
            }
        });
    }
}

// ===== ДОПОМІЖНІ ФУНКЦІЇ =====

// Функція для встановлення тексту з title атрибутом (для показу повного тексту при наведенні)
function setDrumText(drumElement, text) {
    if (drumElement) {
        drumElement.textContent = text;
        drumElement.title = text; // Показує повний текст при наведенні
    }
}

// ===== ЕКСПОРТ ФУНКЦІЙ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПУ =====

// Зробити функції доступними глобально
window.RaffleEngine = {
    // Змінні
    get animationSettings() { return animationSettings; },
    set animationSettings(value) { animationSettings = value; },
    DEFAULT_ANIMATION_SETTINGS,
    
    // Функції розіграшу
    startRaffle,
    nextRound,
    selectWeightedRandom,
    endRaffle,
    startNewRaffle,
    resetRaffle,
    
    // Popup функції
    showWinnerPopup,
    hideWinnerPopup,
    
    // Налаштування анімації
    showAnimationSettings,
    hideAnimationSettings,
    loadAnimationSettingsToForm,
    saveAnimationSettings,
    resetAnimationSettings,
    loadAnimationSettings,
    
    // Ініціалізація
    initializePopupHandlers
};

// Глобальні функції видалено - використовуються через обгортки в main.js або RaffleEngine модуль