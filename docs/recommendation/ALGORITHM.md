# Recommendation Algorithm

## Weighted Scoring

Each candidate (hospital, ambulance, responder) is scored using:

```
score = 0.40 × distance_score
      + 0.30 × availability_score
      + 0.20 × severity_type_match_score
      + 0.10 × capacity_score
```

### Distance score
`1.0 - (distance_km / 50.0)` — linear decay to 0 at 50 km radius.

### Availability score
`available=1.0, busy=0.5, offline=0.0`

### Severity/type match score
Emergency type is mapped to preferred organization types.
Exact match = 1.0, secondary match = 0.8, fallback = 0.5.

### Capacity score
Currently 1.0 for all (no real-time capacity data).

## Distance Formula — Haversine
```python
R = 6371 km
dlat = radians(lat2 - lat1)
dlon = radians(lon2 - lon1)
a = sin(dlat/2)² + cos(lat1) × cos(lat2) × sin(dlon/2)²
distance = R × 2 × arcsin(√a)
```

## ETA (prototype)
| Service | Speed |
|---|---|
| Ambulance | 40 km/h |
| Responder | 35 km/h |
| Walking fallback | 5 km/h |

`eta_minutes = round((distance_km / speed_kmh) × 60)`
Minimum: 1 minute.
