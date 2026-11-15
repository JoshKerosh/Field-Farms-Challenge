from shapely.geometry import Point, box

from field_farms_data.transforms import geo


def test_source_kind_from_saga_names():
    assert geo.source_kind('NACIENTE Nº1') == 'naciente'
    assert geo.source_kind('N-3') == 'naciente'
    assert geo.source_kind('POZO 2 ANTIGUO') == 'pozo'
    assert geo.source_kind('P1') == 'pozo'
    assert geo.source_kind('TOMA QUEBRADA HONDA') == 'superficial'
    # "F-1" only says "fuente" (source): it is not assumed to be a spring.
    assert geo.source_kind('F-1') == 'sin clasificar'
    assert geo.source_kind(None) == 'sin clasificar'


def test_crtm05_point_rejects_empty_and_out_of_country():
    assert geo.crtm05_point(1180446, 338680) == (338680, 1180446)
    assert geo.crtm05_point(None, 338680) is None
    assert geo.crtm05_point(0, 0) is None


def test_neighbors_never_share_color():
    squares = [box(0, 0, 1000, 1000), box(1000, 0, 2000, 1000), box(0, 1000, 1000, 2000),
               box(5000, 5000, 6000, 6000)]
    colors = geo.color_neighbors(squares, touch_m=1)
    assert colors[0] != colors[1]
    assert colors[0] != colors[2]


def test_basin_locator_returns_zero_outside():
    locate = geo.basin_locator([({'cuenca_no': 9.0}, box(0, 0, 10, 10))])
    assert locate(Point(5, 5)) == 9
    assert locate(Point(50, 50)) == 0
