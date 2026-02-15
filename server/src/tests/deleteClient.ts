import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from '../models/Client.js';
import User from '../models/User.js';
import AssignedMembership from '../models/AssignedMembership.js';
import Activity from '../models/Activity.js';

dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGO_URI!);

    const phoneNumber = process.argv[2];

    if (!phoneNumber) {
        console.log('\nUsage: npx tsx src/tests/deleteClient.ts <phone_number>\n');
        console.log('Example: npx tsx src/tests/deleteClient.ts 9354454113\n');
        process.exit(1);
    }

    console.log(`\n🗑️  Deleting client with phone: ${phoneNumber}...\n`);

    const client = await Client.findOne({ phoneNumber });

    if (!client) {
        console.log('❌ Client not found\n');
        await mongoose.disconnect();
        process.exit(0);
    }

    console.log(`Found client: ${client.name} (ID: ${client._id})\n`);

    // Delete related data
    const deletedMemberships = await AssignedMembership.deleteMany({
        $or: [
            { primaryMemberId: client._id },
            { memberIds: client._id }
        ]
    });
    console.log(`✅ Deleted ${deletedMemberships.deletedCount} memberships`);

    const deletedActivities = await Activity.deleteMany({
        clientId: client._id
    });
    console.log(`✅ Deleted ${deletedActivities.deletedCount} activities`);

    await Client.findByIdAndDelete(client._id);
    console.log(`✅ Deleted client: ${client.name}\n`);

    await mongoose.disconnect();
}

main();
