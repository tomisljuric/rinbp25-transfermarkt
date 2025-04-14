const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TransferSchema = new Schema({
  playerId: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: [true, 'Player ID is required']
  },
  fromClub: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Origin club is required']
  },
  toClub: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Destination club is required']
  },
  transferFee: {
    type: Number,
    required: [true, 'Transfer fee is required'],
    min: 0
  },
  currency: {
    type: String,
    enum: ['EUR', 'USD', 'GBP', 'JPY', 'CNY'],
    default: 'EUR'
  },
  exchangeRate: {
    type: Number,
    default: 1.0 // Rate to convert to base currency (EUR)
  },
  date: {
    type: Date,
    default: Date.now,
    required: [true, 'Transfer date is required']
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'Agent',
    required: false // An agent is not always involved
  },
  contractDetails: {
    type: Schema.Types.ObjectId,
    ref: 'Contract',
    required: false
  },
  transferType: {
    type: String,
    enum: ['Permanent', 'Loan', 'Free Transfer', 'Swap'],
    default: 'Permanent'
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Cancelled', 'Failed'],
    default: 'Completed'
  },
  loanDuration: {
    type: Number, // In months
    min: 1,
    required: function() {
      return this.transferType === 'Loan';
    }
  },
  transferWindow: {
    type: String,
    enum: ['Summer', 'Winter', 'Outside Window'],
    required: true
  },
  performanceBonuses: [{
    description: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    condition: {
      type: String,
      required: true
    },
    achieved: {
      type: Boolean,
      default: false
    },
    dueDate: {
      type: Date,
      required: false
    }
  }],
  sellOnClause: {
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    active: {
      type: Boolean,
      default: false
    }
  },
  additionalTerms: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Add indexes for efficient queries
TransferSchema.index({ playerId: 1, date: -1 });
TransferSchema.index({ fromClub: 1, toClub: 1, date: -1 });
TransferSchema.index({ date: -1 }); // For timeline queries

// Virtual for calculating years since the transfer
TransferSchema.virtual('yearsSinceTransfer').get(function() {
  return Math.floor((new Date() - new Date(this.date)) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual for calculating transfer fee in base currency (EUR)
TransferSchema.virtual('transferFeeInEUR').get(function() {
  return this.transferFee * this.exchangeRate;
});

// Method to add a performance bonus
TransferSchema.methods.addPerformanceBonus = function(description, amount, condition, dueDate) {
  this.performanceBonuses.push({
    description,
    amount,
    condition,
    achieved: false,
    dueDate
  });
  return this.save();
};

// Method to mark a bonus as achieved
TransferSchema.methods.markBonusAchieved = function(bonusId) {
  const bonus = this.performanceBonuses.id(bonusId);
  if (bonus) {
    bonus.achieved = true;
    return this.save();
  }
  return Promise.reject(new Error('Bonus not found'));
};

// Static method to find recent transfers by player
TransferSchema.statics.findByPlayer = function(playerId) {
  return this.find({ playerId })
    .sort({ date: -1 })
    .populate('fromClub')
    .populate('toClub')
    .populate('agentId');
};

module.exports = mongoose.model('Transfer', TransferSchema);
