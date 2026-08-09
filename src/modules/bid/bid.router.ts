import { Router } from 'express';
import bidController from './bid.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';
import { bidRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.get('/me/dashboard', auth(USER_ROLE.USER), bidController.getMyDashboardAuctionActivity);
router.post('/', auth(USER_ROLE.USER), bidRateLimiter, bidController.addBid);

const bidRouter = router;
export default bidRouter;
