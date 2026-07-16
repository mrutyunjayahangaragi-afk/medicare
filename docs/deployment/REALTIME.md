# Supabase Realtime Configuration

## Publication Entries

The following tables must be in the `supabase_realtime` publication for Realtime to function.

Applied in migration `20260715150000_configure_realtime_updates.sql`.

| Table | Events |
|---|---|
| `emergency_requests` | INSERT, UPDATE |
| `notifications` | INSERT |
| `request_messages` | INSERT |
| `responder_locations` | INSERT, UPDATE |

Verify in Supabase dashboard: **Database → Replication → supabase_realtime → Source tables**

## Channel Authorization

### User-facing channels

Users subscribe to their own request status changes using Postgres Changes with a row-level filter:

```typescript
supabase
  .channel(`request:${requestId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'emergency_requests',
    filter: `id=eq.${requestId}`,
  }, handler)
  .subscribe()
```

RLS on `emergency_requests` prevents users from receiving changes for requests they do not own.

### Responder location channels

Responder location sharing uses private Broadcast channels. The channel name includes the request ID and is validated against the requester's assigned request. This prevents users from subscribing to arbitrary responder locations.

Do not create public location channels. Location data is personal and must be scoped to an active, authorized emergency request.

## Production Realtime Tests

| Test | Expected |
|---|---|
| SOS submitted → user's dashboard updates status | Status change appears within 2 s |
| Responder accepts → user sees "accepted" status | Realtime UPDATE received |
| Responder sends location → user sees marker on map | Broadcast received on correct channel |
| New notification arrives → badge count increments | INSERT received |
| New message → conversation updates | INSERT received |
| User logs out → all subscriptions removed | No further events received after logout |
| Network disconnect → reconnection works | Subscriptions reestablish within 10 s |

## Cleanup on Logout

Verify that all Realtime subscriptions are removed when the user logs out or the component unmounts:

```typescript
// On unmount / logout:
supabase.removeAllChannels()
```

Unremoved channels cause memory leaks and may receive events after logout.
