require('dotenv').config();
const mongoose = require('mongoose');
const { runTransferTests } = require('./transferTest');

async function runAllTests() {
  console.log('🚀 Starting test suite...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/transfermarkt');
    console.log('📦 Connected to MongoDB\n');
    
    // Run the transfer tests
    await runTransferTests(); 
    console.log('\nAll tests completed, exiting...');
    
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('Test runner error:', error);
    
    // Try to close MongoDB connection if open
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed after error');
    }
    
    process.exit(1);
  }
}

// Run all tests when this file is executed directly
runAllTests();

