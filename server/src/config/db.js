import dns from 'dns';
// Force Node.js to use reliable public DNS servers
dns.setServers(['1.1.1.1', '8.8.8.8']); 

import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error(`Failed to connect to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;