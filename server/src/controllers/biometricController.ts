import { FastifyRequest, FastifyReply } from 'fastify';
import BiometricDevice from '../models/BiometricDevice.js';
import Attendance from '../models/Attendance.js';
import Client from '../models/Client.js';
import Gym from '../models/Gym.js';
import {
    ensureClientPin,
    enqueueCommand,
    getActiveDeviceForGym,
    isAttendanceEnabled,
    isDoorAllowed,
    recordPunch,
    syncClientDoorAccess,
} from '../services/biometricService.js';
import { getNowIST, getISTMidnightToday, addUtcDays } from '../utils/timeUtils.js';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const pairDevice = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { serialNumber, name } = request.body as { serialNumber: string; name?: string };

        if (!serialNumber?.trim()) {
            return reply.status(400).send({ success: false, error: 'Serial number is required' });
        }

        const sn = serialNumber.trim().toUpperCase();
        const existing = await BiometricDevice.findOne({ serialNumber: sn });
        if (existing && String(existing.gymId) !== String(gymId)) {
            return reply.status(409).send({ success: false, error: 'Device already paired to another gym' });
        }

        // Deactivate other devices for this gym (one active entrance for MVP)
        await BiometricDevice.updateMany({ gymId }, { $set: { isActive: false } });

        let device = existing;
        if (device) {
            device.gymId = gymId as any;
            device.isActive = true;
            if (name) device.name = name;
            await device.save();
        } else {
            // Seed nextPin from existing clients
            const maxClient: any = await Client.findOne({ gymId, biometricPin: { $ne: null } })
                .sort({ biometricPin: -1 })
                .select('biometricPin')
                .lean();
            const nextPin = maxClient?.biometricPin ? Number(maxClient.biometricPin) + 1 : 1001;

            device = await BiometricDevice.create({
                gymId,
                serialNumber: sn,
                name: name || 'Entrance',
                isActive: true,
                nextPin,
            });
        }

        // New device → all enrolled members need re-enroll (templates not in our DB)
        if (!existing) {
            await Client.updateMany(
                { gymId, fingerprintStatus: 'enrolled' },
                { $set: { fingerprintStatus: 'needs_reenroll' } }
            );
        }

        return reply.send({ success: true, data: device });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const setAttendanceEnabled = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { enabled } = request.body as { enabled?: boolean };
        if (typeof enabled !== 'boolean') {
            return reply.status(400).send({ success: false, error: 'enabled must be true or false' });
        }

        const gym = await Gym.findByIdAndUpdate(
            gymId,
            { $set: { attendanceEnabled: enabled } },
            { new: true }
        );
        if (!gym) {
            return reply.status(404).send({ success: false, error: 'Gym not found' });
        }

        return reply.send({ success: true, data: { enabled: !!gym.attendanceEnabled } });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getDeviceStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const enabled = await isAttendanceEnabled(gymId);
        const device = await getActiveDeviceForGym(gymId);
        if (!device) {
            return reply.send({
                success: true,
                data: {
                    enabled,
                    paired: false,
                    admsUrlHint: 'Point device ADMS/Cloud URL to your API host /iclock',
                },
            });
        }

        const lastHb = device.lastHeartbeatAt ? new Date(device.lastHeartbeatAt).getTime() : 0;
        const online = lastHb > Date.now() - 90_000;

        return reply.send({
            success: true,
            data: {
                enabled,
                paired: true,
                online,
                serialNumber: device.serialNumber,
                name: device.name,
                lastHeartbeatAt: device.lastHeartbeatAt,
                pendingCommands: (device.pendingCommands || []).filter((c: any) => c.status === 'pending').length,
                nextPin: device.nextPin,
                admsUrlHint: 'Point device ADMS/Cloud URL to your API host /iclock',
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const unpairDevice = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        await BiometricDevice.updateMany({ gymId }, { $set: { isActive: false } });
        return reply.send({ success: true, data: { unpaired: true } });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const startEnroll = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { clientId } = request.body as { clientId: string };

        if (!(await isAttendanceEnabled(gymId))) {
            return reply.status(400).send({ success: false, error: 'Attendance is turned off. Enable it under Entrance Device.' });
        }

        const client = await Client.findOne({ _id: clientId, gymId });
        if (!client) {
            return reply.status(404).send({ success: false, error: 'Client not found' });
        }

        const device = await getActiveDeviceForGym(gymId);
        if (!device) {
            return reply.status(400).send({ success: false, error: 'No entrance device paired. Pair a device in Settings first.' });
        }

        const pin = await ensureClientPin(client);
        client.fingerprintStatus = 'pending';
        await client.save();

        await enqueueCommand(gymId, 'CREATE_USER', pin, client.name);
        if (isDoorAllowed(client.membershipStatus)) {
            await enqueueCommand(gymId, 'ENABLE_USER', pin, client.name);
        } else {
            await enqueueCommand(gymId, 'DISABLE_USER', pin, client.name);
        }
        await enqueueCommand(gymId, 'ENROLL_FP', pin, client.name);

        return reply.send({
            success: true,
            data: {
                biometricPin: pin,
                fingerprintStatus: client.fingerprintStatus,
                message: 'Device will prompt for fingerprint on next poll. Member only needs to place finger.',
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const confirmEnrolled = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { clientId } = request.body as { clientId: string };

        const client = await Client.findOne({ _id: clientId, gymId });
        if (!client) {
            return reply.status(404).send({ success: false, error: 'Client not found' });
        }

        const device = await getActiveDeviceForGym(gymId);
        client.fingerprintStatus = 'enrolled';
        client.fingerprintEnrolledAt = new Date();
        if (device) client.fingerprintDeviceSn = device.serialNumber;
        await client.save();

        return reply.send({ success: true, data: client });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const markNeedsReenroll = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { clientId } = request.body as { clientId: string };
        const client = await Client.findOne({ _id: clientId, gymId });
        if (!client) {
            return reply.status(404).send({ success: false, error: 'Client not found' });
        }
        client.fingerprintStatus = 'needs_reenroll';
        await client.save();
        return reply.send({ success: true, data: client });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const listAttendance = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { date, status, limit = '50', page = '1' } = request.query as any;

        const filter: any = { gymId };
        if (status) filter.status = status;

        if (date) {
            const dayStart = dayjs.tz(date, 'Asia/Kolkata').startOf('day').toDate();
            const dayEnd = dayjs.tz(date, 'Asia/Kolkata').endOf('day').toDate();
            filter.punchedAt = { $gte: dayStart, $lte: dayEnd };
        } else {
            const dayStart = getISTMidnightToday();
            filter.punchedAt = { $gte: dayStart };
        }

        const lim = Math.min(Number(limit) || 50, 200);
        const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;

        const [rows, total] = await Promise.all([
            Attendance.find(filter)
                .populate('clientId', 'name phoneNumber profilePicture membershipStatus biometricPin fingerprintStatus')
                .sort({ punchedAt: -1 })
                .skip(skip)
                .limit(lim)
                .lean(),
            Attendance.countDocuments(filter),
        ]);

        return reply.send({ success: true, data: { rows, total, page: Number(page) || 1 } });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const memberMonthHeatmap = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const { clientId, month } = request.query as { clientId: string; month?: string };
        // month = YYYY-MM

        const client = await Client.findOne({ _id: clientId, gymId }).select('_id biometricPin fingerprintStatus');
        if (!client) {
            return reply.status(404).send({ success: false, error: 'Client not found' });
        }

        const base = month
            ? dayjs.tz(`${month}-01`, 'Asia/Kolkata')
            : getNowIST().startOf('month');
        const start = base.startOf('month').toDate();
        const end = base.endOf('month').toDate();

        const rows = await Attendance.find({
            gymId,
            clientId,
            status: { $in: ['granted', 'manual'] },
            punchedAt: { $gte: start, $lte: end },
        }).select('punchedAt').lean();

        const days: Record<string, number> = {};
        for (const row of rows) {
            const key = dayjs(row.punchedAt).tz('Asia/Kolkata').format('YYYY-MM-DD');
            days[key] = (days[key] || 0) + 1;
        }

        return reply.send({
            success: true,
            data: {
                month: base.format('YYYY-MM'),
                days,
                visitDays: Object.keys(days).length,
                totalPunches: rows.length,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

/**
 * GET /api/biometric/live — lightweight, never cached.
 * Home dashboard polls this so door punches show up immediately,
 * independent of the (cached) payment/membership summary.
 */
export const attendanceLive = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const todayStart = getISTMidnightToday();
        const todayEnd = dayjs(todayStart).tz('Asia/Kolkata').endOf('day').toDate();
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        const [todayRows, busyRows, deniedToday] = await Promise.all([
            Attendance.find({
                gymId,
                status: { $in: ['granted', 'manual'] },
                punchedAt: { $gte: todayStart, $lte: todayEnd },
            }).select('clientId biometricPin').lean(),
            Attendance.find({
                gymId,
                status: { $in: ['granted', 'manual'] },
                punchedAt: { $gte: twoHoursAgo },
            }).select('clientId biometricPin').lean(),
            Attendance.countDocuments({
                gymId,
                status: 'denied',
                punchedAt: { $gte: todayStart, $lte: todayEnd },
            }),
        ]);

        const uniq = (rows: any[]) => new Set(rows.map((r) => String(r.clientId || r.biometricPin))).size;

        return reply.send({
            success: true,
            data: {
                checkInsToday: uniq(todayRows),
                punchesToday: todayRows.length,
                busyNow: uniq(busyRows),
                deniedToday,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const attendanceTrends = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const gymId = (request.user as any).gymId;
        const todayStart = getISTMidnightToday();
        const todayEnd = dayjs(todayStart).tz('Asia/Kolkata').endOf('day').toDate();
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const sevenDaysAgo = addUtcDays(todayStart, -6);

        const [todayRows, busyRows, weekRows, deniedToday] = await Promise.all([
            Attendance.find({
                gymId,
                status: { $in: ['granted', 'manual'] },
                punchedAt: { $gte: todayStart, $lte: todayEnd },
            }).select('clientId punchedAt biometricPin').lean(),
            Attendance.find({
                gymId,
                status: { $in: ['granted', 'manual'] },
                punchedAt: { $gte: twoHoursAgo },
            }).select('clientId biometricPin').lean(),
            Attendance.find({
                gymId,
                status: { $in: ['granted', 'manual'] },
                punchedAt: { $gte: sevenDaysAgo },
            }).select('punchedAt').lean(),
            Attendance.countDocuments({
                gymId,
                status: 'denied',
                punchedAt: { $gte: todayStart, $lte: todayEnd },
            }),
        ]);

        const uniqueToday = new Set(todayRows.map((r) => String(r.clientId || r.biometricPin))).size;
        const busyNow = new Set(busyRows.map((r) => String(r.clientId || r.biometricPin))).size;

        const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
        for (const row of todayRows) {
            const h = dayjs(row.punchedAt).tz('Asia/Kolkata').hour();
            hourly[h].count += 1;
        }

        const byDay: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
            const d = dayjs(sevenDaysAgo).tz('Asia/Kolkata').add(i, 'day').format('YYYY-MM-DD');
            byDay[d] = 0;
        }
        for (const row of weekRows) {
            const d = dayjs(row.punchedAt).tz('Asia/Kolkata').format('YYYY-MM-DD');
            if (byDay[d] !== undefined) byDay[d] += 1;
        }

        // Peak hours over last 7 days
        const peakHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
        for (const row of weekRows) {
            const h = dayjs(row.punchedAt).tz('Asia/Kolkata').hour();
            peakHours[h].count += 1;
        }

        return reply.send({
            success: true,
            data: {
                checkInsToday: uniqueToday,
                punchesToday: todayRows.length,
                busyNow,
                deniedToday,
                hourlyToday: hourly,
                last7Days: Object.entries(byDay).map(([date, count]) => ({ date, count })),
                peakHours,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

/** Dev helper: simulator reports enroll complete */
export const simulatorEnrolled = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { SN, pin } = request.body as { SN: string; pin: string };
        const device = await BiometricDevice.findOne({
            serialNumber: String(SN).toUpperCase().trim(),
            isActive: true,
        });
        if (!device) {
            return reply.status(404).send({ success: false, error: 'Device not found' });
        }

        const client = await Client.findOne({ gymId: device.gymId, biometricPin: String(pin) });
        if (!client) {
            return reply.status(404).send({ success: false, error: 'Client not found for PIN' });
        }

        client.fingerprintStatus = 'enrolled';
        client.fingerprintEnrolledAt = new Date();
        client.fingerprintDeviceSn = device.serialNumber;
        await client.save();

        await syncClientDoorAccess(client);

        return reply.send({ success: true, data: { pin, clientId: client._id, status: 'enrolled' } });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
