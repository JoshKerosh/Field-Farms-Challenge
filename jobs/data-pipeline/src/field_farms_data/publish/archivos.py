"""Escritura de archivos en `apps/web/public/data/` y actualización del catálogo `fuentes.json`."""

import json
from datetime import date, datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[5] / 'apps' / 'web' / 'public' / 'data'
CATALOGO = 'fuentes.json'
VERSION = 1


def ahora() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def meta(fuente: str, url: str, fecha_dato: date, capa: str = 'nasa', simulado: bool = False,
         nota: str | None = None) -> dict:
    m = {'fuente': fuente, 'url': url, 'capa': capa, 'simulado': simulado,
         'fecha_dato': fecha_dato.isoformat(), 'fecha_carga': ahora(), 'version': VERSION}
    if nota:
        m['nota'] = nota
    return m


def escribir_json(path: Path, contenido: dict, compacto: bool = False) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(contenido, ensure_ascii=False,
                       **({'separators': (',', ':')} if compacto else {'indent': 1}))
    path.write_text(texto + '\n', encoding='utf-8')
    return path.stat().st_size


def actualizar_fuente(data_dir: Path, fuente_id: str, *, fecha_dato: date | None = None,
                      error: str | None = None) -> None:
    """Marca la fuente como `ok` con su fecha, o como `falla` conservando el último dato bueno (D-03)."""
    path = data_dir / CATALOGO
    catalogo = json.loads(path.read_text(encoding='utf-8'))
    fuente = next((f for f in catalogo['fuentes'] if f['id'] == fuente_id), None)
    if fuente is None:
        raise KeyError(f'{fuente_id} no está en {CATALOGO}')
    if error:
        fuente['estado'] = 'falla'
        fuente['ultimo_error'] = error[:300]
    else:
        fuente['estado'] = 'ok'
        fuente['ultimo_error'] = None
        fuente['ultima_carga_buena'] = fecha_dato.isoformat()
    catalogo['actualizado'] = ahora()
    escribir_json(path, catalogo)
