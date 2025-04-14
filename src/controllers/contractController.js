const Contract = require('../models/Contract');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all contracts
 * @route   GET /api/contracts
 * @access  Public
 */
exports.getContracts = asyncHandler(async (req, res, next) => {
  const contracts = await Contract.find()
    .populate('playerId')
    .populate('clubId');
  
  res.status(200).json({
    success: true,
    count: contracts.length,
    data: contracts
  });
});

/**
 * @desc    Get single contract
 * @route   GET /api/contracts/:id
 * @access  Public
 */
exports.getContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findById(req.params.id)
    .populate('playerId')
    .populate('clubId');

  if (!contract) {
    return next(new ErrorResponse(`Contract not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: contract
  });
});

/**
 * @desc    Create new contract
 * @route   POST /api/contracts
 * @access  Private
 */
exports.createContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.create(req.body);

  res.status(201).json({
    success: true,
    data: contract
  });
});

/**
 * @desc    Update contract
 * @route   PUT /api/contracts/:id
 * @access  Private
 */
exports.updateContract = asyncHandler(async (req, res, next) => {
  let contract = await Contract.findById(req.params.id);

  if (!contract) {
    return next(new ErrorResponse(`Contract not found with id of ${req.params.id}`, 404));
  }

  contract = await Contract.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: contract
  });
});

/**
 * @desc    Delete contract
 * @route   DELETE /api/contracts/:id
 * @access  Private
 */
exports.deleteContract = asyncHandler(async (req, res, next) => {
  const contract = await Contract.findById(req.params.id);

  if (!contract) {
    return next(new ErrorResponse(`Contract not found with id of ${req.params.id}`, 404));
  }

  await contract.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

