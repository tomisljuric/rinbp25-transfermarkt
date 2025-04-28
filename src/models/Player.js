const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters']
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Please add date of birth']
    },
    nationality: {
      type: String,
      required: [true, 'Please add nationality'],
      trim: true
    },
    position: {
      type: String,
      required: [true, 'Please add player position'],
      enum: [
        'Goalkeeper',
        'Center Back',
        'Right Back',
        'Left Back',
        'Defensive Midfielder',
        'Central Midfielder',
        'Attacking Midfielder',
        'Right Winger',
        'Left Winger',
        'Striker'
      ]
    },
    currentClub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: false // A player might be without a club
    },
    marketValue: {
      type: Number,
      default: 0,
      min: [0, 'Market value cannot be negative']
    },
    height: {
      type: Number,
      min: [0, 'Height cannot be negative']
    },
    weight: {
      type: Number,
      min: [0, 'Weight cannot be negative']
    },
    jerseyNumber: {
      type: Number,
      min: 1,
      max: 99
    },
    preferredFoot: {
      type: String,
      enum: ['left', 'right', 'both']
    },
    status: {
      type: String,
      enum: ['active', 'injured', 'retired', 'suspended'],
      default: 'active'
    },
    // Additional fields
    biography: {
      type: String,
      maxlength: [1000, 'Biography cannot be more than 1000 characters']
    },
    internationalCaps: {
      type: Number,
      default: 0,
      min: 0
    },
    internationalGoals: {
      type: Number,
      default: 0,
      min: 0
    },
    // CDC Meta field for change tracking
    _cdcMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add indexes for performance optimization
PlayerSchema.index({ name: 1 });
PlayerSchema.index({ nationality: 1 });
PlayerSchema.index({ position: 1 });
PlayerSchema.index({ currentClub: 1 });
PlayerSchema.index({ marketValue: -1 }); // Descending for high value players
PlayerSchema.index({ status: 1 });

// Virtual field for age calculation
PlayerSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Pre-save middleware for CDC support
PlayerSchema.pre('save', function(next) {
  this._cdcMeta = {
    modelName: 'Player',
    operation: this.isNew ? 'create' : 'update',
    timestamp: new Date()
  };
  next();
});

// Pre-save validation middleware
PlayerSchema.pre('save', function(next) {
  // Validate date of birth (player should be at least 16 years old and not more than 50)
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();
  
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 16) {
    return next(new Error('Player must be at least 16 years old'));
  }
  
  if (age > 50) {
    return next(new Error('Player age exceeds 50 years'));
  }
  
  next();
});

// CDC implementation for delete operations
PlayerSchema.pre('deleteOne', { document: true }, function(next) {
  this._cdcMeta = {
    modelName: 'Player',
    operation: 'delete',
    timestamp: new Date()
  };
  next();
});

// CDC implementation for update operations
PlayerSchema.pre('findOneAndUpdate', function(next) {
  this.set({ '_cdcMeta.operation': 'update', '_cdcMeta.timestamp': new Date() });
  next();
});

module.exports = mongoose.model('Player', PlayerSchema);
