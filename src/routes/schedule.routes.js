const express = require('express');
const scheduleController = require('../controllers/schedule.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('schedules', 'canView'), scheduleController.getSchedules);
router.post('/', checkPermission('schedules', 'canCreate'), scheduleController.createSchedule);
router.post('/batch', checkPermission('schedules', 'canCreate'), scheduleController.createManySchedules);
router.put('/:id', checkPermission('schedules', 'canUpdate'), scheduleController.updateSchedule);
router.delete('/:id', checkPermission('schedules', 'canDelete'), scheduleController.deleteSchedule);

module.exports = router;
