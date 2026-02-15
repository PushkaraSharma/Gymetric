import bcrypt from 'bcrypt';
import Gym from '../models/Gym.js'
import User from '../models/User.js'
import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyFirebaseToken } from '../utils/firebaseAdmin.js';

// --- NEW AUTH FLOWS ---

export const verifyOtp = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { firebaseIdToken } = request.body as any;
        // 1. Verify token with Firebase Admin
        let decodedToken;
        try {
            console.log(firebaseIdToken)
            decodedToken = await verifyFirebaseToken(firebaseIdToken);
            console.log(decodedToken)
        } catch (e) {
            return reply.status(401).send({ success: false, message: 'Invalid OTP / Token' });
        }

        const phoneNumber = decodedToken.phone_number;
        const firebaseUid = decodedToken.uid;

        if (!phoneNumber) {
            return reply.status(400).send({ success: false, message: 'Phone number not found in token' });
        }

        // 2. Check if user exists
        const user = await User.findOne({ phoneNumber }).populate('gymId');

        if (user) {
            // Existing User -> Return Token
            const token = jwt.sign(
                { userId: user._id, gymId: user.gymId._id, role: user.role },
                process.env.JWT_SECRET || 'secret',
                { expiresIn: '30d' }
            );

            return reply.status(200).send({
                success: true,
                data: {
                    isNewUser: false,
                    token,
                    username: user.username || user.phoneNumber,
                    role: user.role,
                    gymName: (user.gymId as any).name,
                    address: (user.gymId as any).address,
                    phoneNumber: user.phoneNumber
                }
            });
        } else {
            // New User -> Prompt for Onboarding
            return reply.status(200).send({
                success: true,
                data: {
                    isNewUser: true,
                    firebaseUid,
                    phoneNumber
                }
            });
        }

    } catch (error: any) {
        console.log("eror:", error)
        return reply.status(500).send({ success: false, error: error.message });
    }
}

export const onboard = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { firebaseIdToken, gymName, ownerName, gymAddress, password } = request.body as any;

        // 1. Verify token again (security best practice)
        let decodedToken;
        try {
            decodedToken = await verifyFirebaseToken(firebaseIdToken);
        } catch (e) {
            return reply.status(401).send({ success: false, message: 'Invalid Token' });
        }

        const phoneNumber = decodedToken.phone_number;
        const firebaseUid = decodedToken.uid;

        // 2. Check if user already exists (idempotency)
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
            return reply.status(400).send({ success: false, message: 'User already exists' });
        }

        // 3. Create Gym
        const newGym = new Gym({
            name: gymName,
            address: gymAddress,
            ownerName: ownerName,
            contactNumber: phoneNumber // Use authenticated phone as contact
        });
        await newGym.save();

        // 4. Create User (Admin)
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            phoneNumber,
            firebaseUid,
            passwordHash: hashedPassword,
            role: 'admin',
            gymId: newGym._id,
            isActive: true
        });
        await newUser.save();

        // 5. Issue Token
        const token = jwt.sign(
            { userId: newUser._id, gymId: newGym._id, role: newUser.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' }
        );

        return reply.status(201).send({
            success: true,
            data: {
                token,
                phoneNumber: newUser.phoneNumber,
                role: newUser.role,
                gymName: newGym.name,
                address: newGym.address
            }
        });

    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }
}

export const passwordLogin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { phoneNumber, password } = request.body as any;

        const user = await User.findOne({ phoneNumber }).populate('gymId');
        if (!user) {
            return reply.status(404).send({ success: false, message: 'User not found' });
        }

        if (!user.passwordHash) {
            return reply.status(400).send({ success: false, message: 'Password login not set up for this user. Please use OTP.' });
        }

        const isCorrect = await bcrypt.compare(password, user.passwordHash);
        if (!isCorrect) {
            return reply.status(401).send({ success: false, message: 'Invalid Password' });
        }

        const token = jwt.sign(
            { userId: user._id, gymId: user.gymId._id, role: user.role },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '30d' }
        );

        return reply.status(200).send({
            success: true,
            data: {
                phoneNumber: user.phoneNumber,
                role: user.role,
                gymName: (user.gymId as any).name,
                address: (user.gymId as any).address,
                token
            }
        });

    } catch (error: any) {
        return reply.status(500).send({ success: false, error: error.message });
    }
}

// --- LEGACY / MANUAL FLOWS (Deprecated) ---

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