import { useMemo, type ReactNode } from 'react';
import type { ArchivoIndicadores, Indicador, UnidadIndicadores } from '@field-farms/domain';
import { useField, type FarmSite } from '../../../app/context/FieldContext';
import { getGeo, placeAt } from '../../../data/engine/geo';
import type { RegionCode } from '../../../data/real/types';
import { date, number } from '../../../i18n';
import { environmentCopy } from '../../../i18n/environment-copy';
import { useMessageLanguage } from '../../../i18n/messages';
import { ExternalSource, PageHeader, PageLink } from '../../../shared/ui';
import { ObservationHistory } from '../components/ObservationHistory';
import { SatelliteExplorer } from '../components/SatelliteExplorer';
import { satelliteCopy } from '../../../i18n/satellite-copy';
import {
  ENVIRONMENT_SOURCES,
  observation,
  observationAge,
  referenceDistance,
  referenceUnit,
  type EnvironmentSource,
  type SourceResult,
} from '../data/environment-data';
import { useEnvironmentData } from '../data/use-environment-data';
import '../environment.css';

export function EnvironmentPage() {
  const language = useMessageLanguage();
  const text = environmentCopy[language];
  const satelliteText = satelliteCopy[language];
  const { ds, farmSite, myFarm, demo } = useField();
  const region = useMemo(() => {
    if (!ds || !farmSite) return null;
    return placeAt(ds, getGeo(ds).llToLocal(farmSite.lat, farmSite.lng), null)?.reg ?? null;
  }, [ds, farmSite]);
  const { sources, catalog, retry } = useEnvironmentData(Boolean(farmSite && region));
  const panel = (
    source: EnvironmentSource,
    title: string,
    content: (file: ArchivoIndicadores, item: UnidadIndicadores) => ReactNode,
  ) => (
    <SourcePanel
      key={source}
      source={source}
      title={title}
      result={sources[source]}
      region={region}
      failedUpdate={catalog.some(
        (entry) => entry?.id === ENVIRONMENT_SOURCES[source].id && entry.estado === 'falla',
      )}
    >
      {content}
    </SourcePanel>
  );
  return (
    <div className="v10-stack environment-page">
      <PageHeader title={text.title} intro={satelliteText.intro} />
      <SatelliteExplorer
        site={farmSite}
        weather={
          sources.power.status === 'ready' ? referenceUnit(sources.power.file, region) : undefined
        }
      />
      {!farmSite ? (
        <section className="v10-card">
          <h2>{text.locateTitle}</h2>
          <p>{text.locateHelp}</p>
          <PageLink to="/farm" primary>
            {text.locate}
          </PageLink>
        </section>
      ) : !region ? (
        <section className="v10-card">
          <p>{text.unknownRegion}</p>
          <PageLink to="/farm">{text.locate}</PageLink>
        </section>
      ) : (
        <>
          <details className="environment-observations">
            <summary>
              <strong>{satelliteText.observations}</strong>
              <span>{satelliteText.observationsHelp}</span>
            </summary>
            <section className="v10-card environment-coverage" aria-label={text.regional}>
              <h2>{myFarm?.name || text.farm}</h2>
              <p>
                {number(farmSite.lat, 5)}, {number(farmSite.lng, 5)} · {text.zones[region]}
              </p>
              <p>{text.coverage}</p>
              <PageLink to="/farm">{text.locate}</PageLink>
            </section>
            {demo && <p className="environment-notice">{text.realDespiteDemo}</p>}
            <button type="button" className="button button-secondary" onClick={retry}>
              {text.retry}
            </button>
            {panel('power', ENVIRONMENT_SOURCES.power.name, (_file, item) => (
              <>
                <Reference site={farmSite} item={item} region={region} />
                <section className="environment-explanation" aria-label={text.meaning}>
                  <h3>{text.meaning}</h3>
                  <p>{rainExplanation(observation(item, 'lluvia_30d_anomalia')?.valor, text)}</p>
                </section>
                <div className="environment-metrics">
                  <Metric label={text.rain30} indicator={observation(item, 'lluvia_30d')} />
                  <Metric label={text.rain7} indicator={observation(item, 'lluvia_7d')} />
                  <Metric
                    label={text.temperature}
                    indicator={observation(item, 'tmax_30d')}
                    help={text.temperatureHelp}
                  />
                  <Metric
                    label={text.soil}
                    indicator={observation(item, 'humedad_raiz_30d')}
                    help={text.soilHelp}
                  />
                  <Metric
                    label={text.rainAnomaly}
                    indicator={observation(item, 'lluvia_30d_anomalia')}
                    signed
                  />
                  <Metric
                    label={text.normalRain}
                    indicator={observation(item, 'lluvia_30d_normal')}
                  />
                  <Metric
                    label={text.soilAnomaly}
                    indicator={observation(item, 'humedad_raiz_30d_anomalia')}
                    signed
                  />
                </div>
                <ObservationHistory
                  series={item.serie ?? []}
                  parameter="lluvia"
                  title={text.rainHistory}
                  unit="mm"
                />
              </>
            ))}
            {sources.modis.status === 'ready' &&
              panel('modis', text.satellite, (_file, item) => (
                <>
                  <Reference site={farmSite} item={item} region={region} />
                  <p>{text.satelliteHelp}</p>
                  <section className="environment-explanation" aria-label={text.meaning}>
                    <h3>{text.meaning}</h3>
                    <p>{greenExplanation(observation(item, 'verdor_anomalia')?.valor, text)}</p>
                  </section>
                  <div className="environment-metrics">
                    <Metric label={text.ndvi} indicator={observation(item, 'verdor')} />
                    <Metric
                      label={text.ndviNormal}
                      indicator={observation(item, 'verdor_normal')}
                    />
                    <Metric
                      label={text.ndviDifference}
                      indicator={observation(item, 'verdor_anomalia')}
                      signed
                    />
                  </div>
                  <ObservationHistory
                    series={item.serie ?? []}
                    parameter="verdor"
                    title={text.ndvi}
                    unit="NDVI"
                  />
                </>
              ))}
            {panel('roni', text.enso, (_file, item) => {
              const phase = observation(item, 'roni_fase')?.valor;
              return (
                <>
                  <p>{text.ensoCoverage}</p>
                  <Metric
                    label={ENVIRONMENT_SOURCES.roni.name}
                    indicator={observation(item, 'roni')}
                    signed
                  />
                  <p>
                    {phase === 1
                      ? text.nino
                      : phase === -1
                        ? text.nina
                        : phase === 0
                          ? text.neutral
                          : text.unavailable}
                  </p>
                  <p>{text.ensoHelp}</p>
                </>
              );
            })}
            <p className="source-note">{text.simulatedPending}</p>
            <p className="source-note">{satelliteText.archiveSourceNote}</p>
          </details>
        </>
      )}
    </div>
  );
}

function rainExplanation(value: number | null | undefined, text: typeof environmentCopy.es) {
  return value == null
    ? text.noComparison
    : value > 0
      ? text.wetter
      : value < 0
        ? text.drier
        : text.usualRain;
}

function greenExplanation(value: number | null | undefined, text: typeof environmentCopy.es) {
  return value == null
    ? text.noGreenComparison
    : value < 0
      ? text.lessGreen
      : value > 0
        ? text.moreGreen
        : text.sameGreen;
}

function Reference({
  site,
  item,
  region,
}: {
  site: FarmSite;
  item: UnidadIndicadores;
  region: RegionCode;
}) {
  const text = environmentCopy[useMessageLanguage()];
  const distance = referenceDistance(site, item);
  return (
    <div className="environment-reference">
      <p>
        {text.reference}: {text.zones[region]} · {number(item.lat!, 4)}, {number(item.lon!, 4)}
      </p>
      {distance !== null && (
        <p>
          {text.distance}: {number(distance)} km
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  indicator,
  help,
  signed = false,
}: {
  label: string;
  indicator: Indicador | undefined;
  help?: string;
  signed?: boolean;
}) {
  const text = environmentCopy[useMessageLanguage()];
  const value = indicator?.valor;
  return (
    <article className="environment-metric">
      <h3>{label}</h3>
      <p className="environment-value">
        {value == null
          ? text.unavailable
          : `${signed && value > 0 ? '+' : ''}${number(value, 3)}${indicator!.unidad === '0-1' ? '' : ` ${indicator!.unidad}`}`}
      </p>
      {indicator && (
        <p className="source-note">
          {text.observed}: <time dateTime={indicator.fecha}>{date(indicator.fecha)}</time>
        </p>
      )}
      {help && <p>{help}</p>}
    </article>
  );
}

function SourcePanel({
  source,
  title,
  result,
  region,
  failedUpdate,
  children,
}: {
  source: EnvironmentSource;
  title: string;
  result: SourceResult;
  region: RegionCode | null;
  failedUpdate: boolean;
  children: (file: ArchivoIndicadores, item: UnidadIndicadores) => ReactNode;
}) {
  const text = environmentCopy[useMessageLanguage()];
  const file = result.status === 'ready' ? result.file : null;
  const item = file ? referenceUnit(file, region) : undefined;
  return (
    <section className="v10-card environment-source" aria-labelledby={`environment-${source}`}>
      <h2 id={`environment-${source}`}>{title}</h2>
      {result.status === 'loading' ? (
        <p role="status">{text.loading}</p>
      ) : !file ? (
        <div role="status">
          <h3>{text.unavailable}</h3>
          <p>{text.failed}</p>
          {source === 'modis' && <p>{text.noModis}</p>}
        </div>
      ) : (
        <>
          {failedUpdate && <p className="environment-notice">{text.lastGood}</p>}
          {item ? children(file, item) : <p role="status">{text.noUnit}</p>}
          <footer className="environment-provenance">
            <p>
              {text.source}:{' '}
              <ExternalSource href={file.meta.url}>
                {ENVIRONMENT_SOURCES[source].name}
              </ExternalSource>
            </p>
            <p>
              {text.observed}:{' '}
              <time dateTime={file.meta.fecha_dato}>{date(file.meta.fecha_dato)}</time> · {text.age}
              : {observationAge(file.meta.fecha_dato)}
            </p>
            <p>
              {text.downloaded}:{' '}
              <time dateTime={file.meta.fecha_carga}>
                {date(file.meta.fecha_carga.slice(0, 10))}
              </time>
            </p>
            {file.meta.nota && <p>{file.meta.nota}</p>}
          </footer>
        </>
      )}
    </section>
  );
}
