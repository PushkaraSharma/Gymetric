import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
    acceptLog,
    ackCommands,
    commandStatus,
    getDevice,
    heartbeat,
    listCheckins,
    memberFinger,
    memberVisits,
    openDoor,
    pairDevice,
    pullCommands,
    readerLogBody,
    setEnabled,
    staffFinger,
    unpairDevice,
} from "../services/biometric.js";

export async function biometricRoutes(fastify: FastifyInstance) {
    fastify.addHook("onRequest", fastify.authenticate);
    fastify.get("/device", getDevice);
    fastify.post("/enabled", setEnabled);
    fastify.post("/device/pair", pairDevice);
    fastify.post("/device/unpair", unpairDevice);
    fastify.post("/device/open", openDoor);
    fastify.get("/device/commands/:cmdId", commandStatus);
    fastify.get("/checkins", listCheckins);
    fastify.get("/members/:id", memberFinger.view);
    fastify.get("/members/:id/visits", memberVisits);
    fastify.post("/members/:id/fingerprint", memberFinger.start);
    fastify.post("/members/:id/fingerprint/confirm", memberFinger.confirm);
    fastify.post("/members/:id/fingerprint/cancel", memberFinger.cancel);
    fastify.get("/staff/:id", staffFinger.view);
    fastify.post("/staff/:id/fingerprint", staffFinger.start);
    fastify.post("/staff/:id/fingerprint/confirm", staffFinger.confirm);
    fastify.post("/staff/:id/fingerprint/cancel", staffFinger.cancel);
}

// eSSL readers post plain text and are not logged in. Both /iclock/* and /iclock/*.aspx are used.
export async function iclockRoutes(fastify: FastifyInstance) {
    fastify.removeContentTypeParser("application/json");
    fastify.addContentTypeParser("*", { parseAs: "string" }, (_request, body, done) => done(null, body));

    const cdataGet = async (request: FastifyRequest, reply: FastifyReply) =>
        reply.type("text/plain").send(await heartbeat(request.query as { SN?: string; options?: string }));
    const getrequest = async (request: FastifyRequest, reply: FastifyReply) => {
        const body = await pullCommands((request.query as { SN?: string }).SN);
        if (body !== "OK") request.log.info({ body: readerLogBody(body) }, "Reader took commands");
        return reply.type("text/plain").send(body);
    };
    const cdataPost = async (request: FastifyRequest, reply: FastifyReply) => {
        const raw = String(request.body ?? "");
        const query = request.query as { SN?: string; table?: string };
        if (query.table && query.table !== "ATTLOG") request.log.info({ table: query.table, raw: readerLogBody(raw) }, "Reader data");
        await acceptLog(query, raw);
        return reply.type("text/plain").send("OK");
    };
    const devicecmd = async (request: FastifyRequest, reply: FastifyReply) => {
        const raw = String(request.body ?? "");
        await ackCommands((request.query as { SN?: string }).SN, raw);
        return reply.type("text/plain").send("OK");
    };
    for (const suffix of ["", ".aspx"] as const) {
        fastify.get(`/cdata${suffix}`, cdataGet);
        fastify.get(`/getrequest${suffix}`, getrequest);
        fastify.post(`/cdata${suffix}`, cdataPost);
        fastify.post(`/devicecmd${suffix}`, devicecmd);
    }
}
