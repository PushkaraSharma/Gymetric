# API parity: GymKarta ↔ CoreWave

GymKarta (mobile) and CoreWave (web, `/Users/pushkarasharma/Desktop/Personal/corewave/apps/api`) are the same product.
The goal is to let either UI run on either API with only a thin client change. This file is the checklist.

## Rules

- **New** endpoints copy CoreWave's path, permission key, and request/response shape.
- **Existing** GymKarta endpoints keep their paths, because released app builds call them. When a screen is copied
  across, add a CoreWave-shaped alias next to the old route instead of changing it.
- Features the app doesn't ship (lockers, POS, expenses, inquiries, cash delivery, follow-ups, remarks, bans,
  balance ledger, multi-branch, broadcast) get **no** backend code until they ship.
- Permission keys: CoreWave names wherever the two overlap (`server/src/utils/permissions.ts`).
- Update this file in the same change as any route you add or align.

Shape column: **same** = checked to match, **differs** = checked and different, **—** = not compared yet.

## Endpoints

| Area | GymKarta | CoreWave | Shape |
|---|---|---|---|
| Auth | `POST /api/auth/verify-otp`, `login-password`, `check-user`, `onboard`, `setup` | `POST /api/auth/login`, `refresh`, `logout`, `branch` | differs (phone/OTP vs username/password + refresh tokens) |
| My profile | `GET/PATCH /api/auth/me`, `POST /api/auth/reset-password` | `POST /api/account/password` | — |
| Gym / branch | `GET /api/gym/info`, `PATCH /api/gym/update` | `GET/PATCH /api/branch` | — (GymKarta adds `viewer`, `subscription`) |
| Gym logo | `POST /api/upload/gym-logo` | `POST/DELETE /api/branch/logo` | — |
| Receipts | `POST /api/settings/receipt`, `POST /api/upload/receipt-asset` | `PATCH /api/branch`, `PATCH /api/branch/terms` | — |
| Membership plans | `GET /api/membership/all`, `POST add`, `PATCH update`, `DELETE delete` | `GET/POST /api/settings/packages`, `PATCH/DELETE /api/settings/packages/:id` | — |
| Roles | `GET/POST /api/roles`, `PATCH/DELETE /api/roles/:id` | `GET/PUT /api/settings/access`, `POST/PATCH/DELETE /api/settings/roles/:id` | — |
| Clients list | `GET /api/client/all` | `GET /api/members` | — |
| Client create/edit | `POST /api/client/add`, `PATCH /api/client/update` | `POST /api/members`, `PATCH /api/members/:id` | — |
| Client profile | `GET /api/client/clientInfo`, `GET /api/client/stats`, `GET /api/client/activity` | `GET /api/members/:id`, `GET /api/members/:id/activities` | — |
| Delete client | `DELETE /api/client/delete` (`clients.archive`) | `POST /api/members/:id/archive` (`clients.archive`) | — |
| Renew | `PATCH /api/client/renew` | `POST /api/members/:id/renew` | — |
| Collect | `POST /api/client/collect-payment` | `POST /api/members/:id/payments` | — |
| Edit membership | `PATCH /api/client/membership/amend` | `PATCH /api/members/:id` (profile edit) | — |
| Freeze / resume | `POST /api/client/membership/pause`, `resume` | `POST /api/members/:id/freeze`, `resume` | — |
| Upgrade | `GET /api/client/upgrade/options`, `POST /api/client/upgrade` | `POST /api/members/:id/memberships/:membershipId/upgrade` | — |
| Invoice edit / delete (Phase 3) | *to build* | `PATCH/DELETE /api/members/:id/payments/:paymentId` (`clients.edit` / `data.delete`) | copy CoreWave |
| Send invoice on WhatsApp | *to build* | `POST /api/members/:id/payments/:paymentId/whatsapp` | copy CoreWave |
| Dashboard | `GET /api/dashboard/summary`, `revenue`, `activities` | `GET /api/dashboard` | — |
| Reports | `GET /api/reports/:kind` (export built in the app) | `GET /api/reports`, `GET /api/exports/reports` | — |
| Client export | *to build* | `GET /api/exports/clients` | copy CoreWave |
| Staff | `GET/POST /api/staff`, `GET/PATCH /api/staff/:id`, `GET /api/staff/:id/attendance`, `POST /api/staff/:id/punches`, `POST /api/staff/punches/:punchId/void`, `GET /api/staff/attendance/today` | `GET/POST /api/staff`, `GET/PATCH/DELETE /api/staff/:id`, `GET/POST /api/staff/:id/attendance`, `POST /api/staff/attendance/:punchId/void`, `GET /api/staff/attendance/summary` | — |
| Reader | `/api/biometric/device`, `enabled`, `device/pair`, `unpair`, `open`, `device/commands/:cmdId` | same paths | — |
| Fingerprint | `/api/biometric/members/:id/fingerprint[/confirm\|/cancel]`, `/api/biometric/staff/:id/…` | `/api/members/:id/fingerprint[…]`, `/api/staff/:id/fingerprint[…]` | — |
| Check-ins | `GET /api/biometric/checkins`, `GET /api/biometric/members/:id/visits` | `GET /api/attendance`, `GET /api/members/:id/visits` | — |
| WhatsApp chat | `GET /api/chat/threads`, `GET /api/chat/thread`, `POST /api/chat/send`, `POST /api/chat/send-template`, `GET /api/chat/unread` | `GET /api/whatsapp/conversations`, `GET/POST /api/whatsapp/conversations/:memberId/messages`, `POST …/seen`, `GET /api/whatsapp/unread-count` | — |
| WhatsApp log | `GET /api/whatsapp/summary`, `logs` | same paths | — |
| WhatsApp settings | `GET/POST /api/settings`, `POST /api/upload/whatsapp-header` | `GET/PUT /api/whatsapp/credentials`, `POST /api/whatsapp/header-image` | — |
| Webhook | `GET/POST /api/system/whatsapp-webhook` | `GET/POST /api/whatsapp/webhook` | — |
| eSSL reader | `/iclock/*` | `/iclock/*` | — |

## GymKarta only

- Plans and features: `branches.plan` / `plan_expires_at`, `requireFeature()`, the `subscription` field in `/api/gym/info`,
  and `npm run plan`. CoreWave is a single paying client and has none of this.
- Push notifications: `/api/user/push-token`, `/api/user/push-prefs`.
