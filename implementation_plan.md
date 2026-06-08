# Feature Batch: Pause Bug Fix + Receipts + Dashboard Caching + Profile Pics

## 1. Pause/Resume Same-Day Bug

### Root Cause

In [resumeMembership](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/server/src/controllers/clientController.ts#L640-L703), pause days are calculated using `Math.ceil`:

```ts
const pauseDays = Math.ceil((now.getTime() - new Date(currentPause.startedAt).getTime()) / (1000 * 60 * 60 * 24));
```

If you pause and resume on the same day, the difference is less than 24h but `Math.ceil` rounds it up to **1 day**. Do this 3 times → 3 extra days.

### Fix

Change to calculate based on **calendar days**, not raw milliseconds. Use `dayjs` (already in use in `timeUtils.ts`):

```ts
const pauseStart = dayjs(currentPause.startedAt).tz('Asia/Kolkata').startOf('day');
const resumeDay  = dayjs().tz('Asia/Kolkata').startOf('day');
const pauseDays  = resumeDay.diff(pauseStart, 'day'); // 0 if same day
```

This ensures same-day pause/resume = 0 extra days.

#### [MODIFY] [clientController.ts](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/server/src/controllers/clientController.ts)
- Import `dayjs` (or reuse via `getNowIST`).
- Replace `Math.ceil` calculation at line ~666 with calendar-day diff.
- `pauseDays` becomes `0` for same-day → `endDate` unchanged.

---

## 2. Receipt System Enhancements

### Current State

- [ReceiptSettingsScreen.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Setting/ReceiptSettingsScreen.tsx) — has `footerNote`, `showGymAddress`, and a raw URL text field for signature. Very basic.
- [ShareReceiptModal.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/components/ShareReceiptModal.tsx) — only supports "Share as PDF" + "Skip". No image option, no format preference.
- [paymentReceiptTemplate.ts](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/utils/paymentReceiptTemplate.ts) — HTML template already supports `logo`, `signature`, `footerNote`, `showGymAddress`.
- Server [Settings model](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/server/src/models/Settings.ts) has a `receipt` sub-object.

### 2a. Receipt Format Preference Setting

Add a **Receipt Format** option in Settings → "Ask Every Time" / "Always Image" / "Always PDF".

#### [MODIFY] [Setting.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Setting/Setting.tsx)
- Add a `ReceiptFormat` setting item in the **MANAGEMENT** section below "Receipt Settings".
- On tap, show a `PickerBottomSheet` (or custom modal) with 3 options: `Ask Every Time`, `Always Image`, `Always PDF`.
- Persist locally using `AsyncStorage` / MMKV (check what existing storage uses — project uses [LocalStorage.ts](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/utils/LocalStorage.ts)).

> [!IMPORTANT]
> **Decision needed**: Should this be a local-only preference (like RentVelo's MMKV approach) or stored on the server under `Settings.receipt.defaultFormat`? Local is simpler and faster; server syncs across devices.

### 2b. Receipt Logo = Gym Logo

The gym logo is already available via `gymInfo?.logo` in the Redux store. The template already supports `gym.logo`. No new upload needed — just ensure the `ShareReceiptModal` passes `gymInfo.logo` consistently.

#### [MODIFY] [ShareReceiptModal.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/components/ShareReceiptModal.tsx)
- Ensure `gym.logo` is always populated from `gymInfo.logo`.
- Already done via `receiptConfig?.logo || gym?.logo` — verify callers pass this correctly.

### 2c. Signature/Watermark Canvas (Like RentVelo)

Replace the raw URL text field in Receipt Settings with a **draw-on-canvas** experience using `react-native-signature-canvas` (same as [RentVelo SignatureModal](file:///Users/pushkarasharma/Desktop/Personal/RentVelo/RentVelo/src/components/common/SignatureModal.tsx)).

#### [NEW] SignatureModal.tsx
`app/components/common/SignatureModal.tsx`

- Full-screen modal with `react-native-signature-canvas`.
- Save as base64 → upload to Cloudinary via existing upload route.
- Return the secure URL → save in `Settings.receipt.signature`.

#### [MODIFY] [ReceiptSettingsScreen.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Setting/ReceiptSettingsScreen.tsx)
- Replace text input for signature with a canvas preview + "Draw Signature" / "Redraw" / "Remove" buttons.
- Show uploaded logo preview (gym logo from gymInfo).
- Add image picker for uploading a custom receipt logo (optional, or default to gym logo).

> [!NOTE]
> `react-native-signature-canvas` needs to be installed. It requires `react-native-webview` which is likely already installed (Expo project).

### 2d. Image Format Support for ShareReceiptModal

Currently only supports PDF. Need to add Image (screenshot via `ViewShot` + `expo-sharing`).

#### [MODIFY] [ShareReceiptModal.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/components/ShareReceiptModal.tsx)
- Add "Share as Image" button alongside PDF.
- Use `ViewShot` (from `react-native-view-shot`) to capture the HTML rendered in a hidden WebView as an image, exactly like RentVelo's approach.
- Check the user's format preference: if `Always PDF` → auto-generate PDF and share. If `Always Image` → auto-generate image and share. If `Ask Every Time` → show both buttons.

---

## 3. Auto-Open Receipt on Onboarding/Renewal Complete

### Setting

Add a toggle in Settings: **"Auto-share receipt after onboarding/renewal"** — stored locally or on server.

#### [MODIFY] [Setting.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Setting/Setting.tsx)
- Add toggle under **MANAGEMENT** section.

### Onboarding Flow

#### [MODIFY] [ClientOnboarding.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Clients/ClientOnboarding.tsx)
- After successful onboarding, check the auto-share setting.
- If enabled: check preferred format → if set, auto-generate and share. If "Ask", show `ShareReceiptModal`.
- If disabled: do nothing (current behavior).

### Renewal Flow

#### [MODIFY] [RenewMembership.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Clients/ClientMembership/RenewMembership.tsx)
- Same logic as onboarding after successful renewal.

---

## 4. Dashboard: No Loader on Return

### Problem
Every time user navigates back to Home, the skeleton loader shows while data re-fetches.

### Fix

In [Home.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Home/Home.tsx), line 58:

```ts
else if (!summary) setIsLoading(true)
```

This already only shows the loader when `summary` is `null` (first load). But `useFocusEffect` re-runs `loadData(false)` on every focus. The fix is:

#### [MODIFY] [Home.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Home/Home.tsx)
- If `summary` already exists when focus fires, silently fetch in the background without setting `isLoading = true` (it already does this! — line 58 says `else if (!summary)`).
- **Verify**: The current logic looks correct. The issue might be that `summary` is being reset elsewhere, or the component is remounting. Need to check if the tab navigator remounts the Home screen. If it does, `summary` resets to `null`.
- **Solution**: Move dashboard data to Redux store (persist across tab switches) so it survives component unmount/remount. Alternatively, use a module-level cache variable.

> [!IMPORTANT]
> **Architecture decision**: Should we move `summary` to Redux (like `clients` are via `selectAllClients`)? This is the cleanest approach and matches the pattern used for clients. The alternative is a module-level `let cachedSummary` that persists across remounts.

---

## 5. Profile Pics in Members List

### Current State
[ClientListCard.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/components/clients/ClientListCard.tsx#L45) already uses `<ProfileInitialLogo ... imageUrl={client.profilePicture} />`.

The issue is the server `getAllClients` query at [line 90](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/server/src/controllers/clientController.ts#L90) does NOT include `profilePicture` in `.select()`:

```ts
.select('name phoneNumber gender membershipStatus activeMembership balance role')
```

### Fix

#### [MODIFY] [clientController.ts](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/server/src/controllers/clientController.ts)
- Add `profilePicture` to the `.select()` string in `getAllClients` at line 90:
```ts
.select('name phoneNumber gender membershipStatus activeMembership balance role profilePicture')
```

That's it. The frontend already handles it.

---

## 6. Expandable Profile Photo in Client Details

### Current State
[ClientDetails.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Clients/ClientDetails.tsx#L246) already shows the profile pic via `ProfileInitialLogo`. But there's no way to tap it and see the full image.

### Implementation

#### [NEW] ImagePreviewModal.tsx
`app/components/common/ImagePreviewModal.tsx`

- Full-screen modal with the image displayed large.
- Background dimmed, tap outside or X button to close.
- Optional: pinch-to-zoom using `react-native-gesture-handler` or `react-native-image-zoom-viewer`.

#### [MODIFY] [ClientDetails.tsx](file:///Users/pushkarasharma/Desktop/Personal/Gymetric/frontend/Gymetric/app/screens/Clients/ClientDetails.tsx)
- Wrap the `ProfileInitialLogo` in a `Pressable`.
- On press (only if `client?.profilePicture` exists), open the `ImagePreviewModal`.

---

## Open Questions

> [!IMPORTANT]
> 1. **Receipt format preference storage**: Local MMKV/AsyncStorage (like RentVelo) or server-side in `Settings.receipt.defaultFormat`? I recommend **local** since this is a device-specific preference.

> [!IMPORTANT]  
> 2. **Dashboard caching strategy**: Should we use Redux (cleaner, consistent with clients pattern) or a simple module-level cache? I recommend **Redux** with a new `setDashboardSummary` action for consistency.

> [!IMPORTANT]
> 3. **`react-native-signature-canvas` installation**: This requires `npx expo install react-native-signature-canvas`. It depends on `react-native-webview` which Expo likely has. Should I install it now or do you want to review first?

> [!IMPORTANT]
> 4. **`react-native-view-shot` for image receipts**: Needed for capturing WebView → image. Already common in Expo. Want to confirm before installing.

---

## Verification Plan

### Automated Tests
- `npm run gcp-build` in `/server` to ensure TypeScript compiles after the pause bug fix.

### Manual Verification
1. **Pause bug**: Pause and resume a membership on the same day — expiry should NOT change.
2. **Profile pics in list**: Create a client with a profile picture → verify it shows in the Members list.
3. **Expand profile photo**: Tap on the profile picture in Client Details → full-screen preview.
4. **Dashboard no-loader**: Navigate away from Home, come back → data updates silently (no skeleton).
5. **Receipt sharing**: After onboarding, verify receipt auto-opens if setting is enabled.
6. **Signature canvas**: Draw a signature in Receipt Settings → verify it appears on generated receipts.

---

## Proposed Execution Order

1. **Pause/Resume bug fix** (backend-only, 5 min)
2. **Profile pics in member list** (backend 1-liner, 2 min)
3. **Dashboard caching** (frontend Redux + Home.tsx, ~20 min)
4. **Expandable profile photo** (new component + wire up, ~15 min)
5. **Receipt format preference + Image support** (~30 min)
6. **Signature canvas + Receipt Settings redesign** (~45 min)
7. **Auto-open receipt on onboarding/renewal** (~20 min)
