import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyFirebaseToken } from '../utils/firebaseAdmin.js';
import { db } from '../db/client.js';
import { branches, organizations, roles, staff, users } from '../db/schema.js';
import type { BranchRow, UserRow } from '../db/serializers.js';
import { ensureRoles, invalidateAccess } from '../services/access.js';

const signToken = (user: UserRow) => jwt.sign(
    { userId: user.id, gymId: user.branchId, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '90d' }
);

export const displayName = async (user: UserRow, gym: BranchRow) => {
    if (user.name) return user.name;
    if (user.role === 'admin' || user.role === 'owner') return gym.ownerName || user.username || '';
    const [person] = await db.select({ name: staff.name }).from(staff).where(eq(staff.userId, user.id)).limit(1);
    return person?.name || user.username || '';
};

const roleOf = async (user: UserRow) => {
    if (!user.roleId) return { key: user.role === 'admin' || user.role === 'owner' ? 'owner' : user.role, name: user.role === 'admin' ? 'Owner' : user.role };
    const [role] = await db.select({ key: roles.key, name: roles.name }).from(roles).where(eq(roles.id, user.roleId)).limit(1);
    return { key: role?.key ?? null, name: role?.name ?? '' };
};

const staffActive = async (userId: string) => {
    const [row] = await db.select({ active: staff.active }).from(staff).where(eq(staff.userId, userId)).limit(1);
    return row?.active ?? true;
};

const INACTIVE = 'Your access is turned off. Contact the gym owner.';

const findUserWithGym = async (where: ReturnType<typeof eq>) => {
    const [row] = await db
        .select({ user: users, gym: branches })
        .from(users)
        .innerJoin(branches, eq(branches.id, users.branchId))
        .where(where)
        .limit(1);
    return row ?? null;
};

const createGymWithAdmin = async (
    gym: { name: string; address?: string; ownerName?: string; contactNumber: string },
    user: { phoneNumber?: string; firebaseUid?: string; username?: string; passwordHash: string },
): Promise<{ gym: BranchRow; user: UserRow }> => db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({ name: gym.name }).returning();
    const [branch] = await tx.insert(branches).values({
        organizationId: org.id,
        name: gym.name,
        address: gym.address,
        ownerName: gym.ownerName,
        contactNumber: gym.contactNumber,
    }).returning();
    const roleIds = await ensureRoles(branch.id, tx);
    const [admin] = await tx.insert(users).values({
        ...user,
        name: gym.ownerName,
        role: 'admin',
        roleId: roleIds.owner,
        branchId: branch.id,
        isActive: true,
    }).returning();
    return { gym: branch, user: admin };
});

// --- NEW AUTH FLOWS ---

export const verifyOtp = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { firebaseIdToken } = request.body as any;
        // 1. Verify token with Firebase Admin
        let decodedToken;
        try {
            decodedToken = await verifyFirebaseToken(firebaseIdToken);
        } catch (e) {
            return reply.status(401).send({ success: false, message: 'Invalid OTP / Token' });
        }

        const phoneNumber = decodedToken.phone_number;
        const firebaseUid = decodedToken.uid;

        if (!phoneNumber) {
            return reply.status(400).send({ success: false, message: 'Phone number not found in token' });
        }

        // 2. Check if user exists
        const found = await findUserWithGym(eq(users.phoneNumber, phoneNumber));

        if (found) {
            const { user, gym } = found;
            if (!user.isActive || !(await staffActive(user.id))) {
                return reply.status(403).send({ success: false, message: INACTIVE });
            }
            if (!user.firebaseUid) {
                await db.update(users).set({ firebaseUid }).where(eq(users.id, user.id)).catch(() => undefined);
            }
            return reply.status(200).send({
                success: true,
                data: {
                    isNewUser: false,
                    token: signToken(user),
                    username: await displayName(user, gym),
                    role: user.role,
                    gymName: gym.name,
                    address: gym.address,
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
        request.log.error(error);
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
        const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.phoneNumber, phoneNumber!)).limit(1);
        if (existingUser) {
            return reply.status(400).send({ success: false, message: 'User already exists' });
        }

        // 3. Create Gym + Admin user
        const hashedPassword = await bcrypt.hash(password, 10);
        const { gym, user } = await createGymWithAdmin(
            { name: gymName, address: gymAddress, ownerName, contactNumber: phoneNumber! },
            { phoneNumber, firebaseUid, passwordHash: hashedPassword },
        );

        return reply.status(201).send({
            success: true,
            data: {
                token: signToken(user),
                phoneNumber: user.phoneNumber,
                role: user.role,
                gymName: gym.name,
                address: gym.address,
                username: ownerName
            }
        });

    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
}

export const passwordLogin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { phoneNumber, password } = request.body as any;

        const found = phoneNumber ? await findUserWithGym(eq(users.phoneNumber, phoneNumber)) : null;
        if (!found) {
            return reply.status(404).send({ success: false, message: 'User not found' });
        }
        const { user, gym } = found;

        if (!user.isActive || !(await staffActive(user.id))) {
            return reply.status(403).send({ success: false, message: INACTIVE });
        }

        if (!user.passwordHash) {
            return reply.status(400).send({ success: false, message: 'Password login not set up for this user. Please use OTP.' });
        }

        const isCorrect = await bcrypt.compare(password, user.passwordHash);
        if (!isCorrect) {
            return reply.status(401).send({ success: false, message: 'Invalid Password' });
        }

        return reply.status(200).send({
            success: true,
            data: {
                phoneNumber: user.phoneNumber,
                role: user.role,
                gymName: gym.name,
                address: gym.address,
                username: await displayName(user, gym),
                token: signToken(user)
            }
        });

    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
}

// --- LEGACY / MANUAL FLOWS (Deprecated) ---

export const setupGymAndAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymName, contactNumber, adminName, username, password, gymAddress }: any = request.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await createGymWithAdmin(
            { name: gymName, address: gymAddress, ownerName: adminName, contactNumber },
            { username, passwordHash: hashedPassword },
        );
        return reply.status(201).send({
            success: true,
            message: "Gym and Admin created successfully"
        })
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
}

export const loginAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { username, password }: any = request.body;
        const found = username ? await findUserWithGym(eq(users.username, username)) : null;
        if (!found || !found.user.passwordHash) {
            return reply.status(401).send({ success: false, message: 'Invalid username or password' });
        }
        const { user, gym } = found;
        const isCorrect = await bcrypt.compare(password, user.passwordHash!);
        if (!isCorrect) {
            return reply.status(401).send({ success: false, message: 'Invalid username or password' });
        }
        return reply.status(200).send({
            success: true,
            data: {
                username: user.username,
                role: user.role,
                gymName: gym.name,
                address: gym.address,
                token: signToken(user)
            }
        })
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }

};

export const resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { oldPassword, newPassword }: any = request.body;
        const userId = (request as any).user.userId;

        const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user) {
            return reply.status(404).send({ success: false, message: 'User not found' });
        }

        if (!newPassword || String(newPassword).length < 6) {
            return reply.status(400).send({ success: false, message: 'Password must be at least 6 characters' });
        }
        if (oldPassword && user.passwordHash) {
            const isCorrect = await bcrypt.compare(String(oldPassword), user.passwordHash);
            if (!isCorrect) {
                return reply.status(400).send({ success: false, message: 'Current password is wrong' });
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.update(users).set({ passwordHash: hashedPassword, updatedAt: new Date() }).where(eq(users.id, user.id));

        return reply.status(200).send({
            success: true,
            message: "Password reset successfully"
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const checkUser = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { phoneNumber } = request.body as any;
        const found = phoneNumber ? await findUserWithGym(eq(users.phoneNumber, phoneNumber)) : null;
        if (found) {
            const name = await displayName(found.user, found.gym);
            const role = await roleOf(found.user);
            return reply.status(200).send({
                success: true,
                data: {
                    exists: true,
                    hasPassword: !!found.user.passwordHash,
                    username: name,
                    role: role.key,
                    roleName: role.name,
                    gymName: found.gym.name,
                    gymLogo: found.gym.logo,
                    isStaff: role.key !== 'owner',
                    isActive: found.user.isActive && (await staffActive(found.user.id)),
                }
            });
        } else {
            return reply.status(200).send({
                success: true,
                data: {
                    exists: false,
                    hasPassword: false
                }
            });
        }
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

const meView = async (userId: string) => {
    const found = await findUserWithGym(eq(users.id, userId));
    if (!found) return null;
    const { user, gym } = found;
    const role = await roleOf(user);
    return {
        _id: user.id,
        name: await displayName(user, gym),
        phoneNumber: user.phoneNumber,
        photo: user.photo,
        role: role.key,
        roleName: role.name,
        hasPassword: !!user.passwordHash,
        gymName: gym.name,
    };
};

export const getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const me = await meView((request as any).user.userId);
    if (!me) return reply.status(404).send({ success: false, message: 'User not found' });
    return reply.send({ success: true, data: me });
};

export const updateMe = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.userId as string;
    const body = (request.body ?? {}) as { name?: unknown; photo?: unknown };
    const patch: { name?: string; photo?: string | null; updatedAt: Date } = { updatedAt: new Date() };
    if (body.name !== undefined) {
        const name = String(body.name).trim();
        if (!name) return reply.status(400).send({ success: false, message: 'Enter your name' });
        patch.name = name;
    }
    if (body.photo !== undefined) patch.photo = body.photo ? String(body.photo) : null;
    await db.transaction(async (tx) => {
        await tx.update(users).set(patch).where(eq(users.id, userId));
        if (patch.name) await tx.update(staff).set({ name: patch.name, updatedAt: new Date() }).where(eq(staff.userId, userId));
    });
    invalidateAccess(userId);
    return reply.send({ success: true, data: await meView(userId) });
};
