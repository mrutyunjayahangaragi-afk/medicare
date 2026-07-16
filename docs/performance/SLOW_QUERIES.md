# Database Query Optimization Report

## Identified Slow Queries

### 1. Paginated Counts (`SELECT count(*)`)
- **Query:** `supabase.table("profiles").select("*")` followed by `len(result.data)` in Python to get counts.
- **Problem:** O(N) memory and transfer cost. If there are 50,000 users, it downloads all 50,000 profiles just to calculate the length.
- **Solution:** Replaced with `select("id", count="exact")` inside PostgREST, returning only the integer count header.

### 2. Analytics Row Dumping
- **Query:** `supabase.table("emergency_requests").select("*")` repeated multiple times.
- **Problem:** Transferred all emergency data fields (including description texts) over the wire repeatedly.
- **Solution:** Changed queries to only request columns relevant to aggregation (e.g. `.select("emergency_type")`), decreasing the payload size.
