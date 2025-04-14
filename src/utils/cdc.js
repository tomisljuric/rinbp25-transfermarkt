const mongoose = require('mongoose');
const EventEmitter = require('events');

// Import models
const Player = require('../models/Player');
const Club = require('../models/Club');
const Transfer = require('../models/Transfer');
const Agent = require('../models/Agent');
const Contract = require('../models/Contract');

// Models to track
const TRACKED_MODELS = {
  Player,
  Club,
  Transfer,
  Agent,
  Contract
};

/**
 * CDC (Change Data Capture) Class
 * Tracks and manages changes to collections for data consistency
 */
class CDC extends EventEmitter {
  constructor() {
    super();
    this.isEnabled = process.env.CDC_ENABLED === 'true';
    this.changeStreams = {};
    this.changeLog = [];
    this.maxChangeLogSize = 1000; // Maximum number of changes to keep in memory
    this.isInitialized = false;
  }

  /**
   * Initialize CDC and start watching collections
   */
  async initialize() {
    if (!this.isEnabled) {
      console.log('CDC is disabled. Set CDC_ENABLED=true in .env to enable.');
      return;
    }

    if (this.isInitialized) {
      return;
    }

    try {
      // Setup change streams for each model
      for (const [modelName, Model] of Object.entries(TRACKED_MODELS)) {
        // Create a change stream
        const changeStream = Model.watch();

        // Listen for change events
        changeStream.on('change', (change) => {
          this.handleChange(modelName, change);
        });

        // Store the change stream
        this.changeStreams[modelName] = changeStream;

        console.log(`CDC: Started watching ${modelName} collection`);
      }

      this.isInitialized = true;
      console.log('CDC: Successfully initialized');
    } catch (error) {
      console.error('CDC: Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Handle a change event
   * @param {string} modelName - Name of the model
   * @param {Object} change - Change object from MongoDB
   */
  handleChange(modelName, change) {
    try {
      // Add timestamp for conflict resolution
      const changeWithTimestamp = {
        ...change,
        _cdcTimestamp: new Date(),
        _cdcModelName: modelName
      };

      // Log the change
      this.logChange(changeWithTimestamp);

      // Emit an event for this specific change
      this.emit(`change:${modelName}`, changeWithTimestamp);
      
      // Emit a general change event
      this.emit('change', changeWithTimestamp);

      // Handle based on operation type
      switch (change.operationType) {
        case 'insert':
          this.emit(`insert:${modelName}`, changeWithTimestamp);
          break;
        case 'update':
          this.emit(`update:${modelName}`, changeWithTimestamp);
          break;
        case 'delete':
          this.emit(`delete:${modelName}`, changeWithTimestamp);
          break;
        case 'replace':
          this.emit(`replace:${modelName}`, changeWithTimestamp);
          break;
        default:
          // Other operations like invalidate, drop, etc.
          break;
      }
    } catch (error) {
      console.error('CDC: Error handling change:', error);
    }
  }

  /**
   * Log a change to the in-memory change log
   * @param {Object} change - Change object with timestamp
   */
  logChange(change) {
    // Add to change log
    this.changeLog.push(change);

    // Keep change log at manageable size
    if (this.changeLog.length > this.maxChangeLogSize) {
      this.changeLog.shift(); // Remove oldest change
    }
  }

  /**
   * Resolve conflicts between two changes using timestamp
   * @param {Object} change1 - First change
   * @param {Object} change2 - Second change
   * @returns {Object} - The most recent change
   */
  resolveConflict(change1, change2) {
    // Use timestamp to resolve conflicts - newer wins
    return new Date(change1._cdcTimestamp) > new Date(change2._cdcTimestamp) 
      ? change1 
      : change2;
  }

  /**
   * Get recent changes for a specific model
   * @param {string} modelName - Name of the model
   * @param {number} limit - Maximum number of changes to return
   * @returns {Array} - Array of changes
   */
  getChangesForModel(modelName, limit = 10) {
    return this.changeLog
      .filter(change => change._cdcModelName === modelName)
      .slice(-limit);
  }

  /**
   * Get all recent changes
   * @param {number} limit - Maximum number of changes to return
   * @returns {Array} - Array of changes
   */
  getAllChanges(limit = 100) {
    return this.changeLog.slice(-limit);
  }

  /**
   * Clean up resources when shutting down
   */
  async close() {
    if (!this.isEnabled || !this.isInitialized) {
      return;
    }

    try {
      // Close all change streams
      for (const [modelName, stream] of Object.entries(this.changeStreams)) {
        await stream.close();
        console.log(`CDC: Stopped watching ${modelName} collection`);
      }

      this.isInitialized = false;
      console.log('CDC: Successfully closed');
    } catch (error) {
      console.error('CDC: Error during cleanup:', error);
    }
  }

  /**
   * Manually trigger a change event (useful for testing or initial sync)
   * @param {string} modelName - Name of the model
   * @param {string} operationType - Type of operation (insert, update, delete)
   * @param {Object} document - The document that changed
   */
  triggerChange(modelName, operationType, document) {
    if (!this.isEnabled) {
      return;
    }

    const mockChange = {
      operationType,
      ns: {
        coll: modelName.toLowerCase()
      },
      documentKey: { _id: document._id },
      fullDocument: document,
      _cdcTimestamp: new Date(),
      _cdcModelName: modelName,
      _cdcManuallyTriggered: true
    };

    this.handleChange(modelName, mockChange);
  }
}

// Create a singleton instance
const cdcInstance = new CDC();

// Initialize when this module is imported
(async () => {
  try {
    await cdcInstance.initialize();
  } catch (error) {
    console.error('Failed to initialize CDC:', error);
  }
})();

module.exports = cdcInstance;

