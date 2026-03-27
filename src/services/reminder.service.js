const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createReminder = async (reminderData) => {
  const { userId, dueDate, notifyDate, type, description, branch, method } = reminderData;

  return await prisma.reminder.create({
    data: {
      userId: parseInt(userId),
      title: type || reminderData.title || 'Reminder',
      description: description || '',
      severity: type && (type.includes('Expiry') || type.includes('Renewal')) ? 'warning' : 'info',
      dueAt: new Date(dueDate || reminderData.dueAt),
      notifyAt: notifyDate ? new Date(notifyDate) : null,
      branch: branch || 'All Branches',
      method: method || 'In-App',
      reminderType: 'GENERAL',
    },
  });
};

const getReminders = async (userId) => {
  const manualReminders = await prisma.reminder.findMany({
    where: { userId: parseInt(userId) },
    orderBy: { dueAt: 'asc' },
  });

  // Normalize manual reminders to have consistent 'type' field
  const normalized = manualReminders.map(r => ({
    ...r,
    type: r.severity || 'info',
    date: r.dueAt ? r.dueAt.toISOString().split('T')[0] : '',
  }));

  // Generate dynamic system alerts
  const today = new Date();
  const sixtyDaysLater = new Date();
  sixtyDaysLater.setDate(today.getDate() + 60);

  const employeesWithExpiries = await prisma.employee.findMany({
    where: {
      OR: [
        { licenseExpiry: { lte: sixtyDaysLater, gte: today } },
        { visaExpiry: { lte: sixtyDaysLater, gte: today } }
      ]
    }
  });

  const systemAlerts = [];
  employeesWithExpiries.forEach(emp => {
    if (emp.licenseExpiry && emp.licenseExpiry <= sixtyDaysLater) {
      systemAlerts.push({
        id: `sys-lic-${emp.id}`,
        title: 'License Renewal',
        description: `${emp.firstName} ${emp.lastName}'s license is expiring soon (${emp.licenseExpiry.toISOString().split('T')[0]}).`,
        type: 'warning',
        dueAt: emp.licenseExpiry,
        date: emp.licenseExpiry.toISOString().split('T')[0],
        isSystem: true
      });
    }
    if (emp.visaExpiry && emp.visaExpiry <= sixtyDaysLater) {
      systemAlerts.push({
        id: `sys-visa-${emp.id}`,
        title: 'Visa Expiry',
        description: `${emp.firstName} ${emp.lastName}'s visa is expiring soon (${emp.visaExpiry.toISOString().split('T')[0]}).`,
        type: 'warning',
        dueAt: emp.visaExpiry,
        date: emp.visaExpiry.toISOString().split('T')[0],
        isSystem: true
      });
    }
  });

  return [...systemAlerts, ...normalized].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
};

const updateReminder = async (id, reminderData) => {
  const { dueDate, notifyDate, type, description, branch, method } = reminderData;
  const updateData = {};
  if (type) { updateData.title = type; updateData.severity = type.includes('Expiry') || type.includes('Renewal') ? 'warning' : 'info'; }
  if (description !== undefined) updateData.description = description;
  if (dueDate) updateData.dueAt = new Date(dueDate);
  if (notifyDate) updateData.notifyAt = new Date(notifyDate);
  if (branch) updateData.branch = branch;
  if (method) updateData.method = method;

  return await prisma.reminder.update({
    where: { id: parseInt(id) },
    data: updateData,
  });
};

const deleteReminder = async (id) => {
  return await prisma.reminder.delete({
    where: { id: parseInt(id) },
  });
};

module.exports = {
  createReminder,
  getReminders,
  updateReminder,
  deleteReminder,
};
