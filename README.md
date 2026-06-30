# MediQueue API

A production-grade **Teleconsultation Booking & Real-Time Queue Management** backend API built for the Nigerian healthcare market.

Patients can book appointments, join virtual queues, and track their position in real time. Doctors manage their schedules and consultation flow. Admins monitor the entire system with analytics and reports.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Background Jobs](#background-jobs)
- [Project Structure](#project-structure)
- [Roles & Permissions](#roles--permissions)

---

## Features

### Patient
- Register and log in securely
- Browse available doctors filtered by specialization and fee
- Book, cancel, and reschedule appointments
- Join the real-time consultation queue
- Track live queue position with estimated wait time
- Receive appointment reminder emails 30 minutes before consultation
- View personal appointment analytics

### Doctor
- Create and manage a professional profile
- Set availability slots (single or recurring)
- Block or delete slots
- View and manage patient appointment queue
- Start, complete, or mark patients as no-show
- View performance analytics

### Admin
- System-wide overview dashboard
- User and doctor management (activate, deactivate, suspend)
- Appointment and revenue analytics
- Live queue monitoring across all doctors
- Trigger background jobs manually

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS (TypeScript) |
| Database | PostgreSQL + TypeORM |
| Cache & Queue State | Redis (ioredis) |
| Real-Time | Socket.IO WebSockets |
| Background Jobs | BullMQ + @nestjs/schedule |
| Authentication | JWT (Access + Refresh Tokens) |
| Password Hashing | bcrypt |
| Email | Nodemailer (Gmail SMTP) |
| Validation | class-validator + class-transformer |
| Rate Limiting | @nestjs/throttler |

---

## Architecture

┌─────────────────────────────────────────────────────────┐
│                    NestJS API Server                     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Auth   │  │  Users   │  │ Doctors  │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌────────────────┐  ┌──────────────────┐              │
│  │ Availability   │  │  Appointments    │              │
│  └────────────────┘  └──────────────────┘              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Queues  │  │  Admin   │  │Analytics │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Jobs   │  │   Mail   │  │WebSocket │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
│                │                │
▼                ▼                ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│PostgreSQL│    │  Redis   │    │ BullMQ   │
└──────────┘    └──────────┘    └──────────┘

---

## Prerequisites

- Node.js v18+
- PostgreSQL 14+
- Redis 6+
- npm

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/mediqueue-api.git
cd mediqueue-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in all values in `.env` (see [Environment Variables](#environment-variables)).

### 4. Create the database

```bash
psql -U postgres -c "CREATE DATABASE mediqueue;"
```

### 5. Run migrations

```bash
npm run migration:run
```

### 6. Start the server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000/api/v1`

---

## Environment Variables

Create a `.env` file in the project root:

```env
# App
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_NAME=mediqueue

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (Gmail SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=your_16char_app_password
MAIL_FROM="MediQueue <noreply@mediqueue.com>"
```

> For Gmail, generate an **App Password** under Google Account → Security → App Passwords.

---

## Database Migrations

```bash
# Generate a new migration after changing entities
npm run migration:generate src/database/migrations/MigrationName

# Apply pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

---

## API Reference

Base URL: `http://localhost:3000/api/v1`

### Authentication

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login and get tokens |
| POST | `/auth/refresh` | Authenticated | Refresh access token |
| POST | `/auth/logout` | Authenticated | Logout and invalidate token |
| POST | `/auth/forgot-password` | Public | Request password reset email |
| POST | `/auth/reset-password` | Public | Reset password with token |

### Users

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/users/me` | Authenticated | Get my profile |
| PATCH | `/users/me` | Authenticated | Update my profile |
| PATCH | `/users/me/change-password` | Authenticated | Change password |
| GET | `/users/all` | Admin | Get all users (paginated) |
| GET | `/users/inactive` | Admin | Get inactive users |
| GET | `/users/:id` | Admin | Get single user |
| PATCH | `/users/:id/deactivate` | Admin | Deactivate a user |
| PATCH | `/users/:id/reactivate` | Admin | Reactivate a user |

### Doctors

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/doctors` | Public | List active doctors (paginated, filterable) |
| GET | `/doctors/single/:id` | Public | Get a single doctor |
| POST | `/doctors` | Doctor | Create doctor profile |
| GET | `/doctors/me` | Doctor | Get my doctor profile |
| PATCH | `/doctors/me` | Doctor | Update my doctor profile |
| PATCH | `/doctors/me/status` | Doctor | Update availability status |
| GET | `/doctors/admin/all` | Admin | Get all doctors including inactive |
| DELETE | `/doctors/admin/:id` | Admin | Delete a doctor profile |

#### Doctor query params

### Availability

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/availability/doctor/:doctorId` | Public | Get available slots for a doctor |
| POST | `/availability` | Doctor | Create a slot (single or recurring) |
| GET | `/availability/me` | Doctor | Get my slots |
| PATCH | `/availability/me/block/:slotId` | Doctor | Block a slot |
| DELETE | `/availability/me/:slotId` | Doctor | Delete a slot |
| GET | `/availability/admin/:doctorId` | Admin | Get all slots for a doctor |

#### Create slot examples

Single slot:
```json
{
  "date": "2026-06-15",
  "startTime": "09:00",
  "endTime": "09:30"
}
```

Recurring slot:
```json
{
  "date": "2026-06-09",
  "startTime": "10:00",
  "endTime": "10:30",
  "isRecurring": true,
  "recurrenceDays": ["MON", "WED", "FRI"]
}
```

### Appointments

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/appointments/book` | Patient | Book an appointment |
| GET | `/appointments/my` | Patient | Get my appointments |
| PATCH | `/appointments/my/:id/cancel` | Patient | Cancel my appointment |
| PATCH | `/appointments/my/:id/reschedule` | Patient | Reschedule my appointment |
| GET | `/appointments/doctor` | Doctor | Get doctor appointments |
| PATCH | `/appointments/doctor/:id/start` | Doctor | Start consultation |
| PATCH | `/appointments/doctor/:id/complete` | Doctor | Complete consultation |
| PATCH | `/appointments/doctor/:id/no-show` | Doctor | Mark patient as no-show |
| GET | `/appointments/:id` | Patient/Doctor | Get single appointment |
| GET | `/appointments/admin/all` | Admin | Get all appointments |

#### Appointment status flow

### Queue

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/queues/join` | Patient | Join the consultation queue |
| GET | `/queues/my-position/:appointmentId` | Patient | Get my queue position |
| DELETE | `/queues/leave/:appointmentId` | Patient | Leave the queue |
| GET | `/queues/doctor` | Doctor | View doctor's queue |
| PATCH | `/queues/doctor/advance` | Doctor | Call next patient |
| GET | `/queues/admin/stats/:doctorId` | Admin | Get queue stats for a doctor |

### Admin

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/admin/overview` | Admin | System-wide overview stats |
| GET | `/admin/users/growth` | Admin | User registration growth |
| GET | `/admin/appointments/stats` | Admin | Appointment stats over time |
| GET | `/admin/doctors/performance` | Admin | Doctor performance report |
| GET | `/admin/revenue` | Admin | Revenue report |
| GET | `/admin/queues/live` | Admin | Live queue overview |
| PATCH | `/admin/doctors/:id/suspend` | Admin | Suspend a doctor |
| PATCH | `/admin/doctors/:id/unsuspend` | Admin | Unsuspend a doctor |

### Analytics

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/analytics/doctor` | Doctor | Doctor's own analytics |
| GET | `/analytics/patient` | Patient | Patient's own analytics |

#### Analytics query params

### Jobs (Admin only)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/jobs/trigger-daily-slots` | Admin | Manually trigger daily slot generation |

---

## WebSocket Events

**Namespace:** `/queue`

**Connection:**
```javascript
const socket = io('http://localhost:3000/queue');
```

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `joinQueueRoom` | `{ doctorId }` | Subscribe to a doctor's queue updates |
| `leaveQueueRoom` | `{ doctorId }` | Unsubscribe from a doctor's queue |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `queueUpdated` | `{ doctorId, queueLength, queue[] }` | Fired when queue changes |
| `positionChanged` | `{ position, estimatedWait }` | Patient position updated |
| `consultationStarted` | `{ patientId, message }` | Doctor called next patient |

### Example
```javascript
const socket = io('http://localhost:3000/queue');

socket.on('connect', () => {
  socket.emit('joinQueueRoom', { doctorId: 'your-doctor-id' });
});

socket.on('queueUpdated', (data) => {
  console.log('Queue updated:', data);
});

socket.on('consultationStarted', (data) => {
  console.log('Your turn:', data);
});
```

---

## Live Demo

| Resource | URL |
|----------|-----|
| **API Base URL** | https://mediqueue-api-84p0.onrender.com/api/v1 |
| **Swagger Docs** | https://mediqueue-api-84p0.onrender.com/api/docs |
| **Health Check** | https://mediqueue-api-84p0.onrender.com/api/v1/health |

### How to explore the API

1. Open the [Swagger Docs](https://mediqueue-api-84p0.onrender.com/api/docs)
2. Call `POST /auth/register` to create an account
3. Call `POST /auth/login` to get your `accessToken`
4. Click **Authorize 🔒** at the top right of Swagger
5. Paste: `Bearer <your_accessToken>`
6. All protected endpoints are now unlocked

> **Note:** The API is hosted on Render's free tier — the first request after inactivity may take 20-30 seconds to wake up.

---

## Deployment

This API is deployed on **Render** with the following services:

| Service | Provider | Details |
|---------|----------|---------|
| API Server | Render Web Service | Node.js 20, auto-deploy on push to `main` |
| Database | Render PostgreSQL | Free tier, SSL enabled |
| Cache / Queue | Upstash Redis | Free tier, TLS enabled |
| Email | Gmail SMTP | Nodemailer via App Password |
| Payments | Paystack | Test mode — use test cards |

### Deployment flow

Every push to `main` automatically:
1. Installs dependencies
2. Builds the NestJS project
3. Runs TypeORM migrations
4. Restarts the API server

### Paystack test card

To test payments on the live API:

## Background Jobs

| Job | Queue | Trigger | Description |
|-----|-------|---------|-------------|
| Appointment Reminder | `appointment-reminders` | On booking | Sends email 30 mins before appointment |
| Queue Recalculation | `queue-recalculation` | On leave/cancel | Recalculates positions for remaining patients |
| Daily Slot Generation | `daily-slots` | Nightly cron (midnight) | Generates slots for recurring schedules |

---

## Project Structure

src/
├── admin/                  # Admin dashboard and management
├── analytics/              # Doctor and patient analytics
├── appointments/           # Appointment booking and management
├── auth/                   # JWT auth, strategies, guards, decorators
├── availability/           # Doctor slot scheduling
├── common/
│   ├── database/           # TypeORM config and data source
│   ├── enums/              # Shared enums (roles, statuses)
│   ├── pagination/         # Reusable pagination utility
│   ├── redis/              # Redis service and module
│   └── utils/              # Time formatting utilities
├── database/
│   └── migrations/         # TypeORM migration files
├── doctors/                # Doctor profile management
├── jobs/
│   └── processors/         # BullMQ job processors
├── mail/
│   └── templates/          # Email HTML templates
├── notifications/          # Notification module
├── queues/                 # Real-time queue management
├── users/                  # User profile management
├── websocket/              # Socket.IO gateway
├── app.module.ts
└── main.ts

---

## Roles & Permissions

| Feature | Patient | Doctor | Admin |
|---------|---------|--------|-------|
| Register / Login | ✅ | ✅ | ✅ |
| View doctors | ✅ | ✅ | ✅ |
| Book appointment | ✅ | ❌ | ❌ |
| Join queue | ✅ | ❌ | ❌ |
| Manage availability | ❌ | ✅ | ❌ |
| Start/complete consultation | ❌ | ✅ | ❌ |
| View all users | ❌ | ❌ | ✅ |
| System analytics | ❌ | ❌ | ✅ |
| Suspend doctors | ❌ | ❌ | ✅ |
| Trigger jobs | ❌ | ❌ | ✅ |

---

## License

MIT