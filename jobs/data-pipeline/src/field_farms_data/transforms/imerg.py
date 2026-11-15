"""Validated NetCDF decoding and area-weighted daily/weekly rainfall by subbasin."""

import hashlib
import json
from datetime import date
from pathlib import Path

import netCDF4
import numpy as np
from pyproj import Transformer
from shapely import STRtree, normalize
from shapely.geometry import box, shape
from .geo import project

METHOD = 'imerg-area-5367-v1'
AREA_EPSILON = 1e-6  # Numerical geometry tolerance, NOT a risk/coverage acceptance threshold.
PROJECT = Transformer.from_crs('EPSG:4326', 'EPSG:5367', always_xy=True)


def load_subbasins(directory):
    basins = []
    seen = set()
    for path in sorted(Path(directory).glob('*.geojson')):
        payload = json.loads(path.read_text(encoding='utf-8'))
        layer_digest = hashlib.sha256(path.read_bytes()).hexdigest()
        for feature_index, feature in enumerate(payload['features']):
            geom = shape(feature['geometry'])
            if geom.geom_type not in ('Polygon', 'MultiPolygon') or not geom.is_valid or geom.is_empty:
                raise ValueError('Invalid subbasin geometry; repair explicitly before IMERG aggregation')
            properties = feature['properties']
            digest = hashlib.sha256(normalize(geom).wkb).hexdigest()
            if digest in seen:
                raise ValueError('Duplicate subbasin geometry')
            seen.add(digest)
            basins.append({'id': f'imerg-{digest[:20]}', 'geometry': geom,
                           'geometrySha256': digest, 'name': properties['nombre'],
                           'basinFile': path.name, 'featureIndex': feature_index,
                           'layerSha256': layer_digest, 'bounds': list(geom.bounds),
                           'vertiente': properties.get('vertiente')})
    if not basins:
        raise ValueError('No subbasins found')
    return basins


def read_coordinates(body, day):
    with netCDF4.Dataset('coordinates', memory=body) as ds:
        lon = np.asarray(ds.variables['lon'][:], dtype=float)
        lat = np.asarray(ds.variables['lat'][:], dtype=float)
        if getattr(ds.variables['lon'], 'units', '') not in ('degrees_east', 'degrees east'):
            raise ValueError('Unexpected longitude units')
        if getattr(ds.variables['lat'], 'units', '') not in ('degrees_north', 'degrees north'):
            raise ValueError('Unexpected latitude units')
        time = ds.variables['time']
        observed = netCDF4.num2date(time[:], time.units, calendar=getattr(time, 'calendar', 'standard'))
        if len(observed) != 1 or observed[0].strftime('%Y-%m-%d') != day:
            raise ValueError('NetCDF observation date differs from CMR daily date')
    for axis in (lon, lat):
        if axis.ndim != 1 or len(axis) < 2 or not np.all(np.isfinite(axis)):
            raise ValueError('Invalid grid coordinates')
        if not np.allclose(np.diff(axis), 0.1, atol=1e-5, rtol=0):
            raise ValueError('Expected ascending 0.1 degree IMERG grid')
    return lon, lat


def selection(lon, lat, basins):
    bounds = [b['geometry'].bounds for b in basins]
    west, south = min(b[0] for b in bounds), min(b[1] for b in bounds)
    east, north = max(b[2] for b in bounds), max(b[3] for b in bounds)
    indices = {}
    for name, axis, low, high in [('lon', lon, west, east), ('lat', lat, south, north)]:
        selected = np.flatnonzero((axis + 0.05 > low) & (axis - 0.05 < high))
        if not len(selected) or axis[selected[0]] - 0.05 > low + 1e-5 or axis[selected[-1]] + 0.05 < high - 1e-5:
            raise ValueError('IMERG grid does not cover the requested subbasin extent')
        indices[name] = (int(selected[0]), int(selected[-1]))
    return indices


def constraint(dims, indices):
    slices = {'time': '[0:1:0]', **{name: f'[{a}:1:{b}]' for name, (a, b) in indices.items()}}
    return '/precipitation' + ''.join(slices[d] for d in dims) + ';' + ';'.join(
        '/' + name + slices[name] for name in ('lon', 'lat')) + ';/time'


def read_precipitation(body, day, expected_lon, expected_lat):
    lon, lat = read_coordinates(body, day)
    if not np.allclose(lon, expected_lon, atol=1e-5, rtol=0) or not np.allclose(lat, expected_lat, atol=1e-5, rtol=0):
        raise ValueError('Subset coordinates do not match requested grid')
    with netCDF4.Dataset('subset', memory=body) as ds:
        variable = ds.variables['precipitation']
        # Daily GPM_3IMERGDL is already mm/day. Never multiply it by 24 again.
        if getattr(variable, 'units', '').strip() not in ('mm/day', 'mm day-1', 'mm d-1'):
            raise ValueError('Unexpected daily precipitation units')
        dimensions = variable.dimensions
        if dimensions not in (('time', 'lon', 'lat'), ('time', 'lat', 'lon')) or variable.shape[0] != 1:
            raise ValueError('Unexpected daily precipitation array dimensions')
        values = np.ma.asarray(variable[0], dtype=float).filled(np.nan)
        if dimensions == ('time', 'lon', 'lat'):
            values = values.T
        values[~np.isfinite(values) | (values < 0)] = np.nan
        if values.shape != (len(lat), len(lon)):
            raise ValueError('Unexpected daily precipitation array shape')
    return values


def weights(lon, lat, basins):
    """Intersect cell footprints in WGS84, then measure each intersection in CRTM05."""
    def edges(axis):
        axis = np.asarray(axis, dtype=float)
        return np.concatenate(([axis[0] - (axis[1] - axis[0]) / 2],
                               (axis[:-1] + axis[1:]) / 2,
                               [axis[-1] + (axis[-1] - axis[-2]) / 2]))

    xs, ys = edges(lon), edges(lat)
    cells = [box(xs[x], ys[y], xs[x + 1], ys[y + 1])
             for y in range(len(lat)) for x in range(len(lon))]
    tree = STRtree(cells)
    result = []
    for basin in basins:
        geometry = basin['geometry']
        area = project(geometry, PROJECT).area
        if area <= 0:
            raise ValueError('Nonpositive subbasin area')
        cell_weights = []
        angular_area = 0
        for index in tree.query(geometry, predicate='intersects'):
            intersection = geometry.intersection(cells[index])
            intersect_area = project(intersection, PROJECT).area
            if intersect_area > 0:
                cell_weights.append((int(index), intersect_area / area))
                angular_area += intersection.area
        total = sum(value for _, value in cell_weights)
        if total <= 0 or abs(angular_area / geometry.area - 1) > AREA_EPSILON:
            raise ValueError('Grid cells do not completely partition a subbasin')
        result.append([(index, value / total) for index, value in cell_weights])
    return result


def aggregate(arrays, days, basins, cell_weights):
    if len(arrays) != 7 or len(days) != 7:
        raise ValueError('Seven daily grids are required')
    dates = [date.fromisoformat(day) for day in days]
    if any((b - a).days != 1 for a, b in zip(dates, dates[1:])):
        raise ValueError('Daily grids must be ordered and contiguous')
    if len(cell_weights) != len(basins):
        raise ValueError('Missing subbasin weights')
    flat = np.stack([np.asarray(array, dtype=float).ravel() for array in arrays])
    results = []
    for basin, weighted in zip(basins, cell_weights):
        indices = [i for i, _ in weighted]
        fractions = np.array([w for _, w in weighted])
        values = flat[:, indices]
        valid = np.isfinite(values) & (values >= 0)
        daily_coverage = valid @ fractions
        common = np.all(valid, axis=0)
        common_coverage = float(sum(fractions[common]))
        daily_complete = bool(np.all(valid[-1]))
        week_complete = bool(np.all(common))
        # Missing pixels make the value unavailable, even if the remaining mean looks benign.
        rain1 = float(values[-1] @ fractions) if daily_complete else None
        rain7 = float(np.sum(values, axis=0) @ fractions) if week_complete else None
        results.append({key: value for key, value in basin.items() if key != 'geometry'} | {
            'rain1d': {'value': rain1, 'unit': 'mm', 'observedStart': days[-1], 'observedEnd': days[-1],
                       'status': 'available' if daily_complete else 'unavailable',
                       'validAreaFraction': float(daily_coverage[-1])},
            'rain7d': {'value': rain7, 'unit': 'mm', 'observedStart': days[0], 'observedEnd': days[-1],
                       'status': 'available' if week_complete else 'unavailable',
                       'validAreaFraction': common_coverage},
        })
    return results
