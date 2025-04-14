const express = require('express');
const router = express.Router();
const Club = require('../models/Club');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @desc    Get all clubs
 * @route   GET /api/clubs
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res, next) => {
  const clubs = await Club.find().populate('currentSquad');
  
  res.status(200).json({
    success: true,
    count: clubs.length,
    data: clubs
  });
}));

/**
 * @desc    Get single club
 * @route   GET /api/clubs/:id
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res, next) => {
  const club = await Club.findById(req.params.id).populate('currentSquad');

  if (!club) {
    return next(new ErrorResponse(`Club not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: club
  });
}));

/**
 * @desc    Create new club
 * @route   POST /api/clubs
 * @access  Private
 */
router.post('/', asyncHandler(async (req, res, next) => {
  const club = await Club.create(req.body);

  res.status(201).json({
    success: true,
    data: club
  });
}));

/**
 * @desc    Update club
 * @route   PUT /api/clubs/:id
 * @access  Private
 */
router.put('/:id', asyncHandler(async (req, res, next) => {
  let club = await Club.findById(req.params.id);

  if (!club) {
    return next(new ErrorResponse(`Club not found with id of ${req.params.id}`, 404));
  }

  club = await Club.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: club
  });
}));

/**
 * @desc    Delete club
 * @route   DELETE /api/clubs/:id
 * @access  Private
 */
router.delete('/:id', asyncHandler(async (req, res, next) => {
  const club = await Club.findById(req.params.id);

  if (!club) {
    return next(new ErrorResponse(`Club not found with id of ${req.params.id}`, 404));
  }

  await club.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
}));

module.exports = router;
