import type { WaterReading, WaterSource } from '@field-farms/domain';
import { copy, date, number } from '../../../i18n';
import { FlowChart } from '../../../shared/charts/FlowChart';

export function WaterHistory({
  readings,
  sources,
}: {
  readings: WaterReading[];
  sources: WaterSource[];
}) {
  return (
    <section className="page-section">
      <h2>{copy.water.readingsTitle}</h2>
      <p>{copy.water.readingsNote}</p>
      <FlowChart readings={readings} />
      <div className="table-scroll">
        <table>
          <caption className="sr-only">{copy.water.chartLabel}</caption>
          <thead>
            <tr>
              <th scope="col">{copy.water.date}</th>
              <th scope="col">{copy.water.source}</th>
              <th scope="col">{copy.water.reading}</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading) => (
              <tr key={reading.id}>
                <th scope="row">{date(reading.recordedAt)}</th>
                <td>{sources.find((source) => source.id === reading.sourceId)?.name}</td>
                <td>
                  {number(reading.value)} {reading.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
