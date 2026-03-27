/**
 * FAIRNESS TESTS — СПІЛЬНІ УТИЛІТИ
 * Базові константи та допоміжні функції для всіх підмодулів тестування чесності.
 * Завантажується першим; підмодулі розширюють window.FairnessTests через Object.assign.
 *
 * Порядок завантаження:
 *   fairness-tests.js → fairness-sequence-test.js → fairness-distribution-test.js
 *   → fairness-fairness-test.js → fairness-simulation-test.js → main.js
 */

// ===== КОНСТАНТИ =====

const TEST_CONSTANTS = {
    CONFIDENCE_LEVEL: 0.05, // 95% довірчий інтервал
    MIN_SIMULATIONS: 100,
    MAX_SIMULATIONS: 10000,
    DEFAULT_SIMULATIONS: 1000
};

// ===== СПІЛЬНІ ДОПОМІЖНІ ФУНКЦІЇ =====

/**
 * Зважений випадковий вибір для тестів
 * Використовує window.RaffleEngine.secureRandom() як єдине джерело криптогенератора
 */
function secureWeightedRandom(participants) {
    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
    let random = window.RaffleEngine.secureRandom() * totalWeight;

    for (const participant of participants) {
        random -= participant.weight;
        if (random <= 0) {
            return participant;
        }
    }

    return participants[participants.length - 1];
}

/**
 * Визначає CSS-клас для відображення відхилення
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
 * Наближене обчислення функції розподілу стандартної нормальної змінної
 * Наближення Abramowitz and Stegun
 */
function normalCDF(x) {
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

// ===== БАЗОВИЙ ОБ'ЄКТ МОДУЛЯ =====
// Підмодулі розширюють цей об'єкт через Object.assign(window.FairnessTests, {...})

window.FairnessTests = {
    TEST_CONSTANTS,
    secureWeightedRandom,
    getDeviationClass,
    normalCDF,
};

window.Logger.log('[FairnessTests]', '📁 Спільні утиліти тестів чесності завантажено');

