# Інструкції для проекту Prize Raffle

## Загальна інформація
- **Назва проекту**: Prize Raffle (Розіграш призів)
- **Опис**: Веб-додаток для проведення справедливих розіграшів з анімованими барабанами, тестами чесності та автоматичним збереженням стану
- **Технології**: HTML5, CSS3, JavaScript ES6+, SheetJS (XLSX), localStorage API
- **Мова коментарів**: Українська

## Структура проекту
- **Кореневий каталог**: `.` (поточний каталог)
- **Основні підкаталоги**:
  - `.github/` - документація та інструкції проекту
  - `src/prize_raffle/` - основний код (не використовується, код в корені)
  - `js/` - модульна архітектура JavaScript
  - `js/data-manager.js` - управління даними та збереження
  - `js/raffle-engine.js` - логіка розіграшу та анімації
  - `js/ui-controller.js` - інтерфейс та відображення
  - `js/fairness-tests.js` - тести чесності генератора
  - `js/main.js` - ініціалізація та координація
  - `tests/` - тести (якщо потрібно)
  - `docs/` - документація (якщо потрібно)

## Робочий процес
- **ВАЖЛИВО**: Перед внесенням будь-яких змін до файлів проекту, Claude повинен **узгоджувати ці зміни** зі мною
- Для кожної пропонованої зміни потрібно:
  1. Описати, які зміни плануються внести
  2. Обґрунтувати необхідність цих змін
  3. Вказати файли, які будуть змінені
  4. Отримати моє підтвердження перед внесенням змін

## 🚨 КРИТИЧНО ВАЖЛИВО - ДОТРИМАННЯ ІНСТРУКЦІЙ
- **ЗАБОРОНЕНО виконувати будь-які дії без явного узгодження**
- **НЕ робити зайвих рухів** - працювати тільки в рамках поставленого завдання
- **НЕ створювати тестові проекти, файли або скрипти** без прямого запиту
- **НЕ запускати додатки або команди** без чіткого обґрунтування та дозволу
- **ЧІТКО слідувати інструкціям** - якщо інструкції не передбачають щось, то цього робити НЕ потрібно
- **ЗАВЖДИ спочатку питати, потім діяти** - якщо є сумніви щодо необхідності дії
- **ФОКУСУВАТИСЯ на конкретному завданні** - не відволікатися на додаткові можливості

### Принцип роботи: "Зроби тільки те, що потрібно"
1. **Аналізуй завдання** - розумій точно, що потрібно зробити
2. **Плануй мінімальні зміни** - тільки те, що необхідно для вирішення проблеми
3. **Узгоджуй план** - перед будь-якими змінами
4. **Виконуй тільки узгоджене** - без додаткових ініціатив
5. **НЕ тестуй без запиту** - аналіз коду замість запуску програм

## Модульна архітектура JavaScript

### Принципи модульної організації
- **Один модуль = одна відповідальність**
- **Чіткий поділ функціональності між модулями**
- **Мінімальні залежності між модулями**
- **Експорт через window об'єкти для сумісності**

### Структура модулів
```
js/
├── main.js              # Ініціалізація та координація
├── data-manager.js      # Управління даними та збереження
├── raffle-engine.js     # Логіка розіграшу та анімації
├── ui-controller.js     # Інтерфейс та відображення
└── fairness-tests.js    # Тести чесності генератора
```

### Порядок завантаження модулів
```html
<!-- Порядок КРИТИЧНО важливий! -->
<script src="js/data-manager.js"></script>
<script src="js/raffle-engine.js"></script>
<script src="js/ui-controller.js"></script>
<script src="js/fairness-tests.js"></script>
<script src="js/main.js"></script>
```

### Експорт модулів
Кожен модуль експортує свої функції через window об'єкт:
```javascript
window.ModuleName = {
    // Публічні функції та змінні
    publicFunction,
    get publicVariable() { return privateVariable; },
    set publicVariable(value) { privateVariable = value; }
};
```

## Правила написання коду
- **Стиль коду**: Власний стиль проекту з українськими коментарями
- **Відступ**: 4 пробіли
- **Максимальна довжина рядка**: 120 символів
- **Фігурні дужки**: Для всіх блоків коду, навіть для однорядкових
- **Сучасні функції**: використовувати ES6+ можливості (const/let, arrow functions, template literals)

## Найменування
- **Функції та змінні**: camelCase (`addParticipant`, `isRaffleActive`)
- **Константи**: UPPER_CASE (`STORAGE_KEYS`, `DEFAULT_ANIMATION_SETTINGS`)
- **DOM елементи**: kebab-case в HTML, camelCase в JavaScript
- **Модулі**: PascalCase (`DataManager`, `RaffleEngine`)
- **Файли**: kebab-case (`data-manager.js`, `fairness-tests.js`)
- **Використовувати змістовні та описові назви українською або англійською**

## Коментарі та документація
- **Документація**: Блокові коментарі для модулів та основних функцій
- **Мова коментарів**: Українська
- **Уникати очевидних коментарів**
- **Документувати складні алгоритми та бізнес-логіку**
- **Використовувати розділювачі для структурування коду**

### Приклад документації модуля:
```javascript
/**
 * DATA MANAGER MODULE
 * Відповідає за управління даними, збереження та Excel операції
 */

// ===== ГЛОБАЛЬНІ ЗМІННІ ТА КОНСТАНТИ =====

// ===== ФУНКЦІЇ ЛОКАЛЬНОГО ЗБЕРЕЖЕННЯ =====
```

## Особливості проекту

### Автозбереження та localStorage
- **Автоматичне збереження**: Всі зміни зберігаються автоматично
- **Відновлення стану**: При перезавантаженні сторінки стан відновлюється
- **Ключі збереження**: Використовувати константи з `STORAGE_KEYS`
- **Обробка помилок**: Завжди обгортати localStorage операції в try-catch

### Анімації та UI
- **Налаштовувані анімації**: Всі параметри анімації зберігаються окремо
- **Responsive дизайн**: Підтримка різних розмірів екрану
- **Accessibility**: Врахування доступності інтерфейсу

### Excel інтеграція
- **SheetJS бібліотека**: Для роботи з Excel файлами
- **Підтримка кількох форматів**: .xlsx та .xls
- **Автоматичне визначення структури**: Розпізнавання заголовків та даних

### Тести чесності
- **Статистичні тести**: Runs Test, Chi-square Test, тест справедливості
- **Криптографічний генератор**: Використання crypto.getRandomValues()
- **Інтерпретація результатів**: Автоматичне пояснення статистики

## Взаємодія з AI
- **Середовище розробки**: Windows 11 з cmd.exe
- **При використанні terminal команд використовувати Windows CMD синтаксис**
- При аналізі коду потрібно пояснювати логіку та структуру існуючих рішень
- При пропонуванні змін надавати кілька альтернатив, якщо це можливо
- Використовувати сучасні практики розробки на JavaScript
- **ЗАБОРОНЕНО виконувати команди або тести без прямого запиту розробника**

## Якість коду
- Слідкувати за принципами чистого коду
- Уникати глобальних змінних (крім експорту модулів)
- Код має бути читабельним та добре структурованим
- Використовувати const за замовчуванням, let тільки при необхідності
- Уникати var повністю

## Інструменти розробки
- **Операційна система**: Windows 11
- **Shell**: cmd.exe
- **IDE**: VS Code
- **Система контролю версій**: Git
- **Управління пакетами**: Не використовується (CDN для залежностей)
- **Додаткові інструменти**: SheetJS для Excel, localStorage для збереження

## Тестування
- **Ручне тестування**: Через веб-інтерфейс
- **Тести чесності**: Вбудовані статистичні тести
- **Перевірка сумісності**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Тестування localStorage**: Перевірка збереження та відновлення стану

## Безпека
- **Валідація вводу**: Перевірка всіх користувацьких даних
- **XSS захист**: Використання textContent замість innerHTML
- **localStorage**: Обробка помилок при роботі з локальним сховищем
- **Криптографічна випадковість**: crypto.getRandomValues() для генерації

## Додаткові вимоги

### Performance
- **Оптимізація анімацій**: Використання CSS transitions та transforms
- **Ледача ініціалізація**: Модулі ініціалізуються тільки при потребі
- **Мінімізація DOM операцій**: Батчинг змін DOM

### Scalability
- **Модульна архітектура**: Легке додавання нових функцій
- **Конфігурація**: Винесення налаштувань в константи
- **Розширюваність**: Можливість додавання нових тестів чесності

### Logging
- **Console логування**: Для розробки та налагодження
- **Рівні логування**: console.log, console.warn, console.error
- **Структуроване логування**: З префіксами модулів

### Error Handling
- **Try-catch блоки**: Для всіх критичних операцій
- **Graceful degradation**: Продовження роботи при помилках
- **Користувацькі повідомлення**: Зрозумілі повідомлення про помилки

## Специфічні правила для статистичних модулів

### Математичні обчислення
- **Точність**: Використовувати parseFloat для дробових чисел
- **Валідація**: Перевіряти вхідні дані на коректність
- **Константи**: Виносити математичні константи окремо
- **Коментарі**: Пояснювати складні формули українською

### Генератори випадкових чисел
- **Пріоритет crypto.getRandomValues()**: Для критичних обчислень
- **Fallback на Math.random()**: Для сумісності зі старими браузерами
- **Документування**: Вказувати який генератор використовується

### Статистичні тести
- **Модульність**: Кожен тест в окремій функції
- **Результати**: Структуровані об'єкти з результатами
- **Інтерпретація**: Автоматичне пояснення результатів
- **Прогрес**: Показ прогресу для довгих обчислень

---

### Версія інструкцій: 1.0
### Дата створення: Липень 2025
### Базується на проекті Prize Raffle v2.3-tests

**Автор проекту:** Розроблено за допомогою Claude AI
**Інструкції підготовлені:** Claude AI (Architect Mode)