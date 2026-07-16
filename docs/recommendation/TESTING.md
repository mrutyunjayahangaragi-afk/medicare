# Testing the Recommendation Engine

## Automated Tests

```bash
cd backend
pytest tests/test_recommendation_api.py -v
```

Covers: auth, validation, empty results, hospital result, disclaimer, haversine, ETA formula.

## Manual Verification

### 1. Critical emergency → nearest hospital
Submit request with `severity=critical` and known coordinates.
Verify hospital card appears within 50 km radius.

### 2. No services available
Use coordinates in the ocean (e.g., lat=0.0, lon=0.0).
Verify "No suitable emergency service found." empty state.

### 3. Different locations return different results
Submit two requests from cities 100 km apart.
Verify the hospital recommendations differ.

### 4. ETA sanity check
Hospital 5 km away at 40 km/h → ETA ≈ 8 minutes.

### 5. UI renders on all three pages
- `/dashboard/requests/{id}` — 3-column grid
- `/dashboard/track/{id}` — above map
- `/responder/requests/{id}` — compact hospital-only card

### 6. Skeleton visible during load
Disable network throttling → skeleton flashes briefly.

### 7. Error state + retry
Point to bad backend URL → error banner with Retry button appears.
