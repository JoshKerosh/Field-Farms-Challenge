# Language and theme

Preferences are stored in `ffc.preferences.v1`. The interface uses `useI18n()` and
`usePreferences()`. No account or connection is needed to change them.

## New interfaces

- Add every text to `interface-copy.ts` in Spanish and English. `checkedCopy` and
  the parity test catch missing keys. Don't concatenate fragments to build
  sentences; add typed functions when parameters are needed.
- Get text inside the component through `useI18n()`; never store a translation
  in a module constant. Use its `number` and `date` functions.
- Use the tokens in `tokens.css`. Check contrast in both themes. Don't invert
  satellite imagery or scientific palettes.
- Keep geographic names, institutions and the user's original notes.
- Keep instructions and data limits; remove repetition and promises that aren't
  backed up. Every error must state a recovery action.

## Screen and engine messages

`messages-es.json` and `messages-en.json` hold the text of the ten sections,
maps, validations and computed messages. `message(key, ...values)` inserts
values without translating user data, geographic names or identifiers.
The `ZXQ0QXZ`, `ZXQ1QXZ`, etc. placeholders must be kept exactly: the catalog
test checks the keys and the number of arguments in both languages.
New keys can have descriptive names; there is no need to generate a hash.

Components that use `message()` or the compatible `copy` catalog must call
`useMessageLanguage()` to react to the change. Memoized calculations that
produce text must also depend on the language. Module-level presentation
tables use `localizedResource(() => ...)`, which keeps references stable
within a language. They are read-only resources; don't mutate them or pass
them directly to `structuredClone`. Persisted data is kept separate.

`npm run lint` rejects new visible text written directly in JSX, except
units, symbols and names shared by both languages. The catalog tests reject
missing translations or arguments.

My farm uses the real map and a single form. It does not offer fictional
profiles or the old step-by-step selection. Confirming requires the farm to be
located; entered data is kept when the language changes.

The fixed colors inherited by some charts still need review for a full dark
mode adaptation. No overall WCAG conformance is claimed.
