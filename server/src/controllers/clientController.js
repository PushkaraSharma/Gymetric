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
        const clients = await Client.find({ gymId }).select('name phoneNumber membershipStatus currentEndDate id').sort({ name: 1 });
        return reply.status(200).send({ success: true, data: clients });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const addClient = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const { name, phoneNumber, age, birthday, gender, planId, method, paymentReceived, startDate, amount } = request.body;
        const plan = await Membership.findById(planId);
        if (!plan) {
            return reply.status(404).send({ success: false, error: "Membership not found" });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const customStartDate = startDate ? new Date(startDate) : new Date();
        const endDate = calculateExpiry(customStartDate, plan.durationInMonths, plan.durationInDays);
        const comparisonStartDate = new Date(customStartDate);
        comparisonStartDate.setHours(0, 0, 0, 0);
        const status = comparisonStartDate > today ? 'future' : plan.isTrial ? 'trial' : 'active';
        let payments = [];
        let balance = 0;
        if (paymentReceived) {
            payments.push({ amount, method, date: customStartDate });
        } else {
            balance = amount;
        }
        //since this is create API -> possibilities : new plan (either trial or not) starts today or in future.
        const planDetails = { planId, planName: plan.planName, startDate: customStartDate, endDate }
        const client = await Client.create({
            name,
            phoneNumber,
            age,
            birthday,
            gender,
            membershipStatus: status,
            currentEndDate: endDate,
            activeMembership: planDetails,
            membershipHistory: [planDetails],
            paymentHistory: payments,
            balance,
            gymId
        });
        return reply.status(201).send({ success: true, data: client });
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
        const client = await Client.findOne({ _id: id, gymId });
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

export const renewMembership = async (request, reply) => {
    try {
        const { id, planId, startDate, amount, method, paymentReceived, remarks } = request.body;
        const client = await Client.findById(id);
        const plan = await Membership.findById(planId);
        if (!client || !plan) {
            return reply.status(404).send({ success: false, message: `${!client ? 'Client' : 'Plan'} not found` });
        }
        const newStartDate = new Date(startDate);
        newStartDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newEndDate = calculateExpiry(newStartDate, plan.durationInMonths, plan.durationInDays);

        const newMembershipData = {
            planId: plan._id,
            planName: plan.planName,
            startDate: newStartDate,
            endDate: newEndDate,
            amount: amount,
            status: newStartDate > today ? 'future' : 'active'
        };

        // If they have a currently running valid membership
        if (['active'].includes(client.membershipStatus) && client.currentEndDate >= today) { //future membership advance
            client.upcomingMembership = newMembershipData;
        } else {
            // They are expired or trial, so this becomes the primary active one
            client.activeMembership = newMembershipData;
            client.membershipStatus = newMembershipData.status;
        }

        // ALWAYS update the currentEndDate to the furthest date
        // This ensures the Cron Job doesn't expire them prematurely
        client.currentEndDate = newEndDate;

        if (paymentReceived) {
            client.paymentHistory.push({ amount, method, date: today, remarks: remarks || "Plan Renewal" });
        } else {
            client.balance += amount;
        }
        client.membershipHistory.push(newMembershipData);
        await client.save();
        return reply.send({ success: true, client });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};
