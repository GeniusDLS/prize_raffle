# GitHub Copilot Instructions for Prize Raffle Application

## 🎯 Project Overview

This is a **Prize Raffle Web Application** (Додаток розіграшу призів) written in vanilla JavaScript with modular architecture. The application allows conducting fair prize drawings with animated drums and automatic state persistence.

## 🏗️ Architecture & Code Organization

### Modular Structure
The application follows a **modular architecture** with separation of concerns:

```
js/
├── main.js           # Main coordinator and initialization
├── data-manager.js   # Data management and persistence (localStorage)
├── raffle-engine.js  # Core raffle logic and animations
└── ui-controller.js  # UI management and DOM interactions
```

### Key Principles
- **Vanilla JavaScript** - No external frameworks
- **Modular design** - Each module has specific responsibilities
- **Global namespace** - Modules exposed via `window` object
- **localStorage persistence** - Automatic data saving
- **Event-driven architecture** - DOM events and custom events

## 🎨 UI/UX Guidelines

### Design Language
- **Clean and modern** interface
- **Ukrainian language** - All text in Ukrainian
- **Emoji icons** - Consistent use throughout UI (🎉, 📝, 🎲, 🏆, etc.)
- **Responsive design** - CSS Grid/Flexbox based
- **Dark color scheme** with purple accents
- **Minimal UI** - Essential information only, winner details shown in popup and results page

### Animation Standards
- **Configurable animations** - User can adjust timing, speed, popup delays
- **Smooth transitions** - CSS-based transitions for better performance
- **Visual feedback** - Loading states, success indicators, error messages

## 📝 Coding Standards

### JavaScript Style
```javascript
// Use descriptive function names in Ukrainian when appropriate
function додатиУчасника(name, department, weight) { }

// Use camelCase for variables and functions
const participantList = [];
function updateParticipantDisplay() { }

// Use UPPER_CASE for constants
const STORAGE_KEYS = {
    PARTICIPANTS: 'raffle_participants',
    PRIZES: 'raffle_prizes'
};

// Always use try-catch for potentially failing operations
try {
    const data = JSON.parse(localStorage.getItem(key));
} catch (error) {
    console.error('Помилка парсингу JSON:', error);
}
```

### Module Pattern
```javascript
// Module structure template
(function() {
    'use strict';
    
    // Private variables and functions
    let privateVariable = null;
    
    function privateFunction() {
        // Implementation
    }
    
    // Public API
    const PublicModule = {
        publicMethod: function() {
            // Implementation
        }
    };
    
    // Expose to global namespace
    window.PublicModule = PublicModule;
})();
```

## 💾 Data Management

### Storage Keys
```javascript
const STORAGE_KEYS = {
    PARTICIPANTS: 'raffle_participants',      // Participants list
    PRIZES: 'raffle_prizes',                  // Prizes list
    RESULTS: 'raffle_results',                // Drawing results
    ANIMATION_SETTINGS: 'raffle_animation_settings', // Never cleared
    BACKUP: 'raffle_backup',                  // Backup data
    CURRENT_STATE: 'raffle_current_state'     // Current drawing state
};
```

### Data Structures
```javascript
// Participant object
const participant = {
    name: "Іван",
    department: "ІТ відділ", 
    weight: 2
};

// Prize object
const prize = {
    name: "iPhone 15",
    quantity: 1
};

// Result object
const result = {
    round: 1,
    winner: "Іван",
    department: "ІТ відділ",
    prize: "iPhone 15",
    timestamp: "2025-07-03T10:30:00Z"
};
```

## 🎲 Raffle Logic

### Weighted Random Selection
- **Algorithm**: Use cumulative weights for fair distribution
- **Implementation**: Create weight ranges and select random point
- **Edge cases**: Handle zero weights, empty lists, single participant

### Animation System
- **Configurable timing**: User-defined durations for different phases
- **Smooth transitions**: CSS-based animations with JavaScript coordination
- **Slowing-down effect**: Configurable gradual drum stopping animation
- **Drum highlighting**: Both drum content and drum container get highlighted after result
- **Popup timing**: Winner popup appears only after all drum animations complete
- **State management**: Track animation state to prevent conflicts
- **Dynamic CSS**: Animation durations can be set via JavaScript

#### Animation Settings
```javascript
const DEFAULT_ANIMATION_SETTINGS = {
    spinDuration: 3,           // Main spinning duration (3 seconds)
    spinSpeed: 100,            // Element change speed in drums
    slowDownDuration: 2,       // Gradual stopping effect duration (2 seconds)
    slowDownEffect: true,      // Enable/disable slowing-down effect
    popupRotations: 1,         // Popup rotation count
    popupAnimationSpeed: 0.8,  // Popup appearance speed
    resultHighlightDuration: 1, // Result highlight duration (1 second)
    popupCountdownTime: 10,    // Popup auto-close time
    enableSound: false         // Sound effects toggle
};
```

## 📊 Excel Integration

### Import Formats Supported
1. **Separate sheets** - "Учасники" and "Призи" sheets
2. **Single sheet** - Combined data with headers or without
3. **Auto-detection** - Smart parsing of Excel structure

### Export Features
- **Results export** - Complete drawing history
- **Statistics export** - Summary and analytics
- **Backup export** - Full data backup

## 🔧 Development Guidelines

### When Adding New Features
1. **Follow modular pattern** - Add to appropriate module or create new one
2. **Update localStorage** - Add new storage keys if needed
3. **Maintain backward compatibility** - Handle missing data gracefully
4. **Add error handling** - Use try-catch and user-friendly error messages
5. **Update UI consistently** - Follow existing design patterns

### Testing Approach
- **Manual testing** - Test all user workflows
- **Edge cases** - Empty data, large datasets, browser limitations
- **Cross-browser** - Chrome, Firefox, Safari, Edge
- **Local storage** - Test with disabled localStorage

### Performance Considerations
- **Large datasets** - Optimize for 1000+ participants/prizes
- **Animation performance** - Use CSS transforms over JavaScript animations
- **Memory management** - Clean up event listeners and references

## 🐛 Common Issues & Solutions

### Data Loss Prevention
```javascript
// Always backup before major operations
function performMajorOperation() {
    try {
        DataManager.createBackup();
        // ... operation
    } catch (error) {
        DataManager.restoreBackup();
        throw error;
    }
}
```

### Animation Conflicts
```javascript
// Check animation state before starting new animation
if (!RaffleEngine.isAnimating()) {
    RaffleEngine.startDrawing();
}
```

### Browser Compatibility
```javascript
// Check for localStorage support
if (typeof(Storage) !== "undefined") {
    // localStorage supported
} else {
    // Fallback to cookies or warning
}
```

## 🌟 Feature Enhancement Ideas

### Ready for Implementation
- **Sound effects** - Add optional audio during drawing
- **Dark/Light theme** - User preference system
- **PDF export** - Results in PDF format
- **Multi-language** - I18n system for other languages

### Advanced Features
- **API integration** - Connect with external systems
- **Database backend** - Replace localStorage for large scale
- **Real-time sharing** - Multiple users viewing same drawing
- **Advanced statistics** - Charts and analytics

## 🚀 Deployment Notes

### GitHub Pages Ready
- **Static files only** - No server-side requirements
- **Relative paths** - All assets use relative URLs
- **Cross-origin** - No external API dependencies
- **Mobile friendly** - Responsive design works on all devices

### Performance Optimization
- **Minification** - Ready for JS/CSS minification
- **Image optimization** - Compress logo.png if needed
- **Caching** - Leverage browser caching for static assets

---

## 💡 Quick Reference for Copilot

When working on this project:
- Use **Ukrainian** for user-facing text
- Follow **modular architecture** patterns
- Always handle **errors gracefully**
- Maintain **localStorage** consistency
- Test with **various data sizes**
- Keep **UI responsive** and **accessible**
- Use **descriptive variable names**
- Add **console logging** for debugging
- Follow **existing code style**
- Update **README.md** for new features
