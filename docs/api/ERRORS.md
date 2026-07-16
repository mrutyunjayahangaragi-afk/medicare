# Error Handling

## Standard Error Envelope

All error responses use the same envelope as success responses:

```json
{
  "success": false,
  "message": "A human-readable error description.",
  "data": null
}
```

Validation errors include field-level detail in `data`:

```json
{
  "success": false,
  "message": "Request validation failed.",
  "data": [
    { "field": "body → latitude", "message": "Input should be less than or equal to 90" }
  ]
}
```

## HTTP Status Codes

| Code | Meaning | Example |
|---|---|---|
| 200 | Success (read/update) | Profile retrieved |
| 201 | Created | Emergency request created |
| 204 | Deleted (no body) | Contact deleted |
| 400 | Invalid business operation | Cancelling a completed request |
| 401 | Authentication required | Missing or invalid Bearer token |
| 403 | Forbidden | Normal user accessing responder endpoint |
| 404 | Not found | Request not found or not yours |
| 409 | Conflict | Duplicate phone number |
| 422 | Validation error | Missing required field |
| 500 | Unexpected server error | Unhandled exception |

## What is Never Exposed

- Raw PostgreSQL error messages
- Stack traces
- Internal table names
- SQL statements
- Supabase keys
- Private storage paths
- Service-role information

## 404 vs 403

The API intentionally returns **404** (not 403) when a resource exists but belongs to another user. This prevents user enumeration attacks — callers cannot determine whether a resource exists by observing the status code.
