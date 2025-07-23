/**
 * SOUND MANAGER MODULE
 * Відповідає за генерацію та відтворення звукових ефектів
 * Використовує реальні аудіо файли з fallback на Web Audio API
 */

// ===== ГЛОБАЛЬНІ ЗМІННІ ТА КОНСТАНТИ =====

let audioContext = null;
let isAudioInitialized = false;
let currentSpinSound = null;

// Аудіо об'єкти для файлів
let audioFiles = {
    drumSpin: null,
    resultDing: null,
    victoryFanfare: null
};

// Base64 аудіо дані (замість локальних файлів для вирішення CORS проблем)
// Дані завантажуються з модуля audio-data.js
const AUDIO_URLS = {};

// Налаштування звукових ефектів для Web Audio API fallback
const SOUND_SETTINGS = {
    // Обертання барабанів
    spin: {
        frequency: 220,        // Базова частота (Hz)
        duration: 0.1,         // Тривалість одного "тіка" (секунди)
        volume: 0.3,           // Гучність (0-1)
        type: 'square'         // Тип хвилі
    },
    
    // Результат розіграшу
    result: {
        frequency: 440,        // Частота (Hz)
        duration: 0.2,         // Тривалість (секунди)
        volume: 0.4,           // Гучність (0-1)
        type: 'sine'           // Тип хвилі
    },
    
    // Перемога
    victory: {
        frequencies: [523, 659, 784, 1047], // До, Мі, Соль, До (октава вище)
        noteDuration: 0.3,     // Тривалість кожної ноти
        volume: 0.5,           // Гучність (0-1)
        type: 'sine'           // Тип хвилі
    }
};

// Стан завантаження аудіо файлів
let audioFilesLoaded = false;
let useWebAudioFallback = false;

// ===== ІНІЦІАЛІЗАЦІЯ АУДІО ФАЙЛІВ =====

/**
 * Завантажити та ініціалізувати аудіо файли
 */
async function loadAudioFiles() {
    if (audioFilesLoaded) {
        return Promise.resolve();
    }
    
    console.log('Завантаження Base64 аудіо даних...');
    
    // Перевірити чи доступний модуль AudioData
    if (!window.AudioData) {
        console.warn('Модуль AudioData не завантажений, використовується Web Audio API');
        useWebAudioFallback = true;
        return initializeAudioContext();
    }
    
    const loadPromises = [];
    const soundNames = ['drumSpin', 'resultDing', 'victoryFanfare'];
    
    // Завантажити Base64 аудіо дані
    for (const soundName of soundNames) {
        const base64Data = window.AudioData.getAudioData(soundName);
        if (base64Data) {
            const promise = loadAudioFromBase64(soundName, base64Data).catch(() => {
                console.warn(`Не вдалося завантажити ${soundName}, буде використано Web Audio API`);
                return null;
            });
            loadPromises.push(promise);
        } else {
            console.warn(`Base64 дані для ${soundName} не знайдені`);
            loadPromises.push(Promise.resolve(null));
        }
    }
    
    try {
        const results = await Promise.all(loadPromises);
        const successCount = results.filter(result => result !== null).length;
        
        if (successCount === 0) {
            console.warn('Жоден аудіо файл не завантажився з Base64, використовується Web Audio API');
            useWebAudioFallback = true;
            await initializeAudioContext();
        } else {
            console.log(`Завантажено ${successCount} з ${results.length} Base64 аудіо файлів`);
            audioFilesLoaded = true;
        }
        
        return Promise.resolve();
    } catch (error) {
        console.error('Помилка завантаження Base64 аудіо файлів:', error);
        useWebAudioFallback = true;
        return initializeAudioContext();
    }
}

/**
 * Завантажити аудіо файл з Base64 даних
 * @param {string} key - Ключ аудіо файлу
 * @param {string} base64Data - Base64 data URL
 */
function loadAudioFromBase64(key, base64Data) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        
        audio.addEventListener('canplaythrough', () => {
            audioFiles[key] = audio;
            resolve(audio);
        });
        
        audio.addEventListener('error', (e) => {
            console.error(`Помилка завантаження ${key} з Base64 даних:`, e);
            reject(e);
        });
        
        // Налаштування для Base64 даних
        audio.preload = 'auto';
        audio.src = base64Data;
    });
}

// ===== ІНІЦІАЛІЗАЦІЯ WEB AUDIO API (FALLBACK) =====

/**
 * Ініціалізація Web Audio API як fallback
 */
function initializeAudioContext() {
    if (isAudioInitialized) {
        return Promise.resolve();
    }
    
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
            console.warn('Web Audio API не підтримується цим браузером');
            return Promise.reject(new Error('Web Audio API не підтримується'));
        }
        
        audioContext = new AudioContextClass();
        
        if (audioContext.state === 'suspended') {
            return audioContext.resume().then(() => {
                isAudioInitialized = true;
                console.log('Web Audio API ініціалізовано та відновлено');
            });
        } else {
            isAudioInitialized = true;
            console.log('Web Audio API ініціалізовано');
            return Promise.resolve();
        }
    } catch (error) {
        console.error('Помилка ініціалізації Web Audio API:', error);
        return Promise.reject(error);
    }
}

// ===== ФУНКЦІЇ ВІДТВОРЕННЯ АУДІО ФАЙЛІВ =====

/**
 * Відтворити аудіо файл
 * @param {string} key - Ключ аудіо файлу
 * @param {boolean} loop - Чи зациклити звук
 * @param {number} volume - Гучність (0-1)
 */
function playAudioFile(key, loop = false, volume = 1.0) {
    const audio = audioFiles[key];
    if (!audio) {
        return null;
    }
    
    try {
        // Клонувати аудіо об'єкт для можливості одночасного відтворення
        const audioClone = audio.cloneNode();
        audioClone.loop = loop;
        audioClone.volume = volume;
        
        const playPromise = audioClone.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn('Не вдалося відтворити звук:', error);
            });
        }
        
        return audioClone;
    } catch (error) {
        console.warn('Помилка відтворення звуку:', error);
        return null;
    }
}

/**
 * Зупинити аудіо файл
 * @param {HTMLAudioElement} audioElement - Елемент аудіо для зупинки
 */
function stopAudioFile(audioElement) {
    if (audioElement && typeof audioElement.pause === 'function') {
        try {
            audioElement.pause();
            audioElement.currentTime = 0;
        } catch (error) {
            console.warn('Помилка зупинки звуку:', error);
        }
    }
}

// ===== ГЕНЕРАТОРИ ЗВУКОВИХ ЕФЕКТІВ (WEB AUDIO API FALLBACK) =====

/**
 * Створити простий тон з заданими параметрами (fallback)
 */
function createTone(frequency, duration, volume = 0.3, type = 'sine', startTime = null) {
    if (!audioContext || !isAudioInitialized) {
        return null;
    }
    
    const currentTime = startTime || audioContext.currentTime;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, currentTime);
    
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
    
    return oscillator;
}

/**
 * Створити звук обертання барабанів (fallback)
 */
function createSpinSound(duration, interval = 100) {
    if (!audioContext || !isAudioInitialized) {
        return null;
    }
    
    const settings = SOUND_SETTINGS.spin;
    const tickDuration = settings.duration;
    const ticksCount = Math.floor((duration * 1000) / interval);
    
    const oscillators = [];
    
    for (let i = 0; i < ticksCount; i++) {
        const startTime = audioContext.currentTime + (i * interval / 1000);
        const frequency = settings.frequency + (Math.random() - 0.5) * 50;
        
        const oscillator = createTone(
            frequency,
            tickDuration,
            settings.volume,
            settings.type,
            startTime
        );
        
        if (oscillator) {
            oscillators.push(oscillator);
        }
    }
    
    return oscillators;
}

// ===== ПУБЛІЧНІ ФУНКЦІЇ ЗВУКОВИХ ЕФЕКТІВ =====

/**
 * Відтворити звук обертання барабанів
 * @param {number} duration - Тривалість в секундах
 */
function playSpinSound(duration = 3) {
    if (!isSoundEnabled()) {
        return;
    }
    
    stopSpinSound(); // Зупинити попередній звук
    
    if (audioFilesLoaded && audioFiles.drumSpin && !useWebAudioFallback) {
        // Використати аудіо файл
        currentSpinSound = playAudioFile('drumSpin', true, 0.5);
        
        // Зупинити через вказаний час
        setTimeout(() => {
            stopSpinSound();
        }, duration * 1000);
    } else if (useWebAudioFallback) {
        // Використати Web Audio API fallback
        initializeAudioContext().then(() => {
            currentSpinSound = createSpinSound(duration);
        }).catch(error => {
            console.warn('Не вдалося відтворити звук обертання:', error);
        });
    }
}

/**
 * Зупинити звук обертання барабанів
 */
function stopSpinSound() {
    if (currentSpinSound) {
        if (Array.isArray(currentSpinSound)) {
            // Web Audio API oscillators
            currentSpinSound.forEach(oscillator => {
                try {
                    oscillator.stop();
                } catch (error) {
                    // Ігноруємо помилки зупинки
                }
            });
        } else {
            // HTML Audio element
            stopAudioFile(currentSpinSound);
        }
        currentSpinSound = null;
    }
}

/**
 * Відтворити звук результату розіграшу
 */
function playResultSound() {
    if (!isSoundEnabled()) {
        return;
    }
    
    if (audioFilesLoaded && audioFiles.resultDing && !useWebAudioFallback) {
        // Використати аудіо файл
        playAudioFile('resultDing', false, 0.7);
    } else if (useWebAudioFallback) {
        // Використати Web Audio API fallback
        initializeAudioContext().then(() => {
            const settings = SOUND_SETTINGS.result;
            createTone(settings.frequency, settings.duration, settings.volume, settings.type);
        }).catch(error => {
            console.warn('Не вдалося відтворити звук результату:', error);
        });
    }
}

/**
 * Відтворити звук перемоги
 */
function playVictorySound() {
    if (!isSoundEnabled()) {
        return;
    }
    
    if (audioFilesLoaded && audioFiles.victoryFanfare && !useWebAudioFallback) {
        // Використати аудіо файл
        playAudioFile('victoryFanfare', false, 0.8);
    } else if (useWebAudioFallback) {
        // Використати Web Audio API fallback
        initializeAudioContext().then(() => {
            const settings = SOUND_SETTINGS.victory;
            const oscillators = [];
            
            settings.frequencies.forEach((frequency, index) => {
                const startTime = audioContext.currentTime + (index * settings.noteDuration);
                
                const oscillator = createTone(
                    frequency,
                    settings.noteDuration,
                    settings.volume,
                    settings.type,
                    startTime
                );
                
                if (oscillator) {
                    oscillators.push(oscillator);
                }
            });
        }).catch(error => {
            console.warn('Не вдалося відтворити звук перемоги:', error);
        });
    }
}

// ===== ДОПОМІЖНІ ФУНКЦІЇ =====

/**
 * Перевірити чи увімкнені звукові ефекти в налаштуваннях
 * @returns {boolean}
 */
function isSoundEnabled() {
    if (window.RaffleEngine && window.RaffleEngine.animationSettings) {
        return window.RaffleEngine.animationSettings.enableSound;
    }
    
    const enableSoundCheckbox = document.getElementById('enable-sound');
    return enableSoundCheckbox ? enableSoundCheckbox.checked : false;
}

/**
 * Ініціалізувати звуковий менеджер при завантаженні сторінки
 */
function initializeSoundManager() {
    // Додати обробник для ініціалізації аудіо при першій взаємодії користувача
    const initAudioOnInteraction = () => {
        loadAudioFiles().then(() => {
            console.log('Звуковий менеджер готовий до роботи');
        }).catch(error => {
            console.warn('Звуковий менеджер не може бути ініціалізований:', error);
            useWebAudioFallback = true;
            return initializeAudioContext();
        });
        
        // Видалити обробники після першої ініціалізації
        document.removeEventListener('click', initAudioOnInteraction);
        document.removeEventListener('keydown', initAudioOnInteraction);
        document.removeEventListener('touchstart', initAudioOnInteraction);
    };
    
    // Додати обробники для різних типів взаємодії
    document.addEventListener('click', initAudioOnInteraction);
    document.addEventListener('keydown', initAudioOnInteraction);
    document.addEventListener('touchstart', initAudioOnInteraction);
}

// ===== ЕКСПОРТ МОДУЛЯ =====

// Експортувати функції через window об'єкт для сумісності з архітектурою проекту
window.SoundManager = {
    // Ініціалізація
    initializeSoundManager,
    loadAudioFiles,
    initializeAudioContext,
    
    // Звукові ефекти
    playSpinSound,
    stopSpinSound,
    playResultSound,
    playVictorySound,
    
    // Допоміжні функції
    isSoundEnabled,
    
    // Налаштування та стан
    get soundSettings() { return SOUND_SETTINGS; },
    get isInitialized() { return audioFilesLoaded || isAudioInitialized; },
    get usesFallback() { return useWebAudioFallback; },
    get audioContext() { return audioContext; },
    get usesBase64() { return audioFilesLoaded && !useWebAudioFallback; }
};

// Автоматично ініціалізувати при завантаженні модуля
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSoundManager);
} else {
    initializeSoundManager();
}