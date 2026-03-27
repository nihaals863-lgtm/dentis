const express = require('express');
const reminderController = require('../controllers/reminder.controller');
const { authMiddleware, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', checkPermission('reminders', 'canView'), reminderController.getMyReminders);
router.post('/', checkPermission('reminders', 'canCreate'), reminderController.createReminder);
router.put('/:id', checkPermission('reminders', 'canUpdate'), reminderController.updateReminder);
router.delete('/:id', checkPermission('reminders', 'canDelete'), reminderController.deleteReminder);

module.exports = router;
