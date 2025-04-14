const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config();

// Load models
const Player = require('../models/Player');
const Club = require('../models/Club');
const Transfer = require('../models/Transfer');
const Agent = require('../models/Agent');
const Contract = require('../models/Contract');

// Connect to DB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Function to read JSON or return empty array if file doesn't exist
const readJsonSafe = (filepath) => {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (error) {
    console.warn(`Warning: Could not read file ${filepath}. Using empty array instead.`);
    return [];
  }
};

// Import data into DB
const importData = async () => {
  try {
    await connectDB();
    
    const dataDir = path.join(__dirname, '_data');
    
    // Read JSON files with sample data
    const players = readJsonSafe(path.join(dataDir, 'players.json'));
    const clubs = readJsonSafe(path.join(dataDir, 'clubs.json'));
    const agents = readJsonSafe(path.join(dataDir, 'agents.json'));
    const contracts = readJsonSafe(path.join(dataDir, 'contracts.json'));
    const transfers = readJsonSafe(path.join(dataDir, 'transfers.json'));
    
    console.log('Loading sample data...');
    
    // Insert in the right order to maintain references
    if (clubs.length > 0) {
      await Club.create(clubs);
      console.log(`Imported ${clubs.length} clubs`);
    }
    
    if (players.length > 0) {
      await Player.create(players);
      console.log(`Imported ${players.length} players`);
    }
    
    if (agents.length > 0) {
      await Agent.create(agents);
      console.log(`Imported ${agents.length} agents`);
    }
    
    if (contracts.length > 0) {
      await Contract.create(contracts);
      console.log(`Imported ${contracts.length} contracts`);
    }
    
    if (transfers.length > 0) {
      await Transfer.create(transfers);
      console.log(`Imported ${transfers.length} transfers`);
    }
    
    console.log('Data Import Completed Successfully');
    process.exit();
  } catch (err) {
    console.error(`\nError during import: ${err.message}`);
    if (err.code === 11000) {
      console.error('Duplicate key error: You may need to delete existing data first.');
    }
    process.exit(1);
  }
};

// Delete data from DB
const deleteData = async () => {
  try {
    await connectDB();
    
    // Delete in reverse order of dependencies
    await Transfer.deleteMany();
    console.log('Transfers data deleted');
    
    await Contract.deleteMany();
    console.log('Contracts data deleted');
    
    await Agent.deleteMany();
    console.log('Agents data deleted');
    
    await Player.deleteMany();
    console.log('Players data deleted');
    
    await Club.deleteMany();
    console.log('Clubs data deleted');
    
    console.log('All Data Successfully Deleted');
    process.exit();
  } catch (err) {
    console.error(`\nError during deletion: ${err.message}`);
    process.exit(1);
  }
};

// Create data directory if it doesn't exist
const ensureDataDirExists = () => {
  const dataDir = path.join(__dirname, '_data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created directory: ${dataDir}`);
  }
};

// Entry point
if (require.main === module) {
  ensureDataDirExists();
  
  if (process.argv[2] === '-i') {
    importData();
  } else if (process.argv[2] === '-d') {
    deleteData();
  } else {
    console.log(
      'Please provide proper command line argument:\n' +
      '-i : To import all data\n' +
      '-d : To delete all data'
    );
    process.exit(1);
  }
}

module.exports = { importData, deleteData };
