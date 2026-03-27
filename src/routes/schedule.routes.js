const express = require('express');
const scheduleController = require('../controllers/schedule.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('schedule', 'canView'), scheduleController.getSchedules);
router.post('/', checkPermission('schedule', 'canCreate'), scheduleController.createSchedule);
router.post('/batch', checkPermission('schedule', 'canCreate'), scheduleController.createManySchedules);
router.put('/:id', checkPermission('schedule', 'canUpdate'), scheduleController.updateSchedule);
router.delete('/:id', checkPermission('schedule', 'canDelete'), scheduleController.deleteSchedule);

module.exports = router;
