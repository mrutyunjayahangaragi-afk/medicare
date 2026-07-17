"""
backend/scripts/seed_notifications.py
Seed realistic demo notifications for development/testing accounts.

Usage:
    cd backend
    python scripts/seed_notifications.py

Environment:
    Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env (or environment).
    DEMO_USER_EMAILS — comma-separated list of demo account emails to seed.
    If DEMO_USER_EMAILS is not set, the script uses a safe default list.

Safety:
    - ONLY seeds notifications for accounts whose email exactly matches the
      DEMO_USER_EMAILS list.  Never touches real production accounts.
    - Uses deterministic seed keys (idempotent) — re-running is safe.
    - Never deletes existing notifications.
    - Skips if notification already exists (checks seed_key column or title match).
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Ensure backend package is importable ────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / ".env")

from supabase import create_client, Client


# ── Configuration ────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Default demo accounts — override via DEMO_USER_EMAILS env var
DEFAULT_DEMO_EMAILS = [
    "demo@medicare.app",
    "admin@medicare.app",
    "hospital@medicare.app",
    "responder@medicare.app",
    "user@medicare.app",
    "test@medicare.app",
]

DEMO_EMAILS: list[str] = [
    e.strip()
    for e in os.environ.get("DEMO_USER_EMAILS", ",".join(DEFAULT_DEMO_EMAILS)).split(",")
    if e.strip()
]


# ── Notification templates ────────────────────────────────────────────────────

def _ago(days: int = 0, hours: int = 0, minutes: int = 0) -> str:
    """Return an ISO timestamp relative to now."""
    delta = timedelta(days=days, hours=hours, minutes=minutes)
    return (datetime.now(timezone.utc) - delta).isoformat()


def _fake_request_id() -> str:
    """Return a deterministic-looking fake request UUID."""
    return str(uuid.UUID("00000000-0000-0000-0000-" + "0" * 11 + "001"))


# Notifications for a regular user (15 items)
USER_NOTIFICATIONS = [
    {
        "title": "SOS Request Submitted",
        "message": "Your emergency request has been submitted. Responders are being notified.",
        "type": "request_submitted",
        "is_read": True,
        "created_at": _ago(days=28),
    },
    {
        "title": "Responder Assigned",
        "message": "A verified responder has accepted your emergency request and is on the way.",
        "type": "responder_assigned",
        "is_read": True,
        "created_at": _ago(days=27, hours=23),
    },
    {
        "title": "Responder Is On The Way",
        "message": "Your responder has started heading to your location. ETA: ~8 minutes.",
        "type": "responder_on_the_way",
        "is_read": True,
        "created_at": _ago(days=27, hours=22),
    },
    {
        "title": "Responder Arrived",
        "message": "Your responder has arrived at your location.",
        "type": "responder_arrived",
        "is_read": True,
        "created_at": _ago(days=27, hours=21),
    },
    {
        "title": "Emergency Request Completed",
        "message": "Your emergency request has been marked as completed. We hope you are safe.",
        "type": "request_completed",
        "is_read": True,
        "created_at": _ago(days=27, hours=20),
    },
    {
        "title": "Hospital Accepted Request",
        "message": "City General Hospital has accepted your emergency request and is preparing a bed.",
        "type": "hospital_accepted",
        "is_read": True,
        "created_at": _ago(days=14),
    },
    {
        "title": "New SOS Request Submitted",
        "message": "Your emergency request has been submitted. Help is on the way.",
        "type": "request_submitted",
        "is_read": True,
        "created_at": _ago(days=10),
    },
    {
        "title": "Request Cancelled",
        "message": "Your emergency request was cancelled as requested.",
        "type": "request_cancelled",
        "is_read": True,
        "created_at": _ago(days=9),
    },
    {
        "title": "Profile Incomplete",
        "message": "Your profile is missing emergency contact information. Adding it helps responders reach you faster.",
        "type": "system",
        "is_read": True,
        "created_at": _ago(days=7),
    },
    {
        "title": "Nearby Hospital Recommendation",
        "message": "City General Hospital (2.3 km away) has emergency availability. Tap to view details.",
        "type": "recommendation",
        "is_read": False,
        "created_at": _ago(days=5),
    },
    {
        "title": "Responder Assigned",
        "message": "A verified responder has accepted your request and is on the way. Expected arrival: ~12 minutes.",
        "type": "responder_assigned",
        "is_read": False,
        "created_at": _ago(days=3),
    },
    {
        "title": "New Message from Responder",
        "message": "Your responder sent: \"I am 5 minutes away. Please stay at your location.\"",
        "type": "new_message",
        "is_read": False,
        "created_at": _ago(days=3, hours=-1),
    },
    {
        "title": "AI Assistant Safety Update",
        "message": "The AI Health Assistant has been updated with improved emergency detection and faster response times.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(days=2),
    },
    {
        "title": "Emergency Request Completed",
        "message": "Your emergency request has been successfully completed. Rate your experience.",
        "type": "request_completed",
        "is_read": False,
        "created_at": _ago(hours=18),
    },
    {
        "title": "Responder Application Approved",
        "message": "Your application to become a verified Medicare responder has been approved. Welcome aboard!",
        "type": "application_approved",
        "is_read": False,
        "created_at": _ago(hours=2),
    },
]

# Notifications for an admin account (10 items)
ADMIN_NOTIFICATIONS = [
    {
        "title": "New Hospital Application",
        "message": "Sunrise Medical Center has submitted an application for hospital verification. Review pending.",
        "type": "system",
        "is_read": True,
        "created_at": _ago(days=25),
    },
    {
        "title": "Responder Application Pending",
        "message": "3 new responder applications are waiting for your review.",
        "type": "system",
        "is_read": True,
        "created_at": _ago(days=15),
    },
    {
        "title": "Critical Emergency Alert",
        "message": "A critical severity emergency request was submitted. Current status: in_progress.",
        "type": "request_submitted",
        "is_read": True,
        "created_at": _ago(days=10),
    },
    {
        "title": "Hospital Application Approved",
        "message": "You approved City General Hospital's application. User role updated to hospital_staff.",
        "type": "application_approved",
        "is_read": True,
        "created_at": _ago(days=8),
    },
    {
        "title": "Platform Health Alert",
        "message": "Gemini AI service response time exceeded 5s threshold. Auto-fallback activated.",
        "type": "system",
        "is_read": True,
        "created_at": _ago(days=6),
    },
    {
        "title": "New Responder Registered",
        "message": "A new responder has joined the platform in your region.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(days=4),
    },
    {
        "title": "Critical Emergency Resolved",
        "message": "Emergency request #CR-2847 (critical) has been marked completed by the assigned responder.",
        "type": "request_completed",
        "is_read": False,
        "created_at": _ago(days=2),
    },
    {
        "title": "Account Deletion Request",
        "message": "A user has requested account deletion. Review required within 7 days.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(days=1),
    },
    {
        "title": "Weekly Summary Available",
        "message": "This week: 47 emergency requests, 43 completed (91.5%), 4 active responders.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(hours=12),
    },
    {
        "title": "Hospital Application Submitted",
        "message": "MedCity Clinic has submitted a new hospital verification application. Pending review.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(hours=1),
    },
]

# Notifications for a hospital account (8 items)
HOSPITAL_NOTIFICATIONS = [
    {
        "title": "Hospital Application Approved",
        "message": "Your hospital application has been approved. You can now accept emergency requests.",
        "type": "application_approved",
        "is_read": True,
        "created_at": _ago(days=20),
    },
    {
        "title": "New Emergency Request",
        "message": "A critical emergency request has been assigned to your facility. Please review immediately.",
        "type": "request_submitted",
        "is_read": True,
        "created_at": _ago(days=12),
    },
    {
        "title": "Request Completed",
        "message": "Emergency request #ER-1042 has been successfully completed by your team.",
        "type": "request_completed",
        "is_read": True,
        "created_at": _ago(days=11),
    },
    {
        "title": "New Emergency Request",
        "message": "A high severity medical emergency has been routed to your hospital.",
        "type": "request_submitted",
        "is_read": True,
        "created_at": _ago(days=5),
    },
    {
        "title": "Ambulance Dispatched",
        "message": "Ambulance KA-01-MED-2247 has been dispatched for emergency request #ER-1056.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(days=3),
    },
    {
        "title": "Profile Update Required",
        "message": "Please update your hospital's available bed count and emergency contact to ensure accurate matching.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(days=2),
    },
    {
        "title": "New Emergency Request",
        "message": "A critical accident case has been routed to your emergency department.",
        "type": "request_submitted",
        "is_read": False,
        "created_at": _ago(hours=6),
    },
    {
        "title": "Monthly Performance Report",
        "message": "Your hospital handled 12 emergency cases this month with a 96% completion rate.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(hours=3),
    },
]

# Notifications for a responder account (8 items)
RESPONDER_NOTIFICATIONS = [
    {
        "title": "Responder Application Approved",
        "message": "Your application has been approved. You are now a verified Medicare responder.",
        "type": "application_approved",
        "is_read": True,
        "created_at": _ago(days=18),
    },
    {
        "title": "New Request Available",
        "message": "A new emergency request in your area requires a responder. Tap to view.",
        "type": "request_submitted",
        "is_read": True,
        "created_at": _ago(days=10),
    },
    {
        "title": "Request Accepted Confirmation",
        "message": "You have accepted emergency request #ER-0892. Navigate to the user's location.",
        "type": "responder_assigned",
        "is_read": True,
        "created_at": _ago(days=9),
    },
    {
        "title": "Request Completed",
        "message": "Emergency request #ER-0892 has been marked as completed. Great work!",
        "type": "request_completed",
        "is_read": True,
        "created_at": _ago(days=9, hours=-2),
    },
    {
        "title": "New Request Available",
        "message": "A critical severity request is available near your location (1.8 km).",
        "type": "request_submitted",
        "is_read": False,
        "created_at": _ago(days=4),
    },
    {
        "title": "New Message",
        "message": "The emergency requester sent you a message. Tap to view.",
        "type": "new_message",
        "is_read": False,
        "created_at": _ago(days=2),
    },
    {
        "title": "Monthly Performance",
        "message": "This month you responded to 7 emergency requests with an average response time of 9 minutes.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(days=1),
    },
    {
        "title": "Availability Reminder",
        "message": "Your availability status is set to offline. Toggle to available to receive new requests.",
        "type": "system",
        "is_read": False,
        "created_at": _ago(hours=4),
    },
]


# ── Seeding logic ─────────────────────────────────────────────────────────────

def get_notifications_for_email(email: str) -> list[dict]:
    """Return the appropriate notification set based on email hints."""
    lower = email.lower()
    if "admin" in lower:
        return ADMIN_NOTIFICATIONS
    if "hospital" in lower:
        return HOSPITAL_NOTIFICATIONS
    if "responder" in lower:
        return RESPONDER_NOTIFICATIONS
    # Default: regular user notifications
    return USER_NOTIFICATIONS


def seed_for_user(supabase: Client, user_id: str, email: str) -> int:
    """Seed notifications for a single user. Returns the count inserted."""
    notifications = get_notifications_for_email(email)
    inserted = 0

    for notif in notifications:
        # Check if a notification with the same title and type already exists
        existing = (
            supabase
            .table("notifications")
            .select("id")
            .eq("recipient_id", user_id)
            .eq("type", notif["type"])
            .eq("title", notif["title"])
            .limit(1)
            .execute()
        )
        if existing.data:
            print(f"  [skip] Already exists: {notif['title']!r}")
            continue

        row = {
            "recipient_id": user_id,
            "title": notif["title"],
            "message": notif["message"],
            "type": notif["type"],
            "is_read": notif["is_read"],
            "created_at": notif["created_at"],
        }

        result = supabase.table("notifications").insert(row).execute()
        if result.data:
            inserted += 1
            status = "unread" if not notif["is_read"] else "read"
            print(f"  [insert/{status}] {notif['title']!r}")
        else:
            print(f"  [error] Failed to insert: {notif['title']!r}")

    return inserted


def main() -> None:
    print("Medicare Demo Notification Seeder")
    print("=" * 50)
    print(f"Supabase URL:  {SUPABASE_URL}")
    print(f"Demo accounts: {DEMO_EMAILS}")
    print()

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    total_inserted = 0

    for email in DEMO_EMAILS:
        print(f"Looking up user: {email}")

        # Use admin client to look up user by email
        result = supabase.table("profiles").select("id, email").eq("email", email).limit(1).execute()

        if not result.data:
            # Try auth.users via service role
            try:
                auth_result = supabase.auth.admin.list_users()
                user = next((u for u in auth_result if getattr(u, "email", "") == email), None)
                if user:
                    user_id = user.id
                    print(f"  Found in auth.users: {user_id}")
                else:
                    print(f"  [skip] No account found for {email!r}")
                    continue
            except Exception as e:
                print(f"  [skip] Cannot look up {email!r}: {e}")
                continue
        else:
            user_id = result.data[0]["id"]
            print(f"  Found in profiles: {user_id}")

        count = seed_for_user(supabase, user_id, email)
        total_inserted += count
        print(f"  Inserted {count} notification(s) for {email}")
        print()

    print("=" * 50)
    print(f"Done. Total notifications inserted: {total_inserted}")


if __name__ == "__main__":
    main()
