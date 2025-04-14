const express = require('express');
const router = express.Router({ mergeParams: true });
const Transfer = require('../models/Transfer');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all transfers
 * @route   GET /api/transfers
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res, next) => {
  let query;
  
  // Check if route is coming from player route
  if (req.params.id) {
    query = Transfer.find({ playerId: req.params.id });
  } else {
    query = Transfer.find();
  }
  
  const transfers = await query
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
}));

/**
 * @desc    Get single transfer
 * @route   GET /api/transfers/:id
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res, next) => {
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
}));

/**
 * @desc    Create new transfer
 * @route   POST /api/transfers
 * @access  Private
 */
router.post('/', asyncHandler(async (req, res, next) => {
  const transfer = await Transfer.create(req.body);

  res.status(201).json({
    success: true,
    data: transfer
  });
}));

/**
 * @desc    Update transfer
 * @route   PUT /api/transfers/:id
 * @access  Private
 */
router.put('/:id', asyncHandler(async (req, res, next) => {
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
}));

/**
 * @desc    Delete transfer
 * @route   DELETE /api/transfers/:id
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const transfer = await Transfer.findById(req.params.id);

  if (!transfer) {
    return next(new ErrorResponse(`Transfer not found with id of ${req.params.id}`, 404));
  }

  await transfer.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
}));

module.exports = router;
