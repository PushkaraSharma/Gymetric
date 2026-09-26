import BiometricDevice from '../models/BiometricDevice.js';
import Client from '../models/Client.js';
import Attendance from '../models/Attendance.js';
import Gym from '../models/Gym.js';
import { getNowIST } from '../utils/timeUtils.js';

export const isAttendanceEnabled = async (gymId: string) => {
    const gym: any = await Gym.findById(gymId).select('attendanceEnabled').lean();
    return !!gym?.attendanceEnabled;
};

export const ALLOWED_DOOR_STATUSES = new Set(['active', 'trial']);

export const isDoorAllowed = (membershipStatus?: string | null) =>
    ALLOWED_DOOR_STATUSES.has(membershipStatus || '');

export const getActiveDeviceForGym = async (gymId: string) => {
    return BiometricDevice.findOne({ gymId, isActive: true }).sort({ updatedAt: -1 });
};

export const enqueueCommand = async (
    gymId: string,
    type: 'CREATE_USER' | 'ENABLE_USER' | 'DISABLE_USER' | 'DELETE_USER' | 'ENROLL_FP',
    pin: string,
    name?: string
) => {
    if (!(await isAttendanceEnabled(gymId))) return null;
    const device = await getActiveDeviceForGym(gymId);
    if (!device) return null;

    device.lastCommandId = (device.lastCommandId || 0) + 1;
    const cmdId = device.lastCommandId;
    let payload = '';

    switch (type) {
        case 'CREATE_USER':
        case 'ENABLE_USER':
            payload = `C:${cmdId}:DATA USER PIN=${pin}\tName=${name || pin}\tPri=0\tPasswd=\tCard=\tGrp=1\tTZ=0000000100000000`;
            break;
        case 'DISABLE_USER':
            payload = `C:${cmdId}:DATA USER PIN=${pin}\tName=${name || pin}\tPri=0\tPasswd=\tCard=\tGrp=0\tTZ=0000000100000000`;
            break;
        case 'DELETE_USER':
            payload = `C:${cmdId}:DATA DELETE USER PIN=${pin}`;
            break;
        case 'ENROLL_FP':
            payload = `C:${cmdId}:ENROLL_FP PIN=${pin}\tFID=0\tRETRY=3\tOVERWRITE=1`;
            break;
    }

    device.pendingCommands.push({
        cmdId,
        type,
        pin: String(pin),
        name,
        payload,
        status: 'pending',
        createdAt: new Date(),
    } as any);

    // Keep queue bounded
    if (device.pendingCommands.length > 200) {
        device.pendingCommands = device.pendingCommands.slice(-150) as any;
    }

    await device.save();
    return { device, cmdId };
};

export const allocateBiometricPin = async (gymId: string, session?: any) => {
    let device = await BiometricDevice.findOne({ gymId, isActive: true }).session(session || null);
    let nextPin = 1001;

    if (device) {
        nextPin = device.nextPin || 1001;
        device.nextPin = nextPin + 1;
        await device.save({ session: session || undefined });
    } else {
        // No device yet — still allocate from max existing pin in gym
        const maxClient: any = await Client.findOne({ gymId, biometricPin: { $ne: null } })
            .sort({ biometricPin: -1 })
            .select('biometricPin')
            .session(session || null)
            .lean();
        if (maxClient?.biometricPin) {
            nextPin = Number(maxClient.biometricPin) + 1;
        }
    }

    return String(nextPin);
};

export const ensureClientPin = async (client: any, session?: any) => {
    if (client.biometricPin) return String(client.biometricPin);
    const pin = await allocateBiometricPin(String(client.gymId), session);
    client.biometricPin = pin;
    if (!client.fingerprintStatus || client.fingerprintStatus === 'none') {
        client.fingerprintStatus = 'pending';
    }
    await client.save({ session: session || undefined });
    return pin;
};

export const syncClientDoorAccess = async (client: any, opts?: { enroll?: boolean }) => {
    if (!client?.biometricPin) return;
    if (!(await isAttendanceEnabled(String(client.gymId)))) return;
    const gymId = String(client.gymId);
    const pin = String(client.biometricPin);
    const name = client.name || pin;

    if (opts?.enroll) {
        await enqueueCommand(gymId, 'CREATE_USER', pin, name);
        await enqueueCommand(gymId, 'ENROLL_FP', pin, name);
        return;
    }

    if (isDoorAllowed(client.membershipStatus)) {
        await enqueueCommand(gymId, 'ENABLE_USER', pin, name);
    } else {
        await enqueueCommand(gymId, 'DISABLE_USER', pin, name);
    }
};

export const syncClientsDoorAccessByIds = async (clientIds: any[], gymId: string) => {
    if (!(await isAttendanceEnabled(gymId))) return;
    const clients = await Client.find({ _id: { $in: clientIds }, gymId }).select(
        'name biometricPin membershipStatus gymId fingerprintStatus'
    );
    for (const client of clients) {
        if (!client.biometricPin) continue;
        await syncClientDoorAccess(client);
    }
};

const DEBOUNCE_MS = 2 * 60 * 1000;

export const recordPunch = async (params: {
    gymId: string;
    pin: string;
    punchedAt: Date;
    deviceTime?: string;
    deviceSn?: string;
    source?: 'device' | 'simulator';
    forceStatus?: 'granted' | 'denied';
    denyReason?: string;
}) => {
    const { gymId, pin, punchedAt, deviceTime, deviceSn, source = 'device', forceStatus, denyReason } = params;

    const recent = await Attendance.findOne({
        gymId,
        biometricPin: pin,
        punchedAt: { $gte: new Date(punchedAt.getTime() - DEBOUNCE_MS) },
    }).sort({ punchedAt: -1 });

    if (recent) {
        return { skipped: true, reason: 'debounce', attendance: recent };
    }

    const client = await Client.findOne({ gymId, biometricPin: pin });

    let status: 'granted' | 'denied' = forceStatus || 'denied';
    let reason = denyReason;

    if (forceStatus) {
        status = forceStatus;
    } else if (!client) {
        status = 'denied';
        reason = 'unknown_pin';
    } else if (!isDoorAllowed(client.membershipStatus)) {
        status = 'denied';
        reason = `membership_${client.membershipStatus}`;
    } else {
        // Device already matched the finger — grant when membership allows it
        status = 'granted';
    }

    // Device already opened door based on local enable flag; we still log accurately
    if (!forceStatus && client && isDoorAllowed(client.membershipStatus)) {
        status = 'granted';
        reason = undefined;
    }

    const attendance = await Attendance.create({
        gymId,
        clientId: client?._id,
        biometricPin: pin,
        personType: client ? 'member' : 'unknown',
        status,
        denyReason: reason,
        source,
        deviceSn,
        punchedAt,
        deviceTime,
        recordedAt: new Date(),
    });

    if (client && status === 'granted' && client.fingerprintStatus !== 'enrolled') {
        client.fingerprintStatus = 'enrolled';
        client.fingerprintEnrolledAt = client.fingerprintEnrolledAt || new Date();
        if (deviceSn) client.fingerprintDeviceSn = deviceSn;
        await client.save();
    }

    return { skipped: false, attendance, client };
};

export const parseAttLogLine = (line: string) => {
    const parts = line.trim().split(/\t+/);
    if (parts.length < 2) return null;
    const pin = parts[0]?.trim();
    const timeStr = parts[1]?.trim();
    if (!pin || !timeStr) return null;

    // ZKTeco: YYYY-MM-DD HH:mm:ss (device local, usually IST for Indian gyms)
    const punchedAt = getNowIST(timeStr.replace(' ', 'T')).toDate();
    if (Number.isNaN(punchedAt.getTime())) return null;

    return { pin, deviceTime: timeStr, punchedAt };
};

export const formatPendingCommands = (device: any) => {
    const pending = (device.pendingCommands || []).filter((c: any) => c.status === 'pending');
    if (pending.length === 0) return 'OK';

    const lines = pending.map((c: any) => c.payload).filter(Boolean);
    for (const c of pending) {
        c.status = 'sent';
        c.sentAt = new Date();
    }
    return lines.join('\n');
};

export const markCommandsAcked = async (device: any, cmdIds: number[]) => {
    let changed = false;
    for (const cmd of device.pendingCommands || []) {
        if (cmdIds.includes(cmd.cmdId) && cmd.status !== 'acked') {
            cmd.status = 'acked';
            changed = true;
        }
    }
    if (changed) await device.save();
};
