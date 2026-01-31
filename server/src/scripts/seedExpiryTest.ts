
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from '../models/Client.js';
import Gym from '../models/Gym.js';
import Memberships from '../models/Memberships.js';
import AssignedMembership from '../models/AssignedMembership.js';
import { getISTMidnightToday, calculateMembershipExpiry } from '../utils/timeUtils.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

dotenv.config();

const connectDB = async (url: string) => {
    try {
        await mongoose.connect(url);
        console.log("Connected to DB");
    } catch (error) {
        console.error("DB connection error", error);
        process.exit(1);
    }
};

const IST_TIMEZONE = 'Asia/Kolkata';

// Helper to create dates relative to today
const getToday = () => dayjs().tz(IST_TIMEZONE).startOf('day');
const getYesterday = () => getToday().subtract(1, 'day');
const getTomorrow = () => getToday().add(1, 'day');

const seedData = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI not defined");
    }
    await connectDB(process.env.MONGO_URI);

    // 1. Get or Create Gym
    let gym = await Gym.findOne();
    if (!gym) {
        gym = await Gym.create({
            name: "Test Gym",
            address: "123 Test St",
            phone: "9999999999",
            active: true
        });
        console.log("Created Test Gym");
    } else {
        console.log("Using Gym:", gym.name);
    }

    const gymId = gym._id;

    // 2. Ensure Plans Exist
    const plans = await Memberships.find({ gymId });
    let singlePlan = plans.find(p => p.planType === 'indivisual');
    let groupPlan = plans.find(p => p.planType === 'group');
    let couplePlan = plans.find(p => p.planType === 'couple');

    if (!singlePlan) {
        singlePlan = await Memberships.create({
            planName: "Monthly Single",
            durationInMonths: 1,
            price: 1000,
            planType: 'indivisual',
            gymId
        });
        console.log("Created Single Plan");
    }
    if (!groupPlan) {
        groupPlan = await Memberships.create({
            planName: "Monthly Group",
            durationInMonths: 1,
            price: 800,
            planType: 'group',
            membersAllowed: 3,
            gymId
        });
        console.log("Created Group Plan");
    }
    if (!couplePlan) {
        couplePlan = await Memberships.create({
            planName: "Monthly Couple",
            durationInMonths: 1,
            price: 1500,
            planType: 'couple',
            membersAllowed: 2,
            gymId
        });
        console.log("Created Couple Plan");
    }

    // --- Scenario 1: Expiring Today (Meaning End Date was Yesterday) ---
    // This record should be picked up by STEP 2 of expirty check
    console.log("\n--- Creating Scenario 1: Expired Yesterday (To be marked Expired) ---");
    const expClient = await Client.create({
        name: "Test Expired User " + Date.now(),
        phoneNumber: "90000" + Math.floor(Math.random() * 100000),
        gymId,
        membershipStatus: 'active',
        gender: "Male"
    });

    const expEndDate = getYesterday().endOf('day').toDate();
    const expStartDate = getYesterday().subtract(1, 'month').startOf('day').toDate();

    const expMemb = await AssignedMembership.create({
        gymId,
        primaryMemberId: expClient._id,
        memberIds: [expClient._id],
        planId: singlePlan._id,
        planName: singlePlan.planName,
        startDate: expStartDate,
        endDate: expEndDate, // Ends yesterday 23:59:59
        status: 'active', // Currently active, but should be expired
        totalAmount: 1000
    });

    expClient.activeMembership = expMemb._id;
    await expClient.save();
    console.log(`Created Client: ${expClient.name} (${expClient._id})`);
    console.log(`With Active Membership ending: ${expEndDate} (Should expire)`);


    // --- Scenario 2: Future Membership Starting Today (New Member) ---
    // This record should be picked up by STEP 1
    console.log("\n--- Creating Scenario 2: New Member Starting Today ---");
    const newClient = await Client.create({
        name: "Test New Joiner " + Date.now(),
        phoneNumber: "91000" + Math.floor(Math.random() * 100000),
        gymId,
        membershipStatus: 'future',
        gender: "Female"
    });

    const newStartDate = getToday().toDate(); // Starts today 00:00:00
    const newEndDate = getToday().add(1, 'month').endOf('day').toDate();

    const newMemb = await AssignedMembership.create({
        gymId,
        primaryMemberId: newClient._id,
        memberIds: [newClient._id],
        planId: singlePlan._id,
        planName: singlePlan.planName,
        startDate: newStartDate,
        endDate: newEndDate,
        status: 'future', // Status future, starts today
        totalAmount: 1000
    });

    newClient.upcomingMembership = newMemb._id;
    await newClient.save();
    console.log(`Created Client: ${newClient.name} (${newClient._id})`);
    console.log(`With Future Membership starting: ${newStartDate} (Should become Active)`);


    // --- Scenario 3: Renewal Today (Single) ---
    // Active ends yesterday, New Future starts today
    // POTENTIAL BUG: Might expire the user if logic isn't tight
    console.log("\n--- Creating Scenario 3: Renewal Today (Single) ---");
    const renewClient = await Client.create({
        name: "Test Renew User " + Date.now(),
        phoneNumber: "92000" + Math.floor(Math.random() * 100000),
        gymId,
        membershipStatus: 'active',
        gender: "Male"
    });

    // Old Membership (Ends yesterday)
    const oldMemb = await AssignedMembership.create({
        gymId,
        primaryMemberId: renewClient._id,
        memberIds: [renewClient._id],
        planId: singlePlan._id,
        planName: singlePlan.planName,
        startDate: expStartDate,
        endDate: expEndDate,
        status: 'active',
        totalAmount: 1000
    });

    // New Membership (Starts today)
    const renewedMemb = await AssignedMembership.create({
        gymId,
        primaryMemberId: renewClient._id,
        memberIds: [renewClient._id],
        planId: singlePlan._id,
        planName: singlePlan.planName,
        startDate: newStartDate,
        endDate: newEndDate,
        status: 'future',
        totalAmount: 1000
    });

    renewClient.activeMembership = oldMemb._id;
    renewClient.upcomingMembership = renewedMemb._id;
    await renewClient.save();
    console.log(`Created Client: ${renewClient.name} (${renewClient._id})`);
    console.log(`Old Membership ending: ${expEndDate}`);
    console.log(`New Membership starting: ${newStartDate}`);


    // --- Scenario 4: Renewal Today (Couple/Group) ---
    console.log("\n--- Creating Scenario 4: Renewal Today (Couple) ---");
    const couplePrimary = await Client.create({
        name: "Test Couple Prim " + Date.now(),
        phoneNumber: "93000" + Math.floor(Math.random() * 100000),
        gymId,
        membershipStatus: 'active',
        gender: "Male",
        role: "primary"
    });

    const coupleDep = await Client.create({
        name: "Test Couple Dep " + Date.now(),
        phoneNumber: "93500" + Math.floor(Math.random() * 100000),
        gymId,
        membershipStatus: 'active',
        gender: "Female",
        role: "dependent"
    });

    // Old Couple Membership (Ends yesterday)
    const oldCoupleMemb = await AssignedMembership.create({
        gymId,
        primaryMemberId: couplePrimary._id,
        memberIds: [couplePrimary._id, coupleDep._id],
        planId: couplePlan._id,
        planName: couplePlan.planName,
        startDate: expStartDate,
        endDate: expEndDate,
        status: 'active',
        totalAmount: 1500
    });

    // New Couple Membership (Starts today)
    const newCoupleMemb = await AssignedMembership.create({
        gymId,
        primaryMemberId: couplePrimary._id,
        memberIds: [couplePrimary._id, coupleDep._id],
        planId: couplePlan._id,
        planName: couplePlan.planName,
        startDate: newStartDate, // Today
        endDate: newEndDate,
        status: 'future',
        totalAmount: 1500
    });

    couplePrimary.activeMembership = oldCoupleMemb._id;
    couplePrimary.upcomingMembership = newCoupleMemb._id;
    await couplePrimary.save();

    coupleDep.activeMembership = oldCoupleMemb._id;
    coupleDep.upcomingMembership = newCoupleMemb._id;
    await coupleDep.save();

    console.log(`Created Couple: ${couplePrimary.name} & ${coupleDep.name}`);

    console.log("\nDone. You can now trigger the expiry check.");
    process.exit(0);
};

seedData().catch(err => {
    console.error(err);
    process.exit(1);
});
