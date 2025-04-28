const mongoose = require('mongoose');
const Transfer = require('../models/Transfer');
const Contract = require('../models/Contract');
const Club = require('../models/Club');
const Player = require('../models/Player');
const ErrorResponse = require('../utils/errorResponse');

/**
 * TransferService - Handles all transfer-related operations
 * Provides functionality for the entire transfer lifecycle including:
 * - Transfer initiation, completion, and cancellation
 * - Player valuation and tracking
 * - Contract management
 * - Budget management for clubs
 * - Business rule validation
 */
class TransferService {
  /**
   * Initiates a new transfer
   * @param {Object} transferData - The transfer data
   * @returns {Promise<Object>} - The created transfer
   */
  async initiateTransfer(transferData) {
    // Start a session for transaction management
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate transfer data
      await this.validateTransfer(transferData);

      // Create a new transfer with Pending status
      const transfer = new Transfer({
        ...transferData,
        status: 'Pending',
        date: transferData.date || new Date(),
        transferWindow: this.determineTransferWindow(transferData.date || new Date()),
        _cdcMeta: {
          modelName: 'Transfer',
          operation: 'create',
          timestamp: new Date()
        }
      });

      // Save the transfer
      await transfer.save({ session });

      // Reserve funds in buying club's budget
      await this.reserveFunds(transfer.toClub, transfer.transferFee, session);

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return transfer;
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Completes a pending transfer
   * @param {string} transferId - The ID of the transfer to complete
   * @param {Object} contractData - Data for the new contract (optional)
   * @returns {Promise<Object>} - The updated transfer
   */
  async completeTransfer(transferId, contractData = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get the transfer
      const transfer = await Transfer.findById(transferId).session(session);
      if (!transfer) {
        throw new ErrorResponse(`Transfer not found with id ${transferId}`, 404);
      }

      if (transfer.status !== 'Pending') {
        throw new ErrorResponse(`Cannot complete transfer with status ${transfer.status}`, 400);
      }

      // Get related entities
      const [player, fromClub, toClub] = await Promise.all([
        Player.findById(transfer.playerId).session(session),
        Club.findById(transfer.fromClub).session(session),
        Club.findById(transfer.toClub).session(session)
      ]);

      if (!player || !fromClub || !toClub) {
        throw new ErrorResponse('Player or clubs not found', 404);
      }

      // Terminate old contract if exists
      const oldContract = await Contract.findOne({
        playerId: player._id,
        clubId: fromClub._id,
        status: 'Active'
      }).session(session);

      if (oldContract) {
        await this.terminateOldContract(oldContract._id, session);
      }

      // Create new contract if contract data provided
      if (contractData) {
        const newContract = await this.createNewContract({
          playerId: player._id,
          clubId: toClub._id,
          startDate: new Date(),
          ...contractData
        }, session);
        
        // Update transfer with contract details
        transfer.contractDetails = newContract._id;
      }

      // Update player's current club and value
      player.currentClub = toClub._id;
      await this.updatePlayerValue(player._id, transfer.transferFee, session);
      
      // Update player CDC meta
      player._cdcMeta = {
        modelName: 'Player',
        operation: 'update',
        timestamp: new Date()
      };
      
      await player.save({ session });

      // Update club squads
      if (fromClub.currentSquad && fromClub.currentSquad.length > 0) {
        fromClub.currentSquad = fromClub.currentSquad.filter(
          id => id.toString() !== player._id.toString()
        );
      }
      
      if (!toClub.currentSquad) {
        toClub.currentSquad = [];
      }
      
      if (!toClub.currentSquad.includes(player._id)) {
        toClub.currentSquad.push(player._id);
      }

      // Update club budgets
      await this.updateClubBudgets(
        fromClub._id,
        toClub._id, 
        transfer.transferFee,
        session
      );

      // Update transfer status
      transfer.status = 'Completed';
      transfer._cdcMeta = {
        modelName: 'Transfer',
        operation: 'update',
        timestamp: new Date()
      };

      // Save all changes
      await Promise.all([
        transfer.save({ session }),
        fromClub.save({ session }),
        toClub.save({ session })
      ]);

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return transfer;
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Cancels a pending transfer
   * @param {string} transferId - The ID of the transfer to cancel
   * @param {string} reason - The reason for cancellation
   * @returns {Promise<Object>} - The updated transfer
   */
  async cancelTransfer(transferId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get the transfer
      const transfer = await Transfer.findById(transferId).session(session);
      if (!transfer) {
        throw new ErrorResponse(`Transfer not found with id ${transferId}`, 404);
      }

      if (transfer.status !== 'Pending') {
        throw new ErrorResponse(`Cannot cancel transfer with status ${transfer.status}`, 400);
      }

      // Release reserved funds
      await this.releaseFunds(transfer.toClub, transfer.transferFee, session);

      // Update transfer status
      transfer.status = 'Cancelled';
      if (!transfer.additionalTerms) {
        transfer.additionalTerms = new Map();
      }
      transfer.additionalTerms.set('cancellationReason', reason);
      transfer._cdcMeta = {
        modelName: 'Transfer',
        operation: 'update',
        timestamp: new Date()
      };

      await transfer.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return transfer;
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Gets detailed transfer information
   * @param {string} transferId - The ID of the transfer
   * @returns {Promise<Object>} - The transfer with populated references
   */
  async getTransferDetails(transferId) {
    const transfer = await Transfer.findById(transferId)
      .populate('playerId')
      .populate('fromClub')
      .populate('toClub')
      .populate('agentId')
      .populate('contractDetails');

    if (!transfer) {
      throw new ErrorResponse(`Transfer not found with id ${transferId}`, 404);
    }

    return transfer;
  }

  /**
   * Calculates a player's market value based on various factors
   * @param {string} playerId - The ID of the player
   * @returns {Promise<number>} - The calculated market value
   */
  async calculatePlayerValue(playerId) {
    const player = await Player.findById(playerId);
    if (!player) {
      throw new ErrorResponse(`Player not found with id ${playerId}`, 404);
    }

    // Get player's active contract
    const contract = await Contract.findOne({
      playerId: player._id,
      status: 'Active'
    });

    // Get player's transfer history
    const transfers = await Transfer.find({
      playerId: player._id,
      status: 'Completed'
    }).sort({ date: -1 }).limit(3);

    // Base value factors
    const age = player.age;
    
    // Calculate age factor (peak around 27 years old)
    let ageFactor = 1.0;
    if (age < 23) {
      // Young player with potential
      ageFactor = 0.7 + ((23 - age) * 0.05);
    } else if (age <= 29) {
      // Peak years
      ageFactor = 1 + ((29 - age) * 0.05);
    } else {
      // Declining with age
      ageFactor = Math.max(0.5, 1 - ((age - 29) * 0.1));
    }
    
    // Contract factor
    let contractFactor = 1.0;
    if (contract) {
      const endDate = new Date(contract.endDate);
      const now = new Date();
      const monthsRemaining = Math.max(0, 
        ((endDate.getFullYear() - now.getFullYear()) * 12) + 
        (endDate.getMonth() - now.getMonth())
      );
      
      // Shorter contracts reduce value
      if (monthsRemaining <= 6) {
        contractFactor = 0.7;
      } else if (monthsRemaining <= 12) {
        contractFactor = 0.85;
      } else if (monthsRemaining <= 24) {
        contractFactor = 0.95;
      }
    } else {
      // No contract significantly reduces value
      contractFactor = 0.5;
    }
    
    // Performance factor based on goals/appearances
    let performanceFactor = 1.0;
    if (player.position === 'Striker' || player.position === 'Right Winger' || player.position === 'Left Winger') {
      // Attackers valued by goals
      performanceFactor = 1.0 + (player.internationalGoals * 0.05);
    } else {
      // Other positions valued differently
      performanceFactor = 1.0 + (player.internationalCaps * 0.02);
    }
    
    // Transfer history factor
    let transferHistoryFactor = 1.0;
    if (transfers.length > 0) {
      // Recent transfers increase value
      const latestTransfer = transfers[0];
      const latestFee = latestTransfer.transferFee;
      
      // Base new value on most recent transfer fee
      transferHistoryFactor = 1.1;
    }
    
    // Calculate base value
    let marketValue = player.marketValue || 500000; // Default starting value
    
    // Apply all factors
    marketValue = marketValue * ageFactor * contractFactor * performanceFactor * transferHistoryFactor;
    
    // Round to nearest 100,000
    marketValue = Math.round(marketValue / 100000) * 100000;
    
    return marketValue;
  }

  /**
   * Updates a player's market value after a transfer
   * @param {string} playerId - The ID of the player
   * @param {number} transferFee - The transfer fee
   * @param {mongoose.ClientSession} session - The database session
   * @returns {Promise<Object>} - The updated player
   */
  async updatePlayerValue(playerId, transferFee, session) {
    const player = await Player.findById(playerId).session(session);
    if (!player) {
      throw new ErrorResponse(`Player not found with id ${playerId}`, 404);
    }

    // Calculate new market value based on transfer fee
    // Transfer fee is a major factor but not the only one
    const baseValue = Math.round(transferFee * 0.9); // Slight discount from fee
    
    // Adjust based on player age (younger players get higher values)
    const age = player.age;
    let ageMultiplier = 1.0;
    
    if (age < 23) {
      ageMultiplier = 1.2; // Young players have more potential
    } else if (age > 30) {
      ageMultiplier = 0.8; // Older players depreciate faster
    }
    
    // Set new market value
    player.marketValue = Math.round(baseValue * ageMultiplier);
    
    // Return player object (save is handled by calling function)
    return player;
  }

  /**
   * Calculates the impact of a transfer on club budgets
   * @param {Object} transferData - The transfer data
   * @returns {Object} - Object containing budget impacts
   */
  calculateTransferBudgetImpact(transferData) {
    const { transferFee, transferType, sellOnClause } = transferData;
    
    let fromClubImpact = 0;
    let toClubImpact = 0;
    
    switch (transferType) {
      case 'Permanent':
        // Selling club gets the fee, buying club pays it
        fromClubImpact = transferFee;
        toClubImpact = -transferFee;
        break;
        
      case 'Loan':
        // Loan fees are typically smaller
        fromClubImpact = transferFee;
        toClubImpact = -transferFee;
        break;
        
      case 'Free Transfer':
        // No fee for free transfers
        fromClubImpact = 0;
        toClubImpact = 0;
        break;
        
      case 'Swap':
        // Swap deals may have additional fees
        fromClubImpact = transferFee;
        toClubImpact = -transferFee;
        break;
        
      default:
        fromClubImpact = transferFee;
        toClubImpact = -transferFee;
    }
    
    // Handle sell-on clause if applicable
    if (sellOnClause && sellOnClause.active && sellOnClause.percentage > 0) {
      const sellOnAmount = (transferFee * (sellOnClause.percentage / 100));
      fromClubImpact -= sellOnAmount;
      // Note: The club that benefits from sell-on clause would be handled separately
    }
    
    return {
      fromClubImpact,
      toClubImpact
    };
  }

  /**
   * Validates if a date is within a transfer window
   * @param {Date} date - The date to validate
   * @returns {boolean} - True if date is in a transfer window
   */
  validateTransferWindow(date) {
    const transferDate = new Date(date);
    const month = transferDate.getMonth();
    
    // Summer window: June-August (months 5-7)
    // Winter window: January (month 0)
    return (month >= 5 && month <= 7) || month === 0;
  }
}
  /**
   * Determines which transfer window a

const mongoose = require('mongoose');
const Transfer = require('../models/Transfer');
const Contract = require('../models/Contract');
const Club = require('../models/Club');
const Player = require('../models/Player');
const ErrorResponse = require('../utils/errorResponse');

/**
 * Transfer Management Service
 * Handles all operations related to player transfers including:
 * - Transfer lifecycle (initiation, completion, cancellation)
 * - Player value tracking and calculations
 * - Transfer validation
 * - Contract management during transfers
 * - Budget management for clubs
 */
class TransferService {
  /**
   * Initiates a new transfer process
   * @param {Object} transferData - Transfer data including player, clubs, fee, etc.
   * @return {Promise<Object>} - Created transfer object
   */
  async initiateTransfer(transferData) {
    // Start a session for transaction management
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate transfer data
      await this.validateTransfer(transferData, session);

      // Calculate impact on club budgets before creating transfer
      const budgetImpact = this.calculateTransferBudgetImpact(transferData);
      
      // Create transfer with Pending status
      const transfer = new Transfer({
        ...transferData,
        status: 'Pending',
        _cdcMeta: {
          modelName: 'Transfer',
          operation: 'create',
          timestamp: new Date()
        }
      });

      // Save the transfer
      await transfer.save({ session });

      // Reserve the funds in clubs' budgets
      await this.reserveClubBudgets(
        transferData.fromClub,
        transferData.toClub,
        transferData.transferFee,
        session
      );

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return transfer;
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Completes a pending transfer
   * @param {string} transferId - ID of the transfer to complete
   * @return {Promise<Object>} - Updated transfer object
   */
  async completeTransfer(transferId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the transfer
      const transfer = await Transfer.findById(transferId).session(session);
      
      if (!transfer) {
        throw new ErrorResponse(`Transfer not found with ID ${transferId}`, 404);
      }
      
      if (transfer.status !== 'Pending') {
        throw new ErrorResponse(`Cannot complete transfer with status: ${transfer.status}`, 400);
      }

      // Get player and clubs
      const player = await Player.findById(transfer.playerId).session(session);
      const fromClub = await Club.findById(transfer.fromClub).session(session);
      const toClub = await Club.findById(transfer.toClub).session(session);

      if (!player || !fromClub || !toClub) {
        throw new ErrorResponse('Player or clubs not found', 404);
      }

      // Find and terminate old contract
      const oldContract = await Contract.findOne({ 
        playerId: player._id,
        clubId: fromClub._id,
        status: 'Active' 
      }).session(session);
      
      if (oldContract) {
        await this.terminateOldContract(oldContract._id, session);
      }

      // Create new contract if contract details are provided
      if (transfer.contractDetails) {
        await this.createNewContract({
          playerId: player._id,
          clubId: toClub._id,
          ...transfer.contractDetails
        }, session);
      }

      // Update player's club and value
      player.currentClub = toClub._id;
      await this.updatePlayerValue(player._id, transfer.transferFee, session);
      await player.save({ session });

      // Update club squads
      fromClub.currentSquad = fromClub.currentSquad.filter(
        playerId => playerId.toString() !== player._id.toString()
      );
      toClub.currentSquad.push(player._id);

      // Update club budgets
      await this.updateClubBudgets(
        fromClub._id,
        toClub._id,
        transfer.transferFee,
        session
      );

      // Update transfer status
      transfer.status = 'Completed';
      transfer._cdcMeta = {
        modelName: 'Transfer',
        operation: 'update',
        timestamp: new Date()
      };
      await transfer.save({ session });

      // Save club changes
      await fromClub.save({ session });
      await toClub.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return transfer;
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Cancels a pending transfer
   * @param {string} transferId - ID of the transfer to cancel
   * @param {string} reason - Reason for cancellation
   * @return {Promise<Object>} - Updated transfer object
   */
  async cancelTransfer(transferId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const transfer = await Transfer.findById(transferId).session(session);
      
      if (!transfer) {
        throw new ErrorResponse(`Transfer not found with ID ${transferId}`, 404);
      }
      
      if (transfer.status !== 'Pending') {
        throw new ErrorResponse(`Cannot cancel transfer with status: ${transfer.status}`, 400);
      }

      // Release the reserved funds in clubs' budgets
      await this.releaseClubBudgets(
        transfer.fromClub,
        transfer.toClub,
        transfer.transferFee,
        session
      );

      // Update transfer status
      transfer.status = 'Cancelled';
      transfer.additionalTerms.set('cancellationReason', reason);
      transfer._cdcMeta = {
        modelName: 'Transfer',
        operation: 'update',
        timestamp: new Date()
      };

      await transfer.save({ session });

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      return transfer;
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * Gets transfer details with populated references
   * @param {string} transferId - ID of the transfer
   * @return {Promise<Object>} - Transfer with populated references
   */
  async getTransferDetails(transferId) {
    const transfer = await Transfer.findById(transferId)
      .populate('playerId')
      .populate('fromClub')
      .populate('toClub')
      .populate('agentId')
      .populate('contractDetails');
    
    if (!transfer) {
      throw new ErrorResponse(`Transfer not found with ID ${transferId}`, 404);
    }
    
    return transfer;
  }

  /**
   * Calculates player market value based on various factors
   * @param {string} playerId - ID of the player
   * @return {Promise<number>} - Calculated market value
   */
  async calculatePlayerValue(playerId) {
    const player = await Player.findById(playerId);
    
    if (!player) {
      throw new ErrorResponse(`Player not found with ID ${playerId}`, 404);
    }
    
    // Get active contract
    const contract = await Contract.findOne({
      playerId: player._id,
      status: 'Active'
    });
    
    // Get recent transfers
    const transfers = await Transfer.find({
      playerId: player._id,
      status: 'Completed'
    }).sort({ date: -1 }).limit(3);

    // Base value factors
    const age = player.age;
    const ageValue = this.calculateAgeValue(age);
    
    // Contract value factors
    let contractValue = 1.0;
    if (contract) {
      const remainingMonths = this.calculateRemainingContractMonths(contract);
      contractValue = this.calculateContractValueFactor(remainingMonths);
    }
    
    // Performance value
    const performanceValue = this.calculatePerformanceValue(player);
    
    // Recent transfer history value
    const transferHistoryValue = this.calculateTransferHistoryValue(transfers);
    
    // Calculate base market value
    let marketValue = player.marketValue || 500000; // Default base value
    
    // Apply factors
    marketValue = marketValue * ageValue * contractValue * performanceValue * transferHistoryValue;
    
    // Round to nearest 100,000
    marketValue = Math.round(marketValue / 100000) * 100000;
    
    return marketValue;
  }

  /**
   * Updates player market value after a transfer
   * @param {string} playerId - ID of the player
   * @param {number} transferFee - Transfer fee amount
   * @param {mongoose.ClientSession} session - Mongoose session for transaction
   * @return {Promise<Object>} - Updated player object
   */
  async updatePlayerValue(playerId, transferFee, session) {
    const player = await Player.findById(playerId).session(session);
    
    if (!player) {
      throw new ErrorResponse(`Player not found with ID ${playerId}`, 404);
    }
    
    // Calculate new market value based on transfer fee
    // New value is influenced by the transfer fee but not exactly equal to it
    const newMarketValue = Math.round(transferFee * 0.9); // Slight discount on transfer fee
    
    // Update player's market value
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
   * Calculates impact of transfer on club budgets
   * @param {Object} transferData - Transfer data
   * @return {Object} - Budget impact for both clubs
   */
  calculateTransferBudgetImpact(transferData) {
    const { transferFee, transferType } = transferData;
    
    // Different transfer types have different budget impacts
    let fromClubImpact = 0;
    let toClubImpact = 0;
    
    switch (transferType) {
      case 'Permanent':
        fromClubImpact = transferFee;
        toClubImpact = -transferFee;
        break;
      case 'Loan':
        // Loan fees are typically smaller
        fromClubImpact = transferFee * 0.3;
        toClubImpact = -transferFee * 0.3;
        break;
      case 'Free Transfer':
        // No transfer fee, but there might be signing bonuses
        fromClubImpact = 0;
        toClubImpact = 0;
        break;
      default:
        fromClubImpact = transferFee;
        toClubImpact = -transferFee;
    }
    
    return {
      fromClubImpact,
      toClubImpact
    };
  }

  /**
   * Validates if the date is within a valid transfer window
   * @param {Date} date - Transfer date
   * @return {boolean} - True if valid, false otherwise
   */
  validateTransferWindow(date) {
    const transferDate = new Date(date);
    const month = transferDate.getMonth();
    
    // Summer window: June-August (months 5-7)
    // Winter window: January (month 0)
    return (month >= 5 && month <= 7) || month === 0;
  }

  /**
   * Validates if clubs have sufficient budgets for the transfer
   * @param {string} fromClubId - Selling club ID
   * @param {string} toClubId - Buying club ID
   * @param {number} transferFee - Transfer fee amount
   * @return {Promise<boolean>} - True if valid, throws error otherwise
   */
  async validateClubBudgets(fromClubId, toClubId, transferFee) {
    const toClub = await Club.findById(toClubId);
    
    if (!toClub) {
      throw new ErrorResponse(`Buying club not found with ID ${toClubId}`, 404);
    }
    
    if (toClub.budget < transferFee) {
      throw new ErrorResponse(`Buying club does not have sufficient budget for this transfer`, 400);
    }
    
    return true;
  }

  /**
   * Validates player's contract status
   * @param {string} playerId - Player ID
   * @return {Promise<boolean>} - True if valid, throws error otherwise
   */
  async validateContractStatus(playerId) {
    const activeContract = await Contract.findOne({
      playerId,
      status: 'Active'
    });
    
    if (!activeContract) {
      throw new ErrorResponse(`Player does not have an active contract`, 400);
    }
    
    return true;
  }

  /**
   * Validates if club can register more players
   * @param {string} clubId - Club ID
   * @return {Promise<boolean>} - True if valid, throws error otherwise
   */
  async validateSquadRegistration(clubId) {
    const club = await Club.findById(clubId);
    
    if (!club) {
      throw new ErrorResponse(`Club not found with ID ${clubId}`, 404);
    }
    
    // Check if squad size is within limits (typically 25 for senior team)
    if (club.currentSquad.length >= 25) {
      throw new ErrorResponse(`Club has reached maximum squad size`, 400);
    }
    
    return true;
  }

  /**
   * Validates all aspects of a transfer
   * @param {Object} transferData - Transfer data
   * @param {mongoose.ClientSession} session - Mongoose session for transaction
   * @return {Promise<boolean>} - True if valid, throws error otherwise
   */
  async validateTransfer(transferData, session) {
    const { playerId, fromClub, toClub, transferFee, date } = transferData;
    
    // Check if player exists
    const player = await Player.findById(playerId).session(session);
    if (!player) {
      throw new ErrorResponse(`Player not found with ID ${playerId}`, 404);
    }
    
    // Validate transfer window
    if (!this.validateTransferWindow(date)) {
      throw new ErrorResponse(`Transfer date is outside valid transfer windows`, 400);
    }
    
    // Validate club budgets
    await this.validateClubBudgets(fromClub, toClub, transferFee);
    
    // Validate contract status
    await this.validateContractStatus(playerId);
    
    // Validate squad registration
    await this.validateSquadRegistration(toClub);
    
    return true;
  }

  /**
   * Creates a new contract as part of transfer
   * @param {Object} contractData - Contract data
   * @param {mongoose.ClientSession} session - Mongoose session for transaction*/
}