const Transfer = require('../models/Transfer');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all transfers
 * @route   GET /api/transfers
 * @access  Public
 */
exports.getTransfers = asyncHandler(async (req, res, next) => {
  const transfers = await Transfer.find()
    .populate('playerId')
    .populate('fromClub')
    .populate('toClub')
    .populate('agentId')
    .populate('contractDetails');
  
  res.status(200).json({
    success: true,
    count: transfers.length,
    data: transfers
  });
});

/**
 * @desc    Get single transfer
 * @route   GET /api/transfers/:id
 * @access  Public
 */
exports.getTransfer = asyncHandler(async (req, res, next) => {
  const transfer = await Transfer.findById(req.params.id)
    .populate('playerId')
    .populate('fromClub')
    .populate('toClub')
    .populate('agentId')
    .populate('contractDetails');

  if (!transfer) {
    return next(new ErrorResponse(`Transfer not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: transfer
  });
});

/**
 * @desc    Create new transfer
 * @route   POST /api/transfers
 * @access  Private
 */
exports.createTransfer = asyncHandler(async (req, res, next) => {
  const transfer = await Transfer.create(req.body);

  res.status(201).json({
    success: true,
    data: transfer
  });
});

/**
 * @desc    Update transfer
 * @route   PUT /api/transfers/:id
 * @access  Private
 */
exports.updateTransfer = asyncHandler(async (req, res, next) => {
  let transfer = await Transfer.findById(req.params.id);

  if (!transfer) {
    return next(new ErrorResponse(`Transfer not found with id of ${req.params.id}`, 404));
  }

  transfer = await Transfer.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: transfer
  });
});

/**
 * @desc    Delete transfer
 * @route   DELETE /api/transfers/:id
 * @access  Private
 */
exports.deleteTransfer = asyncHandler(async (req, res, next) => {
  const transfer = await Transfer.findById(req.params.id);

  if (!transfer) {
    return next(new ErrorResponse(`Transfer not found with id of ${req.params.id}`, 404));
  }

  await transfer.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Get transfers by player
 * @route   GET /api/players/:id/transfers
 * @access  Public
 */
exports.getPlayerTransfers = asyncHandler(async (req, res, next) => {
  const transfers = await Transfer.findByPlayer(req.params.id);

  res.status(200).json({
    success: true,
    count: transfers.length,
    data: transfers
  });
});

