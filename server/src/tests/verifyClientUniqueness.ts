import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/connect.js';
import Client from '../models/Client.js';
import Gym from '../models/Gym.js';

const verify = async () => {
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not defined");
        process.exit(1);
    }

    try {
        await connectDB(process.env.MONGO_URI);
        console.log("Connected to DB");

        // Force index creation
        await Client.init();
        console.log("Client model initialized and indexes ensured.");

        // Create 2 dummy gyms
        const gymA = await Gym.create({
            name: "Gym A",
            address: "Address A",
            contactNumber: "1111111111"
        });
        const gymB = await Gym.create({
            name: "Gym B",
            address: "Address B",
            contactNumber: "2222222222"
        });

        console.log(`Created Gym A (${gymA._id}) and Gym B (${gymB._id})`);

        const phone = "9876543210";

        // 1. Create Client in Gym A
        console.log("Creating Client in Gym A...");
        await Client.create({
            name: "Test Client",
            phoneNumber: phone,
            gymId: gymA._id
        });
        console.log("✅ Client created in Gym A.");

        // 2. Try to create SAME Client in Gym A (Should Fail)
        console.log("Attempting to create duplicate Client in Gym A...");
        try {
            await Client.create({
                name: "Test Client Duplicate",
                phoneNumber: phone,
                gymId: gymA._id
            });
            console.error("❌ FAILED: Duplicate client allowed in same gym!");
        } catch (error: any) {
            if (error.code === 11000) {
                console.log("✅ SUCCESS: Duplicate client blocked in same gym.");
            } else {
                console.error("❌ ERROR: Unexpected error:", error);
            }
        }

        // 3. Try to create SAME Client in Gym B (Should Success)
        console.log("Attempting to create same Client in Gym B...");
        try {
            await Client.create({
                name: "Test Client Gym B",
                phoneNumber: phone,
                gymId: gymB._id
            });
            console.log("✅ SUCCESS: Same client allowed in different gym.");
        } catch (error) {
            console.error("❌ FAILED: blocked in different gym!", error);
        }

        // cleanup
        await Client.deleteMany({ phoneNumber: phone });
        await Gym.findByIdAndDelete(gymA._id);
        await Gym.findByIdAndDelete(gymB._id);

        console.log("Cleanup complete.");
        process.exit(0);

    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
};

verify();
