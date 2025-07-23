/**
 * MAIN MODULE
 * Головний файл для ініціалізації та координації між модулями
 */

// ===== ІНІЦІАЛІЗАЦІЯ ДОДАТКУ =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('Ініціалізація додатку розіграшу призів...');
    
    // Перевірити наявність необхідних модулів
    if (!window.DataManager) {
        console.error('DataManager не завантажено!');
        return;
    }
    
    if (!window.RaffleEngine) {
        console.error('RaffleEngine не завантажено!');
        return;
    }
    
    if (!window.UIController) {
        console.error('UIController не завантажено!');
        return;
    }
    
    if (!window.FairnessTests) {
        console.error('FairnessTests не завантажено!');
        return;
    }
    
    try {
        // 1. Завантажити дані з localStorage
        console.log('Завантаження збережених даних...');
        window.DataManager.loadFromStorage();
        
        // 2. Завантажити налаштування анімації
        console.log('Завантаження налаштувань анімації...');
        window.RaffleEngine.loadAnimationSettings();
        
        // 2.1. Ініціалізувати автозбереження налаштувань анімації
        console.log('Ініціалізація автозбереження налаштувань...');
        // Затримка для завантаження DOM елементів
        setTimeout(() => {
            if (window.RaffleEngine.setupAnimationSettingsAutoSave && !window._animationAutoSaveInitialized) {
                window.RaffleEngine.setupAnimationSettingsAutoSave();
                window._animationAutoSaveInitialized = true;
            }
        }, 100);
        
        // 3. Ініціалізувати UI
        console.log('Ініціалізація інтерфейсу...');
        window.UIController.initializeUI();
        
        // 4. Оновити відображення
        console.log('Оновлення відображення...');
        window.UIController.updateDisplay();
        window.UIController.updateResultsDisplay();
        
        // 5. Ініціалізувати статистику для сторінки розіграшу
        if (window.DataManager.isRaffleActive) {
            // Якщо розіграш активний, показуємо поточний стан
            setTimeout(() => window.UIController.updateRaffleStats(), 50);
        } else {
            // Якщо розіграш не активний, показуємо загальну статистику
            setTimeout(() => window.UIController.initializeRaffleStats(), 50);
        }
        
        // 6. Налаштувати автозбереження
        console.log('Налаштування автозбереження...');
        window.DataManager.setupAutoSave();
        window.DataManager.setupBeforeUnload();
        
        console.log('Ініціалізація завершена успішно!');
        
        // Показати повідомлення про готовність
        setTimeout(() => {
            const lastSave = localStorage.getItem(window.DataManager.STORAGE_KEYS.LAST_SAVE);
            if (lastSave && window.DataManager.isRaffleActive) {
                window.DataManager.showAutoSaveStatus('restored');
            }
        }, 1000);
        
    } catch (error) {
        console.error('Помилка під час ініціалізації:', error);
        alert('Виникла помилка під час ініціалізації додатку. Перезавантажте сторінку.');
    }
});

// ===== ГЛОБАЛЬНІ ОБРОБНИКИ ПОДІЙ =====

// Обробник для завантаження Excel файлів видалено - використовуємо тільки версію з DataManager

// ===== ФУНКЦІЇ ДЛЯ ЗВОРОТНОЇ СУМІСНОСТІ =====

// Ці функції потрібні для того, щоб HTML onclick атрибути продовжували працювати
// до поки ми не оновимо всі HTML файли для використання нових обробників

// Функції управління даними
window.addParticipant = function() {
    if (window.DataManager) window.DataManager.addParticipant();
};

window.removeParticipant = function(index) {
    if (window.DataManager) window.DataManager.removeParticipant(index);
};

window.addPrize = function() {
    if (window.DataManager) window.DataManager.addPrize();
};

window.removePrize = function(index) {
    if (window.DataManager) window.DataManager.removePrize(index);
};

// Функції розіграшу
window.startRaffle = function() {
    if (window.RaffleEngine) window.RaffleEngine.startRaffle();
};

window.nextRound = function() {
    if (window.RaffleEngine) window.RaffleEngine.nextRound();
};

window.endRaffle = function() {
    if (window.RaffleEngine) window.RaffleEngine.endRaffle();
};

window.startNewRaffle = function() {
    if (window.RaffleEngine) window.RaffleEngine.startNewRaffle();
};

window.resetRaffle = function() {
    if (window.RaffleEngine) window.RaffleEngine.resetRaffle();
};

// Функції UI
window.showPage = function(pageId) {
    if (window.UIController) window.UIController.showPage(pageId);
};

window.updateDisplay = function() {
    if (window.UIController) window.UIController.updateDisplay();
};

window.updateResultsDisplay = function() {
    if (window.UIController) window.UIController.updateResultsDisplay();
};

window.initializeRaffleStats = function() {
    if (window.UIController) window.UIController.initializeRaffleStats();
};

window.updateRaffleStats = function() {
    if (window.UIController) window.UIController.updateRaffleStats();
};

window.showError = function(elementId, message) {
    if (window.UIController) window.UIController.showError(elementId, message);
};

// Функції Excel
window.loadExcelData = function() {
    if (window.DataManager) window.DataManager.loadExcelData();
};

window.exportToExcel = function() {
    if (window.DataManager) window.DataManager.exportToExcel();
};

window.exportResultsToExcel = function() {
    if (window.DataManager) window.DataManager.exportResultsToExcel();
};

// Функції збереження
window.clearStoredData = function() {
    if (window.DataManager) window.DataManager.clearStoredData();
};

// clearResults видалено - використовується напряму з DataManager

// Функції popup
window.showWinnerPopup = function(winnerName, winnerDivision, prizeName) {
    if (window.RaffleEngine) window.RaffleEngine.showWinnerPopup(winnerName, winnerDivision, prizeName);
};

window.hideWinnerPopup = function() {
    if (window.RaffleEngine) window.RaffleEngine.hideWinnerPopup();
};

// Функції налаштувань анімації видалено - використовуються напряму з RaffleEngine

// Функції тестів чесності
window.runSequenceTest = function() {
    if (window.FairnessTests) window.FairnessTests.runSequenceTest();
};

window.clearTestResults = function() {
    if (window.FairnessTests) window.FairnessTests.clearTestResults();
};

window.runDistributionTest = function() {
    if (window.FairnessTests) window.FairnessTests.runDistributionTest();
};

window.clearDistributionTestResults = function() {
    if (window.FairnessTests) window.FairnessTests.clearDistributionTestResults();
};

// Функції налаштувань
window.showSettings = function() {
    if (window.UIController) window.UIController.showSettings();
};

window.hideSettings = function() {
    if (window.UIController) window.UIController.hideSettings();
};

window.showSettingsTab = function(tabId) {
    if (window.UIController) window.UIController.showSettingsTab(tabId);
};

// Функції анімації (для зворотної сумісності)
window.showAnimationSettings = function() {
    if (window.RaffleEngine) window.RaffleEngine.showAnimationSettings();
};

window.hideAnimationSettings = function() {
    if (window.RaffleEngine) window.RaffleEngine.hideAnimationSettings();
};

window.saveAnimationSettings = function() {
    if (window.RaffleEngine) window.RaffleEngine.saveAnimationSettings();
};

window.resetAnimationSettings = function() {
    if (window.RaffleEngine) window.RaffleEngine.resetAnimationSettings();
};

// ===== УТИЛІТАРНІ ФУНКЦІЇ =====

// Функція для перевірки стану додатку
window.checkAppStatus = function() {
    console.log('=== СТАТУС ДОДАТКУ ===');
    console.log('DataManager:', !!window.DataManager);
    console.log('RaffleEngine:', !!window.RaffleEngine);
    console.log('UIController:', !!window.UIController);
    
    if (window.DataManager) {
        console.log('Учасників:', window.DataManager.participants.length);
        console.log('Призів:', window.DataManager.prizes.length);
        console.log('Результатів:', window.DataManager.results.length);
        console.log('Розіграш активний:', window.DataManager.isRaffleActive);
        console.log('Поточний раунд:', window.DataManager.currentRound);
    }
    
    console.log('===================');
};

// Функція для експорту статусу (для debugging)
window.exportAppState = function() {
    if (!window.DataManager) {
        console.error('DataManager не доступний');
        return null;
    }
    
    return {
        participants: window.DataManager.participants,
        prizes: window.DataManager.prizes,
        results: window.DataManager.results,
        currentRound: window.DataManager.currentRound,
        isRaffleActive: window.DataManager.isRaffleActive,
        availableParticipants: window.DataManager.availableParticipants,
        availablePrizes: window.DataManager.availablePrizes,
        timestamp: new Date().toISOString()
    };
};

// Функція для імпорту стану (для debugging)
window.importAppState = function(state) {
    if (!window.DataManager) {
        console.error('DataManager не доступний');
        return false;
    }
    
    try {
        window.DataManager.participants = state.participants || [];
        window.DataManager.prizes = state.prizes || [];
        window.DataManager.results = state.results || [];
        window.DataManager.currentRound = state.currentRound || 0;
        window.DataManager.isRaffleActive = state.isRaffleActive || false;
        window.DataManager.availableParticipants = state.availableParticipants || [];
        window.DataManager.availablePrizes = state.availablePrizes || [];
        
        // Оновити відображення
        if (window.UIController) {
            window.UIController.updateDisplay();
            window.UIController.updateResultsDisplay();
            
            if (window.DataManager.isRaffleActive) {
                window.UIController.updateRaffleStats();
            } else {
                window.UIController.initializeRaffleStats();
            }
        }
        
        // Зберегти
        window.DataManager.saveToStorage();
        
        console.log('Стан додатку імпортовано успішно');
        return true;
    } catch (error) {
        console.error('Помилка при імпорті стану:', error);
        return false;
    }
};

// ===== ОБРОБКА ПОМИЛОК =====

// Глобальний обробник помилок
window.addEventListener('error', function(e) {
    console.error('Глобальна помилка:', e.error);
    
    // Не показувати alert для кожної помилки, щоб не спамити користувача
    // Тільки логуємо в консоль
});

// Обробник для необроблених promise відхилень
window.addEventListener('unhandledrejection', function(e) {
    console.error('Необроблене відхилення Promise:', e.reason);
    e.preventDefault(); // Не показувати в консолі браузера
});

// ===== ЕКСПОРТ ГОЛОВНОГО ОБ'ЄКТУ =====

window.RafflePrizeApp = {
    // Модулі
    DataManager: () => window.DataManager,
    RaffleEngine: () => window.RaffleEngine,
    UIController: () => window.UIController,
    FairnessTests: () => window.FairnessTests,
    
    // Утилітарні функції
    checkStatus: window.checkAppStatus,
    exportState: window.exportAppState,
    importState: window.importAppState,
    
    // Версія
    version: '2.2-modular',
    
    // Інформація про модулі
    info: function() {
        console.log('🎉 Додаток розіграшу призів');
        console.log('Версія:', this.version);
        console.log('Модулі завантажено:');
        console.log('  - DataManager:', !!window.DataManager);
        console.log('  - RaffleEngine:', !!window.RaffleEngine);
        console.log('  - UIController:', !!window.UIController);
        console.log('  - FairnessTests:', !!window.FairnessTests);
        console.log('Для перевірки статусу викличте: RafflePrizeApp.checkStatus()');
    }
};

// Показати інформацію про додаток при завантаженні (тільки в режимі розробки)
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    setTimeout(() => {
        window.RafflePrizeApp.info();
    }, 2000);
}