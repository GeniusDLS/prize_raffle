/**
 * FAIRNESS DISTRIBUTION TEST MODULE
 * Тест розподілу (Chi-square Test) — перевіряє чи отримують учасники призи відповідно до ваги
 * Залежності: window.FairnessTests (fairness-tests.js) → window.DataManager, window.UIController, window.Logger
 */

// ===== ОСНОВНІ ФУНКЦІЇ =====

/**
 * Запускає тест розподілу (Chi-square Test)
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
        window.Logger.error('[FairnessTests]', 'Помилка під час тестування розподілу:', error);
        showDistributionTestStatus('Помилка під час виконання тесту розподілу', false);
    }
}

/**
 * Симулює багато розіграшів для перевірки розподілу
 */
async function simulateRaffleDistribution(participants, simulationCount) {
    window.Logger.log('[FairnessTests]', `Симуляція ${simulationCount} розіграшів...`);

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
    window.Logger.log('[FairnessTests]', `Симуляція завершена за ${(endTime - startTime).toFixed(2)}мс`);

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

// ===== ВІДОБРАЖЕННЯ РЕЗУЛЬТАТІВ =====

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
 * Відображає таблицю розподілу учасників
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

    const escapeHtml = window.UIController.escapeHtml;

    // Рядки таблиці
    const rows = participantStats.map(stat => {
        const deviationClass = getDeviationClass(stat.relativeDeviation);
        const deviationPercent = (stat.relativeDeviation * 100).toFixed(1);

        return `
            <tr>
                <td><strong>${escapeHtml(stat.name)}</strong></td>
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

// ===== ДОПОМІЖНІ ФУНКЦІЇ UI =====

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

// ===== РЕЄСТРАЦІЯ В ГОЛОВНОМУ МОДУЛІ =====

Object.assign(window.FairnessTests, {
    runDistributionTest,
    clearDistributionTestResults,
    simulateRaffleDistribution,
    calculateChiSquareStatistics,
});

window.Logger.log('[FairnessTests]', '📁 Тест розподілу (Chi-square Test) завантажено');
