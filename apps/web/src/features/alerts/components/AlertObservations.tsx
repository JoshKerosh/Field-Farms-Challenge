import { useField } from '../../../app/context/FieldContext';
import { getGeo } from '../../../data/engine/geo';
import { sameClimatePoint } from '../data/climate-history';
import { ClimateHistoryPanel } from './ClimateHistoryPanel';
import { HazardHistoryMap } from './HazardHistoryMap';
import { useEffect, useState } from 'react';
import { loadHazardMap, type HazardMapData } from '../data/hazard-map';
import { message, useMessageLanguage } from '../../../i18n/messages';
import { loadConditionMap, type ConditionZone } from '../data/condition-map';
import { ConditionRiskMap } from './ConditionRiskMap';
import { NasaRegionalRiskMap } from './NasaRegionalRiskMap';

export function AlertObservations() {
  useMessageLanguage();
  const { ds, ctx, alertSources } = useField();
  const [mapData, setMapData] = useState<HazardMapData | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [conditionZones, setConditionZones] = useState<ConditionZone[] | null>(null);
  const [conditionsLoading, setConditionsLoading] = useState(true);
  const [referenceView, setReferenceView] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void loadConditionMap(controller.signal).then((zones) => {
      if (!controller.signal.aborted) {
        setConditionZones(zones);
        setConditionsLoading(false);
      }
    });
    void loadHazardMap(fetch, controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        setMapData(data);
        setMapLoading(false);
      }
    });
    return () => controller.abort();
  }, []);
  if (!ds || !ctx) return null;
  const [lon, lat] = getGeo(ds).localToLngLat(ctx.loc);
  const reference = alertSources.power?.history ?? mapData?.location;
  const differentReference = reference && !sameClimatePoint(reference, lon, lat);
  const viewLon = referenceView && reference ? reference.longitude : lon;
  const viewLat = referenceView && reference ? reference.latitude : lat;
  const history =
    alertSources.power?.history && sameClimatePoint(alertSources.power, viewLon, viewLat)
      ? alertSources.power.history
      : null;
  const map = mapData && sameClimatePoint(mapData.location, viewLon, viewLat) ? mapData : null;
  return (
    <>
      <NasaRegionalRiskMap longitude={lon} latitude={lat} />
      {differentReference && (
        <section className="v10-card" aria-labelledby="alert-observation-location-title">
          <h2 id="alert-observation-location-title">{message('alerts.observationsLocation')}</h2>
          <p>
            {message(
              referenceView ? 'alerts.referenceSelected' : 'alerts.referenceAvailable',
              reference.latitude,
              reference.longitude,
            )}
          </p>
          <div className="v10-pill-row">
            <button
              type="button"
              className="v10-pill-btn"
              aria-pressed={referenceView}
              onClick={() => setReferenceView(true)}
            >
              {message('alerts.showReference')}
            </button>
            <button
              type="button"
              className="v10-pill-btn"
              aria-pressed={!referenceView}
              onClick={() => setReferenceView(false)}
            >
              {message('alerts.showSelectedLocation')}
            </button>
          </div>
        </section>
      )}
      <ClimateHistoryPanel key={`history-${viewLon}-${viewLat}`} history={history} />
      <ConditionRiskMap
        key={`conditions-${viewLon}-${viewLat}`}
        base={map}
        zones={conditionZones}
        loading={mapLoading || conditionsLoading}
      />
      <HazardHistoryMap key={`map-${viewLon}-${viewLat}`} data={map} loading={mapLoading} />
    </>
  );
}
