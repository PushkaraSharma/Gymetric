# Self-Service Onboarding & WhatsApp Premium Plan

> Created: 2026-02-15
> Status: Planning

---

## Problem Statement

### Current Pain Points
1. **Developer dependency for onboarding**: A developer must manually call `POST /api/auth/setup` with `gymName`, `contactNumber`, `adminName`, `username`, `password` to create the first (and only) user and gym. The gym owner cannot self-onboard.
2. **WhatsApp requires manual developer setup**: The `Settings` model stores `accessToken` and `phoneNumberId` from the Facebook/WhatsApp Business API — these are currently manually configured by a developer.

### Current Architecture
- **Server**: Fastify + MongoDB (Mongoose), JWT-based auth
- **Frontend**: React Native (Expo) with MMKV for local storage
- **Auth flow**: `setupGymAndAdmin()` → manual API call by dev → `loginAdmin()` → username/password → JWT
- **Navigation**: Onboarding slides → Login (username/password) → Main app
- **WhatsApp**: Direct Meta Cloud API integration (`graph.facebook.com/v22.0`), credentials stored in `Settings` model

### Key Files
| File | Purpose |
|---|---|
| `server/src/routes/auth.ts` | Auth routes: `/setup`, `/login`, `/reset-password` |
| `server/src/controllers/authController.ts` | `setupGymAndAdmin`, `loginAdmin`, `resetPassword` |
| `server/src/models/User.ts` | User model: `username`, `passwordHash`, `role`, `gymId` |
| `server/src/models/Gym.ts` | Gym model: `name`, `address`, `ownerName`, `contactNumber`, `email`, `logo` |
| `server/src/models/Settings.ts` | Settings model: whatsapp config (`accessToken`, `phoneNumberId`, toggles) |
| `server/src/middleware/authenticate.ts` | JWT verification middleware |
| `server/src/services/Whatsapp.ts` | WhatsApp template message sender via Meta Cloud API |
| `frontend/.../screens/LoginScreen.tsx` | Username/password login UI |
| `frontend/.../screens/OnboardingScreen.tsx` | App onboarding slides (feature intro) |
| `frontend/.../navigators/AppNavigator.tsx` | Navigation: Onboarding → Login → Main |

---

## Phase 1: Self-Service Onboarding (Phone OTP)

### Goal
Replace developer-dependent setup with a user-friendly, self-service onboarding flow using phone number + OTP.

### Recommended OTP Provider: Firebase Phone Auth
- **Free** for 10K SMS/month (Spark plan) — more than enough for gym app scale
- Handles OTP sending + verification automatically
- Great React Native support via `@react-native-firebase/auth`
- No need to manage OTP storage/expiry on our server
- Falls back to reCAPTCHA for abuse prevention

#### Alternative OTP Providers (for reference)
| Provider | Cost | Notes |
|---|---|---|
| Firebase Auth (Phone) | Free 10K/month | **Recommended** — simplest, free |
| Twilio Verify | ~$0.05/verification | Industry standard |
| MSG91 | ~₹0.18/SMS | India-focused |
| 2Factor.in | ~₹0.10/SMS | Budget India provider |

### New User Flow
```
┌─────────────────────────────────────────────────┐
│  App Onboarding Slides (existing)               │
│         ↓                                        │
│  Phone Number Input Screen                       │
│         ↓                                        │
│  OTP Verification Screen (Firebase sends SMS)    │
│         ↓                                        │
│  [IF NEW USER] Gym Details Form                  │
│    - Gym Name (required)                         │
│    - Owner Name (required)                       │
│    - Gym Address (optional)                      │
│    - Set a PIN/Password (for quick re-login)     │
│         ↓                                        │
│  Backend creates Gym + User → Issues JWT         │
│         ↓                                        │
│  Dashboard                                       │
│                                                  │
│  [IF RETURNING USER]                             │
│  OTP verified → Backend finds user by phone      │
│  → Issues JWT → Dashboard                        │
└─────────────────────────────────────────────────┘
```

### Returning User Flow
```
┌─────────────────────────────────────────────────┐
│  Option A: Phone + OTP (always works)            │
│  Enter Phone → OTP → Verified → JWT → Dashboard │
│                                                  │
│  Option B: Phone + PIN (convenience, offline)    │
│  Enter Phone → Enter PIN → Verified → Dashboard │
└─────────────────────────────────────────────────┘
```

### API Changes

#### New Endpoints
```
POST /api/auth/send-otp
  Body: { phoneNumber: "+91XXXXXXXXXX" }
  Response: { success: true }
  Note: Firebase handles OTP sending from the client-side SDK directly.
        This endpoint may not be needed if using Firebase client SDK.

POST /api/auth/verify-otp
  Body: { firebaseIdToken: "..." }
  Response:
    - Existing user: { success: true, isNewUser: false, token: "jwt...", data: { ... } }
    - New user:      { success: true, isNewUser: true }
  Note: Server verifies Firebase ID token using Firebase Admin SDK.
        Looks up user by phone number.

POST /api/auth/onboard
  Body: { firebaseIdToken: "...", gymName: "...", ownerName: "...", gymAddress: "...", pin: "1234" }
  Response: { success: true, token: "jwt...", data: { ... } }
  Note: Creates Gym + User, issues JWT.

POST /api/auth/pin-login
  Body: { phoneNumber: "+91XXXXXXXXXX", pin: "1234" }
  Response: { success: true, token: "jwt...", data: { ... } }
  Note: Convenience login without OTP.
```

#### Deprecated Endpoints (remove eventually)
```
POST /api/auth/setup     → replaced by /onboard
POST /api/auth/login     → replaced by /verify-otp + /pin-login
```

### Model Changes

#### User Model (updated)
```typescript
const UserSchema = new mongoose.Schema({
    phoneNumber: { type: String, unique: true, required: true },  // NEW: primary identifier
    firebaseUid: { type: String, unique: true, sparse: true },    // NEW: Firebase UID
    username: { type: String, unique: true, sparse: true },       // KEEP for backward compat
    passwordHash: { type: String, default: null },                 // KEEP for backward compat
    pinHash: { type: String, default: null },                      // NEW: for PIN-based login
    role: { type: String, enum: ['admin', 'staff'], required: true },
    permissions: { type: [String], default: [] },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
```

#### Gym Model (no changes needed)
Current schema is sufficient.

### Frontend Changes

#### New Screens
1. **PhoneInputScreen** — Enter phone number, trigger OTP
2. **OTPVerificationScreen** — Enter 6-digit OTP
3. **GymOnboardingScreen** — Gym details form (only for new users)
4. **SetPinScreen** — Set a 4-6 digit PIN for quick login

#### Updated Navigation Flow
```typescript
// AppNavigator.tsx — new flow
{!hasSeenOnboarding ? (
  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
) : authToken ? (
  // ... existing authenticated screens
) : (
  <>
    <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
    <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    <Stack.Screen name="GymOnboarding" component={GymOnboardingScreen} />
    <Stack.Screen name="SetPin" component={SetPinScreen} />
  </>
)}
```

### Dependencies to Add

#### Server
```
firebase-admin    — verify Firebase ID tokens on the server
```

#### Frontend (React Native / Expo)
```
@react-native-firebase/app
@react-native-firebase/auth
```

### Implementation Steps
1. Set up Firebase project + enable Phone Auth
2. Add `firebase-admin` to server, initialize with service account
3. Update User model with `phoneNumber`, `firebaseUid`, `pinHash`
4. Create new auth endpoints: `/verify-otp`, `/onboard`, `/pin-login`
5. Build frontend screens: PhoneInput → OTP → GymOnboarding → SetPin
6. Update `AppNavigator` with new auth flow
7. Migration: existing users — add phone number mapping
8. Test end-to-end flow
9. Deprecate old `/setup` and `/login` endpoints

---

## Phase 2: WhatsApp as Premium Feature

### Goal
Make WhatsApp Business API integration available as a premium/paid feature, ideally self-service.

### WhatsApp Onboarding Challenge
The gym owner needs:
- A Facebook Business account
- A registered phone number for WhatsApp Business API
- Facebook sends an OTP to verify that number
- This produces `accessToken` and `phoneNumberId`

### Three Approaches (from simplest to most polished)

#### Option A: Manual Setup with In-App Guide (Start Here) ✅
- In-app guided walkthrough with screenshots/videos
- Teaches gym owner to create Facebook Business account, set up WhatsApp Business API
- They paste `accessToken` and `phoneNumberId` into a settings screen
- Server validates by making a test API call to Meta

**Pros**: No extra integration, no BSP costs
**Cons**: Complex for non-technical gym owners

#### Option B: Use a BSP (Business Solution Provider)
Use Gupshup, 360dialog, or Wati:
- They provide APIs and often Embedded Signup
- They handle the Meta relationship
- You integrate their API

**Pros**: Simpler than direct Meta, often provide Embedded Signup
**Cons**: Extra per-message cost on top of Meta pricing

| BSP | Pricing | Notes |
|---|---|---|
| Gupshup | ₹0.50-1/msg + Meta fees | Popular in India |
| 360dialog | €49/month + Meta fees | Global, self-service |
| Wati | ₹2499/month | All-in-one, includes UI |

#### Option C: Meta Embedded Signup (Most Polished, Long-term)
- Embed Meta's signup widget in a WebView
- Gym owner logs in to Facebook, selects/creates WhatsApp Business Account
- Meta sends back `accessToken` and `phoneNumberId` via webhook
- Fully self-service, premium experience

**Pros**: Best UX, fully self-service
**Cons**: Requires Meta app approval as BSP or Tech Provider

### Recommended Progression
1. **Now**: Option A (manual guide) — unblock premium users immediately
2. **Soon**: Option B (BSP like Gupshup) — simplify for Indian market
3. **Later**: Option C (Embedded Signup) — premium self-service experience

### Paywall Implementation
- Add a `plan` or `subscription` field to Gym model
- WhatsApp settings section conditionally shows:
  - **Free users**: "Upgrade to Premium to enable WhatsApp notifications"
  - **Premium users**: WhatsApp setup wizard
- Payment: Razorpay (India) or Stripe (global) or in-app purchases

---

## Open Questions (To Decide Before Implementation)
1. **Firebase Phone Auth** — confirmed as OTP provider? (free, simplest)
2. **Keep username/password?** — as secondary login, or go fully phone+OTP/PIN?
3. **WhatsApp approach** — start with Option A (manual guide)?
4. **Payment gateway** — Razorpay? Stripe? In-app purchases?
5. **Multi-user support** — should the gym owner be able to invite staff users later? (affects User model design)

---

## Priority Order
1. ✅ Phase 1: Self-service phone OTP onboarding (HIGH PRIORITY)
2. ⏳ Phase 2: WhatsApp premium paywall (MEDIUM PRIORITY — after Phase 1)
