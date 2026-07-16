# Hospital Portal Documentation

## Overview

The Hospital Portal is a secure web application that allows verified hospitals to manage emergency requests, staff, beds, ambulances, and view analytics.

## Features

- **Dashboard**: Real-time statistics and incoming emergency requests
- **Request Management**: Accept, reject, and manage emergency requests
- **Staff Management**: Manage doctors, nurses, and other hospital staff
- **Ambulance Management**: Track and dispatch ambulances
- **Bed Management**: Monitor and update bed availability
- **Hospital Profile**: Manage hospital information and settings
- **Emergency History**: View past emergency requests and treatments
- **Real-time Updates**: Instant notifications for new requests and status changes

## Architecture

### Database Tables

- `hospital_profiles`: Hospital information and capacity
- `hospital_staff`: Staff members and their availability
- `hospital_beds`: Bed inventory and availability
- `hospital_ambulances`: Ambulance fleet and status
- `hospital_assignments`: Emergency request assignments and treatment tracking

### Backend API

All hospital endpoints are prefixed with `/api/v1/hospital/`:

- `GET /dashboard` - Dashboard statistics
- `GET /profile` - Get hospital profile
- `POST /profile` - Create hospital profile
- `PATCH /profile` - Update hospital profile
- `GET /requests` - List emergency requests
- `GET /requests/{id}` - Get single request
- `POST /requests/{id}/accept` - Accept request
- `POST /requests/{id}/reject` - Reject request
- `POST /requests/{id}/assign-doctor` - Assign doctor
- `POST /requests/{id}/assign-ambulance` - Assign ambulance
- `GET /staff` - List staff
- `POST /staff` - Create staff
- `GET /staff/{id}` - Get staff
- `PATCH /staff/{id}` - Update staff
- `DELETE /staff/{id}` - Delete staff
- `GET /beds` - List beds
- `POST /beds` - Create bed
- `GET /beds/{id}` - Get bed
- `PATCH /beds/{id}` - Update bed
- `PATCH /beds/{id}/availability` - Update bed availability
- `DELETE /beds/{id}` - Delete bed
- `GET /ambulances` - List ambulances
- `POST /ambulances` - Create ambulance
- `GET /ambulances/{id}` - Get ambulance
- `PATCH /ambulances/{id}` - Update ambulance
- `PATCH /ambulances/{id}/status` - Update ambulance status
- `DELETE /ambulances/{id}` - Delete ambulance
- `GET /assignments` - List assignments
- `GET /assignments/{id}` - Get assignment
- `PATCH /assignments/{id}` - Update assignment

### Frontend Routes

- `/hospital` - Hospital dashboard
- `/hospital/requests` - Emergency requests management
- `/hospital/staff` - Staff management
- `/hospital/ambulances` - Ambulance management
- `/hospital/beds` - Bed management
- `/hospital/profile` - Hospital profile settings
- `/hospital/history` - Emergency history
- `/hospital/settings` - Hospital settings

## Security

- Role-based access control (hospital role required)
- Row-level security (RLS) policies on all tables
- Hospitals can only access their own data
- Admins can access all hospital data
- Secure RPC functions for critical operations
- JWT authentication via Supabase Auth

## Setup

### Database Migration

Run the hospital portal migration:

```bash
supabase db push
```

Or apply the migration manually:

```sql
-- File: frontend/supabase/migrations/20260715200000_add_hospital_portal.sql
```

### Backend Setup

The backend is already configured with:
- Schemas: `app/schemas/hospital.py`
- Repository: `app/repositories/hospital.py`
- Service: `app/services/hospital_service.py`
- Routes: `app/api/v1/routes/hospital.py`

The routes are registered in `app/api/v1/api.py`.

### Frontend Setup

The frontend includes:
- Layout: `app/hospital/layout.tsx`
- Pages: `app/hospital/*/page.tsx`
- Components: `components/hospital/*.tsx`

## Testing

### Backend Tests

```bash
cd backend
python -m pytest tests/
```

### Frontend Build

```bash
cd frontend
npm run build
```

### Type Checking

```bash
cd backend
python -m compileall app

cd frontend
npx tsc --noEmit
```

## Usage

1. **Create Hospital Profile**: Navigate to `/hospital/profile` and complete the hospital information
2. **Add Staff**: Go to `/hospital/staff` to add doctors, nurses, and other staff
3. **Add Beds**: Visit `/hospital/beds` to configure bed inventory
4. **Add Ambulances**: Use `/hospital/ambulances` to register ambulances
5. **Accept Requests**: Monitor `/hospital` dashboard for incoming emergency requests
6. **Assign Resources**: Assign doctors and ambulances to accepted requests
7. **Track Progress**: Monitor request status and treatment progress

## Real-time Updates

The hospital portal supports real-time updates via Supabase Realtime:

- New emergency requests
- Request status changes
- Staff availability updates
- Ambulance location updates
- Bed availability changes

## Limitations

- Hospital profile must be created before accepting requests
- Staff, beds, and ambulances must be added before assignment
- Real-time features require Supabase Realtime to be enabled
- Map integration requires additional configuration

## Future Enhancements

- Advanced analytics and reporting
- Integration with hospital information systems (HIS)
- Automated ambulance routing
- Video consultation capabilities
- Multi-hospital coordination
- Mobile app for hospital staff
