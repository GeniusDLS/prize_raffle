/**
 * MAIN MODULE
 * Головний файл для ініціалізації та координації між модулями
 */

// ===== ІНІЦІАЛІЗАЦІЯ ДОДАТКУ =====

document.addEventListener('DOMContentLoaded', function() {
    window.Logger.log('[Main]', 'Ініціалізація додатку розіграшу призів...');
    
    // Перевірити наявність необхідних модулів
    if (!window.DataManager) {
        window.Logger.error('[Main]', 'DataManager не завантажено!');
        return;
    }
    
    if (!window.RaffleEngine) {
        window.Logger.error('[Main]', 'RaffleEngine не завантажено!');
        return;
    }
    
    if (!window.UIController) {
        window.Logger.error('[Main]', 'UIController не завантажено!');
        return;
    }
    
    if (!window.FairnessTests) {
        window.Logger.error('[Main]', 'FairnessTests не завантажено!');
        return;
    }
    
    try {
        // 0. Завантажити збережену тему (до рендеру UI, щоб уникнути моргання)
        window.Logger.log('[Main]', 'Завантаження теми...');
        window.UIController.loadSavedTheme();

        // 1. Завантажити дані з localStorage
        window.Logger.log('[Main]', 'Завантаження збережених даних...');
        window.DataManager.loadFromStorage();
        
        // 2. Завантажити налаштування анімації
        window.Logger.log('[Main]', 'Завантаження налаштувань анімації...');
        window.RaffleEngine.loadAnimationSettings();
        
        // 3. Ініціалізувати UI
        window.Logger.log('[Main]', 'Ініціалізація інтерфейсу...');
        window.UIController.initializeUI();
        
        // 2.1. Ініціалізувати автозбереження налаштувань анімації (після initializeUI, щоб DOM елементи налаштувань були готові)
        window.Logger.log('[Main]', 'Ініціалізація автозбереження налаштувань...');
        window.RaffleEngine.setupAnimationSettingsAutoSave();
        
        // 4. Оновити відображення
        window.Logger.log('[Main]', 'Оновлення відображення...');
        window.UIController.updateDisplay();
        window.UIController.updateResultsDisplay();
        
        // 5. Ініціалізувати статистику для сторінки розіграшу
        if (window.DataManager.isRaffleActive) {
            window.UIController.updateRaffleStats();
        } else {
            window.UIController.initializeRaffleStats();
        }
        
        // 6. Налаштувати автозбереження
        window.Logger.log('[Main]', 'Налаштування автозбереження...');
        window.DataManager.setupAutoSave();
        window.DataManager.setupBeforeUnload();
        
        window.Logger.log('[Main]', 'Ініціалізація завершена успішно!');
        
        // Показати повідомлення про готовність
        setTimeout(() => {
            const lastSave = localStorage.getItem(window.DataManager.STORAGE_KEYS.LAST_SAVE);
            if (lastSave && window.DataManager.isRaffleActive) {
                window.DataManager.showAutoSaveStatus('restored');
            }
        }, 1000);
        
    } catch (error) {
        window.Logger.error('[Main]', 'Помилка під час ініціалізації:', error);
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

// Функції inline редагування
window.startEditParticipant = function(index) {
    if (window.UIController) window.UIController.startEditParticipant(index);
};

window.saveEditParticipant = function(index) {
    if (window.UIController) window.UIController.saveEditParticipant(index);
};

window.cancelEditParticipant = function() {
    if (window.UIController) window.UIController.cancelEditParticipant();
};

window.startEditPrize = function(index) {
    if (window.UIController) window.UIController.startEditPrize(index);
};

window.saveEditPrize = function(index) {
    if (window.UIController) window.UIController.saveEditPrize(index);
};

window.cancelEditPrize = function() {
    if (window.UIController) window.UIController.cancelEditPrize();
};

window.handleEditKeydown = function(event, type, index) {
    if (window.UIController) window.UIController.handleEditKeydown(event, type, index);
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
window.showWinnerPopup = function(winnerName, winnerPosition, winnerDivision, prizeName) {
    if (window.RaffleEngine) window.RaffleEngine.showWinnerPopup(winnerName, winnerPosition, winnerDivision, prizeName);
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

// Функції тестових даних (пресети)
window.showTestDataModal = function() {
    const modal = document.getElementById('test-preset-modal');
    if (!modal) return;

    // Сформувати картки пресетів динамічно
    const presets = window.DataManager.TEST_DATA_PRESETS;
    const container = document.getElementById('preset-cards-list');
    if (container && presets) {
        container.innerHTML = Object.entries(presets).map(([id, preset]) => {
            const totalPrizes = preset.prizes.reduce((s, p) => s + p.count, 0);
            return `<div class="preset-card" onclick="applyTestPreset('${id}')">
                <div class="preset-card-icon">${preset.label.split(' ')[0]}</div>
                <div class="preset-card-body">
                    <div class="preset-card-title">${escapeHtml(preset.label.replace(/^\S+\s/, ''))}</div>
                    <div class="preset-card-desc">${escapeHtml(preset.description)}</div>
                    <div class="preset-card-stats">
                        <span>👥 ${preset.participants.length} учасників</span>
                        <span>🎁 ${totalPrizes} призів</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    modal.style.display = 'flex';
};

window.closeTestDataModal = function() {
    const modal = document.getElementById('test-preset-modal');
    if (modal) modal.style.display = 'none';
};

window.hideTestDataModal = function(event) {
    // Закрити при кліку на оверлей (не на вміст модалі)
    if (event.target === document.getElementById('test-preset-modal')) {
        window.closeTestDataModal();
    }
};

window.applyTestPreset = function(presetId) {
    window.closeTestDataModal();
    if (window.DataManager) {
        window.DataManager.loadTestPreset(presetId);
        // Переключитися на вкладку учасників для показу результату
        if (typeof showDataTab === 'function') showDataTab('participants');
    }
};

// ===== УТИЛІТАРНІ ФУНКЦІЇ =====

// Функція для перевірки стану додатку
window.checkAppStatus = function() {
    window.Logger.log('[Main]', '=== СТАТУС ДОДАТКУ ===');
    window.Logger.log('[Main]', 'DataManager:', !!window.DataManager);
    window.Logger.log('[Main]', 'RaffleEngine:', !!window.RaffleEngine);
    window.Logger.log('[Main]', 'UIController:', !!window.UIController);
    
    if (window.DataManager) {
        window.Logger.log('[Main]', 'Учасників:', window.DataManager.participants.length);
        window.Logger.log('[Main]', 'Призів:', window.DataManager.prizes.length);
        window.Logger.log('[Main]', 'Результатів:', window.DataManager.results.length);
        window.Logger.log('[Main]', 'Розіграш активний:', window.DataManager.isRaffleActive);
        window.Logger.log('[Main]', 'Поточний раунд:', window.DataManager.currentRound);
    }
    
    window.Logger.log('[Main]', '===================');
};

// Функція для експорту статусу (для debugging)
window.exportAppState = function() {
    if (!window.DataManager) {
        window.Logger.error('[Main]', 'DataManager не доступний');
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
        window.Logger.error('[Main]', 'DataManager не доступний');
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
        
        window.Logger.log('[Main]', 'Стан додатку імпортовано успішно');
        return true;
    } catch (error) {
        window.Logger.error('[Main]', 'Помилка при імпорті стану:', error);
        return false;
    }
};

// ===== ОБРОБКА ПОМИЛОК =====

// Глобальний обробник помилок
window.addEventListener('error', function(e) {
    window.Logger.error('[Main]', 'Глобальна помилка:', e.error);
    
    // Не показувати alert для кожної помилки, щоб не спамити користувача
    // Тільки логуємо в консоль
});

// Обробник для необроблених promise відхилень
window.addEventListener('unhandledrejection', function(e) {
    window.Logger.error('[Main]', 'Необроблене відхилення Promise:', e.reason);
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
    version: 'v3.1.1',
    
    // Інформація про модулі
    info: function() {
        window.Logger.log('[Main]', '🎉 Додаток розіграшу призів');
        window.Logger.log('[Main]', 'Версія:', this.version);
        window.Logger.log('[Main]', 'Модулі завантажено:');
        window.Logger.log('[Main]', '  - DataManager:', !!window.DataManager);
        window.Logger.log('[Main]', '  - RaffleEngine:', !!window.RaffleEngine);
        window.Logger.log('[Main]', '  - UIController:', !!window.UIController);
        window.Logger.log('[Main]', '  - FairnessTests:', !!window.FairnessTests);
        window.Logger.log('[Main]', 'Для перевірки статусу викличте: RafflePrizeApp.checkStatus()');
    }
};

// Показати інформацію про додаток при завантаженні (тільки в режимі розробки)
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    setTimeout(() => {
        window.RafflePrizeApp.info();
    }, 2000);
}