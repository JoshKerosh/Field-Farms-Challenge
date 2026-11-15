"""One-time national recovery history. Earthdata credentials stay in the local environment.

Submit: python -m field_farms_data.publish.recovery --request
Resume: python -m field_farms_data.publish.recovery --task TASK_ID
Import downloaded AppEEARS GeoTIFFs: ... --input data/recovery/raw
"""
import argparse
import base64
import calendar
import json
import os
import re
from datetime import date, timedelta
from pathlib import Path
from urllib.request import Request, urlopen

from field_farms_data.providers.http import get_json
from field_farms_data.publish.archivos import DATA_DIR, escribir_json, meta, actualizar_fuente

API = 'https://appeears.earthdatacloud.nasa.gov/api'
SOURCE = 'recovery-history'


def months_before_today():
    end = date.today().replace(day=1) - timedelta(days=1)
    ordinal = end.year * 12 + end.month - 24
    start = date(ordinal // 12, ordinal % 12 + 1, 1)
    return start, end


def api(path, token=None, payload=None, basic=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if basic:
        headers['Authorization'] = 'Basic ' + base64.b64encode(basic.encode()).decode()
    request = Request(API + path, data=json.dumps(payload).encode() if payload is not None else None,
                      headers=headers, method='POST' if payload is not None or basic else 'GET')
    with urlopen(request, timeout=120) as response:
        return json.load(response)


def acquire(args, start, end):
    username, password = os.getenv('EARTHDATA_USERNAME'), os.getenv('EARTHDATA_PASSWORD')
    if not username or not password:
        raise SystemExit('Configure EARTHDATA_USERNAME and EARTHDATA_PASSWORD locally. Never commit credentials.')
    token = api('/login', basic=f'{username}:{password}')['token']
    if not args.task:
        bounds = [-86, 8, -82.5, 11.3]
        w, s, e, n = bounds
        payload = {'task_type': 'area', 'task_name': 'FieldFarms-national-recovery', 'params': {
            'dates': [{'startDate': start.strftime('%m-%d-%Y'), 'endDate': end.strftime('%m-%d-%Y')}],
            'layers': [{'product': 'MOD13Q1.061', 'layer': '_250m_16_days_' + band}
                       for band in ['NDVI', 'VI_Quality', 'pixel_reliability']],
            'geo': {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {},
                'geometry': {'type': 'Polygon', 'coordinates': [[[w,s],[e,s],[e,n],[w,n],[w,s]]]}}]},
            'output': {'format': {'type': 'geotiff', 'filename_date': 'calendar'}, 'projection': 'geographic'}}}
        result = api('/task', token, payload)
        print('Task submitted. Resume with --task', result['task_id'], '--start', start, '--end', end)
        return False
    status = api('/task/' + args.task, token)
    if status['status'] != 'done':
        print('Earthdata task:', status['status'], 'Resume the same task later; no files published.')
        return False
    args.input.mkdir(parents=True, exist_ok=True)
    for item in api('/bundle/' + args.task, token)['files']:
        if not item['file_name'].lower().endswith('.tif'):
            continue
        target = args.input / Path(item['file_name']).name
        if target.exists() and target.stat().st_size == item.get('file_size'):
            continue
        req = Request(API + '/bundle/' + args.task + '/' + item['file_id'],
                      headers={'Authorization': 'Bearer ' + token})
        with urlopen(req, timeout=240) as response, target.open('wb') as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
    return True


def raster_date(path):
    match = re.search(r'doy(\d{7})', path.name)
    if match:
        return date(int(match[1][:4]), 1, 1) + timedelta(days=int(match[1][4:]) - 1)
    match = re.search(r'(20\d{6})T', path.name)
    if match:
        return date(int(match[1][:4]), int(match[1][4:6]), int(match[1][6:]))
    raise ValueError('Missing observation date: ' + path.name)


def publish_rainfall(out, start, end):
    """Independent public POWER acquisition; no Earthdata login is required."""
    from urllib.parse import urlencode
    from field_farms_data.transforms.indicadores import indicador
    query = urlencode({'parameters':'PRECTOTCORR','community':'AG','longitude-min':-86,
        'longitude-max':-82.5,'latitude-min':8,'latitude-max':11.3,
        'start':start.strftime('%Y%m%d'),'end':end.strftime('%Y%m%d'),'format':'JSON','time-standard':'UTC'})
    url = 'https://power.larc.nasa.gov/api/temporal/daily/regional?' + query
    raw = fetch_power_history(start, end)
    months = [f'{n//12:04}-{n%12+1:02}' for n in range(start.year*12+start.month-1,end.year*12+end.month)]
    items=[]
    for index, feature in enumerate(raw['features']):
        lon,lat=feature['geometry']['coordinates'][:2]
        daily=feature['properties']['parameter']['PRECTOTCORR']
        serie=[]
        for month in months:
            year,mon=map(int,month.split('-'))
            values=[daily.get(f'{year}{mon:02}{d:02}',-999) for d in range(1,calendar.monthrange(year,mon)[1]+1)]
            serie.append({'fecha':month+'-01','valores':{'lluvia':round(sum(values),2) if all(v>=0 for v in values) else None}})
        items.append({'id':str(index),'nombre':f'POWER {lat}, {lon}','lat':lat,'lon':lon,
            'indicadores':[indicador('lluvia_mensual','Lluvia mensual regional',serie[-1]['valores']['lluvia'],'mm','recovery-power',end)],'serie':serie})
    register_source(out,'recovery-power','NASA POWER regional monthly history',url,['recovery/rainfall.json'],end)
    escribir_json(out/'recovery/rainfall.json',{'meta':meta('recovery-power',url,end,nota='Monthly totals from complete daily UTC records. Native POWER meteorological grid ~0.5 x 0.625 degrees; regional context, not a farm rain gauge.'),'datos':{'unidad':'zona','items':items}},compacto=True)
    print('Published POWER regional history:', len(items), 'grid points,', len(months), 'months')


def fetch_power_history(start, end):
    from urllib.parse import urlencode
    combined = None
    cursor = start
    while cursor <= end:
        stop = min(end, cursor + timedelta(days=365))
        query = urlencode({'parameters':'PRECTOTCORR','community':'AG','longitude-min':-86,
            'longitude-max':-82.5,'latitude-min':8,'latitude-max':11.3,
            'start':cursor.strftime('%Y%m%d'),'end':stop.strftime('%Y%m%d'),'format':'JSON','time-standard':'UTC'})
        part = get_json('https://power.larc.nasa.gov/api/temporal/daily/regional?' + query, timeout=180)
        if combined is None:
            combined = part
        else:
            by_coordinate = {tuple(f['geometry']['coordinates']):f for f in combined['features']}
            for f in part['features']:
                by_coordinate[tuple(f['geometry']['coordinates'])]['properties']['parameter']['PRECTOTCORR'].update(f['properties']['parameter']['PRECTOTCORR'])
        cursor = stop + timedelta(days=1)
    return combined


def register_source(out, source, title, url, paths, observed):
    catalog=out/'fuentes.json'
    data=json.loads(catalog.read_text(encoding='utf-8'))
    if not any(f['id']==source for f in data['fuentes']):
        data['fuentes'].append({'id':source,'titulo':title,'institucion':'NASA','tipo_servicio':'api','url':url,'licencia':'Public NASA data','frecuencia':'estatica','capa':'nasa','simulado':False,'estado':'estatico','ultima_carga_buena':observed.isoformat(),'archivos':paths})
        escribir_json(catalog,data)
    actualizar_fuente(out,source,fecha_dato=observed)


def valid_modis(ndvi, qa, reliability):
    # MODLAND good, land, no adjacent/mixed clouds, snow, shadow or high aerosol.
    return ((ndvi >= -2000) & (ndvi <= 10000) & (reliability == 0) & ((qa & 3) == 0)
            & (((qa >> 11) & 7) == 1) & ((qa & ((1 << 8) | (1 << 10) | (1 << 14) | (1 << 15))) == 0)
            & (((qa >> 6) & 3) != 3))


def publish(args, start, end):
    import numpy as np
    import rasterio
    from rasterio.features import geometry_mask
    from rasterio.warp import reproject, Resampling
    from pyproj import Geod
    from urllib.parse import urlencode
    files = list(args.input.glob('*.tif'))
    ndvis = sorted(p for p in files if '_NDVI_' in p.name and start <= raster_date(p) <= end)
    if not ndvis:
        raise ValueError('No MOD13Q1 NDVI GeoTIFFs in the requested period')
    with rasterio.open(ndvis[0]) as src:
        transform, shape, crs = src.transform, src.shape, src.crs
    if crs.to_epsg() != 4326:
        raise ValueError('Use AppEEARS geographic output (EPSG:4326)')
    months = []
    for ordinal in range(start.year * 12 + start.month - 1, end.year * 12 + end.month):
        months.append(f'{ordinal // 12:04}-{ordinal % 12 + 1:02}')

    def read(path):
        dest = np.full(shape, -3000, dtype='int32')
        with rasterio.open(path) as src:
            reproject(rasterio.band(src, 1), dest, src_transform=src.transform, src_crs=src.crs,
                      dst_transform=transform, dst_crs=crs, dst_nodata=-3000, resampling=Resampling.nearest)
        return dest

    monthly = []
    for month in months:
        scenes = []
        for path in ndvis:
            if raster_date(path).strftime('%Y-%m') != month:
                continue
            ndvi = read(path)
            qa_path = path.with_name(path.name.replace('_NDVI_', '_VI_Quality_'))
            reliability_path = path.with_name(path.name.replace('_NDVI_', '_pixel_reliability_'))
            qa, reliability = read(qa_path), read(reliability_path)
            scenes.append(np.where(valid_modis(ndvi, qa, reliability), ndvi * .0001, np.nan))
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter('ignore', RuntimeWarning)
            monthly.append(np.nanmedian(scenes, axis=0) if scenes else np.full(shape, np.nan))
    cube = np.array(monthly)
    basins = json.loads((DATA_DIR / 'geo/cuencas.geojson').read_text(encoding='utf-8'))['features']
    land = geometry_mask([b['geometry'] for b in basins], shape, transform, invert=True)
    rows, cols = np.where(land)
    xs, ys = rasterio.transform.xy(transform, rows, cols)
    weights = np.array([abs(Geod(ellps='WGS84').polygon_area_perimeter(
        [x-transform.a/2,x+transform.a/2,x+transform.a/2,x-transform.a/2],
        [y-transform.e/2,y-transform.e/2,y+transform.e/2,y+transform.e/2])[0]) for x,y in zip(xs,ys)])
    values = cube[:, rows, cols]
    # One regional POWER grid per history period, kept separate from satellite resolution.
    query = urlencode({'parameters':'PRECTOTCORR','community':'AG','longitude-min':-86,'longitude-max':-82.5,
        'latitude-min':8,'latitude-max':11.3,'start':start.strftime('%Y%m%d'),'end':end.strftime('%Y%m%d'),'format':'JSON','time-standard':'UTC'})
    power_url = 'https://power.larc.nasa.gov/api/temporal/daily/regional?' + query
    cache = args.input / f'power-{start}-{end}.json'
    power = json.loads(cache.read_text()) if cache.exists() else fetch_power_history(start, end)
    cache.write_text(json.dumps(power), encoding='utf-8')
    climate = []
    for feature in power['features']:
        daily = feature['properties']['parameter']['PRECTOTCORR']
        monthly_rain = []
        for month in months:
            year, mon = map(int, month.split('-'))
            days = [daily.get(f'{year}{mon:02}{d:02}', -999) for d in range(1,calendar.monthrange(year,mon)[1]+1)]
            monthly_rain.append(sum(days) if all(d >= 0 for d in days) else np.nan)
        climate.append((feature['geometry']['coordinates'][:2], monthly_rain))
    nearest = np.array([min(range(len(climate)),key=lambda k:(climate[k][0][0]-x)**2+(climate[k][0][1]-y)**2) for x,y in zip(xs,ys)])
    rain = np.array([climate[k][1] for k in nearest]).T
    def nullable(v): return round(float(v),4) if np.isfinite(v) else None
    def summary(mask):
        output=[]; total=weights[mask].sum()
        for i,month in enumerate(months):
            good=mask & np.isfinite(values[i]); wet=mask & np.isfinite(rain[i])
            previous=months.index(f'{int(month[:4])-1}{month[4:]}') if f'{int(month[:4])-1}{month[4:]}' in months else -1
            common=good & np.isfinite(values[previous]) if previous>=0 else np.zeros(len(rows),dtype=bool)
            output.append({'month':month,'ndvi':nullable(np.average(values[i,good],weights=weights[good])) if good.any() else None,
                'rain':nullable(np.average(rain[i,wet],weights=weights[wet])) if wet.sum()==mask.sum() and wet.any() else None,
                'coverage':float(weights[good].sum()/total) if total else 0,
                'change':nullable(np.average(values[i,common]-values[previous,common],weights=weights[common])) if total and weights[common].sum()/total>=.8 else None})
        return output
    m=meta(SOURCE, API, max(raster_date(p) for p in ndvis), nota='MOD13Q1.061 ~250m; monthly median of good QA land pixels; POWER regional grid rainfall. Cell-centre inclusion; area weighted watershed statistics. No causal attribution.')
    groups=[]
    for basin in basins:
        mask=geometry_mask([basin['geometry']],shape,transform,invert=True)[rows,cols]
        groups.append({'id':str(basin['properties']['cuenca_no']),'rows':summary(mask)})
    tiles=[]
    for r in range(0,shape[0],64):
        for col in range(0,shape[1],64):
            indexes=np.where((rows>=r)&(rows<r+64)&(cols>=col)&(cols<col+64))[0]
            if not len(indexes): continue
            path=f'recovery/tiles/{r}-{col}.json'
            pixels=[{'lat':ys[k],'lon':xs[k],'area':float(weights[k]),'ndvi':[nullable(v) for v in values[:,k]],'rain':[nullable(v) for v in rain[:,k]]} for k in indexes]
            escribir_json(args.out/path, {'meta':m,'datos':{'pixels':pixels}}, compacto=True)
            tiles.append({'path':path,'bounds':[min(xs[k] for k in indexes),min(ys[k] for k in indexes),max(xs[k] for k in indexes),max(ys[k] for k in indexes)]})
    escribir_json(args.out/'recovery/history.json',{'meta':m,'datos':{'months':months,'basins':groups,'tiles':tiles}},compacto=True)
    catalog=args.out/'fuentes.json'; data=json.loads(catalog.read_text(encoding='utf-8'))
    if not any(f['id']==SOURCE for f in data['fuentes']):
        data['fuentes'].append({'id':SOURCE,'titulo':'Recovery MODIS and POWER history','institucion':'NASA LP DAAC / NASA POWER','tipo_servicio':'api','url':API,'licencia':'Public NASA data','frecuencia':'estatica','capa':'nasa','simulado':False,'estado':'estatico','ultima_carga_buena':end.isoformat(),'archivos':['recovery/*']})
        escribir_json(catalog,data)
    actualizar_fuente(args.out,SOURCE,fecha_dato=end)
    print('Published real history:',start,end,'tiles:',len(tiles))


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--request',action='store_true');parser.add_argument('--task')
    parser.add_argument('--rainfall-only',action='store_true')
    parser.add_argument('--input',type=Path,default=Path(__file__).resolve().parents[3]/'data/recovery/raw')
    parser.add_argument('--out',type=Path,default=DATA_DIR)
    start,end=months_before_today()
    parser.add_argument('--start',type=date.fromisoformat,default=start)
    parser.add_argument('--end',type=date.fromisoformat,default=end)
    args=parser.parse_args()
    if args.start.day!=1 or args.end.day!=calendar.monthrange(args.end.year,args.end.month)[1]:
        parser.error('Use complete calendar months')
    if args.rainfall_only:
        publish_rainfall(args.out,args.start,args.end)
        return
    if args.request or args.task:
        if not acquire(args,args.start,args.end): return
    publish(args,args.start,args.end)


if __name__=='__main__': main()
