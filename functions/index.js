/**
 * Firebase Cloud Functions for Wuzzle Games
 *
 * This file exports all deployed Cloud Functions.
 */

const { cleanupExpiredRooms, cleanupExpiredRoomsOnWrite } = require('./cleanupExpiredRooms');
const {
  createGiftCheckoutSession,
  adminGiftSubscription,
  stripeGiftWebhook,
  getSubscriptionDetails,
  updateSubscriptionAutoRenew,
  cancelSubscription,
} = require('./giftSubscription');

module.exports = {
  cleanupExpiredRooms,
  cleanupExpiredRoomsOnWrite,
  createGiftCheckoutSession,
  adminGiftSubscription,
  stripeGiftWebhook,
  getSubscriptionDetails,
  updateSubscriptionAutoRenew,
  cancelSubscription,
};
