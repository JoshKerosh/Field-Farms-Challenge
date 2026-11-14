import { Link } from 'react-router-dom';
import { copy } from '../../i18n';

export function ErrorPage() {
  return (
    <main className="error-page">
      <h1>{copy.common.errorTitle}</h1>
      <p>{copy.common.errorBody}</p>
      <div className="action-row">
        <Link className="button button-primary" to="/guide">
          {copy.common.back}
        </Link>
        <button className="button button-secondary" onClick={() => window.location.reload()}>
          {copy.common.reload}
        </button>
      </div>
    </main>
  );
}
