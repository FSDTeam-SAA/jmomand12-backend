import { Router } from 'express';
import pickupScheduleController from './pickupSchedule.controller';

const router = Router();

router.post('/', pickupScheduleController.requestForPickupSchedule);
router.get('/all', pickupScheduleController.getAllPickupSchedules);
router.get('/:auctionId', pickupScheduleController.getAuctionPickupSchedule);

const pickupScheduleRouter = router;
export default pickupScheduleRouter;
