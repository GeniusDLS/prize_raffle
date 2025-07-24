/**
 * DATA MANAGER MODULE
 * Відповідає за управління даними, збереження та Excel операції
 */

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
    PARTICIPANTS_SORT: 'raffle_participants_sort'
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
        console.error('Помилка збереження:', error);
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
                    console.error('Помилка відновлення стану розіграшу:', e);
                }
            }, 100); // Невелика затримка для завантаження DOM
        }

        const lastSave = localStorage.getItem(STORAGE_KEYS.LAST_SAVE);
        if (lastSave) {
            const saveDate = new Date(lastSave);
            console.log('Дані відновлено з:', saveDate.toLocaleString('uk-UA'));
            if (isRaffleActive) {
                console.log('Відновлено активний розіграш. Поточний раунд:', currentRound);
                
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
        console.error('Помилка завантаження:', error);
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
        
        console.log('Відновлено стан кнопки "наступний раунд" для активного розіграшу');
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

    participants.push({ name, division, weight });
    
    // Очистити форму
    const nameInput = document.getElementById('participant-name');
    const divisionInput = document.getElementById('participant-division');
    const weightInput = document.getElementById('participant-weight');
    
    if (nameInput) nameInput.value = '';
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
    if (confirm('Видалити цього учасника?')) {
        participants.splice(index, 1);
        if (typeof updateDisplay === 'function') updateDisplay();
        if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
        markAsChanged();
    }
}

// ===== СОРТУВАННЯ ТА ПЕРЕМІШУВАННЯ УЧАСНИКІВ =====

// Криптографічно безпечний генератор випадкових чисел
function secureRandom() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / (0xffffffff + 1);
    } else {
        return Math.random();
    }
}

// Сортування учасників за вказаним полем
function sortParticipants(field, direction = null) {
    if (participants.length === 0) {
        console.warn('Немає учасників для сортування');
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

    console.log(`Учасників відсортовано за полем "${field}" у напрямку "${direction}"`);
}

// Перемішування учасників у випадковому порядку
function shuffleParticipants() {
    if (participants.length === 0) {
        console.warn('Немає учасників для перемішування');
        return;
    }

    // Алгоритм Fisher-Yates з криптографічною випадковістю
    const array = [...participants];
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(secureRandom() * (i + 1));
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

    console.log('Учасників перемішано у випадковому порядку');
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
        console.error('Помилка збереження стану сортування:', error);
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
        console.error('Помилка завантаження стану сортування:', error);
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
    if (confirm('Видалити цей приз?')) {
        prizes.splice(index, 1);
        if (typeof updateDisplay === 'function') updateDisplay();
        if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
        markAsChanged();
    }
}

// ===== EXCEL ФУНКЦІЇ =====

function loadExcelData() {
    const input = document.getElementById('excel-input');
    if (input) input.click();
}

function handleExcelLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

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
                console.log('Знайдено кілька листів, використовуємо окремі листи для імпорту');
                
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
                    
                    console.log(`Завантажуємо учасників з листа: ${sheetNames[participantsSheetIndex]}`);
                    
                    // Знайти рядок з заголовками або почати з першого рядка
                    let startRow = 0;
                    for (let i = 0; i < participantsData.length; i++) {
                        const row = participantsData[i];
                        if (row && row.length >= 3) {
                            const first = row[0] ? row[0].toString().toLowerCase() : '';
                            const second = row[1] ? row[1].toString().toLowerCase() : '';
                            const third = row[2] ? row[2].toString().toLowerCase() : '';
                            
                            if ((first.includes('ім') || first.includes('name')) && 
                                (second.includes('підрозділ') || second.includes('division') || second.includes('відділ')) && 
                                (third.includes('ваг') || third.includes('weight') || third.includes('пріоритет'))) {
                                startRow = i + 1;
                                break;
                            }
                        }
                    }
                    
                    // Завантажити дані учасників
                    for (let i = startRow; i < participantsData.length; i++) {
                        const row = participantsData[i];
                        if (!row || row.length < 2) continue;
                        
                        const name = row[0] ? row[0].toString().trim() : '';
                        const division = row[1] ? row[1].toString().trim() : '';
                        const weight = row.length > 2 ? (parseInt(row[2]) || 1) : 1;
                        
                        if (name) {
                            participants.push({ name, division, weight });
                            participantsLoaded++;
                        }
                    }
                }
                
                // Завантажити призи з відповідного листа
                if (prizesSheetIndex >= 0 && prizesSheetIndex < sheetNames.length) {
                    const prizesSheet = workbook.Sheets[sheetNames[prizesSheetIndex]];
                    const prizesData = XLSX.utils.sheet_to_json(prizesSheet, { header: 1 });
                    
                    console.log(`Завантажуємо призи з листа: ${sheetNames[prizesSheetIndex]}`);
                    
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
                console.log('Знайдено один лист, використовуємо старий метод імпорту');
                
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
                        
                        const name = row[0] ? row[0].toString().trim() : '';
                        const division = row[1] ? row[1].toString().trim() : '';
                        const weight = parseInt(row[2]) || 1;
                        
                        if (name && division && weight > 0) {
                            participants.push({ name, division, weight });
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

            // Застосувати збережене сортування після імпорту
            applySavedSorting();
            
            // Оновити відображення
            if (typeof updateDisplay === 'function') updateDisplay();
            if (typeof initializeRaffleStats === 'function') initializeRaffleStats();
            markAsChanged();
            
            let message = 'Excel файл успішно завантажено!';
            message += `\nУчасників: ${participantsLoaded}`;
            message += `\nПризів: ${prizesLoaded}`;
            
            if (sheetNames.length >= 2) {
                message += `\n\nВикористано окремі листи:`;
                message += `\n• Учасники: ${sheetNames[0] || 'перший лист'}`;
                message += `\n• Призи: ${sheetNames[1] || 'другий лист'}`;
            } else {
                message += '\n\nДані знайдено на одному листі';
            }
            
            alert(message);
            
        } catch (error) {
            console.error('Помилка при читанні Excel файлу:', error);
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
    participantsData.push(['Ім\'я', 'Підрозділ', 'Вага']);
    participants.forEach(p => {
        participantsData.push([p.name, p.division || 'Не вказано', p.weight]);
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
    wsResults.push(['Раунд', 'Переможець', 'Підрозділ', 'Приз']);
    
    results.forEach(result => {
        wsResults.push([result.round, result.winner, result.winnerDivision || 'Не вказано', result.prize]);
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
    addPrize,
    removePrize,
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
    get participantsSortState() { return participantsSortState; }
};

// Глобальні функції видалено - використовуються через обгортки в main.js або DataManager модуль