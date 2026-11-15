"""Discover daily IMERG Late V07 and download bounded DAP4 NetCDF responses.

Only EARTHDATA_TOKEN is used. No credential files or interactive login are created.
"""

import hashlib
import json
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone

CMR = 'https://cmr.earthdata.nasa.gov/search/granules.umm_json'
COLLECTION = 'C2723754859-GES_DISC'
DATA_HOST = 'opendap.earthdata.nasa.gov'
MAX_RESPONSE = 8 * 1024 * 1024


class SourceError(Exception):
    """Safe to log: contains no response bodies, request headers or credentials."""


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward a bearer token to a new origin or follow a login page.
        raise SourceError('earthdata-redirect: verify token and GES DISC authorization')


def request_bytes(url, token=None):
    parsed = urllib.parse.urlsplit(url)
    allowed = {'cmr.earthdata.nasa.gov', DATA_HOST}
    if parsed.scheme != 'https' or parsed.hostname not in allowed or parsed.username or parsed.password:
        raise SourceError('unsupported-source-url')
    headers = {'User-Agent': 'FieldFarms-IMERG/1'}
    if token and parsed.hostname == DATA_HOST:
        headers['Authorization'] = f'Bearer {token}'
    try:
        request = urllib.request.Request(url, headers=headers)
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=45) as response:
            data = response.read(MAX_RESPONSE + 1)
        if len(data) > MAX_RESPONSE:
            raise SourceError('subset-response-too-large')
        return data
    except urllib.error.HTTPError as error:
        raise SourceError(f'http-{error.code}: verify access or provider availability') from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise SourceError('source-network-error') from None


def choose_window(items, as_of):
    """A late publication is allowed; a missing day within the latest week is not."""
    by_date = {}
    for item in items:
        umm = item['umm']
        reference = umm['CollectionReference']
        if reference['ShortName'] != 'GPM_3IMERGDL' or reference['Version'] != '07':
            raise SourceError('unexpected-collection')
        interval = umm['TemporalExtent']['RangeDateTime']
        start = datetime.fromisoformat(interval['BeginningDateTime'].replace('Z', '+00:00'))
        end = datetime.fromisoformat(interval['EndingDateTime'].replace('Z', '+00:00'))
        if start.utcoffset() != timedelta(0) or end.utcoffset() != timedelta(0):
            raise SourceError('expected-utc-granule')
        day = start.date()
        if day >= as_of:
            continue
        if start.time().isoformat() != '00:00:00' or end.date() != day or not 86399 <= (end - start).total_seconds() < 86400:
            raise SourceError('not-a-complete-daily-granule')
        links = [link['URL'] for link in umm.get('RelatedUrls', [])
                 if link.get('Subtype') == 'OPENDAP DATA'
                 and urllib.parse.urlsplit(link['URL']).hostname == DATA_HOST
                 and urllib.parse.urlsplit(link['URL']).scheme == 'https']
        if len(links) != 1:
            raise SourceError('expected-one-cloud-opendap-url')
        meta = item['meta']
        candidate = {'date': day.isoformat(), 'url': links[0], 'granuleId': meta['concept-id'],
                     'revision': meta['revision-id'], 'collectionId': COLLECTION}
        if day in by_date:
            # Competing granules must be reconciled, not silently mixed.
            raise SourceError('duplicate-daily-granules')
        by_date[day] = candidate
    if not by_date:
        raise SourceError('no-recent-daily-granules')
    end = max(by_date)
    days = [end - timedelta(days=i) for i in reversed(range(7))]
    if any(day not in by_date for day in days):
        raise SourceError('incomplete-latest-seven-day-window')
    return [by_date[day] for day in days]


def discover(as_of):
    query = urllib.parse.urlencode({
        'collection_concept_id': COLLECTION, 'page_size': 32, 'sort_key': '-start_date',
        'temporal': f'{as_of - timedelta(days=21)}T00:00:00Z,{as_of}T00:00:00Z'})
    try:
        payload = json.loads(request_bytes(CMR + '?' + query))
        if payload.get('hits', 0) > 32:
            raise SourceError('unexpected-granule-count')
        return choose_window(payload['items'], as_of)
    except (ValueError, KeyError, TypeError):
        raise SourceError('invalid-cmr-metadata') from None


def schema(base_url, token):
    """Use DMR metadata for array order, rather than guessing lon/lat dimensions."""
    try:
        root = ET.fromstring(request_bytes(base_url + '.dmr.xml', token))
        if root.tag.split('}')[-1] != 'Dataset':
            raise SourceError('not-a-dap4-dataset')
        variables = {}
        for node in root:
            name = node.attrib.get('name')
            dims = [child.attrib['name'].split('/')[-1] for child in node
                    if child.tag.split('}')[-1] == 'Dim']
            if name and dims:
                variables[name] = dims
        if variables.get('precipitation') not in (['time', 'lon', 'lat'], ['time', 'lat', 'lon']):
            raise SourceError('unsupported-precipitation-dimensions')
        if variables.get('lon') != ['lon'] or variables.get('lat') != ['lat']:
            raise SourceError('unsupported-coordinate-layout')
        return variables['precipitation']
    except (ET.ParseError, KeyError, TypeError):
        raise SourceError('invalid-dap4-metadata') from None


def subset_url(base_url, expression):
    return base_url + '.dap.nc4?' + urllib.parse.urlencode({'dap4.ce': expression})


def fingerprint(data):
    return hashlib.sha256(data).hexdigest()
