import cron from 'node-cron';
import Client from '../models/Client.js';

export const startExpiryCheck = () => {
  // Runs every day at 00:00 (Midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running Daily Membership Expiry Check...');
    const now = new Date();
    //Mark Active - Expired
    await Client.updateMany(
      { 
        membershipStatus: 'active', 
        endDate: { $lt: now } 
      },
      { $set: { membershipStatus: 'expired' } }
    );

    //Mark Trial - Trial Expired
    await Client.updateMany(
      { 
        membershipStatus: 'trial', 
        endDate: { $lt: now } 
      },
      { $set: { membershipStatus: 'trial_expired' } }
    );
    console.log('Expiry check completed.');
  });
};