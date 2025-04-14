const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const colors = require('colors');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Initialize CDC system
const cdc = require('./utils/cdc');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CDC middleware for tracking changes
const cdcMiddleware = require('./middleware/cdcMiddleware');
app.use(cdcMiddleware);
const clubs = require('./routes/clubs');
const transfers = require('./routes/transfers');
const agents = require('./routes/agents');
const contracts = require('./routes/contracts');
const players = require('./routes/players');
// Mount routers
app.use('/api/players', players);
app.use('/api/clubs', clubs);
app.use('/api/transfers', transfers);
app.use('/api/agents', agents);
app.use('/api/contracts', contracts);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Football Transfer Management System API is running',
    apiVersion: '1.0.0',
    endpoints: {
      players: '/api/players',
      clubs: '/api/clubs',
      transfers: '/api/transfers',
      agents: '/api/agents',
      contracts: '/api/contracts'
    }
  });
});

// Import and use error handler middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);
// Set port and start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`.yellow.bold);
  
  // Initialize CDC for all collections after server starts
  if (process.env.CDC_ENABLED === 'true') {
    console.log('CDC system is enabled and running'.green);
    
    // Add CDC event listeners
    cdc.on('change', (change) => {
      console.log(`CDC event detected: ${change._cdcModelName} - ${change.operationType}`.cyan);
    });

    // Listen for specific collections
    ['Player', 'Club', 'Transfer', 'Agent', 'Contract'].forEach(model => {
      cdc.on(`change:${model}`, (change) => {
        console.log(`CDC change on ${model}: ${change.operationType}`.cyan);
      });
    });
  } else {
    console.log('CDC system is disabled'.yellow);
  }
}); // Close server.listen callback

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection:'.red, err.message);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(async () => {
    // Stop CDC change streams
    if (cdc && process.env.CDC_ENABLED === 'true') {
      await cdc.close();
      console.log('CDC system stopped'.yellow);
    }
    process.exit(0);
  });
});
