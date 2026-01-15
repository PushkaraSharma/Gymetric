import cron from 'node-cron';
import Client from '../models/Client.js';

export const startExpiryCheck = () => {
  // Runs every day at 00:00 (Midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running Daily Membership Expiry Check...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    //mark future members active if today 
    await Client.updateMany(
      { membershipStatus: 'pending', startDate: { $lte: today } },
      { $set: { membershipStatus: 'active' } }
    );

    //Mark Active/Trial - Expired if today
    await Client.updateMany(
      {
        membershipStatus: { $in: ['active', 'trial'] },
        endDate: { $lt: today }
      },
      { $set: { membershipStatus: 'expired' } }
    );
    console.log('Expiry check completed.');
  });
};