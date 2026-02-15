/**
 * Setup Membership Plans for Testing
 * 
 * This creates basic membership plans in your gym
 * 
 * USAGE:
 * npx tsx src/tests/setupMembershipPlans.ts corewave 1234
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Membership from '../models/Memberships.js';
import User from '../models/User.js';

dotenv.config();

async function main() {
    const username = process.argv[2];
    const password = process.argv[3];

    if (!username || !password) {
        console.log('\n⚠️  Usage: npx tsx src/tests/setupMembershipPlans.ts <username> <password>\n');
        process.exit(1);
    }

    console.log('\n🚀 Setting up Membership Plans...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Get gym ID
    const user = await User.findOne({ username });
    if (!user || !user.gymId) {
        console.log('❌ User not found\n');
        process.exit(1);
    }

    const gymId = user.gymId;
    console.log(`✅ Found gym ID: ${gymId}\n`);

    // Check existing plans
    const existing = await Membership.find({ gymId });
    if (existing.length > 0) {
        console.log(`⚠️  ${existing.length} membership plans already exist:\n`);
        existing.forEach((plan, i) => {
            console.log(`   ${i + 1}. ${plan.planName} - ₹${plan.price}`);
        });
        console.log('\n✅ You already have membership plans!\n');
        await mongoose.disconnect();
        process.exit(0);
    }

    // Create basic plans
    console.log('📋 Creating membership plans...\n');

    const plans = await Membership.create([
        {
            gymId,
            planName: '1 Month Individual',
            durationInMonths: 1,
            durationInDays: 0,
            price: 1500,
            planType: 'indivisual',
            membersAllowed: 1,
            isTrial: false
        },
        {
            gymId,
            planName: '3 Months Individual',
            durationInMonths: 3,
            durationInDays: 0,
            price: 4000,
            planType: 'indivisual',
            membersAllowed: 1,
            isTrial: false
        },
        {
            gymId,
            planName: '7 Day Trial',
            durationInMonths: 0,
            durationInDays: 7,
            price: 0,
            planType: 'indivisual',
            membersAllowed: 1,
            isTrial: true
        },
        {
            gymId,
            planName: 'Couple Plan (1 Month)',
            durationInMonths: 1,
            durationInDays: 0,
            price: 2500,
            planType: 'couple',
            membersAllowed: 2,
            isTrial: false
        },
        {
            gymId,
            planName: 'Group Plan (1 Month)',
            durationInMonths: 1,
            durationInDays: 0,
            price: 4000,
            planType: 'group',
            membersAllowed: 5,
            isTrial: false
        }
    ]);

    console.log('✅ Created membership plans:\n');
    plans.forEach((plan, i) => {
        console.log(`   ${i + 1}. ${plan.planName} - ₹${plan.price}`);
    });

    console.log('\n✅ Setup complete! You can now run tests.\n');

    await mongoose.disconnect();
}

main().catch(console.error);
