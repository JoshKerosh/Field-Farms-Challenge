from datetime import date
from pathlib import Path
import numpy as np
from field_farms_data.publish.recovery import valid_modis, raster_date, months_before_today

def test_modis_quality_retains_valid_negative_pixels_and_excludes_clouds():
    ndvi=np.array([-1000,5000,5000,5000,-3000,12000])
    qa=np.array([2048,2048,2048+(1<<10),2048+(1<<15),2048,2048])
    reliability=np.array([0,1,0,0,0,0])
    assert valid_modis(ndvi,qa,reliability).tolist()==[True,False,False,False,False,False]

def test_dates_use_observations_not_download_dates():
    assert raster_date(Path('MOD13Q1.061_NDVI_doy2026289_a.tif'))==date(2026,10,16)
    assert raster_date(Path('MOD13Q1.061_NDVI_20261016T000000_a.tif'))==date(2026,10,16)
    start,end=months_before_today()
    assert start.day==1
    assert (end.year-start.year)*12+end.month-start.month==23


def test_import_builds_real_format_without_filling_missing_observations(tmp_path, monkeypatch):
    import argparse
    import json
    import rasterio
    from rasterio.transform import from_origin
    from field_farms_data.publish import recovery
    raw=tmp_path/'raw';raw.mkdir()
    out=tmp_path/'out';(out/'geo').mkdir(parents=True)
    (out/'fuentes.json').write_text(json.dumps({'actualizado':'','fuentes':[]}))
    polygon={'type':'Polygon','coordinates':[[[-84,10],[-83.99,10],[-83.99,9.99],[-84,9.99],[-84,10]]]}
    (out/'geo/cuencas.geojson').write_text(json.dumps({'features':[{'properties':{'cuenca_no':1},'geometry':polygon}]}))
    for day,value in [('2025001',5000),('2026001',7000)]:
        for band,array in [('NDVI',np.full((2,2),value)),('VI_Quality',np.full((2,2),2048)),('pixel_reliability',np.zeros((2,2)))]:
            with rasterio.open(raw/f'MOD13Q1.061_250m_16_days_{band}_doy{day}_test.tif','w',driver='GTiff',height=2,width=2,count=1,dtype='int16',crs='EPSG:4326',transform=from_origin(-84,10,.00225,.00225)) as dst:
                dst.write(array.astype('int16'),1)
    daily={f'{year}01{d:02}':1 for year in [2025,2026] for d in range(1,32)}
    monkeypatch.setattr(recovery,'fetch_power_history',lambda *_:{'features':[{'geometry':{'coordinates':[-84,10]},'properties':{'parameter':{'PRECTOTCORR':daily}}}]})
    monkeypatch.setattr(recovery,'DATA_DIR',out)
    recovery.publish(argparse.Namespace(input=raw,out=out),date(2025,1,1),date(2026,1,31))
    history=json.loads((out/'recovery/history.json').read_text())
    rows=history['datos']['basins'][0]['rows']
    assert rows[0]['ndvi']==.5 and rows[-1]['ndvi']==.7
    assert rows[-1]['change']==.2 and rows[-1]['coverage']==1
    assert rows[1]['ndvi'] is None and rows[1]['rain'] is None
    assert rows[0]['rain']==31
