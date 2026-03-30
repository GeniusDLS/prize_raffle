# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build system — serve static files directly:

```bash
python -m http.server 8000
# or
npx http-server
```

Visit `http://localhost:8000`. You can also open `index.html` directly in a browser (Base64 audio handles `file://` protocol).

No linter or test runner is configured. Fairness tests are run through the app UI under Settings → "Тести чесності".

## Architecture

Vanilla HTML/CSS/JS — no framework, no bundler, no `package.json`. CDN dependencies: Tailwind CSS, DaisyUI 5, SheetJS (XLSX) v0.18.5. Cache-busted via query params on `<script>` tags.

**Module load order in `index.html` is strict** — each module attaches itself to `window`:

```
data-manager.js → audio-data.js → sound-manager.js → raffle-engine.js → ui-controller.js → fairness-tests.js → main.js
```

Fairness sub-modules (`fairness-sequence-test.js`, `fairness-distribution-test.js`, `fairness-fairness-test.js`, `fairness-simulation-test.js`) are lazy-loaded by `main.js` only when the user opens the fairness tests panel.

### Module responsibilities

| Module | Role |
|--------|------|
| `data-manager.js` | State (participants/prizes/results), localStorage CRUD, Excel import/export, sorting. Also defines `window.Logger` |
| `audio-data.js` | Base64 audio data container (`AUDIO_BASE64_DATA`) |
| `sound-manager.js` | Sound playback with Web Audio API synthesis as fallback |
| `raffle-engine.js` | Raffle logic, weighted selection, drum animation, winner popup, `secureRandom()` |
| `ui-controller.js` | DOM rendering of all lists/pages, inline editing, theme switching, `escapeHtml()` |
| `fairness-tests.js` | Orchestrates lazy-loading and running of the four statistical tests |
| `main.js` | Init queue + `window.fn` wrappers that HTML `onclick` attributes call |

### Module export pattern (required for all modules)

```js
window.ModuleName = {
    publicFn,
    get prop() { return _private; },
    set prop(v) { _private = v; }
};
```

`ModuleName` is PascalCase and matches the filename (`data-manager.js` → `DataManager`). No ES module `export` keyword.

### HTML onclick wiring

HTML `onclick` attributes call global functions (e.g., `startRaffle()`). These are registered in `main.js` as `window.fn` wrappers that delegate to the appropriate module. **New public functions must be registered there** — do not call module methods directly from HTML.

## Non-obvious Conventions

| Rule | Details |
|------|---------|
| **Random numbers** | Use only `window.RaffleEngine.secureRandom()` — never `Math.random()` or direct `crypto.getRandomValues()` |
| **XSS** | All user data inserted via `innerHTML` must go through `escapeHtml()` from `ui-controller.js` |
| **localStorage** | Always wrap in `try-catch`; always use `STORAGE_KEYS` constants (defined in `data-manager.js`), never raw string keys |
| **Logging** | Use `window.Logger.log/warn/error()` instead of `console.*`. Prefix calls with `'[ModuleName]'`. `Logger.log/warn` respect the `enabled` flag; `Logger.error` always outputs |
| **Comments** | All code comments must be in **Ukrainian** |

## Code Style

- 4-space indent, max 120 chars per line, ES6+ (`const`/`let`, arrow functions, template literals)
- `const` by default; `let` only when reassignment is needed; no `var`
- Naming: `camelCase` functions/variables, `UPPER_CASE` constants, `PascalCase` module exports, `kebab-case` filenames

## Versioning

Version string lives in the `.app-version` element in `index.html` (format: `vMAJOR.MINOR.PATCH`). Update it in the same commit as the code change. Commit prefixes: `feat:`, `fix:`, `refactor:`.

## Communication

Always respond in **Ukrainian**. The user understands English but prefers Ukrainian.

## Workflow

Always propose changes before touching files: describe (1) what, (2) why, (3) which files — then wait for approval. No scripts or commands without an explicit request.
