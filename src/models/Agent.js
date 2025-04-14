const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AgentSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Agent name is required'],
    trim: true
  },
  clientList: [{
    type: Schema.Types.ObjectId,
    ref: 'Player'
  }],
  transferHistory: [{
    type: Schema.Types.ObjectId,
    ref: 'Transfer'
  }],
  contactInfo: {
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address'],
      required: false
    },
    phone: {
      type: String,
      required: false
    }
  },
  agency: {
    type: String,
    required: false,
    trim: true
  }
}, {
  timestamps: true
});

// Virtual for client count
AgentSchema.virtual('clientCount').get(function() {
  return this.clientList.length;
});

module.exports = mongoose.model('Agent', AgentSchema);

