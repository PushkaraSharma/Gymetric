import Client from "../models/Client.js";
import Memberships from "../models/Memberships.js";
import Membership from "../models/Memberships.js";

export const getAllClients = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const clients = await Client.find({ gymId }).select('name phoneNumber membershipStatus currentMembershipEndDate id').sort({ name: 1 });
        return reply.status(200).send({ success: true, data: clients });
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const addClient = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const { name, phoneNumber, age, birthday, gender, planId, paymentMethod, paymentReceived, startDate, amount } = request.body;
        const plan = await Membership.findById(planId);
        console.group()
        if (!plan) {
            return reply.status(404).send({ success: false, error: "Membership not found" });
        }
        const customeStartDate = startDate ? new Date(startDate) : new Date();
        const endDate = new Date();
        endDate.setDate(customeStartDate.getDate() + plan.durationInDays);
        let payments = [];
        let balance = 0;
        if(paymentReceived){
            payments.push({ amount, method: paymentMethod, date: customeStartDate});
        }else{
            balance = amount;
        }
        const client = await Client.create({
            name,
            phoneNumber,
            age,
            birthday,
            gender,
            membershipStatus: plan.isTrial ? 'trial' : 'active',
            currentMembershipEndDate: endDate,
            membershipHistory: [{ planId, customeStartDate, endDate }],
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
        const { id, name, phoneNumber, age, birthday, gender, planId, paymentMethod } = request.body;
        const client = Client.findOne({ _id: id, gymId });
        if (!client) {
            return reply.status(404).send({ success: false, message: 'Client not found' });
        }
        console.log("got updated data", id)
        const updateData = { name, phoneNumber, age, gender, birthday };

        if (planId) { //if is it given -> meaning we are updating membership of customer 
            const membership = Memberships.findById(planId);
            if (!membership) return reply.status(404).send({ success: false, error: "Membership not found" });
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + plan.durationInDays);
            updateData.$push = {
                membershipHistory: {planId, startDate, endDate, planName: membership?.name},
                paymentHistory: { amount: membership.price, method: paymentMethod, date: startDate },
            }
            updateData.membershipStatus =  membership.isTrial ? 'trial' : 'active';
            updateData.currentMembershipEndDate = endDate;
        }

        const updatedClient = await Client.findOneAndUpdate(
            {_id: id, gymId},
            updateData,
            {new: true, runValidators: true}
        );
        return reply.send({success: true, data: updatedClient});
    } catch (error) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};


export const getClientById = async (request, reply) => {
    try {
        const gymId = request.user.gymId;
        const { id } = request.query;
        console.log("-------", id)
        const client = await Client.findOne({ _id: id, gymId });
        console.log(client)
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