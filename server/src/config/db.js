import dns from 'dns';
import mongoose from 'mongoose';

dns.setServers(['1.1.1.1', '8.8.8.8']);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully: ' + conn.connection.host);
    return conn;
  } catch (error) {
    console.error('Failed to connect to MongoDB: ' + error.message);
    process.exit(1);
  }
};

export default connectDB;
