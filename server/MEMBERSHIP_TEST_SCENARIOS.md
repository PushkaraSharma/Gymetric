# Gymetric Membership Testing - Complete Scenarios

## Overview
This document outlines ALL testing scenarios for the membership system in Gymetric. The automated test suite covers these scenarios comprehensively.

---

## Real Customer Data Used
- **Pushkara Sharma**: 9354454113
- **Garima**: 8587930989
- **Rishabh**: 9625063177

⚠️ **All test data is automatically cleaned up after tests complete**

---

## Complete Test Scenarios

### 1️⃣ ONBOARDING SCENARIOS

#### 1.1 Individual Membership
- ✅ Standard individual onboarding (starts today)
- ✅ Individual with future start date
- ✅ Individual trial membership (7 days)
- ✅ Individual with payment received
- ✅ Individual without payment (creates balance)

#### 1.2 Couple Membership
- ✅ Couple with 1 new dependent
- ✅ Couple with existing client as dependent
- ✅ Couple with future start date
- ✅ Couple trial membership

#### 1.3 Group Membership (3+ members)
- ✅ Group with 2+ new dependents
- ✅ Group with mix of new and existing clients
- ✅ Group as future membership
- ✅ Group with partial payment

---

### 2️⃣ RENEWAL SCENARIOS

#### 2.1 Standard Renewal (Immediate)
- ✅ Renew expired individual membership (starts today)
- ✅ Renew active membership (immediate renewal)
- ✅ Renewal with payment received
- ✅ Renewal without payment (increases balance)

#### 2.2 Advance Renewal (Future)
- ✅ Advance renewal (starts in future while current is active)
- ✅ Advance renewal for expired client
- ✅ Client has both active AND upcoming membership

#### 2.3 Renewal with Plan Type Changes
- ✅ Individual → Couple (adding dependent)
- ✅ Couple → Group (adding more dependents)
- ✅ Couple/Group with same dependents
- ✅ Group with new dependents

---

### 3️⃣ EXPIRY SYSTEM (Daily CRON Job)

#### 3.1 Promotion of Future Memberships
- ✅ Future membership becomes active on start date
- ✅ Future membership promotion for individual
- ✅ Future membership promotion for group (all members updated)
- ✅ Client with expired membership gets upcoming promoted
- ✅ Activity log created for promotion

#### 3.2 Marking Memberships as Expired
- ✅ Active membership expires → 'expired'
- ✅ Trial membership expires → 'trial_expired'
- ✅ Group membership expiry (all members marked expired)
- ✅ Multiple memberships expiring on same day
- ✅ Activity log created for expiry

#### 3.3 Expiry WhatsApp Notifications
- ✅ WhatsApp sent when membership expires (if enabled)
- ✅ No WhatsApp if `sendOnExpiry: false`
- ✅ WhatsApp sent for trial expiry
- ✅ WhatsApp sent for group (to primary member only)
- ✅ Correct parameters: name, gym, endDate

---

### 4️⃣ RENEWAL REMINDER SCENARIOS

#### 4.1 Standard Reminders
- ✅ Reminder sent X days before expiry (default: 3 days)
- ✅ Reminder with custom reminderDays (e.g., 5 days)
- ✅ Reminder for active membership
- ✅ Reminder for trial membership
- ✅ Correct parameters: name, gym, remainingDays, endDate

#### 4.2 Reminder Exclusions
- ✅ No reminder if client has upcoming membership
- ✅ No reminder for daily pass (durationInMonths ≤ 0)
- ✅ No reminder if WhatsApp disabled
- ✅ No reminder if `sendOnReminder: false`

---

### 5️⃣ GROUP MEMBERSHIP EDGE CASES

#### 5.1 Member Status Synchronization
- ✅ All group members have same membershipStatus
- ✅ All group members linked to same AssignedMembership
- ✅ Primary member role vs dependent role
- ✅ Group member balance tracking (primary only)

#### 5.2 Group Transitions
- ✅ Individual → Couple (1 dependent added)
- ✅ Couple → Group (2+ dependents)
- ✅ Group → Individual (removing dependents on renewal)
- ✅ Adding existing client to group membership

---

### 6️⃣ BALANCE & PAYMENT SCENARIOS

#### 6.1 Balance Tracking
- ✅ Balance created when payment not received (onboarding)
- ✅ Balance increased when payment not received (renewal)
- ✅ Balance remains 0 when payment received
- ✅ Multiple unpaid memberships accumulating balance
- ✅ Balance only tracked on primary member

#### 6.2 Payment History
- ✅ Payment recorded on onboarding
- ✅ Payment recorded on renewal
- ✅ Correct membershipId linked to payment
- ✅ All payment methods: Cash, UPI, Card, Transfer
- ✅ Payment date recorded correctly

---

### 7️⃣ WHATSAPP NOTIFICATION SCENARIOS

#### 7.1 Onboarding Notifications
- ✅ WhatsApp sent on successful onboarding
- ✅ No WhatsApp if `sendOnOnboarding: false`
- ✅ Correct template: "onboarding"
- ✅ Parameters: name, gym, plan, startDate, endDate

#### 7.2 Renewal Notifications
- ✅ WhatsApp sent on successful renewal
- ✅ No WhatsApp if `sendOnRenewal: false`
- ✅ Correct template: "renewal_complete"
- ✅ Parameters: name, plan, startDate, endDate

#### 7.3 Expiry Notifications
- ✅ WhatsApp sent when membership expires
- ✅ No WhatsApp if `sendOnExpiry: false`
- ✅ Correct template: "expired"
- ✅ Parameters: name, gym, endDate

#### 7.4 Reminder Notifications
- ✅ WhatsApp sent X days before expiry
- ✅ No reminder if `sendOnReminder: false`
- ✅ Correct template: "renewal"
- ✅ Parameters: name, gym, remainingDays, endDate
- ✅ No duplicate reminders

---

### 8️⃣ ACTIVITY LOG SCENARIOS

#### 8.1 Activity Types
- ✅ ONBOARDING - New member joined
- ✅ RENEWAL - Membership renewed (immediate)
- ✅ ADVANCE_RENEWAL - Pre-paid future membership
- ✅ EXPIRY - Membership expired
- ✅ PAYMENT - Payment received (optional)

#### 8.2 Activity Details
- ✅ Correct gymId linkage
- ✅ Correct memberId linkage
- ✅ Amount tracked (when applicable)
- ✅ Description includes member name & plan
- ✅ Date set to IST midnight today

---

### 9️⃣ EDGE CASES & ERROR HANDLING

#### 9.1 Data Integrity
- ✅ Transaction rollback on onboarding error
- ✅ Transaction rollback on renewal error
- ✅ Duplicate phone number handling
- ✅ Invalid plan ID handling
- ✅ Missing client/plan validation

#### 9.2 Date Handling (IST Timezone)
- ✅ IST midnight consistency
- ✅ Membership expiry calculation (months + days)
- ✅ Future membership start date validation
- ✅ Dayjs date parsing accuracy
- ✅ End date boundary conditions

#### 9.3 Status Transitions
- ✅ `active` → `expired` → `active` (renewal)
- ✅ `trial` → `trial_expired` → `active` (renewal)
- ✅ `future` → `active` (promotion by cron)
- ✅ `active` + `future` → `active` (with upcoming)
- ✅ `expired` with `future` → promotion handling

---

## System Controller Logic (CRON Job)

The `performExpiryChecks` function runs daily and performs:

1. **STEP 1: Promote Future Memberships**
   - Find all clients with `upcomingMembership` where startDate ≤ today
   - Set membership status to 'active'
   - Update client: set activeMembership, clear upcomingMembership
   - Create activity log

2. **STEP 2: Mark Expired Memberships**
   - Find memberships with endDate < today and status 'active'/'trial'
   - Update status to 'expired' or 'trial_expired'
   - Update ALL members in that membership
   - Create activity log
   - Send WhatsApp notification (if enabled)

3. **STEP 3: Send Renewal Reminders**
   - Find memberships expiring in X days (default 3)
   - Exclude: daily passes, clients with upcoming membership
   - Send WhatsApp reminder (if enabled)
   - Include: remainingDays parameter

---

## Test Data Cleanup

The test suite automatically cleans up:
- ✅ All clients with real phone numbers (Pushkara, Garima, Rishabh)
- ✅ All clients with test phone numbers (9999999xxx)
- ✅ All AssignedMembership records created during tests
- ✅ All Activity logs created during tests

This ensures no test data accumulates in the database.

---

## Running the Tests

```bash
# From server directory
cd /Users/pushkarasharma/Desktop/Personal/Gymetric/server

# Install ts-node if not already installed
npm install -D ts-node

# Run the test suite
npx ts-node src/tests/membershipTestSuite.ts
```

---

## Expected Output

```
🚀 Starting Membership Test Suite...
📦 Connecting to MongoDB...
✅ Connected to MongoDB

🧹 Cleaning up previous test data...
✅ Cleanup complete

🏋️ Setting up test gym and membership plans...
✅ Test environment setup complete

═══════════════════════════════════════════════════════════

🧪 RUNNING TEST SCENARIOS

📋 1. ONBOARDING SCENARIOS
✅ [PASS] 1.1 Individual Onboarding (Standard)
✅ [PASS] 1.2 Individual Trial Onboarding
✅ [PASS] 1.3 Individual Future Onboarding
... and so on

═══════════════════════════════════════════════════════════

📊 TEST SUMMARY
Total Tests: 30+
✅ Passed: XX
❌ Failed: 0
⏭️  Skipped: 0

Success Rate: 100%

🧹 CLEANING UP TEST DATA...
✅ Deleted X test clients
✅ Deleted X test memberships
✅ Deleted X test activities

✅ All test data cleaned up successfully!

👋 Disconnected from MongoDB
```

---

## Notes

1. **Real Customer Data**: Tests use real phone numbers but clean up immediately
2. **WhatsApp**: Tests validate logic but don't actually send WhatsApp messages
3. **Timezone**: All dates use IST (Indian Standard Time)
4. **Transactions**: MongoDB transactions ensure data integrity
5. **Idempotent**: Tests can be run multiple times safely

---

Last Updated: February 14, 2026
