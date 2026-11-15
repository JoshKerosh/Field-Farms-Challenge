import { useSearchParams } from 'react-router-dom';
import { recoveryFarmId } from '@field-farms/domain';
import { useField } from '../context/FieldContext';
import { PageHeader } from '../../shared/ui';
import { RecoveryRecords } from '../../features/restoration/components/RecoveryRecords';
import { WaterRecords } from '../../features/records/WaterRecords';
import { useRecordsCopy } from '../../features/records/records-copy';
import '../../features/records/records.css';
export function RecordsPage() {
  const c = useRecordsCopy();
  const [params, setParams] = useSearchParams();
  const { farmSite } = useField();
  const water = params.get('section') === 'water';
  return (
    <div className="v10-stack records-page">
      <PageHeader title={c.title} intro={c.intro} />
      <div className="filter-group recovery-no-print" role="group" aria-label={c.title}>
        <button
          type="button"
          className="filter-button"
          aria-pressed={!water}
          onClick={() => setParams({ section: 'plan' })}
        >
          {c.progress}
        </button>
        <button
          type="button"
          className="filter-button"
          aria-pressed={water}
          onClick={() => setParams({ section: 'water' })}
        >
          {c.water}
        </button>
      </div>
      {water ? (
        <WaterRecords key={farmSite ? recoveryFarmId(farmSite) : 'unlocated'} />
      ) : (
        <RecoveryRecords key={farmSite ? recoveryFarmId(farmSite) : 'unlocated'} />
      )}
    </div>
  );
}
