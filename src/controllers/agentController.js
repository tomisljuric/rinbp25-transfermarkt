const Agent = require('../models/Agent');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all agents
 * @route   GET /api/agents
 * @access  Public
 */
exports.getAgents = asyncHandler(async (req, res, next) => {
  const agents = await Agent.find()
    .populate('clientList')
    .populate('transferHistory');
  
  res.status(200).json({
    success: true,
    count: agents.length,
    data: agents
  });
});

/**
 * @desc    Get single agent
 * @route   GET /api/agents/:id
 * @access  Public
 */
exports.getAgent = asyncHandler(async (req, res, next) => {
  const agent = await Agent.findById(req.params.id)
    .populate('clientList')
    .populate('transferHistory');

  if (!agent) {
    return next(new ErrorResponse(`Agent not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: agent
  });
});

/**
 * @desc    Create new agent
 * @route   POST /api/agents
 * @access  Private
 */
exports.createAgent = asyncHandler(async (req, res, next) => {
  const agent = await Agent.create(req.body);

  res.status(201).json({
    success: true,
    data: agent
  });
});

/**
 * @desc    Update agent
 * @route   PUT /api/agents/:id
 * @access  Private
 */
exports.updateAgent = asyncHandler(async (req, res, next) => {
  let agent = await Agent.findById(req.params.id);

  if (!agent) {
    return next(new ErrorResponse(`Agent not found with id of ${req.params.id}`, 404));
  }

  agent = await Agent.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: agent
  });
});

/**
 * @desc    Delete agent
 * @route   DELETE /api/agents/:id
 * @access  Private
 */
exports.deleteAgent = asyncHandler(async (req, res, next) => {
  const agent = await Agent.findById(req.params.id);

  if (!agent) {
    return next(new ErrorResponse(`Agent not found with id of ${req.params.id}`, 404));
  }

  await agent.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

