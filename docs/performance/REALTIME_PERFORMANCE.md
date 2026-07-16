# Supabase Realtime Performance Review

## Realtime Channels

Medicare leverages Supabase Realtime for instant synchronization on critical operational tables:

1. **`emergency_requests` Channel:**
   - Broadcasts status updates (`pending` → `accepted` → `in_progress` → `completed`) directly to the patient's dashboard.
   - Restricts channel broadcast parameters to match the client's validated session user ID, preventing cross-user request leaks.

2. **`responder_locations` Channel:**
   - Broadcasts real-time coordinate updates of the assigned responder to the patient's map interface.

## Performance & Optimization Guidelines

- **Explicit Channel Naming:** Channels must be isolated per emergency ID (e.g. `emergency:UUID`) to prevent a user from listening to updates for other requests.
- **Payload Minimization:** Restrict broadcasts to coordinate keys and status enums, keeping message payload size under 1 KB to minimize network overhead.
- **Throttling:** Ensure clients emit location updates at a maximum rate of once every 5 seconds to prevent client-side network congestion.
