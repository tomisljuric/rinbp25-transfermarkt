const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClubSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Club name is required'],
    trim: true,
    unique: true
  },
  league: {
    type: String,
    required: [true, 'League is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  budget: {
    type: Number,
    default: 0,
    min: 0
  },
  currentSquad: [{
    type: Schema.Types.ObjectId,
    ref: 'Player'
  }],
  founded: {
    type: Number,
    required: false
  },
  stadium: {
    type: String,
    required: false,
    trim: true
  },
  logoUrl: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Virtual for getting squad size
ClubSchema.virtual('squadSize').get(function() {
  return this.currentSquad.length;
});

module.exports = mongoose.model('Club', ClubSchema);

