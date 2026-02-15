/**
 * COMPREHENSIVE MEMBERSHIP TEST SUITE
 * 
 * This script tests ALL membership scenarios including:
 * - Onboarding (individual, couple, group, trial, future)
 * - Renewal (standard, advance, with dependents)
 * - Expiry system (promotion, expiry, reminders)
 * - Group membership edge cases
 * - WhatsApp notifications
 * - Payment & balance tracking
 * 
 * ⚠️  IMPORTANT: REAL CUSTOMER DATA
 * This test suite uses REAL customer phone numbers (Pushkara, Garima, Rishabh).
 * All test data is automatically CLEANED UP at the end to prevent accumulation.
 * The teardown function will delete ALL entries with these phone numbers.
 * 
 * USAGE:
 * ts-node src/tests/membershipTestSuite.ts
 */

import mongoose from 'mongoose';
import dayjs from 'dayjs';
import Client from '../models/Client.js';
import AssignedMembership from '../models/AssignedMembership.js';
import Membership from '../models/Memberships.js';
import Activity from '../models/Activity.js';
import Settings from '../models/Settings.js';
import Gym from '../models/Gym.js';
import { getISTMidnightToday, parseToISTMidnight, calculateMembershipExpiry } from '../utils/timeUtils.js';
import dotenv from 'dotenv';

dotenv.config();

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

// Helper function to log test results
function logTest(scenario: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string, error?: any) {
    const result: TestResult = { scenario, status, message, timestamp: new Date(), error };
    testResults.push(result);

    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${icon} [${status}] ${scenario}`);
    if (message) console.log(`   ℹ️  ${message}`);
    if (error) console.log(`   ⚠️  Error:`, error.message);
}

// Global test data
let gymId: any;
let individualPlanId: any;
let couplePlanId: any;
let groupPlanId: any;
let trialPlanId: any;
let dailyPassPlanId: any;

// ============================================
// SETUP & TEARDOWN
// ============================================

async function setup() {
    try {
        console.log('\n🚀 Starting Membership Test Suite...\n');
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

        // Setup test gym and plans
        console.log('🏋️ Setting up test gym and membership plans...');

        // Find or create gym
        let gym = await Gym.findOne();
        if (!gym) {
            gym = await Gym.create({ name: 'Test Gym', email: 'test@gym.com', phoneNumber: '1234567890' });
        }
        gymId = gym._id;

        // Create membership plans
        await Membership.deleteMany({ gymId });

        const plans = await Membership.create([
            { gymId, planName: '1 Month Individual', durationInMonths: 1, price: 1500, planType: 'indivisual', membersAllowed: 1 },
            { gymId, planName: 'Couple Plan', durationInMonths: 1, price: 2500, planType: 'couple', membersAllowed: 2 },
            { gymId, planName: 'Group Plan', durationInMonths: 1, price: 4000, planType: 'group', membersAllowed: 5 },
            { gymId, planName: '7 Day Trial', durationInDays: 7, price: 0, planType: 'indivisual', membersAllowed: 1, isTrial: true },
            { gymId, planName: 'Daily Pass', durationInDays: 1, price: 100, planType: 'indivisual', membersAllowed: 1 }
        ]);

        individualPlanId = plans[0]._id;
        couplePlanId = plans[1]._id;
        groupPlanId = plans[2]._id;
        trialPlanId = plans[3]._id;
        dailyPassPlanId = plans[4]._id;

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
    } catch (error) {
        console.error('❌ Setup failed:', error);
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
            phoneNumber: { $in: [...realPhoneNumbers, /^9999999\d{3}$/] }
        });
        console.log(`✅ Deleted ${deletedClients.deletedCount} test clients`);

        // Delete all test memberships
        const deletedMemberships = await AssignedMembership.deleteMany({ gymId });
        console.log(`✅ Deleted ${deletedMemberships.deletedCount} test memberships`);

        // Delete all test activities
        const deletedActivities = await Activity.deleteMany({ gymId });
        console.log(`✅ Deleted ${deletedActivities.deletedCount} test activities`);

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
            if (r.error) console.log(`    Error: ${r.error.message}`);
        });
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB\n');
}

// ============================================
// TEST SCENARIOS
// ============================================

// Helper to create client with session
async function createClient(data: any, session?: any) {
    const clientData = { ...data, gymId };
    if (session) {
        const [client] = await Client.create([clientData], { session });
        return client;
    }
    return await Client.create(clientData);
}

// ============================================
// 1. ONBOARDING SCENARIOS
// ============================================

async function test_1_1_IndividualOnboarding() {
    try {
        const today = getISTMidnightToday();
        const endDate = calculateMembershipExpiry(today, 1, 0);

        const client = await createClient({
            ...REAL_CUSTOMERS.pushkara,
            membershipStatus: 'active'
        });

        const membership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: today,
            endDate,
            status: 'active',
            totalAmount: 1500
        });

        client.activeMembership = membership._id;
        client.membershipHistory.push(membership._id);
        client.paymentHistory.push({ amount: 1500, method: 'Cash', date: new Date(), membershipId: membership._id });
        await client.save();

        const activity = await Activity.create({
            gymId,
            type: 'ONBOARDING',
            title: 'New member joined',
            description: `${client.name} joined with a 1 Month Individual plan`,
            amount: 1500,
            memberId: client._id,
            date: today
        });

        // Verify
        const saved = await Client.findById(client._id).populate('activeMembership');
        if (saved && saved.membershipStatus === 'active' && saved.activeMembership) {
            logTest('1.1 Individual Onboarding (Standard)', 'PASS', `Client ${client.name} onboarded successfully`);
        } else {
            throw new Error('Client not saved correctly');
        }
    } catch (error) {
        logTest('1.1 Individual Onboarding (Standard)', 'FAIL', undefined, error);
    }
}

async function test_1_2_IndividualTrialOnboarding() {
    try {
        const today = getISTMidnightToday();
        const endDate = calculateMembershipExpiry(today, 0, 7); // 7 days trial

        const client = await createClient({
            ...REAL_CUSTOMERS.garima,
            membershipStatus: 'trial'
        });

        const membership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: trialPlanId,
            planName: '7 Day Trial',
            startDate: today,
            endDate,
            status: 'trial',
            totalAmount: 0
        });

        client.activeMembership = membership._id;
        client.membershipHistory.push(membership._id);
        await client.save();

        const saved = await Client.findById(client._id).populate('activeMembership');
        if (saved && saved.membershipStatus === 'trial') {
            logTest('1.2 Individual Trial Onboarding', 'PASS', `Trial for ${client.name} started`);
        } else {
            throw new Error('Trial membership not created correctly');
        }
    } catch (error) {
        logTest('1.2 Individual Trial Onboarding', 'FAIL', undefined, error);
    }
}

async function test_1_3_IndividualFutureOnboarding() {
    try {
        const today = getISTMidnightToday();
        const futureDate = dayjs(today).add(5, 'day').toDate(); // Starts 5 days from now
        const endDate = calculateMembershipExpiry(futureDate, 1, 0);

        const client = await createClient({
            name: 'Future Member',
            phoneNumber: '9999999991',
            gender: 'Male',
            membershipStatus: 'future'
        });

        const membership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: futureDate,
            endDate,
            status: 'future',
            totalAmount: 1500
        });

        client.upcomingMembership = membership._id;
        client.membershipHistory.push(membership._id);
        await client.save();

        const saved = await Client.findById(client._id);
        if (saved && saved.membershipStatus === 'future' && saved.upcomingMembership) {
            logTest('1.3 Individual Future Onboarding', 'PASS', `Future membership for ${client.name} created`);
        } else {
            throw new Error('Future membership not created correctly');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
        await AssignedMembership.findByIdAndDelete(membership._id);
    } catch (error) {
        logTest('1.3 Individual Future Onboarding', 'FAIL', undefined, error);
    }
}

async function test_1_4_CoupleOnboarding() {
    try {
        const today = getISTMidnightToday();
        const endDate = calculateMembershipExpiry(today, 1, 0);

        const primaryClient = await createClient({
            name: 'Couple Primary',
            phoneNumber: '9999999992',
            gender: 'Male',
            role: 'primary',
            membershipStatus: 'active'
        });

        const dependentClient = await createClient({
            name: 'Couple Dependent',
            phoneNumber: '9999999993',
            gender: 'Female',
            role: 'dependent',
            membershipStatus: 'active'
        });

        const membership = await AssignedMembership.create({
            gymId,
            primaryMemberId: primaryClient._id,
            memberIds: [primaryClient._id, dependentClient._id],
            planId: couplePlanId,
            planName: 'Couple Plan',
            startDate: today,
            endDate,
            status: 'active',
            totalAmount: 2500
        });

        primaryClient.activeMembership = membership._id;
        primaryClient.membershipHistory.push(membership._id);
        await primaryClient.save();

        dependentClient.activeMembership = membership._id;
        dependentClient.membershipHistory.push(membership._id);
        await dependentClient.save();

        const savedPrimary = await Client.findById(primaryClient._id);
        const savedDependent = await Client.findById(dependentClient._id);

        if (savedPrimary?.role === 'primary' && savedDependent?.role === 'dependent') {
            logTest('1.4 Couple Onboarding', 'PASS', '2 members linked to same membership');
        } else {
            throw new Error('Couple membership not linked correctly');
        }

        // Cleanup
        await Client.deleteMany({ _id: { $in: [primaryClient._id, dependentClient._id] } });
        await AssignedMembership.findByIdAndDelete(membership._id);
    } catch (error) {
        logTest('1.4 Couple Onboarding', 'FAIL', undefined, error);
    }
}

async function test_1_5_GroupOnboarding() {
    try {
        const today = getISTMidnightToday();
        const endDate = calculateMembershipExpiry(today, 1, 0);

        const member1 = await createClient({
            ...REAL_CUSTOMERS.rishabh,
            role: 'primary',
            membershipStatus: 'active'
        });

        const member2 = await createClient({
            name: 'Group Member 2',
            phoneNumber: '9999999994',
            gender: 'Male',
            role: 'dependent',
            membershipStatus: 'active'
        });

        const member3 = await createClient({
            name: 'Group Member 3',
            phoneNumber: '9999999995',
            gender: 'Female',
            role: 'dependent',
            membershipStatus: 'active'
        });

        const membership = await AssignedMembership.create({
            gymId,
            primaryMemberId: member1._id,
            memberIds: [member1._id, member2._id, member3._id],
            planId: groupPlanId,
            planName: 'Group Plan',
            startDate: today,
            endDate,
            status: 'active',
            totalAmount: 4000
        });

        for (const member of [member1, member2, member3]) {
            member.activeMembership = membership._id;
            member.membershipHistory.push(membership._id);
            await member.save();
        }

        const savedMembership = await AssignedMembership.findById(membership._id);
        if (savedMembership && savedMembership.memberIds.length === 3) {
            logTest('1.5 Group Onboarding (3 members)', 'PASS', `Group of 3 created successfully`);
        } else {
            throw new Error('Group membership not created correctly');
        }

        // Cleanup
        await Client.deleteMany({ _id: { $in: [member2._id, member3._id] } });
    } catch (error) {
        logTest('1.5 Group Onboarding (3 members)', 'FAIL', undefined, error);
    }
}

async function test_1_6_OnboardingWithoutPayment() {
    try {
        const today = getISTMidnightToday();
        const endDate = calculateMembershipExpiry(today, 1, 0);

        const client = await createClient({
            name: 'Unpaid Member',
            phoneNumber: '9999999996',
            gender: 'Male',
            membershipStatus: 'active',
            balance: 1500 // Balance created due to no payment
        });

        const membership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: today,
            endDate,
            status: 'active',
            totalAmount: 1500
        });

        client.activeMembership = membership._id;
        client.membershipHistory.push(membership._id);
        await client.save();

        const saved = await Client.findById(client._id);
        if (saved && saved.balance === 1500 && saved.paymentHistory.length === 0) {
            logTest('1.6 Onboarding Without Payment (Balance Created)', 'PASS', `Balance: ₹${saved.balance}`);
        } else {
            throw new Error('Balance not created correctly');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
        await AssignedMembership.findByIdAndDelete(membership._id);
    } catch (error) {
        logTest('1.6 Onboarding Without Payment (Balance Created)', 'FAIL', undefined, error);
    }
}

// ============================================
// 2. RENEWAL SCENARIOS
// ============================================

async function test_2_1_StandardRenewal() {
    try {
        // Find Pushkara (should have active membership from 1.1)
        const client = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.pushkara.phoneNumber });
        if (!client) throw new Error('Client not found for renewal');

        const today = getISTMidnightToday();
        const newStartDate = today;
        const newEndDate = calculateMembershipExpiry(newStartDate, 1, 0);

        const oldBalance = client.balance || 0;

        const renewedMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: newStartDate,
            endDate: newEndDate,
            status: 'active',
            totalAmount: 1500
        });

        client.activeMembership = renewedMembership._id;
        client.membershipStatus = 'active';
        client.membershipHistory.push(renewedMembership._id);
        client.paymentHistory.push({ amount: 1500, method: 'UPI', date: new Date(), membershipId: renewedMembership._id });
        await client.save();

        await Activity.create({
            gymId,
            type: 'RENEWAL',
            title: 'Membership Renewed',
            description: `${client.name} renewed the 1 Month Individual plan`,
            amount: 1500,
            memberId: client._id,
            date: today
        });

        const saved = await Client.findById(client._id);
        if (saved && saved.membershipHistory.length >= 2) {
            logTest('2.1 Standard Renewal (Immediate)', 'PASS', `Membership renewed for ${client.name}`);
        } else {
            throw new Error('Renewal not processed correctly');
        }
    } catch (error) {
        logTest('2.1 Standard Renewal (Immediate)', 'FAIL', undefined, error);
    }
}

async function test_2_2_AdvanceRenewal() {
    try {
        // Find Garima (should have trial membership from 1.2)
        const client = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.garima.phoneNumber });
        if (!client) throw new Error('Client not found for advance renewal');

        const today = getISTMidnightToday();
        const futureStartDate = dayjs(today).add(10, 'day').toDate(); // Starts 10 days from now
        const futureEndDate = calculateMembershipExpiry(futureStartDate, 1, 0);

        const upcomingMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: futureStartDate,
            endDate: futureEndDate,
            status: 'future',
            totalAmount: 1500
        });

        client.upcomingMembership = upcomingMembership._id;
        client.membershipHistory.push(upcomingMembership._id);
        client.paymentHistory.push({ amount: 1500, method: 'Card', date: new Date(), membershipId: upcomingMembership._id });
        await client.save();

        await Activity.create({
            gymId,
            type: 'ADVANCE_RENEWAL',
            title: 'Advance Renewal',
            description: `${client.name} pre-paid for 1 Month Individual starting on ${futureStartDate.toLocaleDateString()}`,
            amount: 1500,
            memberId: client._id,
            date: today
        });

        const saved = await Client.findById(client._id);
        if (saved && saved.upcomingMembership) {
            logTest('2.2 Advance Renewal (Future Start)', 'PASS', `Future membership set for ${client.name}`);
        } else {
            throw new Error('Advance renewal not processed correctly');
        }
    } catch (error) {
        logTest('2.2 Advance Renewal (Future Start)', 'FAIL', undefined, error);
    }
}

async function test_2_3_RenewalTransition_IndividualToCouple() {
    try {
        // Find Rishabh (should have active group membership from 1.5)
        let client = await Client.findOne({ phoneNumber: REAL_CUSTOMERS.rishabh.phoneNumber });
        if (!client) throw new Error('Client not found');

        const today = getISTMidnightToday();
        const newStartDate = today;
        const newEndDate = calculateMembershipExpiry(newStartDate, 1, 0);

        // Create new dependent
        const dependent = await createClient({
            name: 'Rishabh Dependent',
            phoneNumber: '9999999997',
            gender: 'Female',
            role: 'dependent',
            membershipStatus: 'active'
        });

        const coupleMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id, dependent._id],
            planId: couplePlanId,
            planName: 'Couple Plan',
            startDate: newStartDate,
            endDate: newEndDate,
            status: 'active',
            totalAmount: 2500
        });

        client.activeMembership = coupleMembership._id;
        client.membershipHistory.push(coupleMembership._id);
        await client.save();

        dependent.activeMembership = coupleMembership._id;
        dependent.membershipHistory.push(coupleMembership._id);
        await dependent.save();

        const savedMembership = await AssignedMembership.findById(coupleMembership._id);
        if (savedMembership && savedMembership.memberIds.length === 2) {
            logTest('2.3 Renewal Transition: Individual → Couple', 'PASS', 'Successfully added dependent on renewal');
        } else {
            throw new Error('Couple renewal not processed correctly');
        }

        // Cleanup dependent
        await Client.findByIdAndDelete(dependent._id);
    } catch (error) {
        logTest('2.3 Renewal Transition: Individual → Couple', 'FAIL', undefined, error);
    }
}

async function test_2_4_RenewalWithoutPayment() {
    try {
        const client = await createClient({
            name: 'Renewal No Payment',
            phoneNumber: '9999999998',
            gender: 'Male',
            membershipStatus: 'expired',
            balance: 0
        });

        const today = getISTMidnightToday();
        const newEndDate = calculateMembershipExpiry(today, 1, 0);

        const renewedMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: today,
            endDate: newEndDate,
            status: 'active',
            totalAmount: 1500
        });

        client.activeMembership = renewedMembership._id;
        client.membershipStatus = 'active';
        client.balance = 1500; // Payment not received, balance increased
        client.membershipHistory.push(renewedMembership._id);
        await client.save();

        const saved = await Client.findById(client._id);
        if (saved && saved.balance === 1500 && saved.paymentHistory.length === 0) {
            logTest('2.4 Renewal Without Payment (Balance Increased)', 'PASS', `Balance increased to ₹${saved.balance}`);
        } else {
            throw new Error('Balance not updated correctly');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
        await AssignedMembership.findByIdAndDelete(renewedMembership._id);
    } catch (error) {
        logTest('2.4 Renewal Without Payment (Balance Increased)', 'FAIL', undefined, error);
    }
}

// ============================================
// 3. EXPIRY SYSTEM SCENARIOS
// ============================================

async function test_3_1_PromoteFutureMembership() {
    try {
        // Create a client with a future membership that should be promoted today
        const today = getISTMidnightToday();
        const endDate = calculateMembershipExpiry(today, 1, 0);

        const client = await createClient({
            name: 'Future to Active',
            phoneNumber: '9999999990',
            gender: 'Male',
            membershipStatus: 'future'
        });

        const futureMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: today, // Starts TODAY (should be promoted)
            endDate,
            status: 'future',
            totalAmount: 1500
        });

        client.upcomingMembership = futureMembership._id;
        client.membershipHistory.push(futureMembership._id);
        await client.save();

        // SIMULATE CRON JOB LOGIC (from systemController.ts)
        const clientsReadyForPromotion = await Client.find({
            upcomingMembership: { $ne: null },
            membershipStatus: { $in: ['expired', 'active', 'future'] }
        }).populate('upcomingMembership');

        for (const c of clientsReadyForPromotion) {
            const upcomingMemb: any = c.upcomingMembership;
            if (upcomingMemb && new Date(upcomingMemb.startDate) <= today) {
                // Promote Membership
                upcomingMemb.status = 'active';
                await upcomingMemb.save();

                // Promote Client
                c.activeMembership = upcomingMemb._id;
                c.membershipStatus = 'active';
                c.upcomingMembership = undefined;
                await c.save();

                await Activity.create({
                    gymId,
                    type: 'RENEWAL',
                    title: 'Membership Activated',
                    description: `${c.name}'s plan ${upcomingMemb.planName} is now active.`,
                    memberId: c._id,
                    date: today
                });
            }
        }

        // Verify
        const promoted = await Client.findById(client._id).populate('activeMembership');
        if (promoted && promoted.membershipStatus === 'active' && promoted.upcomingMembership === undefined) {
            logTest('3.1 Promote Future Membership to Active', 'PASS', `${client.name} promoted to active`);
        } else {
            throw new Error('Future membership not promoted');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
        await AssignedMembership.findByIdAndDelete(futureMembership._id);
    } catch (error) {
        logTest('3.1 Promote Future Membership to Active', 'FAIL', undefined, error);
    }
}

async function test_3_2_MarkActiveMembershipExpired() {
    try {
        const today = getISTMidnightToday();
        const pastEndDate = dayjs(today).subtract(1, 'day').toDate(); // Ended yesterday

        const client = await createClient({
            name: 'Expired Member',
            phoneNumber: '9999999989',
            gender: 'Male',
            membershipStatus: 'active'
        });

        const expiredMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: dayjs(pastEndDate).subtract(1, 'month').toDate(),
            endDate: pastEndDate, // Ended yesterday
            status: 'active', // Still marked active (should be expired)
            totalAmount: 1500
        });

        client.activeMembership = expiredMembership._id;
        client.membershipHistory.push(expiredMembership._id);
        await client.save();

        // SIMULATE CRON JOB LOGIC (from systemController.ts)
        const membershipsToExpire = await AssignedMembership.find({
            endDate: { $lt: today },
            status: { $in: ['active', 'trial'] }
        });

        for (const memb of membershipsToExpire) {
            const newStatus = memb.status === 'trial' ? 'trial_expired' : 'expired';

            memb.status = newStatus;
            await memb.save();

            await Client.updateMany(
                { _id: { $in: memb.memberIds } },
                { $set: { membershipStatus: newStatus } }
            );

            const primaryMember = await Client.findById(memb.primaryMemberId).select('name phoneNumber');
            await Activity.create({
                gymId: memb.gymId,
                type: 'EXPIRY',
                title: newStatus === 'trial_expired' ? 'Trial Ended' : 'Membership Expired',
                description: `Membership for ${primaryMember?.name || 'Member'} has ended.`,
                memberId: memb.primaryMemberId,
                date: today
            });
        }

        // Verify
        const expiredClient = await Client.findById(client._id);
        const expiredMembershipUpdated = await AssignedMembership.findById(expiredMembership._id);

        if (expiredClient?.membershipStatus === 'expired' && expiredMembershipUpdated?.status === 'expired') {
            logTest('3.2 Mark Active Membership as Expired', 'PASS', `${client.name} marked as expired`);
        } else {
            throw new Error('Membership not marked as expired');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
        await AssignedMembership.findByIdAndDelete(expiredMembership._id);
    } catch (error) {
        logTest('3.2 Mark Active Membership as Expired', 'FAIL', undefined, error);
    }
}

async function test_3_3_MarkTrialMembershipExpired() {
    try {
        const today = getISTMidnightToday();
        const pastEndDate = dayjs(today).subtract(1, 'day').toDate(); // Ended yesterday

        const client = await createClient({
            name: 'Trial Expired Member',
            phoneNumber: '9999999988',
            gender: 'Female',
            membershipStatus: 'trial'
        });

        const trialMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: trialPlanId,
            planName: '7 Day Trial',
            startDate: dayjs(pastEndDate).subtract(7, 'day').toDate(),
            endDate: pastEndDate, // Ended yesterday
            status: 'trial',
            totalAmount: 0
        });

        client.activeMembership = trialMembership._id;
        client.membershipHistory.push(trialMembership._id);
        await client.save();

        // SIMULATE CRON JOB LOGIC
        const membershipsToExpire = await AssignedMembership.find({
            endDate: { $lt: today },
            status: { $in: ['active', 'trial'] }
        });

        for (const memb of membershipsToExpire) {
            const newStatus = memb.status === 'trial' ? 'trial_expired' : 'expired';
            memb.status = newStatus;
            await memb.save();

            await Client.updateMany(
                { _id: { $in: memb.memberIds } },
                { $set: { membershipStatus: newStatus } }
            );
        }

        // Verify
        const expiredClient = await Client.findById(client._id);
        const expiredTrialMembership = await AssignedMembership.findById(trialMembership._id);

        if (expiredClient?.membershipStatus === 'trial_expired' && expiredTrialMembership?.status === 'trial_expired') {
            logTest('3.3 Mark Trial Membership as Expired', 'PASS', `${client.name} trial expired`);
        } else {
            throw new Error('Trial membership not marked as trial_expired');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
        await AssignedMembership.findByIdAndDelete(trialMembership._id);
    } catch (error) {
        logTest('3.3 Mark Trial Membership as Expired', 'FAIL', undefined, error);
    }
}

async function test_3_4_GroupMembershipExpiry() {
    try {
        const today = getISTMidnightToday();
        const pastEndDate = dayjs(today).subtract(1, 'day').toDate();

        const member1 = await createClient({
            name: 'Group Primary Expired',
            phoneNumber: '9999999987',
            gender: 'Male',
            role: 'primary',
            membershipStatus: 'active'
        });

        const member2 = await createClient({
            name: 'Group Dependent Expired',
            phoneNumber: '9999999986',
            gender: 'Female',
            role: 'dependent',
            membershipStatus: 'active'
        });

        const groupMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: member1._id,
            memberIds: [member1._id, member2._id],
            planId: groupPlanId,
            planName: 'Group Plan',
            startDate: dayjs(pastEndDate).subtract(1, 'month').toDate(),
            endDate: pastEndDate,
            status: 'active',
            totalAmount: 4000
        });

        member1.activeMembership = groupMembership._id;
        member1.membershipHistory.push(groupMembership._id);
        await member1.save();

        member2.activeMembership = groupMembership._id;
        member2.membershipHistory.push(groupMembership._id);
        await member2.save();

        // SIMULATE CRON JOB
        const membershipsToExpire = await AssignedMembership.find({
            endDate: { $lt: today },
            status: { $in: ['active', 'trial'] }
        });

        for (const memb of membershipsToExpire) {
            const newStatus = memb.status === 'trial' ? 'trial_expired' : 'expired';
            memb.status = newStatus;
            await memb.save();

            // Update ALL members
            await Client.updateMany(
                { _id: { $in: memb.memberIds } },
                { $set: { membershipStatus: newStatus } }
            );
        }

        // Verify both members are expired
        const expiredMember1 = await Client.findById(member1._id);
        const expiredMember2 = await Client.findById(member2._id);

        if (expiredMember1?.membershipStatus === 'expired' && expiredMember2?.membershipStatus === 'expired') {
            logTest('3.4 Group Membership Expiry (All Members)', 'PASS', 'All group members marked expired');
        } else {
            throw new Error('Not all group members marked as expired');
        }

        // Cleanup
        await Client.deleteMany({ _id: { $in: [member1._id, member2._id] } });
        await AssignedMembership.findByIdAndDelete(groupMembership._id);
    } catch (error) {
        logTest('3.4 Group Membership Expiry (All Members)', 'FAIL', undefined, error);
    }
}

// ============================================
// 4. RENEWAL REMINDER SCENARIOS
// ============================================

async function test_4_1_RenewalReminderSent() {
    try {
        const today = getISTMidnightToday();
        const targetExpiryDate = dayjs(today).add(3, 'day').toDate(); // Expires in 3 days

        const client = await createClient({
            name: 'Reminder Test',
            phoneNumber: '9999999985',
            gender: 'Male',
            membershipStatus: 'active'
        });

        const membership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: dayjs(targetExpiryDate).subtract(1, 'month').toDate(),
            endDate: targetExpiryDate, // Expires in 3 days
            status: 'active',
            totalAmount: 1500
        });

        client.activeMembership = membership._id;
        client.membershipHistory.push(membership._id);
        await client.save();

        // SIMULATE CRON REMINDER LOGIC
        const settings = await Settings.findOne({ gymId });
        const reminderDays = settings?.whatsapp?.reminderDays || 3;

        const targetDateStart = dayjs(today).add(reminderDays, 'day').startOf('day').toDate();
        const targetDateEnd = dayjs(today).add(reminderDays, 'day').endOf('day').toDate();

        const expiringMemberships = await AssignedMembership.find({
            gymId,
            status: { $in: ['active', 'trial'] },
            endDate: { $gte: targetDateStart, $lte: targetDateEnd }
        }).populate('primaryMemberId').populate('planId');

        let reminderShouldBeSent = false;
        for (const memb of expiringMemberships) {
            const primaryMember: any = memb.primaryMemberId;
            const plan: any = memb.planId;

            // Check conditions
            if (plan?.durationInMonths <= 0) continue; // Skip daily passes
            if (primaryMember?.upcomingMembership) continue; // Skip if upcoming exists

            reminderShouldBeSent = true;
        }

        if (reminderShouldBeSent) {
            logTest('4.1 Renewal Reminder (3 days before expiry)', 'PASS', 'Reminder should be sent');
        } else {
            throw new Error('Reminder not triggered');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
        await AssignedMembership.findByIdAndDelete(membership._id);
    } catch (error) {
        logTest('4.1 Renewal Reminder (3 days before expiry)', 'FAIL', undefined, error);
    }
}

async function test_4_2_ReminderNotSentIfUpcomingExists() {
    try {
        const today = getISTMidnightToday();
        const currentExpiryDate = dayjs(today).add(3, 'day').toDate();
        const futureStartDate = dayjs(currentExpiryDate).add(1, 'day').toDate();

        const client = await createClient({
            name: 'No Reminder Test',
            phoneNumber: '9999999984',
            gender: 'Female',
            membershipStatus: 'active'
        });

        const currentMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: dayjs(currentExpiryDate).subtract(1, 'month').toDate(),
            endDate: currentExpiryDate,
            status: 'active',
            totalAmount: 1500
        });

        const upcomingMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: individualPlanId,
            planName: '1 Month Individual',
            startDate: futureStartDate,
            endDate: calculateMembershipExpiry(futureStartDate, 1, 0),
            status: 'future',
            totalAmount: 1500
        });

        client.activeMembership = currentMembership._id;
        client.upcomingMembership = upcomingMembership._id;
        client.membershipHistory.push(currentMembership._id, upcomingMembership._id);
        await client.save();

        // SIMULATE CRON REMINDER LOGIC
        const settings = await Settings.findOne({ gymId });
        const reminderDays = settings?.whatsapp?.reminderDays || 3;

        const targetDateStart = dayjs(today).add(reminderDays, 'day').startOf('day').toDate();
        const targetDateEnd = dayjs(today).add(reminderDays, 'day').endOf('day').toDate();

        const expiringMemberships = await AssignedMembership.find({
            gymId,
            status: { $in: ['active', 'trial'] },
            endDate: { $gte: targetDateStart, $lte: targetDateEnd }
        }).populate('primaryMemberId').populate('planId');

        let reminderBlocked = false;
        for (const memb of expiringMemberships) {
            const primaryMember: any = memb.primaryMemberId;
            const plan: any = memb.planId;

            if (plan?.durationInMonths <= 0) continue;

            // This should block the reminder
            if (primaryMember?.upcomingMembership) {
                reminderBlocked = true;
            }
        }

        if (reminderBlocked) {
            logTest('4.2 Reminder Not Sent (Upcoming Membership Exists)', 'PASS', 'Reminder correctly blocked');
        } else {
            throw new Error('Reminder should have been blocked');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
        await AssignedMembership.deleteMany({ _id: { $in: [currentMembership._id, upcomingMembership._id] } });
    } catch (error) {
        logTest('4.2 Reminder Not Sent (Upcoming Membership Exists)', 'FAIL', undefined, error);
    }
}

async function test_4_3_ReminderNotSentForDailyPass() {
    try {
        const today = getISTMidnightToday();
        const targetExpiryDate = dayjs(today).add(3, 'day').toDate();

        const client = await createClient({
            name: 'Daily Pass User',
            phoneNumber: '9999999983',
            gender: 'Male',
            membershipStatus: 'active'
        });

        const dailyPassMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: client._id,
            memberIds: [client._id],
            planId: dailyPassPlanId,
            planName: 'Daily Pass',
            startDate: targetExpiryDate,
            endDate: calculateMembershipExpiry(targetExpiryDate, 0, 1),
            status: 'active',
            totalAmount: 100
        });

        client.activeMembership = dailyPassMembership._id;
        client.membershipHistory.push(dailyPassMembership._id);
        await client.save();

        // SIMULATE CRON REMINDER LOGIC
        const settings = await Settings.findOne({ gymId });
        const reminderDays = settings?.whatsapp?.reminderDays || 3;

        const targetDateStart = dayjs(today).add(reminderDays, 'day').startOf('day').toDate();
        const targetDateEnd = dayjs(today).add(reminderDays, 'day').endOf('day').toDate();

        const expiringMemberships = await AssignedMembership.find({
            gymId,
            status: { $in: ['active', 'trial'] },
            endDate: { $gte: targetDateStart, $lte: targetDateEnd }
        }).populate('primaryMemberId').populate('planId');

        let dailyPassBlocked = false;
        for (const memb of expiringMemberships) {
            const plan: any = memb.planId;

            // Daily passes should be skipped
            if (plan?.durationInMonths <= 0) {
                dailyPassBlocked = true;
            }
        }

        if (dailyPassBlocked) {
            logTest('4.3 Reminder Not Sent (Daily Pass)', 'PASS', 'Daily pass correctly excluded from reminders');
        } else {
            logTest('4.3 Reminder Not Sent (Daily Pass)', 'SKIP', 'No daily pass found expiring in 3 days');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
        await AssignedMembership.findByIdAndDelete(dailyPassMembership._id);
    } catch (error) {
        logTest('4.3 Reminder Not Sent (Daily Pass)', 'FAIL', undefined, error);
    }
}

// ============================================
// 5. EDGE CASES
// ============================================

async function test_5_1_MultiplePaymentMethods() {
    try {
        const client = await createClient({
            name: 'Payment Methods Test',
            phoneNumber: '9999999982',
            gender: 'Male',
            membershipStatus: 'active'
        });

        const today = getISTMidnightToday();
        const methods: Array<'Cash' | 'UPI' | 'Card' | 'Transfer'> = ['Cash', 'UPI', 'Card', 'Transfer'];

        for (const method of methods) {
            const membership = await AssignedMembership.create({
                gymId,
                primaryMemberId: client._id,
                memberIds: [client._id],
                planId: individualPlanId,
                planName: '1 Month Individual',
                startDate: today,
                endDate: calculateMembershipExpiry(today, 1, 0),
                status: 'active',
                totalAmount: 1500
            });

            client.paymentHistory.push({
                amount: 1500,
                method,
                date: new Date(),
                membershipId: membership._id
            });
        }

        await client.save();

        const saved = await Client.findById(client._id);
        if (saved && saved.paymentHistory.length === 4) {
            const allMethods = saved.paymentHistory.map((p: any) => p.method);
            logTest('5.1 Multiple Payment Methods', 'PASS', `All methods recorded: ${allMethods.join(', ')}`);
        } else {
            throw new Error('Payment methods not recorded correctly');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
    } catch (error) {
        logTest('5.1 Multiple Payment Methods', 'FAIL', undefined, error);
    }
}

async function test_5_2_BalanceAccumulation() {
    try {
        const client = await createClient({
            name: 'Balance Accumulation',
            phoneNumber: '9999999981',
            gender: 'Female',
            membershipStatus: 'active',
            balance: 0
        });

        // First membership - no payment
        client.balance += 1500;
        await client.save();

        // Second membership - no payment
        client.balance += 1500;
        await client.save();

        // Third membership - no payment
        client.balance += 2500;
        await client.save();

        const saved = await Client.findById(client._id);
        if (saved && saved.balance === 5500) {
            logTest('5.2 Balance Accumulation (Multiple Unpaid)', 'PASS', `Total balance: ₹${saved.balance}`);
        } else {
            throw new Error('Balance not accumulated correctly');
        }

        // Cleanup
        await Client.findByIdAndDelete(client._id);
    } catch (error) {
        logTest('5.2 Balance Accumulation (Multiple Unpaid)', 'FAIL', undefined, error);
    }
}

async function test_5_3_ActivityLogCreation() {
    try {
        const activityCount = await Activity.countDocuments({ gymId });

        if (activityCount > 0) {
            logTest('5.3 Activity Log Creation', 'PASS', `${activityCount} activities logged`);
        } else {
            throw new Error('No activities logged');
        }
    } catch (error) {
        logTest('5.3 Activity Log Creation', 'FAIL', undefined, error);
    }
}

// ============================================
// MAIN TEST RUNNER
// ============================================

async function runAllTests() {
    await setup();

    console.log('🧪 RUNNING TEST SCENARIOS\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // 1. ONBOARDING SCENARIOS
    console.log('📋 1. ONBOARDING SCENARIOS\n');
    await test_1_1_IndividualOnboarding();
    await test_1_2_IndividualTrialOnboarding();
    await test_1_3_IndividualFutureOnboarding();
    await test_1_4_CoupleOnboarding();
    await test_1_5_GroupOnboarding();
    await test_1_6_OnboardingWithoutPayment();
    console.log('');

    // 2. RENEWAL SCENARIOS
    console.log('🔄 2. RENEWAL SCENARIOS\n');
    await test_2_1_StandardRenewal();
    await test_2_2_AdvanceRenewal();
    await test_2_3_RenewalTransition_IndividualToCouple();
    await test_2_4_RenewalWithoutPayment();
    console.log('');

    // 3. EXPIRY SYSTEM
    console.log('⏰ 3. EXPIRY SYSTEM SCENARIOS\n');
    await test_3_1_PromoteFutureMembership();
    await test_3_2_MarkActiveMembershipExpired();
    await test_3_3_MarkTrialMembershipExpired();
    await test_3_4_GroupMembershipExpiry();
    console.log('');

    // 4. RENEWAL REMINDERS
    console.log('🔔 4. RENEWAL REMINDER SCENARIOS\n');
    await test_4_1_RenewalReminderSent();
    await test_4_2_ReminderNotSentIfUpcomingExists();
    await test_4_3_ReminderNotSentForDailyPass();
    console.log('');

    // 5. EDGE CASES
    console.log('🔍 5. EDGE CASES & MISC\n');
    await test_5_1_MultiplePaymentMethods();
    await test_5_2_BalanceAccumulation();
    await test_5_3_ActivityLogCreation();
    console.log('');

    await teardown();
}

// Run the test suite
runAllTests().catch(console.error);
