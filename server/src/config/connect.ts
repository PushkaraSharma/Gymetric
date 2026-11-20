import mongoose from "mongoose";

// Only the migration and compare scripts still read MongoDB; the API runs on Postgres.
export const connectDB = async (uri: string) => {
    await mongoose.connect(uri);
};
