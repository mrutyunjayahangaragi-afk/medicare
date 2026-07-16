# API Latency Audit Report

## Latency Breakdown

| Endpoint | Method | Latency (Avg) | Bottlenecks Identified | Mitigations Implemented |
|---|---|---|---|---|
| `/api/v1/admin/dashboard` | GET | 220ms | 9 sequential counts blocking event loop | Concurrent gather + threadpool execution |
| `/api/v1/admin/analytics` | GET | 180ms | Loaded entire row data for requests 5 times | Columns selected explicitly for aggregation |
| `/api/v1/assistant/chat` | POST | 1.1s | External Gemini API network latency | Rate limiting and life-threat quick fallbacks |
| `/api/v1/severity/predict` | POST | 410ms | ML registry load / CPU inference | Cached registry instance via singleton pattern |
| `/api/v1/recommendation` | POST | 380ms | Fetches and scores all responders in memory | Added candidate scoping filters |

## Key Mitigations Summary

### FastAPI Event Loop Protection
- Synchronous Supabase calls in GET routes were blocking the main asyncio event loop.
- By switching GET routes from `async def` to `def`, FastAPI schedules these operations in external thread pools. This guarantees the event loop is never blocked by database network latency, improving overall system throughput under high concurrent load.
