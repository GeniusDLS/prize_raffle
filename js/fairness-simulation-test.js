/**
 * FAIRNESS SIMULATION TEST MODULE
 * Симуляція повного розіграшу — DP-точні ймовірності включення + bar-chart
 * Залежності: window.FairnessTests (fairness-tests.js) → window.DataManager, window.UIController, window.Logger
 */

// ===== ОСНОВНІ ФУНКЦІЇ =====

/**
 * Запускає симуляцію повного розіграшу
 * Моделює N повних розіграшів і виводить ймовірності для кожного учасника
 */
async function runSimulationTest() {
    const countInput = document.getElementById('simulation-test-count');
    const simulationCount = parseInt(countInput?.value) || TEST_CONSTANTS.DEFAULT_SIMULATIONS;

    if (simulationCount < TEST_CONSTANTS.MIN_SIMULATIONS || simulationCount > TEST_CONSTANTS.MAX_SIMULATIONS) {
        alert(`Кількість симуляцій має бути від ${TEST_CONSTANTS.MIN_SIMULATIONS} до ${TEST_CONSTANTS.MAX_SIMULATIONS}`);
        return;
    }

    if (!window.DataManager?.participants?.length) {
        alert('Додайте учасників на сторінці "Дані" для проведення симуляції!');
        return;
    }

    if (!window.DataManager?.prizes?.length) {
        alert('Додайте призи на сторінці "Дані" для проведення симуляції!');
        return;
    }

    const participants = window.DataManager.participants;
    const prizes = window.DataManager.prizes;
    const uniquePrizeCount = prizes.length;
    const totalPrizeCount = prizes.reduce((sum, p) => sum + p.count, 0);

    if (participants.length < 2) {
        alert('Для симуляції потрібно мінімум 2 учасники!');
        return;
    }

    if (totalPrizeCount >= participants.length) {
        alert('Кількість призів повинна бути меншою за кількість учасників для симуляції без повторень!');
        return;
    }

    showSimulationStatus('Виконується симуляція розіграшу...', true);
    hideSimulationResults();

    try {
        const simData = await simulateFullRaffles(participants, totalPrizeCount, uniquePrizeCount, simulationCount);
        updateSimulationStatus('Обчислення точних теоретичних ймовірностей...');
        await new Promise(resolve => setTimeout(resolve, 10));
        const exactProbabilities = computeExactInclusionProbabilities(participants, totalPrizeCount);
        displaySimulationResults(participants, simData, exactProbabilities);
        hideSimulationStatus();
    } catch (error) {
        window.Logger.error('[FairnessTests]', 'Помилка під час симуляції:', error);
        showSimulationStatus('Помилка під час виконання симуляції', false);
    }
}

/**
 * Симулює N повних розіграшів з вилученням переможців
 * У кожному розіграші переможець виключається з пулу для наступних призів
 */
async function simulateFullRaffles(participants, prizeCount, uniquePrizeCount, simulationCount) {
    window.Logger.log('[FairnessTests]', `Симуляція ${simulationCount} розіграшів × ${prizeCount} раундів (${uniquePrizeCount} типів призів)...`);

    const winCounts = {};
    participants.forEach(p => {
        winCounts[p.name] = 0;
    });

    const startTime = performance.now();

    for (let sim = 0; sim < simulationCount; sim++) {
        // Копія пулу учасників для цього розіграшу
        const pool = participants.map(p => ({ ...p }));

        // Розіграти кожен приз
        for (let round = 0; round < prizeCount && pool.length > 0; round++) {
            const winner = secureWeightedRandom(pool);
            winCounts[winner.name]++;

            // Вилучити переможця з пулу для наступних раундів
            const idx = pool.findIndex(p => p.name === winner.name);
            if (idx !== -1) {
                pool.splice(idx, 1);
            }
        }

        // Прогрес кожні 500 ітерацій
        if (sim % 500 === 0 && sim > 0) {
            updateSimulationStatus(`Проведено ${sim}/${simulationCount} симуляцій...`);
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }

    const endTime = performance.now();
    window.Logger.log('[FairnessTests]', `Симуляція завершена за ${(endTime - startTime).toFixed(2)}мс`);

    return {
        winCounts,
        simulationCount,
        prizeCount,
        uniquePrizeCount,
        participantCount: participants.length
    };
}

/**
 * Обчислює точні ймовірності включення для зваженої вибірки без повернення
 * Метод динамічного програмування по бітових масках переможців
 * Повертає null якщо кількість станів перевищує ліміт (занадто повільно)
 */
function computeExactInclusionProbabilities(participants, prizeCount) {
    const n = participants.length;
    if (n > 30) return null; // обмеження bitmask на 30 біт

    // Перевірити кількість станів C(n, prizeCount) ≤ 2 000 000
    let maxStates = 1;
    for (let i = 0; i < prizeCount; i++) {
        maxStates = maxStates * (n - i) / (i + 1);
        if (maxStates > 2_000_000) {
            window.Logger.warn('[FairnessTests]', `Точне обчислення недоступне: C(${n},${prizeCount}) > 2M, використовується наближення`);
            return null;
        }
    }

    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);

    // Кеш суми ваг для бітової маски (рекурсивний через найменший встановлений біт)
    const weightCache = new Map([[0, 0]]);
    function maskWeight(mask) {
        if (weightCache.has(mask)) return weightCache.get(mask);
        const lsb = mask & -mask;
        const j = 31 - Math.clz32(lsb);
        const w = maskWeight(mask ^ lsb) + participants[j].weight;
        weightCache.set(mask, w);
        return w;
    }

    // dp: Map бітова маска переможців → ймовірність цього набору
    let current = new Map([[0, 1.0]]);

    for (let round = 0; round < prizeCount; round++) {
        const next = new Map();
        for (const [mask, prob] of current) {
            const remainingWeight = totalWeight - maskWeight(mask);
            for (let j = 0; j < n; j++) {
                if (mask & (1 << j)) continue; // вже переміг
                const pj = participants[j].weight / remainingWeight;
                const newMask = mask | (1 << j);
                next.set(newMask, (next.get(newMask) || 0) + prob * pj);
            }
        }
        current = next;
    }

    // Ймовірність включення учасника i = сума ймовірностей масок, де біт i встановлений
    const pi = new Array(n).fill(0);
    for (const [mask, prob] of current) {
        for (let i = 0; i < n; i++) {
            if (mask & (1 << i)) pi[i] += prob;
        }
    }

    window.Logger.log('[FairnessTests]', `Точні ймовірності обчислено DP (${current.size} кінцевих станів)`);
    return pi;
}

// ===== ВІДОБРАЖЕННЯ РЕЗУЛЬТАТІВ =====

/**
 * Відображає результати симуляції
 */
function displaySimulationResults(participants, simData, exactProbabilities = null) {
    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
    const { winCounts, simulationCount, prizeCount, uniquePrizeCount } = simData;
    const useExact = exactProbabilities !== null;

    // Теоретична ймовірність: точна (DP) або наближена 1-(1-w/W)^K
    // Формула 1-(1-p)^K враховує що учасник може перемогти лише раз (вибірка без повернення)
    // На відміну від K×w/W, не переоцінює ймовірність для учасників з великою вагою
    const stats = participants.map((p, idx) => {
        const empirical = winCounts[p.name] / simulationCount;
        const theoretical = useExact
            ? exactProbabilities[idx]
            : 1 - Math.pow(1 - p.weight / totalWeight, prizeCount);
        const deviation = empirical - theoretical;
        return { ...p, wins: winCounts[p.name], empirical, theoretical, deviation };
    });

    // Сортувати за теоретичною ймовірністю (від найвищої до найнижчої)
    stats.sort((a, b) => b.theoretical - a.theoretical);

    const maxProb = Math.max(...stats.map(s => s.empirical));
    const minProb = Math.min(...stats.map(s => s.empirical));
    const avgDeviation = stats.reduce((sum, s) => sum + Math.abs(s.deviation), 0) / stats.length;

    // Очікуване статистичне відхилення при даній кількості симуляцій
    // E[|X - E[X]|] = σ × √(2/π) для нормального розподілу
    const expectedAvgDeviation = stats.reduce((sum, s) => {
        const sigma = Math.sqrt(s.theoretical * (1 - s.theoretical) / simulationCount);
        return sum + sigma * Math.sqrt(2 / Math.PI);
    }, 0) / stats.length;
    const deviationRatio = expectedAvgDeviation > 0 ? avgDeviation / expectedAvgDeviation : 1;

    // Оновити картки результатів
    updateSimulationResultValue('sim-total-simulations', simulationCount.toLocaleString());
    updateSimulationResultValue('sim-participants-count', participants.length.toString());
    updateSimulationResultValue('sim-prize-count', uniquePrizeCount !== undefined
        ? `${prizeCount} (${uniquePrizeCount} тип${getPrizeTypeSuffix(uniquePrizeCount)})`
        : prizeCount.toString());
    updateSimulationResultValue('sim-max-probability', `${(maxProb * 100).toFixed(1)}%`);
    updateSimulationResultValue('sim-min-probability', `${(minProb * 100).toFixed(1)}%`);
    updateSimulationResultValue('sim-avg-deviation', `${(avgDeviation * 100).toFixed(2)}% (очік. ~${(expectedAvgDeviation * 100).toFixed(2)}%)`);

    // Таблиця та інтерпретація
    displaySimulationTable(stats, simulationCount, useExact);
    drawSimulationChart(stats, simulationCount);
    displaySimulationInterpretation(stats, simData, avgDeviation, expectedAvgDeviation, deviationRatio, useExact);

    showSimulationResults();
}

/**
 * Відображає таблицю ймовірностей учасників
 */
function displaySimulationTable(stats, simulationCount, useExact = false) {
    const tableContainer = document.getElementById('simulation-results-table');
    if (!tableContainer) { return; }

    const escapeHtml = window.UIController.escapeHtml;
    const table = document.createElement('table');
    table.className = 'distribution-table';

    const theorLabel = useExact ? 'Теоретична (точна, DP)' : 'Теоретична (1-(1-p)ᴷ)';
    const header = `
        <thead>
            <tr>
                <th>#</th>
                <th>Учасник</th>
                <th>Вага</th>
                <th>Перемог (з ${simulationCount})</th>
                <th>Фактична ймовірність</th>
                <th>${theorLabel}</th>
                <th>Відхилення</th>
            </tr>
        </thead>
    `;

    const rows = stats.map((stat, index) => {
        const empiricalPct = (stat.empirical * 100).toFixed(2);
        const theoreticalPct = (stat.theoretical * 100).toFixed(2);
        const deviationAbs = Math.abs(stat.deviation);
        const deviationPct = (stat.deviation * 100).toFixed(2);
        const deviationClass = getDeviationClass(deviationAbs);
        const deviationPrefix = stat.deviation >= 0 ? '+' : '';

        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(stat.name)}</strong></td>
                <td>${stat.weight}</td>
                <td>${stat.wins}</td>
                <td>${empiricalPct}%</td>
                <td>${theoreticalPct}%</td>
                <td class="${deviationClass}">${deviationPrefix}${deviationPct}%</td>
            </tr>
        `;
    }).join('');

    table.innerHTML = header + '<tbody>' + rows + '</tbody>';
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
}

/**
 * Відображає інтерпретацію результатів симуляції
 */
function displaySimulationInterpretation(stats, simData, avgDeviation, expectedAvgDeviation, deviationRatio, useExact = false) {
    const interpretationEl = document.getElementById('simulation-interpretation-text');
    if (!interpretationEl) { return; }

    const { simulationCount, prizeCount, uniquePrizeCount, participantCount } = simData;
    const maxDeviation = Math.max(...stats.map(s => Math.abs(s.deviation)));
    const maxDeviationStat = stats.reduce((max, s) => Math.abs(s.deviation) > Math.abs(max.deviation) ? s : max, stats[0]);

    // Якість оцінюється відносно очікуваного статистичного шуму (deviationRatio = фактичне / очікуване)
    // ratio ≤ 1.2 — відмінно (в межах норми), ratio > 3 — справжня аномалія
    let qualityClass, qualityLabel;
    if (deviationRatio <= 1.2) {
        qualityClass = 'interpretation-good';
        qualityLabel = '✅ ВІДМІННА ТОЧНІСТЬ';
    } else if (deviationRatio <= 1.8) {
        qualityClass = 'interpretation-good';
        qualityLabel = '✅ ДОБРА ТОЧНІСТЬ';
    } else if (deviationRatio <= 3.0) {
        qualityClass = 'interpretation-warning';
        qualityLabel = '⚡ ЗАДОВІЛЬНА ТОЧНІСТЬ';
    } else {
        qualityClass = 'interpretation-bad';
        qualityLabel = '⚠️ АНОМАЛЬНА ДИСПЕРСІЯ';
    }

    const escapeHtml = window.UIController.escapeHtml;
    const betterSimCount = Math.min(TEST_CONSTANTS.MAX_SIMULATIONS, simulationCount * 5);

    const prizesLabel = uniquePrizeCount !== undefined
        ? `${prizeCount} призами (${uniquePrizeCount} тип${getPrizeTypeSuffix(uniquePrizeCount)})`
        : `${prizeCount} призами`;

    interpretationEl.innerHTML = `
        <div class="${qualityClass}">${qualityLabel}</div>
        <p>За ${simulationCount.toLocaleString()} симуляцій розіграшу з ${prizesLabel} та ${participantCount} учасниками:</p>
        <p>Середнє відхилення від теорії: <strong>${(avgDeviation * 100).toFixed(2)}%</strong>,
        очікуваний статистичний шум: <strong>~${(expectedAvgDeviation * 100).toFixed(2)}%</strong>
        (коефіцієнт: ${deviationRatio.toFixed(2)}×).
        Максимальне відхилення: <strong>${(maxDeviation * 100).toFixed(2)}%</strong>
        у учасника «${escapeHtml(maxDeviationStat.name)}».</p>
        ${useExact
            ? `<p><strong>Теоретична ймовірність</strong> обчислена точно методом динамічного програмування (DP) — повністю враховує ефект вилучення переможців з пулу. Формула K×w/W не використовується.</p>`
            : `<p><strong>Теоретична ймовірність</strong> ≈ 1 - (1 - w/W)ᴷ — наближення для вибірки без повернення. Точніше за K×w/W: правильно враховує що учасник може перемогти лише раз, не переоцінює ймовірність для учасників з великою вагою.</p>`
        }
        <p><strong>Висновок:</strong> Оцінка базується на порівнянні з очікуваним статистичним шумом
        при ${simulationCount.toLocaleString()} симуляціях. Відхилення ≤1.2× норми — відмінно,
        ≤1.8× — добре, ≤3× — задовільна точність, >3× — можлива проблема алгоритму.
        Для ще вищої точності збільшіть кількість симуляцій до ${betterSimCount.toLocaleString()}.</p>
    `;
}

/**
 * Малює горизонтальний bar-chart: теоретична (DP) vs фактична ймовірність
 * Колір фактичної смуги: зелений ≤1σ, жовтий ≤2σ, червоний >2σ
 */
function drawSimulationChart(stats, simulationCount) {
    const canvas = document.getElementById('simulation-chart');
    if (!canvas || !canvas.getContext) { return; }

    const ctx = canvas.getContext('2d');
    const n = stats.length;

    const rowH         = 34;
    const marginLeft   = 175;
    const marginRight  = 65;
    const marginTop    = 50;
    const marginBottom = 30;

    const W = Math.max(canvas.parentElement?.offsetWidth || 680, 420);
    canvas.width  = W;
    canvas.height = marginTop + n * rowH + marginBottom;
    const chartW  = W - marginLeft - marginRight;

    const maxProb = Math.max(...stats.map(s => Math.max(s.theoretical, s.empirical)));
    const xMax    = Math.min(1, maxProb * 1.18);
    const xScale  = v => marginLeft + (v / xMax) * chartW;
    const tickCount = 5;

    // Фон
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, canvas.height);

    // ===== ЗАГОЛОВОК =====
    ctx.fillStyle = '#495057';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Ймовірність перемоги: теоретична (DP) vs фактична', W / 2, 16);

    // ===== ЛЕГЕНДА =====
    const legendItems = [
        { color: 'rgba(0,123,255,0.2)', stroke: '#007bff', label: 'Теоретична' },
        { color: '#28a745', label: '≤1σ від теорії' },
        { color: '#ffc107', label: '≤2σ від теорії' },
        { color: '#dc3545', label: '>2σ від теорії' },
    ];
    let lx = marginLeft;
    const ly = 36;
    legendItems.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.fillRect(lx, ly - 11, 16, 11);
        if (item.stroke) {
            ctx.strokeStyle = item.stroke;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(lx, ly - 11, 16, 11);
        }
        ctx.fillStyle = '#495057';
        ctx.font = '11px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, lx + 20, ly);
        lx += ctx.measureText(item.label).width + 36;
    });

    // ===== РЯДКИ ДЛЯ КОЖНОГО УЧАСНИКА =====
    stats.forEach((stat, i) => {
        const y0 = marginTop + i * rowH;
        const yc = y0 + rowH / 2;

        // Зебра-фон
        if (i % 2 === 1) {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(marginLeft, y0, chartW, rowH);
        }

        // Вертикальні сітчасті лінії (тихі)
        ctx.strokeStyle = '#e9ecef';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        for (let t = 1; t <= tickCount; t++) {
            const tx = xScale((xMax / tickCount) * t);
            ctx.beginPath();
            ctx.moveTo(tx, y0);
            ctx.lineTo(tx, y0 + rowH);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // Смуга теоретична (тло, широка)
        const theorH = rowH * 0.52;
        ctx.fillStyle = 'rgba(0, 123, 255, 0.13)';
        ctx.fillRect(marginLeft, yc - theorH / 2, xScale(stat.theoretical) - marginLeft, theorH);

        // Смуга фактична (вужча, кольорова за σ)
        const sigma  = Math.sqrt(stat.theoretical * (1 - stat.theoretical) / simulationCount);
        const devAbs = Math.abs(stat.deviation);
        const empH   = rowH * 0.38;
        ctx.fillStyle = devAbs <= sigma ? '#28a745' : devAbs <= 2 * sigma ? '#ffc107' : '#dc3545';
        ctx.globalAlpha = 0.82;
        ctx.fillRect(marginLeft, yc - empH / 2, xScale(stat.empirical) - marginLeft, empH);
        ctx.globalAlpha = 1;

        // Пунктирна лінія теоретичного значення
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(xScale(stat.theoretical), y0 + 3);
        ctx.lineTo(xScale(stat.theoretical), y0 + rowH - 3);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ім'я учасника
        const name = stat.name.length > 22 ? stat.name.slice(0, 21) + '…' : stat.name;
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(name, marginLeft - 8, yc + 4);

        // Підпис справа від смуги
        const labelX = Math.max(xScale(stat.empirical), xScale(stat.theoretical)) + 5;
        ctx.fillStyle = '#495057';
        ctx.font = '11px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${(stat.empirical * 100).toFixed(1)}%`, labelX, yc + 4);
    });

    // ===== ВІС X =====
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, marginTop + n * rowH);
    ctx.stroke();

    ctx.strokeStyle = '#adb5bd';
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop + n * rowH);
    ctx.lineTo(marginLeft + chartW, marginTop + n * rowH);
    ctx.stroke();

    for (let t = 0; t <= tickCount; t++) {
        const v = (xMax / tickCount) * t;
        ctx.fillStyle = '#6c757d';
        ctx.font = '11px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${(v * 100).toFixed(0)}%`, xScale(v), marginTop + n * rowH + 18);
    }
}

/**
 * Повертає закінчення для слова "тип" залежно від числа (1 тип, 2 типи, 5 типів)
 */
function getPrizeTypeSuffix(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 14) return 'ів';
    if (mod10 === 1) return '';
    if (mod10 >= 2 && mod10 <= 4) return 'и';
    return 'ів';
}

/**
 * Оновлює значення картки результату симуляції
 */
function updateSimulationResultValue(elementId, value, className = '') {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        element.className = `result-value ${className} updated`.trim();
        setTimeout(() => element.classList.remove('updated'), 600);
    }
}

// ===== ДОПОМІЖНІ ФУНКЦІЇ UI =====

function showSimulationStatus(message, isRunning = false) {
    const statusEl = document.getElementById('simulation-test-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isRunning ? 'test-status running' : 'test-status';
        statusEl.style.display = 'block';
    }
}

function updateSimulationStatus(message) {
    const statusEl = document.getElementById('simulation-test-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function hideSimulationStatus() {
    const statusEl = document.getElementById('simulation-test-status');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
}

function showSimulationResults() {
    const resultsEl = document.getElementById('simulation-test-results');
    if (resultsEl) {
        resultsEl.style.display = 'block';
    }
}

function hideSimulationResults() {
    const resultsEl = document.getElementById('simulation-test-results');
    if (resultsEl) {
        resultsEl.style.display = 'none';
    }
}

function clearSimulationResults() {
    hideSimulationResults();
    hideSimulationStatus();

    const resultIds = ['sim-total-simulations', 'sim-participants-count', 'sim-prize-count',
        'sim-max-probability', 'sim-min-probability', 'sim-avg-deviation'];
    resultIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '-';
            el.className = 'result-value';
        }
    });

    const tableEl = document.getElementById('simulation-results-table');
    if (tableEl) { tableEl.innerHTML = ''; }

    // Очистити canvas графіка
    const chartCanvas = document.getElementById('simulation-chart');
    if (chartCanvas && chartCanvas.getContext) {
        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        chartCanvas.height = 0;
    }

    const interpretationEl = document.getElementById('simulation-interpretation-text');
    if (interpretationEl) { interpretationEl.innerHTML = ''; }
}

// ===== РЕЄСТРАЦІЯ В ГОЛОВНОМУ МОДУЛІ =====

Object.assign(window.FairnessTests, {
    runSimulationTest,
    clearSimulationResults,
    simulateFullRaffles,
    computeExactInclusionProbabilities,
    drawSimulationChart,
});

window.Logger.log('[FairnessTests]', '📁 Симуляція розіграшу (Simulation Test) завантажено');
