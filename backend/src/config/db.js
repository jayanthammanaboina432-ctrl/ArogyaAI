import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE || 'arogyaai';

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env.');
  }

  mongoose.connection.on('connected', () => {
    console.log(`MongoDB connected: ${dbName}`);
  });
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });

  await mongoose.connect(uri, { dbName });
}
