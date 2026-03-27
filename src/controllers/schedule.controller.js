const scheduleService = require('../services/schedule.service');

const createSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.createSchedule(req.body);
    res.status(201).json(schedule);
  } catch (error) {
    next(error);
  }
};

const createManySchedules = async (req, res, next) => {
  try {
    const result = await scheduleService.createManySchedules(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const getSchedules = async (req, res, next) => {
  try {
    const { start, end, month } = req.query;

    // MANDATORY VALIDATION: Month or (Start and End)
    if (!month && (!start && !end)) {
      return res.status(400).json({ message: 'Month or (Start and End dates) are required' });
    }

    const query = { ...req.query };

    // ROLE-BASED ACCESS: Employees only see their own
    if (req.user.role !== 'ADMIN') {
      if (!req.user.employee) {
        return res.status(403).json({ message: 'User has no associated employee record' });
      }
      query.employeeId = req.user.employee.id;
    }

    const schedules = await scheduleService.getSchedules(query);

    // SENIOR DEV RESPONSE FORMAT: title, startTime, endTime + local date
    const formattedSchedules = schedules.map(s => {
      const d = new Date(s.startTime);
      const date = d.getFullYear() + '-' + 
        String(d.getMonth() + 1).padStart(2, '0') + '-' + 
        String(d.getDate()).padStart(2, '0');

      return {
        id: s.id,
        employeeId: s.employeeId,
        branch: s.branch,
        title: s.title || 'Work Shift',
        date, // Crucial for Day/Week grouping in local time
        startTime: s.startTime,
        endTime: s.endTime
      };
    });

    res.json(formattedSchedules);
  } catch (error) {
    next(error);
  }
};

const updateSchedule = async (req, res, next) => {
  try {
    const schedule = await scheduleService.updateSchedule(req.params.id, req.body);
    res.json(schedule);
  } catch (error) {
    next(error);
  }
};

const deleteSchedule = async (req, res, next) => {
  try {
    await scheduleService.deleteSchedule(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSchedule,
  createManySchedules,
  getSchedules,
  updateSchedule,
  deleteSchedule,
};
