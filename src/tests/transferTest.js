const mongoose = require('mongoose');
const Club = require('../models/Club');
const Player = require('../models/Player');
const Contract = require('../models/Contract');
const Transfer = require('../models/Transfer');
const TransferService = require('../services/transferService');
const ContractService = require('../services/contractService');

// Connect to test database
mongoose.connect('mongodb://localhost:27017/transfermarkt_test')
  .then(() => console.log('Connected to test database'))
  .catch(err => console.error('Database connection error:', err));

// Test data
const testClubs = [
  {
    name: "Manchester Test",
    league: "Test Premier League",
    country: "England",
    budget: 10000000
  },
  {
    name: "Bayern Test",
    league: "Test Bundesliga",
    country: "Germany",
    budget: 15000000
  }
];

const testPlayer = {
  name: "Test Player",
  dateOfBirth: "2000-01-01",
  nationality: "England",
  position: "Striker",
  marketValue: 5000000
};

// Initialize services
const transferService = new TransferService();
const contractService = new ContractService();

// Store created entities for cleanup
let createdEntities = {
  clubs: [],
  player: null,
  contracts: [],
  transfers: []
};

// Test functions
async function runTests() {
  try {
    console.log('========== Starting Transfer System Tests ==========');

    // Step 1: Create test clubs
    const clubs = await Promise.all(
      testClubs.map(club => Club.create(club))
    );
    createdEntities.clubs = clubs;
    console.log('Test clubs created:', clubs.map(c => c.name).join(', '));

    // Step 2: Create test player
    const player = await Player.create({
      ...testPlayer,
      currentClub: clubs[0]._id // Assign to first club
    });
    createdEntities.player = player;
    console.log('Test player created:', player.name);

    // Step 3: Create initial contract
    const initialContract = await contractService.createContract({
      playerId: player._id,
      clubId: clubs[0]._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      salary: 100000 // Weekly salary
    });
    createdEntities.contracts.push(initialContract);
    console.log('Initial contract created with club:', clubs[0].name);

    // Verify player's club association
    const playerAfterContract = await Player.findById(player._id).populate('currentClub');
    console.log('Player current club:', playerAfterContract.currentClub.name);
    
    if (playerAfterContract.currentClub._id.toString() === clubs[0]._id.toString()) {
      console.log('✅ Player correctly associated with club');
    } else {
      console.log('❌ Player not correctly associated with club');
    }

    // Step 4: Calculate player value
    const calculatedValue = await transferService.calculatePlayerValue(player._id);
    console.log('Original market value:', player.marketValue);
    console.log('Calculated market value:', calculatedValue);

    // Step 5: Initiate transfer
    const transfer = await transferService.initiateTransfer({
      playerId: player._id,
      fromClub: clubs[0]._id,
      toClub: clubs[1]._id,
      transferFee: 7000000,
      transferType: 'Permanent',
      date: new Date(),
      transferWindow: 'Summer' // Assuming current date is in summer window
    });
    createdEntities.transfers.push(transfer);
    console.log('Transfer initiated with status:', transfer.status);

    // Check club budgets after initiation
    const fromClubAfterInit = await Club.findById(clubs[0]._id);
    const toClubAfterInit = await Club.findById(clubs[1]._id);
    console.log('From club budget after initiation:', fromClubAfterInit.budget);
    console.log('To club budget after initiation:', toClubAfterInit.budget);

    // Step 6: Complete transfer
    const completedTransfer = await transferService.completeTransfer(transfer._id);
    console.log('Transfer completed with status:', completedTransfer.status);

    // Step 7: Verify final state
    const updatedPlayer = await Player.findById(player._id).populate('currentClub');
    console.log('\nFinal player state:');
    console.log('Name:', updatedPlayer.name);
    console.log('Current club:', updatedPlayer.currentClub.name);
    console.log('Market value:', updatedPlayer.marketValue);

    // Verify club budgets after transfer
    const fromClubAfter = await Club.findById(clubs[0]._id);
    const toClubAfter = await Club.findById(clubs[1]._id);
    console.log('\nFinal club budgets:');
    console.log('From club budget:', fromClubAfter.budget);
    console.log('To club budget:', toClubAfter.budget);

    // Verify player's new club is correct
    if (updatedPlayer.currentClub._id.toString() === clubs[1]._id.toString()) {
      console.log('✅ Player successfully transferred to new club');
    } else {
      console.log('❌ Player transfer failed');
    }

    // Verify market value changed
    if (updatedPlayer.marketValue !== player.marketValue) {
      console.log('✅ Player market value updated after transfer');
    } else {
      console.log('❌ Player market value not updated');
    }

    // Verify old contract terminated
    const oldContract = await Contract.findById(initialContract._id);
    console.log('\nOld contract status:', oldContract.status);
    if (oldContract.status === 'Terminated') {
      console.log('✅ Old contract correctly terminated');
    } else {
      console.log('❌ Old contract not terminated');
    }

    // Step 8: Test contract renewal
    console.log('\n-------------- Testing Contract Renewal --------------');
    
    // Get active contract
    const activeContract = await contractService.getPlayerActiveContract(player._id);
    console.log('Current active contract:', activeContract ? 'Found' : 'Not found');
    
    if (activeContract) {
      // Renew contract with better terms
      const renewedContract = await contractService.renewContract(activeContract._id, {
        endDate: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years
        salary: 150000 // 50% salary increase
      });
      createdEntities.contracts.push(renewedContract);
      
      console.log('Contract renewed with new end date:', renewedContract.endDate);
      console.log('New salary:', renewedContract.salary);
      
      // Check player value after renewal
      const playerAfterRenewal = await Player.findById(player._id);
      console.log('Player value after renewal:', playerAfterRenewal.marketValue);
      
      if (playerAfterRenewal.marketValue > updatedPlayer.marketValue) {
        console.log('✅ Player market value increased after contract renewal');
      } else {
        console.log('❌ Player market value not increased after renewal');
      }
    }

    console.log('\n========== All tests completed successfully ==========');
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    // Clean up test data
    await cleanupTestData();
    
    // Disconnect from test database
    await mongoose.disconnect();
    console.log('Disconnected from test database');
  }
}

// Clean up function
async function cleanupTestData() {
  console.log('\nCleaning up test data...');
  
  try {
    // Delete transfers
    if (createdEntities.transfers.length > 0) {
      await Promise.all(
        createdEntities.transfers.map(transfer => Transfer.findByIdAndDelete(transfer._id))
      );
      console.log('Cleaned up transfers');
    }
    
    // Delete contracts
    if (createdEntities.contracts.length > 0) {
      await Promise.all(
        createdEntities.contracts.map(contract => Contract.findByIdAndDelete(contract._id))
      );
      console.log('Cleaned up contracts');
    }
    
    // Delete all contracts related to test player
    if (createdEntities.player) {
      await Contract.deleteMany({ playerId: createdEntities.player._id });
    }
    
    // Delete player
    if (createdEntities.player) {
      await Player.findByIdAndDelete(createdEntities.player._id);
      console.log('Cleaned up player');
    }
    
    // Delete clubs
    if (createdEntities.clubs.length > 0) {
      await Promise.all(
        createdEntities.clubs.map(club => Club.findByIdAndDelete(club._id))
      );
      console.log('Cleaned up clubs');
    }
    
    console.log('All test data cleaned up successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Export for external use
module.exports = { runTests };

// Automatically run tests if file is executed directly
if (require.main === module) {
  runTests();
}