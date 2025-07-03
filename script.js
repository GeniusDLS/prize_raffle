// Глобальні змінні
let participants = [];
let prizes = [];
let results = [];
let availableParticipants = [];
let availablePrizes = [];
let currentRound = 0;
let isRaffleActive = false;
let hasUnsavedChanges = false;

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
    BACKUP: 'raffle_backup',
    LAST_SAVE: 'raffle_last_save',
    ANIMATION_SETTINGS: 'raffle_animation_settings'
};

// Налаштування анімації за замовчуванням
const DEFAULT_ANIMATION_SETTINGS = {
    spinDuration: 2, // секунди
    spinSpeed: 100, // мілісекунди
    resultHighlightDuration: 3, // секунди
    popupCountdownTime: 10, // секунди
    enableSound: false
};

let animationSettings = { ...DEFAULT_ANIMATION_SETTINGS };

// Ініціалізація
document.addEventListener('DOMContentLoaded', function() {
    loadFromStorage();
    loadAnimationSettings(); // Завантажити налаштування анімації
    updateDisplay();
    updateResultsDisplay(); // Оновити результати при завантаженні
    setupAutoSave();
    setupBeforeUnload();
});

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
            newBtnVisible: document.getElementById('new-raffle-btn')?.style.display !== 'none',
            raffleMessage: document.getElementById('raffle-message')?.innerHTML || ''
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
                    const raffleMessage = document.getElementById('raffle-message');
                    
                    if (participantDrum) participantDrum.textContent = raffleState.participantDrumText;
                    if (prizeDrum) prizeDrum.textContent = raffleState.prizeDrumText;
                    if (startBtn) startBtn.style.display = raffleState.startBtnVisible ? 'inline-block' : 'none';
                    if (nextBtn) nextBtn.style.display = raffleState.nextBtnVisible ? 'inline-block' : 'none';
                    if (newBtn) newBtn.style.display = raffleState.newBtnVisible ? 'inline-block' : 'none';
                    if (raffleMessage) raffleMessage.innerHTML = raffleState.raffleMessage;
                    
                } catch (e) {
                    console.error('Помилка відновлення стану розіграшу:', e);
                }
            }, 100); // Невелика затримка для завантаження DOM
        }

        // Ініціалізувати статистику для сторінки розіграшу
        if (isRaffleActive) {
            // Якщо розіграш активний, показуємо поточний стан
            setTimeout(() => updateRaffleStats(), 50);
        } else {
            // Якщо розіграш не активний, показуємо загальну статистику
            setTimeout(() => initializeRaffleStats(), 50);
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
    } catch (error) {
        console.error('Помилка завантаження:', error);
    }
}

function createBackup() {
    try {
        const backupData = {
            participants: participants,
            prizes: prizes,
            results: results,
            currentRound: currentRound,
            isRaffleActive: isRaffleActive,
            availableParticipants: availableParticipants,
            availablePrizes: availablePrizes,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(backupData));
    } catch (error) {
        console.error('Помилка створення резервної копії:', error);
    }
}

function clearStoredData() {
    if (confirm('Видалити всі збережені дані? Ця дія незворотна.')) {
        createBackup(); // Створюємо резервну копію перед видаленням
        
        localStorage.removeItem(STORAGE_KEYS.PARTICIPANTS);
        localStorage.removeItem(STORAGE_KEYS.PRIZES);
        localStorage.removeItem(STORAGE_KEYS.RESULTS);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_ROUND);
        localStorage.removeItem(STORAGE_KEYS.IS_RAFFLE_ACTIVE);
        localStorage.removeItem(STORAGE_KEYS.AVAILABLE_PARTICIPANTS);
        localStorage.removeItem(STORAGE_KEYS.AVAILABLE_PRIZES);
        localStorage.removeItem(STORAGE_KEYS.RAFFLE_STATE);
        localStorage.removeItem(STORAGE_KEYS.LAST_SAVE);
        // Налаштування анімації не очищаються: STORAGE_KEYS.ANIMATION_SETTINGS
        
        participants = [];
        prizes = [];
        results = [];
        currentRound = 0;
        isRaffleActive = false;
        availableParticipants = [];
        availablePrizes = [];
        
        // Оновити всі сторінки
        updateDisplay();
        initializeRaffleStats();
        updateResultsDisplay();
        
        // Скинути інтерфейс розіграшу
        document.getElementById('participant-drum').textContent = 'Готовий до розіграшу!';
        document.getElementById('prize-drum').textContent = 'Готовий до розіграшу!';
        document.getElementById('start-raffle-btn').style.display = 'inline-block';
        document.getElementById('next-round-btn').style.display = 'none';
        document.getElementById('new-raffle-btn').style.display = 'none';
        document.getElementById('raffle-message').innerHTML = '';
        
        alert('Всі збережені дані видалено! Резервна копія створена.');
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

// ===== НАВІГАЦІЯ =====

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    document.getElementById(pageId + '-page').classList.add('active');
    event.target.classList.add('active');
    
    if (pageId === 'raffle') {
        // Якщо розіграш не активний, показуємо загальну статистику
        if (!isRaffleActive) {
            initializeRaffleStats();
        } else {
            updateRaffleStats();
        }
    } else if (pageId === 'results') {
        updateResultsDisplay();
    }
}

// ===== СТАТИСТИКА =====

// Ініціалізація статистики для сторінки розіграшу
function initializeRaffleStats() {
    // Показуємо загальну кількість доступних учасників та призів
    const totalParticipants = participants.length;
    let totalPrizes = 0;
    prizes.forEach(prize => {
        totalPrizes += prize.count;
    });
    
    document.getElementById('total-participants').textContent = totalParticipants;
    document.getElementById('total-prizes').textContent = totalPrizes;
    document.getElementById('current-round').textContent = currentRound;
}

function updateRaffleStats() {
    document.getElementById('total-participants').textContent = availableParticipants.length;
    document.getElementById('total-prizes').textContent = availablePrizes.length;
    document.getElementById('current-round').textContent = currentRound;
}

// ===== УЧАСНИКИ =====

function addParticipant() {
    const name = document.getElementById('participant-name').value.trim();
    const division = document.getElementById('participant-division').value.trim();
    const weight = parseInt(document.getElementById('participant-weight').value);
    const errorDiv = document.getElementById('participants-error');

    errorDiv.style.display = 'none';

    if (!name) {
        showError('participants-error', 'Введіть ім\'я учасника');
        return;
    }

    if (!division) {
        showError('participants-error', 'Введіть підрозділ');
        return;
    }

    if (!weight || weight < 1) {
        showError('participants-error', 'Вага повинна бути більше 0');
        return;
    }

    if (participants.some(p => p.name === name)) {
        showError('participants-error', 'Учасник з таким ім\'ям вже існує');
        return;
    }

    participants.push({ name, division, weight });
    document.getElementById('participant-name').value = '';
    document.getElementById('participant-division').value = '';
    document.getElementById('participant-weight').value = '1';
    updateDisplay();
    initializeRaffleStats(); // Оновити статистику розіграшу
    markAsChanged();
}

function removeParticipant(index) {
    if (confirm('Видалити цього учасника?')) {
        participants.splice(index, 1);
        updateDisplay();
        initializeRaffleStats(); // Оновити статистику розіграшу
        markAsChanged();
    }
}

// ===== ПРИЗИ =====

function addPrize() {
    const name = document.getElementById('prize-name').value.trim();
    const count = parseInt(document.getElementById('prize-count').value);
    const errorDiv = document.getElementById('prizes-error');

    errorDiv.style.display = 'none';

    if (!name) {
        showError('prizes-error', 'Введіть назву призу');
        return;
    }

    if (!count || count < 1) {
        showError('prizes-error', 'Кількість повинна бути більше 0');
        return;
    }

    prizes.push({ name, count });
    document.getElementById('prize-name').value = '';
    document.getElementById('prize-count').value = '1';
    updateDisplay();
    initializeRaffleStats(); // Оновити статистику розіграшу
    markAsChanged();
}

function removePrize(index) {
    if (confirm('Видалити цей приз?')) {
        prizes.splice(index, 1);
        updateDisplay();
        initializeRaffleStats(); // Оновити статистику розіграшу
        markAsChanged();
    }
}

// ===== ВІДОБРАЖЕННЯ =====

function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function updateDisplay() {
    updateParticipantsList();
    updatePrizesList();
}

function updateParticipantsList() {
    const tbody = document.getElementById('participants-list');
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

// ===== РОЗІГРАШ =====

function startRaffle() {
    if (participants.length === 0) {
        alert('Додайте учасників для розіграшу!');
        return;
    }

    if (prizes.length === 0) {
        alert('Додайте призи для розіграшу!');
        return;
    }

    // Ініціалізація розіграшу
    availableParticipants = [...participants];
    availablePrizes = [];
    
    // Розгорнути призи за кількістю
    prizes.forEach(prize => {
        for (let i = 0; i < prize.count; i++) {
            availablePrizes.push(prize.name);
        }
    });

    results = [];
    currentRound = 0;
    isRaffleActive = true;

    document.getElementById('start-raffle-btn').style.display = 'none';
    updateRaffleStats();
    markAsChanged(); // Зберегти початок розіграшу
    nextRound();
}

function nextRound() {
    if (availableParticipants.length === 0 || availablePrizes.length === 0) {
        endRaffle();
        return;
    }

    currentRound++;
    updateRaffleStats();

    // Анімація барабанів
    const participantDrum = document.getElementById('participant-drum');
    const prizeDrum = document.getElementById('prize-drum');

    participantDrum.classList.add('spinning');
    prizeDrum.classList.add('spinning');

    // Показати випадкові імена під час обертання
    const spinInterval = setInterval(() => {
        participantDrum.textContent = availableParticipants[Math.floor(Math.random() * availableParticipants.length)].name;
        prizeDrum.textContent = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
    }, animationSettings.spinSpeed);

    // Зупинити через налаштований час і показати результат
    setTimeout(() => {
        clearInterval(spinInterval);
        
        // Вибір переможця з урахуванням ваги
        const winner = selectWeightedRandom(availableParticipants);
        const prizeIndex = Math.floor(Math.random() * availablePrizes.length);
        const wonPrize = availablePrizes[prizeIndex];

        participantDrum.textContent = winner.name;
        prizeDrum.textContent = wonPrize;

        participantDrum.classList.remove('spinning');
        prizeDrum.classList.remove('spinning');

        // Додати легкий ефект підсвічування результату
        participantDrum.classList.add('result-highlight');
        prizeDrum.classList.add('result-highlight');
        
        // Прибрати підсвічування через налаштований час
        setTimeout(() => {
            participantDrum.classList.remove('result-highlight');
            prizeDrum.classList.remove('result-highlight');
        }, animationSettings.resultHighlightDuration * 1000);

        // Зберегти результат
        results.push({
            round: currentRound,
            winner: winner.name,
            winnerDivision: winner.division,
            prize: wonPrize
        });

        // Показати popup з привітанням переможця після короткої паузи
        setTimeout(() => {
            showWinnerPopup(winner.name, winner.division, wonPrize);
        }, 1000); // Пауза 1 секунда для осмислення результату

        // Видалити переможця та приз
        availableParticipants = availableParticipants.filter(p => p.name !== winner.name);
        availablePrizes.splice(prizeIndex, 1);

        updateRaffleStats();
        markAsChanged(); // Зберегти поточний стан

        // Показати кнопку наступного раунду або завершення
        if (availableParticipants.length > 0 && availablePrizes.length > 0) {
            document.getElementById('next-round-btn').style.display = 'inline-block';
            document.getElementById('raffle-message').innerHTML = 
                `🎉 <strong>${winner.name}</strong> виграв <strong>${wonPrize}</strong>!<br>Натисніть "Наступний раунд" для продовження.`;
        } else {
            endRaffle();
        }
    }, animationSettings.spinDuration * 1000);

    document.getElementById('next-round-btn').style.display = 'none';
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
    isRaffleActive = false;
    document.getElementById('next-round-btn').style.display = 'none';
    document.getElementById('start-raffle-btn').style.display = 'none';
    document.getElementById('new-raffle-btn').style.display = 'inline-block';
    document.getElementById('raffle-message').innerHTML = 
        `🎊 <strong>Розіграш завершено!</strong><br>Перейдіть на сторінку результатів для перегляду переможців.`;
    
    markAsChanged(); // Зберегти завершений стан
    saveToStorage(); // Автоматично зберегти результати
}

function startNewRaffle() {
    if (confirm('Розпочати новий розіграш? Попередні результати будуть збережені.')) {
        // Скидаємо тільки поточний стан розіграшу, але зберігаємо результати
        currentRound = 0;
        isRaffleActive = false;
        availableParticipants = [];
        availablePrizes = [];
        
        document.getElementById('participant-drum').textContent = 'Готовий до розіграшу!';
        document.getElementById('prize-drum').textContent = 'Готовий до розіграшу!';
        document.getElementById('start-raffle-btn').style.display = 'inline-block';
        document.getElementById('next-round-btn').style.display = 'none';
        document.getElementById('new-raffle-btn').style.display = 'none';
        document.getElementById('raffle-message').innerHTML = '';
        
        initializeRaffleStats(); // Оновити статистику
        markAsChanged(); // Зберегти новий стан
    }
}

function resetRaffle() {
    if (!confirm('Ви впевнені, що хочете скинути розіграш? Всі поточні результати будуть втрачені.')) {
        return;
    }

    createBackup(); // Створюємо резервну копію перед скиданням

    currentRound = 0;
    isRaffleActive = false;
    availableParticipants = [];
    availablePrizes = [];
    results = [];
    
    document.getElementById('participant-drum').textContent = 'Готовий до розіграшу!';
    document.getElementById('prize-drum').textContent = 'Готовий до розіграшу!';
    document.getElementById('start-raffle-btn').style.display = 'inline-block';
    document.getElementById('next-round-btn').style.display = 'none';
    document.getElementById('new-raffle-btn').style.display = 'none';
    document.getElementById('raffle-message').innerHTML = '';
    
    initializeRaffleStats(); // Оновити статистику (показати загальну кількість)
    updateResultsDisplay(); // Оновити результати
    markAsChanged();
}

// ===== РЕЗУЛЬТАТИ =====

function updateResultsDisplay() {
    document.getElementById('results-total-rounds').textContent = results.length;
    document.getElementById('results-winners').textContent = new Set(results.map(r => r.winner)).size;
    document.getElementById('results-prizes-given').textContent = results.length;

    const resultsList = document.getElementById('results-list');
    
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

function clearResults() {
    if (results.length === 0) {
        alert('Результати вже порожні!');
        return;
    }

    if (confirm('Ви впевнені, що хочете очистити всі результати?')) {
        createBackup(); // Створюємо резервну копію
        results = [];
        currentRound = 0; // Скинути лічильник раундів
        updateResultsDisplay();
        initializeRaffleStats(); // Оновити статистику
        markAsChanged();
    }
}

// ===== EXCEL ФУНКЦІЇ =====

function loadExcelData() {
    document.getElementById('excel-input').click();
}

function handleExcelLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = e.target.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            
            // Створити резервну копію перед імпортом
            createBackup();
            
            // Очистити поточні дані
            participants = [];
            prizes = [];
            
            // Перевірити чи є листи
            const sheetNames = workbook.SheetNames;
            
            if (sheetNames.length === 0) {
                alert('Excel файл не містить листів!');
                return;
            }

            // Спробувати знайти дані на першому листі
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
            let participantsLoaded = 0;
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
            let prizesLoaded = 0;
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

            updateDisplay();
            initializeRaffleStats(); // Оновити статистику розіграшу
            markAsChanged();
            
            alert(`Excel файл успішно завантажено!\nУчасників: ${participantsLoaded}\nПризів: ${prizesLoaded}`);
            
        } catch (error) {
            console.error('Помилка при читанні Excel файлу:', error);
            alert('Помилка при читанні Excel файлу! Переконайтеся що файл має правильний формат.');
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

// ===== ОБРОБНИКИ ПОДІЙ =====

// Обробка Enter для форм
document.getElementById('participant-name').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addParticipant();
});

document.getElementById('participant-division').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addParticipant();
});

document.getElementById('participant-weight').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addParticipant();
});

document.getElementById('prize-name').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addPrize();
});

document.getElementById('prize-count').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addPrize();
});

// ===== POPUP ПЕРЕМОЖЦЯ =====

let popupCountdownInterval = null;
let popupAutoCloseTimeout = null;

function showWinnerPopup(winnerName, winnerDivision, prizeName) {
    const popup = document.getElementById('winner-popup');
    const winnerNameEl = document.getElementById('winner-name');
    const winnerDivisionEl = document.getElementById('winner-division');
    const winnerPrizeEl = document.getElementById('winner-prize');
    const countdownTimer = document.getElementById('countdown-timer');
    
    // Оновити інформацію про переможця
    winnerNameEl.textContent = winnerName;
    winnerDivisionEl.textContent = winnerDivision || 'Не вказано';
    winnerPrizeEl.textContent = prizeName;
    
    // Показати popup
    popup.style.display = 'flex';
    
    // Запустити countdown таймер
    let timeLeft = animationSettings.popupCountdownTime;
    countdownTimer.textContent = timeLeft;
    
    popupCountdownInterval = setInterval(() => {
        timeLeft--;
        countdownTimer.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(popupCountdownInterval);
        }
    }, 1000);
    
    // Автоматично сховати через налаштований час
    popupAutoCloseTimeout = setTimeout(() => {
        hideWinnerPopup();
    }, animationSettings.popupCountdownTime * 1000);
}

function hideWinnerPopup() {
    const popup = document.getElementById('winner-popup');
    
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

// Закрити popup при кліку на overlay та при натисканні Escape
document.addEventListener('DOMContentLoaded', function() {
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
});

// ===== НАЛАШТУВАННЯ АНІМАЦІЇ =====

function showAnimationSettings() {
    // Приховати всі сторінки
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    // Показати сторінку налаштувань
    document.getElementById('animation-settings-page').classList.add('active');
    
    // Завантажити поточні налаштування
    loadAnimationSettingsToForm();
}

function hideAnimationSettings() {
    document.getElementById('animation-settings-page').classList.remove('active');
    // Повернутися на сторінку даних
    showPage('data');
}

function loadAnimationSettingsToForm() {
    document.getElementById('spin-duration').value = animationSettings.spinDuration;
    document.getElementById('spin-speed').value = animationSettings.spinSpeed;
    document.getElementById('result-highlight-duration').value = animationSettings.resultHighlightDuration;
    document.getElementById('popup-countdown-time').value = animationSettings.popupCountdownTime;
    document.getElementById('enable-sound').checked = animationSettings.enableSound;
}

function saveAnimationSettings() {
    animationSettings = {
        spinDuration: parseFloat(document.getElementById('spin-duration').value) || DEFAULT_ANIMATION_SETTINGS.spinDuration,
        spinSpeed: parseInt(document.getElementById('spin-speed').value) || DEFAULT_ANIMATION_SETTINGS.spinSpeed,
        resultHighlightDuration: parseFloat(document.getElementById('result-highlight-duration').value) || DEFAULT_ANIMATION_SETTINGS.resultHighlightDuration,
        popupCountdownTime: parseInt(document.getElementById('popup-countdown-time').value) || DEFAULT_ANIMATION_SETTINGS.popupCountdownTime,
        enableSound: document.getElementById('enable-sound').checked
    };
    
    // Зберегти в localStorage
    localStorage.setItem(STORAGE_KEYS.ANIMATION_SETTINGS, JSON.stringify(animationSettings));
    
    alert('Налаштування анімації збережено!');
}

function resetAnimationSettings() {
    if (confirm('Скинути всі налаштування анімації на значення за замовчуванням?')) {
        animationSettings = { ...DEFAULT_ANIMATION_SETTINGS };
        localStorage.setItem(STORAGE_KEYS.ANIMATION_SETTINGS, JSON.stringify(animationSettings));
        loadAnimationSettingsToForm();
        alert('Налаштування скинуто на значення за замовчуванням!');
    }
}

function loadAnimationSettings() {
    try {
        const savedSettings = localStorage.getItem(STORAGE_KEYS.ANIMATION_SETTINGS);
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
