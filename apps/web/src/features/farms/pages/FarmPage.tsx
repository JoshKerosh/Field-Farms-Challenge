import { lazy, Suspense, useState, useRef, type FormEvent } from 'react';
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
import { useFarmFlowCopy } from '../flow-copy';
import { recoveryFarmId } from '@field-farms/domain';
import { deleteRecoveryPlans } from '../../restoration';
import './farm.css';
const FarmExplorer = lazy(() => import('../components/FarmExplorer'));
export function FarmPage({ explorer }: { explorer: BasinExplorerRepository }) {
  useMessageLanguage();
  const { myFarm, saveMyFarm, farmSite, setFarmSite, resetMyFarm } = useField();
  const flow = useFarmFlowCopy();
  const [mapEpoch, setMapEpoch] = useState(0);
  const mapEpochRef = useRef(0);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleteTrigger = useRef<HTMLButtonElement>(null);
  const editTrigger = useRef<HTMLButtonElement>(null);
  const clearForm = () => {
    mapEpochRef.current += 1;
    setMapEpoch(mapEpochRef.current);
    setFormInput({ ...EMPTY_FARM_FORM });
    setFormErrors({});
    setFormSaved(false);
    setEditing(false);
  };
  async function deleteRecord() {
    setDeleting(true);
    setDeleteError(false);
    try {
      // Check browser storage access before removing the associated recovery history.
      window.localStorage.getItem('ffc.v10.farm');
      const restore = farmSite
        ? await deleteRecoveryPlans([
            recoveryFarmId(farmSite),
            recoveryFarmId({ ...farmSite, parcel: null }),
          ])
        : undefined;
      try {
        resetMyFarm();
      } catch (error) {
        await restore?.();
        throw error;
      }
      clearForm();
      setDeleted(true);
      deleteDialog.current?.close();
      requestAnimationFrame(() => document.getElementById('page-title')?.focus());
    } catch {
      setDeleteError(true);
    } finally {
      setDeleting(false);
    }
  }
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
    if (result.ok) {
      setEditing(false);
      setDeleted(false);
      requestAnimationFrame(() => document.getElementById('farm-record-title')?.focus());
    }
  };
  return (
    <div className="v10-stack farm-page">
      <PageHeader title={message('mba8875d8f580')} intro={message('introFarmPage')} />
      {deleted && <p role="status">{flow.deleted}</p>}
      {myFarm && (
        <section className="v10-card" aria-labelledby="farm-record-title">
          <div className="farm-record-header">
            <div>
              <span className="farm-record-kicker">{flow.savedFarm}</span>
              <h2 id="farm-record-title" tabIndex={-1}>
                {myFarm.name || flow.savedFarm}
              </h2>
            </div>
          </div>
          <dl className="farm-facts">
            <div>
              <dt>{flow.activity}</dt>
              <dd>{FARM_ACTIVITIES.find(([key]) => key === myFarm.act)?.[1] ?? flow.optional}</dd>
            </div>
            <div>
              <dt>{flow.area}</dt>
              <dd>{new Intl.NumberFormat(document.documentElement.lang).format(myFarm.ha)} ha</dd>
            </div>
            <div>
              <dt>{flow.crops}</dt>
              <dd>{new Intl.NumberFormat(document.documentElement.lang).format(myFarm.cult)} ha</dd>
            </div>
            <div>
              <dt>{flow.animals}</dt>
              <dd>{myFarm.animals}</dd>
            </div>
            <div>
              <dt>{flow.water}</dt>
              <dd>{FARM_WATER.find(([key]) => key === myFarm.agua)?.[1] ?? flow.optional}</dd>
            </div>
          </dl>
          {farmSite && (
            <div className="farm-record-location">
              <strong>{flow.location}</strong>
              <p>
                {flow.coordinates}: {farmSite.lat.toFixed(5)}, {farmSite.lng.toFixed(5)}
              </p>
              <p>
                {farmSite.parcel
                  ? `${flow.parcel}: ${farmSite.parcel.properties.identifica}`
                  : flow.pointOnly}
              </p>
            </div>
          )}
          <div className="farm-next-actions">
            <PageLink to="/care" primary>
              {flow.recovery}
            </PageLink>
            <PageLink to="/watershed">{flow.watershed}</PageLink>
          </div>
          <div className="farm-record-actions">
            <button
              ref={editTrigger}
              type="button"
              className="v10-pill-btn"
              onClick={() => {
                setFormInput(myFarmToForm(myFarm));
                setEditing(true);
                requestAnimationFrame(() => document.getElementById('fm-name')?.focus());
              }}
            >
              {flow.edit}
            </button>
            <button
              type="button"
              className="v10-pill-btn"
              onClick={() => {
                try {
                  resetMyFarm();
                  clearForm();
                  setDeleted(false);
                } catch {
                  setFormErrors({ storage: flow.deleteError });
                }
              }}
            >
              {flow.newFarm}
            </button>
            <button
              ref={deleteTrigger}
              type="button"
              className="v10-pill-btn farm-delete"
              aria-haspopup="dialog"
              onClick={() => {
                setDeleteError(false);
                deleteDialog.current?.showModal();
              }}
            >
              {flow.remove}
            </button>
          </div>
        </section>
      )}
      {formErrors.storage && <p role="alert">{formErrors.storage}</p>}
      <section className="v10-card" aria-labelledby="farm-explorer-title">
        <h2 id="farm-explorer-title">{message('m4c8dd20e4c82')}</h2>
        <Suspense fallback={<p role="status">{copy.watershed.mapLoading}</p>}>
          <FarmExplorer
            key={mapEpoch}
            autoLocate={mapEpoch === 0}
            repository={explorer}
            site={farmSite}
            onSite={(site) => {
              if (mapEpoch !== mapEpochRef.current) return;
              setFarmSite(site);
              setFormSaved(false);
            }}
          />
        </Suspense>
      </section>
      {(!myFarm || editing) && (
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
              {myFarm && (
                <button
                  type="button"
                  className="v10-pill-btn"
                  onClick={() => {
                    setEditing(false);
                    editTrigger.current?.focus();
                  }}
                >
                  {flow.cancel}
                </button>
              )}
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
      )}
      <dialog
        ref={deleteDialog}
        className="farm-delete-dialog"
        aria-labelledby="farm-delete-title"
        aria-describedby="farm-delete-help"
        onCancel={(e) => {
          if (deleting) e.preventDefault();
        }}
        onClose={() => {
          if (!deleted) deleteTrigger.current?.focus();
        }}
      >
        <h2 id="farm-delete-title">{flow.deleteTitle}</h2>
        <strong>{myFarm?.name || flow.savedFarm}</strong>
        <p id="farm-delete-help">{flow.deleteHelp}</p>
        {deleteError && <p role="alert">{flow.deleteError}</p>}
        <div className="farm-record-actions">
          <button
            type="button"
            className="v10-pill-btn"
            disabled={deleting}
            autoFocus
            onClick={() => deleteDialog.current?.close()}
          >
            {flow.cancel}
          </button>
          <button
            type="button"
            className="v10-pill-btn farm-delete"
            disabled={deleting}
            onClick={() => void deleteRecord()}
          >
            {deleting ? flow.deleting : flow.deleteConfirm}
          </button>
        </div>
      </dialog>
    </div>
  );
}
