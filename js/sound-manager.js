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
const audioFiles = {
    drumSpin: null,
    resultDing: null,
    victoryFanfare: null
};

// Шляхи до MP3 файлів для http/https протоколу
const AUDIO_MP3_URLS = {
    drumSpin: 'sounds/drum-spin.mp3',
    resultDing: 'sounds/result-ding.mp3',
    victoryFanfare: 'sounds/victory-fanfare.mp3'
};

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
// Кешований проміс завантаження — щоб повторні виклики не запускали нове завантаження
let _audioLoadPromise = null;

// ===== ІНІЦІАЛІЗАЦІЯ АУДІО ФАЙЛІВ =====

/**
 * Повернути проміс готовності аудіо (кешований — завантаження відбувається лише один раз)
 */
function ensureAudioLoaded() {
    if (audioFilesLoaded || useWebAudioFallback) {
        return Promise.resolve();
    }
    if (!_audioLoadPromise) {
        _audioLoadPromise = loadAudioFiles();
    }
    return _audioLoadPromise;
}

/**
 * Динамічно підвантажити модуль audio-data.js (лише для file:// протоколу)
 * @returns {Promise<void>}
 */
function loadAudioDataModule() {
    return new Promise((resolve, reject) => {
        if (window.AudioData) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'js/audio-data.js';

        script.addEventListener('load', () => {
            window.Logger.log('[SoundManager]', 'Модуль audio-data.js завантажено динамічно');
            resolve();
        });

        script.addEventListener('error', () => {
            reject(new Error('Не вдалося завантажити audio-data.js'));
        });

        document.head.appendChild(script);
    });
}

/**
 * Завантажити аудіо файл за URL (http/https протокол)
 * @param {string} key - Ключ аудіо файлу
 * @param {string} url - URL до MP3 файлу
 */
function loadAudioFromUrl(key, url) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();

        audio.addEventListener('canplaythrough', () => {
            audioFiles[key] = audio;
            resolve(audio);
        });

        audio.addEventListener('error', (e) => {
            window.Logger.error('[SoundManager]', `Помилка завантаження ${key} з URL:`, e);
            reject(e);
        });

        audio.preload = 'auto';
        audio.src = url;
    });
}

/**
 * Завантажити та ініціалізувати аудіо файли.
 * При http/https — завантажує MP3 напряму.
 * При file:// — динамічно підвантажує audio-data.js і використовує Base64.
 */
async function loadAudioFiles() {
    if (audioFilesLoaded) {
        return Promise.resolve();
    }

    const isLocalFile = window.location.protocol === 'file:';

    if (!isLocalFile) {
        // ===== HTTP/HTTPS: завантажуємо MP3 напряму =====
        window.Logger.log('[SoundManager]', 'Завантаження MP3 файлів напряму...');

        const soundNames = ['drumSpin', 'resultDing', 'victoryFanfare'];
        const loadPromises = soundNames.map(name =>
            loadAudioFromUrl(name, AUDIO_MP3_URLS[name]).catch(() => {
                window.Logger.warn('[SoundManager]', `Не вдалося завантажити ${name}, буде використано Web Audio API`);
                return null;
            })
        );

        try {
            const results = await Promise.all(loadPromises);
            const successCount = results.filter(r => r !== null).length;

            if (successCount === 0) {
                window.Logger.warn('[SoundManager]', 'Жоден MP3 не завантажився, використовується Web Audio API');
                useWebAudioFallback = true;
                await initializeAudioContext();
            } else {
                window.Logger.log('[SoundManager]', `Завантажено ${successCount} з ${results.length} MP3 файлів`);
                audioFilesLoaded = true;
            }
        } catch (error) {
            window.Logger.error('[SoundManager]', 'Помилка завантаження MP3 файлів:', error);
            useWebAudioFallback = true;
            await initializeAudioContext();
        }

        return Promise.resolve();
    }

    // ===== FILE://: динамічно підвантажуємо audio-data.js і використовуємо Base64 =====
    window.Logger.log('[SoundManager]', 'Локальний режим — завантаження Base64 аудіо даних...');

    try {
        await loadAudioDataModule();
    } catch (error) {
        window.Logger.warn('[SoundManager]', 'Не вдалося завантажити audio-data.js:', error);
        useWebAudioFallback = true;
        return initializeAudioContext();
    }

    if (!window.AudioData) {
        window.Logger.warn('[SoundManager]', 'Модуль AudioData недоступний, використовується Web Audio API');
        useWebAudioFallback = true;
        return initializeAudioContext();
    }

    const soundNames = ['drumSpin', 'resultDing', 'victoryFanfare'];
    const loadPromises = soundNames.map(name => {
        const base64Data = window.AudioData.getAudioData(name);
        if (base64Data) {
            return loadAudioFromBase64(name, base64Data).catch(() => {
                window.Logger.warn('[SoundManager]', `Не вдалося завантажити ${name}, буде використано Web Audio API`);
                return null;
            });
        }
        window.Logger.warn('[SoundManager]', `Base64 дані для ${name} не знайдені`);
        return Promise.resolve(null);
    });

    try {
        const results = await Promise.all(loadPromises);
        const successCount = results.filter(r => r !== null).length;

        if (successCount === 0) {
            window.Logger.warn('[SoundManager]', 'Жоден аудіо файл не завантажився з Base64, використовується Web Audio API');
            useWebAudioFallback = true;
            await initializeAudioContext();
        } else {
            window.Logger.log('[SoundManager]', `Завантажено ${successCount} з ${results.length} Base64 аудіо файлів`);
            audioFilesLoaded = true;
        }
    } catch (error) {
        window.Logger.error('[SoundManager]', 'Помилка завантаження Base64 аудіо:', error);
        useWebAudioFallback = true;
        await initializeAudioContext();
    }

    return Promise.resolve();
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
            window.Logger.error('[SoundManager]', `Помилка завантаження ${key} з Base64 даних:`, e);
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
            window.Logger.warn('[SoundManager]', 'Web Audio API не підтримується цим браузером');
            return Promise.reject(new Error('Web Audio API не підтримується'));
        }
        
        audioContext = new AudioContextClass();
        
        if (audioContext.state === 'suspended') {
            return audioContext.resume().then(() => {
                isAudioInitialized = true;
                window.Logger.log('[SoundManager]', 'Web Audio API ініціалізовано та відновлено');
            });
        } else {
            isAudioInitialized = true;
            window.Logger.log('[SoundManager]', 'Web Audio API ініціалізовано');
            return Promise.resolve();
        }
    } catch (error) {
        window.Logger.error('[SoundManager]', 'Помилка ініціалізації Web Audio API:', error);
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
        // Скидаємо позицію та відтворюємо той самий об'єкт — файл завантажується лише один раз
        audio.loop = loop;
        audio.volume = volume;
        audio.currentTime = 0;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                window.Logger.warn('[SoundManager]', 'Не вдалося відтворити звук:', error);
            });
        }

        return audio;
    } catch (error) {
        window.Logger.warn('[SoundManager]', 'Помилка відтворення звуку:', error);
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
            window.Logger.warn('[SoundManager]', 'Помилка зупинки звуку:', error);
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
        const frequency = settings.frequency + (window.RaffleEngine.secureRandom() - 0.5) * 50;
        
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

    ensureAudioLoaded().then(() => {
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
                window.Logger.warn('[SoundManager]', 'Не вдалося відтворити звук обертання:', error);
            });
        }
    }).catch(error => {
        window.Logger.warn('[SoundManager]', 'Не вдалося відтворити звук обертання:', error);
    });
}

/**
 * Зупинити звук обертання барабанів
 */
function stopSpinSound() {
    if (currentSpinSound) {
        if (Array.isArray(currentSpinSound)) {
            // Осцилятори Web Audio API
            currentSpinSound.forEach(oscillator => {
                try {
                    oscillator.stop();
                } catch (error) {
                    // Ігноруємо помилки зупинки
                }
            });
        } else {
            // Елемент HTML Audio
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
    
    ensureAudioLoaded().then(() => {
        if (audioFilesLoaded && audioFiles.resultDing && !useWebAudioFallback) {
            // Використати аудіо файл
            playAudioFile('resultDing', false, 0.7);
        } else if (useWebAudioFallback) {
            // Використати Web Audio API fallback
            initializeAudioContext().then(() => {
                const settings = SOUND_SETTINGS.result;
                createTone(settings.frequency, settings.duration, settings.volume, settings.type);
            }).catch(error => {
                window.Logger.warn('[SoundManager]', 'Не вдалося відтворити звук результату:', error);
            });
        }
    }).catch(error => {
        window.Logger.warn('[SoundManager]', 'Не вдалося відтворити звук результату:', error);
    });
}

/**
 * Відтворити звук перемоги
 */
function playVictorySound() {
    if (!isSoundEnabled()) {
        return;
    }
    
    ensureAudioLoaded().then(() => {
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
                window.Logger.warn('[SoundManager]', 'Не вдалося відтворити звук перемоги:', error);
            });
        }
    }).catch(error => {
        window.Logger.warn('[SoundManager]', 'Не вдалося відтворити звук перемоги:', error);
    });
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
        ensureAudioLoaded().then(() => {
            window.Logger.log('[SoundManager]', 'Звуковий менеджер готовий до роботи');
        }).catch(error => {
            window.Logger.warn('[SoundManager]', 'Звуковий менеджер не може бути ініціалізований:', error);
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