import bcrypt from 'bcrypt';
import Gym from '../models/Gym.js'
import User from '../models/User.js'
import jwt from 'jsonwebtoken';

export const setupGymAndAdmin = async(request, reply) => {
    try{
        const {gymName, contactNumber, adminName, username, password, gymAddress} = request.body;
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
    } catch (error){
        return reply.status(500).send({success: false, error: error.message});
    }
}

export const loginAdmin = async(request, reply) => {
 try{
        const {username, password} = request.body;
        const user = await User.findOne({username}).populate('gymId');
        if(!user){
            return  reply.status(401).send({success: false, message: 'Invalid username or password'});
        }
        const isCorrect = await bcrypt.compare(password, user.passwordHash);
        if(!isCorrect){
            return  reply.status(401).send({success: false, message: 'Invalid username or password'});
        }
        const token = jwt.sign({userId: user._id, gymId: user.gymId._id, role: user.role}, process.env.JWT_SECRET, {expiresIn: '1d'});
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
    } catch (error){
        return reply.status(500).send({success: false, error: error.message});
    }

};