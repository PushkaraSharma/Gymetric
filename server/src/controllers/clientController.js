import Activity from "../models/Activity.js";
import AssignedMembership from "../models/AssignedMembership.js";
import Client from "../models/Client.js";
import Membership from "../models/Memberships.js";

const calculateExpiry = (startDate, months, days) => {
    let date = new Date(startDate);
    date.setHours(0, 0, 0, 0);
    if (Number(months) > 0) {
        // 1. Move to the same day next month (e.g., Jan 15 -> Feb 15)
        date.setMonth(date.getMonth() + Number(months));
        // 2. Subtract 1 day so it ends on the "Eve" (Feb 15 -> Feb 14)
        date.setDate(date.getDate() - 1);
    } else {
        // For trials (e.g., 3-day trial starting Jan 15 ends Jan 17)
        date.setDate(date.getDate() + (Number(days) - 1));
    }
    // Set to 11:59:59 PM so they have access all through the 14th
    date.setHours(23, 59, 59, 999);
    return date;
};

export const getAllClients = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const clients = await Client.find({ gymId }).select('name phoneNumber gender membershipStatus activeMembership').populate({ path: 'activeMembership', select: 'endDate planName' }).sort({ name: 1 });
        return reply.status(200).send({ success: true, data: clients });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const onBoarding = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const { primaryDetails, dependents = [], planId, method, paymentReceived, startDate, amount } = request.body;
        const plan = await Membership.findById(planId);
        if (!plan) {
            return reply.status(404).send({ success: false, error: "Membership not found" });
        }

        //date setup
        console.log('from forntend : ', startDate)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const customStartDate = startDate ? new Date(startDate) : new Date();
        const endDate = calculateExpiry(customStartDate, plan.durationInMonths, plan.durationInDays);
        const comparisonStartDate = new Date(customStartDate);
        comparisonStartDate.setHours(0, 0, 0, 0);

        const membershipStatus = comparisonStartDate > today ? 'future' : plan.isTrial ? 'trial' : 'active';

        //Create Primary Client
        const primaryClient = await Client.create({
            ...primaryDetails,
            gymId,
            role: 'primary',
            membershipStatus
        });

        //Now create Assigned Membership 
        const newAssignedMembership = await AssignedMembership.create({
            gymId,
            primaryMemberId: primaryClient._id,
            memberIds: [primaryClient._id],
            planId: plan._id,
            planName: plan.planName,
            startDate: customStartDate,
            endDate: endDate,
            amount: amount,
            status: membershipStatus
        });

        //now dependants
        if (dependents.length > 0) {
            for (let dep of dependents) {
                let depClient;
                if (dep.clientId) {
                    // Existing member joining a group
                    depClient = await Client.findByIdAndUpdate(dep.clientId, {
                        role: 'dependent',
                        membershipStatus,
                        activeMembership: newAssignedMembership._id,
                    }, { new: true });
                } else {
                    // New member creation
                    depClient = await Client.create({
                        ...dep,
                        gymId,
                        role: 'dependent',
                        membershipStatus,
                        activeMembership: newAssignedMembership._id
                    });
                }
                depClient.membershipHistory.push(newAssignedMembership._id);
                await depClient.save();
                newAssignedMembership.memberIds.push(depClient._id);
            }
            await newAssignedMembership.save();
        }

        //payments
        let paymentEntry = [];
        let balance = 0;
        if (paymentReceived) {
            paymentEntry.push({ amount, method, date: new Date(), membershipId: newAssignedMembership._id });
        } else {
            balance = amount;
        }

        primaryClient.activeMembership = newAssignedMembership._id;
        primaryClient.balance = balance;
        if (paymentReceived) {
            primaryClient.paymentHistory.push(...paymentEntry);
        }
        //Add to history of membership as well
        primaryClient.membershipHistory.push(newAssignedMembership._id);
        await primaryClient.save();

        //activity log
        await Activity.create({
            gymId,
            type: 'ONBOARDING',
            title: `New member${dependents.length > 0 ? 's' : ''} joined`,
            description: `${primaryClient.name} joined with a ${plan.planName} plan ${dependents?.length > 0 ? `along with ${dependents.length} members` : ''}`,
            amount: paymentReceived ? amount : 0,
            memberId: primaryClient._id
        });
        return reply.status(201).send({ success: true, data: primaryClient });
    } catch (error) {
        console.log(error)
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const updateClient = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const { id, name, phoneNumber, age, birthday, gender } = request.body;
        const client = Client.findOne({ _id: id, gymId });
        if (!client) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }
        const updateData = { name, phoneNumber, age, gender, birthday };
        //membership renew part will be handled in renew section
        const updatedClient = await Client.findOneAndUpdate(
            { _id: id, gymId },
            updateData,
            { new: true, runValidators: true }
        );
        return reply.send({ success: true, data: updatedClient });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getClientById = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const { id } = request.query;
        const client = await Client.findOne({ _id: id, gymId }).populate({
            path: 'activeMembership',
            select: 'startDate endDate status planName'
        })
        if (!client) {
            return reply.status(404).send({ success: false, error: "Client not found" });
        }
        return reply.send({ success: true, data: client });
    }
    catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getClientStats = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const now = new Date();
        const totalClients = await Client.countDocuments({ gymId });
        const activeMembers = await Client.countDocuments({ gymId, endDate: { $gt: now } });
        const expiredMembers = await Client.countDocuments({ gymId, endDate: { $lte: now } });
        return reply.send({
            success: true, data: {
                totalClients, activeMembers, expiredMembers
            }
        })
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

// export const renewMembership = async (request, reply) => {
//     try {
//         const gymId = request.user.gymId;
//         const { id, planId, startDate, amount, method, paymentReceived, remarks } = request.body;
//         const client = await Client.findById(id);
//         const plan = await Membership.findById(planId);
//         let activityType = 'RENEWAL';
//         if (!client || !plan) {
//             return reply.status(404).send({ success: false, message: `${!client ? 'Client' : 'Plan'} not found` });
//         }
//         const newStartDate = new Date(startDate);
//         newStartDate.setHours(0, 0, 0, 0);
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         const newEndDate = calculateExpiry(newStartDate, plan.durationInMonths, plan.durationInDays);

//         const newMembershipData = {
//             planId: plan._id,
//             planName: plan.planName,
//             startDate: newStartDate,
//             endDate: newEndDate,
//             amount: amount,
//             status: newStartDate > today ? 'future' : 'active'
//         };

//         // If they have a currently running valid membership
//         if (['active'].includes(client.membershipStatus) && client.currentEndDate >= today) { //future membership advance
//             client.upcomingMembership = newMembershipData;
//             activityType = 'ADVANCE_RENEWAL';
//         } else {
//             // They are expired or trial, so this becomes the primary active one
//             client.activeMembership = newMembershipData;
//             client.membershipStatus = newMembershipData.status;
//         }

//         // ALWAYS update the currentEndDate to the furthest date
//         // This ensures the Cron Job doesn't expire them prematurely
//         client.currentEndDate = newEndDate;

//         if (paymentReceived) {
//             client.paymentHistory.push({ amount, method, date: today, remarks: remarks || "Plan Renewal" });
//         } else {
//             client.balance += amount;
//         }
//         client.membershipHistory.push(newMembershipData);
//         await client.save();
//         await Activity.create({
//             gymId: gymId,
//             type: activityType,
//             title: activityType === 'RENEWAL' ? 'Membership Renewed' : 'Advance Renewal',
//             description: activityType === 'RENEWAL' ? `${client.name} renewed the ${plan.planName} plan` : `${client.name} pre-paid for ${plan.planName} starting on ${newStartDate.toLocaleDateString()}`,
//             amount: amount,
//             memberId: client._id
//         });
//         return reply.send({ success: true, client });
//     } catch (error) {
//         console.log(error)
//         return reply.status(500).send({ success: false, error: error.message });
//     }
// };

export const renewMembership = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const { id, planId, startDate, amount, method, paymentReceived, remarks, dependents } = request.body;
        const primaryClient = await Client.findById(id);
        const plan = await Membership.findById(planId);
        let activityType = 'RENEWAL';

        if (!primaryClient || !plan) {
            return reply.status(404).send({ success: false, message: `${!primaryClient ? 'Client' : 'Plan'} not found` });
        }

        const newStartDate = new Date(startDate);
        newStartDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newEndDate = calculateExpiry(newStartDate, plan.durationInMonths, plan.durationInDays);
        const status = newStartDate > today ? 'Future' : 'Active';

        //2. create renewMembership
        const renewedMembership = await UnifiedMembership.create({
            gymId,
            primaryMemberId: primaryClient._id,
            memberIds: [primaryClient._id], // Start with primary
            planId: plan._id,
            planName: plan.planName,
            startDate: newStartDate,
            endDate: newEndDate,
            amount: amount,
            status: status
        });

        // 3. Process Dependents (Handling Search, New, or Existing)
        for (let dep of dependents) {
            let depClient;
            if (dep.clientId) {
                depClient = await Client.findById(dep.clientId);
            } else {
                depClient = new Client({ ...dep, gymId });
            }
            if (depClient) {
                depClient.role = 'dependent';
                if (status === 'Active') {
                    depClient.membershipStatus = status;
                    depClient.activeMembership = renewedMembership._id;
                } else {
                    depClient.upcomingMembership = renewedMembership._id;
                }
                depClient.membershipHistory.push(renewedMembership._id);
                await depClient.save();
                renewedMembership.memberIds.push(depClient._id);
            }
        }

        await renewedMembership.save();

        //4. update status of primary client
        if (status === 'Active') {
            primaryClient.membershipStatus = 'Active';
            primaryClient.activeMembership = renewedMembership._id;
        } else {
            activityType = 'ADVANCE_RENEWAL';
            primaryClient.upcomingMembership = renewedMembership._id;
        }

        //5. payments
        if (paymentReceived) {
            primaryClient.paymentHistory.push({ amount, method, date: new Date(), membershipId: renewedMembership._id });
        } else {
            primaryClient.balance += amount;
        }
        primaryClient.membershipHistory.push(renewedMembership._id);
        await primaryClient.save();

        //6. Activity logged
        await Activity.create({
            gymId: gymId,
            type: activityType,
            title: activityType === 'RENEWAL' ? 'Membership Renewed' : 'Advance Renewal',
            description: activityType === 'RENEWAL' ? `${primaryClient.name} renewed the ${plan.planName} plan` : `${primaryClient.name} pre-paid for ${plan.planName} starting on ${newStartDate.toLocaleDateString()}`,
            amount: amount,
            memberId: primaryClient._id
        });
        return reply.send({ success: true, primaryClient });
    } catch (error) {
        console.log(error)
        return reply.status(500).send({ success: false, error: error.message });
    }
};

