/**
 * REAL WORLD MEMBERSHIP TESTING
 * 
 * This script tests membership scenarios using:
 * - REAL gym credentials (your actual gym)
 * - REAL WhatsApp credentials (actual messages sent)
 * - REAL customer phone numbers (Pushkara, Garima, Rishabh)
 * - NO CLEANUP - Data persists in database for verification
 * 
 * ⚠️  WARNING: This will send REAL WhatsApp messages!
 * 
 * USAGE:
 * npx tsx src/tests/realWorldMembershipTest.ts <test_number>
 * 
 * Examples:
 * npx tsx src/tests/realWorldMembershipTest.ts 1   # Test 1: Individual Onboarding
 * npx tsx src/tests/realWorldMembershipTest.ts 2   # Test 2: Trial Onboarding
 * npx tsx src/tests/realWorldMembershipTest.ts all # Run all tests
 */

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import Client from '../models/Client.js';
import AssignedMembership from '../models/AssignedMembership.js';
import Gym from '../models/Gym.js';
import Membership from '../models/Memberships.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { getISTMidnightToday } from '../utils/timeUtils.js';

dotenv.config();

// CONFIGURATION
const BASE_URL = 'http://localhost:8080/api';

// REAL CUSTOMER DATA
const REAL_CUSTOMERS = {
    pushkara: { name: 'Pushkara Sharma', phoneNumber: '9354454113', gender: 'Male', age: 28 },
    garima: { name: 'Garima', phoneNumber: '8587930989', gender: 'Female', age: 26 },
    rishabh: { name: 'Rishabh', phoneNumber: '9625063177', gender: 'Male', age: 27 }
};

// Global state
let api: AxiosInstance;
let authToken: string;
let gymId: any;
let planIds: any = {};

// ============================================
// SETUP
// ============================================

async function setup() {
    console.log('\n🚀 REAL WORLD MEMBERSHIP TESTING\n');
    console.log('⚠️  WARNING: This will use your REAL gym and send REAL WhatsApp messages!\n');

    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ Connected\n');

    // Setup API client
    api = axios.create({
        baseURL: BASE_URL,
        headers: { 'Content-Type': 'application/json' }
    });

    // Check server
    try {
        await axios.get('http://localhost:8080/health');
        console.log('✅ Server is running\n');
    } catch (error) {
        throw new Error('❌ Server is not running. Start with: npm run dev');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
}

async function loginToRealGym() {
    console.log('🔐 LOGIN TO YOUR REAL GYM\n');

    // Get credentials from env vars or command line args
    const username = process.env.GYM_USERNAME || process.argv[3];
    const password = process.env.GYM_PASSWORD || process.argv[4];

    if (!username || !password) {
        console.log('⚠️  Please provide login credentials:\n');
        console.log('   Option 1: Environment variables');
        console.log('   GYM_USERNAME=corewave GYM_PASSWORD=1234 npx tsx src/tests/realWorldMembershipTest.ts 1\n');
        console.log('   Option 2: Command line arguments');
        console.log('   npx tsx src/tests/realWorldMembershipTest.ts 1 corewave 1234\n');
        return false;
    }

    console.log(`   Username: ${username}`);

    console.log('\n🔄 Logging in...');

    try {
        const response = await api.post('/auth/login', { username, password });

        if (!response.data.success) {
            throw new Error('Login failed');
        }

        authToken = response.data.data.token;
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;

        console.log(`✅ Logged in as: ${response.data.data.username}`);
        console.log(`✅ Gym: ${response.data.data.gymName}\n`);

        // Get gym ID directly from user (no populate to avoid Gym schema errors)
        const user = await User.findOne({ username });
        if (!user || !user.gymId) throw new Error('User or Gym not found');
        gymId = user.gymId;

        // Load membership plans
        const plans = await Membership.find({ gymId }).lean();
        console.log('📋 Available Membership Plans:\n');
        plans.forEach((plan: any, index) => {
            console.log(`   ${index + 1}. ${plan.planName} - ${plan.durationInMonths ? plan.durationInMonths + ' month(s)' : plan.durationInDays + ' day(s)'} - ₹${plan.price}`);
            planIds[plan.planName] = plan._id.toString();
        });
        console.log('');

        return true;
    } catch (error: any) {
        console.error('❌ Login failed:', error.response?.data || error.message);
        return false;
    }
}

// ============================================
// TEST SCENARIOS
// ============================================

async function test1_IndividualOnboarding() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 1: INDIVIDUAL ONBOARDING (Pushkara Sharma)');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Check if customer already exists
    const existing = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.pushkara.phoneNumber, gymId });
    if (existing) {
        console.log(`⚠️  Client already exists with ID: ${existing._id}`);
        console.log(`   Name: ${existing.name}`);
        console.log(`   Status: ${existing.membershipStatus}\n`);
        console.log('   Skipping onboarding. Delete this client first if you want to test onboarding.\n');
        return;
    }

    console.log('📝 Onboarding Details:');
    console.log(`   Name: ${REAL_CUSTOMERS.pushkara.name}`);
    console.log(`   Phone: ${REAL_CUSTOMERS.pushkara.phoneNumber}`);
    console.log(`   Plan: Individual (1 month)`);
    console.log(`   Payment: ₹1500 (Cash, Received)\n`);

    const planId = Object.values(planIds)[0]; // Use first available plan

    try {
        console.log('🔄 Calling API: POST /api/client/add...\n');

        const response = await api.post('/client/add', {
            primaryDetails: {
                ...REAL_CUSTOMERS.pushkara
            },
            dependents: [],
            planId: planId,
            method: 'Cash',
            paymentReceived: true,
            amount: 1500
        });

        if (response.data.success) {
            console.log('✅ ONBOARDING SUCCESSFUL!\n');
            console.log(`   Client ID: ${response.data.data._id}`);
            console.log(`   Status: ${response.data.data.membershipStatus}`);
            console.log(`   Balance: ₹${response.data.data.balance || 0}\n`);

            // Check WhatsApp notification
            console.log('📱 WhatsApp Status:');
            const settings = await Settings.findOne({ gymId });
            if (settings?.whatsapp?.active && settings.whatsapp.sendOnOnboarding !== false) {
                console.log('   ✅ WhatsApp notification should have been sent!');
                console.log(`   📞 Check ${REAL_CUSTOMERS.pushkara.phoneNumber} for message\n`);
            } else {
                console.log('   ⚠️  WhatsApp is disabled or onboarding notifications are off\n');
            }

            // Verify in database
            const saved = await Client.findById(response.data.data._id).populate('activeMembership');
            console.log('💾 Database Verification:');
            console.log(`   ✅ Client saved in database`);
            console.log(`   ✅ Active membership: ${(saved?.activeMembership as any)?.planName || 'None'}\n`);

        } else {
            throw new Error('API returned success: false');
        }
    } catch (error: any) {
        console.error('❌ ONBOARDING FAILED!\n');
        console.error('Error:', error.response?.data || error.message);
    }
}

async function test2_TrialOnboarding() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 2: TRIAL ONBOARDING (Garima)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const existing = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.garima.phoneNumber, gymId });
    if (existing) {
        console.log(`⚠️  Client already exists: ${existing.name} (ID: ${existing._id})\n`);
        console.log('   Skipping. Delete first to test onboarding.\n');
        return;
    }

    // Find trial plan
    const trialPlan = await Membership.findOne({ gymId, isTrial: true });
    if (!trialPlan) {
        console.log('❌ No trial plan found. Create a trial plan first.\n');
        return;
    }

    console.log('📝 Trial Onboarding Details:');
    console.log(`   Name: ${REAL_CUSTOMERS.garima.name}`);
    console.log(`   Phone: ${REAL_CUSTOMERS.garima.phoneNumber}`);
    console.log(`   Plan: ${trialPlan.planName} (${trialPlan.durationInDays} days)`);
    console.log(`   Payment: ₹${trialPlan.price} (Free trial)\n`);

    try {
        console.log('🔄 Calling API: POST /api/client/add...\n');

        const response = await api.post('/client/add', {
            primaryDetails: {
                ...REAL_CUSTOMERS.garima
            },
            dependents: [],
            planId: trialPlan._id.toString(),
            method: 'Cash',
            paymentReceived: true,
            amount: trialPlan.price
        });

        if (response.data.success) {
            console.log('✅ TRIAL ONBOARDING SUCCESSFUL!\n');
            console.log(`   Client ID: ${response.data.data._id}`);
            console.log(`   Status: ${response.data.data.membershipStatus} (should be "trial")`);
            console.log(`   Balance: ₹${response.data.data.balance || 0}\n`);

            console.log('📱 Check WhatsApp on', REAL_CUSTOMERS.garima.phoneNumber, '\n');
        }
    } catch (error: any) {
        console.error('❌ TRIAL ONBOARDING FAILED!\n');
        console.error('Error:', error.response?.data || error.message);
    }
}

async function test3_CoupleOnboarding() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 3: COUPLE ONBOARDING (Rishabh + Partner)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const existing = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.rishabh.phoneNumber, gymId });
    if (existing) {
        console.log(`⚠️  Client already exists: ${existing.name} (ID: ${existing._id})\n`);
        console.log('   Skipping. Delete first to test onboarding.\n');
        return;
    }

    const couplePlan = await Membership.findOne({ gymId, planType: 'couple' });
    if (!couplePlan) {
        console.log('❌ No couple plan found. Create a couple plan first.\n');
        return;
    }

    console.log('📝 Couple Onboarding Details:');
    console.log(`   Primary: ${REAL_CUSTOMERS.rishabh.name} (${REAL_CUSTOMERS.rishabh.phoneNumber})`);
    console.log(`   Dependent: Rishabh Partner (9999999992)`);
    console.log(`   Plan: ${couplePlan.planName}`);
    console.log(`   Payment: ₹${couplePlan.price} (Card, Received)\n`);

    try {
        console.log('🔄 Calling API: POST /api/client/add...\n');

        const response = await api.post('/client/add', {
            primaryDetails: {
                ...REAL_CUSTOMERS.rishabh
            },
            dependents: [{
                name: 'Rishabh Partner',
                phoneNumber: '9999999992',
                gender: 'Female',
                age: 25
            }],
            planId: couplePlan._id.toString(),
            method: 'Card',
            paymentReceived: true,
            amount: couplePlan.price
        });

        if (response.data.success) {
            console.log('✅ COUPLE ONBOARDING SUCCESSFUL!\n');
            console.log(`   Primary Client ID: ${response.data.data._id}`);

            const membership = await AssignedMembership.findOne({ primaryMemberId: response.data.data._id });
            console.log(`   Total Members: ${membership?.memberIds.length || 0} (should be 2)\n`);

            console.log('📱 Check WhatsApp on', REAL_CUSTOMERS.rishabh.phoneNumber, '\n');
        }
    } catch (error: any) {
        console.error('❌ COUPLE ONBOARDING FAILED!\n');
        console.error('Error:', error.response?.data || error.message);
    }
}

async function test4_StandardRenewal() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 4: STANDARD RENEWAL (Pushkara)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const client = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.pushkara.phoneNumber, gymId });
    if (!client) {
        console.log('❌ Client not found. Run Test 1 first to onboard.\n');
        return;
    }

    console.log(`✅ Found client: ${client.name} (ID: ${client._id})`);
    console.log(`   Current Status: ${client.membershipStatus}\n`);

    const planId = Object.values(planIds)[0];
    const today = dayjs().format('YYYY-MM-DD');

    console.log('📝 Renewal Details:');
    console.log(`   Plan: Individual (1 month)`);
    console.log(`   Start Date: ${today}`);
    console.log(`   Payment: ₹1500 (UPI, Received)\n`);

    try {
        console.log('🔄 Calling API: PATCH /api/client/renew...\n');

        const response = await api.patch('/client/renew', {
            id: client._id.toString(),
            planId: planId,
            startDate: today,
            amount: 1500,
            method: 'UPI',
            paymentReceived: true,
            dependents: []
        });

        if (response.data.success) {
            console.log('✅ RENEWAL SUCCESSFUL!\n');
            console.log(`   Membership renewed for ${client.name}`);
            console.log('📱 Check WhatsApp for renewal confirmation\n');
        }
    } catch (error: any) {
        console.error('❌ RENEWAL FAILED!\n');
        console.error('Error:', error.response?.data || error.message);
    }
}

async function test5_AdvanceRenewal() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 5: ADVANCE RENEWAL (Garima - Future Start Date)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const client = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.garima.phoneNumber, gymId });
    if (!client) {
        console.log('❌ Client not found. Run Test 2 first to onboard.\n');
        return;
    }

    console.log(`✅ Found client: ${client.name} (ID: ${client._id})`);
    console.log(`   Current Status: ${client.membershipStatus}\n`);

    const planId = Object.values(planIds)[0];
    const futureDate = dayjs().add(10, 'day').format('YYYY-MM-DD');

    console.log('📝 Advance Renewal Details:');
    console.log(`   Plan: Individual (1 month)`);
    console.log(`   Start Date: ${futureDate} (10 days from now)`);
    console.log(`   Payment: ₹1500 (Card, Received)\n`);

    try {
        console.log('🔄 Calling API: PATCH /api/client/renew...\n');

        const response = await api.patch('/client/renew', {
            id: client._id.toString(),
            planId: planId,
            startDate: futureDate,
            amount: 1500,
            method: 'Card',
            paymentReceived: true,
            dependents: []
        });

        if (response.data.success) {
            console.log('✅ ADVANCE RENEWAL SUCCESSFUL!\n');

            const updated = await Client.findById(client._id);
            console.log(`   Upcoming Membership: ${updated?.upcomingMembership ? 'Set ✅' : 'Not Set ❌'}`);
            console.log(`   Current Status: ${updated?.membershipStatus}\n`);
            console.log('📱 Check WhatsApp for renewal confirmation\n');
        }
    } catch (error: any) {
        console.error('❌ ADVANCE RENEWAL FAILED!\n');
        console.error('Error:', error.response?.data || error.message);
    }
}

async function test6_CronExpiryCheck() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 6: RUN EXPIRY CHECK (CRON JOB)');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🔄 Calling API: POST /api/system/run-expiry-check...\n');

    try {
        const response = await api.post('/system/run-expiry-check', {
            secret: process.env.CRON_SECRET
        });

        if (response.data.success) {
            console.log('✅ EXPIRY CHECK COMPLETED!\n');
            console.log('   This CRON job:');
            console.log('   1. Promotes future memberships (if start date is today)');
            console.log('   2. Marks expired memberships');
            console.log('   3. Sends renewal reminders (3 days before expiry)\n');

            console.log('📊 Check your database for updated membership statuses\n');
        }
    } catch (error: any) {
        console.error('❌ EXPIRY CHECK FAILED!\n');
        console.error('Error:', error.response?.data || error.message);
    }
}

async function test7_GetClientStats() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('TEST 7: GET CLIENT STATS');
    console.log('═══════════════════════════════════════════════════════════\n');

    try {
        console.log('🔄 Calling API: GET /api/client/stats...\n');

        const response = await api.get('/client/stats');

        if (response.data.success) {
            console.log('✅ STATS RETRIEVED!\n');
            const stats = response.data.data;
            console.log(`   Total Clients: ${stats.totalClients}`);
            console.log(`   Active Members: ${stats.activeMembers}`);
            console.log(`   Expired Members: ${stats.expiredMembers}`);
            console.log(`   Upcoming Members: ${stats.upcomingMembers || 0}\n`);
        }
    } catch (error: any) {
        console.error('❌ FAILED TO GET STATS!\n');
        console.error('Error:', error.response?.data || error.message);
    }
}

// ============================================
// MAIN RUNNER
// ============================================

async function main() {
    const testNumber = process.argv[2];

    if (!testNumber) {
        console.log('\n⚠️  No test specified!\n');
        console.log('Usage: npx tsx src/tests/realWorldMembershipTest.ts <test_number>\n');
        console.log('Available tests:');
        console.log('  1  - Individual Onboarding (Pushkara)');
        console.log('  2  - Trial Onboarding (Garima)');
        console.log('  3  - Couple Onboarding (Rishabh)');
        console.log('  4  - Standard Renewal (Pushkara)');
        console.log('  5  - Advance Renewal (Garima)');
        console.log('  6  - Run Expiry Check (CRON)');
        console.log('  7  - Get Client Stats');
        console.log('  all - Run all tests\n');
        process.exit(0);
    }

    try {
        await setup();
        const loggedIn = await loginToRealGym();

        if (!loggedIn) {
            console.log('\n❌ Login failed. Cannot proceed with tests.\n');
            process.exit(1);
        }

        console.log('═══════════════════════════════════════════════════════════\n');

        switch (testNumber) {
            case '1':
                await test1_IndividualOnboarding();
                break;
            case '2':
                await test2_TrialOnboarding();
                break;
            case '3':
                await test3_CoupleOnboarding();
                break;
            case '4':
                await test4_StandardRenewal();
                break;
            case '5':
                await test5_AdvanceRenewal();
                break;
            case '6':
                await test6_CronExpiryCheck();
                break;
            case '7':
                await test7_GetClientStats();
                break;
            case 'all':
                await test1_IndividualOnboarding();
                await test2_TrialOnboarding();
                await test3_CoupleOnboarding();
                await test4_StandardRenewal();
                await test5_AdvanceRenewal();
                await test6_CronExpiryCheck();
                await test7_GetClientStats();
                break;
            default:
                console.log(`\n❌ Unknown test: ${testNumber}\n`);
        }

        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('✅ Testing complete! Data is saved in your database.\n');

    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
