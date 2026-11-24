import { requireFeature } from "../services/access.js";
import {
    addPunch,
    attendanceBoard,
    createStaff,
    getStaff,
    inviteStaff,
    listAttendance,
    listStaff,
    updateStaff,
    voidPunch,
} from "../controllers/staffController.js";

export async function staffRoutes(fastify: any) {
    fastify.addHook("onRequest", fastify.authenticate);
    fastify.addHook("preHandler", requireFeature("staff"));

    fastify.get("/", listStaff);
    fastify.post("/", createStaff);
    fastify.get("/attendance/today", attendanceBoard);
    fastify.post("/punches/:punchId/void", voidPunch);
    fastify.get("/:id", getStaff);
    fastify.patch("/:id", updateStaff);
    fastify.get("/:id/invite", inviteStaff);
    fastify.get("/:id/attendance", listAttendance);
    fastify.post("/:id/punches", addPunch);
}
