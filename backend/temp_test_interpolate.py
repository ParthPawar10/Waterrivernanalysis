import json
from backend.main import interpolate_predict

body = {
    'start': {'latitude': 18.520976, 'longitude': 73.849634},
    'end': {'latitude': 18.5145, 'longitude': 73.8723},
    'points': 10,
    'month': 6,
    'year': 2023,
    'follow_river': True,
    'debug': True
}
res = interpolate_predict(body)
print(json.dumps(res, indent=2, default=str))
