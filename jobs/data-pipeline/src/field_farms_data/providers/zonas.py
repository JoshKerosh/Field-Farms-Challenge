"""Six reference climate zones: one NASA point per zone (the same as the v10 prototype)."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Zona:
    id: str
    nombre: str
    lat: float
    lon: float


ZONAS: tuple[Zona, ...] = (
    Zona('N', 'Zona Norte', 10.8, -85.08),
    Zona('C', 'Caribe húmedo', 10.45, -84.02),
    Zona('S', 'Pacífico seco', 10.55, -85.45),
    Zona('M', 'Pacífico central', 9.55, -84.35),
    Zona('U', 'Pacífico sur', 9.25, -83.55),
    Zona('V', 'Valle Central', 10.02, -84.25),
)
