import cron from 'node-cron';
import Client from '../models/Client.js';

export const startExpiryCheck = () => {
  // Runs every day at 00:00 (Midnight)
  cron.schedule('0 0 * * *', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('Running Daily Membership Expiry Check...');

    //find ones with upcoming plans and are now expired
    const clientsToPromote = await Client.find({
      'activeMembership.endDate': { $lt: today },
      upcomingMembership: { $ne: null }
    });

    if (clientsToPromote.length > 0) {
      for (let client of clientsToPromote) {
        // Promote Upcoming to Active
        client.activeMembership = { ...client.upcomingMembership, status: 'active' };
        client.membershipStatus = 'active';
        client.upcomingMembership = null;
        await client.save();
      }
      console.log(`Promoted ${clientsToPromote.length} queued memberships.`);
    }

    await Client.bulkWrite([
      //mark future members active if today 
      {
        updateMany: {
          filter: {
            membershipStatus: 'future',
            'activeMembership.startDate': { $lte: today }
          },
          update: {
            $set: {
              membershipStatus: 'active',
              'activeMembership.status': 'active'
            }
          }
        }
      },
      // 2. Mark Active members as Expired
      {
        updateMany: {
          filter: {
            membershipStatus: 'active',
            currentEndDate: { $lt: today }
          },
          update: {
            $set: {
              membershipStatus: 'expired',
              'activeMembership.status': 'expired'
            }
          }
        }
      },
      // 3. Mark Trial members as Trial_Expired
      {
        updateMany: {
          filter: {
            membershipStatus: 'trial',
            currentEndDate: { $lt: today }
          },
          update: {
            $set: {
              membershipStatus: 'trial_expired',
              'activeMembership.status': 'trial_expired'
            }
          }
        }
      }
    ]);
    console.log('Expiry check completed.');
  });
};