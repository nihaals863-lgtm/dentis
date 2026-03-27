const reminderService = require('../services/reminder.service');

const createReminder = async (req, res, next) => {
  try {
    const reminder = await reminderService.createReminder({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(reminder);
  } catch (error) {
    next(error);
  }
};

const getMyReminders = async (req, res, next) => {
  try {
    const reminders = await reminderService.getReminders(req.user.id);
    res.json(reminders);
  } catch (error) {
    next(error);
  }
};

const updateReminder = async (req, res, next) => {
  try {
    const reminder = await reminderService.updateReminder(req.params.id, req.body);
    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

const deleteReminder = async (req, res, next) => {
  try {
    await reminderService.deleteReminder(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReminder,
  getMyReminders,
  updateReminder,
  deleteReminder,
};
