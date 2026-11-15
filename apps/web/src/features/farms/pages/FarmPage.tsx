import { lazy, Suspense, useState, type FormEvent } from 'react';
import { myFarmToForm, useField } from '../../../app/context/FieldContext';
import {
  EMPTY_FARM_FORM,
  FARM_ACTIVITIES,
  FARM_FLOODING,
  FARM_WATER,
  type FarmFormInput,
} from '../../../data/engine/farm';
import { copy } from '../../../i18n';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { PageHeader, PageLink } from '../../../shared/ui';
import type { BasinExplorerRepository } from '../../watersheds';
const FarmExplorer = lazy(() => import('../components/FarmExplorer'));
export function FarmPage({ explorer }: { explorer: BasinExplorerRepository }) {
  useMessageLanguage();
  const { myFarm, saveMyFarm, farmSite, setFarmSite } = useField();
  const [formInput, setFormInput] = useState<FarmFormInput>(() =>
    myFarm ? myFarmToForm(myFarm) : EMPTY_FARM_FORM,
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSaved, setFormSaved] = useState(false);
  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!farmSite) {
      setFormErrors({ location: message('m4c3cc084777f') });
      return;
    }
    const result = saveMyFarm(formInput);
    setFormSaved(result.ok);
    setFormErrors(result.ok ? {} : result.errors);
  };
  return (
    <div className="v10-stack">
      <PageHeader title={message('mba8875d8f580')} intro={message('introFarmPage')} />
      <section className="v10-card" aria-labelledby="farm-explorer-title">
        <h2 id="farm-explorer-title">{message('m4c8dd20e4c82')}</h2>
        <Suspense fallback={<p role="status">{copy.watershed.mapLoading}</p>}>
          <FarmExplorer
            repository={explorer}
            site={farmSite}
            onSite={(site) => {
              setFarmSite(site);
              setFormSaved(false);
            }}
          />
        </Suspense>
      </section>
      <section className="v10-card" aria-label={message('m34483368c677')}>
        {formErrors.location && <p role="alert">{formErrors.location}</p>}
        <form onSubmit={handleFormSubmit} className="v10-stack" noValidate>
          <h3>{myFarm ? message('m43d92b9ea607') : message('m0c9fe23d8960')}</h3>
          <div className="v10-form-grid">
            <div className="v10-field">
              <label htmlFor="fm-name">{message('m8337edc97d64')}</label>
              <input
                id="fm-name"
                type="text"
                maxLength={40}
                value={formInput.name}
                onChange={(e) => setFormInput((f) => ({ ...f, name: e.target.value }))}
                placeholder={message('mc392e0806375')}
              />
            </div>

            <div className="v10-field">
              <label htmlFor="fm-act">{message('mf940f5c2f396')}</label>
              <select
                id="fm-act"
                value={formInput.act}
                onChange={(e) => setFormInput((f) => ({ ...f, act: e.target.value }))}
              >
                <option value="">{message('mf35de2fa6995')}</option>
                {FARM_ACTIVITIES.map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
              {formErrors.act && (
                <span className="v10-field-error" role="alert">
                  {formErrors.act}
                </span>
              )}
            </div>

            <div className="v10-field">
              <label htmlFor="fm-ha">{message('m83d0c27e39ad')}</label>
              <input
                id="fm-ha"
                type="number"
                step="0.5"
                min="0.1"
                value={formInput.ha}
                onChange={(e) => setFormInput((f) => ({ ...f, ha: e.target.value }))}
                placeholder={message('m6748b1ba9ea8')}
              />
              {formErrors.ha && (
                <span className="v10-field-error" role="alert">
                  {formErrors.ha}
                </span>
              )}
            </div>

            <div className="v10-field">
              <label htmlFor="fm-cult">{message('m87d12d5af9ff')}</label>
              <input
                id="fm-cult"
                type="number"
                step="0.5"
                min="0.1"
                value={formInput.cult}
                onChange={(e) => setFormInput((f) => ({ ...f, cult: e.target.value }))}
                placeholder={message('m8b8138d47965')}
              />
              {formErrors.cult && (
                <span className="v10-field-error" role="alert">
                  {formErrors.cult}
                </span>
              )}
            </div>

            <div className="v10-field">
              <label htmlFor="fm-animals">{message('me63f904995bb')}</label>
              <input
                id="fm-animals"
                type="number"
                min="0"
                value={formInput.animals}
                onChange={(e) => setFormInput((f) => ({ ...f, animals: e.target.value }))}
                placeholder={message('m7ccbaed57dde')}
              />
              {formErrors.animals && (
                <span className="v10-field-error" role="alert">
                  {formErrors.animals}
                </span>
              )}
            </div>

            <div className="v10-field">
              <label htmlFor="fm-agua">{message('mbe7457f209d3')}</label>
              <select
                id="fm-agua"
                value={formInput.agua}
                onChange={(e) => setFormInput((f) => ({ ...f, agua: e.target.value }))}
              >
                <option value="">{message('m6a65d2daa6b0')}</option>
                {FARM_WATER.map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            <div className="v10-field">
              <label htmlFor="fm-ench">{message('m368fcc1454d6')}</label>
              <select
                id="fm-ench"
                value={formInput.ench}
                onChange={(e) => setFormInput((f) => ({ ...f, ench: e.target.value }))}
              >
                <option value="no">No</option>
                {FARM_FLOODING.filter((o) => o[0] !== 'no').map(([val, lbl]) => (
                  <option key={val} value={val}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="v10-pill-row">
            <button type="submit" className="v10-pill-btn v10-pill-btn--primary">
              {message('maea6bdcb6a90')}
            </button>
            {formSaved && (
              <span
                className="v10-tag"
                style={{ background: '#E2F1E5', color: '#1F5A32' }}
                role="status"
              >
                {message('md8308af84ffe')}
              </span>
            )}
          </div>
        </form>

        {formSaved && (
          <PageLink to="/watershed" primary>
            {message('m4f205595bcad')}
          </PageLink>
        )}
      </section>
    </div>
  );
}
