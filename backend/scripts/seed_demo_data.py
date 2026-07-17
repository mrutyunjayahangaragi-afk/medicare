"""
backend/scripts/seed_demo_data.py
Idempotent demo-data seed for the Medicare development environment.

Usage:
    cd backend
    python scripts/seed_demo_data.py

Requirements:
    pip install supabase python-dotenv
    SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in backend/.env

Security:
    - Uses the service-role key ONLY inside this script (never in the app).
    - Passwords are hashed by Supabase Auth — never stored in plain text.
    - Idempotent: safe to run multiple times; existing rows are skipped.
    - This script must NEVER be deployed or run in production.
"""

from __future__ import annotations

import os
import sys
import uuid
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Load .env from backend/ ────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
except ImportError:
    sys.exit("ERROR: python-dotenv not installed. Run: pip install python-dotenv")

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    sys.exit(
        "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env"
    )

try:
    from supabase import create_client, Client
except ImportError:
    sys.exit("ERROR: supabase not installed. Run: pip install supabase")

supabase: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

# ── Colour helpers ─────────────────────────────────────────────────────────
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"

def ok(msg: str) -> None:
    print(f"  {GREEN}✓{RESET} {msg}")

def skip(msg: str) -> None:
    print(f"  {YELLOW}→{RESET} {msg} (already exists, skipping)")

def err(msg: str) -> None:
    print(f"  {RED}✗{RESET} {msg}")

def section(title: str) -> None:
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print(f"{'─'*55}")

# ── UTC helper ─────────────────────────────────────────────────────────────
def ago(days: int = 0, hours: int = 0, minutes: int = 0) -> str:
    dt = datetime.now(timezone.utc) - timedelta(days=days, hours=hours, minutes=minutes)
    return dt.isoformat()


# ══════════════════════════════════════════════════════════════════════════
# DEMO USER DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════

DEMO_USERS = [
    {
        "email": "admin@medicare.demo",
        "password": "Admin@123",
        "role": "admin",
        "full_name": "Arjun Sharma",
        "phone": "+91 98100 11111",
        "gender": "male",
        "blood_group": "O+",
        "date_of_birth": "1985-03-15",
        "address": "12 Connaught Place, New Delhi, Delhi 110001",
        "is_verified": True,
        "availability_status": "offline",
    },
    {
        "email": "hospital1@medicare.demo",
        "password": "Hospital@123",
        "role": "hospital_staff",
        "full_name": "Dr. Priya Menon",
        "phone": "+91 98200 22222",
        "gender": "female",
        "blood_group": "A+",
        "date_of_birth": "1980-07-22",
        "address": "City Care Hospital, MG Road, Bengaluru, Karnataka 560001",
        "is_verified": True,
        "availability_status": "offline",
        "hospital_name": "City Care Hospital",
    },
    {
        "email": "hospital2@medicare.demo",
        "password": "Hospital@123",
        "role": "hospital_staff",
        "full_name": "Dr. Rakesh Gupta",
        "phone": "+91 98300 33333",
        "gender": "male",
        "blood_group": "B+",
        "date_of_birth": "1978-11-05",
        "address": "Apollo Medical Center, Jubilee Hills, Hyderabad, Telangana 500033",
        "is_verified": True,
        "availability_status": "offline",
        "hospital_name": "Apollo Medical Center",
    },
    {
        "email": "responder1@medicare.demo",
        "password": "Responder@123",
        "role": "responder",
        "full_name": "Suresh Kumar",
        "phone": "+91 98400 44444",
        "gender": "male",
        "blood_group": "AB+",
        "date_of_birth": "1990-02-18",
        "address": "Rapid Ambulance Services, Andheri West, Mumbai, Maharashtra 400058",
        "is_verified": True,
        "availability_status": "available",
        "responder_type": "ambulance",
    },
    {
        "email": "responder2@medicare.demo",
        "password": "Responder@123",
        "role": "responder",
        "full_name": "Kavitha Reddy",
        "phone": "+91 98500 55555",
        "gender": "female",
        "blood_group": "O-",
        "date_of_birth": "1992-09-30",
        "address": "Life Support EMS, Anna Nagar, Chennai, Tamil Nadu 600040",
        "is_verified": True,
        "availability_status": "available",
        "responder_type": "paramedic",
    },
    {
        "email": "user1@medicare.demo",
        "password": "User@123",
        "role": "user",
        "full_name": "Rahul Verma",
        "phone": "+91 98600 66666",
        "gender": "male",
        "blood_group": "B-",
        "date_of_birth": "1995-06-12",
        "address": "45 Sector 18, Noida, Uttar Pradesh 201301",
        "is_verified": True,
        "availability_status": "offline",
    },
    {
        "email": "user2@medicare.demo",
        "password": "User@123",
        "role": "user",
        "full_name": "Anjali Singh",
        "phone": "+91 98700 77777",
        "gender": "female",
        "blood_group": "A-",
        "date_of_birth": "1998-12-25",
        "address": "78 Park Street, Kolkata, West Bengal 700016",
        "is_verified": True,
        "availability_status": "offline",
    },
]


# ══════════════════════════════════════════════════════════════════════════
# STEP 1 — CREATE / FETCH AUTH USERS
# ══════════════════════════════════════════════════════════════════════════

def seed_users() -> dict[str, str]:
    """Create demo auth users and return {email: user_id} map."""
    section("STEP 1 — Auth Users")
    uid_map: dict[str, str] = {}

    for u in DEMO_USERS:
        email = u["email"]
        # Check if user already exists via admin API
        existing = supabase.auth.admin.list_users()
        existing_emails = {usr.email: usr.id for usr in existing}

        if email in existing_emails:
            uid_map[email] = existing_emails[email]
            skip(f"{email}")
            continue

        try:
            res = supabase.auth.admin.create_user(
                {
                    "email": email,
                    "password": u["password"],
                    "email_confirm": True,
                    "user_metadata": {
                        "full_name": u["full_name"],
                    },
                }
            )
            uid_map[email] = res.user.id
            ok(f"Created {email}  ({u['role']})")
        except Exception as exc:
            err(f"Failed to create {email}: {exc}")

    return uid_map


# ══════════════════════════════════════════════════════════════════════════
# STEP 2 — PROFILES
# ══════════════════════════════════════════════════════════════════════════

def seed_profiles(uid_map: dict[str, str]) -> None:
    section("STEP 2 — Profiles")

    for u in DEMO_USERS:
        uid = uid_map.get(u["email"])
        if not uid:
            err(f"No UID for {u['email']}, skipping profile")
            continue

        existing = supabase.table("profiles").select("id").eq("id", uid).execute()
        row: dict = {
            "id": uid,
            "full_name": u["full_name"],
            "email": u["email"],
            "phone": u["phone"],
            "gender": u["gender"],
            "blood_group": u["blood_group"],
            "date_of_birth": u["date_of_birth"],
            "address": u["address"],
            "role": u["role"],
            "is_verified": u["is_verified"],
            "availability_status": u.get("availability_status", "offline"),
        }
        if "responder_type" in u:
            row["responder_type"] = u["responder_type"]
        if "hospital_name" in u:
            row["hospital_name"] = u["hospital_name"]

        if existing.data:
            supabase.table("profiles").update(row).eq("id", uid).execute()
            skip(f"{u['email']} profile (updated role/fields)")
        else:
            supabase.table("profiles").insert(row).execute()
            ok(f"Profile: {u['full_name']} ({u['role']})")


# ══════════════════════════════════════════════════════════════════════════
# STEP 3 — ORGANIZATIONS
# ══════════════════════════════════════════════════════════════════════════

DEMO_ORGS = [
    {
        "name": "City Care Hospital",
        "organization_type": "hospital",
        "phone": "+91 80 4567 8901",
        "email": "contact@citycare.demo",
        "address": "12 MG Road, Bengaluru, Karnataka 560001",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "is_verified": True,
    },
    {
        "name": "Apollo Medical Center",
        "organization_type": "hospital",
        "phone": "+91 40 2345 6789",
        "email": "info@apollodemo.demo",
        "address": "Jubilee Hills, Hyderabad, Telangana 500033",
        "latitude": 17.4326,
        "longitude": 78.4071,
        "is_verified": True,
    },
    {
        "name": "Rapid Ambulance",
        "organization_type": "ambulance_service",
        "phone": "+91 22 5678 9012",
        "email": "dispatch@rapidamb.demo",
        "address": "Andheri West, Mumbai, Maharashtra 400058",
        "latitude": 19.1197,
        "longitude": 72.8468,
        "is_verified": True,
    },
    {
        "name": "Life Support EMS",
        "organization_type": "ambulance_service",
        "phone": "+91 44 6789 0123",
        "email": "ops@lifesupport.demo",
        "address": "Anna Nagar, Chennai, Tamil Nadu 600040",
        "latitude": 13.0843,
        "longitude": 80.2101,
        "is_verified": True,
    },
]


def seed_organizations() -> dict[str, str]:
    """Insert demo organizations; return {name: org_id} map."""
    section("STEP 3 — Organizations")
    org_map: dict[str, str] = {}

    for org in DEMO_ORGS:
        existing = (
            supabase.table("organizations").select("id").eq("name", org["name"]).execute()
        )
        if existing.data:
            org_map[org["name"]] = existing.data[0]["id"]
            skip(org["name"])
            continue
        res = supabase.table("organizations").insert(org).execute()
        org_map[org["name"]] = res.data[0]["id"]
        ok(f"Org: {org['name']}")

    return org_map


def seed_org_members(uid_map: dict[str, str], org_map: dict[str, str]) -> None:
    section("STEP 3b — Organization Members")
    memberships = [
        ("hospital1@medicare.demo", "City Care Hospital",   "owner",     "approved"),
        ("hospital2@medicare.demo", "Apollo Medical Center","owner",     "approved"),
        ("responder1@medicare.demo","Rapid Ambulance",      "responder", "approved"),
        ("responder2@medicare.demo","Life Support EMS",     "responder", "approved"),
    ]
    for email, org_name, member_role, status in memberships:
        uid = uid_map.get(email)
        oid = org_map.get(org_name)
        if not uid or not oid:
            continue
        existing = (
            supabase.table("organization_members")
            .select("id")
            .eq("user_id", uid)
            .eq("organization_id", oid)
            .execute()
        )
        if existing.data:
            skip(f"{email} → {org_name}")
            continue
        supabase.table("organization_members").insert(
            {"user_id": uid, "organization_id": oid,
             "member_role": member_role, "status": status}
        ).execute()
        ok(f"Member: {email} → {org_name}")


# ══════════════════════════════════════════════════════════════════════════
# STEP 4 — HOSPITAL PROFILES
# ══════════════════════════════════════════════════════════════════════════

HOSPITAL_DATA = [
    {
        "email_key": "hospital1@medicare.demo",
        "hospital_name": "City Care Hospital",
        "license_number": "KA-HOS-2015-0042",
        "registration_number": "KA-REG-2015-0042",
        "phone_number": "+91 80 4567 8901",
        "address": "12 MG Road, Bengaluru, Karnataka 560001",
        "latitude": 12.9716, "longitude": 77.5946,
        "total_beds": 250, "total_icu_beds": 30, "total_emergency_beds": 20,
        "specialties": ["Cardiology","Neurology","Orthopaedics","General Surgery"],
        "services": ["Emergency","ICU","Surgery","Radiology","Pharmacy","Blood Bank"],
        "has_emergency": True, "has_ambulance": True, "has_icu": True, "has_surgery": True,
        "is_verified": True, "is_24_7": True,
    },
    {
        "email_key": "hospital2@medicare.demo",
        "hospital_name": "Apollo Medical Center",
        "license_number": "TS-HOS-2012-0088",
        "registration_number": "TS-REG-2012-0088",
        "phone_number": "+91 40 2345 6789",
        "address": "Plot 22, Jubilee Hills, Hyderabad, Telangana 500033",
        "latitude": 17.4326, "longitude": 78.4071,
        "total_beds": 400, "total_icu_beds": 50, "total_emergency_beds": 35,
        "specialties": ["Oncology","Transplant","Cardiology","Nephrology"],
        "services": ["Emergency","ICU","Dialysis","Surgery","Oncology","Blood Bank"],
        "has_emergency": True, "has_ambulance": True, "has_icu": True, "has_surgery": True,
        "is_verified": True, "is_24_7": True,
    },
]


def seed_hospital_profiles(uid_map: dict[str, str]) -> dict[str, str]:
    """Returns {email_key: hospital_profile_id}."""
    section("STEP 4 — Hospital Profiles")
    hp_map: dict[str, str] = {}

    for h in HOSPITAL_DATA:
        uid = uid_map.get(h["email_key"])
        if not uid:
            err(f"No user found for {h['email_key']}, skipping hospital profile")
            continue

        existing = (
            supabase.table("hospital_profiles")
            .select("id")
            .eq("user_id", uid)
            .execute()
        )
        if existing.data:
            hp_map[h["email_key"]] = existing.data[0]["id"]
            skip(h["hospital_name"])
            continue

        row = {k: v for k, v in h.items() if k != "email_key"}
        row["user_id"] = uid
        res = supabase.table("hospital_profiles").insert(row).execute()
        hp_map[h["email_key"]] = res.data[0]["id"]
        ok(f"Hospital: {h['hospital_name']}")

    return hp_map



# ══════════════════════════════════════════════════════════════════════════
# STEP 5 — HOSPITAL STAFF, BEDS, AMBULANCES
# ══════════════════════════════════════════════════════════════════════════

def seed_hospital_resources(hp_map: dict[str, str]) -> None:
    section("STEP 5 — Hospital Staff / Beds / Ambulances")

    for email_key, hp_id in hp_map.items():
        # ── Staff ──────────────────────────────────────────────────────
        staff_check = (
            supabase.table("hospital_staff").select("id").eq("hospital_id", hp_id).execute()
        )
        if not staff_check.data:
            staff_rows = [
                {"hospital_id": hp_id, "full_name": "Dr. Neeraj Kapoor",
                 "staff_type": "doctor", "specialization": "Emergency Medicine",
                 "department": "Emergency", "phone_number": "+91 98011 10001",
                 "is_available": True},
                {"hospital_id": hp_id, "full_name": "Nurse Sunita Rao",
                 "staff_type": "nurse", "department": "ICU",
                 "phone_number": "+91 98011 10002", "is_available": True},
                {"hospital_id": hp_id, "full_name": "Paramedic Anil Desai",
                 "staff_type": "paramedic", "department": "Ambulance",
                 "phone_number": "+91 98011 10003", "is_available": True},
            ]
            supabase.table("hospital_staff").insert(staff_rows).execute()
            ok(f"Staff for hospital {hp_id[:8]}…")
        else:
            skip(f"Staff for hospital {hp_id[:8]}…")

        # ── Beds ───────────────────────────────────────────────────────
        bed_check = (
            supabase.table("hospital_beds").select("id").eq("hospital_id", hp_id).limit(1).execute()
        )
        if not bed_check.data:
            beds = []
            for i in range(1, 6):
                beds.append({
                    "hospital_id": hp_id,
                    "bed_number": f"GEN-{i:03d}",
                    "bed_type": "general",
                    "ward": "General Ward",
                    "floor": "1",
                    "is_available": i <= 3,
                    "is_occupied": i > 3,
                    "has_oxygen": True,
                    "has_ventilator": False,
                    "has_monitor": False,
                })
            for i in range(1, 4):
                beds.append({
                    "hospital_id": hp_id,
                    "bed_number": f"ICU-{i:03d}",
                    "bed_type": "icu",
                    "ward": "ICU",
                    "floor": "3",
                    "is_available": i <= 2,
                    "is_occupied": i > 2,
                    "has_oxygen": True,
                    "has_ventilator": True,
                    "has_monitor": True,
                })
            for i in range(1, 4):
                beds.append({
                    "hospital_id": hp_id,
                    "bed_number": f"EMG-{i:03d}",
                    "bed_type": "emergency",
                    "ward": "Emergency",
                    "floor": "G",
                    "is_available": True,
                    "is_occupied": False,
                    "has_oxygen": True,
                    "has_ventilator": False,
                    "has_monitor": False,
                })
            supabase.table("hospital_beds").insert(beds).execute()
            ok(f"Beds ({len(beds)}) for hospital {hp_id[:8]}…")
        else:
            skip(f"Beds for hospital {hp_id[:8]}…")

        # ── Ambulances ─────────────────────────────────────────────────
        amb_check = (
            supabase.table("hospital_ambulances")
            .select("id").eq("hospital_id", hp_id).limit(1).execute()
        )
        if not amb_check.data:
            ambulances = [
                {"hospital_id": hp_id, "vehicle_number": "KA-01-AB-1234",
                 "vehicle_type": "advanced", "model": "Force Traveller",
                 "year": 2022, "driver_name": "Ramu Naik",
                 "driver_phone": "+91 98100 50001",
                 "paramedic_name": "Priya Das", "paramedic_phone": "+91 98100 50002",
                 "current_latitude": 12.9716, "current_longitude": 77.5946,
                 "status": "available"},
                {"hospital_id": hp_id, "vehicle_number": "KA-01-CD-5678",
                 "vehicle_type": "basic", "model": "Tata Winger",
                 "year": 2021, "driver_name": "Shyam Verma",
                 "driver_phone": "+91 98100 50003",
                 "paramedic_name": "Meena Shah", "paramedic_phone": "+91 98100 50004",
                 "current_latitude": 12.9780, "current_longitude": 77.6010,
                 "status": "available"},
            ]
            supabase.table("hospital_ambulances").insert(ambulances).execute()
            ok(f"Ambulances (2) for hospital {hp_id[:8]}…")
        else:
            skip(f"Ambulances for hospital {hp_id[:8]}…")



# ══════════════════════════════════════════════════════════════════════════
# STEP 6 — PORTAL APPLICATIONS
# ══════════════════════════════════════════════════════════════════════════

def seed_portal_applications(uid_map: dict[str, str]) -> None:
    section("STEP 6 — Portal Applications")
    admin_uid = uid_map.get("admin@medicare.demo")

    apps = [
        {
            "email": "hospital1@medicare.demo",
            "application_type": "hospital",
            "organization_name": "City Care Hospital",
            "phone": "+91 80 4567 8901",
            "address": "12 MG Road, Bengaluru, Karnataka 560001",
            "license_or_registration_number": "KA-HOS-2015-0042",
            "status": "approved",
        },
        {
            "email": "hospital2@medicare.demo",
            "application_type": "hospital",
            "organization_name": "Apollo Medical Center",
            "phone": "+91 40 2345 6789",
            "address": "Jubilee Hills, Hyderabad, Telangana 500033",
            "license_or_registration_number": "TS-HOS-2012-0088",
            "status": "approved",
        },
        {
            "email": "responder1@medicare.demo",
            "application_type": "responder",
            "organization_name": "Rapid Ambulance",
            "phone": "+91 22 5678 9012",
            "address": "Andheri West, Mumbai, Maharashtra 400058",
            "license_or_registration_number": "MH-EMR-2019-0567",
            "status": "approved",
        },
        {
            "email": "responder2@medicare.demo",
            "application_type": "responder",
            "organization_name": "Life Support EMS",
            "phone": "+91 44 6789 0123",
            "address": "Anna Nagar, Chennai, Tamil Nadu 600040",
            "license_or_registration_number": "TN-EMR-2020-0234",
            "status": "approved",
        },
        # Pending hospital — for admin panel demo
        {
            "email": "user1@medicare.demo",
            "application_type": "hospital",
            "organization_name": "Sunrise Clinic",
            "phone": "+91 120 4567 8900",
            "address": "Sector 62, Noida, Uttar Pradesh 201301",
            "license_or_registration_number": "UP-HOS-2024-0019",
            "status": "pending",
        },
        # Rejected responder — for admin panel demo
        {
            "email": "user2@medicare.demo",
            "application_type": "responder",
            "organization_name": "Fast Aid Response",
            "phone": "+91 33 6789 0124",
            "address": "Park Street, Kolkata, West Bengal 700016",
            "license_or_registration_number": "WB-EMR-2024-0099",
            "status": "rejected",
            "rejection_reason": "Supporting documents were incomplete or unverifiable.",
        },
    ]

    for app in apps:
        uid = uid_map.get(app["email"])
        if not uid:
            continue
        existing = (
            supabase.table("portal_applications")
            .select("id")
            .eq("user_id", uid)
            .eq("application_type", app["application_type"])
            .execute()
        )
        if existing.data:
            skip(f"{app['email']} {app['application_type']} application")
            continue

        row: dict = {
            "user_id": uid,
            "application_type": app["application_type"],
            "organization_name": app["organization_name"],
            "phone": app["phone"],
            "address": app["address"],
            "license_or_registration_number": app["license_or_registration_number"],
            "status": app["status"],
        }
        if app["status"] in ("approved", "rejected") and admin_uid:
            row["reviewed_by"] = admin_uid
            row["reviewed_at"] = ago(days=5)
        if "rejection_reason" in app:
            row["rejection_reason"] = app["rejection_reason"]
        row["created_at"] = ago(days=10)

        supabase.table("portal_applications").insert(row).execute()
        ok(f"Application: {app['email']} → {app['status']}")



# ══════════════════════════════════════════════════════════════════════════
# STEP 7 — EMERGENCY REQUESTS (50 realistic records)
# ══════════════════════════════════════════════════════════════════════════

EMERGENCY_SCENARIOS = [
    ("medical",      "critical", "Person collapsed unconscious at home. Not responding to voice. Breathing irregular.", 28.6139, 77.2090, "34 Rajouri Garden, New Delhi 110027"),
    ("medical",      "high",     "Elderly man with severe chest pain and left arm numbness for 20 minutes.", 19.0760, 72.8777, "Andheri West, Mumbai 400058"),
    ("accident",     "critical", "Two-vehicle collision on highway. One person trapped, visible head injury.", 12.9716, 77.5946, "Outer Ring Road, Bengaluru 560103"),
    ("medical",      "high",     "Child aged 4 having continuous seizures, temperature 104°F.", 13.0827, 80.2707, "Adyar, Chennai 600020"),
    ("fire",         "critical", "Kitchen fire spreading to adjacent rooms. Family of 5 inside.", 17.3850, 78.4867, "Banjara Hills, Hyderabad 500034"),
    ("accident",     "high",     "Cyclist hit by car, severe leg fracture, conscious but in pain.", 22.5726, 88.3639, "Park Street, Kolkata 700016"),
    ("medical",      "medium",   "Diabetic patient with blood sugar 40 mg/dL, dizzy and sweating.", 18.5204, 73.8567, "Kothrud, Pune 411029"),
    ("medical",      "high",     "Stroke symptoms: face drooping, arm weakness, slurred speech for 30 minutes.", 26.8467, 80.9462, "Gomti Nagar, Lucknow 226010"),
    ("flood",        "high",     "Family stranded on terrace, water level at first floor, 3 elderly persons.", 23.0225, 72.5714, "Vastral, Ahmedabad 382418"),
    ("medical",      "medium",   "Asthma attack, inhaler not working, difficulty breathing for 10 minutes.", 25.3176, 82.9739, "Sigra, Varanasi 221001"),
    ("crime",        "high",     "Assault victim with head laceration and suspected rib fracture.", 12.9716, 77.5946, "Indiranagar, Bengaluru 560038"),
    ("medical",      "critical", "Pregnant woman, 36 weeks, heavy bleeding, severe abdominal pain.", 28.5355, 77.3910, "Noida Sector 18, UP 201301"),
    ("accident",     "medium",   "Motorcycle accident, rider with road rash and suspected arm fracture.", 19.2183, 72.9781, "Thane West, Mumbai 400601"),
    ("electric",     "critical", "Person electrocuted by exposed wire. Unresponsive, burns visible on hand.", 13.0827, 80.2707, "Velachery, Chennai 600042"),
    ("medical",      "high",     "Snake bite on right ankle. Swelling spreading rapidly. Victim vomiting.", 17.6868, 83.2185, "Visakhapatnam 530020"),
    ("accident",     "critical", "Bus rollover accident, multiple injured, at least 3 critical cases.", 28.7041, 77.1025, "NH-44, Sonipat Border, Haryana"),
    ("medical",      "low",      "Elderly woman fell in bathroom, possible hip fracture, stable condition.", 22.7196, 75.8577, "Vijay Nagar, Indore 452010"),
    ("fire",         "high",     "Apartment balcony on fire, smoke inhalation affecting residents on floor 4.", 21.1458, 79.0882, "Sitabuldi, Nagpur 440012"),
    ("medical",      "medium",   "Severe allergic reaction to food, face swelling, throat tightening.", 26.4499, 80.3319, "Civil Lines, Kanpur 208001"),
    ("accident",     "high",     "Construction worker fell from 3rd floor scaffolding, back injury.", 11.0168, 76.9558, "Peelamedu, Coimbatore 641004"),
    ("medical",      "critical", "Drowning victim, 7-year-old child, pulled from pool, not breathing.", 15.8497, 74.4977, "Belgaum, Karnataka 590001"),
    ("medical",      "medium",   "Elderly man with high fever 104°F and severe dehydration for 2 days.", 21.1702, 72.8311, "Athwa, Surat 395001"),
    ("crime",        "medium",   "Stabbing incident, victim with shoulder wound, bleeding controlled.", 22.3072, 73.1812, "Vadodara 390001"),
    ("animal_attack","high",     "Dog bite on child, deep wounds on leg, possible rabies exposure.", 30.7333, 76.7794, "Sector 22, Chandigarh 160022"),
    ("medical",      "high",     "Suspected poisoning, child swallowed cleaning fluid, vomiting badly.", 23.2599, 77.4126, "MP Nagar, Bhopal 462011"),
    ("flood",        "medium",   "Basement flooded, elderly couple trapped, water at waist level.", 19.9975, 73.7898, "Nashik Road, Nashik 422101"),
    ("medical",      "low",      "Minor laceration from kitchen knife, wound approximately 3 cm, bleeding slowly.", 28.6139, 77.2090, "Dwarka, New Delhi 110075"),
    ("accident",     "medium",   "Auto-rickshaw overturned, 2 passengers with minor injuries, driver unconscious.", 18.6161, 73.7286, "Pimpri-Chinchwad, Pune 411017"),
    ("medical",      "high",     "Heart patient with irregular heartbeat and dizziness, on blood thinners.", 12.9141, 74.8560, "Mangaluru 575001"),
    ("elder_care",   "medium",   "Dementia patient wandered out, found disoriented on street, not injured.", 9.9252, 78.1198, "Madurai 625001"),
    ("medical",      "low",      "Sprained ankle from fall on stairs, moderate swelling, no fracture suspected.", 28.6139, 77.2090, "Lajpat Nagar, New Delhi 110024"),
    ("accident",     "critical", "Truck and car collision on highway, driver critical, passenger unconscious.", 17.3850, 78.4867, "Secunderabad, Hyderabad 500003"),
    ("fire",         "medium",   "Small electrical fire in office, extinguished, 2 staff with smoke inhalation.", 22.5726, 88.3639, "Salt Lake, Kolkata 700064"),
    ("medical",      "high",     "Teenage athlete collapsed on field, unresponsive, possible cardiac event.", 12.9716, 77.5946, "Koramangala, Bengaluru 560034"),
    ("child_safety", "high",     "4-year-old ingested unknown tablets from cupboard. Drowsy and unresponsive.", 19.0760, 72.8777, "Borivali, Mumbai 400066"),
    ("medical",      "medium",   "Severe migraine with vomiting and partial vision loss for 2 hours.", 13.0827, 80.2707, "Nungambakkam, Chennai 600034"),
    ("accident",     "low",      "Cyclist minor fall, abrasions on knee and elbow, requesting first aid.", 28.5355, 77.3910, "Greater Noida 201318"),
    ("medical",      "critical", "Adult male with severe abdominal pain and rigid stomach, possible appendicitis.", 17.6868, 83.2185, "Gajuwaka, Visakhapatnam 530026"),
    ("flood",        "high",     "Rescue needed, 6 persons on rooftop, water 5 feet deep in locality.", 23.0225, 72.5714, "Naroda, Ahmedabad 382330"),
    ("medical",      "medium",   "Dialysis patient missed session, critically high potassium level suspected.", 26.8467, 80.9462, "Aliganj, Lucknow 226024"),
    ("fire",         "critical", "Factory fire with 3 workers trapped inside, fire brigade on the way.", 21.1458, 79.0882, "Butibori, Nagpur 441122"),
    ("accident",     "high",     "Head-on collision, drunk driver involved, victim with chest and face injuries.", 25.3176, 82.9739, "Lanka, Varanasi 221005"),
    ("medical",      "low",      "Mild fever 101°F and throat pain, no emergency, patient has no transport.", 18.5204, 73.8567, "Wakad, Pune 411057"),
    ("animal_attack","medium",   "Monkey bite on forearm while walking in park, wound bleeding.",         11.0168, 76.9558, "Gandhipuram, Coimbatore 641012"),
    ("electric",     "high",     "Power line fell on road, 2 bystanders with minor shocks, 1 unconscious.", 22.7196, 75.8577, "Rajwada, Indore 452002"),
    ("medical",      "high",     "Suspected meningitis, high fever, neck stiffness, sensitivity to light.", 30.7333, 76.7794, "Panchkula, Haryana 134109"),
    ("accident",     "medium",   "Fall from ladder while painting, wrist fracture, conscious and stable.", 21.1702, 72.8311, "Katargam, Surat 395004"),
    ("child_safety", "critical", "Choking infant, 8 months old, turned blue, parents performing back blows.", 23.2599, 77.4126, "Shyamla Hills, Bhopal 462013"),
    ("medical",      "medium",   "Uncontrolled nosebleed for 30 minutes, patient on blood thinners.", 9.9252, 78.1198, "SS Colony, Madurai 625016"),
    ("crime",        "high",     "Shooting in residential area, 1 victim with gunshot wound to shoulder.", 28.6139, 77.2090, "Rohini, New Delhi 110085"),
]

STATUS_DISTRIBUTION = (
    ["pending"] * 12 +
    ["accepted"] * 8 +
    ["in_progress"] * 8 +
    ["arrived"] * 5 +
    ["completed"] * 12 +
    ["cancelled"] * 5
)


def seed_emergency_requests(
    uid_map: dict[str, str], hp_map: dict[str, str]
) -> list[str]:
    """Insert 50 emergency requests; returns list of inserted request IDs."""
    section("STEP 7 — Emergency Requests (50)")

    user1_uid = uid_map.get("user1@medicare.demo")
    user2_uid = uid_map.get("user2@medicare.demo")
    resp1_uid = uid_map.get("responder1@medicare.demo")
    resp2_uid = uid_map.get("responder2@medicare.demo")

    if not user1_uid or not user2_uid:
        err("Demo users not found — skipping emergency requests")
        return []

    existing = supabase.table("emergency_requests").select("id").in_(
        "contact_number", ["+91 98600 66666", "+91 98700 77777"]
    ).execute()

    if existing.data and len(existing.data) >= 40:
        skip(f"Emergency requests ({len(existing.data)} found)")
        return [r["id"] for r in existing.data]

    request_ids: list[str] = []
    random.seed(42)

    for i, scenario in enumerate(EMERGENCY_SCENARIOS):
        e_type, severity, description, lat, lng, address = scenario
        status = STATUS_DISTRIBUTION[i % len(STATUS_DISTRIBUTION)]

        owner_uid = user1_uid if i % 2 == 0 else user2_uid
        days_ago = random.randint(1, 90)
        hours_ago = random.randint(0, 23)

        assigned_uid = None
        if status in ("accepted", "in_progress", "arrived", "completed"):
            assigned_uid = resp1_uid if i % 2 == 0 else resp2_uid

        contact = "+91 98600 66666" if owner_uid == user1_uid else "+91 98700 77777"

        row: dict = {
            "user_id": owner_uid,
            "emergency_type": e_type,
            "severity": severity,
            "description": description,
            "latitude": lat + random.uniform(-0.01, 0.01),
            "longitude": lng + random.uniform(-0.01, 0.01),
            "manual_address": address,
            "contact_number": contact,
            "status": status,
            "created_at": ago(days=days_ago, hours=hours_ago),
            "updated_at": ago(days=days_ago),
        }

        if assigned_uid:
            row["assigned_responder_id"] = assigned_uid
            row["assigned_at"] = ago(days=days_ago - 1, hours=1)
            row["accepted_at"] = ago(days=days_ago - 1, hours=1)

        if status in ("in_progress", "arrived", "completed"):
            row["in_progress_at"] = ago(days=days_ago - 1)

        if status in ("arrived", "completed"):
            row["arrived_at"] = ago(days=days_ago - 1, minutes=30)

        if status == "completed":
            row["completed_at"] = ago(days=days_ago - 2)

        if status == "cancelled":
            row["cancelled_at"] = ago(days=days_ago - 1)

        try:
            res = supabase.table("emergency_requests").insert(row).execute()
            req_id = res.data[0]["id"]
            request_ids.append(req_id)
        except Exception as exc:
            err(f"Request {i+1}: {exc}")

    ok(f"Inserted {len(request_ids)} emergency requests")
    return request_ids



# ══════════════════════════════════════════════════════════════════════════
# STEP 8 — NOTIFICATIONS
# ══════════════════════════════════════════════════════════════════════════

def seed_notifications(uid_map: dict[str, str], request_ids: list[str]) -> None:
    section("STEP 8 — Notifications")

    user1_uid  = uid_map.get("user1@medicare.demo")
    user2_uid  = uid_map.get("user2@medicare.demo")
    resp1_uid  = uid_map.get("responder1@medicare.demo")

    if not user1_uid or not request_ids:
        skip("Notifications (no users or requests)")
        return

    existing = (
        supabase.table("notifications")
        .select("id", count="exact")
        .in_("recipient_id", [user1_uid, user2_uid or user1_uid])
        .execute()
    )
    if existing.count and existing.count >= 10:
        skip(f"Notifications ({existing.count} found)")
        return

    sample_req_ids = request_ids[:6]
    notifs = []

    for idx, req_id in enumerate(sample_req_ids):
        owner_uid = user1_uid if idx % 2 == 0 else (user2_uid or user1_uid)

        notifs += [
            {
                "recipient_id": owner_uid,
                "request_id": req_id,
                "actor_id": resp1_uid,
                "type": "request_submitted",
                "title": "SOS Request Submitted",
                "message": "Your emergency request has been received and is being processed.",
                "metadata": {"request_id": req_id},
                "is_read": True,
                "created_at": ago(days=10 + idx),
            },
            {
                "recipient_id": owner_uid,
                "request_id": req_id,
                "actor_id": resp1_uid,
                "type": "request_accepted",
                "title": "Responder Assigned",
                "message": "A responder has accepted your emergency request and is on the way.",
                "metadata": {"request_id": req_id},
                "is_read": idx < 3,
                "created_at": ago(days=10 + idx, hours=1),
            },
            {
                "recipient_id": owner_uid,
                "request_id": req_id,
                "actor_id": resp1_uid,
                "type": "responder_on_the_way",
                "title": "Responder En Route",
                "message": "Your responder is on the way. Estimated arrival: 8 minutes.",
                "metadata": {"request_id": req_id, "eta_minutes": 8},
                "is_read": idx < 2,
                "created_at": ago(days=10 + idx, hours=1, minutes=5),
            },
        ]

        # Responder gets assignment notification
        if resp1_uid:
            notifs.append({
                "recipient_id": resp1_uid,
                "request_id": req_id,
                "type": "assignment_received",
                "title": "New Emergency Assignment",
                "message": "You have been assigned to an emergency request.",
                "metadata": {"request_id": req_id},
                "is_read": True,
                "created_at": ago(days=10 + idx, hours=1),
            })

    try:
        supabase.table("notifications").insert(notifs).execute()
        ok(f"Inserted {len(notifs)} notifications")
    except Exception as exc:
        err(f"Notifications: {exc}")



# ══════════════════════════════════════════════════════════════════════════
# STEP 9 — REQUEST MESSAGES (chat history)
# ══════════════════════════════════════════════════════════════════════════

def seed_request_messages(uid_map: dict[str, str], request_ids: list[str]) -> None:
    section("STEP 9 — Request Messages")

    user1_uid = uid_map.get("user1@medicare.demo")
    user2_uid = uid_map.get("user2@medicare.demo")
    resp1_uid = uid_map.get("responder1@medicare.demo")
    resp2_uid = uid_map.get("responder2@medicare.demo")

    if not user1_uid or not resp1_uid or len(request_ids) < 4:
        skip("Request messages (missing users or requests)")
        return

    existing = (
        supabase.table("request_messages")
        .select("id", count="exact")
        .execute()
    )
    if existing.count and existing.count >= 10:
        skip(f"Request messages ({existing.count} found)")
        return

    # Use the first 4 requests for chat history
    conversations: list[tuple[str, str, str]] = [
        (request_ids[0], user1_uid, resp1_uid),
        (request_ids[1], user2_uid or user1_uid, resp1_uid),
        (request_ids[2], user1_uid, resp2_uid or resp1_uid),
        (request_ids[3], user2_uid or user1_uid, resp2_uid or resp1_uid),
    ]

    CHAT_PAIRS = [
        # (sender_is_user, message)
        (True,  "Please hurry, the situation is getting worse."),
        (False, "I am on my way. ETA 8 minutes. Please stay calm."),
        (True,  "He is still unconscious. Should I do something?"),
        (False, "Do not move him. Keep him on his side. I will be there shortly."),
        (True,  "There is a small lane on the left of the main gate. Please use that."),
        (False, "Understood. I can see the building now. Coming up."),
        (True,  "Thank you so much. We are on the ground floor."),
        (False, "Arrived at building entrance. Coming to you now."),
    ]

    all_msgs = []
    for req_id, user_uid, resp_uid in conversations:
        for i, (sender_is_user, text) in enumerate(CHAT_PAIRS):
            sender = user_uid if sender_is_user else resp_uid
            recipient = resp_uid if sender_is_user else user_uid
            all_msgs.append({
                "request_id": req_id,
                "sender_id": sender,
                "recipient_id": recipient,
                "message": text,
                "message_type": "text",
                "is_read": True,
                "created_at": ago(days=8, minutes=i * 3),
            })

    try:
        supabase.table("request_messages").insert(all_msgs).execute()
        ok(f"Inserted {len(all_msgs)} request messages across {len(conversations)} conversations")
    except Exception as exc:
        err(f"Messages: {exc}")



# ══════════════════════════════════════════════════════════════════════════
# STEP 10 — AI CONVERSATIONS & MESSAGES
# ══════════════════════════════════════════════════════════════════════════

AI_DEMO_CHATS = [
    ("How do I use the SOS button?",
     "To submit an emergency request, tap the red SOS button on your dashboard. Fill in the emergency type, severity, a brief description, and your location. Confirm the details and submit. Nearby responders will be alerted immediately."),
    ("What should I do while waiting for the ambulance?",
     "Stay calm. Keep the patient still and comfortable. Do not give food or water. If conscious, reassure them help is coming. Clear the path to your door. Share live location if possible via the app."),
    ("How do I add an emergency contact?",
     "Go to Dashboard → Emergency Contacts → Add Contact. Fill in the person's name, relationship, and phone number. You can also mark one contact as primary — they will be notified when you submit an SOS."),
    ("My request shows 'Pending'. What does that mean?",
     "Pending means your request has been received and is waiting for a responder to accept. You will receive a notification as soon as a responder is assigned. Critical requests are prioritised."),
    ("What is the difference between severity levels?",
     "Low: Minor injuries or non-urgent situations. Medium: Moderate pain or distress, not immediately life-threatening. High: Serious condition needing prompt attention. Critical: Life-threatening — responders are dispatched immediately."),
    ("Can I cancel a request after submitting?",
     "Yes, you can cancel a pending request from the My Requests page. Go to the request details and tap Cancel. Once a responder is en route, please contact them directly before cancelling."),
    ("How do I find nearby hospitals?",
     "Tap Nearby Services on the dashboard. Your location will be used to show hospitals, pharmacies, and ambulance services within 5 km. You can adjust the radius and filter by type."),
    ("What information should I include in the description?",
     "Include: what happened, the patient's visible symptoms, any known medical conditions, and any hazards at the scene. Be specific — for example: 'Person collapsed, not breathing, no pulse, CPR in progress'."),
    ("Is my location shared automatically?",
     "If you allow location access, GPS coordinates are captured when you submit a request. Your assigned responder can also see live location updates. You can also type a manual address if GPS is unavailable."),
    ("How do I track my responder?",
     "Open the request details from My Requests. Once a responder accepts, a Live Tracking section will appear showing their current location on a map. The ETA updates in real time."),
    ("What happens after my request is completed?",
     "The request status changes to Completed. A summary is saved to your history. You can view it anytime from My Requests. The responder and hospital (if involved) will also have a record."),
    ("Can I use this app for a friend's emergency?",
     "Yes. When submitting a request, enter the contact number of the person needing help. You can also add them as an emergency contact. Provide their location in the manual address field if you are calling on their behalf."),
    ("How do I update my blood group and medical info?",
     "Go to Profile → Edit Profile. Scroll to Medical Information. You can add blood group, allergies, current medications, and medical conditions. This helps responders prepare before arrival."),
    ("What does the AI assistant do?",
     "I provide general health guidance, help you navigate the app, and offer first-aid information. I do not diagnose conditions or prescribe medication. For emergencies, always use the SOS button and contact local emergency services."),
    ("My responder is not moving on the map. Is that normal?",
     "Location updates depend on the responder's device GPS. Small delays are normal. If tracking stops for more than 5 minutes, try refreshing the page. You can also message the responder directly from the request detail view."),
    ("How do I report a false alarm after submitting?",
     "Cancel the request from the My Requests page as soon as possible. If a responder has already been dispatched, please message them immediately to avoid unnecessary deployment."),
    ("What types of emergencies can I report?",
     "You can report: Medical, Accident, Fire, Crime, Flood, Electrical, Child Safety, Elder Care, Animal Attack, and Other. Choose the type that best matches your situation for faster responder matching."),
    ("How secure is my data?",
     "Your data is encrypted and stored securely. Only you and assigned responders can view your request details. We do not sell your information. You can delete your account from Settings → Account."),
    ("Is the app available 24/7?",
     "Yes. Medicare operates around the clock. Responder availability may vary by area, but critical requests are prioritised at all times. In a life-threatening emergency, always call national emergency services first."),
    ("How do I change my phone number?",
     "Go to Profile → Edit Profile → Contact Number. Update your number and save. Verify it is reachable because responders will call this number during an emergency."),
]


def seed_ai_conversations(uid_map: dict[str, str]) -> None:
    section("STEP 10 — AI Conversations")

    user1_uid = uid_map.get("user1@medicare.demo")
    user2_uid = uid_map.get("user2@medicare.demo")

    if not user1_uid:
        skip("AI conversations (no users)")
        return

    existing = (
        supabase.table("ai_conversations")
        .select("id", count="exact")
        .in_("user_id", [uid for uid in [user1_uid, user2_uid] if uid])
        .execute()
    )
    if existing.count and existing.count >= 15:
        skip(f"AI conversations ({existing.count} found)")
        return

    inserted_convs = 0
    inserted_msgs  = 0

    for i, (user_q, ai_answer) in enumerate(AI_DEMO_CHATS):
        owner = user1_uid if i % 2 == 0 else (user2_uid or user1_uid)
        days_back = random.randint(1, 60)

        try:
            conv_res = supabase.table("ai_conversations").insert({
                "user_id": owner,
                "title": user_q[:55] + ("…" if len(user_q) > 55 else ""),
                "created_at": ago(days=days_back, hours=random.randint(0, 12)),
                "updated_at": ago(days=days_back),
            }).execute()
            conv_id = conv_res.data[0]["id"]
            inserted_convs += 1
        except Exception as exc:
            err(f"AI conversation {i+1}: {exc}")
            continue

        msgs = [
            {
                "conversation_id": conv_id,
                "user_id": owner,
                "role": "user",
                "content": user_q,
                "created_at": ago(days=days_back, hours=1),
            },
            {
                "conversation_id": conv_id,
                "user_id": owner,
                "role": "assistant",
                "content": ai_answer,
                "provider": "gemini",
                "model": "gemini-2.5-flash",
                "intent": "application_help",
                "urgency": "routine",
                "safety_category": "safe",
                "created_at": ago(days=days_back, hours=1, minutes=1),
            },
        ]
        try:
            supabase.table("ai_messages").insert(msgs).execute()
            inserted_msgs += 2
        except Exception as exc:
            err(f"AI messages for conv {conv_id[:8]}…: {exc}")

    ok(f"Inserted {inserted_convs} AI conversations, {inserted_msgs} messages")



# ══════════════════════════════════════════════════════════════════════════
# STEP 11 — EMERGENCY CONTACTS
# ══════════════════════════════════════════════════════════════════════════

def seed_emergency_contacts(uid_map: dict[str, str]) -> None:
    section("STEP 11 — Emergency Contacts")

    contacts_data = {
        "user1@medicare.demo": [
            {"full_name": "Suman Verma",    "relationship": "Spouse",  "phone_number": "+91 98600 11111", "is_primary": True},
            {"full_name": "Mohan Verma",    "relationship": "Father",  "phone_number": "+91 98600 22222", "is_primary": False},
        ],
        "user2@medicare.demo": [
            {"full_name": "Arun Singh",     "relationship": "Brother", "phone_number": "+91 98700 11111", "is_primary": True},
            {"full_name": "Geeta Singh",    "relationship": "Mother",  "phone_number": "+91 98700 22222", "is_primary": False},
        ],
        "responder1@medicare.demo": [
            {"full_name": "Lakshmi Kumar",  "relationship": "Spouse",  "phone_number": "+91 98400 11111", "is_primary": True},
        ],
        "responder2@medicare.demo": [
            {"full_name": "Ravi Reddy",     "relationship": "Father",  "phone_number": "+91 98500 11111", "is_primary": True},
        ],
    }

    for email, contacts in contacts_data.items():
        uid = uid_map.get(email)
        if not uid:
            continue

        existing = (
            supabase.table("emergency_contacts")
            .select("id", count="exact")
            .eq("user_id", uid)
            .execute()
        )
        if existing.count and existing.count > 0:
            skip(f"Contacts for {email}")
            continue

        rows = [{"user_id": uid, **c} for c in contacts]
        try:
            supabase.table("emergency_contacts").insert(rows).execute()
            ok(f"Contacts ({len(rows)}) for {email}")
        except Exception as exc:
            err(f"Contacts for {email}: {exc}")


# ══════════════════════════════════════════════════════════════════════════
# STEP 12 — AUDIT LOGS (admin panel demo)
# ══════════════════════════════════════════════════════════════════════════

def seed_audit_logs(uid_map: dict[str, str]) -> None:
    section("STEP 12 — Audit Logs")

    admin_uid = uid_map.get("admin@medicare.demo")
    if not admin_uid:
        skip("Audit logs (no admin user)")
        return

    existing = (
        supabase.table("audit_logs")
        .select("id", count="exact")
        .eq("actor_id", admin_uid)
        .execute()
    )
    if existing.count and existing.count >= 5:
        skip(f"Audit logs ({existing.count} found)")
        return

    h1_uid = uid_map.get("hospital1@medicare.demo")
    h2_uid = uid_map.get("hospital2@medicare.demo")
    r1_uid = uid_map.get("responder1@medicare.demo")
    r2_uid = uid_map.get("responder2@medicare.demo")
    u2_uid = uid_map.get("user2@medicare.demo")

    logs = []
    entries = [
        (h1_uid, "application_approved", "portal_application",
         {"status": "pending"}, {"status": "approved", "application_type": "hospital"}, 10),
        (h2_uid, "application_approved", "portal_application",
         {"status": "pending"}, {"status": "approved", "application_type": "hospital"}, 8),
        (r1_uid, "application_approved", "portal_application",
         {"status": "pending"}, {"status": "approved", "application_type": "responder"}, 7),
        (r2_uid, "application_approved", "portal_application",
         {"status": "pending"}, {"status": "approved", "application_type": "responder"}, 6),
        (u2_uid, "application_rejected", "portal_application",
         {"status": "pending"}, {"status": "rejected", "reason": "Documents incomplete"}, 5),
    ]
    for entity_uid, action, entity_type, old, new, days_back in entries:
        if entity_uid:
            logs.append({
                "actor_id": admin_uid,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_uid,
                "old_data": old,
                "new_data": new,
                "created_at": ago(days=days_back),
            })

    if logs:
        try:
            supabase.table("audit_logs").insert(logs).execute()
            ok(f"Inserted {len(logs)} audit log entries")
        except Exception as exc:
            err(f"Audit logs: {exc}")



# ══════════════════════════════════════════════════════════════════════════
# STEP 13 — LOGIN PAGE DEMO CREDENTIALS COMPONENT
# ══════════════════════════════════════════════════════════════════════════

DEMO_PANEL_TSX = '''\
/**
 * components/auth/DemoCredentials.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Displays demo login credentials in development mode ONLY.
 *
 * This component renders nothing in production.
 * Set NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true in .env.local to enable.
 *
 * NEVER ship real passwords here.  These are disposable demo accounts only.
 */
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";

interface DemoAccount {
  role: string;
  email: string;
  password: string;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "Admin",      email: "admin@medicare.demo",      password: "Admin@123",     color: "text-purple-700 bg-purple-50 border-purple-200" },
  { role: "Hospital",   email: "hospital1@medicare.demo",  password: "Hospital@123",  color: "text-blue-700 bg-blue-50 border-blue-200"        },
  { role: "Responder",  email: "responder1@medicare.demo", password: "Responder@123", color: "text-green-700 bg-green-50 border-green-200"      },
  { role: "User",       email: "user1@medicare.demo",      password: "User@123",      color: "text-slate-700 bg-slate-50 border-slate-200"      },
];

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function DemoCredentials() {
  const [open, setOpen] = useState(false);

  // Only render in development (gate on env var as belt-and-suspenders)
  if (process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS !== "true") return null;

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-xs font-bold text-amber-700">
          <FlaskConical className="w-4 h-4" />
          Demo Accounts (development only)
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-amber-600" />
          : <ChevronDown className="w-4 h-4 text-amber-600" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-[10px] text-amber-600 mb-3">
            Click any email or password to copy it.
          </p>
          {DEMO_ACCOUNTS.map((a) => (
            <div key={a.role} className={`rounded-lg border px-3 py-2 text-xs ${a.color}`}>
              <span className="font-bold mr-2">{a.role}</span>
              <button
                type="button"
                className="underline mr-2 font-mono"
                onClick={() => copyText(a.email)}
                title="Click to copy"
              >
                {a.email}
              </button>
              <button
                type="button"
                className="underline font-mono"
                onClick={() => copyText(a.password)}
                title="Click to copy"
              >
                {a.password}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
'''


def write_demo_credentials_component() -> None:
    section("STEP 13 — DemoCredentials component")
    target = Path(__file__).parent.parent.parent / "frontend" / "components" / "auth" / "DemoCredentials.tsx"

    if target.exists():
        skip("DemoCredentials.tsx already exists")
        return

    target.write_text(DEMO_PANEL_TSX, encoding="utf-8")
    ok(f"Written: {target}")

    # Also add the env var to frontend/.env.local if present
    env_local = Path(__file__).parent.parent.parent / "frontend" / ".env.local"
    if env_local.exists():
        content = env_local.read_text(encoding="utf-8")
        if "NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS" not in content:
            env_local.write_text(
                content.rstrip() + "\n\n# Demo credentials panel (dev only)\nNEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true\n",
                encoding="utf-8",
            )
            ok("Added NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=true to .env.local")



# ══════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════

def main() -> None:
    print("\n" + "═" * 55)
    print("  Medicare — Demo Data Seed")
    print("  DEVELOPMENT ENVIRONMENT ONLY")
    print("═" * 55)

    # ── Auth users ─────────────────────────────────────────────────────
    uid_map = seed_users()

    # ── Profiles ───────────────────────────────────────────────────────
    seed_profiles(uid_map)

    # ── Organisations ──────────────────────────────────────────────────
    org_map = seed_organizations()
    seed_org_members(uid_map, org_map)

    # ── Hospital profiles, staff, beds, ambulances ─────────────────────
    hp_map = seed_hospital_profiles(uid_map)
    if hp_map:
        seed_hospital_resources(hp_map)

    # ── Portal applications ────────────────────────────────────────────
    seed_portal_applications(uid_map)

    # ── Emergency requests ─────────────────────────────────────────────
    request_ids = seed_emergency_requests(uid_map, hp_map)

    # ── Notifications ──────────────────────────────────────────────────
    seed_notifications(uid_map, request_ids)

    # ── Request messages ───────────────────────────────────────────────
    seed_request_messages(uid_map, request_ids)

    # ── AI conversations ───────────────────────────────────────────────
    seed_ai_conversations(uid_map)

    # ── Emergency contacts ─────────────────────────────────────────────
    seed_emergency_contacts(uid_map)

    # ── Audit logs ─────────────────────────────────────────────────────
    seed_audit_logs(uid_map)

    # ── Frontend DemoCredentials component ─────────────────────────────
    write_demo_credentials_component()

    # ── Summary ────────────────────────────────────────────────────────
    print("\n" + "═" * 55)
    print(f"  {GREEN}✓ Seed complete!{RESET}")
    print("═" * 55)
    print("""
  Demo accounts
  ─────────────────────────────────────────────────
  Admin      admin@medicare.demo        Admin@123
  Hospital   hospital1@medicare.demo    Hospital@123
  Hospital   hospital2@medicare.demo    Hospital@123
  Responder  responder1@medicare.demo   Responder@123
  Responder  responder2@medicare.demo   Responder@123
  User       user1@medicare.demo        User@123
  User       user2@medicare.demo        User@123
  ─────────────────────────────────────────────────
""")


if __name__ == "__main__":
    main()
