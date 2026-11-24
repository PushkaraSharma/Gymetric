# GymKarta Phase 3 plan: complete app, paid plans, CoreWave parity

Status: draft for your review. Nothing built yet.
Code changes go in the main checkout (`mongo_postgres`). This file lives in the session worktree only.

---

## 0. Two things to settle first

1. **Commit `9bb8375` is smaller than the handoff said.** The client profile rewrite, Home KPI row, expandable add button, `UpgradeMembershipScreen`, and the Phase 2 edits to `Home.tsx`, `ClientDetails.tsx` and `ClientsList.tsx` were left out. You confirmed removing them was intentional. The server side of upgrade (`POST /api/client/:id/upgrade`) *is* committed. This plan starts from what is on disk now.
2. **CoreWave is a client project.** You confirmed its code may be copied freely, so we port files and UI directly where they fit.

---

## 1. Strategy: one backend shape, two products

What I found:
- Both servers run Fastify 5 + Drizzle + Postgres/PGlite.
- GymKarta already uses CoreWave's table names (`branches`, `members`, `packages`, `memberships`, `payments`, `activities`, `attendance`, `staff_attendance`, `message_logs`, `biometric_devices`, …).
- CoreWave has more tables that GymKarta won't need yet: lockers, POS, expenses, inquiries, cash delivery, follow-ups, remarks, client bans, balance ledger.

Rules for every feature from now on:

| Rule | Why |
|---|---|
| A feature the app doesn't ship gets no backend code. That means no lockers, POS, expenses, inquiries or cash delivery. | Less code to maintain. |
| When porting a feature, copy CoreWave's **column names, permission key, and request/response shape**. Only Gymetric's URL prefix may differ. | Later, CoreWave web pages can run against the GymKarta API, and this app can run against CoreWave, with only a thin API client change. |
| Endpoints the shipped app already uses stay as they are. Installed apps depend on them. | No breaking old app versions. |
| Add `server/notes/api-parity.md`: one row per endpoint, giving the GymKarta path, the CoreWave path, and whether the shapes match. | It becomes the checklist for the "copy UI across" step later. |
| **Align permission keys with CoreWave now**, while few gyms have custom roles. Migration maps `settings.gym` → `settings.branch` and `clients.delete` → `clients.archive` + `data.delete`. Add `bill.billing_date`, `bill.joining_date` and `bill.adjust_trial`. GymKarta-only keys stay: `whatsapp.chat`, `door.open`, `entrance.manage`, `attendance.manage`, `settings.plans`. | Same roles screen and same checks in both products. It is cheapest to do this before production cutover. |

---

## 2. Plans (Free → WhatsApp → WhatsApp + Biometric)

### Market check (India, Nov 2026)
Competitors list **₹299–₹2,999/month**. Low end: CoachFit ₹299, GymSupport ₹499. Mid: Fitexo ₹399–899 with biometric in its top tier, ManageGym24 ₹999 (no biometric) / ₹1,999. High: MyGymDesk ₹999–2,999, Fitnexa up to ₹5,999. Almost nobody offers a real free plan, only 7–30 day trials. Biometric is usually the top-tier gate, and Meta's per-message WhatsApp charges are billed on top.
→ **A permanently free plan is our hook.** WhatsApp and the fingerprint reader are what people pay for.

### Proposed plans
| | **Free** | **Pro** (WhatsApp) | **Max** (WhatsApp + Biometric) |
|---|---|---|---|
| Clients, plans, renew, freeze, payments, dues | ✅ unlimited | ✅ | ✅ |
| Receipts (share by hand via the share sheet / wa.me) | ✅ | ✅ | ✅ |
| Dashboard, revenue card, recent activity, push alerts | ✅ | ✅ | ✅ |
| Logins | Owner only | Owner + staff, roles & access control | same |
| Reports | This month, view only | All reports, any date range, PDF/CSV | same |
| WhatsApp automation (welcome, renewal, invoice, expiry, reminder) | 🔒 teaser | ✅ | ✅ |
| WhatsApp chat inbox + message log | 🔒 | ✅ | ✅ |
| Fingerprint reader: door access, auto check-in, door lock on dues | 🔒 | 🔒 | ✅ |
| Staff attendance from reader, late/absent | 🔒 | 🔒 | ✅ |
| Visits calendar on client profile, attendance analytics | 🔒 | 🔒 | ✅ |

The app shows **"Contact us"**, not prices. Suggested internal anchors: Pro ≈ ₹799–999/mo, Max ≈ ₹1,499–1,999/mo plus the reader at cost, with Meta message charges passed through. **The final prices are your call.**

Free = what's on `main` today minus WhatsApp. `main` already sells WhatsApp as "Premium Integration → Contact Setup Team", so this matches what you have now.

### How it's built (small)
- `branches.plan` (`free | pro | max`) + `plan_expires_at` (for trials). You set them yourself (admin script or SQL); no billing system yet.
- Server: `requireFeature('whatsapp' | 'biometric' | 'staff' | 'reports_full')`, next to `requirePermission`. **Enforcing on the server is required**: WhatsApp sends cost real money, and checks done only in the app can be bypassed.
- `/api/gym/info` returns `plan` and `features[]`. The app gets a `useFeature(key)` hook beside `usePermissions()`.
- **Grandfathering:** any gym that already has WhatsApp connected starts on `pro`, so nothing they use today breaks.

---

## 3. Selling Pro inside the app (marketing)

Guidelines:
1. **Show what they're missing, don't block them.** Locked items stay visible with a small `PRO` / `MAX` chip. Tapping one opens a **feature sheet**: one-line benefit, a screenshot, and a **"Talk to us on WhatsApp"** button (prefilled message with the gym name and the feature tapped) plus **Call**. Free workflows are never blocked.
2. **Nudge at the moment it matters, using their own numbers**:
   - Home "Expiring soon (5)" → *"Remind all 5 on WhatsApp automatically"*.
   - Home "Outstanding ₹12,400 from 9 clients" → *"Auto-remind dues every 3 days"*.
   - After collecting a payment → *"Pro sends this receipt on WhatsApp for you"*.
   - Client profile WhatsApp button → opens the in-app chat on Pro, or wa.me plus a one-line teaser on Free.
   - More → Entrance reader → *"Stop entry when fees are due, with no front-desk arguments"* (Max).
   - Adding a second login on Free → *"Add your trainers and front desk with their own access"*.
3. **Only owners see upsells.** Staff can't buy, and it looks unprofessional to show them.
4. **Limit how often nudges appear:** each nudge at most once a week per place, dismissible, and none during onboarding's first 3 days.
5. **A Plans screen** (More → "GymKarta Pro" banner, and from the profile plan badge) comparing the three plans, plus a **14-day Pro trial** started by "Contact us" (you flip `plan_expires_at`).
6. **No invented numbers.** Claims use the gym's own data ("you recovered ₹8,200 through reminders this month"), never made-up industry stats.
7. **Measure it:** `trackEvent` for each nudge shown, tapped and contacted, using the analytics service already in the app.
8. **Referral line** on My Profile ("Share GymKarta with another gym owner"): cheap, word-of-mouth growth.

---

## 4. Your 9 points, area by area

### 4.1 Dashboard (depends on access)
Keep what's there; the work is gating by permission, not adding things.
- **Keep the purple RevenueCard** (`dashboard.revenue`). Users without that permission see the same purple card showing **"My collections today"** instead (`payments.collected_by_user_id` is already in the schema).
- **From CoreWave's dashboard, bring only the Recent activity list.** No KPI tile row.
- Alert cards: Expiring soon/today and Recently expired need `clients.view`. Outstanding needs `clients.collect`. Amounts are hidden without `dashboard.revenue`.
- TopSellingPlan / StatGrid / WhatsAppWidget: shown only with `dashboard.revenue`. The WhatsApp widget becomes a Pro teaser on Free.
- The add button expands into **Add client / Renew**, each item shown only with `clients.create` / `clients.renew`.

### 4.2 My Profile (top-left avatar): rewrite
It returns to the **old gradient hero with the card overlapping it** (indigo gradient, avatar, name, card at `-28` from `AccountScreen` in commit `1e2db8a`), but shows only the **person**, not the gym:
- **Hero:** photo (tap to change), name, role chip, gym name in small text.
- **Card 1, Account:** Name (edit), Phone (read-only), Change / Set password.
- **Card 2, Preferences:** Dark mode switch, Push notifications (the per-user alert toggles move here from Settings).
- **Card 3, Plan (owner only):** "Free plan · See plans" / "Pro · renews 12 Jan".
- **Card 4, Help:** Help center, Chat with support (WhatsApp), Share GymKarta, Terms & Privacy.
- **Log out** as a separate red row, then the version footer.

### 4.3 What goes where
| Item | Home avatar → **My Profile** | **More** tab | More → **Settings** |
|---|---|---|---|
| Name, photo, password | ✅ | | |
| Dark mode, my push alerts | ✅ | | |
| Help, support, terms, share app, log out, version | ✅ | | |
| Plan badge / Plans screen | ✅ (badge) | ✅ (banner) | |
| Gym info card (logo, name, address, edit) | | ✅ top | |
| Staff, Attendance, Reports, Entrance reader, Memberships | | ✅ tiles (with PRO/MAX chips when locked) | |
| Receipts, WhatsApp, Automatic messages, Access control, Data export | | | ✅ |

### 4.4 Settings: what CoreWave has, what the app needs
| CoreWave Settings | App today | Plan |
|---|---|---|
| Branch (info + receipt logo/signature/footer) | Gym info + Receipt settings | Keep. The receipt row is already moving into Settings (you're editing this now). |
| Memberships | ✅ More → Memberships | Keep |
| Access control | ✅ | Keep; permission keys aligned (section 1) |
| Entrance device | ✅ More → Entrance reader | Keep in More (Max) |
| WhatsApp: Automatic messages (Welcome, Renewal confirmation, Send invoice with message, Expiry, Reminder N days before) | `NotificationSetting` has 4 of them | Add **"Send invoice with the message"** and the **reminder days** picker; rename it "Automatic messages" |
| WhatsApp credentials | Self-serve connect screen | Keep self-serve (CoreWave keeps it to its developer admin) |
| WhatsApp templates manager | — | Not needed until broadcast exists |
| Lockers, Branches | — | **Skip** (one phone = one gym, no lockers) |
| Client export (PDF / Excel) | — | **Add** under Settings → Data, Pro |

UI/UX rules for Settings: grouped sections with small caps titles. One row leads to one screen. Inline switches only where the change takes effect immediately. Rows the user has no permission for are hidden; rows locked by plan are shown with a chip. Destructive actions go last.

### 4.5 Client profile: build on the current UI
Keep the current `ClientDetails.tsx` look (gradient header). Add CoreWave behavior inside it:
- **Must have:** Upgrade (server ready; needs its screen back), Clear balance (collect sheet prefilled with the full due), View bill + **Send on WhatsApp** (Pro), WhatsApp button opening the in-app thread (Pro), activity filter chips (Membership / Payment / Freeze / Edits / WhatsApp).
- **Max only:** fingerprint card (enroll / re-enroll, door lock reason) and the Visits month calendar.
- **Also:** edit/delete invoice (`data.delete`), ported from CoreWave's `EditInvoice`. Balance ledger, remarks and ban stay out.
I'll go through it on the simulator and propose small layout changes one at a time, not a rewrite.

### 4.6 WhatsApp: chat + report (Pro)
- Chat: styled like WhatsApp (wallpaper, bubbles, delivery ticks, Today/Yesterday separators), loading older messages on scroll up, opening from a client profile.
- Report tab: message log + summary (outbound only), date range, export.
- **Broadcast** is deferred to a later phase.

---

## 5. Order of work
Each step is a self-contained chunk. After each one: both typechecks, then a simulator walk-through as **owner** and as a **staff role** (and as a Free gym once plans exist).

1. ✅ **Foundations** (branch `gymkarta-phase-3`, 24 Nov): CoreWave permission keys (`clients.archive`, `settings.branch`, `data.delete`) + migration 0004; `branches.plan` / `plan_expires_at` with grandfathering; `requireFeature` on WhatsApp, staff, roles, reader and older reports; staff logins off on Free; `subscription` in gym info; `useFeature`, `PlanChip`, `PremiumSheet`; `npm run plan`; `server/notes/api-parity.md`. CoreWave's `bill.joining_date` / `bill.billing_date` / `bill.adjust_trial` are **not** added yet: each is added together with the screen that enforces it, so Access control never shows a tick that does nothing.
2. **My Profile rewrite** + moving items between Profile, More and Settings.
3. **Dashboard** permission gating + "My collections" variant + add button.
4. **Settings parity:** Automatic messages, data export, receipts moved.
5. **Client profile** additions.
6. **WhatsApp** chat polish + report.
7. **Upsell placements** + Plans screen + analytics events.

## 6. Decisions (answered 24 Nov 2026)
1. **Removed Phase 2 UI was intentional.** Start from the current client profile and Home. Upgrade gets a new screen in the current style.
2. **CoreWave code may be copied freely.** Port files and UI directly where they fit.
3. **The add button expands** into Add client / Renew, each shown only with its permission.
4. **Staff logins + roles are Pro only.** Free = owner login.
5. **Broadcast comes later**, not in this phase.
6. **Client profile extra: invoice edit/delete only** (`data.delete`). No balance ledger, remarks or ban for now.
7. **"Talk to us" uses the Help center number** (+91 93544 54113), kept in one constant shared by both screens.
8. **Simulator testing:** run GymKarta's Metro on **8082**. Leave Respark's Metro on 8081 alone; switching the simulator to GymKarta while testing is fine.

Sources for pricing: [CoachFit](https://www.coachfit.in/), [GymSupport](https://gymsupport.in/gym-management-software), [Fitexo](https://www.fitexo.in/), [ManageGym24](https://www.managegym24.com/), [MyGymDesk](https://mygymdesk.in/), [Gym Manager](https://www.gymanager.in/), [Torzil](https://www.torzil.com/blog/affordable-gym-management-software), [Fitnexa (Capterra)](https://www.capterra.in/software/1323534/Fitnexa).
