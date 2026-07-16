"""
app/repositories/base.py
Base repository providing shared Supabase client access.

Design notes:
  - All repositories are stateless class-based wrappers.
  - get_client() returns the anon client (respects RLS).
  - get_admin_client() returns the service-role client (bypasses RLS).
  - Use the admin client ONLY for trusted server-initiated operations.
  - Never pass the admin client result to frontend callers.
"""

from __future__ import annotations

import logging

from supabase import Client

from app.db.supabase import get_supabase_admin_client, get_supabase_client

logger = logging.getLogger("medicare.repositories")


class BaseRepository:
    """Stateless base class for Supabase-backed repositories.

    Subclasses call self._client() or self._admin() to get a client.
    The clients are cached by lru_cache in the db module.
    """

    def _client(self) -> Client:
        """Return the anon-key Supabase client (RLS-respecting)."""
        return get_supabase_client()

    def _admin(self) -> Client:
        """Return the service-role Supabase client (bypasses RLS).

        WARNING: Use only for internal server operations.
        Never return responses from this client directly to untrusted callers.
        """
        return get_supabase_admin_client()
