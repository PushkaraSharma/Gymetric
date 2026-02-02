import bcrypt from 'bcrypt';
import Gym from '../models/Gym.js'
import User from '../models/User.js'
import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';

export const setupGymAndAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymName, contactNumber, adminName, username, password, gymAddress }: any = request.body;
        const newGym = new Gym({
            name: gymName,
            address: gymAddress,
            ownerName: adminName,
            contactNumber: contactNumber
        });
        await newGym.save();
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            passwordHash: hashedPassword,
            role: 'admin',
            gymId: newGym._id
        });
        await user.save();
        return reply.status(201).send({
            success: true,
            message: "Gym and Admin created successfully"
        })
    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }
}

export const loginAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { username, password }: any = request.body;
        const user = await User.findOne({ username }).populate('gymId');
        if (!user) {
            return reply.status(401).send({ success: false, message: 'Invalid username or password' });
        }
        const isCorrect = await bcrypt.compare(password, user.passwordHash);
        if (!isCorrect) {
            return reply.status(401).send({ success: false, message: 'Invalid username or password' });
        }
        const token = jwt.sign({ userId: user._id, gymId: user.gymId._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
        return reply.status(200).send({
            success: true,
            data: {
                username: user.username,
                role: user.role,
                gymName: (user.gymId).name,
                address: (user.gymId).address,
                token
            }
        })
    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }

};

export const resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { oldPassword, newPassword }: any = request.body;
        const userId = (request as any).user.userId;

        const user = await User.findById(userId);
        if (!user) {
            return reply.status(404).send({ success: false, message: 'User not found' });
        }

        const isCorrect = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isCorrect) {
            return reply.status(401).send({ success: false, message: 'Invalid old password' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.passwordHash = hashedPassword;
        await user.save();

        return reply.status(200).send({
            success: true,
            message: "Password reset successfully"
        });
    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }
};