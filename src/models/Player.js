const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlayerSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true
  },
  birthDate: {
    type: Date,
    required: [true, 'Birth date is required']
  },
  nationality: {
    type: String,
    required: [true, 'Nationality is required'],
    trim: true
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    enum: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']
  },
  currentClub: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: false // A player might be without a club
  },
  marketValue: {
    type: Number,
    default: 0,
    min: 0
  },
  stats: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Virtual for player's age
PlayerSchema.virtual('age').get(function() {
  return Math.floor((new Date() - new Date(this.birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
});

module.exports = mongoose.model('Player', PlayerSchema);

