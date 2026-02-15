# Real World Membership Testing - Setup Complete! 🎉

## ✅ What's Been Done

1. **Created comprehensive test scripts**:
   - `realWorldMembershipTest.ts` - Main testing script (uses real APIs)
   - `setupMembershipPlans.ts` - Creates membership plans
   - `checkWhatsApp.ts` - Configures WhatsApp settings
   - `deleteClient.ts` - Cleans up test clients

2. **Set up your test environment**:
   - ✅ Membership plans created (Individual, Trial, Couple, Group)
   - ✅ WhatsApp credentials uncommented in `.env`
   - ✅ Database settings updated with real WhatsApp credentials
   - ✅ Test client (Pushkara) deleted and ready for fresh test

## 🚨 IMPORTANT: Restart Server Required!

**You MUST restart your server** to pick up the new WhatsApp environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart it:
npm run dev
```

## 🧪 Running Tests

After restarting the server, run any test:

```bash
# Test 1: Individual Onboarding (Pushkara) - WILL SEND REAL WHATSAPP
npx tsx src/tests/realWorldMembershipTest.ts 1 corewave 1234

# Test 2: Trial Onboarding (Garima) - WILL SEND REAL WHATSAPP
npx tsx src/tests/realWorldMembershipTest.ts 2 corewave 1234

# Test 3: Couple Onboarding (Rishabh + Partner)
npx tsx src/tests/realWorldMembershipTest.ts 3 corewave 1234

# Test 4: Renew Pushkara's Membership
npx tsx src/tests/realWorldMembershipTest.ts 4 corewave 1234

# Test 5: Advance Renewal for Garima (future start date)
npx tsx src/tests/realWorldMembershipTest.ts 5 corewave 1234

# Test 6: Run CRON Job (Expiry Check, Promotions, Reminders)
npx tsx src/tests/realWorldMembershipTest.ts 6 corewave 1234

# Test 7: Get Client Statistics
npx tsx src/tests/realWorldMembershipTest.ts 7 corewave 1234

# Run ALL tests sequentially
npx tsx src/tests/realWorldMembershipTest.ts all corewave 1234
```

## 🔧 Helper Commands

```bash
# Delete a test client
npx tsx src/tests/deleteClient.ts 9354454113

# Check/update WhatsApp settings
npx tsx src/tests/checkWhatsApp.ts

# Create membership plans (if needed)
npx tsx src/tests/setupMembershipPlans.ts corewave 1234
```

## 📱 WhatsApp Configuration

Your WhatsApp is now configured with:
- **Phone Number ID**: 938535399351997
- **Access Token**: EAALNsOkGlt8BQhH9BMB... (from .env)
- **Enabled for**:
  - ✅ Onboarding notifications
  - ✅ Renewal notifications
  - ✅ Expiry notifications
  - ✅ Renewal reminders (3 days before)

## 🎯 What Each Test Does

### Test 1: Individual Onboarding
- Calls `POST /api/client/add`
- Onboards **Pushkara Sharma** (9354454113)
- Creates active membership
- **Sends WhatsApp welcome message** 📱

### Test 2: Trial Onboarding
- Calls `POST /api/client/add`
- Onboards **Garima** (8587930989) with trial plan
- Sets status to "trial"
- **Sends WhatsApp trial notification** 📱

### Test 3: Couple Onboarding
- Calls `POST /api/client/add`
- Onboards **Rishabh** (9625063177) with a partner
- Creates couple membership (2 members)
- **Sends WhatsApp welcome message** 📱

### Test 4: Standard Renewal
- Calls `PATCH /api/client/renew`
- Renews Pushkara's membership (immediate, starts today)
- Updates expiry date
- **Sends WhatsApp renewal confirmation** 📱

### Test 5: Advance Renewal
- Calls `PATCH /api/client/renew`
- Renews Garima's membership (future start date: 10 days from now)
- Sets `upcomingMembership` field
- **Sends WhatsApp renewal confirmation** 📱

### Test 6: CRON Job Expiry Check
- Calls `POST /api/system/run-expiry-check`
- Promotes future memberships (if start date is today)
- Marks expired memberships
- Sends renewal reminders (3 days before expiry)
- **May send WhatsApp messages** depending on data 📱

### Test 7: Client Statistics
- Calls `GET /api/client/stats`
- Returns total clients, active, expired, upcoming counts
- No WhatsApp sent

## 📊 Verification

After running tests, verify:

1. **Database** - Check MongoDB for new clients/memberships
2. **WhatsApp** - Check real phone numbers for messages
3. **Console Output** - Shows API responses and status

## ⚠️  Important Notes

1. **Real Data**: All tests create REAL data in your database
2. **Real Messages**: WhatsApp messages go to REAL phone numbers
3. **No Cleanup**: Data persists (unlike the automated test suite)
4. **Server Must Be Running**: Tests call `http://localhost:8080/api`
5. **Server Must Be Restarted**: For WhatsApp to work with new .env vars

## 🎬 Quick Start (After Server Restart)

```bash
# 1. Restart server
npm run dev

# 2. Run Test 1 (onboard Pushkara with WhatsApp)
npx tsx src/tests/realWorldMembershipTest.ts 1 corewave 1234

# 3. Check your phone (9354454113) for WhatsApp message! 📱
```

---

**Next Step**: Restart your server with `npm run dev`, then run Test 1! 🚀
