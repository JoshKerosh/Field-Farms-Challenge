"""Lectura de las capas locales entregadas por PNUD: cuencas, subcuencas y el registro SAGA (AyA)."""

import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path

import openpyxl
import shapefile
import shapely
from pyproj import CRS, Transformer
from shapely.geometry import shape

CUENCAS_SHP = 'cuencas_hidrograficas.shp'
SUBCUENCAS_ZIP = 'Subcuencas_CRTM05.zip'
SAGA_XLSX = 'Operadores y Fuentes (Ubicaciones).xlsx'
# En las hojas del SAGA, las filas anteriores son título y notas.
SAGA_HEADER_ROW = 5


@dataclass
class Layer:
    """Polígonos en su sistema de origen (CRTM05, metros) y el transformador a WGS84."""

    features: list[tuple[dict, shapely.Geometry]]
    to_wgs84: Transformer


def read_layer(path: Path) -> Layer:
    reader = shapefile.Reader(str(path), encoding='utf-8', encodingErrors='replace')
    crs = CRS.from_wkt(path.with_suffix('.prj').read_text(encoding='latin-1'))
    features = [(item.record.as_dict(), shapely.make_valid(shape(item.shape.__geo_interface__)))
                for item in reader.iterShapeRecords() if item.shape.points]
    return Layer(features, Transformer.from_crs(crs, 'EPSG:4326', always_xy=True))


def read_cuencas(datasets: Path) -> Layer:
    return read_layer(datasets / CUENCAS_SHP)


def read_subcuencas(datasets: Path) -> Layer:
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(datasets / SUBCUENCAS_ZIP) as archive:
            archive.extractall(tmp)
        return read_layer(next(Path(tmp).rglob('*.shp')))


def read_saga(datasets: Path) -> tuple[list[dict], list[dict]]:
    """Filas de operadores y de fuentes, como diccionarios por encabezado."""
    workbook = openpyxl.load_workbook(datasets / SAGA_XLSX, read_only=True, data_only=True)

    def sheet(name: str) -> list[dict]:
        rows = list(workbook[name].iter_rows(values_only=True))
        header = rows[SAGA_HEADER_ROW]
        return [dict(zip(header, row)) for row in rows[SAGA_HEADER_ROW + 1:] if any(row)]

    return sheet('Operadores'), sheet('Fuentes')
