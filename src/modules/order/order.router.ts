import { Router } from 'express';
import orderController from './order.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';

const router = Router();

// Start a Stripe Checkout Session for items currently in the cart
router.post(
  '/checkout',
  auth(USER_ROLE.USER),
  orderController.checkout
);

// Raw Stripe webhook endpoint to process session completion events.
// This route must not be protected by authentication.
router.post(
  '/webhook',
  orderController.handleStripeWebhook
);

// Retrieve the logged-in customer's own order history
router.get(
  '/me',
  auth(USER_ROLE.USER),
  orderController.getMyOrders
);

// Retrieve all customer orders (Admin access only)
router.get(
  '/',
  auth(USER_ROLE.ADMIN),
  orderController.getAllOrders
);

const orderRouter = router;
export default orderRouter;
