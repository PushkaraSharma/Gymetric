import { FastifyInstance } from 'fastify';
import {
    pairDevice,
    getDeviceStatus,
    setAttendanceEnabled,
    unpairDevice,
    startEnroll,
    confirmEnrolled,
    markNeedsReenroll,
    listAttendance,
    memberMonthHeatmap,
    attendanceTrends,
    attendanceLive,
    simulatorEnrolled,
} from '../controllers/biometricController.js';
import {
    iclockCdataGet,
    iclockCdataPost,
    iclockGetRequest,
    iclockDeviceCmd,
} from '../controllers/iclockController.js';

/** Owner JWT routes under /api/biometric */
export async function biometricRoutes(fastify: FastifyInstance) {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.post('/device/pair', pairDevice);
    fastify.get('/device', getDeviceStatus);
    fastify.post('/enabled', setAttendanceEnabled);
    fastify.post('/device/unpair', unpairDevice);

    fastify.post('/enroll/start', startEnroll);
    fastify.post('/enroll/confirm', confirmEnrolled);
    fastify.post('/enroll/needs-reenroll', markNeedsReenroll);

    fastify.get('/attendance', listAttendance);
    fastify.get('/attendance/heatmap', memberMonthHeatmap);
    fastify.get('/trends', attendanceTrends);
    fastify.get('/live', attendanceLive);
}

/** Unauthenticated device protocol + sim helpers under /iclock and /api/biometric/dev */
export async function iclockRoutes(fastify: FastifyInstance) {
    // Accept raw text bodies for device posts (scoped to this plugin)
    fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (_req, body, done) => {
        done(null, body);
    });
    fastify.addContentTypeParser('application/octet-stream', { parseAs: 'string' }, (_req, body, done) => {
        done(null, body);
    });
    // Devices often send an unusual or missing Content-Type
    fastify.addContentTypeParser('*', { parseAs: 'string' }, (_req, body, done) => {
        done(null, body);
    });

    fastify.get('/cdata', iclockCdataGet);
    fastify.post('/cdata', iclockCdataPost);
    fastify.get('/getrequest', iclockGetRequest);
    fastify.post('/devicecmd', iclockDeviceCmd);
}

export async function biometricDevRoutes(fastify: FastifyInstance) {
    fastify.post('/dev/enrolled', simulatorEnrolled);
}
