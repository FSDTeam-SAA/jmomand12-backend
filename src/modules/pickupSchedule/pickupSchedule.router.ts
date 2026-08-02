import { Router } from 'express';
import pickupScheduleController from './pickupSchedule.controller';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../user/user.constant';

const router = Router();

router.post('/', pickupScheduleController.requestForPickupSchedule);
router.get('/all', pickupScheduleController.getAllPickupSchedules);
router.get(
  '/my-requests',
  auth(USER_ROLE.USER),
  pickupScheduleController.getMyRequestForPickupProduct,
);

router.get('/:auctionId', pickupScheduleController.getAuctionPickupSchedule);
router.patch('/:id/status', pickupScheduleController.updatePickupScheduleStatus);

const pickupScheduleRouter = router;
export default pickupScheduleRouter;
