# GymKarta (Gymetric) — Application Context

> **Purpose:** Single source of truth for any AI tool, developer, or automation outside Cursor.  
> **Last updated:** June 2026  
> **Product name:** GymKarta (internal package: `gymkarta`, repo folder: `Gymetric`)

---

## 1. What This Product Is

GymKarta is a **gym membership management app for gym owners/admins** in India. Owners use it to:

- Onboard and manage gym members (clients)
- Create membership plans (pricing, duration)
- Track revenue and payments
- Renew memberships and handle expirations
- Automate WhatsApp notifications (premium feature: reminders, welcome messages, expiry alerts)
- View a business dashboard (members, revenue, activity)

**Target user:** Single gym owner or admin (multi-staff not yet supported).

**Branding:** App store name "GymKarta", bundle ID `com.indieroots.gymetric`, terms at `https://gymkarta.indieroots.in/terms`.

---

## 2. Repository Structure

```
Gymetric/
├── frontend/Gymetric/     # Expo/React Native mobile app (primary UI)
├── server/                # Fastify + MongoDB API
├── .github/workflows/     # CI + daily membership expiry cron
├── .agent/plans/          # Internal planning docs
├── .cursor/plans/         # Cursor implementation plans
├── APP_CONTEXT.md         # This file
└── README.md              # Minimal (title only)
```

---

## 3. Tech Stack

### Frontend (`frontend/Gymetric/`)

| Layer | Technology |
|-------|------------|
| Framework | Expo ~54, React Native 0.81, React 19 |
| Navigation | React Navigation 7 — bottom tabs + native stack |
| State | Redux Toolkit (`app/redux/state/GymStates.tsx`) |
| Storage | MMKV (`react-native-mmkv`) — auth token, theme, flags |
| Auth | Firebase Auth (phone OTP) + password login via backend |
| UI | Custom theme (`app/theme/`), Lucide icons, Moti animations, Gorhom bottom sheet |
| Networking | Apisauce wrapper (`app/services/Api.ts`) |
| Analytics | Firebase Analytics (frontend-only, manual events) |
| Crash reporting | Firebase Crashlytics (frontend) |
| App review | `expo-store-review` (native OS dialog, not custom popup) |
| Build | EAS, dev client required for Firebase + store review |

**Entry:** `index.tsx` → `app/app.tsx` → `AppNavigator`

### Backend (`server/`)

| Layer | Technology |
|-------|------------|
| Server | Fastify 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Uploads | Cloudinary |
| Cache | `node-cache` (dashboard summary, client lists) |
| Cron | GitHub Actions → `POST /api/system/run-expiry-check` |
| Errors | Sentry (`@sentry/node`) |
| WhatsApp | Custom service (`src/services/Whatsapp.ts`) |

**API prefixes:** `/api/auth`, `/api/client`, `/api/membership`, `/api/dashboard`, `/api/gym`, `/api/settings`, `/api/upload`, `/api/system`

### Data Models (MongoDB)

| Model | Purpose |
|-------|---------|
| `Gym` | Gym business profile (name, address, logo, owner) |
| `User` | Admin user account |
| `Client` | Gym member with membership status, payment history |
| `Memberships` | Plan templates (name, price, duration) |
| `AssignedMembership` | Active/upcoming membership instance for a client |
| `Activity` | Audit log (onboarding, renewal, expiry, payment) — 90-day TTL |
| `Settings` | WhatsApp notification toggles per gym |

**Client membership statuses:** `active`, `expired`, `trial_expired`, `future`, `trial`, `inactive`

---

## 4. Navigation Architecture

```
AppNavigator (Native Stack)
├── [First launch] OnboardingScreen
├── [Unauthenticated]
│   ├── PhoneLoginScreen
│   ├── OTPVerificationScreen
│   ├── GymOnboardingScreen (new users)
│   └── PasswordLoginScreen
└── [Authenticated]
    ├── Main (Bottom Tabs)
    │   ├── Home          → Dashboard
    │   ├── Clients       → ClientsList (filters: All, Active, Expired, Expiring Soon, Trial, Inactive)
    │   └── Setting       → Settings hub
    └── Stack screens:
        Add Client, Client Profile, Update Basic Information
        Renew Membership, Search Client (modal)
        Memberships, Create Edit Membership
        Business Profile, Help Center, Notification Settings
        WhatsApp Premium, Revenue, Change Password
```

**Auth gate:** MMKV keys `hasSeenOnboarding` and `authToken` in `AppNavigator.tsx`.

**No side drawer.** Profile, dark mode, and logout live in Settings (as of UI overhaul).

---

## 5. Key Screens & Files

| Screen / Area | Path |
|---------------|------|
| Root app | `frontend/Gymetric/app/app.tsx` |
| Navigation | `app/navigators/AppNavigator.tsx`, `MainNavigator.tsx` |
| Dashboard (Home) | `app/screens/Home/Home.tsx` |
| Settings | `app/screens/Setting/Setting.tsx` |
| Clients list | `app/screens/Clients/ClientsList.tsx` |
| Client onboarding | `app/screens/Clients/ClientOnboarding.tsx` |
| Revenue detail | `app/screens/Revenue/Revenue.tsx` |
| API client | `app/services/Api.ts` |
| Redux | `app/redux/state/GymStates.tsx` |
| Theme | `app/theme/context.tsx`, `app/theme/colors.ts` |
| Dashboard API | `server/src/controllers/dashboardController.ts` |
| Client API | `server/src/controllers/clientController.ts` |
| Server entry | `server/app.ts` |
| Expo config | `frontend/Gymetric/app.config.ts` |

---

## 6. Dashboard (Home Tab) — Current Behavior

### Layout (top to bottom)

1. **DashboardHeader** — gym logo + "WELCOME BACK" + greeting + owner name
2. **QuickActions** — Add Client | Search | Revenue (horizontal chips)
3. **GetStartedCard** — onboarding checklist if setup incomplete (plan, client, WhatsApp)
4. **ActionAlertCard — Expiring Soon** — if `expiringIn7Days > 0` → View Members / Reminders
5. **ActionAlertCard — Expired Members** — if `expiredMembers > 0` → Re-engage (Expired filter)
6. **WhatsAppBanner** — upsell if WhatsApp not configured (once per session)
7. **RevenueCard** — MTD revenue, trend, retention %, avg revenue per member → taps to Revenue screen
8. **StatGrid (2×2)** — Active Now | Expired | Expiring Soon | New Joinees
9. **RevenueTrendChart** — last 6 months bar chart inline
10. **ActivityFeed** — last 10 activities
11. **FAB** — + Add Client

### Dashboard API — `GET /api/dashboard/summary`

**Controller:** `server/src/controllers/dashboardController.ts`  
**Cached** via `node-cache` (key: `dashboard_summary:{gymId}`)

**Response fields:**

```typescript
{
  totalClients: number
  activeMembers: { value: number; trend: number | null; comparisonText: string }
  expiredMembers: number
  expiringIn7Days: number
  expiringMembersList: { _id: string; name: string; daysLeft: number }[]  // top 5
  retentionRate: number          // (active / totalClients) * 100
  avgRevenuePerMember: number    // revenueThisMonth / activeMembers
  revenueTrend: { label: string; amount: number }[]  // last 6 months
  revenueThisMonth: { value: number; trend: number | null; comparisonText: string }
  newlyJoinedThisMonth: { value: number; trend: number | null; comparisonText: string }
  activities: Activity[]       // last 10
}
```

**Revenue detail API:** `GET /api/dashboard/revenue` — 6-month chart, payment method breakdown, recent 20 transactions.

---

## 7. Settings — Current Behavior

**File:** `app/screens/Setting/Setting.tsx`

| Section | Contents |
|---------|----------|
| **Profile card** (tappable) | Gym logo, name, address, owner username + role → opens **Business Profile** |
| **Account & Security** | Manage Membership, Change Password |
| **Notifications** | WhatsApp settings (if configured) OR Connect WhatsApp upsell |
| **App Preferences** | Dark mode toggle (MMKV-persisted via `setThemeContextOverride`) |
| **Support** | Help Center, Terms of Service |
| **Footer** | Logout (confirmation modal), app version |

**Note:** Business Profile was removed as a separate row from Account section — profile card opens it directly (product decision during overhaul).

---

## 8. UI Patterns (Post-Overhaul)

Reference style: **RentVelo** (`/Users/pushkarasharma/Desktop/Personal/RentVelo/RentVelo`) — grouped settings, card-based dashboard, no drawer.

### Card styling convention

```typescript
backgroundColor: colors.surface
borderRadius: 16–20
borderWidth: 1, borderColor: colors.border
uppercase labels: 10–12px, letterSpacing: 1, fontWeight: '700'
```

### Dashboard components (`app/components/dashboard/`)

| Component | File |
|-----------|------|
| DashboardHeader | `DashboardHeader.tsx` |
| RevenueCard | `RevenueCard.tsx` |
| StatGrid | `StatGrid.tsx` |
| RevenueTrendChart | `RevenueTrendChart.tsx` |
| ActionAlertCard | `ActionAlertCard.tsx` |
| GetStartedCard | `GetStartedCard.tsx` |
| ActivityFeed | `ActivityFeed.tsx` |
| QuickActions | `QuickActions.tsx` |
| WhatsAppBanner | `WhatsAppBanner.tsx` |

### Shared components

| Component | Path |
|-----------|------|
| ConfirmationModal | `app/components/common/ConfirmationModal.tsx` |
| Screen, Header, Text, Button, TextField | `app/components/` |

### Theming

- `useAppTheme()` hook from `app/theme/context.tsx`
- Light/dark via MMKV + `setThemeContextOverride('light' | 'dark')`
- ThemedStyle pattern: `themed($styleFn)` where `$styleFn: ThemedStyle<T> = ({ colors, spacing }) => ({...})`

---

## 9. Changes Completed (UI Overhaul — June 2026)

### Phase 1 — Cleanup

**Deleted files:**
- `app/screens/LoginScreen.tsx` (replaced by Auth flow)
- `app/screens/Home/SideDrawer.tsx` (moved to Settings)
- `app/components/DrawerIconButton.tsx`, `Card.tsx`, `AutoImage.tsx`, `HeaderbackButton.tsx`
- `app/utils/useHeader.tsx`, `app/utils/crashReporting.ts`
- Entire `app/i18n/` folder (16 files) — app is **English-only** now
- `.maestro/flows/FavoritePodcast.yaml` (Ignite demo test)

**Removed dependencies:**
- `react-native-drawer-layout`
- `i18next`, `react-i18next`, `intl-pluralrules`

**Removed from components:** All `tx` / i18n translation props from Text, Header, Button, TextField, Toggle, ListItem.

### Phase 2 — Drawer → Settings

- Removed `Drawer` wrapper and hamburger menu from `Home.tsx`
- Settings redesigned with profile card, grouped sections, dark mode, logout confirmation

### Phase 3–5 — Dashboard

- Extracted 9 dashboard components (see section 8)
- Added actionable alert cards (expiring soon, expired members, get started)
- Added quick actions row
- Stat grid: Active / Expired / Expiring Soon / New Joinees (no "upcoming" — rare use case)

### Phase 4 — Backend

Extended `getDashboardSummary` with: `expiredMembers`, `retentionRate`, `avgRevenuePerMember`, `revenueTrend`, `expiringMembersList`.

### Phase 6 — App Review + Analytics

**New services:**

| Service | Path | Purpose |
|---------|------|---------|
| storeReviewService | `app/services/storeReviewService.ts` | Native review after 3 positive actions, ≥1 month between prompts |
| analyticsService | `app/services/analyticsService.ts` | Firebase Analytics, dev-guarded |
| crashlyticsService | `app/services/crashlyticsService.ts` | Firebase Crashlytics |

**New config:** `frontend/Gymetric/firebase.json` — disables auto-collection; manual screen tracking only.

**Store review triggers:**
- Client onboarded (`ClientOnboarding.tsx`)
- Membership renewed (`RenewMembership.tsx`)
- Membership plan created — first time only (`CreateEditMembership.tsx`)

**Analytics events:**

| Event | When |
|-------|------|
| `app_opened` | App launch (`app.tsx`) |
| `screen_view` | Navigation state change (`AppNavigator.tsx`) |
| `sign_in` | OTP, password, or gym onboarding success |
| `sign_out` | Settings logout |
| `client_added` | Client onboarding success |
| `membership_renewed` | Renewal success |
| `membership_plan_created` | Plan created (not update) |
| `dashboard_stat_tapped` | Stat card tapped on dashboard |
| `dark_mode_toggled` | Settings dark mode switch |

**User properties:** `gym_id`, `total_clients`, `active_members`, `has_whatsapp`, `gym_segment`, `dark_mode`, `app_version`, `platform`, `username`

**Analytics decision:** Frontend Firebase Analytics only (matches RentVelo). No backend event logging for product analytics. Backend Sentry kept for server errors only.

**Added dependencies:**
- `expo-store-review`
- `@react-native-firebase/analytics`
- `@react-native-firebase/crashlytics`

**Expo plugins added in `app.config.ts`:** analytics, crashlytics, expo-store-review

---

## 10. WhatsApp Integration

- Settings model stores notification toggles: onboarding, renewal, expiry, reminder (+ reminder days)
- `NotificationSetting.tsx` — configure when WhatsApp is connected
- `WhatsAppPremium.tsx` — upsell/marketing when not connected
- Backend cron + `Whatsapp.ts` service sends automated messages on expiry
- Dashboard banner prompts connection once per session if not configured

---

## 11. Auth Flow

1. **New user:** Phone OTP (Firebase) → verify with backend → Gym Onboarding (name, address, password) → JWT stored in MMKV
2. **Returning user:** Phone OTP or Password login → JWT
3. **Token:** Stored as `authToken` in MMKV, sent as `Authorization: Bearer` header
4. **401:** Auto-clears token, shows session expired toast

---

## 12. Client / Membership Business Rules

- Clients can only be **deleted** if membership is `expired` or `trial_expired`
- **Expiring Soon** filter: active members with no `upcomingMembership` and plan ending within 7 days
- Daily cron updates membership statuses and can trigger WhatsApp expiry notifications
- Renewal creates new `AssignedMembership`; payment recorded in `Client.paymentHistory`
- Dependents supported during onboarding/renewal

---

## 13. Environment & Build Notes

### Frontend

- Firebase: `google-services.json` (Android), `GoogleService-Info.plist` (iOS) — referenced in `app.config.ts`
- API URL: `app/config/` (dev vs prod)
- **Dev client required** for Firebase Analytics, Crashlytics, and store review (won't work in Expo Go)
- After adding Firebase plugins: run `npx expo prebuild --clean` then `npx expo run:ios` / `run:android`
- Analytics disabled in `__DEV__` — logs to console only

### Backend

- Env vars in `server/.env` (MongoDB URI, JWT secret, Cloudinary, Firebase admin, WhatsApp, Sentry)
- Start: from `server/` directory

---

## 14. Suggested Future Improvements (Not Yet Implemented)

Priority recommendations from product analysis (Phase 7 of overhaul plan):

| # | Improvement | Why |
|---|-------------|-----|
| 1 | **Expired filter polish** | Filter exists in Clients tab; ensure all dashboard CTAs land correctly and copy is consistent |
| 2 | **Revenue screen as drill-down** | Mini-chart now on dashboard; Revenue screen should focus on payment methods + transactions |
| 3 | **Bulk WhatsApp reminders** | "Send expiry reminders to all N members" from dashboard alert — high ROI for premium |
| 4 | **Multi-staff / roles** | Single owner today; gyms will need staff accounts with limited permissions |
| 5 | **Offline / optimistic UI** | App is API-dependent; poor gym WiFi needs retry/queue patterns |
| 6 | **Member self-service portal** | Let members check expiry / renew via link — reduces owner workload |
| 7 | **Win-back WhatsApp templates** | Cron handles expiry; add automated re-engagement for expired members |
| 8 | **Onboarding analytics funnel** | Track drop-off: OTP → gym setup → first client → first plan |
| 9 | **Privacy mode** | Mask revenue on dashboard (RentVelo pattern) for shared front-desk use |
| 10 | **What's New modal** | Show on OTA version bump (RentVelo `WhatsNewModal` pattern) |
| 11 | **Today's collections widget** | Real-time or same-day payment summary on dashboard |
| 12 | **`whatsapp_connected` event** | Analytics event defined but not yet fired when WhatsApp is configured |
| 13 | **Self-service onboarding** | See `.agent/plans/self-service-onboarding-plan.md` for planned gym owner self-signup flow |

### Deferred dashboard features

- Bulk WhatsApp from dashboard (needs backend batch endpoint)
- Churn prediction / cohort analysis
- Upcoming members stat (intentionally excluded — rare workflow)

---

## 15. Known Technical Debt / Leftovers

| Item | Location | Notes |
|------|----------|-------|
| `Helper.js.bak`, `Constants.js.bak` | `server/src/utils/` | Backup files, can delete |
| Manual test scripts | `server/src/tests/` | Not in CI |
| `expo-localization` plugin | `app.config.ts` | Still in plugins; i18n removed — can remove plugin if unused |
| Ignite README references | `frontend/Gymetric/README.md` | Still mentions deleted Ignite components |
| Maestro flows | `.maestro/` | May need update after i18n/login removal |
| Server `getClientStats` | `GET /api/client/stats` | Exists but dashboard uses extended summary instead |

---

## 16. Reference Project — RentVelo

UI/UX patterns were ported from RentVelo (landlord/rent management app):

**Path:** `/Users/pushkarasharma/Desktop/Personal/RentVelo/RentVelo`

**Patterns borrowed:**
- Bottom tabs only (no drawer)
- Grouped settings with profile card + inline toggles
- Dashboard action cards with CTAs (`PendingAlert`, `GetStartedCard`)
- `expo-store-review` native dialog (not custom popup)
- Frontend-only Firebase Analytics with dev guard
- `ConfirmationModal` for destructive actions
- Card styling (surface, border, uppercase labels)

**Key RentVelo files for reference:**
- `src/screens/settings/SettingsScreen.tsx`
- `src/screens/dashboard/DashboardScreen.tsx`
- `src/services/storeReviewService.ts`
- `src/services/analyticsService.ts`
- `src/components/dashboard/PendingAlert.tsx`, `GetStartedCard.tsx`, `CollectionTrends.tsx`

---

## 17. Related Planning Documents

| Document | Path |
|----------|------|
| UI overhaul plan (implemented) | `.cursor/plans/gymetric_ui_overhaul_488fcd4d.plan.md` |
| Self-service onboarding (planned) | `.agent/plans/self-service-onboarding-plan.md` |

---

## 18. Quick Commands

```bash
# Frontend
cd frontend/Gymetric
npm install
npm run compile          # TypeScript check
npx expo start --dev-client
npx expo run:ios
npx expo run:android

# Backend
cd server
npm install
npm run dev              # or node/tsx per package.json scripts
```

---

## 19. Summary for AI Tools

**When working on this codebase:**

1. **Product:** Gym owner admin app — members, memberships, revenue, WhatsApp automation.
2. **No drawer, no i18n** — settings hold profile/theme/logout; English only.
3. **Dashboard is actionable** — alert cards drive owner to renew, re-engage, or complete setup.
4. **Analytics/review are frontend-only** — Firebase + expo-store-review; disabled in dev.
5. **UI reference:** RentVelo patterns in `app/components/dashboard/` and `Setting.tsx`.
6. **Backend changes** go in `server/src/controllers/`; dashboard summary is the main metrics endpoint.
7. **Don't recreate deleted files** (SideDrawer, i18n, LoginScreen, Ignite boilerplate).
8. **Check `.agent/plans/`** for in-progress product plans before large feature work.

---

*This document should be updated whenever major architectural or product changes ship.*
