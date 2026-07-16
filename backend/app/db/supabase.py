"""
app/db/supabase.py
Supabase client factory functions.

Two separate clients are provided:

  get_supabase_client()
      Uses the ANON key.  Respects Supabase Row-Level Security (RLS).
      Safe to use for user-scoped operations once a user JWT is attached.

  get_supabase_admin_client()             ← SERVER-ONLY / TRUSTED CODE ONLY
      Uses the SERVICE ROLE key.  Bypasses RLS.
      Must NEVER be returned to the frontend or used for untrusted input.
      Use only for internal backend operations that explicitly require
      elevated access (e.g., user creation, admin dashboards).

Both clients are cached with lru_cache so each process holds a single
connection rather than creating a new one per request.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from supabase import Client, create_client

from app.core.config import get_settings

logger = logging.getLogger("medicare.db")


@lru_cache
def get_supabase_client() -> Client:
    """Return a cached Supabase client (anon key, RLS-respecting)."""
    settings = get_settings()
    logger.debug("Initialising Supabase anon client for %s", settings.supabase_url)
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache
def get_supabase_admin_client() -> Client:
    """Return a cached Supabase admin client (service-role key).

    WARNING — TRUSTED SERVER CODE ONLY.
    This client bypasses Row-Level Security.  Never expose it or its
    responses directly to frontend clients or untrusted callers.
    """
    settings = get_settings()
    logger.debug(
        "Initialising Supabase admin client for %s [service-role]",
        settings.supabase_url,
    )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
