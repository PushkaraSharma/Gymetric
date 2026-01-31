
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from '../models/Client.js';
import Gym from '../models/Gym.js';
import Memberships from '../models/Memberships.js';
import AssignedMembership from '../models/AssignedMembership.js';
import Settings from '../models/Settings.js'; // Import Settings
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
const getFutureDate = (days: number) => getToday().add(days, 'day');

const seedSpecificData = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI not defined");
    }
    await connectDB(process.env.MONGO_URI);

    // 1. Get Gym (Assume the one from previous test or first one)
    let gym = await Gym.findOne();
    if (!gym) {
        throw new Error("No Gym found. Please run the previous seed script first.");
    }
    const gymId = gym._id;
    console.log(`Using Gym: ${gym.name} (${gymId})`);

    // 2. Ensure Settings exist and WhatsApp is active (Crucial for Reminders)
    let settings = await Settings.findOne({ gymId });
    if (!settings) {
        settings = await Settings.create({
            gymId,
            whatsapp: {
                active: true,
                reminderDays: 3,
                sendOnExpiry: true,
                sendOnRenewal: true,
                sendOnReminder: true
            }
        });
        console.log("Created Settings with WhatsApp enabled.");
    } else {
        // Force enable whatsapp for testing if it was disabled
        if (!settings.whatsapp) settings.whatsapp = {} as any;
        settings.whatsapp.active = true;
        settings.whatsapp.reminderDays = 3; // Ensure it is 3 for our test logic
        settings.whatsapp.sendOnReminder = true;
        await settings.save();
        console.log("Updated Settings to ensure WhatsApp is active and reminderDays=3.");
    }

    // 3. Ensure a Plan exists
    let plan = await Memberships.findOne({ gymId, planType: 'indivisual', durationInMonths: { $gt: 0 } });
    if (!plan) {
        plan = await Memberships.create({
            planName: "Standard Monthly",
            durationInMonths: 1,
            price: 1000,
            planType: 'indivisual',
            gymId
        });
        console.log("Created Standard Plan");
    }

    // --- Create Pushkara (Expires Today -> Meaning End Date was Yesterday) ---
    console.log("\n--- Creating Pushkara (To be marked Expired) ---");
    // Check if exists to avoid dupe errors on unique phone
    let pushkara = await Client.findOne({ output: "9354454111", gymId });
    if (pushkara) {
        console.log("Pushkara already exists, updating...");
        // Cleanup old memberships for clean slate test
        await AssignedMembership.deleteMany({ _id: { $in: pushkara.membershipHistory } });
        pushkara.membershipHistory = [];
        pushkara.activeMembership = undefined;
        pushkara.upcomingMembership = undefined;
        await pushkara.save();
    } else {
        pushkara = await Client.create({
            name: "pushkara",
            phoneNumber: "9354454111",
            gymId,
            membershipStatus: 'active',
            gender: "Male"
        });
    }

    const expEndDate = getYesterday().endOf('day').toDate();
    const expStartDate = getYesterday().subtract(1, 'month').startOf('day').toDate();

    const pushkaraMemb = await AssignedMembership.create({
        gymId,
        primaryMemberId: pushkara._id,
        memberIds: [pushkara._id],
        planId: plan._id,
        planName: plan.planName,
        startDate: expStartDate,
        endDate: expEndDate,
        status: 'active', // System should change this to 'expired'
        totalAmount: 1000
    });

    pushkara.activeMembership = pushkaraMemb._id;
    pushkara.membershipStatus = 'active'; // Reset status
    await pushkara.save();
    console.log(`User: ${pushkara.name}, ends: ${expEndDate} (Should expire now)`);


    // --- Create Garima (Reminder Test) ---
    console.log("\n--- Creating Garima (For 3-Day Reminder) ---");
    let garima = await Client.findOne({ output: "8587930955", gymId });
    if (garima) {
        console.log("Garima already exists, updating...");
        await AssignedMembership.deleteMany({ _id: { $in: garima.membershipHistory } });
        garima.membershipHistory = [];
        garima.activeMembership = undefined;
        garima.upcomingMembership = undefined;
        await garima.save();
    } else {
        garima = await Client.create({
            name: "Garima",
            phoneNumber: "8587930955",
            gymId,
            membershipStatus: 'active',
            gender: "Female"
        });
    }

    // Logic: Reminder sends if endDate is between targetDateStart and targetDateEnd
    // targetDate = today + reminderDays (3)
    const reminderDate = getFutureDate(3).endOf('day').toDate(); // 3 days from now
    const reminderStartDate = getFutureDate(3).subtract(1, 'month').startOf('day').toDate();

    const garimaMemb = await AssignedMembership.create({
        gymId,
        primaryMemberId: garima._id,
        memberIds: [garima._id],
        planId: plan._id,
        planName: plan.planName,
        startDate: reminderStartDate,
        endDate: reminderDate, // Ends 3 days from today
        status: 'active',
        totalAmount: 1000
    });

    garima.activeMembership = garimaMemb._id;
    garima.membershipStatus = 'active';
    await garima.save();
    console.log(`User: ${garima.name}, ends: ${reminderDate} (Should trigger reminder)`);

    console.log("\nDone. Run expiry check to verify.");
    process.exit(0);
};

seedSpecificData().catch(err => {
    console.error(err);
    process.exit(1);
});
