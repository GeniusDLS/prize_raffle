# Prize Raffle - Архітектура системи

## Загальна архітектура
Prize Raffle побудований як Single Page Application (SPA) з модульною архітектурою JavaScript. Проект використовує vanilla JavaScript без фреймворків для максимальної простоти та продуктивності.

## Структура файлів
```
prize_raffle/
├── index.html                  # Головна HTML сторінка
├── style.css                   # Всі стилі додатку
├── logo.png                    # Логотип
├── README.md                   # Документація користувача
├── js/                         # Модульна архітектура JavaScript
│   ├── main.js                 # Ініціалізація та координація
│   ├── data-manager.js         # Управління даними та збереження
│   ├── raffle-engine.js        # Логіка розіграшу та анімації
│   ├── ui-controller.js        # Інтерфейс та відображення
│   ├── fairness-tests.js       # Тести чесності генератора
│   ├── sound-manager.js        # Звукові ефекти
│   └── audio-data.js           # Base64 аудіо дані
└── sounds/                     # Оригінальні аудіо файли
    ├── drum-spin.mp3
    ├── result-ding.mp3
    └── victory-fanfare.mp3
```

## Модульна архітектура JavaScript

### Принципи організації
- **Один модуль = одна відповідальність**
- **Чіткий поділ функціональності між модулями**
- **Мінімальні залежності між модулями**
- **Експорт через window об'єкти для сумісності**

### Порядок завантаження модулів (КРИТИЧНО ВАЖЛИВИЙ!)
```html
<script src="js/data-manager.js"></script>        <!-- Управління даними -->
<script src="js/audio-data.js"></script>          <!-- Base64 аудіо дані -->
<script src="js/sound-manager.js"></script>       <!-- Звукові ефекти -->
<script src="js/raffle-engine.js"></script>       <!-- Логіка розіграшу -->
<script src="js/ui-controller.js"></script>       <!-- Інтерфейс -->
<script src="js/fairness-tests.js"></script>      <!-- Тести чесності -->
<script src="js/main.js"></script>                <!-- Ініціалізація -->
```

## Опис модулів

### 1. main.js - Координатор системи
**Відповідальність:** Ініціалізація додатку та координація між модулями
**Ключові функції:**
- Ініціалізація всіх модулів при завантаженні DOM
- Налаштування автозбереження
- Відновлення стану після перезавантаження
- Глобальні обробники помилок
- Функції зворотної сумісності для HTML onclick

### 2. data-manager.js - Управління даними
**Відповідальність:** Збереження, завантаження та управління всіма даними
**Ключові функції:**
- Управління учасниками (додавання, видалення, сортування)
- Управління призами
- Автозбереження в localStorage
- Excel імпорт/експорт
- Відновлення стану після перезавантаження
- Сортування та перемішування учасників

**Структура даних:**
```javascript
// Учасники
participants = [
    { name: "Ім'я", division: "Підрозділ", weight: 1 }
]

// Призи
prizes = [
    { name: "Назва призу", count: 1 }
]

// Результати
results = [
    { round: 1, winner: "Ім'я", winnerDivision: "Підрозділ", prize: "Приз" }
]
```

### 3. raffle-engine.js - Логіка розіграшу
**Відповідальність:** Алгоритми розіграшу та анімації
**Ключові функції:**
- Зважений випадковий вибір учасників
- Криптографічний генератор випадкових чисел
- Анімації барабанів
- Управління станом розіграшу
- Popup переможця з налаштовуваними анімаціями
- Налаштування анімацій

**Алгоритм зваженого вибору:**
```javascript
function selectWeightedRandom(participants) {
    const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
    let random = secureRandom() * totalWeight;
    
    for (const participant of participants) {
        random -= participant.weight;
        if (random <= 0) return participant;
    }
    return participants[participants.length - 1];
}
```

### 4. ui-controller.js - Інтерфейс користувача
**Відповідальність:** Відображення даних та взаємодія з користувачем
**Ключові функції:**
- Навігація між сторінками
- Оновлення таблиць учасників та призів
- Відображення результатів
- Статистика розіграшу
- Обробка форм
- Налаштування інтерфейсу

### 5. fairness-tests.js - Тести чесності
**Відповідальність:** Статистичні тести для перевірки справедливості
**Ключові функції:**
- Runs Test (тест послідовностей)
- Chi-square Test (тест розподілу)
- Тест справедливості з довірчими інтервалами
- Обчислення індексу Джині
- Інтерпретація результатів тестів

### 6. sound-manager.js - Звукова система
**Відповідальність:** Відтворення звукових ефектів
**Ключові функції:**
- Завантаження Base64 аудіо даних
- Web Audio API fallback для синтетичних звуків
- Управління звуками розіграшу (обертання, результат, перемога)
- Ініціалізація при взаємодії користувача

### 7. audio-data.js - Аудіо дані
**Відповідальність:** Зберігання Base64 аудіо файлів
**Структура:**
```javascript
window.AudioData = {
    getAudioData: (soundName) => AUDIO_BASE64_DATA[soundName],
    getAllSounds: () => Object.keys(AUDIO_BASE64_DATA),
    hasSound: (soundName) => soundName in AUDIO_BASE64_DATA
};
```

## Система збереження даних

### localStorage структура
```javascript
const STORAGE_KEYS = {
    PARTICIPANTS: 'raffle_participants',
    PRIZES: 'raffle_prizes',
    RESULTS: 'raffle_results',
    CURRENT_ROUND: 'raffle_current_round',
    IS_RAFFLE_ACTIVE: 'raffle_is_active',
    AVAILABLE_PARTICIPANTS: 'raffle_available_participants',
    AVAILABLE_PRIZES: 'raffle_available_prizes',
    RAFFLE_STATE: 'raffle_state',
    ANIMATION_SETTINGS: 'raffle_animation_settings',
    ACTIVE_TAB: 'raffle_active_tab',
    PARTICIPANTS_SORT: 'raffle_participants_sort'
};
```

### Автозбереження
- Автоматичне збереження при кожній зміні даних
- Збереження через 2 секунди після останньої зміни
- Періодичне збереження кожні 30 секунд
- Захист від втрати даних при закритті браузера

## Алгоритми та математика

### Криптографічний генератор випадкових чисел
```javascript
function secureRandom() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] / (0xffffffff + 1);
    } else {
        return Math.random(); // Fallback
    }
}
```

### Статистичні тести
1. **Runs Test** - перевірка відсутності патернів у генераторі
2. **Chi-square Test** - перевірка справедливості розподілу
3. **Тест справедливості** - комплексна оцінка з довірчими інтервалами

## Система анімацій

### CSS анімації
- Обертання барабанів з налаштовуваною швидкістю
- Ефект уповільнення перед зупинкою
- Підсвічування результатів
- Анімації popup переможця з конфеті

### Налаштовувані параметри
```javascript
const DEFAULT_ANIMATION_SETTINGS = {
    spinDuration: 5,              // Тривалість обертання (сек)
    spinSpeed: 50,                // Швидкість зміни елементів (мс)
    slowDownDuration: 1,          // Тривалість уповільнення (сек)
    showWinnerCelebration: true,  // Показувати привітання
    popupRotations: 1,            // Кількість обертів popup
    enableSound: true             // Звукові ефекти
};
```

## Звукова архітектура

### Гібридний підхід
1. **Base64 аудіо дані** (основний метод)
   - Вбудовані в код для вирішення CORS проблем
   - Швидке завантаження без зовнішніх запитів

2. **Web Audio API fallback**
   - Синтетичні звуки при помилках завантаження
   - Гарантована робота звуків

### Типи звуків
- **drumSpin** - циклічний звук обертання барабанів
- **resultDing** - короткий сигнал результату
- **victoryFanfare** - святкові фанфари перемоги

## Responsive дизайн

### Адаптивність
- Mobile-first підхід
- Flexbox та CSS Grid для макетів
- Адаптивні розміри барабанів
- Оптимізація для touch-пристроїв

### Підтримка браузерів
- Chrome 60+ (повна підтримка)
- Firefox 55+ (повна підтримка)
- Safari 12+ (повна підтримка)
- Edge 79+ (повна підтримка)

## Безпека та надійність

### Валідація даних
- Перевірка всіх користувацьких вводів
- XSS захист через textContent
- Обробка помилок localStorage

### Відновлення після збоїв
- Автоматичне відновлення стану
- Graceful degradation при помилках
- Fallback механізми для всіх критичних функцій

## Розширюваність

### Додавання нових модулів
1. Створити новий JS файл
2. Експортувати функції через window об'єкт
3. Додати до порядку завантаження в index.html
4. Ініціалізувати в main.js

### Додавання нових тестів
1. Додати функцію в fairness-tests.js
2. Створити UI елементи в index.html
3. Додати стилі в style.css
4. Зареєструвати обробники в ui-controller.js