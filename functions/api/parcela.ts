// Cloudflare Pages Function: GET /api/parcela?lat=&lon=
// Same handler as the Vite middleware used in development and preview.
import { handleParcelRequest } from '../../apps/web/src/platform/siri/parcel';

export const onRequestGet = ({ request }: { request: Request }) => handleParcelRequest(request);
