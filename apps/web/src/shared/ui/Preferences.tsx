import { Menu } from 'lucide-react';
import { useRef } from 'react';
import { message, useMessageLanguage } from '../../i18n/messages';
import { usePreferences } from '../../i18n/preferences';
import { useI18n } from '../../i18n/use-i18n';
import './preferences.css';
export function Preferences() {
  useMessageLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { language, theme, setLanguage, setTheme } = usePreferences();
  const { copy: c } = useI18n();
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="settings-trigger"
        aria-label={c.preferences}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <Menu size={24} aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        className="preferences-dialog"
        aria-labelledby="preferences-title"
        onClose={() => trigger.current?.focus()}
      >
        <h2 id="preferences-title">{c.preferences}</h2>
        <fieldset>
          <legend>{c.language}</legend>
          <label>
            <input
              type="radio"
              name="language"
              checked={language === 'es'}
              onChange={() => setLanguage('es')}
            />
            <span lang="es">{message('m94b382b61b9d')}</span>
          </label>
          <label>
            <input
              type="radio"
              name="language"
              checked={language === 'en'}
              onChange={() => setLanguage('en')}
            />
            <span lang="en">{message('mba118bf7fc9c')}</span>
          </label>
        </fieldset>
        <fieldset>
          <legend>{c.theme}</legend>
          <label>
            <input
              type="radio"
              name="theme"
              checked={theme === 'light'}
              onChange={() => setTheme('light')}
            />
            {c.light}
          </label>
          <label>
            <input
              type="radio"
              name="theme"
              checked={theme === 'dark'}
              onChange={() => setTheme('dark')}
            />
            {c.dark}
          </label>
        </fieldset>
        <form method="dialog">
          <button className="button button-primary">{c.close}</button>
        </form>
      </dialog>
    </>
  );
}
