const mongoose = require('mongoose');
const cdc = require('../utils/cdc');

/**
 * Middleware for tracking changes and ensuring data consistency
 * Works with CDC system to handle change events
 */
const cdcMiddleware = (req, res, next) => {
  // Only track changes for write operations (POST, PUT, DELETE)
  const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
  
  if (!isWriteOperation || process.env.CDC_ENABLED !== 'true') {
    return next();
  }

  // Store original response methods to modify them
  const originalJson = res.json;
  const originalSend = res.send;

  // Add collection info based on URL path
  let collectionName = null;
  
  // Extract collection name from URL
  if (req.path.startsWith('/api/players')) {
    collectionName = 'players';
  } else if (req.path.startsWith('/api/clubs')) {
    collectionName = 'clubs';
  } else if (req.path.startsWith('/api/transfers')) {
    collectionName = 'transfers';
  } else if (req.path.startsWith('/api/agents')) {
    collectionName = 'agents';
  } else if (req.path.startsWith('/api/contracts')) {
    collectionName = 'contracts';
  }

  // Determine operation type based on HTTP method
  let operationType;
  switch (req.method) {
    case 'POST':
      operationType = 'insert';
      break;
    case 'PUT':
    case 'PATCH':
      operationType = 'update';
      break;
    case 'DELETE':
      operationType = 'delete';
      break;
    default:
      operationType = null;
  }

  // Override res.json to track successful changes
  res.json = function (data) {
    // If this is a successful write operation with data
    if (res.statusCode >= 200 && res.statusCode < 300 && data && collectionName && operationType) {
      try {
        // For successful changes, log to CDC
        logChangeToCDC(collectionName, operationType, data.data || data, req);
      } catch (error) {
        console.error('CDC Middleware Error:', error);
      }
    }

    // Call the original method
    return originalJson.call(this, data);
  };

  // Override res.send for non-JSON responses
  res.send = function (data) {
    // Only handle successful write operations with data
    if (res.statusCode >= 200 && res.statusCode < 300 && data && collectionName && operationType) {
      try {
        // Try to parse data if it's a string
        let parsedData = data;
        if (typeof data === 'string') {
          try {
            parsedData = JSON.parse(data);
          } catch (e) {
            // Not JSON, continue with original data
          }
        }

        // Log to CDC
        if (parsedData && (parsedData.data || parsedData)) {
          logChangeToCDC(collectionName, operationType, parsedData.data || parsedData, req);
        }
      } catch (error) {
        console.error('CDC Middleware Error:', error);
      }
    }

    // Call the original method
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Log change to CDC system
 * @param {string} collectionName - Name of the collection
 * @param {string} operationType - Type of operation (insert, update, delete)
 * @param {Object} data - The data being changed
 * @param {Object} req - The original request
 */
function logChangeToCDC(collectionName, operationType, data, req) {
  // Extract document ID from request or data
  let documentId;
  if (operationType === 'insert') {
    documentId = data._id;
  } else {
    documentId = req.params.id || (data && data._id);
  }

  if (!documentId) {
    return; // Skip if we can't identify the document
  }

  // Schedule a consistency check
  setTimeout(async () => {
    try {
      // Get the current state of the document from the database
      const model = mongoose.model(
        collectionName.charAt(0).toUpperCase() + collectionName.slice(1, -1)
      );
      
      if (operationType === 'delete') {
        // For delete, just notify CDC that a document was deleted
        cdc.emit('manualChange', {
          collection: collectionName,
          operationType: 'delete',
          documentId,
          timestamp: new Date(),
          source: 'cdcMiddleware'
        });
      } else {
        // For insert/update, fetch the current document
        const document = await model.findById(documentId);
        
        if (document) {
          // Notify CDC of the change with the current document state
          cdc.emit('manualChange', {
            collection: collectionName,
            operationType,
            documentId,
            timestamp: new Date(),
            fullDocument: document.toObject(),
            source: 'cdcMiddleware'
          });
        }
      }
    } catch (error) {
      console.error(`CDC consistency check error for ${collectionName}:`, error);
    }
  }, 100); // Small delay to ensure DB operation completes
}

module.exports = cdcMiddleware;

