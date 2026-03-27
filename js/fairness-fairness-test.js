/**
 * FAIRNESS FAIRNESS TEST MODULE
 * Тест справедливості — комплексна перевірка з індексом Джині та довірчими інтервалами
 * Залежності: window.FairnessTests (fairness-tests.js) → window.DataManager, window.UIController, window.Logger
 */

// ===== ОСНОВНІ ФУНКЦІЇ =====

/**
 * Запускає тест справедливості
 */
async function runFairnessTest() {
    const countInput = document.getElementById('fairness-test-count');
    const simulationCount = parseInt(countInput?.value) || TEST_CONSTANTS.DEFAULT_SIMULATIONS;

    if (simulationCount < TEST_CONSTANTS.MIN_SIMULATIONS || simulationCount > TEST_CONSTANTS.MAX_SIMULATIONS) {
        alert(`Кількість симуляцій має бути від ${TEST_CONSTANTS.MIN_SIMULATIONS} до ${TEST_CONSTANTS.MAX_SIMULATIONS}`);
        return;
    }

    // Перевірити наявність учасників
    if (!window.DataManager || !window.DataManager.participants || window.DataManager.participants.length === 0) {
        alert('Додайте учасників на сторінці "Дані" для проведення тесту справедливості!');
        return;
    }

    // Перевірити наявність призів
    if (!window.DataManager || !window.DataManager.prizes || window.DataManager.prizes.length === 0) {
        alert('Додайте призи на сторінці "Дані" для проведення тесту справедливості!');
        return;
    }

    const participants = window.DataManager.participants;
    if (participants.length < 2) {
        alert('Для тесту справедливості потрібно мінімум 2 учасники!');
        return;
    }

    // Показати статус виконання
    showFairnessTestStatus('Виконується тест справедливості...', true);
    hideFairnessTestResults();

    try {
        // Провести симуляції розіграшу
        const simulationResults = await simulateFairnessTest(participants, simulationCount);

        // Обчислити статистику справедливості
        const stats = calculateFairnessStatistics(participants, simulationResults);

        // Відобразити результати
        displayFairnessTestResults(stats);

        hideFairnessTestStatus();

    } catch (error) {
        window.Logger.error('[FairnessTests]', 'Помилка під час тестування справедливості:', error);
        showFairnessTestStatus('Помилка під час виконання тесту справедливості', false);
    }
}

/**
 * Симулює багато одиночних виборів для тесту справедливості
 * Перевіряє якість одного вибору: чи відповідає ймовірність перемоги вазі учасника
 */
async function simulateFairnessTest(participants, simulationCount) {
    window.Logger.log('[FairnessTests]', `Симуляція ${simulationCount} виборів для тесту справедливості...`);

    const results = {};
    participants.forEach(participant => {
        results[participant.name] = 0;
    });

    const startTime = performance.now();

    for (let i = 0; i < simulationCount; i++) {
        // Одиночний незалежний вибір — перевіряє точність ймовірностей
        const winner = secureWeightedRandom(participants);
        results[winner.name]++;

        // Показувати прогрес кожні 500 ітерацій
        if (i % 500 === 0 && i > 0) {
            updateFairnessTestStatus(`Проведено ${i}/${simulationCount} симуляцій...`);
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }

    const endTime = performance.now();
    window.Logger.log('[FairnessTests]', `Симуляція справедливості завершена за ${(endTime - startTime).toFixed(2)}мс`);

    return {
        results: results,
        totalRaffles: simulationCount,
        roundsPerRaffle: 1,
        totalWins: simulationCount
    };
}

/**
 * Обчислює статистику справедливості на основі реальних розіграшів
 */
function calculateFairnessStatistics(participants, simulationData) {
    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
    const { results: observedResults, totalRaffles, roundsPerRaffle, totalWins } = simulationData;

    // Обчислити статистику для кожного учасника
    const participantStats = participants.map(participant => {
        const expectedProbability = participant.weight / totalWeight;
        const expectedCount = expectedProbability * totalWins; // Загальна кількість перемог
        const observedCount = observedResults[participant.name] || 0;
        const deviation = observedCount - expectedCount;
        const relativeDeviation = Math.abs(deviation) / expectedCount;

        // Довірчий інтервал (95%) для біноміального розподілу
        const variance = totalWins * expectedProbability * (1 - expectedProbability);
        const standardDeviation = Math.sqrt(variance);
        const confidenceMargin = 1.96 * standardDeviation; // Z for 95%
        const confidenceInterval = {
            lower: Math.max(0, expectedCount - confidenceMargin),
            upper: expectedCount + confidenceMargin
        };
        const isInConfidenceInterval = observedCount >= confidenceInterval.lower && observedCount <= confidenceInterval.upper;

        return {
            name: participant.name,
            weight: participant.weight,
            expectedProbability: expectedProbability,
            expectedCount: expectedCount,
            observedCount: observedCount,
            deviation: deviation,
            relativeDeviation: relativeDeviation,
            confidenceInterval: confidenceInterval,
            isInConfidenceInterval: isInConfidenceInterval
        };
    });

    // Підрахувати кількість учасників у довірчих інтервалах
    const participantsInConfidence = participantStats.filter(stat => stat.isInConfidenceInterval).length;

    // Обчислити індекс Джині (міра нерівності)
    const observedWins = participantStats.map(stat => stat.observedCount).sort((a, b) => a - b);
    const actualGiniIndex = calculateGiniIndex(observedWins);

    // Обчислити очікуваний індекс Джині для ідеального розподілу
    const expectedWins = participantStats.map(stat => stat.expectedCount).sort((a, b) => a - b);
    const expectedGiniIndex = calculateGiniIndex(expectedWins);

    // Знайти максимальне відхилення
    const maxRelativeDeviation = Math.max(...participantStats.map(stat => stat.relativeDeviation));
    const maxDeviationParticipant = participantStats.find(stat => stat.relativeDeviation === maxRelativeDeviation);

    // Обчислити загальний бал справедливості
    const fairnessScore = calculateFairnessScore({
        participantsInConfidence,
        totalParticipants: participants.length,
        actualGiniIndex,
        expectedGiniIndex,
        maxRelativeDeviation
    });

    return {
        participantStats: participantStats,
        participantsInConfidence: participantsInConfidence,
        totalParticipants: participants.length,
        actualGiniIndex: actualGiniIndex,
        expectedGiniIndex: expectedGiniIndex,
        maxRelativeDeviation: maxRelativeDeviation,
        maxDeviationParticipant: maxDeviationParticipant,
        fairnessScore: fairnessScore,
        totalRaffles: totalRaffles,
        roundsPerRaffle: roundsPerRaffle,
        totalWins: totalWins,
        simulationData: simulationData
    };
}

/**
 * Обчислює індекс Джині (міру нерівності розподілу)
 */
function calculateGiniIndex(values) {
    if (values.length === 0) return 0;

    const sortedValues = [...values].sort((a, b) => a - b);
    const n = sortedValues.length;
    const total = sortedValues.reduce((sum, val) => sum + val, 0);

    if (total === 0) return 0;

    let gini = 0;
    for (let i = 0; i < n; i++) {
        gini += (2 * (i + 1) - n - 1) * sortedValues[i];
    }

    return gini / (n * total);
}

/**
 * Обчислює загальний бал справедливості (0-100)
 */
function calculateFairnessScore({ participantsInConfidence, totalParticipants, actualGiniIndex, expectedGiniIndex, maxRelativeDeviation }) {
    // Компонент 1: Довірчі інтервали (40 балів)
    const confidenceScore = (participantsInConfidence / totalParticipants) * 40;

    // Компонент 2: Індекс Джині (30 балів)
    const giniDeviation = Math.abs(actualGiniIndex - expectedGiniIndex);
    const giniScore = Math.max(0, (1 - giniDeviation) * 30);

    // Компонент 3: Максимальне відхилення (30 балів)
    const deviationScore = Math.max(0, (1 - maxRelativeDeviation) * 30);

    return Math.min(100, confidenceScore + giniScore + deviationScore);
}

// ===== ВІДОБРАЖЕННЯ РЕЗУЛЬТАТІВ =====

/**
 * Відображає результати тесту справедливості
 */
function displayFairnessTestResults(stats) {
    // Оновити значення в картках
    updateFairnessResultValue('fair-total-simulations',
        `${stats.totalRaffles.toLocaleString()} розіграшів × ${stats.roundsPerRaffle} = ${stats.totalWins.toLocaleString()}`);
    updateFairnessResultValue('fair-participants-count', stats.totalParticipants.toString());
    updateFairnessResultValue('fair-confidence-count', `${stats.participantsInConfidence}/${stats.totalParticipants}`);
    updateFairnessResultValue('fair-gini-index', stats.actualGiniIndex.toFixed(4));
    updateFairnessResultValue('fair-max-deviation', `${(stats.maxRelativeDeviation * 100).toFixed(1)}%`);

    // Визначити результат та клас для балу справедливості
    const scoreClass = getFairnessScoreClass(stats.fairnessScore);
    updateFairnessResultValue('fair-score', `${stats.fairnessScore.toFixed(1)}/100`, scoreClass);

    // Показати таблицю довірчих інтервалів
    displayFairnessIntervalsTable(stats.participantStats);

    // Показати інтерпретацію
    displayFairnessTestInterpretation(stats);

    // Показати деталі
    displayFairnessTestDetails(stats);

    // Показати блок результатів
    showFairnessTestResults();
}

/**
 * Оновлює значення в картці результату тесту справедливості
 */
function updateFairnessResultValue(elementId, value, className = '') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        element.className = `result-value ${className} updated`.trim();

        // Прибрати клас анімації через короткий час
        setTimeout(() => {
            element.classList.remove('updated');
        }, 600);
    }
}

/**
 * Визначає клас для балу справедливості
 */
function getFairnessScoreClass(score) {
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-fair';
    if (score >= 30) return 'score-poor';
    return 'score-bad';
}

/**
 * Відображає таблицю довірчих інтервалів
 */
function displayFairnessIntervalsTable(participantStats) {
    const tableContainer = document.getElementById('fairness-intervals-table');
    if (!tableContainer) return;

    const table = document.createElement('table');
    table.className = 'distribution-table';

    // Заголовок таблиці
    const header = `
        <thead>
            <tr>
                <th>Учасник</th>
                <th>Вага</th>
                <th>Очікувано</th>
                <th>Фактично</th>
                <th>Довірчий інтервал</th>
                <th>Статус</th>
                <th>Відхилення</th>
            </tr>
        </thead>
    `;

    const escapeHtml = window.UIController.escapeHtml;

    // Рядки таблиці
    const rows = participantStats.map(stat => {
        const statusIcon = stat.isInConfidenceInterval ? '✅' : '❌';
        const statusClass = stat.isInConfidenceInterval ? 'status-good' : 'status-bad';
        const deviationClass = getDeviationClass(stat.relativeDeviation);
        const deviationPercent = (stat.relativeDeviation * 100).toFixed(1);

        return `
            <tr>
                <td><strong>${escapeHtml(stat.name)}</strong></td>
                <td>${stat.weight}</td>
                <td>${stat.expectedCount.toFixed(1)}</td>
                <td>${stat.observedCount}</td>
                <td>[${stat.confidenceInterval.lower.toFixed(1)}, ${stat.confidenceInterval.upper.toFixed(1)}]</td>
                <td class="${statusClass}">${statusIcon}</td>
                <td class="${deviationClass}">${deviationPercent}%</td>
            </tr>
        `;
    }).join('');

    table.innerHTML = header + '<tbody>' + rows + '</tbody>';
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
}

/**
 * Відображає інтерпретацію результатів тесту справедливості
 */
function displayFairnessTestInterpretation(stats) {
    const interpretationEl = document.getElementById('fair-interpretation-text');
    if (!interpretationEl) return;

    let interpretation = '';
    let className = 'interpretation-good';

    const score = stats.fairnessScore;
    const confidenceRate = (stats.participantsInConfidence / stats.totalParticipants) * 100;

    if (score >= 90) {
        className = 'interpretation-good';
        interpretation = `
            <div class="${className}">✅ ВІДМІННА СПРАВЕДЛИВІСТЬ</div>
            <p>Загальний бал справедливості: <strong>${score.toFixed(1)}/100</strong></p>
            <p>${confidenceRate.toFixed(0)}% учасників отримали результати в межах довірчих інтервалів.
            Індекс Джині: ${stats.actualGiniIndex.toFixed(4)} (очікувано: ${stats.expectedGiniIndex.toFixed(4)}).</p>
            <p><strong>Висновок:</strong> Алгоритм розіграшу працює виключно справедливо!</p>
        `;
    } else if (score >= 70) {
        className = 'interpretation-good';
        interpretation = `
            <div class="${className}">✅ ДОБРА СПРАВЕДЛИВІСТЬ</div>
            <p>Загальний бал справедливості: <strong>${score.toFixed(1)}/100</strong></p>
            <p>${confidenceRate.toFixed(0)}% учасників у довірчих інтервалах.
            Максимальне відхилення: ${(stats.maxRelativeDeviation * 100).toFixed(1)}%.</p>
            <p><strong>Висновок:</strong> Алгоритм працює справедливо з незначними відхиленнями.</p>
        `;
    } else if (score >= 50) {
        className = 'interpretation-warning';
        interpretation = `
            <div class="${className}">⚡ ЗАДОВІЛЬНА СПРАВЕДЛИВІСТЬ</div>
            <p>Загальний бал справедливості: <strong>${score.toFixed(1)}/100</strong></p>
            <p>Лише ${confidenceRate.toFixed(0)}% учасників у довірчих інтервалах.
            Учасник "${window.UIController.escapeHtml(stats.maxDeviationParticipant.name)}" має найбільше відхилення: ${(stats.maxRelativeDeviation * 100).toFixed(1)}%.</p>
            <p><strong>Рекомендації:</strong> Розгляньте збільшення кількості симуляцій або перегляд алгоритму.</p>
        `;
    } else {
        className = 'interpretation-bad';
        interpretation = `
            <div class="${className}">⚠️ ПОГАНА СПРАВЕДЛИВІСТЬ</div>
            <p>Загальний бал справедливості: <strong>${score.toFixed(1)}/100</strong></p>
            <p>Тільки ${confidenceRate.toFixed(0)}% учасників у довірчих інтервалах!
            Критичне відхилення: ${(stats.maxRelativeDeviation * 100).toFixed(1)}%.</p>
            <p><strong>Проблема:</strong> Алгоритм може працювати несправедливо. Потрібна детальна перевірка.</p>
        `;
    }

    interpretationEl.innerHTML = interpretation;
}

/**
 * Відображає деталі тестування справедливості
 */
function displayFairnessTestDetails(stats) {
    const detailsEl = document.getElementById('fair-test-details-content');
    if (!detailsEl) return;

    const details = `
        <strong>Методологія тесту:</strong>
        • Повні розіграші: ${stats.totalRaffles.toLocaleString()}
        • Раундів на розіграш: ${stats.roundsPerRaffle}
        • Загалом перемог: ${stats.totalWins.toLocaleString()}
        • Довірчі інтервали: 95% (Z = 1.96)
        • Індекс Джині: міра нерівності розподілу (0 = ідеальна рівність, 1 = максимальна нерівність)
        • Бал справедливості: комбінація всіх метрик (0-100)

        <strong>Деталі симуляції:</strong>
        • Кожна симуляція = один незалежний вибір переможця
        • Перевіряється точність ймовірностей для одного вибору
        • Зважений випадковий вибір через secureWeightedRandom() (crypto.getRandomValues())

        <strong>Деталі розрахунків:</strong>
        • Учасників у довірчих інтервалах: ${stats.participantsInConfidence}/${stats.totalParticipants}
        • Фактичний індекс Джині: ${stats.actualGiniIndex.toFixed(6)}
        • Очікуваний індекс Джині: ${stats.expectedGiniIndex.toFixed(6)}
        • Максимальне відносне відхилення: ${(stats.maxRelativeDeviation * 100).toFixed(2)}%

        <strong>Компоненти балу справедливості:</strong>
        • Довірчі інтервали: ${((stats.participantsInConfidence / stats.totalParticipants) * 40).toFixed(1)}/40 балів
        • Індекс Джині: ${(Math.max(0, (1 - Math.abs(stats.actualGiniIndex - stats.expectedGiniIndex)) * 30)).toFixed(1)}/30 балів
        • Відхилення: ${(Math.max(0, (1 - stats.maxRelativeDeviation) * 30)).toFixed(1)}/30 балів

        <strong>Критерії оцінки:</strong>
        90-100: Відмінна справедливість | 70-89: Добра справедливість
        50-69: Задовільна справедливість | 30-49: Погана справедливість | <30: Дуже погана

        <strong>Приклад розрахунку:</strong>
        Якщо в проекті 5 призів, то 1000 симуляцій = 1000 повних розіграшів × 5 раундів = 5000 загалом перемог для аналізу
    `;

    detailsEl.innerHTML = `<pre>${details}</pre>`;
}

// ===== ДОПОМІЖНІ ФУНКЦІЇ UI =====

function showFairnessTestStatus(message, isRunning = false) {
    const statusEl = document.getElementById('fairness-test-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isRunning ? 'test-status running' : 'test-status';
        statusEl.style.display = 'block';
    }
}

function updateFairnessTestStatus(message) {
    const statusEl = document.getElementById('fairness-test-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function hideFairnessTestStatus() {
    const statusEl = document.getElementById('fairness-test-status');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
}

function showFairnessTestResults() {
    const resultsEl = document.getElementById('fairness-test-results');
    if (resultsEl) {
        resultsEl.style.display = 'block';
    }
}

function hideFairnessTestResults() {
    const resultsEl = document.getElementById('fairness-test-results');
    if (resultsEl) {
        resultsEl.style.display = 'none';
    }
}

function clearFairnessTestResults() {
    hideFairnessTestResults();
    hideFairnessTestStatus();

    // Очистити всі значення
    const resultIds = ['fair-total-simulations', 'fair-participants-count', 'fair-confidence-count',
        'fair-gini-index', 'fair-max-deviation', 'fair-score'];
    resultIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '-';
            element.className = 'result-value';
        }
    });

    // Очистити таблицю, інтерпретацію та деталі
    const tableEl = document.getElementById('fairness-intervals-table');
    if (tableEl) tableEl.innerHTML = '';

    const interpretationEl = document.getElementById('fair-interpretation-text');
    if (interpretationEl) interpretationEl.innerHTML = '';

    const detailsEl = document.getElementById('fair-test-details-content');
    if (detailsEl) detailsEl.innerHTML = '';
}

// ===== РЕЄСТРАЦІЯ В ГОЛОВНОМУ МОДУЛІ =====

Object.assign(window.FairnessTests, {
    runFairnessTest,
    clearFairnessTestResults,
    simulateFairnessTest,
    calculateFairnessStatistics,
    calculateGiniIndex,
    calculateFairnessScore,
});

window.Logger.log('[FairnessTests]', '📁 Тест справедливості (Fairness Test) завантажено');
