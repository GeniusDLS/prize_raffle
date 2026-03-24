/**
 * UI CONTROLLER MODULE
 * Відповідає за інтерфейс користувача та відображення даних
 */

// ===== УТИЛІТАРНІ ФУНКЦІЇ =====

/**
 * Екранування HTML-спецсимволів для захисту від XSS
 * Застосовується до всіх даних користувача перед вставкою в innerHTML
 */
function escapeHtml(str) {
    if (str === null || str === undefined) { return ''; }
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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
    } else if (pageId === 'settings') {
        // Завантажити налаштування анімації до форми при відкритті сторінки налаштувань
        if (window.RaffleEngine && window.RaffleEngine.loadAnimationSettingsToForm) {
            window.RaffleEngine.loadAnimationSettingsToForm();
        }
    }
}

function getPageName(pageId) {
    const pageNames = {
        'data': 'дані',
        'raffle': 'розіграш',
        'results': 'результати',
        'settings': 'налаштування'
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
    updateSortButtonsState();
}

// ===== СТАН INLINE РЕДАГУВАННЯ =====
let editingParticipantIndex = -1;
let editingPrizeIndex = -1;

function updateParticipantsList() {
    const tbody = document.getElementById('participants-list');
    if (!tbody) return;

    const participants = window.DataManager.participants;
    tbody.innerHTML = '';

    participants.forEach((participant, index) => {
        const row = document.createElement('tr');
        if (index === editingParticipantIndex) {
            row.innerHTML = `
                <td><input class="inline-edit" type="text" id="edit-p-name" value="${escapeHtml(participant.name)}" onkeydown="handleEditKeydown(event,'participant',${index})"></td>
                <td><input class="inline-edit" type="text" id="edit-p-division" value="${escapeHtml(participant.division || '')}" onkeydown="handleEditKeydown(event,'participant',${index})"></td>
                <td><input class="inline-edit inline-edit-number" type="number" id="edit-p-weight" value="${participant.weight}" min="1" onkeydown="handleEditKeydown(event,'participant',${index})"></td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="saveEditParticipant(${index})" title="Зберегти">✓</button>
                    <button class="btn btn-secondary btn-sm" onclick="cancelEditParticipant()" title="Скасувати">✕</button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${escapeHtml(participant.name)}</td>
                <td>${escapeHtml(participant.division) || 'Не вказано'}</td>
                <td>${escapeHtml(participant.weight)}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="startEditParticipant(${index})" title="Редагувати">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="removeParticipant(${index})" title="Видалити">✕</button>
                </td>
            `;
        }
        tbody.appendChild(row);
    });
}

function startEditParticipant(index) {
    editingParticipantIndex = index;
    editingPrizeIndex = -1;
    updateParticipantsList();
    const nameInput = document.getElementById('edit-p-name');
    if (nameInput) { nameInput.focus(); nameInput.select(); }
}

function saveEditParticipant(index) {
    const name = document.getElementById('edit-p-name')?.value ?? '';
    const division = document.getElementById('edit-p-division')?.value ?? '';
    const weight = document.getElementById('edit-p-weight')?.value ?? '1';
    editingParticipantIndex = -1;
    const saved = window.DataManager.updateParticipant(index, name, division, weight);
    if (!saved) {
        // Повернути у режим редагування при помилці валідації
        editingParticipantIndex = index;
    }
}

function cancelEditParticipant() {
    editingParticipantIndex = -1;
    updateParticipantsList();
}

// Оновлення стану кнопок сортування
function updateSortButtonsState() {
    const sortButtons = document.querySelectorAll('.sort-btn');
    const sortState = window.DataManager.participantsSortState;
    
    sortButtons.forEach(button => {
        const field = button.getAttribute('data-field');
        const arrow = button.querySelector('.sort-arrow');
        
        if (sortState.isActive && sortState.field === field) {
            // Активна кнопка
            button.classList.add('active');
            if (arrow) {
                arrow.className = `sort-arrow ${sortState.direction}`;
            }
        } else {
            // Неактивна кнопка
            button.classList.remove('active');
            if (arrow) {
                arrow.className = 'sort-arrow';
            }
        }
    });
}

function updatePrizesList() {
    const tbody = document.getElementById('prizes-list');
    if (!tbody) return;

    const prizes = window.DataManager.prizes;
    tbody.innerHTML = '';

    prizes.forEach((prize, index) => {
        const row = document.createElement('tr');
        if (index === editingPrizeIndex) {
            row.innerHTML = `
                <td><input class="inline-edit" type="text" id="edit-pr-name" value="${escapeHtml(prize.name)}" onkeydown="handleEditKeydown(event,'prize',${index})"></td>
                <td><input class="inline-edit inline-edit-number" type="number" id="edit-pr-count" value="${prize.count}" min="1" onkeydown="handleEditKeydown(event,'prize',${index})"></td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="saveEditPrize(${index})" title="Зберегти">✓</button>
                    <button class="btn btn-secondary btn-sm" onclick="cancelEditPrize()" title="Скасувати">✕</button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${escapeHtml(prize.name)}</td>
                <td>${escapeHtml(prize.count)}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="startEditPrize(${index})" title="Редагувати">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="removePrize(${index})" title="Видалити">✕</button>
                </td>
            `;
        }
        tbody.appendChild(row);
    });
}

function startEditPrize(index) {
    editingPrizeIndex = index;
    editingParticipantIndex = -1;
    updatePrizesList();
    const nameInput = document.getElementById('edit-pr-name');
    if (nameInput) { nameInput.focus(); nameInput.select(); }
}

function saveEditPrize(index) {
    const name = document.getElementById('edit-pr-name')?.value ?? '';
    const count = document.getElementById('edit-pr-count')?.value ?? '1';
    editingPrizeIndex = -1;
    const saved = window.DataManager.updatePrize(index, name, count);
    if (!saved) {
        // Повернути у режим редагування при помилці валідації
        editingPrizeIndex = index;
    }
}

function cancelEditPrize() {
    editingPrizeIndex = -1;
    updatePrizesList();
}

// Обробка клавіш Enter/Escape при inline редагуванні
function handleEditKeydown(event, type, index) {
    if (event.key === 'Enter') {
        if (type === 'participant') saveEditParticipant(index);
        else if (type === 'prize') saveEditPrize(index);
    } else if (event.key === 'Escape') {
        if (type === 'participant') cancelEditParticipant();
        else if (type === 'prize') cancelEditPrize();
    }
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
            <strong>${escapeHtml(result.winner)}</strong>${result.winnerDivision ? ` (Підрозділ: ${escapeHtml(result.winnerDivision)})` : ''} виграв <strong>${escapeHtml(result.prize)}</strong>
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
            } else if (tabText.includes('тест')) {
                pageId = 'tests';
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
    
    // Налаштувати кнопки налаштувань
    const settingsBtn = document.querySelector('button[onclick="showSettings()"]');
    if (settingsBtn) {
        settingsBtn.onclick = showSettings;
    }
    
    const hideSettingsBtn = document.querySelector('button[onclick="hideSettings()"]');
    if (hideSettingsBtn) {
        hideSettingsBtn.onclick = hideSettings;
    }
    
    // Кнопка збереження налаштувань видалена - тепер використовується автозбереження
    
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
    setupDataTabs();
    
    // Ініціалізувати обробники popup
    if (window.RaffleEngine && window.RaffleEngine.initializePopupHandlers) {
        window.RaffleEngine.initializePopupHandlers();
    }
    
    window.Logger.log('[UIController]', 'UI Controller ініціалізовано');
}

// ===== ЗБЕРЕЖЕННЯ АКТИВНОЇ ВКЛАДКИ =====

function saveActiveTab(pageId) {
    try {
        localStorage.setItem('raffle_active_tab', pageId);
    } catch (error) {
        window.Logger.error('[UIController]', 'Помилка збереження активної вкладки:', error);
    }
}

function loadActiveTab() {
    try {
        return localStorage.getItem('raffle_active_tab') || 'data'; // За замовчуванням - вкладка даних
    } catch (error) {
        window.Logger.error('[UIController]', 'Помилка завантаження активної вкладки:', error);
        return 'data';
    }
}

// ===== ФУНКЦІЇ НАЛАШТУВАНЬ =====

function showSettings() {
    // Показати сторінку налаштувань
    showPage('settings');
    // За замовчуванням показати вкладку анімації
    showSettingsTab('animation');
}

function hideSettings() {
    // Повернутися на сторінку даних
    showPage('data');
}

function showSettingsTab(tabId) {
    // Переключення вкладок всередині налаштувань
    document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.settings-content').forEach(content => content.classList.remove('active'));
    
    // Активувати потрібну вкладку
    const targetTab = document.querySelector(`[onclick="showSettingsTab('${tabId}')"]`);
    const targetContent = document.getElementById(`${tabId}-settings`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
}

// ===== ФУНКЦІЇ ПІДЗАКЛАДОК ДАНИХ =====

function showDataTab(tabName) {
    // Приховати всі підзакладки даних
    document.querySelectorAll('.data-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Деактивувати всі кнопки підзакладок даних
    document.querySelectorAll('.data-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Показати вибрану підзакладку
    const targetContent = document.getElementById(tabName + '-tab');
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Активувати відповідну кнопку
    const targetTab = document.querySelector(`[onclick="showDataTab('${tabName}')"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Зберегти активну підзакладку даних
    saveActiveDataTab(tabName);
}

function saveActiveDataTab(tabName) {
    try {
        localStorage.setItem('raffle_active_data_tab', tabName);
    } catch (error) {
        window.Logger.error('[UIController]', 'Помилка збереження активної підзакладки даних:', error);
    }
}

function loadActiveDataTab() {
    try {
        return localStorage.getItem('raffle_active_data_tab') || 'participants'; // За замовчуванням - учасники
    } catch (error) {
        window.Logger.error('[UIController]', 'Помилка завантаження активної підзакладки даних:', error);
        return 'participants';
    }
}

function setupDataTabs() {
    // Відновити збережену активну підзакладку даних
    const savedDataTab = loadActiveDataTab();
    showDataTab(savedDataTab);
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
    updateSortButtonsState,

    // Inline редагування
    startEditParticipant,
    saveEditParticipant,
    cancelEditParticipant,
    startEditPrize,
    saveEditPrize,
    cancelEditPrize,
    handleEditKeydown,
    
    // Налаштування
    setupFormHandlers,
    setupNavigation,
    setupButtons,
    setupExcelInput,
    setupInitialPage,
    showSettings,
    hideSettings,
    showSettingsTab,
    
    // Підзакладки даних
    showDataTab,
    saveActiveDataTab,
    loadActiveDataTab,
    setupDataTabs,
    
    // Ініціалізація
    initializeUI,

    // Утилітарні функції
    escapeHtml
};

// Також зробити функції доступними напряму для обратної сумісності
window.showPage = showPage;
window.showDataTab = showDataTab;
window.startEditParticipant = startEditParticipant;
window.saveEditParticipant = saveEditParticipant;
window.cancelEditParticipant = cancelEditParticipant;
window.startEditPrize = startEditPrize;
window.saveEditPrize = saveEditPrize;
window.cancelEditPrize = cancelEditPrize;
window.handleEditKeydown = handleEditKeydown;
window.initializeRaffleStats = initializeRaffleStats;
window.updateRaffleStats = updateRaffleStats;
window.showError = showError;
window.updateDisplay = updateDisplay;
window.updateParticipantsList = updateParticipantsList;
window.updatePrizesList = updatePrizesList;
window.updateResultsDisplay = updateResultsDisplay;
window.updateSortButtonsState = updateSortButtonsState;

// Глобальні функції для сортування та перемішування (для HTML onclick)
window.sortParticipants = window.DataManager.sortParticipants;
window.shuffleParticipants = window.DataManager.shuffleParticipants;