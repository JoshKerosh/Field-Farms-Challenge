"""Descargas HTTP con reintentos, solo con la biblioteca estándar (sin dependencias nuevas)."""

import json
import time
import urllib.error
import urllib.request

USER_AGENT = 'field-farms-data/0.1 (NASA Space Apps 2026)'


def get_text(url: str, *, retries: int = 3, timeout: float = 60) -> str:
    """Devuelve el cuerpo de `url`. Reintenta errores de red y 5xx; un 4xx falla de inmediato."""
    last: Exception | None = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return response.read().decode('utf-8')
        except urllib.error.HTTPError as error:
            if error.code < 500:
                raise
            last = error
        except (urllib.error.URLError, TimeoutError) as error:
            last = error
        time.sleep(2 ** attempt)
    raise RuntimeError(f'{url}: {last}')


def get_json(url: str, **kwargs) -> dict:
    return json.loads(get_text(url, **kwargs))
