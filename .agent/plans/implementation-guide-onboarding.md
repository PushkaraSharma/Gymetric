# Self-Service Onboarding Implementation Guide

> **Objective**: Replace the developer-dependent onboarding with a smooth, self-service Phone OTP flow.
> **Priority**: High
> **Tech Stack**: React Native (Expo) + Firebase Auth (Frontend), Fastify + MongoDB + Firebase Admin (Backend)

---

## 1. Architecture & Schema Changes

### Backend Dependencies
*   **`firebase-admin`**: Required to verify the ID tokens sent from the client.

### User Model Updates (`server/src/models/User.ts`)
We need to shift from `username` to `phoneNumber`.

```typescript
const UserSchema = new mongoose.Schema({
    // NEW FIELDS
    phoneNumber: { type: String, unique: true, required: true }, // E.164 format (e.g., +919999999999)
    firebaseUid: { type: String, unique: true, sparse: true },   // Link to Firebase Auth User
    
    // EXISTING FIELDS (Maintain backward compatibility for now)
    username: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, default: null },               // Used for password-based login
    
    // EXISTING ROLE/GYM FIELDS
    role: { type: String, enum: ['admin', 'staff'], required: true },
    permissions: { type: [String], default: [] },
    gymId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gym', required: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
```

---

## 2. API Specifications (`server/src/routes/auth.ts`)

### A. Login / Check User status
**Endpoint**: `POST /api/auth/verify-otp`
**Purpose**: Called after looking up the user via Firebase on the client. Checks if this phone number already exists in *our* DB.

*   **Request**:
    ```json
    {
      "firebaseIdToken": "eyJhbG..." 
    }
    ```
*   **Response (Existing User)**:
    ```json
    {
      "success": true,
      "isNewUser": false,
      "token": "jwt_access_token",
      "user": { ... }
    }
    ```
*   **Response (New User)**:
    ```json
    {
      "success": true,
      "isNewUser": true
    }
    ```

### B. Onboard (Create Gym & Owner)
**Endpoint**: `POST /api/auth/onboard`
**Purpose**: Finalizes account creation for a new user.

*   **Request**:
    ```json
    {
      "firebaseIdToken": "eyJhbG...",
      "gymName": "Spartan Gym",
      "ownerName": "John Doe",
      "password": "securepassword123" 
    }
    ```
*   **Response**:
    ```json
    {
      "success": true,
      "token": "jwt_access_token",
      "user": { ... }
    }
    ```

### C. Password Login (Subsequent Logins)
**Endpoint**: `POST /api/auth/login-password`
**Purpose**: Fast login for returning users without needing SMS OTP every time (unless they forget password).

*   **Request**:
    ```json
    {
      "phoneNumber": "+919876543210",
      "password": "securepassword123"
    }
    ```
*   **Response**:
    ```json
    {
      "success": true,
      "token": "jwt_access_token"
    }
    ```

---

## 3. Frontend Implementation Strategy

### UX Flow
1.  **Welcome / Phone Entry**: Clean screen asking for mobile number.
2.  **OTP Verification**: 
    *   Auto-detect OTP if possible.
    *   "Resend OTP" timer (30s).
3.  **New User Branch**:
    *   **Gym Details**: "Tell us about your gym" (Name, Your Name).
    *   **Secure Account**: "Set a strong password".
4.  **Existing User Branch**:
    *   Backend recognizes phone → "Welcome back, [Name]".
    *   Ask for Password.
    *   "Forgot Password?" flow triggers OTP verification again.

### Navigation Changes (`AppNavigator.tsx`)

We will restructure the `AuthStack` to replace `LoginScreen`.

```
AuthStack
├── specific: PhoneInputScreen (Entry point)
├── specific: OTPVerificationScreen
├── specific: SetupGymScreen (Form)
├── specific: SetPasswordScreen
└── specific: PasswordLoginScreen (For returning users)
```

### UI Components
*   Use `Moti` for smooth transitions between steps (keyboard avoiding views are critical here).
*   Use existing `TextField` and `Button` components from the design system.
*   **Design Polish**:
    *   Large, friendly headings ("What's your number?").
    *   Auto-focus input fields.
    *   Numeric keyboard for Phone/OTP/PIN.
    *   Loading states for API calls.

---

## 4. Execution Plan (Step-by-Step)

### Step 1: Server Side Setup
1.  Install `firebase-admin`.
2.  Create `server/src/config/firebase.ts` to initialize Admin SDK.
    *   *Note*: Need to guide User to provide `serviceAccountKey.json`.
3.  Update `User` model in `server/src/models/User.ts`.

### Step 2: Implement Auth Controller
1.  Create `verifyOtp` function:
    *   Verify token via Firebase Admin.
    *   Check DB for `phoneNumber`.
2.  Create `onboard` function:
    *   Verify token.
    *   Create `Gym` document.
    *   Create `User` document with `pinHash`.
    *   Generate JWT.
3.  Create `pinLogin` function:
    *   Find user by `phoneNumber`.
    *   Compare `pin` with `pinHash`.
    *   Generate JWT.

### Step 3: Frontend Setup
1.  Install `@react-native-firebase/app` and `@react-native-firebase/auth`.
2.  Configure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS).
    *   *Blocker*: We need these config files from the User's Firebase project.

### Step 4: UI Development (Screens)
1.  `PhoneLoginScreen.tsx`: Input validation, formatting.
2.  `OTPScreen.tsx`: 6-digit input, error handling.
3.  `GymSetupScreen.tsx`: Name inputs.
4.  `PinScreen.tsx`: Reusable for "Set PIN" and "Enter PIN".

### Step 5: Integration
1.  Wire up `AppNavigator`.
2.  Test the "Happy Path" (New User).
3.  Test the "Returning User" path.
4.  Deprecate old `LoginScreen` (hide or remove).

---

## 5. Testing & Validation
*   **Unit Tests**: Test the controller logic (mocking Firebase Admin).
*   **Manual Test**: 
    *   Sign up with real phone number.
    *   Logout.
    *   Login with PIN.
    *   Login with OTP (Forgot PIN simulation).

