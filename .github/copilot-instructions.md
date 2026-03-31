# Prize Raffle — Project Guidelines

## Architecture

Vanilla HTML/CSS/JS — no build system, no package manager. Open `index.html` directly in a browser. CDN only for SheetJS (XLSX).

**Module load order in `index.html` is critical** — each module exports via `window.ModuleName`:

```
data-manager.js → audio-data.js → sound-manager.js → raffle-engine.js → ui-controller.js → fairness-tests.js → main.js
```

Module export pattern:
```js
window.ModuleName = {
    publicFn,
    get prop() { return _private; },
    set prop(v) { _private = v; }
};
```

## Module Responsibilities

| Module | Role |
|--------|------|
| `data-manager.js` | State (participants/prizes/results), localStorage CRUD, Excel import/export, sorting, presets. Also defines `window.Logger` |
| `audio-data.js` | Container for Base64 audio data (`AUDIO_BASE64_DATA`) |
| `sound-manager.js` | Sound playback: Base64 files → Web Audio API synthesis as fallback |
| `raffle-engine.js` | Raffle logic, weighted selection, drum animation, winner popup, `secureRandom()` |
| `ui-controller.js` | DOM rendering of lists/pages, inline editing, theme switching, `escapeHtml()` |
| `fairness-tests.js` | Shared utilities + orchestrates lazy-loading of 4 submodules |
| `fairness-sequence-test.js` | Runs Test — detects patterns in the RNG output |
| `fairness-distribution-test.js` | Chi-square Test — checks weighted-fair prize distribution |
| `fairness-fairness-test.js` | Fairness score — confidence intervals, Gini index |
| `fairness-simulation-test.js` | Simulation test — runs N virtual raffles, shows stats |
| `main.js` | Init queue + `window.fn` wrappers for `onclick` compatibility |

## Non-obvious Conventions

| Rule | Where enforced |
|------|---------------|
| **Random numbers** — use only `window.RaffleEngine.secureRandom()` | `raffle-engine.js` — do NOT add another source anywhere |
| **XSS** — all user data inserted into `innerHTML` goes through `escapeHtml()` | `ui-controller.js` |
| **localStorage** — always wrap in try-catch, use `STORAGE_KEYS` constants | `data-manager.js` |
| **Code comments** — Ukrainian language only | all JS files |
| **Logging** — use `window.Logger` instead of `console.*` | all JS files — `Logger.log/warn` respect `enabled` flag; `Logger.error` always outputs; prefix each call with `'[ModuleName]'` |
| **New public functions** — register in `main.js` as `window.fn` wrappers | `main.js` — HTML `onclick` calls go through `window.fn`, not modules directly |

## Code Style

- 4-space indent, max 120 chars per line, ES6+ (const/let, arrow functions, template literals)
- Naming: `camelCase` functions/vars, `UPPER_CASE` constants, `PascalCase` modules, `kebab-case` files

## Versioning

Version lives in `.app-version` element in `index.html` (`vMAJOR.MINOR.PATCH`). Current: **v3.2.3**.
Update version in the same commit as code changes. Commit prefix: `feat:`, `fix:`, or `refactor:`.

## Communication

Always respond in **Ukrainian**. The user understands English but prefers Ukrainian.

## Workflow

**Always propose changes before touching files.**
For each change: (1) describe what, (2) why, (3) which files → wait for approval.
No tests, commands, or scripts without an explicit request.