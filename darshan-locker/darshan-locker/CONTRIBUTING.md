# Contributing

Thanks for helping. This project has no build step and no dependencies.

1. Fork the repo and create a branch: `git checkout -b feature/short-name`
2. Run it locally with `npm start` and make your change.
3. Add or update tests in `tests/` for anything that changes the forecast. Run `npm test`.
4. Keep the UI usable at 390 px wide and in both light and dark themes. Every form control needs a visible label.
5. Open a pull request that says what changed and why. Include a screenshot for visual changes.

## Adding a temple

Add one line to `TEMPLES` in `js/data.js`: id, name, city, state, deity, popularity (1 to 10), boosted weekdays (0 is Sunday), and lockers per slot. Use real locker counts from the temple if you have them.

## Code style

Plain ES modules, two-space indent, no framework. See `.editorconfig`.
