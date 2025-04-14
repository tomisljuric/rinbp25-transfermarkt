const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ContractSchema = new Schema({
  playerId: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: [true, 'Player ID is required']
  },
  clubId: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Club ID is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Contract start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'Contract end date is required']
  },
  salary: {
    type: Number,
    required: [true, 'Salary is required'],
    min: 0
  },
  clauses: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  buyoutClause: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Terminated'],
    default: 'Active'
  }
}, {
  timestamps: true
});

// Virtual for contract duration in months
ContractSchema.virtual('durationInMonths').get(function() {
  return Math.round((new Date(this.endDate) - new Date(this.startDate)) / (30 * 24 * 60 * 60 * 1000));
});

// Check if contract is expired
ContractSchema.virtual('isExpired').get(function() {
  return new Date() > new Date(this.endDate);
});

module.exports = mongoose.model('Contract', ContractSchema);

