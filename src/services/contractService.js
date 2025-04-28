const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const Player = require('../models/Player');
const Club = require('../models/Club');
const ErrorResponse = require('../utils/errorResponse');

/**
 * ContractService - Handles all contract-related operations
 * Manages the entire lifecycle of player contracts including:
 * - Creation, termination, renewal, and updates
 * - Validation and status management
 * - Salary and bonus calculations
 * - Integration with transfers
 * - CDC tracking for data consistency
 */
class ContractService {
  /**
   * Creates a new player contract
   * @param {Object} contractData - The contract data
   * @param {mongoose.ClientSession} [session] - Optional session for transactions
   * @returns {Promise<Object>} - The created contract
   */
  async createContract(contractData, session = null) {
    // Determine if we need to manage the session internally
    const ownSession = !session;
    const activeSession = session || await mongoose.startSession();
    
    if (ownSession) {
      activeSession.startTransaction();
    }
    
    try {
      // Validate the contract data
      await this.validateContractData(contractData, activeSession);
      
      // Create the contract with CDC meta
      const contract = new Contract({
        ...contractData,
        status: 'Active',
        _cdcMeta: {
          modelName: 'Contract',
          operation: 'create',
          timestamp: new Date()
        }
      });
      
      // Save the contract
      await contract.save({ session: activeSession });
      
      // Update player's current club if needed
      const player = await Player.findById(contractData.playerId).session(activeSession);
      if (player) {
        player.currentClub = contractData.clubId;
        player._cdcMeta = {
          modelName: 'Player',
          operation: 'update',
          timestamp: new Date()
        };
        await player.save({ session: activeSession });
      }
      
      // Update club's squad if needed
      const club = await Club.findById(contractData.clubId).session(activeSession);
      if (club) {
        if (!club.currentSquad) {
          club.currentSquad = [];
        }
        
        const playerAlreadyInSquad = club.currentSquad.some(
          id => id.toString() === contractData.playerId.toString()
        );
        
        if (!playerAlreadyInSquad) {
          club.currentSquad.push(contractData.playerId);
          await club.save({ session: activeSession });
        }
      }
      
      // Commit transaction if we own the session
      if (ownSession) {
        await activeSession.commitTransaction();
        activeSession.endSession();
      }
      
      return contract;
    } catch (error) {
      // Abort transaction if we own the session and there was an error
      if (ownSession) {
        await activeSession.abortTransaction();
        activeSession.endSession();
      }
      throw error;
    }
  }
  
  /**
   * Gets a contract by ID
   * @param {string} contractId - The contract ID
   * @returns {Promise<Object>} - The contract
   */
  async getContract(contractId) {
    const contract = await Contract.findById(contractId);
    
    if (!contract) {
      throw new ErrorResponse(`Contract not found with id ${contractId}`, 404);
    }
    
    return contract;
  }
  
  /**
   * Updates an existing contract
   * @param {string} contractId - The contract ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} - The updated contract
   */
  async updateContract(contractId, updateData) {
    const contract = await Contract.findById(contractId);
    
    if (!contract) {
      throw new ErrorResponse(`Contract not found with id ${contractId}`, 404);
    }
    
    if (contract.status !== 'Active') {
      throw new ErrorResponse(`Cannot update ${contract.status} contract`, 400);
    }
    
    // Fields that cannot be updated
    const restrictedFields = ['playerId', 'clubId', 'status', '_id', 'createdAt', 'updatedAt'];
    
    // Filter out restricted fields from update data
    Object.keys(updateData).forEach(key => {
      if (restrictedFields.includes(key)) {
        delete updateData[key];
      }
    });
    
    // Add CDC meta
    updateData._cdcMeta = {
      modelName: 'Contract',
      operation: 'update',
      timestamp: new Date()
    };
    
    const updatedContract = await Contract.findByIdAndUpdate(
      contractId,
      updateData,
      { new: true, runValidators: true }
    );
    
    return updatedContract;
  }
  
  /**
   * Terminates an active contract
   * @param {string} contractId - The contract ID
   * @param {Object} terminationData - Termination details
   * @param {mongoose.ClientSession} [session] - Optional session for transactions
   * @returns {Promise<Object>} - The terminated contract
   */
  async terminateContract(contractId, terminationData = {}, session = null) {
    // Determine if we need to manage the session internally
    const ownSession = !session;
    const activeSession = session || await mongoose.startSession();
    
    if (ownSession) {
      activeSession.startTransaction();
    }
    
    try {
      const contract = await Contract.findById(contractId).session(activeSession);
      
      if (!contract) {
        throw new ErrorResponse(`Contract not found with id ${contractId}`, 404);
      }
      
      if (contract.status !== 'Active') {
        throw new ErrorResponse(`Cannot terminate ${contract.status} contract`, 400);
      }
      
      // Update contract status
      contract.status = 'Terminated';
      
      // Add termination details to the clauses
      if (!contract.clauses) {
        contract.clauses = new Map();
      }
      
      contract.clauses.set('terminationReason', terminationData.reason || 'Unspecified');
      contract.clauses.set('terminationDate', new Date());
      
      if (terminationData.compensationFee) {
        contract.clauses.set('compensationFee', terminationData.compensationFee);
      }
      
      // Add CDC meta
      contract._cdcMeta = {
        modelName: 'Contract',
        operation: 'update',
        timestamp: new Date()
      };
      
      await contract.save({ session: activeSession });
      
      // Handle player status update if specified
      if (terminationData.updatePlayerStatus) {
        const player = await Player.findById(contract.playerId).session(activeSession);
        if (player && terminationData.freeAgent) {
          player.currentClub = null;
          player._cdcMeta = {
            modelName: 'Player',
            operation: 'update',
            timestamp: new Date()
          };
          await player.save({ session: activeSession });
        }
      }
      
      // Commit transaction if we own the session
      if (ownSession) {
        await activeSession.commitTransaction();
        activeSession.endSession();
      }
      
      return contract;
    } catch (error) {
      // Abort transaction if we own the session and there was an error
      if (ownSession) {
        await activeSession.abortTransaction();
        activeSession.endSession();
      }
      throw error;
    }
  }
  
  /**
   * Renews a contract with new terms
   * @param {string} contractId - The contract ID
   * @param {Object} renewalData - New contract terms
   * @returns {Promise<Object>} - The new contract
   */
  async renewContract(contractId, renewalData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Get the existing contract
      const oldContract = await Contract.findById(contractId).session(session);
      
      if (!oldContract) {
        throw new ErrorResponse(`Contract not found with id ${contractId}`, 404);
      }
      
      if (oldContract.status !== 'Active') {
        throw new ErrorResponse(`Cannot renew ${oldContract.status} contract`, 400);
      }
      
      // Terminate the old contract with reason 'Renewal'
      await this.terminateContract(
        contractId, 
        { reason: 'Renewal' }, 
        session
      );
      
      // Create new contract with combined data
      const newContractData = {
        playerId: oldContract.playerId,
        clubId: oldContract.clubId,
        startDate: new Date(),
        ...renewalData
      };
      
      // Create the new contract 
      const newContract = await this.createContract(newContractData, session);
      
      // Update player market value based on contract renewal
      await this.updatePlayerValueOnContractRenewal(
        oldContract.playerId, 
        oldContract, 
        newContract, 
        session
      );
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      return newContract;
    } catch (error) {
      // Abort the transaction on error
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * Gets a player's active contract with populated references
   * @param {string} playerId - The player ID
   * @returns {Promise<Object>} - The active contract or null
   */
  async getPlayerActiveContract(playerId) {
    const contract = await Contract.findOne({
      playerId,
      status: 'Active'
    })
    .populate('playerId')
    .populate('clubId');
    
    return contract;
  }
  
  /**
   * Gets a player's contract history
   * @param {string} playerId - The player ID
   * @returns {Promise<Array>} - Array of contracts
   */
  async getPlayerContractHistory(playerId) {
    const contracts = await Contract.find({ playerId })
      .sort({ startDate: -1 })
      .populate('clubId');
    
    return contracts;
  }
  
  /**
   * Gets all active contracts for a club
   * @param {string} clubId - The club ID
   * @returns {Promise<Array>} - Array of active contracts
   */
  async getClubContracts(clubId) {
    const contracts = await Contract.find({
      clubId,
      status: 'Active'
    })
    .populate('playerId');
    
    return contracts;
  }
  
  /**
   * Calculates total salary expenses for a club
   * @param {string} clubId - The club ID
   * @returns {Promise<number>} - Total annual salary expense
   */
  async calculateClubSalaryExpenses(clubId) {
    const contracts = await Contract.find({
      clubId,
      status: 'Active'
    });
    
    // Calculate total annual salary
    let totalSalary = 0;
    
    contracts.forEach(contract => {
      totalSalary += (contract.salary || 0);
    });
    
    return totalSalary;
  }
  
  /**
   * Gets contracts that are expiring soon
   * @param {number} monthsThreshold - Months until expiration
   * @returns {Promise<Array>} - Array of soon-to-expire contracts
   */
  async getExpiringContracts(monthsThreshold = 6) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setMonth(today.getMonth() + monthsThreshold);
    
    const expiringContracts = await Contract.find({
      status: 'Active',
      endDate: {
        $gte: today,
        $lte: futureDate
      }
    })
    .populate('playerId')
    .populate('clubId');
    
    return expiringContracts;
  }
  
  /**
   * Processes and updates contracts that have expired
   * @returns {Promise<number>} - Number of contracts updated
   */
  async processExpiredContracts() {
    const today = new Date();
    
    const expiredContracts = await Contract.find({
      status: 'Active',
      endDate: { $lt: today }
    });
    
    let updatedCount = 0;
    
    for (const contract of expiredContracts) {
      // Create a session for each contract to ensure atomicity
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        // Update contract status
        contract.status = 'Expired';
        contract._cdcMeta = {
          modelName: 'Contract',
          operation: 'update',
          timestamp: new Date()
        };
        
        await contract.save({ session });
        
        // Update player if necessary (mark as free agent)
        const player = await Player.findById(contract.playerId).session(session);
        if (player) {
          // Only update player's club if it matches the expired contract's club
          if (player.currentClub && 
              player.currentClub.toString() === contract.clubId.toString()) {
            player.currentClub = null;
            player._cdcMeta = {
              modelName: 'Player',
              operation: 'update',
              timestamp: new Date()
            };
            await player.save({ session });
          }
        }
        
        // Commit the transaction
        await session.commitTransaction();
        updatedCount++;
      } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        console.error(`Error processing expired contract ${contract._id}:`, error);
      } finally {
        session.endSession();
      }
    }
    
    return updatedCount;
  }
  
  /**
   * Validates contract data before creation
   * @param {Object} contractData - The contract data
   * @param {mongoose.ClientSession} session - The session
   * @returns {Promise<boolean>} - True if valid
   */
  async validateContractData(contractData, session) {
    const { playerId, clubId, startDate, endDate, salary } = contractData;
    
    // Check required fields
    if (!playerId || !clubId || !startDate || !endDate || salary === undefined) {
      throw new ErrorResponse('Missing required contract fields', 400);
    }
    
    // Validate player and club exist
    const [player, club] = await Promise.all([
      Player.findById(playerId).session(session),
      Club.findById(clubId).session(session)
    ]);
    
    if (!player) {
      throw new ErrorResponse(`Player not found with id ${playerId}`, 404);
    }
    
    if (!club) {
      throw new ErrorResponse(`Club not found with id ${clubId}`, 404);
    }
    
    // Validate contract dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end <= start) {
      throw new ErrorResponse('End date must be after start date', 400);
    }
    
    // Calculate contract duration in days
    const durationDays = Math.round((end - start) / (24 * 60 * 60 * 1000));
    
    //

const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const Player = require('../models/Player');
const Club = require('../models/Club');
const ErrorResponse = require('../utils/errorResponse');

/**
 * ContractService - Handles all contract-related operations
 * Provides functionality for managing player contracts including:
 * - Contract creation, termination, and renewal
 * - Contract validation
 * - Integration with transfer process
 * - Salary and bonus calculations
 * - Contract expiration tracking
 */
class ContractService {
  /**
   * Creates a new player contract
   * @param {Object} contractData - Contract data including player, club, terms
   * @param {mongoose.ClientSession} [session] - Optional mongoose session for transactions
   * @returns {Promise<Object>} - The created contract
   */
  async createContract(contractData, session = null) {
    const useSession = session !== null;
    let localSession = session;
    
    if (!useSession) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
    }
    
    try {
      // Validate contract data
      await this.validateContract(contractData, localSession);
      
      // Create new contract
      const contract = new Contract({
        ...contractData,
        status: 'Active',
        _cdcMeta: {
          modelName: 'Contract',
          operation: 'create',
          timestamp: new Date()
        }
      });
      
      // Save the contract
      await contract.save({ session: localSession });
      
      // Update player with current club
      const player = await Player.findById(contractData.playerId).session(localSession);
      if (player) {
        player.currentClub = contractData.clubId;
        player._cdcMeta = {
          modelName: 'Player',
          operation: 'update',
          timestamp: new Date()
        };
        await player.save({ session: localSession });
      }
      
      // Update club squad if not already included
      const club = await Club.findById(contractData.clubId).session(localSession);
      if (club) {
        if (!club.currentSquad) {
          club.currentSquad = [];
        }
        
        if (!club.currentSquad.some(id => id.toString() === contractData.playerId.toString())) {
          club.currentSquad.push(contractData.playerId);
          await club.save({ session: localSession });
        }
      }
      
      if (!useSession) {
        // Commit transaction if we started it
        await localSession.commitTransaction();
        localSession.endSession();
      }
      
      return contract;
    } catch (error) {
      if (!useSession) {
        // Abort transaction if we started it and there was an error
        await localSession.abortTransaction();
        localSession.endSession();
      }
      throw error;
    }
  }
  
  /**
   * Terminates an active player contract
   * @param {string} contractId - ID of the contract to terminate
   * @param {Object} [terminationData] - Data related to contract termination
   * @param {mongoose.ClientSession} [session] - Optional mongoose session for transactions
   * @returns {Promise<Object>} - The terminated contract
   */
  async terminateContract(contractId, terminationData = {}, session = null) {
    const useSession = session !== null;
    let localSession = session;
    
    if (!useSession) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
    }
    
    try {
      // Find the contract
      const contract = await Contract.findById(contractId).session(localSession);
      
      if (!contract) {
        throw new ErrorResponse(`Contract not found with id ${contractId}`, 404);
      }
      
      if (contract.status !== 'Active') {
        throw new ErrorResponse(`Cannot terminate contract with status ${contract.status}`, 400);
      }
      
      // Update contract status
      contract.status = 'Terminated';
      if (!contract.clauses) {
        contract.clauses = new Map();
      }
      
      // Add termination details
      contract.clauses.set('terminationReason', terminationData.reason || 'Transfer');
      contract.clauses.set('terminationDate', new Date());
      if (terminationData.compensationFee) {
        contract.clauses.set('terminationFee', terminationData.compensationFee);
      }
      
      // Update CDC meta
      contract._cdcMeta = {
        modelName: 'Contract',
        operation: 'update',
        timestamp: new Date()
      };
      
      await contract.save({ session: localSession });
      
      if (!useSession) {
        // Commit transaction if we started it
        await localSession.commitTransaction();
        localSession.endSession();
      }
      
      return contract;
    } catch (error) {
      if (!useSession) {
        // Abort transaction if we started it and there was an error
        await localSession.abortTransaction();
        localSession.endSession();
      }
      throw error;
    }
  }
  
  /**
   * Renews a player contract with new terms
   * @param {string} contractId - ID of the contract to renew
   * @param {Object} renewalData - New contract terms
   * @returns {Promise<Object>} - The new contract
   */
  async renewContract(contractId, renewalData) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Find the existing contract
      const oldContract = await Contract.findById(contractId).session(session);
      
      if (!oldContract) {
        throw new ErrorResponse(`Contract not found with id ${contractId}`, 404);
      }
      
      if (oldContract.status !== 'Active') {
        throw new ErrorResponse(`Cannot renew contract with status ${oldContract.status}`, 400);
      }
      
      // Terminate the old contract
      await this.terminateContract(oldContract._id, { reason: 'Renewal' }, session);
      
      // Create new contract with updated terms
      const newContractData = {
        playerId: oldContract.playerId,
        clubId: oldContract.clubId,
        startDate: new Date(),
        ...renewalData
      };
      
      // Create the new contract
      const newContract = await this.createContract(newContractData, session);
      
      // Update player market value based on new contract
      await this.updatePlayerValueOnRenewal(oldContract.playerId, newContract, session);
      
      // Commit the transaction
      await session.commitTransaction();
      session.endSession();
      
      return newContract;
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
  /**
   * Gets detailed contract information
   * @param {string} contractId - ID of the contract
   * @returns {Promise<Object>} - The contract with populated references
   */
  async getContractDetails(contractId) {
    const contract = await Contract.findById(contractId)
      .populate('playerId')
      .populate('clubId');
      
    if (!contract) {
      throw new ErrorResponse(`Contract not found with id ${contractId}`, 404);
    }
    
    return contract;
  }
  
  /**
   * Gets all active contracts for a club
   * @param {string} clubId - ID of the club
   * @returns {Promise<Array>} - Array of active contracts
   */
  async getClubContracts(clubId) {
    const contracts = await Contract.find({
      clubId,
      status: 'Active'
    }).populate('playerId');
    
    return contracts;
  }
  
  /**
   * Gets a player's active contract
   * @param {string} playerId - ID of the player
   * @returns {Promise<Object>} - The active contract or null if none exists
   */
  async getPlayerActiveContract(playerId) {
    const contract = await Contract.findOne({
      playerId,
      status: 'Active'
    }).populate('clubId');
    
    return contract;
  }
  
  /**
   * Gets a player's contract history
   * @param {string} playerId - ID of the player
   * @returns {Promise<Array>} - Array of all player contracts
   */
  async getPlayerContractHistory(playerId) {
    const contracts = await Contract.find({
      playerId
    })
    .sort({ startDate: -1 })
    .populate('clubId');
    
    return contracts;
  }
  
  /**
   * Calculates total salary expenses for a club
   * @param {string} clubId - ID of the club
   * @returns {Promise<number>} - Total annual salary expenses
   */
  async calculateClubSalaryExpenses(clubId) {
    const activeContracts = await Contract.find({
      clubId,
      status: 'Active'
    });
    
    const totalAnnualSalary = activeContracts.reduce((total, contract) => {
      return total + (contract.salary || 0);
    }, 0);
    
    return totalAnnualSalary;
  }
  
  /**
   * Finds contracts nearing expiration
   * @param {number} monthsThreshold - Number of months threshold (default: 6)
   * @returns {Promise<Array>} - Array of contracts nearing expiration
   */
  async findExpiringContracts(monthsThreshold = 6) {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setMonth(today.getMonth() + monthsThreshold);
    
    const expiringContracts = await Contract.find({
      status: 'Active',
      endDate: {
        $lte: thresholdDate,
        $gt: today
      }
    })
    .populate('playerId')
    .populate('clubId');
    
    return expiringContracts;
  }
  
  /**
   * Validates contract data before creation
   * @param {Object} contractData - Contract data to validate
   * @param {mongoose.ClientSession} session - Mongoose session for transaction
   * @returns {Promise<boolean>} - True if valid, throws error otherwise
   */
  async validateContract(contractData, session) {
    const { playerId, clubId, startDate, endDate, salary } = contractData;
    
    // Check required fields
    if (!playerId || !clubId || !startDate || !endDate || salary === undefined) {
      throw new ErrorResponse('Missing required contract fields', 400);
    }
    
    // Validate player and club exist
    const [player, club] = await Promise.all([
      Player.findById(playerId).session(session),
      Club.findById(clubId).session(session)
    ]);
    
    if (!player) {
      throw new ErrorResponse(`Player not found with id ${playerId}`, 404);
    }
    
    if (!club) {
      throw new ErrorResponse(`Club not found with id ${clubId}`, 404);
    }
    
    // Validate dates
    const contractStart = new Date(startDate);
    const contractEnd = new Date(endDate);
    
    if (contractEnd <= contractStart) {
      throw new ErrorResponse('Contract end date must be after start date', 400);
    }
    
    // Check for minimum contract duration (usually 1 month)
    const minDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    if (contractEnd - contractStart < minDuration) {
      throw new ErrorResponse('Contract duration must be at least 30 days', 400);
    }
    
    // Check for maximum contract duration (usually 5 years)
    const maxDuration = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years in milliseconds
    if (contractEnd - contractStart > maxDuration) {
      throw new ErrorResponse('Contract duration cannot exceed 5 years', 400);
    }
    
    // Check if player already has an active contract with a different club
    const existingContract = await Contract.findOne({
      playerId,
      status: 'Active',
      clubId: { $ne: clubId }
    }).session(session);
    
    if (existingContract) {
      throw new ErrorResponse('Player already has an active contract with another club', 400);
    }
    
    // Check if salary is within club's budget
    const annualSalaryExpense = await this.calculateClubSalaryExpenses(clubId);
    if (club.budget < annualSalaryExpense + salary) {
      throw new ErrorResponse('Contract salary exceeds club budget', 400);
    }
    
    return true;
  }
  
  /**
   * Updates a player's market value when contract is renewed
   * @param {string} playerId - ID of the player
   * @param {Object} newContract - The new contract
   * @param {mongoose.ClientSession} session - Mongoose session for transaction
   * @returns {Promise<Object>} - Updated player
   */
  async updatePlayerValueOnRenewal(playerId, newContract, session) {
    const player = await Player.findById(playerId).session(session);
    
    if (!player) {
      throw new ErrorResponse(`Player not found with id ${playerId}`, 404);
    }
    
    // Calculate contract duration in years
    const startDate = new Date(newContract.startDate);
    const endDate = new Date(newContract.endDate);
    const durationYears = (endDate - startDate) / (365 * 24 * 60 * 60 * 1000);
    
    // Calculate salary increase factor
    const annualSalary = newContract.salary;
    
    // Base increase is 5-15% depending on contract length and salary
    let valueIncreaseFactor = 1 + (0.05 + (durationYears * 0.02));
    
    // Adjust for player age - younger players see larger increases
    if (player.age < 25) {
      valueIncreaseFactor += 0.1;
    } else if (player.age > 30) {
      valueIncreaseFactor -= 0.1;
    }
    
    // Calculate new market value
    const newMarketValue = Math.round(player.marketValue * valueIncreaseFactor);
    
    // Update player market value
    player.marketValue = newMarketValue;
    player._cdcMeta = {
      modelName: 'Player',
      operation: 'update',
      timestamp: new Date()
    };
    
    await player.save({ session });
    
    return player;
  }
  
  /**
   * Checks for and updates expired contracts
   * @returns {Promise<number>} - Number of contracts expired and updated
   */
  async processExpiredContracts() {
    const today = new Date();
    
    const expiredContracts = await Contract.find({
      status: 'Active',
      endDate: { $lt: today }
    });
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      let updatedCount = 0;
      
      for (const contract of expiredContracts) {
        contract.status = 'Expired';
        contract._cdcMeta = {
          modelName: 'Contract',
          operation: 'update',
          timestamp: new Date()
        };
        await contract.save({ session });
        updatedCount++;
      }
      
      await session.commitTransaction();
      session.endSession();
      
      return updatedCount;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
  
      }
    }
  }
