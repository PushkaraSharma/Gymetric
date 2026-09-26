import { FastifyRequest, FastifyReply } from 'fastify';
import BiometricDevice from '../models/BiometricDevice.js';
import {
    formatPendingCommands,
    markCommandsAcked,
    parseAttLogLine,
    recordPunch,
} from '../services/biometricService.js';
import Client from '../models/Client.js';

const getDeviceBySn = async (sn?: string) => {
    if (!sn) return null;
    return BiometricDevice.findOne({ serialNumber: String(sn).toUpperCase().trim(), isActive: true });
};

/** GET /iclock/cdata — heartbeat / first connect */
export const iclockCdataGet = async (request: FastifyRequest, reply: FastifyReply) => {
    const { SN, options } = request.query as any;
    const device = await getDeviceBySn(SN);
    if (!device) {
        return reply.status(200).type('text/plain').send('OK');
    }

    device.lastHeartbeatAt = new Date();
    await device.save();

    if (options === 'all') {
        // Device init handshake
        return reply.status(200).type('text/plain').send(
            `GET OPTION FROM: ${device.serialNumber}\nATTLOGStamp=0\nOPERLOGStamp=0\nATTPHOTOStamp=0\nErrorDelay=30\nDelay=10\nTransTimes=00:00;14:00\nTransInterval=1\nTransFlag=1111000000\nTimeZone=5.5\nRealtime=1\nEncrypt=0\n`
        );
    }

    return reply.status(200).type('text/plain').send('OK');
};

/** GET /iclock/getrequest — pull pending commands */
export const iclockGetRequest = async (request: FastifyRequest, reply: FastifyReply) => {
    const { SN } = request.query as any;
    const device = await getDeviceBySn(SN);
    if (!device) {
        return reply.status(200).type('text/plain').send('OK');
    }

    device.lastHeartbeatAt = new Date();
    const body = formatPendingCommands(device);
    await device.save();
    return reply.status(200).type('text/plain').send(body);
};

/** POST /iclock/cdata — ATTLOG / OPERLOG / etc */
export const iclockCdataPost = async (request: FastifyRequest, reply: FastifyReply) => {
    const { SN, table } = request.query as any;
    const device = await getDeviceBySn(SN);
    if (!device) {
        return reply.status(200).type('text/plain').send('OK');
    }

    device.lastHeartbeatAt = new Date();

    const rawBody = typeof request.body === 'string'
        ? request.body
        : (request.body as any)?.toString?.() || '';

    if (table === 'ATTLOG') {
        const lines = rawBody.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
        for (const line of lines) {
            const parsed = parseAttLogLine(line);
            if (!parsed) continue;
            await recordPunch({
                gymId: String(device.gymId),
                pin: parsed.pin,
                punchedAt: parsed.punchedAt,
                deviceTime: parsed.deviceTime,
                deviceSn: device.serialNumber,
                source: device.serialNumber.startsWith('SIM-') ? 'simulator' : 'device',
            });
        }
        await device.save();
        return reply.status(200).type('text/plain').send('OK');
    }

    if (table === 'OPERLOG') {
        // Look for enroll success hints: e.g. "FP PIN=1001" or "USER PIN=1001"
        const enrollMatch = rawBody.match(/PIN[=:]?\s*(\d+)/i);
        if (enrollMatch) {
            const pin = enrollMatch[1];
            const client = await Client.findOne({ gymId: device.gymId, biometricPin: pin });
            if (client) {
                client.fingerprintStatus = 'enrolled';
                client.fingerprintEnrolledAt = new Date();
                client.fingerprintDeviceSn = device.serialNumber;
                await client.save();
            }
        }
        await device.save();
        return reply.status(200).type('text/plain').send('OK');
    }

    // Command ACK: ID=1&Return=0&CMD=...
    if (table === 'ATTPHOTO' || !table) {
        await device.save();
        return reply.status(200).type('text/plain').send('OK');
    }

    await device.save();
    return reply.status(200).type('text/plain').send('OK');
};

/** POST /iclock/devicecmd — command execution result */
export const iclockDeviceCmd = async (request: FastifyRequest, reply: FastifyReply) => {
    const { SN } = request.query as any;
    const device = await getDeviceBySn(SN);
    if (!device) {
        return reply.status(200).type('text/plain').send('OK');
    }

    const rawBody = typeof request.body === 'string'
        ? request.body
        : (request.body as any)?.toString?.() || '';

    const ids: number[] = [];
    const matches = rawBody.matchAll(/ID=(\d+)/gi);
    for (const m of matches) ids.push(Number(m[1]));
    if (ids.length) await markCommandsAcked(device, ids);

    device.lastHeartbeatAt = new Date();
    await device.save();
    return reply.status(200).type('text/plain').send('OK');
};
