/**
 * COMPREHENSIVE MEMBERSHIP API INTEGRATION TESTS
 * 
 * This script tests ALL membership scenarios by calling the ACTUAL API endpoints:
 * - POST /api/client/add (onBoarding)
 * - PATCH /api/client/renew (renewMembership)
 * - POST /api/system/run-expiry-check (performExpiryChecks)
 * - GET /api/client/stats
 * - GET /api/client/clientInfo
 * 
 * ⚠️  IMPORTANT: REAL CUSTOMER DATA & REAL API CALLS
 * - Uses REAL customer phone numbers (Pushkara, Garima, Rishabh)
 * - Calls REAL API endpoints (not direct database access)
 * - Requires server to be running on localhost:3000
 * - All test data is automatically CLEANED UP at the end
 * 
 * USAGE:
 * 1. Start server: npm run dev
 * 2. Run tests: npx tsx src/tests/membershipApiTests.ts
 */

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import Client from '../models/Client.js';
import AssignedMembership from '../models/AssignedMembership.js';
import Activity from '../models/Activity.js';
import Membership from '../models/Memberships.js';
import Gym from '../models/Gym.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';
import { getISTMidnightToday, parseToISTMidnight } from '../utils/timeUtils.js';

dotenv.config();

// CONFIGURATION
const BASE_URL = 'http://localhost:8080/api';
const ADMIN_EMAIL = 'test@gymetric.com';
const ADMIN_PASSWORD = 'TestPassword123!';

// REAL CUSTOMER DATA (as provided)
const REAL_CUSTOMERS = {
    pushkara: { name: 'Pushkara Sharma', phoneNumber: '9354454113', gender: 'Male', age: 28 },
    garima: { name: 'Garima', phoneNumber: '8587930989', gender: 'Female', age: 26 },
    rishabh: { name: 'Rishabh', phoneNumber: '9625063177', gender: 'Male', age: 27 }
};

// Test Results Tracking
interface TestResult {
    scenario: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message?: string;
    error?: any;
    timestamp: Date;
}

const testResults: TestResult[] = [];

// Global state
let authToken: string;
let api: AxiosInstance;
let gymId: any;
let individualPlanId: any;
let couplePlanId: any;
let groupPlanId: any;
let trialPlanId: any;
let dailyPassPlanId: any;

// Track created client IDs for cleanup
const createdClientIds: string[] = [];

// Helper function to log test results
function logTest(scenario: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string, error?: any) {
    const result: TestResult = { scenario, status, message, timestamp: new Date(), error };
    testResults.push(result);

    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} [${status}] ${scenario}`);
    if (message) console.log(`   ℹ️  ${message}`);
    if (error) console.log(`   ⚠️  Error:`, error.message || error);
}

// ============================================
// SETUP & TEARDOWN
// ============================================

async function setup() {
    try {
        console.log('\n🚀 Starting Membership API Integration Tests...\n');
        console.log('📦 Connecting to MongoDB...');

        await mongoose.connect(process.env.MONGO_URI!);
        console.log('✅ Connected to MongoDB\n');

        // Clean up previous test data
        console.log('🧹 Cleaning up previous test data...');
        await Client.deleteMany({
            phoneNumber: { $in: Object.values(REAL_CUSTOMERS).map(c => c.phoneNumber) }
        });
        await AssignedMembership.deleteMany({});
        await Activity.deleteMany({});
        console.log('✅ Cleanup complete\n');

        // Setup API client
        console.log('🔧 Setting up API client...');
        api = axios.create({
            baseURL: BASE_URL,
            headers: { 'Content-Type': 'application/json' }
        });

        // Check if server is running
        try {
            await axios.get('http://localhost:8080/health');
            console.log('✅ Server is running\n');
        } catch (error) {
            throw new Error('Server is not running. Please start with: npm run dev');
        }

        // Setup gym, admin, and login
        console.log('🏋️ Setting up test gym and admin...');

        // Clean up previous gym/user
        const existingUser = await User.findOne({ username: ADMIN_EMAIL });
        if (existingUser && existingUser.gymId) {
            await Gym.findByIdAndDelete(existingUser.gymId);
        }
        await User.deleteMany({ username: ADMIN_EMAIL });

        // Create gym and admin via API
        try {
            const setupResponse = await api.post('/auth/setup', {
                gymName: 'Test Gymetric',
                adminName: 'Test Admin',
                username: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
                contactNumber: '1234567890'
            });
            console.log('✅ Gym and admin created\n');
        } catch (error: any) {
            // Gym might already exist, try to login
            if (error.response?.status === 400 || error.response?.status === 500) {
                console.log('⚠️  Gym already exists, proceeding to login...\n');
            } else {
                throw error;
            }
        }

        // Login to get auth token
        console.log('🔐 Logging in...');
        const loginResponse = await api.post('/auth/login', {
            username: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        if (!loginResponse.data.success) {
            throw new Error('Login failed');
        }

        authToken = loginResponse.data.data.token;
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        console.log('✅ Authenticated successfully\n');

        // Get gym ID from logged in user
        const user = await User.findOne({ username: ADMIN_EMAIL }).populate('gymId');
        if (!user || !user.gymId) throw new Error('User or Gym not found');
        gymId = (user.gymId as any)._id;

        // Create membership plans
        console.log('📋 Creating membership plans...');
        await Membership.deleteMany({ gymId });

        const plans = await Membership.create([
            { gymId, planName: '1 Month Individual', durationInMonths: 1, price: 1500, planType: 'indivisual', membersAllowed: 1 },
            { gymId, planName: 'Couple Plan', durationInMonths: 1, price: 2500, planType: 'couple', membersAllowed: 2 },
            { gymId, planName: 'Group Plan', durationInMonths: 1, price: 4000, planType: 'group', membersAllowed: 5 },
            { gymId, planName: '7 Day Trial', durationInDays: 7, price: 0, planType: 'indivisual', membersAllowed: 1, isTrial: true },
            { gymId, planName: 'Daily Pass', durationInDays: 1, price: 100, planType: 'indivisual', membersAllowed: 1 }
        ]);

        individualPlanId = plans[0]._id.toString();
        couplePlanId = plans[1]._id.toString();
        groupPlanId = plans[2]._id.toString();
        trialPlanId = plans[3]._id.toString();
        dailyPassPlanId = plans[4]._id.toString();
        console.log('✅ Membership plans created\n');

        // Setup Settings with WhatsApp
        await Settings.findOneAndUpdate(
            { gymId },
            {
                gymId,
                whatsapp: {
                    active: true,
                    phoneNumberId: 'test_phone_id',
                    accessToken: 'test_token',
                    sendOnOnboarding: true,
                    sendOnRenewal: true,
                    sendOnExpiry: true,
                    sendOnReminder: true,
                    reminderDays: 3
                }
            },
            { upsert: true, new: true }
        );

        console.log('✅ Test environment setup complete\n');
        console.log('═══════════════════════════════════════════════════════════\n');
    } catch (error: any) {
        console.error('❌ Setup failed:', error.message);
        throw error;
    }
}

async function teardown() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n🧹 CLEANING UP TEST DATA...\n');

    try {
        // Delete all test clients (including real customer test entries)
        const realPhoneNumbers = Object.values(REAL_CUSTOMERS).map(c => c.phoneNumber);
        const deletedClients = await Client.deleteMany({
            $or: [
                { phoneNumber: { $in: realPhoneNumbers } },
                { _id: { $in: createdClientIds } }
            ]
        });
        console.log(`✅ Deleted ${deletedClients.deletedCount} test clients`);

        // Delete all test memberships
        const deletedMemberships = await AssignedMembership.deleteMany({ gymId });
        console.log(`✅ Deleted ${deletedMemberships.deletedCount} test memberships`);

        // Delete all test activities
        const deletedActivities = await Activity.deleteMany({ gymId });
        console.log(`✅ Deleted ${deletedActivities.deletedCount} test activities`);

        // Delete test gym and user
        const testUser = await User.findOne({ username: ADMIN_EMAIL });
        if (testUser && testUser.gymId) {
            await Gym.findByIdAndDelete(testUser.gymId);
            await Settings.deleteMany({ gymId: testUser.gymId });
            await Membership.deleteMany({ gymId: testUser.gymId });
        }
        await User.deleteMany({ username: ADMIN_EMAIL });
        console.log(`✅ Deleted test gym and admin`);

        console.log('\n✅ All test data cleaned up successfully!\n');
    } catch (error) {
        console.error('⚠️  Error during cleanup:', error);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;
    const skipped = testResults.filter(r => r.status === 'SKIP').length;
    const total = testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`\nSuccess Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`\n  - ${r.scenario}`);
            if (r.message) console.log(`    ${r.message}`);
            if (r.error) console.log(`    Error: ${r.error}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
}

// ============================================
// API TEST SCENARIOS
// ============================================

// 1. ONBOARDING TESTS

async function test_1_1_IndividualOnboarding() {
    try {
        const response = await api.post('/client/add', {
            primaryDetails: {
                ...REAL_CUSTOMERS.pushkara
            },
            dependents: [],
            planId: individualPlanId,
            method: 'Cash',
            paymentReceived: true,
            amount: 1500
        });

        if (response.data.success && response.data.data._id) {
            createdClientIds.push(response.data.data._id);
            logTest('1.1 API: Individual Onboarding', 'PASS', `Client ${response.data.data.name} onboarded via API`);
        } else {
            throw new Error('Onboarding failed');
        }
    } catch (error: any) {
        logTest('1.1 API: Individual Onboarding', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_1_2_TrialOnboarding() {
    try {
        const response = await api.post('/client/add', {
            primaryDetails: {
                ...REAL_CUSTOMERS.garima
            },
            dependents: [],
            planId: trialPlanId,
            method: 'Cash',
            paymentReceived: true,
            amount: 0
        });

        if (response.data.success && response.data.data.membershipStatus === 'trial') {
            createdClientIds.push(response.data.data._id);
            logTest('1.2 API: Trial Onboarding', 'PASS', `Trial started for ${response.data.data.name}`);
        } else {
            throw new Error('Trial onboarding failed');
        }
    } catch (error: any) {
        logTest('1.2 API: Trial Onboarding', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_1_3_FutureOnboarding() {
    try {
        const futureDate = dayjs().add(5, 'day').format('YYYY-MM-DD');

        const response = await api.post('/client/add', {
            primaryDetails: {
                name: 'Future Member',
                phoneNumber: '9999999991',
                gender: 'Male',
                age: 25
            },
            dependents: [],
            planId: individualPlanId,
            method: 'UPI',
            paymentReceived: true,
            startDate: futureDate,
            amount: 1500
        });

        if (response.data.success && response.data.data.membershipStatus === 'future') {
            createdClientIds.push(response.data.data._id);
            logTest('1.3 API: Future Membership Onboarding', 'PASS', `Future membership created via API`);
        } else {
            throw new Error('Future onboarding failed');
        }
    } catch (error: any) {
        logTest('1.3 API: Future Membership Onboarding', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_1_4_CoupleOnboarding() {
    try {
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
            planId: couplePlanId,
            method: 'Card',
            paymentReceived: true,
            amount: 2500
        });

        if (response.data.success) {
            createdClientIds.push(response.data.data._id);
            // Also track the dependent
            const membership = await AssignedMembership.findOne({ primaryMemberId: response.data.data._id });
            if (membership && membership.memberIds.length === 2) {
                logTest('1.4 API: Couple Onboarding', 'PASS', `Couple with 2 members created via API`);
            } else {
                throw new Error('Couple has incorrect number of members');
            }
        } else {
            throw new Error('Couple onboarding failed');
        }
    } catch (error: any) {
        logTest('1.4 API: Couple Onboarding', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_1_5_GroupOnboarding() {
    try {
        const response = await api.post('/client/add', {
            primaryDetails: {
                name: 'Group Leader',
                phoneNumber: '9999999993',
                gender: 'Male',
                age: 30
            },
            dependents: [
                { name: 'Group Member 2', phoneNumber: '9999999994', gender: 'Male', age: 28 },
                { name: 'Group Member 3', phoneNumber: '9999999995', gender: 'Female', age: 27 }
            ],
            planId: groupPlanId,
            method: 'Transfer',
            paymentReceived: true,
            amount: 4000
        });

        if (response.data.success) {
            createdClientIds.push(response.data.data._id);
            const membership = await AssignedMembership.findOne({ primaryMemberId: response.data.data._id });
            if (membership && membership.memberIds.length === 3) {
                logTest('1.5 API: Group Onboarding (3 members)', 'PASS', `Group of 3 created via API`);
            } else {
                throw new Error('Group has incorrect number of members');
            }
        } else {
            throw new Error('Group onboarding failed');
        }
    } catch (error: any) {
        logTest('1.5 API: Group Onboarding (3 members)', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_1_6_OnboardingWithoutPayment() {
    try {
        const response = await api.post('/client/add', {
            primaryDetails: {
                name: 'Unpaid Member',
                phoneNumber: '9999999996',
                gender: 'Male',
                age: 26
            },
            dependents: [],
            planId: individualPlanId,
            method: 'Cash',
            paymentReceived: false, // NO PAYMENT
            amount: 1500
        });

        if (response.data.success && response.data.data.balance === 1500) {
            createdClientIds.push(response.data.data._id);
            logTest('1.6 API: Onboarding Without Payment', 'PASS', `Balance ₹${response.data.data.balance} created`);
        } else {
            throw new Error('Balance not created correctly');
        }
    } catch (error: any) {
        logTest('1.6 API: Onboarding Without Payment', 'FAIL', undefined, error.response?.data || error.message);
    }
}

// 2. RENEWAL TESTS

async function test_2_1_StandardRenewal() {
    try {
        // Find Pushkara's client ID
        const client = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.pushkara.phoneNumber });
        if (!client) throw new Error('Client not found for renewal');

        const today = dayjs().format('YYYY-MM-DD');

        const response = await api.patch('/client/renew', {
            id: client._id.toString(),
            planId: individualPlanId,
            startDate: today,
            amount: 1500,
            method: 'UPI',
            paymentReceived: true,
            dependents: []
        });

        if (response.data.success) {
            logTest('2.1 API: Standard Renewal', 'PASS', `Membership renewed for ${client.name}`);
        } else {
            throw new Error('Renewal failed');
        }
    } catch (error: any) {
        logTest('2.1 API: Standard Renewal', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_2_2_AdvanceRenewal() {
    try {
        const client = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.garima.phoneNumber });
        if (!client) throw new Error('Client not found');

        const futureDate = dayjs().add(10, 'day').format('YYYY-MM-DD');

        const response = await api.patch('/client/renew', {
            id: client._id.toString(),
            planId: individualPlanId,
            startDate: futureDate,
            amount: 1500,
            method: 'Card',
            paymentReceived: true,
            dependents: []
        });

        if (response.data.success) {
            const updated = await Client.findById(client._id);
            if (updated?.upcomingMembership) {
                logTest('2.2 API: Advance Renewal', 'PASS', `Future membership set via API`);
            } else {
                throw new Error('Upcoming membership not set');
            }
        } else {
            throw new Error('Advance renewal failed');
        }
    } catch (error: any) {
        logTest('2.2 API: Advance Renewal', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_2_3_RenewalAddDependent() {
    try {
        const client = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.rishabh.phoneNumber });
        if (!client) throw new Error('Client not found');

        const today = dayjs().format('YYYY-MM-DD');

        const response = await api.patch('/client/renew', {
            id: client._id.toString(),
            planId: groupPlanId,
            startDate: today,
            amount: 4000,
            method: 'Cash',
            paymentReceived: true,
            dependents: [
                { name: 'New Dependent', phoneNumber: '9999999997', gender: 'Female', age: 24 }
            ]
        });

        if (response.data.success) {
            logTest('2.3 API: Renewal with New Dependent', 'PASS', `Dependent added via renewal API`);
        } else {
            throw new Error('Renewal with dependent failed');
        }
    } catch (error: any) {
        logTest('2.3 API: Renewal with New Dependent', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_2_4_RenewalWithoutPayment() {
    try {
        const client = await Client.findOne({ phoneNumber: '9999999996' }); // Unpaid member
        if (!client) throw new Error('Client not found');

        const oldBalance = client.balance || 0;
        const today = dayjs().format('YYYY-MM-DD');

        const response = await api.patch('/client/renew', {
            id: client._id.toString(),
            planId: individualPlanId,
            startDate: today,
            amount: 1500,
            method: 'Cash',
            paymentReceived: false, // NO PAYMENT
            dependents: []
        });

        if (response.data.success) {
            const updated = await Client.findById(client._id);
            if (updated && updated.balance > oldBalance) {
                logTest('2.4 API: Renewal Without Payment', 'PASS', `Balance increased to ₹${updated.balance}`);
            } else {
                throw new Error('Balance not increased');
            }
        } else {
            throw new Error('Renewal failed');
        }
    } catch (error: any) {
        logTest('2.4 API: Renewal Without Payment', 'FAIL', undefined, error.response?.data || error.message);
    }
}

// 3. EXPIRY SYSTEM TESTS (CRON JOB)

async function test_3_1_PromoteFutureMembership() {
    try {
        // Create a future membership that should be promoted
        const today = getISTMidnightToday();

        const testClient = await Client.create({
            name: 'Promote Test',
            phoneNumber: '9999999998',
            gender: 'Male',
            gymId,
            membershipStatus: 'future'
        });
        createdClientIds.push(testClient._id.toString());

        const futureMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: testClient._id,
            memberIds: [testClient._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: today, // Starts today
            endDate: dayjs(today).add(1, 'month').toDate(),
            status: 'future',
            totalAmount: 1500
        });

        testClient.upcomingMembership = futureMembership._id;
        await testClient.save();

        // Call CRON API
        const response = await api.post('/system/run-expiry-check', {
            secret: process.env.CRON_SECRET
        });

        if (response.data.success) {
            const promoted = await Client.findById(testClient._id);
            if (promoted && promoted.membershipStatus === 'active' && !promoted.upcomingMembership) {
                logTest('3.1 API: Promote Future Membership (CRON)', 'PASS', 'Future membership promoted via CRON API');
            } else {
                throw new Error('Membership not promoted');
            }
        } else {
            throw new Error('CRON API failed');
        }
    } catch (error: any) {
        logTest('3.1 API: Promote Future Membership (CRON)', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_3_2_MarkExpired() {
    try {
        const today = getISTMidnightToday();
        const pastDate = dayjs(today).subtract(1, 'day').toDate();

        const expiredClient = await Client.create({
            name: 'Expired Test',
            phoneNumber: '9999999999',
            gender: 'Female',
            gymId,
            membershipStatus: 'active'
        });
        createdClientIds.push(expiredClient._id.toString());

        const expiredMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: expiredClient._id,
            memberIds: [expiredClient._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: dayjs(pastDate).subtract(1, 'month').toDate(),
            endDate: pastDate, // Ended yesterday
            status: 'active',
            totalAmount: 1500
        });

        expiredClient.activeMembership = expiredMembership._id;
        await expiredClient.save();

        // Call CRON API
        const response = await api.post('/system/run-expiry-check', {
            secret: process.env.CRON_SECRET
        });

        if (response.data.success) {
            const checked = await Client.findById(expiredClient._id);
            if (checked && checked.membershipStatus === 'expired') {
                logTest('3.2 API: Mark Expired via CRON', 'PASS', 'Active membership marked expired via CRON API');
            } else {
                throw new Error('Membership not marked as expired');
            }
        } else {
            throw new Error('CRON API failed');
        }
    } catch (error: any) {
        logTest('3.2 API: Mark Expired via CRON', 'FAIL', undefined, error.response?.data || error.message);
    }
}

// 4. CLIENT STATS & DATA RETRIEVAL

async function test_4_1_GetClientStats() {
    try {
        const response = await api.get('/client/stats');

        if (response.data.success) {
            const stats = response.data.data;
            logTest('4.1 API: Get Client Stats', 'PASS',
                `Active: ${stats.activeMembers}, Expired: ${stats.expiredMembers}, Total: ${stats.totalClients}`);
        } else {
            throw new Error('Stats API failed');
        }
    } catch (error: any) {
        logTest('4.1 API: Get Client Stats', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_4_2_GetClientById() {
    try {
        const client = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.pushkara.phoneNumber });
        if (!client) throw new Error('Client not found');

        const response = await api.get('/client/clientInfo', {
            params: { id: client._id.toString() }
        });

        if (response.data.success && response.data.data._id) {
            logTest('4.2 API: Get Client By ID', 'PASS', `Retrieved ${response.data.data.name} via API`);
        } else {
            throw new Error('Get client failed');
        }
    } catch (error: any) {
        logTest('4.2 API: Get Client By ID', 'FAIL', undefined, error.response?.data || error.message);
    }
}

async function test_4_3_GetAllClients() {
    try {
        const response = await api.get('/client/all');

        if (response.data.success && Array.isArray(response.data.data)) {
            logTest('4.3 API: Get All Clients', 'PASS', `Retrieved ${response.data.data.length} clients`);
        } else {
            throw new Error('Get all clients failed');
        }
    } catch (error: any) {
        logTest('4.3 API: Get All Clients', 'FAIL', undefined, error.response?.data || error.message);
    }
}

// 5. EDGE CASES

async function test_5_1_DuplicatePhoneNumber() {
    try {
        // Try to onboard with existing phone number
        const response = await api.post('/client/add', {
            primaryDetails: {
                ...REAL_CUSTOMERS.pushkara // Already exists
            },
            dependents: [],
            planId: individualPlanId,
            method: 'Cash',
            paymentReceived: true,
            amount: 1500
        });

        // Should fail
        logTest('5.1 API: Duplicate Phone Number', 'FAIL', 'Duplicate phone number was allowed (should not be)');
    } catch (error: any) {
        if (error.response?.status === 500 || error.response?.data?.error) {
            logTest('5.1 API: Duplicate Phone Number', 'PASS', 'Duplicate phone number correctly rejected');
        } else {
            throw error;
        }
    }
}

async function test_5_2_InvalidPlanId() {
    try {
        const response = await api.post('/client/add', {
            primaryDetails: {
                name: 'Invalid Plan Test',
                phoneNumber: '8888888888',
                gender: 'Male',
                age: 25
            },
            dependents: [],
            planId: '000000000000000000000000', // Invalid ID
            method: 'Cash',
            paymentReceived: true,
            amount: 1500
        });

        logTest('5.2 API: Invalid Plan ID', 'FAIL', 'Invalid plan ID was accepted');
    } catch (error: any) {
        if (error.response?.status === 404 || error.response?.status === 500) {
            logTest('5.2 API: Invalid Plan ID', 'PASS', 'Invalid plan ID correctly rejected');
        } else {
            throw error;
        }
    }
}

async function test_5_3_UnauthorizedAccess() {
    try {
        // Create API client without auth token
        const unauthApi = axios.create({ baseURL: BASE_URL });

        const response = await unauthApi.get('/client/all');

        logTest('5.3 API: Unauthorized Access', 'FAIL', 'Unauthorized access was allowed');
    } catch (error: any) {
        if (error.response?.status === 401) {
            logTest('5.3 API: Unauthorized Access', 'PASS', 'Unauthorized request correctly rejected');
        } else {
            throw error;
        }
    }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
    await setup();

    console.log('🧪 RUNNING API INTEGRATION TESTS\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. ONBOARDING
    console.log('📋 1. ONBOARDING API TESTS\n');
    await test_1_1_IndividualOnboarding();
    await test_1_2_TrialOnboarding();
    await test_1_3_FutureOnboarding();
    await test_1_4_CoupleOnboarding();
    await test_1_5_GroupOnboarding();
    await test_1_6_OnboardingWithoutPayment();
    console.log('');

    // 2. RENEWAL
    console.log('🔄 2. RENEWAL API TESTS\n');
    await test_2_1_StandardRenewal();
    await test_2_2_AdvanceRenewal();
    await test_2_3_RenewalAddDependent();
    await test_2_4_RenewalWithoutPayment();
    console.log('');

    // 3. EXPIRY SYSTEM (CRON)
    console.log('⏰ 3. EXPIRY SYSTEM (CRON API)\n');
    await test_3_1_PromoteFutureMembership();
    await test_3_2_MarkExpired();
    console.log('');

    // 4. DATA RETRIEVAL
    console.log('📊 4. CLIENT DATA RETRIEVAL APIs\n');
    await test_4_1_GetClientStats();
    await test_4_2_GetClientById();
    await test_4_3_GetAllClients();
    console.log('');

    // 5. EDGE CASES
    console.log('🔍 5. EDGE CASES & ERROR HANDLING\n');
    await test_5_1_DuplicatePhoneNumber();
    await test_5_2_InvalidPlanId();
    await test_5_3_UnauthorizedAccess();
    console.log('');

    await teardown();
}

// Run the test suite
runAllTests().catch(console.error);
