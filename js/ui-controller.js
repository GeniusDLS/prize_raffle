/**
 * UI CONTROLLER MODULE
 * Відповідає за інтерфейс користувача та відображення даних
 */

// ===== НАВІГАЦІЯ =====

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    const page = document.getElementById(pageId + '-page');
    if (page) page.classList.add('active');
    
    // Знайти відповідну вкладку і зробити її активною
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        if (tab.textContent.toLowerCase().includes(getPageName(pageId))) {
            tab.classList.add('active');
        }
    });
    
    // Зберегти активну вкладку
    saveActiveTab(pageId);
    
    if (pageId === 'raffle') {
        // Якщо розіграш не активний, показуємо загальну статистику
        if (!window.DataManager.isRaffleActive) {
            initializeRaffleStats();
        } else {
            updateRaffleStats();
        }
    } else if (pageId === 'results') {
        updateResultsDisplay();
    }
}

function getPageName(pageId) {
    const pageNames = {
        'data': 'дані',
        'raffle': 'розіграш',
        'results': 'результати'
    };
    return pageNames[pageId] || pageId;
}

// ===== СТАТИСТИКА =====

// Ініціалізація статистики для сторінки розіграшу
function initializeRaffleStats() {
    // Показуємо загальну кількість доступних учасників та призів
    const participants = window.DataManager.participants;
    const prizes = window.DataManager.prizes;
    const currentRound = window.DataManager.currentRound;
    
    const totalParticipants = participants.length;
    let totalPrizes = 0;
    prizes.forEach(prize => {
        totalPrizes += prize.count;
    });
    
    const totalParticipantsEl = document.getElementById('total-participants');
    const totalPrizesEl = document.getElementById('total-prizes');
    const currentRoundEl = document.getElementById('current-round');
    
    if (totalParticipantsEl) totalParticipantsEl.textContent = totalParticipants;
    if (totalPrizesEl) totalPrizesEl.textContent = totalPrizes;
    if (currentRoundEl) currentRoundEl.textContent = currentRound;
}

function updateRaffleStats() {
    const availableParticipants = window.DataManager.availableParticipants;
    const availablePrizes = window.DataManager.availablePrizes;
    const currentRound = window.DataManager.currentRound;
    
    const totalParticipantsEl = document.getElementById('total-participants');
    const totalPrizesEl = document.getElementById('total-prizes');
    const currentRoundEl = document.getElementById('current-round');
    
    if (totalParticipantsEl) totalParticipantsEl.textContent = availableParticipants.length;
    if (totalPrizesEl) totalPrizesEl.textContent = availablePrizes.length;
    if (currentRoundEl) currentRoundEl.textContent = currentRound;
}

// ===== ВІДОБРАЖЕННЯ ПОМИЛОК =====

function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// ===== ОНОВЛЕННЯ ВІДОБРАЖЕННЯ =====

function updateDisplay() {
    updateParticipantsList();
    updatePrizesList();
}

function updateParticipantsList() {
    const tbody = document.getElementById('participants-list');
    if (!tbody) return;
    
    const participants = window.DataManager.participants;
    tbody.innerHTML = '';

    participants.forEach((participant, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${participant.name}</td>
            <td>${participant.division || 'Не вказано'}</td>
            <td>${participant.weight}</td>
            <td>
                <button class="btn btn-danger" onclick="removeParticipant(${index})">Видалити</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updatePrizesList() {
    const tbody = document.getElementById('prizes-list');
    if (!tbody) return;
    
    const prizes = window.DataManager.prizes;
    tbody.innerHTML = '';

    prizes.forEach((prize, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${prize.name}</td>
            <td>${prize.count}</td>
            <td>
                <button class="btn btn-danger" onclick="removePrize(${index})">Видалити</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ===== РЕЗУЛЬТАТИ =====

function updateResultsDisplay() {
    const results = window.DataManager.results;
    
    const totalRoundsEl = document.getElementById('results-total-rounds');
    const winnersEl = document.getElementById('results-winners');
    const prizesGivenEl = document.getElementById('results-prizes-given');
    const resultsList = document.getElementById('results-list');
    
    if (totalRoundsEl) totalRoundsEl.textContent = results.length;
    if (winnersEl) winnersEl.textContent = new Set(results.map(r => r.winner)).size;
    if (prizesGivenEl) prizesGivenEl.textContent = results.length;

    if (!resultsList) return;
    
    if (results.length === 0) {
        resultsList.innerHTML = '<p style="text-align: center; color: #666;">Результати з\'являться після проведення розіграшу</p>';
        return;
    }

    resultsList.innerHTML = results.map(result => `
        <div class="result-item">
            <span class="round-indicator">Раунд ${result.round}</span>
            <strong>${result.winner}</strong>${result.winnerDivision ? ` (Підрозділ: ${result.winnerDivision})` : ''} виграв <strong>${result.prize}</strong>
        </div>
    `).join('');
}

// ===== НАЛАШТУВАННЯ ФОРМ =====

function setupFormHandlers() {
    // Обробка Enter для форм учасників
    const participantName = document.getElementById('participant-name');
    const participantDivision = document.getElementById('participant-division');
    const participantWeight = document.getElementById('participant-weight');
    
    if (participantName) {
        participantName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.DataManager.addParticipant();
        });
    }
    
    if (participantDivision) {
        participantDivision.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.DataManager.addParticipant();
        });
    }
    
    if (participantWeight) {
        participantWeight.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.DataManager.addParticipant();
        });
    }

    // Обробка Enter для форм призів
    const prizeName = document.getElementById('prize-name');
    const prizeCount = document.getElementById('prize-count');
    
    if (prizeName) {
        prizeName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.DataManager.addPrize();
        });
    }
    
    if (prizeCount) {
        prizeCount.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') window.DataManager.addPrize();
        });
    }
}

// ===== НАЛАШТУВАННЯ НАВІГАЦІЇ =====

function setupNavigation() {
    // Налаштувати навігаційні вкладки
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Визначити сторінку за текстом вкладки
            const tabText = tab.textContent.toLowerCase();
            let pageId = 'data'; // за замовчуванням
            
            if (tabText.includes('розіграш')) {
                pageId = 'raffle';
            } else if (tabText.includes('результат')) {
                pageId = 'results';
            } else if (tabText.includes('дані')) {
                pageId = 'data';
            }
            
            showPage(pageId);
        });
    });
}

// ===== НАЛАШТУВАННЯ КНОПОК =====

function setupButtons() {
    // Налаштувати кнопки управління даними
    const addParticipantBtn = document.querySelector('button[onclick="addParticipant()"]');
    if (addParticipantBtn) {
        addParticipantBtn.onclick = window.DataManager.addParticipant;
    }
    
    const addPrizeBtn = document.querySelector('button[onclick="addPrize()"]');
    if (addPrizeBtn) {
        addPrizeBtn.onclick = window.DataManager.addPrize;
    }
    
    // Налаштувати кнопки розіграшу
    const startRaffleBtn = document.getElementById('start-raffle-btn');
    if (startRaffleBtn) {
        startRaffleBtn.onclick = window.RaffleEngine.startRaffle;
    }
    
    const nextRoundBtn = document.getElementById('next-round-btn');
    if (nextRoundBtn) {
        nextRoundBtn.onclick = window.RaffleEngine.nextRound;
    }
    
    const newRaffleBtn = document.getElementById('new-raffle-btn');
    if (newRaffleBtn) {
        newRaffleBtn.onclick = window.RaffleEngine.startNewRaffle;
    }
    
    // Налаштувати кнопки Excel
    const loadExcelBtn = document.querySelector('button[onclick="loadExcelData()"]');
    if (loadExcelBtn) {
        loadExcelBtn.onclick = window.DataManager.loadExcelData;
    }
    
    const exportExcelBtn = document.querySelector('button[onclick="exportToExcel()"]');
    if (exportExcelBtn) {
        exportExcelBtn.onclick = window.DataManager.exportToExcel;
    }
    
    const exportResultsBtn = document.querySelector('button[onclick="exportResultsToExcel()"]');
    if (exportResultsBtn) {
        exportResultsBtn.onclick = window.DataManager.exportResultsToExcel;
    }
    
    // Налаштувати кнопки очищення
    const clearDataBtn = document.querySelector('button[onclick="clearStoredData()"]');
    if (clearDataBtn) {
        clearDataBtn.onclick = window.DataManager.clearStoredData;
    }
    
    const clearResultsBtn = document.querySelector('button[onclick="clearResults()"]');
    if (clearResultsBtn) {
        clearResultsBtn.onclick = window.DataManager.clearResults;
    }
    
    const resetRaffleBtn = document.querySelector('button[onclick="resetRaffle()"]');
    if (resetRaffleBtn) {
        resetRaffleBtn.onclick = window.RaffleEngine.resetRaffle;
    }
    
    // Налаштувати кнопки анімації
    const animationSettingsBtn = document.querySelector('button[onclick="showAnimationSettings()"]');
    if (animationSettingsBtn) {
        animationSettingsBtn.onclick = window.RaffleEngine.showAnimationSettings;
    }
    
    const hideAnimationBtn = document.querySelector('button[onclick="hideAnimationSettings()"]');
    if (hideAnimationBtn) {
        hideAnimationBtn.onclick = window.RaffleEngine.hideAnimationSettings;
    }
    
    const saveAnimationBtn = document.querySelector('button[onclick="saveAnimationSettings()"]');
    if (saveAnimationBtn) {
        saveAnimationBtn.onclick = window.RaffleEngine.saveAnimationSettings;
    }
    
    const resetAnimationBtn = document.querySelector('button[onclick="resetAnimationSettings()"]');
    if (resetAnimationBtn) {
        resetAnimationBtn.onclick = window.RaffleEngine.resetAnimationSettings;
    }
    
    // Налаштувати кнопку закриття popup
    const closePopupBtn = document.querySelector('button[onclick="hideWinnerPopup()"]');
    if (closePopupBtn) {
        closePopupBtn.onclick = window.RaffleEngine.hideWinnerPopup;
    }
}

// ===== НАЛАШТУВАННЯ EXCEL INPUT =====

function setupExcelInput() {
    // Excel input обробляється через onchange атрибут в HTML
    // Цей обробник видалено щоб уникнути подвійного виклику
}

// ===== НАЛАШТУВАННЯ ВІДОБРАЖЕННЯ АКТИВНОЇ СТОРІНКИ =====

function setupInitialPage() {
    // Відновити збережену активну вкладку або показати вкладку даних за замовчуванням
    const savedTab = loadActiveTab();
    showPage(savedTab);
}

// ===== ІНІЦІАЛІЗАЦІЯ UI =====

function initializeUI() {
    // Налаштувати всі компоненти UI
    setupNavigation();
    setupFormHandlers();
    setupButtons();
    setupExcelInput();
    setupInitialPage();
    
    // Ініціалізувати обробники popup
    if (window.RaffleEngine && window.RaffleEngine.initializePopupHandlers) {
        window.RaffleEngine.initializePopupHandlers();
    }
    
    console.log('UI Controller ініціалізовано');
}

// ===== ЗБЕРЕЖЕННЯ АКТИВНОЇ ВКЛАДКИ =====

function saveActiveTab(pageId) {
    try {
        localStorage.setItem('raffle_active_tab', pageId);
    } catch (error) {
        console.error('Помилка збереження активної вкладки:', error);
    }
}

function loadActiveTab() {
    try {
        return localStorage.getItem('raffle_active_tab') || 'data'; // За замовчуванням - вкладка даних
    } catch (error) {
        console.error('Помилка завантаження активної вкладки:', error);
        return 'data';
    }
}

// ===== УТИЛІТАРНІ ФУНКЦІЇ =====
// Утилітарні функції видалено як невикористовувані

// ===== ЕКСПОРТ ФУНКЦІЙ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПУ =====

// Зробити функції доступними глобально
window.UIController = {
    // Навігація
    showPage,
    
    // Збереження стану
    saveActiveTab,
    loadActiveTab,
    
    // Статистика
    initializeRaffleStats,
    updateRaffleStats,
    
    // Відображення
    showError,
    updateDisplay,
    updateParticipantsList,
    updatePrizesList,
    updateResultsDisplay,
    
    // Налаштування
    setupFormHandlers,
    setupNavigation,
    setupButtons,
    setupExcelInput,
    setupInitialPage,
    
    // Ініціалізація
    initializeUI
    
    // Утилітарні функції видалено як невикористовувані
};

// Також зробити функції доступними напряму для обратної сумісності
window.showPage = showPage;
window.initializeRaffleStats = initializeRaffleStats;
window.updateRaffleStats = updateRaffleStats;
window.showError = showError;
window.updateDisplay = updateDisplay;
window.updateParticipantsList = updateParticipantsList;
window.updatePrizesList = updatePrizesList;
window.updateResultsDisplay = updateResultsDisplay;