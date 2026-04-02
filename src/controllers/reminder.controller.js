const reminderService = require('../services/reminder.service');
const documentService = require('../services/document.service');

const createReminder = async (req, res, next) => {
  try {
    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const reminder = await reminderService.createReminder({
      ...req.body,
      userId: req.user.id,
      attachmentUrl,
    });

    if (req.file) {
      try {
        await documentService.createDocument({
          fileName: req.file.originalname,
          fileUrl: attachmentUrl,
          fileType: req.file.mimetype,
          fileSizeKb: Math.round(req.file.size / 1024),
          category: 'OTHER',
          title: req.body.title || req.body.type || 'Reminder Document',
          employeeId: req.body.employeeId && req.body.employeeId !== 'General' ? parseInt(req.body.employeeId) : undefined,
          branch: req.body.branch || 'All Branches',
        });
      } catch (docErr) {
        console.error('Failed to create linked document:', docErr);
      }
    }

    res.status(201).json(reminder);
  } catch (error) {
    next(error);
  }
};

const getMyReminders = async (req, res, next) => {
  try {
    const role = req.user.role?.name?.toLowerCase();
    const reminders = await reminderService.getReminders(req.user.id, role);
    res.json(reminders);
  } catch (error) {
    next(error);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const role = req.user.role?.name?.toLowerCase();
    const notifications = await reminderService.getActiveNotifications(req.user.id, role);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

const updateReminder = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    let attachmentUrl = null;
    
    if (req.file) {
      attachmentUrl = `/uploads/${req.file.filename}`;
      updateData.attachmentUrl = attachmentUrl;
    }
    
    const reminder = await reminderService.updateReminder(req.params.id, updateData);

    if (req.file) {
      try {
        await documentService.createDocument({
          fileName: req.file.originalname,
          fileUrl: attachmentUrl,
          fileType: req.file.mimetype,
          fileSizeKb: Math.round(req.file.size / 1024),
          category: 'OTHER',
          title: req.body.title || req.body.type || 'Reminder Document Updated',
          employeeId: req.body.employeeId && req.body.employeeId !== 'General' ? parseInt(req.body.employeeId) : undefined,
          branch: req.body.branch || 'All Branches',
        });
      } catch (docErr) {
        console.error('Failed to create linked document on update:', docErr);
      }
    }

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
  getNotifications,
  updateReminder,
  deleteReminder,
};
