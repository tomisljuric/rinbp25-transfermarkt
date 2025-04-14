const Player = require('../models/Player');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all players
 * @route   GET /api/players
 * @access  Public
 */
exports.getPlayers = asyncHandler(async (req, res, next) => {
  const players = await Player.find().populate('currentClub');
  
  res.status(200).json({
    success: true,
    count: players.length,
    data: players
  });
});

/**
 * @desc    Get single player
 * @route   GET /api/players/:id
 * @access  Public
 */
exports.getPlayer = asyncHandler(async (req, res, next) => {
  const player = await Player.findById(req.params.id).populate('currentClub');

  if (!player) {
    return next(new ErrorResponse(`Player not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: player
  });
});

/**
 * @desc    Create new player
 * @route   POST /api/players
 * @access  Private
 */
exports.createPlayer = asyncHandler(async (req, res, next) => {
  const player = await Player.create(req.body);

  res.status(201).json({
    success: true,
    data: player
  });
});

/**
 * @desc    Update player
 * @route   PUT /api/players/:id
 * @access  Private
 */
exports.updatePlayer = asyncHandler(async (req, res, next) => {
  let player = await Player.findById(req.params.id);

  if (!player) {
    return next(new ErrorResponse(`Player not found with id of ${req.params.id}`, 404));
  }

  player = await Player.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: player
  });
});

/**
 * @desc    Delete player
 * @route   DELETE /api/players/:id
 * @access  Private
 */
exports.deletePlayer = asyncHandler(async (req, res, next) => {
  const player = await Player.findById(req.params.id);

  if (!player) {
    return next(new ErrorResponse(`Player not found with id of ${req.params.id}`, 404));
  }

  await player.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

