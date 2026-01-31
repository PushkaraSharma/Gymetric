# Gymetric Backend - TypeScript Migration & Optimization Plan

## ✅ Status: In Progress (Live & Functional)
- [x] TypeScript & Dependencies Installed (`typescript`, `tsx`, `dayjs`)
- [x] `tsconfig.json` Configured
- [x] Type-safe Constants Created (`Constants.ts`)
- [x] Standardized Time Utility (`timeUtils.ts`) - Handles IST/UTC mismatch
- [x] Core Model Interfaces Defined (`src/types/models.ts`)
- [x] **Logic Fixes Applied**: Transactions added, Stats bug fixed, Property mismatch resolved.
- [x] **Server Running**: Successfully booted using `tsx` on port 8080.

---

## 📅 Roadmap

### 1. Model Refactoring (Completed)
- [x] **AssignedMembership.ts**: Renamed, fixed `totalAmount`.
- [x] **Client.ts**: Renamed, applied `IClient`.
- [x] **Activity.ts**: Renamed.
- [x] **Gym.ts / User.ts / Settings.ts**: Renamed and basic typed.

### 2. Controller Migration (Logic Fixes)
- [x] **ClientController.ts**:
    - [x] Fixed `getClientStats`.
    - [x] Implemented Mongoose Transactions.
    - [x] Switched to `timeUtils.ts`.
- [x] **SystemController.ts**:
    - [x] Refactored logic for standardized IST 12 AM check.
    - [ ] Refactor `performExpiryChecks` to use `bulkWrite` for better performance.

### 3. Middleware & Routes (Completed)
- [x] **authenticate.ts**: Added types to `request.user` and defined Fastify types.
- [x] **Routes**: Updated all route registrations to point to `.ts` controllers.

### 4. Remaining Tasks
- [ ] Add Request Validation (Zod/JSON Schema).
- [ ] Implement `bulkWrite` in Expiry Checks for large member sets.
- [ ] Clean up `Helper.ts.bak` once all controllers are verified.

---

## 🛠 Fixes Verified
1. **Schema Mismatch**: Fixed.
2. **Stats Bug**: Fixed.
3. **Double 'L'**: Renamed to `systemController.ts`.
4. **Data Integrity**: Transactions implemented in critical paths.
