import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/connect.js';

const migrate = async () => {
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not defined");
        process.exit(1);
    }

    try {
        await connectDB(process.env.MONGO_URI);
        console.log("Connected to DB");

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("Database connection not established");
        }

        const collection = db.collection('clients');
        const indexes = await collection.indexes();

        console.log("Current Indexes:", indexes);

        const phoneIndex = indexes.find((idx: any) => {
            const keys = Object.keys(idx.key);
            return keys.length === 1 && keys[0] === 'phoneNumber' && idx.unique === true;
        });

        const compoundIndex = indexes.find((idx: any) => {
            const keys = Object.keys(idx.key);
            return keys.length === 2 && keys.includes('gymId') && keys.includes('phoneNumber');
        });

        if (phoneIndex) {
            console.log(`Found unique phone index: ${phoneIndex.name}. Dropping it...`);
            await collection.dropIndex(phoneIndex.name!);
            console.log("Successfully dropped phone index.");
        }

        if (compoundIndex) {
            // If we just dropped it as phoneIndex (unlikely given correct logic now), skip
            if (phoneIndex && phoneIndex.name === compoundIndex.name) {
                console.log("Compound index was same as phone index, already dropped.");
            } else {
                console.log(`Found compound index: ${compoundIndex.name}. Dropping it to ensure it is recreated with unique constraint...`);
                await collection.dropIndex(compoundIndex.name!);
                console.log("Successfully dropped compound index.");
            }
        }


        console.log("Migration complete. Please restart the server to ensure new indexes are created.");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
};

migrate();
