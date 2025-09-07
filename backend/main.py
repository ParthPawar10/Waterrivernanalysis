from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import Dict, Any
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import re


def _round2(v):
    try:
        if v is None:
            return None
        return round(float(v), 2)
    except Exception:
        return v

app = FastAPI(title="Water Quality Predictor API")

# Allow requests from static frontend (Netlify) during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MODEL_PATH = Path(__file__).resolve().parents[1] / "WaterQualityApp" / "src" / "data" / "model_export.json"


class PredictRequest(BaseModel):
    river: str
    location: str
    month: int
    year: int


def load_model_data() -> Dict[str, Any]:
    with open(MODEL_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def get_season_name(month: int) -> str:
    if month in (12, 1, 2):
        return "Winter"
    if month in (3, 4, 5):
        return "Spring"
    if month in (6, 7, 8):
        return "Summer"
    return "Autumn"


class Predictor:
    def __init__(self, model_data: Dict[str, Any]):
        self.model_data = model_data
        self.river_enc = model_data.get("encoders", {}).get("rivers", {})
        self.location_enc = model_data.get("encoders", {}).get("locations", {})
        self.season_enc = model_data.get("encoders", {}).get("seasons", {})
        self.coeffs = model_data.get("simplified_coefficients", {})

    def predict(self, river: str, location: str, month: int, year: int) -> Dict[str, Any]:
        river_encoded = self.river_enc.get(river, 0)
        location_encoded = self.location_enc.get(location, 0)
        season_name = get_season_name(month)
        season_encoded = self.season_enc.get(season_name, 0)

        predictions: Dict[str, Any] = {}

        for param, coef in self.coeffs.items():
            value = coef.get("base", 0)
            # add effects if present (names differ slightly in JSON)
            value += coef.get("river_effect", [0])[river_encoded] if coef.get("river_effect") else 0
            value += coef.get("location_effect", [0])[location_encoded] if coef.get("location_effect") else 0
            value += coef.get("seasonal_effect", [0])[season_encoded] if coef.get("seasonal_effect") else 0
            value += coef.get("month_coefficient", 0) * (month - 6)
            value += coef.get("year_coefficient", 0) * (year - 2020)

            # bounds from the original JS implementation
            if param == "pH":
                value = max(6.0, min(9.0, value))
            elif param == "DO (mg/L)":
                value = max(0, min(15, value))
            elif param == "BOD (mg/L)":
                value = max(0, min(30, value))
            elif "MPN" in param:
                value = max(0, value)

            predictions[param] = round(value, 2)

        # classification
        ph = predictions.get("pH", 0)
        do_level = predictions.get("DO (mg/L)", 0)
        bod = predictions.get("BOD (mg/L)", 0)
        water_quality = "Non Complying"
        if 6.5 <= ph <= 8.5 and do_level >= 5.0 and bod <= 3.0:
            water_quality = "Complying"
        predictions["Water Quality"] = water_quality

        return predictions


_model_data = load_model_data()
predictor = Predictor(_model_data)

# try to load ML models and encoders if available
MODELS_DIR = Path(__file__).resolve().parents[1] / 'backend' / 'models'
ml_models = {}
ml_encoders = None
transforms = {}
if MODELS_DIR.exists():
    try:
        # encoders.joblib expected (dict with 'le_river' and 'le_loc')
        enc_path = MODELS_DIR / 'encoders.joblib'
        if enc_path.exists():
            ml_encoders = joblib.load(str(enc_path))

        # load all joblib models and map to canonical target names
        for p in MODELS_DIR.glob('*.joblib'):
            stem = p.stem.lower()
            try:
                mdl = joblib.load(str(p))
            except Exception:
                continue
            if 'ph' in stem:
                ml_models['pH'] = mdl
            elif 'do' in stem:
                ml_models['DO (mg/L)'] = mdl
            elif 'bod' in stem:
                ml_models['BOD (mg/L)'] = mdl
            elif 'fc' in stem or 'f c' in stem:
                ml_models['FC MPN/100ml'] = mdl
            elif 'tc' in stem:
                ml_models['TC MPN/100ml'] = mdl

        # load transforms.json if exists
        tpath = MODELS_DIR / 'transforms.json'
        if tpath.exists():
            try:
                with open(tpath, 'r') as f:
                    transforms = json.load(f)
            except:
                transforms = {}
    except Exception:
        ml_models = {}
        ml_encoders = None
        transforms = {}


def load_locations_js():
    """Parse `WaterQualityApp/src/data/locations.js` to extract list of locations with river mapping."""
    js_path = Path(__file__).resolve().parents[1] / 'WaterQualityApp' / 'src' / 'data' / 'locations.js'
    locations = []
    try:
        text = js_path.read_text(encoding='utf-8')
        # try to capture name, river, latitude and longitude if available
        # pattern matches name: 'X' ... river: 'Y' ... latitude: 18.5 ... longitude: 73.8
        pattern = re.compile(r"name:\s*'([^']+)'[\s\S]*?river:\s*'([^']+)'[\s\S]*?latitude:\s*([0-9.+-]+)[,\s\n\r]+longitude:\s*([0-9.+-]+)", re.IGNORECASE)
        matches = pattern.findall(text)
        if matches:
            for name, river, lat, lon in matches:
                try:
                    locations.append({'name': name, 'river': river, 'latitude': float(lat), 'longitude': float(lon)})
                except Exception:
                    locations.append({'name': name, 'river': river})
        else:
            # fallback: simple name+river regex
            matches = re.findall(r"name:\s*'([^']+)'[\s\S]*?river:\s*'([^']+)'", text)
            for name, river in matches:
                locations.append({'name': name, 'river': river})
    except Exception:
        pass
    return locations


def load_river_paths_js():
    """Parse riverPaths object from `locations.js` and return dict of name->list of points."""
    js_path = Path(__file__).resolve().parents[1] / 'WaterQualityApp' / 'src' / 'data' / 'locations.js'
    paths = {}
    try:
        text = js_path.read_text(encoding='utf-8')
        # find the riverPaths block
        m = re.search(r"export\s+const\s+riverPaths\s*=\s*\{([\s\S]+?)\}\s*;", text)
        if m:
            inner = m.group(1)
            # find each path name and its array body
            parts = re.findall(r"(\w+)\s*:\s*\[([\s\S]*?)\]\s*,?", inner)
            for name, body in parts:
                coords = re.findall(r"latitude:\s*([0-9.+-]+)\s*,\s*longitude:\s*([0-9.+-]+)", body)
                pts = []
                for lat, lon in coords:
                    try:
                        pts.append({'latitude': float(lat), 'longitude': float(lon)})
                    except Exception:
                        continue
                if pts:
                    paths[name] = pts
    except Exception:
        pass
    return paths


# load river paths once
_river_paths = load_river_paths_js()

_js_locations = load_locations_js()


@app.get("/encoders")
def encoders():
    return {
        "rivers": list(_model_data.get("encoders", {}).get("rivers", {}).keys()),
        "locations": list(_model_data.get("encoders", {}).get("locations", {}).keys()),
        "seasons": list(_model_data.get("encoders", {}).get("seasons", {}).keys()),
    }


@app.post("/predict")
def predict(req: PredictRequest):
    preds = predictor.predict(req.river, req.location, req.month, req.year)
    return {"input": req.dict(), "predictions": preds}


@app.get('/predict_all')
def predict_all(month: int, year: int):
    """Return pH and DO predictions for all known locations for given month/year.
    Tries to use ML models (pH, DO) if present under backend/models/, otherwise falls back to simplified predictor.
    """
    # derive list of locations from model data encoders
    # use JS locations if available (keeps river mapping accurate)
    loc_list = _js_locations if _js_locations else [{'name': n, 'river': None} for n in list(_model_data.get('encoders', {}).get('locations', {}).keys())]

    # Prepare simplified predictions (fall back)
    simplified_map = {}
    for item in loc_list:
        simplified_map[item['name']] = predictor.predict(item.get('river') or '', item['name'], month, year)

    # If ML models & encoders available, predict in batch for available targets
    ml_results = {}
    if ml_encoders and ml_models:
        try:
            le_r = ml_encoders.get('le_river')
            le_l = ml_encoders.get('le_loc')
            rows = []
            names = []
            for item in loc_list:
                names.append(item['name'])
                river = item.get('river') or ''
                # safe transform (unknown categories will raise) -> use try/except
                try:
                    r_enc = int(le_r.transform([river])[0]) if le_r is not None else 0
                except Exception:
                    r_enc = 0
                try:
                    l_enc = int(le_l.transform([item['name']])[0]) if le_l is not None else 0
                except Exception:
                    l_enc = 0
                monthnum = month
                rows.append({
                    'river_enc': r_enc,
                    'loc_enc': l_enc,
                    'month_sin': np.sin(2 * np.pi * monthnum / 12),
                    'month_cos': np.cos(2 * np.pi * monthnum / 12),
                    'year_off': year - 2020
                })
            Xdf = pd.DataFrame(rows)

            # predict per available ML model
            for target, mdl in ml_models.items():
                try:
                    preds = mdl.predict(Xdf)
                except Exception:
                    # try passing column names as during training
                    Xdf_named = Xdf.copy()
                    Xdf_named.columns = ['river_enc', 'loc_enc', 'month_sin', 'month_cos', 'year_off']
                    preds = mdl.predict(Xdf_named)

                # inverse transform if needed
                transform = transforms.get(target)
                if transform == 'log1p':
                    inv = np.expm1(preds)
                    inv = np.clip(inv, 0, None)
                else:
                    inv = preds

                for i, name in enumerate(names):
                    ml_results.setdefault(name, {})
                    ml_results[name][target] = _round2(inv[i])
        except Exception:
            ml_results = {}

    out = []
    for item in loc_list:
        name = item['name']
        simplified = simplified_map.get(name, {})
        mlvals = ml_results.get(name, {})
        pH = _round2(mlvals.get('pH', simplified.get('pH')))
        do = _round2(mlvals.get('DO (mg/L)', simplified.get('DO (mg/L)')))
        bod = _round2(simplified.get('BOD (mg/L)'))
        fc = _round2(simplified.get('FC MPN/100ml'))
        tc = _round2(simplified.get('TC MPN/100ml'))

        # compute Water Quality using pH/DO/BOD
        water_quality = 'Non Complying'
        try:
            if pH is not None and do is not None and bod is not None:
                if 6.5 <= float(pH) <= 8.5 and float(do) >= 5.0 and float(bod) <= 3.0:
                    water_quality = 'Complying'
        except Exception:
            water_quality = simplified.get('Water Quality')

        out.append({
            'location': name,
            'river': item.get('river'),
            'month': month,
            'year': year,
            'pH': pH,
            'DO (mg/L)': do,
            'BOD (mg/L)': bod,
            'FC MPN/100ml': fc,
            'TC MPN/100ml': tc,
            'Water Quality': water_quality
        })

    return {'month': month, 'year': year, 'predictions': out}


def _interpolate_points(start, end, count):
    # linear interpolation including endpoints
    lat1, lon1 = float(start['latitude']), float(start['longitude'])
    lat2, lon2 = float(end['latitude']), float(end['longitude'])
    if count <= 1:
        return [{'latitude': lat1, 'longitude': lon1}]
    pts = []
    for i in range(count):
        t = i / (count - 1)
        lat = lat1 + (lat2 - lat1) * t
        lon = lon1 + (lon2 - lon1) * t
        pts.append({'latitude': lat, 'longitude': lon})
    return pts


def _squared_dist(a, b):
    return (a['latitude'] - b['latitude']) ** 2 + (a['longitude'] - b['longitude']) ** 2


def _project_point_on_segment(a, b, p):
    """Project point p onto segment a->b. Return (proj_point, t, dist2) where t in [0,1] is fraction along segment."""
    ax, ay = a['latitude'], a['longitude']
    bx, by = b['latitude'], b['longitude']
    px, py = p['latitude'], p['longitude']
    dx = bx - ax
    dy = by - ay
    seg2 = dx * dx + dy * dy
    if seg2 == 0:
        t = 0.0
        projx, projy = ax, ay
    else:
        t = ((px - ax) * dx + (py - ay) * dy) / seg2
        if t < 0:
            t = 0.0
        elif t > 1:
            t = 1.0
        projx = ax + t * dx
        projy = ay + t * dy
    dist2 = (px - projx) ** 2 + (py - projy) ** 2
    return ({'latitude': projx, 'longitude': projy}, t, dist2)


def _haversine_m(a, b):
    """Return distance in meters between two points a and b (dicts with latitude, longitude)."""
    import math
    R = 6371000.0
    lat1 = math.radians(a['latitude'])
    lat2 = math.radians(b['latitude'])
    dlat = lat2 - lat1
    dlon = math.radians(b['longitude'] - a['longitude'])
    hav = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return 2 * R * math.asin(min(1, math.sqrt(hav)))


@app.post('/interpolate_predict')
def interpolate_predict(body: Dict[str, Any]):
    """Request body expects:
    {
      "start": {"latitude": <num>, "longitude": <num>},
      "end": {"latitude": <num>, "longitude": <num>},
      "points": <int> ,
      "month": <int>,
      "year": <int>
    }
    Returns predictions for each interpolated point. Uses nearest known location to infer river/location encoding.
    """
    start = body.get('start')
    end = body.get('end')
    point = body.get('point')
    locations = body.get('locations')  # optional array of {latitude, longitude} forming a polyline
    count = int(body.get('points', 5))
    month = int(body.get('month', 6))
    year = int(body.get('year', 2023))

    # require either start+end OR a provided locations polyline for interpolation
    if not ((start and end) or (locations and isinstance(locations, list) and len(locations) >= 2)):
        return {'error': 'start and end coordinates OR a locations array required'}

    follow_river = bool(body.get('follow_river', False))
    blend = str(body.get('blend', 'auto')).lower()  # 'river', 'idw', or 'auto'

    pts = []
    input_poly = None
    # If user provided explicit polyline locations, sample along that polyline directly
    if locations and isinstance(locations, list) and len(locations) >= 2:
        # ensure we have dicts with float lat/lon
        poly = []
        for q in locations:
            try:
                poly.append({'latitude': float(q['latitude']), 'longitude': float(q['longitude'])})
            except Exception:
                continue
        if len(poly) >= 2:
                input_poly = poly
                pick_from_input = bool(body.get('pick_from_input', False))
                # If user wants to pick from the supplied points (e.g. they gave 20 points and want k of them)
                if pick_from_input and count <= len(poly):
                    n = len(poly)
                    ksel = count
                    if ksel <= 1:
                        indices = [0]
                    else:
                        indices = [int(round(i * (n - 1) / (ksel - 1))) for i in range(ksel)]
                    for idx in indices:
                        pnt = {'latitude': poly[idx]['latitude'], 'longitude': poly[idx]['longitude'], 'source_index': idx}
                        pts.append(pnt)
                else:
                    # compute geodesic segment lengths and densify/sample evenly
                    segs = []
                    total = 0.0
                    for a, b in zip(poly[:-1], poly[1:]):
                        dlen = _haversine_m(a, b)
                        segs.append((a, b, dlen))
                        total += dlen
                    if total == 0:
                        pts = [ {'latitude': poly[0]['latitude'], 'longitude': poly[0]['longitude']} ] * count
                    else:
                        for kidx in range(count):
                            t = kidx / (count - 1)
                            target = t * total
                            acc = 0.0
                            chosen = poly[-1]
                            chosen_idx = len(poly) - 1
                            seg_start_idx = 0
                            for si, (a, b, dlen) in enumerate(segs):
                                if acc + dlen >= target:
                                    seg_t = (target - acc) / dlen if dlen > 0 else 0
                                    lat = a['latitude'] + (b['latitude'] - a['latitude']) * seg_t
                                    lon = a['longitude'] + (b['longitude'] - a['longitude']) * seg_t
                                    chosen = {'latitude': lat, 'longitude': lon}
                                    chosen_idx = seg_start_idx if seg_t < 0.5 else seg_start_idx + 1
                                    break
                                acc += dlen
                                seg_start_idx += 1
                            chosen['source_index'] = chosen_idx
                            pts.append(chosen)

    # otherwise continue with other modes (point or start/end river-follow)
    # if follow_river requested and river paths available try to interpolate along nearest river polyline
    if follow_river and _river_paths:
        # use start/end to find nearest path and extract the subpath between nearest indices
        best = None
        best_name = None
        best_dist = float('inf')
        for name, path in _river_paths.items():
            for p in path:
                d = _squared_dist(p, start)
                if d < best_dist:
                    best_dist = d
                    best = path
                    best_name = name

        # if found a path, find nearest indices along the path for start and end, then extract subpath
        if best is not None:
            def _nearest_index(path, point):
                best_i = 0
                best_d = float('inf')
                for i, q in enumerate(path):
                    d = _squared_dist(q, point)
                    if d < best_d:
                        best_d = d
                        best_i = i
                return best_i

            si = _nearest_index(best, start)
            ei = _nearest_index(best, end)
            if si <= ei:
                sub = best[si:ei+1]
            else:
                # if reversed, take the segment in reverse
                sub = list(reversed(best[ei:si+1]))

            # if sub has fewer points than count, densify by linear interpolation along segments
            if len(sub) >= count:
                # pick evenly spaced indices
                L = len(sub)
                for i in range(count):
                    idx = int(round(i * (L - 1) / (count - 1)))
                    pts.append({'latitude': sub[idx]['latitude'], 'longitude': sub[idx]['longitude']})
            else:
                # densify: walk segments and sample 'count' points evenly along total length
                segs = []
                total = 0.0
                for a, b in zip(sub[:-1], sub[1:]):
                    d = ((a['latitude'] - b['latitude'])**2 + (a['longitude'] - b['longitude'])**2) ** 0.5
                    segs.append((a, b, d))
                    total += d
                if total == 0:
                    pts = [{'latitude': sub[0]['latitude'], 'longitude': sub[0]['longitude']}] * count
                else:
                    for k in range(count):
                        t = k / (count - 1)
                        target = t * total
                        acc = 0.0
                        chosen = sub[-1]
                        for a, b, d in segs:
                            if acc + d >= target:
                                seg_t = (target - acc) / d if d > 0 else 0
                                lat = a['latitude'] + (b['latitude'] - a['latitude']) * seg_t
                                lon = a['longitude'] + (b['longitude'] - a['longitude']) * seg_t
                                chosen = {'latitude': lat, 'longitude': lon}
                                break
                            acc += d
                        pts.append(chosen)
    if not pts:
        pts = _interpolate_points(start, end, count)

    # accept optional station names explicitly provided by the frontend
    start_station_name = body.get('start_station_name')
    end_station_name = body.get('end_station_name')

    # find nearest known locations for encoding
    known = _js_locations if _js_locations else []
    # if known locations don't have coords, try to read web locations file
    if known and 'latitude' not in known[0]:
        # try reading web/src/locations.js which often has one-line entries
        web_js = Path(__file__).resolve().parents[1] / 'web' / 'src' / 'locations.js'
        try:
            txt = web_js.read_text(encoding='utf-8')
            p = re.compile(r"name:\s*'([^']+)'[\s\S]*?coordinate:\s*\{\s*latitude:\s*([0-9.+-]+),\s*longitude:\s*([0-9.+-]+)\s*\}")
            matches = p.findall(txt)
            if matches:
                known = []
                for name, lat, lon in matches:
                    known.append({'name': name, 'river': None, 'latitude': float(lat), 'longitude': float(lon)})
        except Exception:
            pass

    # For each point, find the two nearest known locations and compute a distance-weighted
    # prediction combining both neighbors. This uses ML model outputs when available and
    # falls back to the simple predictor otherwise.
    candidates_per_point = []  # list of list of candidate dicts per point
    proj_cums = []  # per-point projection cumulative meters along chosen path (if available)
    for pt in pts:
        cand = []
        if known:
            # Try to choose two known locations that straddle the projection of pt onto a river path
            chosen_pair = None
            # prefer using the input polyline if provided
            search_paths = []
            if input_poly:
                search_paths = [input_poly]
            elif _river_paths:
                search_paths = list(_river_paths.values())
            best_path = None
            best_path_name = None
            best_proj = None
            best_proj_dist = float('inf')

            # helper: project a point onto a given path (returns dict with cum_m and dist_m)
            def project_point_on_path(path, point):
                cum = 0.0
                best_local = None
                # precompute segment lengths
                seg_lens = []
                for a, b in zip(path[:-1], path[1:]):
                    try:
                        sl = _haversine_m(a, b)
                    except Exception:
                        sl = (((a['latitude'] - b['latitude'])**2 + (a['longitude'] - b['longitude'])**2) ** 0.5) * 111000.0
                    seg_lens.append(sl)
                acc = 0.0
                for i, (a, b) in enumerate(zip(path[:-1], path[1:])):
                    seg_len = seg_lens[i]
                    proj_pt, t, dist2 = _project_point_on_segment(a, b, point)
                    # compute distance in meters from point to proj_pt
                    try:
                        dist_m = _haversine_m(point, proj_pt)
                    except Exception:
                        dist_m = (_squared_dist(point, proj_pt) ** 0.5) * 111000.0
                    # cumulative meters to projection
                    cum_m = acc + (t * seg_len)
                    if best_local is None or dist_m < best_local['dist_m']:
                        best_local = {'proj': proj_pt, 'cum_m': cum_m, 'seg_index': i, 't': t, 'dist_m': dist_m}
                    acc += seg_len
                return best_local

            # find best path and projection
            for path in search_paths:
                try:
                    proj = project_point_on_path(path, pt)
                except Exception:
                    proj = None
                if proj and proj['dist_m'] < best_proj_dist:
                    best_proj_dist = proj['dist_m']
                    best_proj = proj
                    best_path = path

                # if we found a nearby path, map known locations onto that path and pick two that straddle
                if best_path and best_proj is not None:
                    # project each known location onto best_path to get cum_m
                    known_on_path = []
                    for kidx, k in enumerate(known):
                        try:
                            kp = project_point_on_path(best_path, {'latitude': k.get('latitude'), 'longitude': k.get('longitude')})
                        except Exception:
                            kp = None
                        if kp is not None:
                            known_on_path.append({'name': k.get('name', ''), 'river': k.get('river', ''), 'cum_m': kp['cum_m'], 'latitude': k.get('latitude'), 'longitude': k.get('longitude'), 'idx': kidx})
                    # sort by cum_m
                    known_on_path.sort(key=lambda x: x['cum_m'])
                    # find two that straddle best_proj.cum_m
                    left = None
                    right = None
                    for entry in known_on_path:
                        if entry['cum_m'] <= best_proj['cum_m']:
                            left = entry
                        elif entry['cum_m'] > best_proj['cum_m'] and right is None:
                            right = entry
                    if left and right:
                        chosen_pair = (left, right)

            if chosen_pair:
                left, right = chosen_pair
                # distances to point
                try:
                    d_left = _haversine_m(pt, {'latitude': left['latitude'], 'longitude': left['longitude']})
                except Exception:
                    d_left = (_squared_dist(pt, {'latitude': left['latitude'], 'longitude': left['longitude']}) ** 0.5) * 111000.0
                try:
                    d_right = _haversine_m(pt, {'latitude': right['latitude'], 'longitude': right['longitude']})
                except Exception:
                    d_right = (_squared_dist(pt, {'latitude': right['latitude'], 'longitude': right['longitude']}) ** 0.5) * 111000.0
                # include cum_m values so we can compute river-linear t later
                cand.append({'name': left['name'], 'river': left.get('river', ''), 'dist_m': max(1e-6, float(d_left)), 'idx': left['idx'], 'latitude': left.get('latitude'), 'longitude': left.get('longitude'), 'cum_m': left.get('cum_m')})
                cand.append({'name': right['name'], 'river': right.get('river', ''), 'dist_m': max(1e-6, float(d_right)), 'idx': right['idx'], 'latitude': right.get('latitude'), 'longitude': right.get('longitude'), 'cum_m': right.get('cum_m')})
                # record projection cumulative meters for this sample point
                proj_cums.append(best_proj['cum_m'] if best_proj is not None else None)
            else:
                # fallback: compute haversine distances to known points and take two nearest
                dists = []
                for kidx, k in enumerate(known):
                    try:
                        d = _haversine_m(pt, k)
                    except Exception:
                        # fallback to squared dist in degrees if haversine fails
                        d = (_squared_dist(pt, k) ** 0.5) * 111000.0
                    dists.append((d, kidx, k))
                dists.sort(key=lambda x: x[0])
                take = dists[:2]
                for d, kidx, k in take:
                    cand.append({'name': k.get('name', ''), 'river': k.get('river', ''), 'dist_m': max(1e-6, float(d)), 'idx': kidx, 'latitude': k.get('latitude'), 'longitude': k.get('longitude')})
                proj_cums.append(None)
        # if no known points, leave candidate empty (will be handled later)
        candidates_per_point.append(cand)

    # ensure proj_cums length matches pts
    if len(proj_cums) < len(pts):
        # fill remaining with None
        proj_cums.extend([None] * (len(pts) - len(proj_cums)))

    # Quick two-end linear interpolation fallback:
    # If we have known locations and at least two sample points, find nearest known station
    # to the first and last sample. If they are distinct, compute predictor outputs for both
    # and linearly interpolate numeric parameters across the sampled points by geodesic fraction.
    two_end_linear = False
    two_left_pred = None
    two_right_pred = None
    two_left_name = None
    two_right_name = None
    two_left_coord = None
    two_right_coord = None
    if known and len(pts) >= 2:
        # find nearest known to first and last
        def _nearest_known(pt):
            best_d = float('inf')
            best_k = None
            for k in known:
                try:
                    d = _haversine_m(pt, k)
                except Exception:
                    d = (_squared_dist(pt, k) ** 0.5) * 111000.0
                if d < best_d:
                    best_d = d
                    best_k = k
            return best_k, best_d

        left_k, left_d = _nearest_known(pts[0])
        right_k, right_d = _nearest_known(pts[-1])
        if left_k and right_k and left_k.get('name') != right_k.get('name'):
            try:
                two_left_pred = predictor.predict(left_k.get('river') or '', left_k.get('name') or '', month, year)
                two_right_pred = predictor.predict(right_k.get('river') or '', right_k.get('name') or '', month, year)
                two_left_name = left_k.get('name')
                two_right_name = right_k.get('name')
                two_left_coord = {'latitude': left_k.get('latitude'), 'longitude': left_k.get('longitude')}
                two_right_coord = {'latitude': right_k.get('latitude'), 'longitude': right_k.get('longitude')}
                two_end_linear = True
            except Exception:
                two_end_linear = False

    # If frontend provided explicit station names, override nearest-known selection
    if start_station_name and end_station_name and start_station_name != end_station_name:
        # find matching known entries by name
        def find_by_name(n):
            for k in known:
                if k.get('name') == n:
                    return k
            return None
        ks = find_by_name(start_station_name)
        ke = find_by_name(end_station_name)
        if ks and ke:
            try:
                two_left_pred = predictor.predict(ks.get('river') or '', ks.get('name') or '', month, year)
                two_right_pred = predictor.predict(ke.get('river') or '', ke.get('name') or '', month, year)
                two_left_name = ks.get('name')
                two_right_name = ke.get('name')
                two_left_coord = {'latitude': ks.get('latitude'), 'longitude': ks.get('longitude')}
                two_right_coord = {'latitude': ke.get('latitude'), 'longitude': ke.get('longitude')}
                two_end_linear = True
            except Exception:
                pass

    # If explicit station-name override supplied and we have both endpoint predictions,
    # perform a deterministic distance-based blend and return results immediately.
    if start_station_name and end_station_name:
        # ensure we have endpoint predictions; if not found in known list, fallback to predictor by name
        if two_left_pred is None:
            try:
                two_left_pred = predictor.predict('', start_station_name, month, year)
                two_left_name = start_station_name
                two_left_coord = start or (known[0] if known else None)
            except Exception:
                two_left_pred = None
        if two_right_pred is None:
            try:
                two_right_pred = predictor.predict('', end_station_name, month, year)
                two_right_name = end_station_name
                two_right_coord = end or (known[-1] if known else None)
            except Exception:
                two_right_pred = None
        # proceed only if we have both endpoint predictions
        if not (two_left_pred is not None and two_right_pred is not None):
            # fall through to regular logic
            pass
        else:
            # compute cumulative distances along pts
            cum = [0.0]
            for a, b in zip(pts[:-1], pts[1:]):
                try:
                    d = _haversine_m(a, b)
                except Exception:
                    d = ((_squared_dist(a, b) ** 0.5) * 111000.0)
                cum.append(cum[-1] + d)
            total = cum[-1] if len(cum) > 0 else 0.0
            out_res = []
            # Use simple index-based fraction for deterministic medians: t = i / (n-1)
            npts = len(pts)
            for i, pt in enumerate(pts):
                t = float(i) / float(npts - 1) if npts > 1 else 0.0
                try:
                    pH = (1.0 - t) * float(two_left_pred.get('pH', 0)) + t * float(two_right_pred.get('pH', 0))
                    pH = round(pH, 4)
                except Exception:
                    pH = (two_left_pred.get('pH'))
                try:
                    do = (1.0 - t) * float(two_left_pred.get('DO (mg/L)', 0)) + t * float(two_right_pred.get('DO (mg/L)', 0))
                    do = round(do, 4)
                except Exception:
                    do = (two_left_pred.get('DO (mg/L)'))
                try:
                    bod = (1.0 - t) * float(two_left_pred.get('BOD (mg/L)', 0)) + t * float(two_right_pred.get('BOD (mg/L)', 0))
                    bod = round(bod, 4)
                except Exception:
                    bod = (two_left_pred.get('BOD (mg/L)'))
                nearest_name = two_left_name if t <= 0.5 else two_right_name
                # compute water quality
                wq = 'Non Complying'
                try:
                    if pH is not None and do is not None and bod is not None:
                        if 6.5 <= float(pH) <= 8.5 and float(do) >= 5.0 and float(bod) <= 3.0:
                            wq = 'Complying'
                except Exception:
                    pass
                out_res.append({'latitude': pt['latitude'], 'longitude': pt['longitude'], 'nearest_location': nearest_name, 'nearest_river': '', 'pH': pH, 'DO (mg/L)': do, 'BOD (mg/L)': bod, 'FC MPN/100ml': None, 'TC MPN/100ml': None, 'Water Quality': wq})

            # include debug info showing t fractions
            for i, pt in enumerate(pts):
                try:
                    debug_info.append({'point_index': i, 'type': 'explicit_two_end_blend', 't_frac': (float(cum[i] / total) if total and total > 0 else float(i) / (len(pts) - 1)), 'left_name': two_left_name, 'right_name': two_right_name})
                except Exception:
                    pass

            return {'month': month, 'year': year, 'points': count, 'predictions': out_res, 'debug': debug_info}

    # precompute cumulative distances along pts for fraction calculation
    cum_dists = None
    total_len = None
    if two_end_linear:
        cum_dists = [0.0]
        for a, b in zip(pts[:-1], pts[1:]):
            try:
                d = _haversine_m(a, b)
            except Exception:
                d = ((_squared_dist(a, b) ** 0.5) * 111000.0)
            cum_dists.append(cum_dists[-1] + d)
        total_len = cum_dists[-1] if cum_dists else 0.0

    # Prepare ML prediction rows for every (point, candidate) pair if ML models exist
    pair_rows = []  # rows for model predict
    pair_map = []
    for pi, cand_list in enumerate(candidates_per_point):
        if not cand_list:
            # placeholder single row using neutral encoders (will be ignored if no known)
            pair_rows.append({'river_enc': 0, 'loc_enc': 0, 'month_sin': np.sin(2 * np.pi * month / 12), 'month_cos': np.cos(2 * np.pi * month / 12), 'year_off': year - 2020})
            pair_map.append((pi, None))
        else:
            for c in cand_list:
                # compute encoder values if available
                r_enc = 0
                l_enc = 0
                try:
                    if ml_encoders and ml_encoders.get('le_river') and c.get('river'):
                        r_enc = int(ml_encoders.get('le_river').transform([c.get('river')])[0])
                except Exception:
                    r_enc = 0
                try:
                    if ml_encoders and ml_encoders.get('le_loc') and c.get('name'):
                        l_enc = int(ml_encoders.get('le_loc').transform([c.get('name')])[0])
                except Exception:
                    l_enc = 0
                pair_rows.append({'river_enc': r_enc, 'loc_enc': l_enc, 'month_sin': np.sin(2 * np.pi * month / 12), 'month_cos': np.cos(2 * np.pi * month / 12), 'year_off': year - 2020})
                pair_map.append((pi, c))

    Xdf_pairs = pd.DataFrame(pair_rows)

    # ml_preds_per_pair: list of dicts mapping target->value for each pair row
    ml_preds_per_pair = [dict() for _ in range(len(pair_rows))]
    if ml_models and len(pair_rows) > 0:
        for target, mdl in ml_models.items():
            try:
                preds_all = mdl.predict(Xdf_pairs)
            except Exception:
                Xdf_named = Xdf_pairs.copy()
                Xdf_named.columns = ['river_enc', 'loc_enc', 'month_sin', 'month_cos', 'year_off']
                preds_all = mdl.predict(Xdf_named)
            transform = transforms.get(target)
            if transform == 'log1p':
                inv_all = np.expm1(preds_all)
                inv_all = np.clip(inv_all, 0, None)
            else:
                inv_all = preds_all
            for ri, val in enumerate(inv_all):
                ml_preds_per_pair[ri][target] = _round2(val)

    # Now combine per-point predictions by distance-weighted averaging over candidates
    results = []
    debug_info = []
    def _r4(x):
        try:
            if x is None:
                return None
            return round(float(x), 4)
        except Exception:
            return x
    for pi, pt in enumerate(pts):
        cand_list = candidates_per_point[pi]
        # Always interpolate between two closest known points if possible
        if len(cand_list) >= 2 and cand_list[0].get('latitude') is not None and cand_list[1].get('latitude') is not None:
            left = cand_list[0]
            right = cand_list[1]
            # Compute fraction t along segment between left and right
            a = {'latitude': left['latitude'], 'longitude': left['longitude']}
            b = {'latitude': right['latitude'], 'longitude': right['longitude']}
            try:
                _, t_frac, _ = _project_point_on_segment(a, b, pt)
                t_frac = max(0.0, min(1.0, float(t_frac)))
            except Exception:
                t_frac = 0.0

            # Get endpoint predictions
            left_pred = predictor.predict(left.get('river'), left.get('name'), month, year)
            right_pred = predictor.predict(right.get('river'), right.get('name'), month, year)

            def interp(key):
                try:
                    lv = float(left_pred.get(key, 0))
                    rv = float(right_pred.get(key, 0))
                    return round((1.0 - t_frac) * lv + t_frac * rv, 4)
                except Exception:
                    return left_pred.get(key)

            pH = interp('pH')
            do = interp('DO (mg/L)')
            bod = interp('BOD (mg/L)')
            fc = interp('FC MPN/100ml')
            tc = interp('TC MPN/100ml')

            nearest_name = left.get('name', '') if t_frac <= 0.5 else right.get('name', '')
            nearest_river = left.get('river', '') if t_frac <= 0.5 else right.get('river', '')

            water_quality = 'Non Complying'
            try:
                if pH is not None and do is not None and bod is not None:
                    if 6.5 <= float(pH) <= 8.5 and float(do) >= 5.0 and float(bod) <= 3.0:
                        water_quality = 'Complying'
            except Exception:
                pass

            debug_info.append({'point_index': pi, 'point': pt, 't_frac': t_frac, 'left_name': left.get('name'), 'right_name': right.get('name')})
            results.append({'latitude': pt['latitude'], 'longitude': pt['longitude'], 'nearest_location': nearest_name, 'nearest_river': nearest_river, 'pH': pH, 'DO (mg/L)': do, 'BOD (mg/L)': bod, 'FC MPN/100ml': fc, 'TC MPN/100ml': tc, 'Water Quality': water_quality, 't_frac': t_frac})
        else:
            # Fallback: use nearest known location
            nearest = cand_list[0] if cand_list else None
            if nearest:
                pred = predictor.predict(nearest.get('river', ''), nearest.get('name', ''), month, year)
                pH = pred.get('pH')
                do = pred.get('DO (mg/L)')
                bod = pred.get('BOD (mg/L)')
                fc = pred.get('FC MPN/100ml')
                tc = pred.get('TC MPN/100ml')
                nearest_name = nearest.get('name', '')
                nearest_river = nearest.get('river', '')
            else:
                pH = do = bod = fc = tc = None
                nearest_name = ''
                nearest_river = ''
            water_quality = 'Non Complying'
            try:
                if pH is not None and do is not None and bod is not None:
                    if 6.5 <= float(pH) <= 8.5 and float(do) >= 5.0 and float(bod) <= 3.0:
                        water_quality = 'Complying'
            except Exception:
                pass
            debug_info.append({'point_index': pi, 'point': pt, 'nearest_name': nearest_name})
            results.append({'latitude': pt['latitude'], 'longitude': pt['longitude'], 'nearest_location': nearest_name, 'nearest_river': nearest_river, 'pH': pH, 'DO (mg/L)': do, 'BOD (mg/L)': bod, 'FC MPN/100ml': fc, 'TC MPN/100ml': tc, 'Water Quality': water_quality})

    # if debug requested, include debug info. Also include debug when explicit station-name override supplied (helpful for testing)
    if bool(body.get('debug', False)) or (start_station_name and end_station_name):
        return {'month': month, 'year': year, 'points': count, 'predictions': results, 'debug': debug_info}
    return {'month': month, 'year': year, 'points': count, 'predictions': results}
