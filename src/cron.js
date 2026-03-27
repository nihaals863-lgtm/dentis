const cron = require('node-cron');
const leaveService = require('./services/leave.service');

const initCron = () => {
  // Run on the 1st of every month at 00:00
  cron.schedule('0 0 1 * *', async () => {
    try {
      await leaveService.runMonthlyAutoUpdate();
      console.log('Cron: Monthly leave update completed.');
    } catch (error) {
      console.error('Cron Error: Monthly leave update failed:', error);
    }
  });

  console.log('Cron: Monthly leave update scheduled (1st of every month).');
};

module.exports = { initCron };
