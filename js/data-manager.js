/**
 * DATA MANAGER MODULE
 * Відповідає за управління даними, збереження та Excel операції
 */

// ===== ЛОГЕР =====

/**
 * Централізований логер для всіх модулів
 * Встановити enabled = false для вимкнення debug-логів (log/warn)
 * Помилки (error) виводяться завжди
 */
window.Logger = {
    enabled: true,
    log: function(...args) { if (window.Logger.enabled) { console.log(...args); } },
    warn: function(...args) { if (window.Logger.enabled) { console.warn(...args); } },
    error: function(...args) { console.error(...args); }
};

// ===== ГЛОБАЛЬНІ ЗМІННІ ТА КОНСТАНТИ =====

let participants = [];
let prizes = [];
let results = [];
let availableParticipants = [];
let availablePrizes = [];
let currentRound = 0;
let isRaffleActive = false;
let hasUnsavedChanges = false;

// Стан сортування учасників
let participantsSortState = {
    field: null,        // 'name', 'division', 'weight', null
    direction: 'asc',   // 'asc', 'desc'
    isActive: false     // чи активне сортування
};

// Константи для localStorage
const STORAGE_KEYS = {
    PARTICIPANTS: 'raffle_participants',
    PRIZES: 'raffle_prizes',
    RESULTS: 'raffle_results',
    CURRENT_ROUND: 'raffle_current_round',
    IS_RAFFLE_ACTIVE: 'raffle_is_active',
    AVAILABLE_PARTICIPANTS: 'raffle_available_participants',
    AVAILABLE_PRIZES: 'raffle_available_prizes',
    RAFFLE_STATE: 'raffle_state',
    LAST_SAVE: 'raffle_last_save',
    ANIMATION_SETTINGS: 'raffle_animation_settings',
    ACTIVE_TAB: 'raffle_active_tab',
    PARTICIPANTS_SORT: 'raffle_participants_sort',
    THEME: 'raffle_theme'
    // BACKUP видалено - немає функції відновлення, автозбереження достатньо
};

// ===== ФУНКЦІЇ ЛОКАЛЬНОГО ЗБЕРЕЖЕННЯ =====

function saveToStorage() {
    try {
        const data = {
            participants: participants,
            prizes: prizes,
            results: results,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
        localStorage.setItem(STORAGE_KEYS.PRIZES, JSON.stringify(prizes));
        localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
        localStorage.setItem(STORAGE_KEYS.CURRENT_ROUND, currentRound.toString());
        localStorage.setItem(STORAGE_KEYS.IS_RAFFLE_ACTIVE, isRaffleActive.toString());
        localStorage.setItem(STORAGE_KEYS.AVAILABLE_PARTICIPANTS, JSON.stringify(availableParticipants));
        localStorage.setItem(STORAGE_KEYS.AVAILABLE_PRIZES, JSON.stringify(availablePrizes));
        
        // Зберегти стан інтерфейсу розіграшу
        const raffleState = {
            participantDrumText: document.getElementById('participant-drum')?.textContent || 'Готовий до розіграшу!',
            prizeDrumText: document.getElementById('prize-drum')?.textContent || 'Готовий до розіграшу!',
            startBtnVisible: document.getElementById('start-raffle-btn')?.style.display !== 'none',
            nextBtnVisible: document.getElementById('next-round-btn')?.style.display !== 'none',
            newBtnVisible: document.getElementById('new-raffle-btn')?.style.display !== 'none'
        };
        localStorage.setItem(STORAGE_KEYS.RAFFLE_STATE, JSON.stringify(raffleState));
        
        localStorage.setItem(STORAGE_KEYS.LAST_SAVE, new Date().toISOString());

        showAutoSaveStatus('saved');
        hasUnsavedChanges = false;
    } catch (error) {
        window.Logger.error('[DataManager]', 'Помилка збереження:', error);
        showAutoSaveStatus('error');
    }
}

function loadFromStorage() {
    try {
        const savedParticipants = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
        const savedPrizes = localStorage.getItem(STORAGE_KEYS.PRIZES);
        const savedResults = localStorage.getItem(STORAGE_KEYS.RESULTS);
        const savedCurrentRound = localStorage.getItem(STORAGE_KEYS.CURRENT_ROUND);
        const savedIsRaffleActive = localStorage.getItem(STORAGE_KEYS.IS_RAFFLE_ACTIVE);
        const savedAvailableParticipants = localStorage.getItem(STORAGE_KEYS.AVAILABLE_PARTICIPANTS);
        const savedAvailablePrizes = localStorage.getItem(STORAGE_KEYS.AVAILABLE_PRIZES);
        const savedRaffleState = localStorage.getItem(STORAGE_KEYS.RAFFLE_STATE);

        if (savedParticipants) {
            participants = JSON.parse(savedParticipants);
        }
        if (savedPrizes) {
            prizes = JSON.parse(savedPrizes);
        }
        if (savedResults) {
            results = JSON.parse(savedResults);
        }
        if (savedCurrentRound) {
            currentRound = parseInt(savedCurrentRound) || 0;
        }
        if (savedIsRaffleActive) {
            isRaffleActive = savedIsRaffleActive === 'true';
        }
        if (savedAvailableParticipants) {
            availableParticipants = JSON.parse(savedAvailableParticipants);
        }
        if (savedAvailablePrizes) {
            availablePrizes = JSON.parse(savedAvailablePrizes);
        }

        // Відновити стан інтерфейсу розіграшу
        if (savedRaffleState) {
            setTimeout(() => {
                try {
                    const raffleState = JSON.parse(savedRaffleState);
                    
                    const participantDrum = document.getElementById('participant-drum');
                    const prizeDrum = document.getElementById('prize-drum');
                    const startBtn = document.getElementById('start-raffle-btn');
                    const nextBtn = document.getElementById('next-round-btn');
                    const newBtn = document.getElementById('new-raffle-btn');
                    
                    setDrumText(participantDrum, raffleState.participantDrumText);
                    setDrumText(prizeDrum, raffleState.prizeDrumText);
                    if (startBtn) startBtn.style.display = raffleState.startBtnVisible ? 'inline-block' : 'none';
                    if (nextBtn) nextBtn.style.display = raffleState.nextBtnVisible ? 'inline-block' : 'none';
                    if (newBtn) newBtn.style.display = raffleState.newBtnVisible ? 'inline-block' : 'none';
                    
                } catch (e) {
                    window.Logger.error('[DataManager]', 'Помилка відновлення стану розіграшу:', e);
                }
            }, 100); // Невелика затримка для завантаження DOM
        }

        const lastSave = localStorage.getItem(STORAGE_KEYS.LAST_SAVE);
        if (lastSave) {
            const saveDate = new Date(lastSave);
            window.Logger.log('[DataManager]', 'Дані відновлено з:', saveDate.toLocaleString('uk-UA'));
            if (isRaffleActive) {
                window.Logger.log('[DataManager]', 'Відновлено активний розіграш. Поточний раунд:', currentRound);
                
                // Показати повідомлення про відновлення
                setTimeout(() => {
                    showAutoSaveStatus('restored');
                }, 1000);
            }
        }

        hasUnsavedChanges = false;
        
        // Завантажити стан сортування
        loadSortState();
        
        // Додаткова перевірка для відновлення стану кнопки "наступний раунд"
        // після оновлення сторінки під час активного розіграшу
        setTimeout(() => {
            restoreRaffleButtonState();
        }, 200); // Затримка для завантаження DOM
        
    } catch (error) {
        window.Logger.error('[DataManager]', 'Помилка завантаження:', error);
    }
}

// Функція для відновлення правильного стану кнопок розіграшу
function restoreRaffleButtonState() {
    if (!isRaffleActive) return;
    
    const startBtn = document.getElementById('start-raffle-btn');
    const nextBtn = document.getElementById('next-round-btn');
    const newBtn = document.getElementById('new-raffle-btn');
    
    // Якщо розіграш активний і вже був хоча б один раунд
    if (currentRound > 0 && availableParticipants.length > 0 && availablePrizes.length > 0) {
        // Показати кнопку "наступний раунд"
        if (nextBtn) nextBtn.style.display = 'inline-block';
        if (startBtn) startBtn.style.display = 'none';
        if (newBtn) newBtn.style.display = 'none';
        
        window.Logger.log('[DataManager]', 'Відновлено стан кнопки "наступний раунд" для активного розіграшу');
    } else if (currentRound === 0) {
        // Якщо розіграш тільки розпочався, але ще не було раундів
        if (startBtn) startBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        if (newBtn) newBtn.style.display = 'none';
    }
}

// createBackup функція видалена - не використовувалася для відновлення

function clearStoredData() {
    if (confirm('Видалити всі збережені дані? Ця дія незворотна.')) {
        // createBackup() видалено - автозбереження достатньо для захисту даних
        
        localStorage.removeItem(STORAGE_KEYS.PARTICIPANTS);
        localStorage.removeItem(STORAGE_KEYS.PRIZES);
        localStorage.removeItem(STORAGE_KEYS.RESULTS);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUND);
        localStorage.removeItem(STORAGE_KEYS.IS_RAFFLE_ACTIVE);
        localStorage.removeItem(STORAGE_KEYS.AVAILABLE_PARTICIPANTS);
        localStorage.removeItem(STORAGE_KEYS.AVAILABLE_PRIZES);
        localStorage.removeItem(STORAGE_KEYS.RAFFLE_STATE);
        localStorage.removeItem(STORAGE_KEYS.LAST_SAVE);
        // Налаштування не очищаються: STORAGE_KEYS.ANIMATION_SETTINGS, STORAGE_KEYS.ACTIVE_TAB
        
        participants = [];
        prizes = [];
        results = [];
        currentRound = 0;
        isRaffleActive = false;
        availableParticipants = [];
        availablePrizes = [];
        
        // Оновити всі сторінки (функції з ui-controller)
        if (typeof updateDisplay === 'function') updateDisplay();
        if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
        if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
        
        // Скинути інтерфейс розіграшу
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
        
        alert('🗑️ Всі дані очищено!\n\nВи можете почати з нуля - додати нових учасників та призи.');
    }
}

// ===== АВТОЗБЕРЕЖЕННЯ =====

function setupAutoSave() {
    // Автозбереження кожні 30 секунд
    setInterval(() => {
        if (hasUnsavedChanges) {
            showAutoSaveStatus('saving');
            setTimeout(() => {
                saveToStorage();
            }, 500);
        }
    }, 30000);
}

function setupBeforeUnload() {
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'У вас є незбережені зміни. Ви впевнені, що хочете покинути сторінку?';
            return e.returnValue;
        }
    });
}

function showAutoSaveStatus(status) {
    const indicator = document.getElementById('auto-save-indicator');
    if (!indicator) return;
    
    indicator.className = `auto-save-indicator ${status}`;
    
    switch (status) {
        case 'saving':
            indicator.textContent = '💾 Збереження...';
            break;
        case 'saved':
            indicator.textContent = '✅ Збережено';
            setTimeout(() => {
                indicator.textContent = '💾 Автозбереження активне';
                indicator.className = 'auto-save-indicator';
            }, 2000);
            break;
        case 'restored':
            indicator.textContent = '🔄 Стан відновлено';
            indicator.className = 'auto-save-indicator saved';
            setTimeout(() => {
                indicator.textContent = '💾 Автозбереження активне';
                indicator.className = 'auto-save-indicator';
            }, 3000);
            break;
        case 'error':
            indicator.textContent = '❌ Помилка збереження';
            indicator.className = 'auto-save-indicator';
            break;
    }
}

function markAsChanged() {
    hasUnsavedChanges = true;
    // Зберегти через 2 секунди після останньої зміни
    clearTimeout(window.autoSaveTimeout);
    window.autoSaveTimeout = setTimeout(() => {
        showAutoSaveStatus('saving');
        setTimeout(() => {
            saveToStorage();
        }, 500);
    }, 2000);
}

// ===== УПРАВЛІННЯ УЧАСНИКАМИ =====

function addParticipant() {
    const name = document.getElementById('participant-name').value.trim();
    const position = document.getElementById('participant-position').value.trim();
    const division = document.getElementById('participant-division').value.trim();
    const weight = parseInt(document.getElementById('participant-weight').value);
    const errorDiv = document.getElementById('participants-error');

    if (errorDiv) errorDiv.style.display = 'none';

    if (!name) {
        if (typeof showError === 'function') showError('participants-error', 'Введіть ім\'я учасника');
        return;
    }

    if (!division) {
        if (typeof showError === 'function') showError('participants-error', 'Введіть підрозділ');
        return;
    }

    if (!weight || weight < 1) {
        if (typeof showError === 'function') showError('participants-error', 'Вага повинна бути більше 0');
        return;
    }

    if (participants.some(p => p.name === name)) {
        if (typeof showError === 'function') showError('participants-error', 'Учасник з таким ім\'ям вже існує');
        return;
    }

    participants.push({ name, position, division, weight });
    
    // Очистити форму
    const nameInput = document.getElementById('participant-name');
    const positionInput = document.getElementById('participant-position');
    const divisionInput = document.getElementById('participant-division');
    const weightInput = document.getElementById('participant-weight');
    
    if (nameInput) nameInput.value = '';
    if (positionInput) positionInput.value = '';
    if (divisionInput) divisionInput.value = '';
    if (weightInput) weightInput.value = '1';
    
    // Застосувати збережене сортування до нового учасника
    applySavedSorting();
    
    // Оновити відображення
    if (typeof updateDisplay === 'function') updateDisplay();
    if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
    markAsChanged();
}

function removeParticipant(index) {
    if (index < 0 || index >= participants.length) {
        window.Logger.error('[DataManager]', `removeParticipant: невірний індекс ${index}`);
        return;
    }
    if (confirm('Видалити цього учасника?')) {
        participants.splice(index, 1);
        if (typeof updateDisplay === 'function') updateDisplay();
        if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
        markAsChanged();
    }
}

function updateParticipant(index, name, position, division, weight) {
    if (index < 0 || index >= participants.length) {
        window.Logger.error('[DataManager]', `updateParticipant: невірний індекс ${index}`);
        return false;
    }

    name = String(name || '').trim();
    position = String(position || '').trim();
    division = String(division || '').trim();
    weight = parseInt(weight) || 1;

    if (!name) {
        if (typeof showError === 'function') showError('participants-error', 'Ім\'я не може бути порожнім');
        return false;
    }

    if (!division) {
        if (typeof showError === 'function') showError('participants-error', 'Введіть підрозділ');
        return false;
    }

    if (weight < 1) {
        if (typeof showError === 'function') showError('participants-error', 'Вага повинна бути більше 0');
        return false;
    }

    // Перевірити дублікат (крім поточного учасника)
    if (participants.some((p, i) => i !== index && p.name === name)) {
        if (typeof showError === 'function') showError('participants-error', 'Учасник з таким іменем вже існує');
        return false;
    }

    participants[index] = { ...participants[index], name, position, division, weight };
    if (typeof updateDisplay === 'function') updateDisplay();
    if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
    markAsChanged();
    return true;
}

// ===== СОРТУВАННЯ ТА ПЕРЕМІШУВАННЯ УЧАСНИКІВ =====

// Сортування учасників за вказаним полем
function sortParticipants(field, direction = null) {
    if (participants.length === 0) {
        window.Logger.warn('[DataManager]', 'Немає учасників для сортування');
        return;
    }

    // Визначити напрямок сортування
    if (direction === null) {
        if (participantsSortState.field === field && participantsSortState.isActive) {
            // Якщо клікнули по активному полю, змінити напрямок
            direction = participantsSortState.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // Нове поле - почати з зростання
            direction = 'asc';
        }
    }

    // Оновити стан сортування
    participantsSortState = {
        field: field,
        direction: direction,
        isActive: true
    };

    // Виконати сортування
    participants.sort((a, b) => {
        let valueA, valueB;

        switch (field) {
            case 'name':
                valueA = a.name || '';
                valueB = b.name || '';
                return direction === 'asc'
                    ? valueA.localeCompare(valueB, 'uk', { numeric: true, sensitivity: 'base' })
                    : valueB.localeCompare(valueA, 'uk', { numeric: true, sensitivity: 'base' });

            case 'division':
                valueA = a.division || 'Не вказано';
                valueB = b.division || 'Не вказано';
                return direction === 'asc'
                    ? valueA.localeCompare(valueB, 'uk', { numeric: true, sensitivity: 'base' })
                    : valueB.localeCompare(valueA, 'uk', { numeric: true, sensitivity: 'base' });

            case 'weight':
                valueA = a.weight || 0;
                valueB = b.weight || 0;
                return direction === 'asc' ? valueA - valueB : valueB - valueA;

            default:
                return 0;
        }
    });

    // Оновити відображення
    if (typeof updateDisplay === 'function') updateDisplay();
    if (typeof updateSortButtonsState === 'function') updateSortButtonsState();
    
    // Зберегти зміни
    saveSortState();
    markAsChanged();

    window.Logger.log('[DataManager]', `Учасників відсортовано за полем "${field}" у напрямку "${direction}"`);
}

// Перемішування учасників у випадковому порядку
function shuffleParticipants() {
    if (participants.length === 0) {
        window.Logger.warn('[DataManager]', 'Немає учасників для перемішування');
        return;
    }

    // Алгоритм Fisher-Yates з криптографічною випадковістю
    const array = [...participants];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(window.RaffleEngine.secureRandom() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    
    participants.length = 0;
    participants.push(...array);

    // Скинути стан сортування
    participantsSortState = {
        field: null,
        direction: 'asc',
        isActive: false
    };

    // Оновити відображення
    if (typeof updateDisplay === 'function') updateDisplay();
    if (typeof updateSortButtonsState === 'function') updateSortButtonsState();
    
    // Зберегти зміни
    saveSortState();
    markAsChanged();

    window.Logger.log('[DataManager]', 'Учасників перемішано у випадковому порядку');
}

// Збереження стану сортування в localStorage
function saveSortState() {
    try {
        const sortData = {
            ...participantsSortState,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.PARTICIPANTS_SORT, JSON.stringify(sortData));
    } catch (error) {
        window.Logger.error('[DataManager]', 'Помилка збереження стану сортування:', error);
    }
}

// Завантаження стану сортування з localStorage
function loadSortState() {
    try {
        const savedSort = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS_SORT);
        if (savedSort) {
            const sortData = JSON.parse(savedSort);
            participantsSortState = {
                field: sortData.field || null,
                direction: sortData.direction || 'asc',
                isActive: sortData.isActive || false
            };
            
            // Оновити UI кнопки після завантаження DOM
            setTimeout(() => {
                if (typeof updateSortButtonsState === 'function') {
                    updateSortButtonsState();
                }
            }, 100);
        }
    } catch (error) {
        window.Logger.error('[DataManager]', 'Помилка завантаження стану сортування:', error);
        participantsSortState = {
            field: null,
            direction: 'asc',
            isActive: false
        };
    }
}

// Застосування збереженого сортування до нових учасників
function applySavedSorting() {
    if (participantsSortState.isActive && participantsSortState.field && participants.length > 0) {
        sortParticipants(participantsSortState.field, participantsSortState.direction);
    }
}

// ===== УПРАВЛІННЯ ПРИЗАМИ =====

function addPrize() {
    const name = document.getElementById('prize-name').value.trim();
    const count = parseInt(document.getElementById('prize-count').value);
    const errorDiv = document.getElementById('prizes-error');

    if (errorDiv) errorDiv.style.display = 'none';

    if (!name) {
        if (typeof showError === 'function') showError('prizes-error', 'Введіть назву призу');
        return;
    }

    if (!count || count < 1) {
        if (typeof showError === 'function') showError('prizes-error', 'Кількість повинна бути більше 0');
        return;
    }

    prizes.push({ name, count });
    
    // Очистити форму
    const nameInput = document.getElementById('prize-name');
    const countInput = document.getElementById('prize-count');
    
    if (nameInput) nameInput.value = '';
    if (countInput) countInput.value = '1';
    
    // Оновити відображення
    if (typeof updateDisplay === 'function') updateDisplay();
    if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
    markAsChanged();
}

function removePrize(index) {
    if (index < 0 || index >= prizes.length) {
        window.Logger.error('[DataManager]', `removePrize: невірний індекс ${index}`);
        return;
    }
    if (confirm('Видалити цей приз?')) {
        prizes.splice(index, 1);
        if (typeof updateDisplay === 'function') updateDisplay();
        if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
        markAsChanged();
    }
}

function updatePrize(index, name, count) {
    if (index < 0 || index >= prizes.length) {
        window.Logger.error('[DataManager]', `updatePrize: невірний індекс ${index}`);
        return false;
    }

    name = String(name || '').trim();
    count = parseInt(count) || 1;

    if (!name) {
        if (typeof showError === 'function') showError('prizes-error', 'Назва призу не може бути порожньою');
        return false;
    }

    if (count < 1) {
        if (typeof showError === 'function') showError('prizes-error', 'Кількість повинна бути більше 0');
        return false;
    }

    prizes[index] = { ...prizes[index], name, count };
    if (typeof updateDisplay === 'function') updateDisplay();
    if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
    markAsChanged();
    return true;
}

// ===== EXCEL ФУНКЦІЇ =====

function loadExcelData() {
    const input = document.getElementById('excel-input');
    if (input) input.click();
}

// Константи для валідації Excel файлу
const EXCEL_VALIDATION = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 МБ
    MAX_PARTICIPANTS: 1000,
    MAX_PRIZES: 200,
    ALLOWED_EXTENSIONS: ['.xlsx', '.xls']
};

function handleExcelLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Перевірка розширення файлу
    const fileName = file.name.toLowerCase();
    if (!EXCEL_VALIDATION.ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
        alert('Підтримуються тільки файли .xlsx та .xls!');
        event.target.value = '';
        return;
    }

    // Перевірка розміру файлу
    if (file.size > EXCEL_VALIDATION.MAX_FILE_SIZE) {
        alert(`Файл завеликий! Максимальний розмір: 10 МБ. Розмір вашого файлу: ${(file.size / 1024 / 1024).toFixed(1)} МБ`);
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            // Створити резервну копію перед імпортом - видалено, автозбереження достатньо
            
            // Очистити поточні дані
            participants = [];
            prizes = [];
            
            // Перевірити чи є листи
            const sheetNames = workbook.SheetNames;
            
            if (sheetNames.length === 0) {
                alert('Excel файл не містить листів!');
                return;
            }

            let participantsLoaded = 0;
            let prizesLoaded = 0;
            
            // НОВИЙ ПІДХІД: Імпорт з окремих листів
            if (sheetNames.length >= 2) {
                // Якщо є кілька листів, використовуємо окремі листи для учасників та призів
                window.Logger.log('[DataManager]', 'Знайдено кілька листів, використовуємо окремі листи для імпорту');
                
                // Знайти лист для учасників
                let participantsSheetIndex = -1;
                let prizesSheetIndex = -1;
                
                // Спробувати знайти листи за назвами
                for (let i = 0; i < sheetNames.length; i++) {
                    const sheetName = sheetNames[i].toLowerCase();
                    if (sheetName.includes('учасник') || sheetName.includes('participant') || sheetName.includes('люди') || sheetName.includes('команда')) {
                        participantsSheetIndex = i;
                    }
                    if (sheetName.includes('приз') || sheetName.includes('prize') || sheetName.includes('нагород') || sheetName.includes('подарун')) {
                        prizesSheetIndex = i;
                    }
                }
                
                // Якщо не знайшли за назвами, використовуємо перші два листи
                if (participantsSheetIndex === -1) participantsSheetIndex = 0;
                if (prizesSheetIndex === -1) prizesSheetIndex = 1;
                
                // Завантажити учасників з відповідного листа
                if (participantsSheetIndex >= 0 && participantsSheetIndex < sheetNames.length) {
                    const participantsSheet = workbook.Sheets[sheetNames[participantsSheetIndex]];
                    const participantsData = XLSX.utils.sheet_to_json(participantsSheet, { header: 1 });
                    
                    window.Logger.log('[DataManager]', `Завантажуємо учасників з листа: ${sheetNames[participantsSheetIndex]}`);
                    
                    // Знайти рядок з заголовками або почати з першого рядка
                    let startRow = 0;
                    let colName = 0, colPosition = -1, colDivision = 1, colWeight = 2;
                    for (let i = 0; i < participantsData.length; i++) {
                        const row = participantsData[i];
                        if (row && row.length >= 3) {
                            const first = row[0] ? row[0].toString().toLowerCase() : '';
                            const second = row[1] ? row[1].toString().toLowerCase() : '';
                            const third = row[2] ? row[2].toString().toLowerCase() : '';
                            
                            if (first.includes('ім') || first.includes('name')) {
                                startRow = i + 1;
                                // Визначити колонки з заголовка
                                for (let c = 1; c < row.length; c++) {
                                    const cell = row[c] ? row[c].toString().toLowerCase() : '';
                                    if (cell.includes('посад') || cell.includes('position')) { colPosition = c; }
                                    else if (cell.includes('підрозд') || cell.includes('division') || cell.includes('відділ')) { colDivision = c; }
                                    else if (cell.includes('ваг') || cell.includes('weight') || cell.includes('пріоритет')) { colWeight = c; }
                                }
                                break;
                            }
                        }
                    }
                    
                    // Завантажити дані учасників
                    for (let i = startRow; i < participantsData.length; i++) {
                        const row = participantsData[i];
                        if (!row || row.length < 2) continue;
                        
                        const name = row[colName] ? row[colName].toString().trim() : '';
                        const position = (colPosition >= 0 && row[colPosition]) ? row[colPosition].toString().trim() : '';
                        const division = row[colDivision] ? row[colDivision].toString().trim() : '';
                        const weight = (colWeight >= 0 && row[colWeight]) ? (parseInt(row[colWeight]) || 1) : 1;
                        
                        if (name) {
                            participants.push({ name, position, division, weight });
                            participantsLoaded++;
                        }
                    }
                }
                
                // Завантажити призи з відповідного листа
                if (prizesSheetIndex >= 0 && prizesSheetIndex < sheetNames.length) {
                    const prizesSheet = workbook.Sheets[sheetNames[prizesSheetIndex]];
                    const prizesData = XLSX.utils.sheet_to_json(prizesSheet, { header: 1 });
                    
                    window.Logger.log('[DataManager]', `Завантажуємо призи з листа: ${sheetNames[prizesSheetIndex]}`);
                    
                    // Знайти рядок з заголовками або почати з першого рядка
                    let startRow = 0;
                    for (let i = 0; i < prizesData.length; i++) {
                        const row = prizesData[i];
                        if (row && row.length >= 2) {
                            const first = row[0] ? row[0].toString().toLowerCase() : '';
                            const second = row[1] ? row[1].toString().toLowerCase() : '';
                            
                            if ((first.includes('назв') || first.includes('name') || first.includes('приз')) && 
                                (second.includes('кільк') || second.includes('count') || second.includes('к-ст'))) {
                                startRow = i + 1;
                                break;
                            }
                        }
                    }
                    
                    // Завантажити дані призів
                    for (let i = startRow; i < prizesData.length; i++) {
                        const row = prizesData[i];
                        if (!row || row.length < 1) continue;
                        
                        const name = row[0] ? row[0].toString().trim() : '';
                        const count = row.length > 1 ? (parseInt(row[1]) || 1) : 1;
                        
                        if (name) {
                            prizes.push({ name, count });
                            prizesLoaded++;
                        }
                    }
                }
                
            } else {
                // СТАРИЙ ПІДХІД: Якщо тільки один лист, шукаємо дані на ньому
                window.Logger.log('[DataManager]', 'Знайдено один лист, використовуємо старий метод імпорту');
                
                const firstSheet = workbook.Sheets[sheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                if (jsonData.length < 2) {
                    alert('Excel файл не містить достатньо даних!');
                    return;
                }

                // Знайти секції учасників та призів
                let participantsStartRow = -1;
                let prizesStartRow = -1;
                
                for (let i = 0; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (row && row.length >= 2) {
                        // Шукаємо заголовки для учасників
                        if ((row[0] && row[0].toString().toLowerCase().includes('ім')) && 
                            (row[1] && row[1].toString().toLowerCase().includes('підрозділ')) &&
                            (row[2] && row[2].toString().toLowerCase().includes('ваг'))) {
                            participantsStartRow = i;
                        }
                        // Шукаємо заголовки для призів
                        if ((row[0] && row[0].toString().toLowerCase().includes('назв')) && 
                            (row[1] && (row[1].toString().toLowerCase().includes('кільк') || row[1].toString().toLowerCase().includes('к-сть')))) {
                            prizesStartRow = i;
                        }
                    }
                }

                // Якщо не знайшли заголовки, спробуємо автоматично
                if (participantsStartRow === -1) {
                    // Припускаємо що перші дані - учасники
                    participantsStartRow = 0;
                    // Знайти де починаються призи (шукаємо пустий рядок або зміну формату)
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length === 0 || (row[0] === '' && row[1] === '')) {
                            prizesStartRow = i + 1;
                            break;
                        }
                    }
                }

                // Завантажити учасників
                if (participantsStartRow >= 0) {
                    for (let i = participantsStartRow + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length < 3) continue;
                        
                        // Якщо дійшли до секції призів, зупинитися
                        if (i >= prizesStartRow && prizesStartRow > participantsStartRow) break;
                        
                        const name = row[colName] ? row[colName].toString().trim() : '';
                        const position = (colPosition >= 0 && row[colPosition]) ? row[colPosition].toString().trim() : '';
                        const division = row[colDivision] ? row[colDivision].toString().trim() : '';
                        const weight = (colWeight >= 0 && row[colWeight]) ? (parseInt(row[colWeight]) || 1) : 1;
                        
                        if (name && division && weight > 0) {
                            participants.push({ name, position, division, weight });
                            participantsLoaded++;
                        }
                    }
                }

                // Завантажити призи
                if (prizesStartRow >= 0) {
                    for (let i = prizesStartRow + 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        if (!row || row.length < 2) continue;
                        
                        const name = row[0] ? row[0].toString().trim() : '';
                        const count = parseInt(row[1]) || 1;
                        
                        if (name && count > 0) {
                            prizes.push({ name, count });
                            prizesLoaded++;
                        }
                    }
                }
            }

            // Обмеження кількості завантажених рядків
            let trimWarning = '';
            if (participants.length > EXCEL_VALIDATION.MAX_PARTICIPANTS) {
                participants = participants.slice(0, EXCEL_VALIDATION.MAX_PARTICIPANTS);
                participantsLoaded = EXCEL_VALIDATION.MAX_PARTICIPANTS;
                trimWarning += `\n⚠️ Учасників обрізано до ${EXCEL_VALIDATION.MAX_PARTICIPANTS} (максимально допустиме)`;
            }
            if (prizes.length > EXCEL_VALIDATION.MAX_PRIZES) {
                prizes = prizes.slice(0, EXCEL_VALIDATION.MAX_PRIZES);
                prizesLoaded = EXCEL_VALIDATION.MAX_PRIZES;
                trimWarning += `\n⚠️ Призів обрізано до ${EXCEL_VALIDATION.MAX_PRIZES} (максимально допустиме)`;
            }

            // Застосувати збережене сортування після імпорту
            applySavedSorting();
            
            // Оновити відображення
            if (typeof updateDisplay === 'function') updateDisplay();
            if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
            markAsChanged();
            
            let message = 'Excel файл успішно завантажено!';
            message += `\nУчасників: ${participantsLoaded}`;
            message += `\nПризів: ${prizesLoaded}`;
            message += trimWarning;
            
            if (sheetNames.length >= 2) {
                message += `\n\nВикористано окремі листи:`;
                message += `\n• Учасники: ${sheetNames[0] || 'перший лист'}`;
                message += `\n• Призи: ${sheetNames[1] || 'другий лист'}`;
            } else {
                message += '\n\nДані знайдено на одному листі';
            }
            
            alert(message);
            
        } catch (error) {
            window.Logger.error('[DataManager]', 'Помилка при читанні Excel файлу:', error);
            alert('Помилка при читанні Excel файлу! Переконайтеся що файл має правильний формат.');
        } finally {
            // Очистити input для можливості повторного імпорту
            event.target.value = '';
        }
    };
    reader.readAsBinaryString(file);
}

function exportToExcel() {
    if (participants.length === 0 && prizes.length === 0) {
        alert('Немає даних для експорту!');
        return;
    }

    // Створити новий workbook
    const wb = XLSX.utils.book_new();

    // Створити лист для учасників
    const participantsData = [];
    participantsData.push(['Ім\'я', 'Посада', 'Підрозділ', 'Вага']);
    participants.forEach(p => {
        participantsData.push([p.name, p.position || '', p.division || 'Не вказано', p.weight]);
    });
    
    // Створити лист для призів
    const prizesData = [];
    prizesData.push(['Назва', 'Кількість']);
    prizes.forEach(p => {
        prizesData.push([p.name, p.count]);
    });
    
    // Створити листи
    const participantsSheet = XLSX.utils.aoa_to_sheet(participantsData);
    const prizesSheet = XLSX.utils.aoa_to_sheet(prizesData);
    
    // Додати листи до workbook
    XLSX.utils.book_append_sheet(wb, participantsSheet, 'Учасники');
    XLSX.utils.book_append_sheet(wb, prizesSheet, 'Призи');

    // Зберегти файл
    const fileName = `raffle_data_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

function exportResultsToExcel() {
    if (results.length === 0) {
        alert('Немає результатів для експорту!');
        return;
    }

    // Створити новий workbook
    const wb = XLSX.utils.book_new();

    // Створити лист з результатами
    const wsResults = [];
    wsResults.push(['РЕЗУЛЬТАТИ РОЗІГРАШУ']);
    wsResults.push(['Дата:', new Date().toLocaleDateString('uk-UA')]);
    wsResults.push([]);
    wsResults.push(['Раунд', 'Переможець', 'Посада', 'Підрозділ', 'Приз']);
    
    results.forEach(result => {
        wsResults.push([result.round, result.winner, result.winnerPosition || '', result.winnerDivision || 'Не вказано', result.prize]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(wsResults);
    XLSX.utils.book_append_sheet(wb, ws1, "Результати");

    // Створити лист зі статистикою
    const winners = [...new Set(results.map(r => r.winner))];
    const prizesGiven = {};
    results.forEach(r => {
        prizesGiven[r.prize] = (prizesGiven[r.prize] || 0) + 1;
    });

    const wsStats = [];
    wsStats.push(['СТАТИСТИКА РОЗІГРАШУ']);
    wsStats.push([]);
    wsStats.push(['Загальна інформація']);
    wsStats.push(['Всього раундів:', results.length]);
    wsStats.push(['Унікальних переможців:', winners.length]);
    wsStats.push(['Призів роздано:', results.length]);
    wsStats.push([]);
    wsStats.push(['Призи по кількості']);
    wsStats.push(['Приз', 'Кількість']);
    
    Object.entries(prizesGiven).forEach(([prize, count]) => {
        wsStats.push([prize, count]);
    });

    wsStats.push([]);
    wsStats.push(['Переможці']);
    wsStats.push(['Ім\'я', 'Кількість перемог']);
    
    const winnerStats = {};
    results.forEach(r => {
        winnerStats[r.winner] = (winnerStats[r.winner] || 0) + 1;
    });
    
    Object.entries(winnerStats).forEach(([winner, count]) => {
        wsStats.push([winner, count]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(wsStats);
    XLSX.utils.book_append_sheet(wb, ws2, "Статистика");

    // Зберегти файл
    const fileName = `raffle_results_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// ===== ТЕСТОВІ ДАНІ (ПРЕСЕТИ) =====

const TEST_DATA_PRESETS = {
    corporate: {
        label: '🏢 Корпоратив',
        description: '10 співробітників з різних відділів, 5 призів',
        participants: [
            { name: 'Олексій Мороз',     position: 'Розробник',       division: 'Відділ розробки',   weight: 1 },
            { name: 'Марина Коваль',     position: 'Менеджер',        division: 'Відділ маркетингу', weight: 1 },
            { name: 'Дмитро Савченко',   position: 'Техлід',          division: 'Відділ розробки',   weight: 2 },
            { name: 'Ірина Бондар',      position: 'Менеджер',        division: 'HR відділ',         weight: 1 },
            { name: 'Сергій Левченко',   position: 'Аналітик',       division: 'Фінансовий відділ', weight: 1 },
            { name: 'Тетяна Мельник',    position: 'Менеджер',        division: 'Відділ продажів',   weight: 1 },
            { name: 'Василь Ткаченко',   position: 'Адміністратор',   division: 'IT підтримка',      weight: 1 },
            { name: 'Наталія Шевченко',  position: 'Лід маркетингу', division: 'Відділ маркетингу', weight: 2 },
            { name: 'Андрій Кравченко',  position: 'Менеджер',        division: 'Відділ продажів',   weight: 1 },
            { name: 'Оксана Лисенко',    position: 'Спеціаліст',      division: 'HR відділ',         weight: 1 },
        ],
        prizes: [
            { name: 'Сертифікат на відпустку',  count: 1 },
            { name: 'Подарунковий кошик',        count: 2 },
            { name: 'Корпоративний мерч',        count: 3 },
            { name: 'Знижка на навчання 50%',    count: 2 },
            { name: 'Квиток в кіно (2 особи)',   count: 2 },
        ]
    },
    it_team: {
        label: '💻 IT-команда',
        description: '12 IT-спеціалістів, 4 технічних призи',
        participants: [
            { name: 'Max Petrenko',     position: 'Developer',  division: 'Frontend',  weight: 1 },
            { name: 'Anna Sydorenko',   position: 'Developer',  division: 'Backend',   weight: 1 },
            { name: 'Ivan Kovalenko',   position: 'DevOps Eng', division: 'DevOps',    weight: 2 },
            { name: 'Olga Bondarenko',  position: 'QA Eng',     division: 'QA',        weight: 1 },
            { name: 'Vlad Tkachenko',   position: 'Developer',  division: 'Frontend',  weight: 1 },
            { name: 'Kate Marchenko',   position: 'Designer',   division: 'Design',    weight: 1 },
            { name: 'Yuri Savchenko',   position: 'Tech Lead',  division: 'Backend',   weight: 2 },
            { name: 'Lena Lysenko',     position: 'QA Eng',     division: 'QA',        weight: 1 },
            { name: 'Dmytro Moroz',     position: 'DevOps Eng', division: 'DevOps',    weight: 1 },
            { name: 'Sofia Levchenko',  position: 'Designer',   division: 'Design',    weight: 1 },
            { name: 'Andriy Ilchenko',  position: 'Developer',  division: 'Backend',   weight: 1 },
            { name: 'Natalia Boyko',    position: 'Developer',  division: 'Frontend',  weight: 1 },
        ],
        prizes: [
            { name: 'Механічна клавіатура',   count: 1 },
            { name: 'Підписка GitHub Copilot', count: 3 },
            { name: 'Курс на Udemy',           count: 4 },
            { name: 'Ігрова миша',             count: 2 },
        ]
    },
    school: {
        label: '🎓 Шкільний захід',
        description: '15 учнів з різних класів, 5 призів',
        participants: [
            { name: 'Петренко Олег',    position: 'Учень',  division: '9-А клас',  weight: 1 },
            { name: 'Коваль Софія',     position: 'Учень',  division: '10-Б клас', weight: 1 },
            { name: 'Мороз Артем',      position: 'Учень',  division: '11-А клас', weight: 1 },
            { name: 'Бондар Аліна',     position: 'Учень',  division: '9-Б клас',  weight: 1 },
            { name: 'Савченко Максим',  position: 'Староста',  division: '10-А клас', weight: 2 },
            { name: 'Ткач Вікторія',    position: 'Учень',  division: '8-А клас',  weight: 1 },
            { name: 'Лисенко Кирило',   position: 'Учень',  division: '9-А клас',  weight: 1 },
            { name: 'Шевченко Діана',   position: 'Учень',  division: '11-Б клас', weight: 1 },
            { name: 'Мельник Богдан',   position: 'Учень',  division: '10-А клас', weight: 1 },
            { name: 'Кравченко Юлія',   position: 'Староста',  division: '8-Б клас',  weight: 2 },
            { name: 'Levchenko Dima',   position: 'Student',  division: '9-Б клас',  weight: 1 },
            { name: 'Марченко Злата',   position: 'Учень',  division: '10-Б клас', weight: 1 },
            { name: 'Бойко Назар',      position: 'Учень',  division: '11-А клас', weight: 1 },
            { name: 'Іваненко Поліна',  position: 'Учень',  division: '8-А клас',  weight: 1 },
            { name: 'Гриценко Владислав', position: 'Староста',  division: '9-А клас',  weight: 1 },
        ],
        prizes: [
            { name: '🥇 Головний приз — планшет', count: 1 },
            { name: '🥈 Смарт-годинник',          count: 1 },
            { name: '🥉 Навушники',                count: 2 },
            { name: '📚 Набір книг',               count: 3 },
            { name: '🎒 Рюкзак',                   count: 3 },
        ]
    },
    small: {
        label: '🔬 Малий тест',
        description: '5 учасників, 3 призи — швидка перевірка',
        participants: [
            { name: 'Учасник Альфа',  position: 'Позиція 1', division: 'Команда А', weight: 1 },
            { name: 'Учасник Бета',   position: 'Позиція 2', division: 'Команда Б', weight: 2 },
            { name: 'Учасник Гамма',  position: 'Позиція 1', division: 'Команда А', weight: 1 },
            { name: 'Учасник Дельта', position: 'Позиція 2', division: 'Команда Б', weight: 1 },
            { name: 'Учасник Епсилон', position: 'Позиція 3', division: 'Команда В', weight: 3 },
        ],
        prizes: [
            { name: 'Перший приз',  count: 1 },
            { name: 'Другий приз',  count: 2 },
            { name: 'Третій приз',  count: 1 },
        ]
    },
    large: {
        label: '🏟️ Великий тест',
        description: '25 учасників, 8 різних призів',
        participants: [
            { name: 'Андрієнко Роман',   position: 'Спеціаліст', division: 'Відділ 1', weight: 1 },
            { name: 'Бойченко Ірина',    position: 'Аналітик',   division: 'Відділ 2', weight: 1 },
            { name: 'Василенко Павло',   position: 'Тімлід',     division: 'Відділ 1', weight: 2 },
            { name: 'Гончаренко Ольга',  position: 'Спеціаліст', division: 'Відділ 3', weight: 1 },
            { name: 'Даниленко Федір',   position: 'Менеджер',   division: 'Відділ 2', weight: 1 },
            { name: 'Євтушенко Ганна',   position: 'Спеціаліст', division: 'Відділ 4', weight: 1 },
            { name: 'Єрьоменко Тарас',   position: 'Тімлід',     division: 'Відділ 1', weight: 2 },
            { name: 'Жайворон Людмила',  position: 'Спеціаліст', division: 'Відділ 3', weight: 1 },
            { name: 'Захаренко Михайло', position: 'Аналітик',   division: 'Відділ 2', weight: 1 },
            { name: 'Іванченко Лариса',  position: 'Менеджер',   division: 'Відділ 4', weight: 1 },
            { name: 'Карпенко Василь',   position: 'Спеціаліст', division: 'Відділ 1', weight: 1 },
            { name: 'Коваленко Зінаїда', position: 'Тімлід',     division: 'Відділ 3', weight: 2 },
            { name: 'Лисиця Олег',       position: 'Спеціаліст', division: 'Відділ 2', weight: 1 },
            { name: 'Мазуренко Дарина',  position: 'Аналітик',   division: 'Відділ 4', weight: 1 },
            { name: 'Науменко Богдан',   position: 'Спеціаліст', division: 'Відділ 1', weight: 1 },
            { name: 'Олексієнко Тамара', position: 'Менеджер',   division: 'Відділ 3', weight: 1 },
            { name: 'Павленко Анатолій', position: 'Тімлід',     division: 'Відділ 2', weight: 2 },
            { name: 'Різниченко Катерина', position: 'Спеціаліст', division: 'Відділ 4', weight: 1 },
            { name: 'Семененко Юрій',    position: 'Аналітик',   division: 'Відділ 1', weight: 1 },
            { name: 'Тимченко Валентина', position: 'Спеціаліст', division: 'Відділ 3', weight: 1 },
            { name: 'Удовиченко Степан', position: 'Менеджер',   division: 'Відділ 2', weight: 1 },
            { name: 'Харченко Надія',    position: 'Тімлід',     division: 'Відділ 4', weight: 2 },
            { name: 'Цушко Антон',       position: 'Спеціаліст', division: 'Відділ 1', weight: 1 },
            { name: 'Шаповаленко Вера',  position: 'Аналітик',   division: 'Відділ 3', weight: 1 },
            { name: 'Щербаченко Іван',   position: 'Спеціаліст', division: 'Відділ 2', weight: 1 },
        ],
        prizes: [
            { name: '🏆 Гран-прі',        count: 1 },
            { name: '💰 Грошовий сертифікат 500₴', count: 2 },
            { name: '🎭 Квитки в театр',  count: 3 },
            { name: '🍕 Сертифікат в ресторан', count: 3 },
            { name: '📱 Чохол для смартфону', count: 4 },
            { name: '☕ Кавовий набір',   count: 4 },
            { name: '🧁 Торт на замовлення', count: 2 },
            { name: '🎮 Ігрова картка 300₴', count: 3 },
        ]
    }
};

/**
 * Завантажити тестові дані за вибраним пресетом
 * @param {string} presetId - ключ пресету з TEST_DATA_PRESETS
 */
function loadTestPreset(presetId) {
    const preset = TEST_DATA_PRESETS[presetId];
    if (!preset) {
        window.Logger.error('[DataManager]', `Невідомий пресет: ${presetId}`);
        return;
    }

    const hasData = participants.length > 0 || prizes.length > 0;
    if (hasData) {
        if (!confirm(`Поточні дані будуть замінені пресетом "${preset.label}".\nУчасників: ${preset.participants.length}, Призів: ${preset.prizes.reduce((s, p) => s + p.count, 0)} шт. (${preset.prizes.length} типів).\n\nПродовжити?`)) {
            return;
        }
    }

    participants = preset.participants.map(p => ({ ...p }));
    prizes = preset.prizes.map(p => ({ ...p }));

    if (typeof updateDisplay === 'function') updateDisplay();
    if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
    markAsChanged();

    window.Logger.log('[DataManager]', `Завантажено пресет "${preset.label}": ${participants.length} учасників, ${prizes.length} типів призів`);
}

// ===== ФУНКЦІЇ ОЧИЩЕННЯ РЕЗУЛЬТАТІВ =====

function clearResults() {
    if (results.length === 0) {
        alert('Результати вже порожні!');
        return;
    }

    if (confirm('Ви впевнені, що хочете очистити всі результати?')) {
        // createBackup() видалено - автозбереження достатньо
        results = [];
        currentRound = 0; // Скинути лічильник раундів
        if (typeof updateResultsDisplay === 'function') updateResultsDisplay();
        if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
        markAsChanged();
    }
}

// ===== ДОПОМІЖНІ ФУНКЦІЇ =====

// Функція для встановлення тексту барабану з title атрибутом
function setDrumText(drumElement, text) {
    if (drumElement) {
        drumElement.textContent = text;
        drumElement.title = text; // Показує повний текст при наведенні
    }
}

// ===== ЕКСПОРТ ФУНКЦІЙ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПУ =====

// Зробити функції доступними глобально для використання в інших модулях та HTML
window.DataManager = {
    // Змінні
    get participants() { return participants; },
    set participants(value) { participants = value; },
    get prizes() { return prizes; },
    set prizes(value) { prizes = value; },
    get results() { return results; },
    set results(value) { results = value; },
    get availableParticipants() { return availableParticipants; },
    set availableParticipants(value) { availableParticipants = value; },
    get availablePrizes() { return availablePrizes; },
    set availablePrizes(value) { availablePrizes = value; },
    get currentRound() { return currentRound; },
    set currentRound(value) { currentRound = value; },
    get isRaffleActive() { return isRaffleActive; },
    set isRaffleActive(value) { isRaffleActive = value; },
    get hasUnsavedChanges() { return hasUnsavedChanges; },
    set hasUnsavedChanges(value) { hasUnsavedChanges = value; },
    
    // Константи
    STORAGE_KEYS,
    
    // Функції
    saveToStorage,
    loadFromStorage,
    clearStoredData,
    setupAutoSave,
    setupBeforeUnload,
    showAutoSaveStatus,
    markAsChanged,
    addParticipant,
    removeParticipant,
    updateParticipant,
    addPrize,
    removePrize,
    updatePrize,
    loadExcelData,
    handleExcelLoad,
    exportToExcel,
    exportResultsToExcel,
    clearResults,
    restoreRaffleButtonState,
    
    // Функції сортування та перемішування
    sortParticipants,
    shuffleParticipants,
    saveSortState,
    loadSortState,
    applySavedSorting,
    get participantsSortState() { return participantsSortState; },

    // Тестові дані
    TEST_DATA_PRESETS,
    loadTestPreset
};

// Глобальні функції видалено - використовуються через обгортки в main.js або DataManager модуль