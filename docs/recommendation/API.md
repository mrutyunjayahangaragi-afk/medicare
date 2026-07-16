# Recommendation API

## POST /api/v1/recommendations

**Auth:** Bearer token required

### Request
```json
{
  "request_id": "uuid",
  "severity": "critical",
  "latitude": 15.34,
  "longitude": 75.21,
  "emergency_type": "medical"
}
```

### Response (success)
```json
{
  "success": true,
  "message": "Recommendations retrieved successfully.",
  "data": {
    "priority": "critical",
    "request_id": "uuid",
    "hospital": {
      "id": "uuid",
      "name": "City Hospital",
      "distance_km": 2.4,
      "eta_minutes": 4,
      "address": "123 Main St",
      "phone": "+1234567890",
      "organization_type": "hospital",
      "score": 0.85
    },
    "ambulance": { ... },
    "responder": { ... },
    "recommendation_available": true,
    "disclaimer": "..."
  }
}
```

### Response (no services found)
```json
{
  "success": true,
  "message": "No suitable emergency service found nearby.",
  "data": {
    "recommendation_available": false,
    ...
  }
}
```

### Error codes
| Code | Meaning |
|---|---|
| 401 | Authentication required |
| 422 | Validation error (bad coordinates, unknown type/severity) |
