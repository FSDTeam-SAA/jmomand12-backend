import { Router } from 'express';
import bidController from './bid.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';

const router = Router();

router.get('/me/dashboard', auth(USER_ROLE.USER), bidController.getMyDashboardAuctionActivity);
router.post('/', auth(USER_ROLE.USER), bidController.addBid);

const bidRouter = router;
export default bidRouter;
