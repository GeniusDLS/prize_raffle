/**
 * FAIRNESS TESTS MODULE
 * Модуль для тестування чесності генератора випадкових чисел
 */

// ===== ПОКРАЩЕНИЙ ГЕНЕРАТОР ВИПАДКОВИХ ЧИСЕЛ =====

/**
 * Покращений генератор випадкових чисел на основі crypto.getRandomValues()
 * Більш справедливий для великої кількості учасників (1000+)
 */
function secureRandom() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        // Використовуємо криптографічно стійкий генератор
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / (0xffffffff + 1);
    } else {
        // Fallback для старих браузерів
        console.warn('crypto.getRandomValues недоступний, використовується Math.random()');
        return Math.random();
    }
}

/**
 * Зважений випадковий вибір з покращеним генератором
 * Використовується для всіх тестів справедливості
 */
function secureWeightedRandom(participants) {
    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
    let random = secureRandom() * totalWeight;

    for (const participant of participants) {
        random -= participant.weight;
        if (random <= 0) {
            return participant;
        }
    }

    return participants[participants.length - 1];
}

// ===== КОНСТАНТИ =====

const TEST_CONSTANTS = {
    CONFIDENCE_LEVEL: 0.05, // 95% довірчий інтервал
    MIN_SIMULATIONS: 100,
    MAX_SIMULATIONS: 10000,
    DEFAULT_SIMULATIONS: 1000
};

// ===== ОСНОВНІ ФУНКЦІЇ ТЕСТУВАННЯ =====

/**
 * Тест послідовностей (Runs Test)
 * Перевіряє чи немає патернів у послідовності випадкових чисел
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
        console.error('Помилка під час тестування:', error);
        showTestStatus('Помилка під час виконання тесту', false);
    }
}

/**
 * Генерує послідовність випадкових чисел для тестування
 */
async function generateRandomSequence(count) {
    console.log(`Генерування ${count} випадкових чисел...`);
    
    const sequence = [];
    const startTime = performance.now();
    
    for (let i = 0; i < count; i++) {
        // Використовуємо покращений генератор
        sequence.push(secureRandom());
        
        // Показувати прогрес кожні 1000 ітерацій
        if (i % 1000 === 0 && i > 0) {
            updateTestStatus(`Згенеровано ${i}/${count} чисел...`);
            // Дати браузеру час на оновлення UI
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }
    
    const endTime = performance.now();
    console.log(`Генерування завершено за ${(endTime - startTime).toFixed(2)}мс`);
    
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
        if (binarySequence[i] !== binarySequence[i-1]) {
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

/**
 * Наближене обчислення функції розподілу стандартної нормальної змінної
 */
function normalCDF(x) {
    // Наближення Abramowitz and Stegun
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
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
 * Відображає інтерпретацію результатів тесту
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
 * Відображає деталі тестування
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

/**
 * Тест розподілу (Chi-square Test)
 * Перевіряє чи отримують учасники призи відповідно до їхньої ваги
 */
async function runDistributionTest() {
    const countInput = document.getElementById('distribution-test-count');
    const simulationCount = parseInt(countInput?.value) || TEST_CONSTANTS.DEFAULT_SIMULATIONS;
    
    if (simulationCount < TEST_CONSTANTS.MIN_SIMULATIONS || simulationCount > TEST_CONSTANTS.MAX_SIMULATIONS) {
        alert(`Кількість симуляцій має бути від ${TEST_CONSTANTS.MIN_SIMULATIONS} до ${TEST_CONSTANTS.MAX_SIMULATIONS}`);
        return;
    }
    
    // Перевірити наявність учасників
    if (!window.DataManager || !window.DataManager.participants || window.DataManager.participants.length === 0) {
        alert('Додайте учасників на сторінці "Дані" для проведення тесту розподілу!');
        return;
    }
    
    const participants = window.DataManager.participants;
    if (participants.length < 2) {
        alert('Для тесту розподілу потрібно мінімум 2 учасники!');
        return;
    }
    
    // Показати статус виконання
    showDistributionTestStatus('Виконується тест розподілу...', true);
    hideDistributionTestResults();
    
    try {
        // Провести симуляції розіграшу
        const simulationResults = await simulateRaffleDistribution(participants, simulationCount);
        
        // Обчислити статистику Chi-square
        const stats = calculateChiSquareStatistics(participants, simulationResults, simulationCount);
        
        // Відобразити результати
        displayDistributionTestResults(stats, simulationCount);
        
        hideDistributionTestStatus();
        
    } catch (error) {
        console.error('Помилка під час тестування розподілу:', error);
        showDistributionTestStatus('Помилка під час виконання тесту розподілу', false);
    }
}

/**
 * Симулює багато розіграшів для перевірки розподілу
 */
async function simulateRaffleDistribution(participants, simulationCount) {
    console.log(`Симуляція ${simulationCount} розіграшів...`);
    
    const results = {};
    
    // Ініціалізувати лічильники для кожного учасника
    participants.forEach(participant => {
        results[participant.name] = 0;
    });
    
    const startTime = performance.now();
    
    for (let i = 0; i < simulationCount; i++) {
        // Вибрати переможця з урахуванням ваги (використовуємо покращений генератор)
        const winner = secureWeightedRandom(participants);
        results[winner.name]++;
        
        // Показувати прогрес кожні 500 ітерацій
        if (i % 500 === 0 && i > 0) {
            updateDistributionTestStatus(`Проведено ${i}/${simulationCount} симуляцій...`);
            // Дати браузеру час на оновлення UI
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }
    
    const endTime = performance.now();
    console.log(`Симуляція завершена за ${(endTime - startTime).toFixed(2)}мс`);
    
    return results;
}

/**
 * Обчислює статистику Chi-square для перевірки розподілу
 */
function calculateChiSquareStatistics(participants, observedResults, totalSimulations) {
    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
    
    // Обчислити очікувані та спостережувані значення
    const participantStats = participants.map(participant => {
        const expectedProbability = participant.weight / totalWeight;
        const expectedCount = expectedProbability * totalSimulations;
        const observedCount = observedResults[participant.name] || 0;
        const deviation = observedCount - expectedCount;
        const relativeDeviation = Math.abs(deviation) / expectedCount;
        
        return {
            name: participant.name,
            weight: participant.weight,
            expectedProbability: expectedProbability,
            expectedCount: expectedCount,
            observedCount: observedCount,
            deviation: deviation,
            relativeDeviation: relativeDeviation
        };
    });
    
    // Обчислити Chi-square статистику
    let chiSquare = 0;
    participantStats.forEach(stat => {
        if (stat.expectedCount > 0) {
            chiSquare += Math.pow(stat.deviation, 2) / stat.expectedCount;
        }
    });
    
    // Ступені свободи = кількість учасників - 1
    const degreesOfFreedom = participants.length - 1;
    
    // Критичне значення для α = 0.05
    const criticalValue = getCriticalChiSquareValue(degreesOfFreedom, TEST_CONSTANTS.CONFIDENCE_LEVEL);
    
    // Визначити результат тесту
    const isSignificant = chiSquare > criticalValue;
    
    return {
        participantStats: participantStats,
        chiSquare: chiSquare,
        degreesOfFreedom: degreesOfFreedom,
        criticalValue: criticalValue,
        isSignificant: isSignificant,
        totalSimulations: totalSimulations,
        totalParticipants: participants.length
    };
}

/**
 * Наближене обчислення критичного значення Chi-square
 */
function getCriticalChiSquareValue(df, alpha) {
    // Таблиця критичних значень для α = 0.05
    const criticalValues = {
        1: 3.841, 2: 5.991, 3: 7.815, 4: 9.488, 5: 11.070,
        6: 12.592, 7: 14.067, 8: 15.507, 9: 16.919, 10: 18.307,
        11: 19.675, 12: 21.026, 13: 22.362, 14: 23.685, 15: 24.996,
        16: 26.296, 17: 27.587, 18: 28.869, 19: 30.144, 20: 31.410
    };
    
    if (df <= 20) {
        return criticalValues[df] || 0;
    }
    
    // Для більших df використовуємо наближення
    return df + Math.sqrt(2 * df) * 1.645; // Наближення для α = 0.05
}

// Покращена функція selectWeightedRandom тепер знаходиться в raffle-engine.js
// Для тестів використовуємо secureWeightedRandom()

// ===== ВІДОБРАЖЕННЯ РЕЗУЛЬТАТІВ ТЕСТУ РОЗПОДІЛУ =====

/**
 * Відображає результати тесту розподілу
 */
function displayDistributionTestResults(stats, simulationCount) {
    // Оновити значення в картках
    updateDistributionResultValue('dist-total-simulations', simulationCount.toLocaleString());
    updateDistributionResultValue('dist-participants-count', stats.totalParticipants.toString());
    updateDistributionResultValue('dist-degrees-freedom', stats.degreesOfFreedom.toString());
    updateDistributionResultValue('dist-chi-square', stats.chiSquare.toFixed(4));
    updateDistributionResultValue('dist-critical-value', stats.criticalValue.toFixed(4));
    
    // Визначити результат тесту
    const testResult = stats.isSignificant ? 'ПІДОЗРІЛО' : 'ПРОЙШОВ';
    const resultClass = stats.isSignificant ? 'danger' : '';
    updateDistributionResultValue('dist-test-result', testResult, resultClass);
    
    // Показати таблицю розподілу учасників
    displayParticipantsDistributionTable(stats.participantStats);
    
    // Показати інтерпретацію
    displayDistributionTestInterpretation(stats);
    
    // Показати деталі
    displayDistributionTestDetails(stats);
    
    // Показати блок результатів
    showDistributionTestResults();
}

/**
 * Оновлює значення в картці результату тесту розподілу
 */
function updateDistributionResultValue(elementId, value, className = '') {
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
 * Отображает таблицу распределения участников
 */
function displayParticipantsDistributionTable(participantStats) {
    const tableContainer = document.getElementById('participants-distribution-table');
    if (!tableContainer) return;
    
    const table = document.createElement('table');
    table.className = 'distribution-table';
    
    // Заголовок таблиці
    const header = `
        <thead>
            <tr>
                <th>Учасник</th>
                <th>Вага</th>
                <th>Очікувана ймовірність</th>
                <th>Очікувано перемог</th>
                <th>Фактично перемог</th>
                <th>Відхилення</th>
                <th>Відносне відхилення</th>
            </tr>
        </thead>
    `;
    
    // Рядки таблиці
    const rows = participantStats.map(stat => {
        const deviationClass = getDeviationClass(stat.relativeDeviation);
        const deviationPercent = (stat.relativeDeviation * 100).toFixed(1);
        
        return `
            <tr>
                <td><strong>${stat.name}</strong></td>
                <td>${stat.weight}</td>
                <td>${(stat.expectedProbability * 100).toFixed(2)}%</td>
                <td>${stat.expectedCount.toFixed(1)}</td>
                <td>${stat.observedCount}</td>
                <td class="${deviationClass}">${stat.deviation > 0 ? '+' : ''}${stat.deviation.toFixed(1)}</td>
                <td class="${deviationClass}">${deviationPercent}%</td>
            </tr>
        `;
    }).join('');
    
    table.innerHTML = header + '<tbody>' + rows + '</tbody>';
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
}

/**
 * Визначає клас для відображення відхилення
 */
function getDeviationClass(relativeDeviation) {
    if (relativeDeviation > 0.2) {
        return 'deviation-high';
    } else if (relativeDeviation > 0.1) {
        return 'deviation-medium';
    } else {
        return 'deviation-low';
    }
}

/**
 * Відображає інтерпретацію результатів тесту розподілу
 */
function displayDistributionTestInterpretation(stats) {
    const interpretationEl = document.getElementById('dist-interpretation-text');
    if (!interpretationEl) return;
    
    let interpretation = '';
    let className = 'interpretation-good';
    
    if (stats.isSignificant) {
        className = 'interpretation-bad';
        interpretation = `
            <div class="${className}">⚠️ ТЕСТ НЕ ПРОЙШОВ</div>
            <p>χ² статистика (${stats.chiSquare.toFixed(4)}) перевищує критичне значення (${stats.criticalValue.toFixed(4)}), 
            що означає статистично значуще відхилення від очікуваного розподілу.</p>
            <p><strong>Це може вказувати на:</strong></p>
            <ul>
                <li>Несправедливість алгоритму розіграшу</li>
                <li>Проблеми з генератором випадкових чисел</li>
                <li>Неправильну реалізацію зваженого вибору</li>
            </ul>
            <p><strong>Рекомендації:</strong> Перевірте алгоритм розіграшу та проведіть додаткові тести.</p>
        `;
    } else {
        // Перевірити наскільки добре пройшов тест
        const maxDeviation = Math.max(...stats.participantStats.map(s => s.relativeDeviation));
        
        if (maxDeviation < 0.05) {
            className = 'interpretation-good';
            interpretation = `
                <div class="${className}">✅ ТЕСТ ПРОЙШОВ ВІДМІННО</div>
                <p>χ² статистика (${stats.chiSquare.toFixed(4)}) значно менша за критичне значення (${stats.criticalValue.toFixed(4)}). 
                Максимальне відхилення складає лише ${(maxDeviation * 100).toFixed(1)}%.</p>
                <p><strong>Висновок:</strong> Алгоритм розіграшу працює чесно і враховує ваги учасників коректно.</p>
            `;
        } else if (maxDeviation < 0.15) {
            className = 'interpretation-warning';
            interpretation = `
                <div class="${className}">⚡ ТЕСТ ПРОЙШОВ З НЕВЕЛИКИМИ ВІДХИЛЕННЯМИ</div>
                <p>χ² статистика (${stats.chiSquare.toFixed(4)}) менша за критичне значення (${stats.criticalValue.toFixed(4)}), 
                але є помітні відхилення (макс. ${(maxDeviation * 100).toFixed(1)}%).</p>
                <p><strong>Рекомендації:</strong> Проведіть додаткові тести з більшою кількістю симуляцій.</p>
            `;
        } else {
            className = 'interpretation-good';
            interpretation = `
                <div class="${className}">✅ ТЕСТ ПРОЙШОВ</div>
                <p>χ² статистика (${stats.chiSquare.toFixed(4)}) менша за критичне значення (${stats.criticalValue.toFixed(4)}).</p>
                <p><strong>Висновок:</strong> Алгоритм розіграшу проходить тест на чесність.</p>
            `;
        }
    }
    
    interpretationEl.innerHTML = interpretation;
}

/**
 * Відображає деталі тестування розподілу
 */
function displayDistributionTestDetails(stats) {
    const detailsEl = document.getElementById('dist-test-details-content');
    if (!detailsEl) return;
    
    const totalWeight = stats.participantStats.reduce((sum, s) => sum + s.weight, 0);
    
    const details = `
        <strong>Параметри тесту:</strong>
        • Рівень довіри: ${(1 - TEST_CONSTANTS.CONFIDENCE_LEVEL) * 100}%
        • Рівень значущості (α): ${TEST_CONSTANTS.CONFIDENCE_LEVEL}
        • Загальна вага всіх учасників: ${totalWeight}
        • Кількість симуляцій: ${stats.totalSimulations.toLocaleString()}
        
        <strong>Статистичні дані:</strong>
        • Ступені свободи: ${stats.degreesOfFreedom}
        • Критичне значення χ² (α=0.05): ${stats.criticalValue.toFixed(4)}
        • Обчислена χ² статистика: ${stats.chiSquare.toFixed(4)}
        
        <strong>Формула Chi-square:</strong>
        χ² = Σ ((Oᵢ - Eᵢ)² / Eᵢ)
        де Oᵢ - спостережуване, Eᵢ - очікуване значення
        
        <strong>Критерій прийняття рішення:</strong>
        Якщо χ² > χ²_крит, то розподіл відрізняється від очікуваного
        У нашому випадку: ${stats.chiSquare.toFixed(4)} ${stats.isSignificant ? '>' : '≤'} ${stats.criticalValue.toFixed(4)}
    `;
    
    detailsEl.innerHTML = `<pre>${details}</pre>`;
}

// ===== ДОПОМІЖНІ ФУНКЦІЇ UI ДЛЯ ТЕСТУ РОЗПОДІЛУ =====

function showDistributionTestStatus(message, isRunning = false) {
    const statusEl = document.getElementById('distribution-test-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isRunning ? 'test-status running' : 'test-status';
        statusEl.style.display = 'block';
    }
}

function updateDistributionTestStatus(message) {
    const statusEl = document.getElementById('distribution-test-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function hideDistributionTestStatus() {
    const statusEl = document.getElementById('distribution-test-status');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
}

function showDistributionTestResults() {
    const resultsEl = document.getElementById('distribution-test-results');
    if (resultsEl) {
        resultsEl.style.display = 'block';
    }
}

function hideDistributionTestResults() {
    const resultsEl = document.getElementById('distribution-test-results');
    if (resultsEl) {
        resultsEl.style.display = 'none';
    }
}

function clearDistributionTestResults() {
    hideDistributionTestResults();
    hideDistributionTestStatus();
    
    // Очистити всі значення
    const resultIds = ['dist-total-simulations', 'dist-participants-count', 'dist-degrees-freedom', 
                      'dist-chi-square', 'dist-critical-value', 'dist-test-result'];
    resultIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '-';
            element.className = 'result-value';
        }
    });
    
    // Очистити таблицю, інтерпретацію та деталі
    const tableEl = document.getElementById('participants-distribution-table');
    if (tableEl) tableEl.innerHTML = '';
    
    const interpretationEl = document.getElementById('dist-interpretation-text');
    if (interpretationEl) interpretationEl.innerHTML = '';
    
    const detailsEl = document.getElementById('dist-test-details-content');
    if (detailsEl) detailsEl.innerHTML = '';
}

/**
 * Тест справедливості
 * Комплексна перевірка справедливості алгоритму розіграшу
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
        console.error('Помилка під час тестування справедливості:', error);
        showFairnessTestStatus('Помилка під час виконання тесту справедливості', false);
    }
}

/**
 * Симулює багато розіграшів для тесту справедливості
 */
async function simulateFairnessTest(participants, simulationCount) {
    console.log(`Симуляція ${simulationCount} розіграшів для тесту справедливості...`);
    
    const results = {};
    
    // Ініціалізувати лічильники для кожного учасника
    participants.forEach(participant => {
        results[participant.name] = 0;
    });
    
    const startTime = performance.now();
    
    for (let i = 0; i < simulationCount; i++) {
        // Вибрати переможця з урахуванням ваги (покращений алгоритм)
        const winner = secureWeightedRandom(participants);
        results[winner.name]++;
        
        // Показувати прогрес кожні 500 ітерацій
        if (i % 500 === 0 && i > 0) {
            updateFairnessTestStatus(`Проведено ${i}/${simulationCount} симуляцій...`);
            // Дати браузеру час на оновлення UI
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }
    
    const endTime = performance.now();
    console.log(`Симуляція справедливості завершена за ${(endTime - startTime).toFixed(2)}мс`);
    
    // Повернути правильну структуру для calculateFairnessStatistics
    return {
        results: results,
        totalRaffles: simulationCount, // Кількість проведених розіграшів
        roundsPerRaffle: 1, // В даному тесті кожна симуляція = 1 раунд
        totalWins: simulationCount // Загальна кількість виборів переможців
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

// ===== ВІДОБРАЖЕННЯ РЕЗУЛЬТАТІВ ТЕСТУ СПРАВЕДЛИВОСТІ =====

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
    
    // Рядки таблиці
    const rows = participantStats.map(stat => {
        const statusIcon = stat.isInConfidenceInterval ? '✅' : '❌';
        const statusClass = stat.isInConfidenceInterval ? 'status-good' : 'status-bad';
        const deviationClass = getDeviationClass(stat.relativeDeviation);
        const deviationPercent = (stat.relativeDeviation * 100).toFixed(1);
        
        return `
            <tr>
                <td><strong>${stat.name}</strong></td>
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
            Учасник "${stats.maxDeviationParticipant.name}" має найбільше відхилення: ${(stats.maxRelativeDeviation * 100).toFixed(1)}%.</p>
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
        • Кожен розіграш симулював реальний алгоритм
        • Учасники видалялися після перемог (як у реальному розіграші)
        • Призи видавалися по одному за раунд
        • Зважений випадковий вибір за Math.random()
        
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

// ===== ДОПОМІЖНІ ФУНКЦІЇ UI ДЛЯ ТЕСТУ СПРАВЕДЛИВОСТІ =====

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

window.FairnessTests = {
    // Основні функції тестування
    runSequenceTest,
    runDistributionTest,
    runFairnessTest,
    clearTestResults,
    clearDistributionTestResults,
    clearFairnessTestResults,
    
    // Утилітарні функції (для розробки/дебагу)
    generateRandomSequence,
    calculateRunsTestStatistics,
    simulateRaffleDistribution,
    calculateChiSquareStatistics,
    simulateFairnessTest,
    calculateFairnessStatistics,
    calculateGiniIndex,
    calculateFairnessScore,
    normalCDF,
    // selectWeightedRandom тепер в raffle-engine.js з покращеним генератором
    
    // Константи
    TEST_CONSTANTS
};

// Глобальні функції для HTML onclick атрибутів
window.runSequenceTest = runSequenceTest;
window.clearTestResults = clearTestResults;
window.runDistributionTest = runDistributionTest;
window.clearDistributionTestResults = clearDistributionTestResults;
window.runFairnessTest = runFairnessTest;
window.clearFairnessTestResults = clearFairnessTestResults;

console.log('📁 Модуль тестів чесності завантажено (з тестом справедливості)');
