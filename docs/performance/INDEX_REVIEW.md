# Database Index Review

## Existing Indexes

Medicare's database schema utilizes targeted B-Tree and GIN indexes to optimize query routing:

1. **`hospital_profiles` Location & Services:**
   - `hospital_profiles_location_idx` on `(latitude, longitude)` for spatial bounding-box distance lookups.
   - `hospital_profiles_services_idx` using `GIN` on `services` array for service-based capability matching.

2. **`emergency_requests` User History:**
   - `idx_emergency_requests_user_created` on `(user_id, created_at desc)` for fast retrieval of a patient's personal history.

3. **`audit_logs` History:**
   - Index on `created_at desc` for sorting administration audit screens.

## Index Recommendations
- **`responder_locations_spatial_idx`:** Add an index on `(responder_id, latitude, longitude)` to optimize responder retrieval in recommendation runs.
- **`organizations_verified_idx`:** Index on `(organization_type, is_verified)` to accelerate hospital candidate queries.
