# Emergency Recommendation Engine — Step 18

After a user submits an emergency request, the engine automatically recommends:
- Best Hospital
- Best Ambulance
- Best Responder
- Estimated Arrival Time (ETA)
- Distance

## Architecture

```
EmergencyRequest (lat/lng + type + severity)
      │
      ▼
POST /api/v1/recommendations
      │
      ▼
RecommendationService
  ├── _best_hospital()   → organizations table (verified)
  ├── _best_ambulance()  → profiles (ambulance responders) + responder_locations
  └── _best_responder()  → profiles (available responders) + responder_locations
      │
      ▼
RecommendationResponse
      │
      ▼
RecommendationPanel (frontend)
  ├── HospitalRecommendationCard
  ├── AmbulanceRecommendationCard
  └── ResponderRecommendationCard
```

## UI Locations

| Page | What's shown |
|---|---|
| `/dashboard/requests/[id]` | All three cards (full grid) |
| `/dashboard/track/[id]` | All three cards (above live map) |
| `/responder/requests/[id]` | Hospital only (compact mode) |
