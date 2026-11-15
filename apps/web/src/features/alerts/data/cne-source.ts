import type { AlertEvidence } from '@field-farms/domain';

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => !!v && typeof v === 'object' && !Array.isArray(v);
export interface CneSource {
  longitude: number;
  latitude: number;
  evidence: Record<string, AlertEvidence>;
}

export function parseCneSource(document: unknown): CneSource | null {
  if (
    !object(document) ||
    document.schemaVersion !== 'alert-cne-v1' ||
    document.dataMode !== 'real' ||
    !object(document.location) ||
    typeof document.location.longitude !== 'number' ||
    !Number.isFinite(document.location.longitude) ||
    typeof document.location.latitude !== 'number' ||
    !Number.isFinite(document.location.latitude) ||
    Math.abs(document.location.longitude) > 180 ||
    Math.abs(document.location.latitude) > 90 ||
    !Array.isArray(document.indicators)
  )
    return null;
  const evidence: Record<string, AlertEvidence> = {};
  for (const item of document.indicators) {
    if (
      !object(item) ||
      !['floodZone', 'landslideZone'].includes(String(item.id)) ||
      item.source !== 'CNE' ||
      item.status !== 'unverified' ||
      item.observedStart !== null ||
      item.observedEnd !== null ||
      ![true, null].includes(item.value as true | null) ||
      !object(item.evidence) ||
      typeof item.evidence.url !== 'string' ||
      !item.evidence.url.startsWith('http://mapas.cne.go.cr/servicios/cne/wfs?') ||
      typeof item.evidence.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(item.evidence.sha256)
    )
      return null;
    const id = String(item.id);
    const expected = id === 'floodZone' ? 'cne:inundaciones' : 'cne:deslizamientos';
    if (item.productId !== expected || Object.hasOwn(evidence, id)) return null;
    evidence[id] = {
      id,
      value: item.value as true | null,
      unit: '',
      productId: expected,
      status: 'unverified',
      expectedSource: 'CNE · WFS',
      provenance: null,
      observedStart: null,
      observedEnd: null,
    };
  }
  return { longitude: document.location.longitude, latitude: document.location.latitude, evidence };
}
