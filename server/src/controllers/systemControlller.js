import Client from '../models/Client.js';
import Activity from '../models/Activity.js';

export const performExpiryChecks = async (request, reply) => {
    try {
        const { secret } = request.body;
        if (secret !== process.env.CRON_SECRET) {
            return reply.status(401).send({ success: false, message: 'Unauthorized' });
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        console.log('Running Daily Membership Expiry Check...');

        //find ones with upcoming plans and are now expired
        const clientsToPromote = await Client.find({
            'activeMembership.endDate': { $lt: today },
            upcomingMembership: { $ne: null }
        });

        if (clientsToPromote.length > 0) {
            const promotionActivities = [];
            for (let client of clientsToPromote) {
                // Promote Upcoming to Active
                const newPlan = { ...client.upcomingMembership, status: 'active' };
                client.activeMembership = newPlan;
                client.membershipStatus = 'active';
                client.currentEndDate = newPlan.endDate;
                client.upcomingMembership = null;
                await client.save();
                promotionActivities.push({
                    gymId: client?.gymId,
                    type: 'RENEWAL',
                    title: 'Membership Activated',
                    description: `${client.name}'s scheduled plan has started.`,
                    memberId: client._id,
                    date: today
                })
            }
            if (promotionActivities.length > 0) await Activity.insertMany(promotionActivities);
            console.log(`Promoted ${clientsToPromote.length} queued memberships.`);
        }

        // 2. LOG EXPIRIES BEFORE BULK UDATING
        // We fetch the ones who ARE active/trial but SHOULD BE expired today
        const clientsExpiring = await Client.find({
            membershipStatus: { $in: ['active', 'trial'] },
            currentEndDate: { $lt: today },
            upcomingMembership: null // Only those who don't have a backup plan
        });
        if (clientsExpiring.length > 0) {
            const expiryActivities = clientsExpiring.map(client => ({
                gymId: client.gymId,
                type: 'EXPIRY',
                title: client.membershipStatus === 'trial' ? 'Trial Expired' : 'Membership Expired',
                description: `${client.name}'s membership has ended.`,
                memberId: client._id,
                date: today
            }));
            await Activity.insertMany(expiryActivities);
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
        return reply.status(200).send({ success: true, data: { message: 'Cron job executed' } });
    } catch (error) {
        console.log(error)
        return reply.status(500).send({ success: false, error: error.message });
    }
};