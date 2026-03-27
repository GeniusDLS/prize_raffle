/**
 * FAIRNESS SEQUENCE TEST MODULE
 * Тест послідовностей (Runs Test) — перевіряє відсутність патернів у RNG
 * Залежності: window.FairnessTests (fairness-tests.js) → window.RaffleEngine, window.Logger
 */

// ===== ОСНОВНІ ФУНКЦІЇ =====

/**
 * Запускає тест послідовностей (Runs Test)
 */
async function runSequenceTest() {
    const countInput = document.getElementById('runs-test-count');
    const simulationCount = parseInt(countInput?.value) || TEST_CONSTANTS.DEFAULT_SIMULATIONS;

    if (simulationCount < TEST_CONSTANTS.MIN_SIMULATIONS || simulationCount > TEST_CONSTANTS.MAX_SIMULATIONS) {
        alert(`Кількість симуляцій має бути від ${TEST_CONSTANTS.MIN_SIMULATIONS} до ${TEST_CONSTANTS.MAX_SIMULATIONS}`);
        return;
    }

    // Показати статус виконання
    showTestStatus('Виконується тест послідовностей...', true);
    hideTestResults();

    try {
        // Генерувати послідовність випадкових чисел
        const sequence = await generateRandomSequence(simulationCount);

        // Обчислити статистику
        const stats = calculateRunsTestStatistics(sequence);

        // Відобразити результати
        displaySequenceTestResults(stats, simulationCount);

        hideTestStatus();

    } catch (error) {
        window.Logger.error('[FairnessTests]', 'Помилка під час тестування:', error);
        showTestStatus('Помилка під час виконання тесту', false);
    }
}

/**
 * Генерує послідовність випадкових чисел для тестування
 */
async function generateRandomSequence(count) {
    window.Logger.log('[FairnessTests]', `Генерування ${count} випадкових чисел...`);

    const sequence = [];
    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
        // Використовуємо єдиний криптогенератор з RaffleEngine
        sequence.push(window.RaffleEngine.secureRandom());

        // Показувати прогрес кожні 1000 ітерацій
        if (i % 1000 === 0 && i > 0) {
            updateTestStatus(`Згенеровано ${i}/${count} чисел...`);
            // Дати браузеру час на оновлення UI
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }

    const endTime = performance.now();
    window.Logger.log('[FairnessTests]', `Генерування завершено за ${(endTime - startTime).toFixed(2)}мс`);

    return sequence;
}

/**
 * Обчислює статистику для тесту послідовностей
 */
function calculateRunsTestStatistics(sequence) {
    const n = sequence.length;
    const median = 0.5; // Медіана для рівномірного розподілу [0,1]

    // Перетворити в послідовність 0 та 1 (менше/більше медіани)
    const binarySequence = sequence.map(x => x < median ? 0 : 1);

    // Підрахувати кількість 0 та 1
    const n1 = binarySequence.filter(x => x === 0).length; // Кількість значень < 0.5
    const n2 = binarySequence.filter(x => x === 1).length; // Кількість значень >= 0.5

    // Підрахувати кількість "серій" (runs)
    let runs = 1;
    for (let i = 1; i < binarySequence.length; i++) {
        if (binarySequence[i] !== binarySequence[i - 1]) {
            runs++;
        }
    }

    // Обчислити очікувану кількість серій та дисперсію
    const expectedRuns = (2 * n1 * n2) / n + 1;
    const variance = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1));
    const standardDeviation = Math.sqrt(variance);

    // Обчислити Z-статистику
    const zStatistic = (runs - expectedRuns) / standardDeviation;

    // Обчислити p-value (двосторонній тест)
    const pValue = 2 * (1 - normalCDF(Math.abs(zStatistic)));

    return {
        totalNumbers: n,
        belowMedian: n1,
        aboveMedian: n2,
        observedRuns: runs,
        expectedRuns: expectedRuns,
        variance: variance,
        standardDeviation: standardDeviation,
        zStatistic: zStatistic,
        pValue: pValue,
        isSignificant: pValue < TEST_CONSTANTS.CONFIDENCE_LEVEL,
        sequence: binarySequence.slice(0, 50) // Перші 50 для демонстрації
    };
}

// ===== ВІДОБРАЖЕННЯ РЕЗУЛЬТАТІВ =====

/**
 * Відображає результати тесту послідовностей
 */
function displaySequenceTestResults(stats, simulationCount) {
    // Оновити значення
    updateResultValue('total-simulations', simulationCount.toLocaleString());
    updateResultValue('average-runs', stats.observedRuns.toFixed(2));
    updateResultValue('expected-runs', stats.expectedRuns.toFixed(2));
    updateResultValue('z-statistic', stats.zStatistic.toFixed(4));
    updateResultValue('p-value', stats.pValue.toFixed(6));

    // Визначити результат тесту
    const testResult = stats.isSignificant ? 'ПІДОЗРІЛО' : 'ПРОЙШОВ';
    const resultClass = stats.isSignificant ? 'danger' : '';
    updateResultValue('test-result', testResult, resultClass);

    // Показати інтерпретацію
    displayTestInterpretation(stats);

    // Показати деталі
    displayTestDetails(stats);

    // Показати блок результатів
    showTestResults();
}

/**
 * Оновлює значення в картці результату
 */
function updateResultValue(elementId, value, className = '') {
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
 * Відображає інтерпретацію результатів тесту послідовностей
 */
function displayTestInterpretation(stats) {
    const interpretationEl = document.getElementById('interpretation-text');
    if (!interpretationEl) return;

    let interpretation = '';
    let className = 'interpretation-good';

    if (stats.isSignificant) {
        className = 'interpretation-bad';
        interpretation = `
            <div class="${className}">⚠️ ТЕСТ НЕ ПРОЙДЕНО</div>
            <p>P-value (${stats.pValue.toFixed(6)}) менше за рівень значущості (${TEST_CONSTANTS.CONFIDENCE_LEVEL}),
            що означає статистично значущу відмінність від очікуваного розподілу.</p>
            <p><strong>Це може вказувати на:</strong></p>
            <ul>
                <li>Наявність патернів у генераторі випадкових чисел</li>
                <li>Недостатню якість рандомізації</li>
                <li>Можливість передбачення наступних значень</li>
            </ul>
            <p><strong>Рекомендації:</strong> Розгляньте можливість використання іншого алгоритму генерації випадкових чисел.</p>
        `;
    } else {
        if (stats.pValue > 0.1) {
            className = 'interpretation-good';
            interpretation = `
                <div class="${className}">✅ ТЕСТ ПРОЙДЕНО ВІДМІННО</div>
                <p>P-value (${stats.pValue.toFixed(6)}) значно перевищує рівень значущості (${TEST_CONSTANTS.CONFIDENCE_LEVEL}),
                що вказує на відсутність статистично значущих патернів.</p>
                <p><strong>Висновок:</strong> Генератор випадкових чисел демонструє хорошу якість рандомізації.</p>
            `;
        } else {
            className = 'interpretation-warning';
            interpretation = `
                <div class="${className}">⚡ ТЕСТ ПРОЙДЕНО З ЗАСТЕРЕЖЕННЯМ</div>
                <p>P-value (${stats.pValue.toFixed(6)}) більше за рівень значущості (${TEST_CONSTANTS.CONFIDENCE_LEVEL}),
                але досить близько до межі.</p>
                <p><strong>Рекомендації:</strong> Проведіть додаткові тести для підтвердження якості генератора.</p>
            `;
        }
    }

    interpretationEl.innerHTML = interpretation;
}

/**
 * Відображає деталі тестування послідовностей
 */
function displayTestDetails(stats) {
    const detailsEl = document.getElementById('test-details-content');
    if (!detailsEl) return;

    const details = `
        <strong>Параметри тесту:</strong>
        • Рівень довіри: ${(1 - TEST_CONSTANTS.CONFIDENCE_LEVEL) * 100}%
        • Рівень значущості (α): ${TEST_CONSTANTS.CONFIDENCE_LEVEL}
        • Медіана: 0.5

        <strong>Статистичні дані:</strong>
        • Значень менше медіани (n₁): ${stats.belowMedian}
        • Значень більше медіани (n₂): ${stats.aboveMedian}
        • Співвідношення n₁/n₂: ${(stats.belowMedian / stats.aboveMedian).toFixed(3)}
        • Стандартне відхилення: ${stats.standardDeviation.toFixed(4)}
        • Дисперсія: ${stats.variance.toFixed(4)}

        <strong>Перші 50 значень (0=менше 0.5, 1=більше 0.5):</strong>
        ${stats.sequence.join(' ')}

        <strong>Формула Z-статистики:</strong>
        Z = (Спостережувані серії - Очікувані серії) / Стандартне відхилення
        Z = (${stats.observedRuns} - ${stats.expectedRuns.toFixed(2)}) / ${stats.standardDeviation.toFixed(4)} = ${stats.zStatistic.toFixed(4)}
    `;

    detailsEl.innerHTML = `<pre>${details}</pre>`;
}

// ===== ДОПОМІЖНІ ФУНКЦІЇ UI =====

function showTestStatus(message, isRunning = false) {
    const statusEl = document.getElementById('sequence-test-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isRunning ? 'test-status running' : 'test-status';
        statusEl.style.display = 'block';
    }
}

function updateTestStatus(message) {
    const statusEl = document.getElementById('sequence-test-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function hideTestStatus() {
    const statusEl = document.getElementById('sequence-test-status');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
}

function showTestResults() {
    const resultsEl = document.getElementById('sequence-test-results');
    if (resultsEl) {
        resultsEl.style.display = 'block';
    }
}

function hideTestResults() {
    const resultsEl = document.getElementById('sequence-test-results');
    if (resultsEl) {
        resultsEl.style.display = 'none';
    }
}

function clearTestResults() {
    hideTestResults();
    hideTestStatus();

    // Очистити всі значення
    const resultIds = ['total-simulations', 'average-runs', 'expected-runs', 'z-statistic', 'p-value', 'test-result'];
    resultIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '-';
            element.className = 'result-value';
        }
    });

    // Очистити інтерпретацію та деталі
    const interpretationEl = document.getElementById('interpretation-text');
    if (interpretationEl) interpretationEl.innerHTML = '';

    const detailsEl = document.getElementById('test-details-content');
    if (detailsEl) detailsEl.innerHTML = '';
}

// ===== РЕЄСТРАЦІЯ В ГОЛОВНОМУ МОДУЛІ =====

Object.assign(window.FairnessTests, {
    runSequenceTest,
    clearTestResults,
    generateRandomSequence,
    calculateRunsTestStatistics,
});

window.Logger.log('[FairnessTests]', '📁 Тест послідовностей (Runs Test) завантажено');
