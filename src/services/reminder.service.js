const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createReminder = async (reminderData) => {
  const { userId, employeeId, dueDate, notifyDate, type, description, branch, method } = reminderData;

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  const dueAt = parseDate(dueDate || reminderData.dueAt);
  if (!dueAt) {
    throw new Error('Due date is required and must be a valid date.');
  }

  let targetUserId = null;
  if (employeeId && employeeId !== 'General') {
    const employee = await prisma.employee.findUnique({
      where: { id: parseInt(employeeId) },
      select: { userId: true },
    });
    if (employee) {
      targetUserId = employee.userId;
    }
  }

  return await prisma.reminder.create({
    data: {
      userId: parseInt(userId),
      targetUserId: targetUserId ? parseInt(targetUserId) : null,
      title: reminderData.title || type || 'Reminder',
      description: description || '',
      severity: reminderData.severity || (type && (type.includes('Expiry') || type.includes('Renewal')) ? 'warning' : 'info'),
      dueAt: dueAt,
      notifyAt: parseDate(notifyDate || reminderData.notifyAt),
      branch: branch || 'All Branches',
      method: method || 'In-App',
      reminderType: 'GENERAL',
      attachmentUrl: reminderData.attachmentUrl || null,
    },
  });
};

const getReminders = async (userId, userRole) => {
  const isAdmin = userRole === 'admin';
  const whereClause = isAdmin ? {} : {
    OR: [
      { userId: parseInt(userId) },
      { targetUserId: parseInt(userId) },
      { targetUserId: null }
    ]
  };

  const manualReminders = await prisma.reminder.findMany({
    where: whereClause,
    orderBy: { dueAt: 'asc' },
  });

  if (isAdmin) {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { 
        id: true, firstName: true, lastName: true, 
        licenseExpiry: true, visaExpiry: true, workPermitExpiry: true 
      }
    });

    const systemAlerts = [];
    const today = new Date();
    const alertThreshold = 60;

    employees.forEach(emp => {
      const checks = [
        { date: emp.licenseExpiry, label: 'License' },
        { date: emp.visaExpiry, label: 'Visa' },
        { date: emp.workPermitExpiry, label: 'Work Permit' }
      ];

      checks.forEach(check => {
        if (check.date) {
          const daysLeft = Math.ceil((new Date(check.date) - today) / (1000 * 60 * 60 * 24));
          if (daysLeft <= alertThreshold) {
            systemAlerts.push({
              id: `sys-${emp.id}-${check.label}`,
              title: `${check.label} Expiry: ${emp.firstName}`,
              description: `${emp.firstName}'s ${check.label} expires in ${daysLeft} days (${check.date.toISOString().split('T')[0]})`,
              severity: daysLeft <= 15 ? 'critical' : 'warning',
              dueAt: check.date,
              branch: 'All Branches',
              isSystem: true
            });
          }
        }
      });
    });

    return [...manualReminders, ...systemAlerts].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  }

  return manualReminders;
};

const getActiveNotifications = async (userId, userRole) => {
  const isAdmin = userRole === 'admin';
  const today = new Date();
  
  const whereClause = isAdmin ? {
    isRead: false,
    OR: [
      { notifyAt: { lte: today } },
      { notifyAt: null }
    ]
  } : {
    AND: [
      {
        OR: [
          { targetUserId: parseInt(userId) },
          { targetUserId: null }
        ]
      },
      { isRead: false },
      {
        OR: [
          { notifyAt: { lte: today } },
          { notifyAt: null }
        ]
      }
    ]
  };

  const manualNotifications = await prisma.reminder.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  if (isAdmin) {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { 
        id: true, firstName: true, lastName: true, 
        licenseExpiry: true, visaExpiry: true, workPermitExpiry: true 
      }
    });

    const systemNotifications = [];
    for (const emp of employees) {
      const checks = [
        { date: emp.licenseExpiry, label: 'License' },
        { date: emp.visaExpiry, label: 'Visa' },
        { date: emp.workPermitExpiry, label: 'Work Permit' }
      ];

      for (const check of checks) {
        if (check.date) {
          const daysLeft = Math.ceil((new Date(check.date) - today) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 60) {
            systemNotifications.push({
              id: `sys-notif-${emp.id}-${check.label}`,
              title: `${check.label} Expiry Alert`,
              description: `${emp.firstName}'s ${check.label} expires on ${check.date.toISOString().split('T')[0]}`,
              severity: daysLeft <= 15 ? 'critical' : 'warning',
              createdAt: today,
              notifyAt: today,
              isRead: false,
              isSystem: true
            });
          }
        }
      }
    }
    return [...systemNotifications, ...manualNotifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return manualNotifications;
};

const updateReminder = async (id, reminderData) => {
  const { dueDate, notifyDate, type, description, branch, method, isRead } = reminderData;
  const updateData = {};

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  if (reminderData.title) {
    updateData.title = reminderData.title;
    updateData.severity = reminderData.severity || (reminderData.title.includes('Expiry') || reminderData.title.includes('Renewal') ? 'warning' : 'info');
  } else if (type) {
    updateData.title = type;
    updateData.severity = type.includes('Expiry') || type.includes('Renewal') ? 'warning' : 'info';
  }
  if (description !== undefined) updateData.description = description;

  const dueAt = parseDate(dueDate || reminderData.dueAt);
  if (dueAt) updateData.dueAt = dueAt;

  const notifyAt = parseDate(notifyDate || reminderData.notifyAt);
  if (notifyAt) updateData.notifyAt = notifyAt;

  if (branch) updateData.branch = branch;
  if (method) updateData.method = method;
  if (isRead !== undefined) updateData.isRead = isRead;
  if (reminderData.attachmentUrl !== undefined) updateData.attachmentUrl = reminderData.attachmentUrl;

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
  getActiveNotifications,
  updateReminder,
  deleteReminder,
};
