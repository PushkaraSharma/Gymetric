// Sets a gym's GymKarta plan. Plans are sold by the team ("Contact us"), so this is how one is switched on.
//
//   npm run plan -- <owner phone | gym id>                 show the current plan
//   npm run plan -- <owner phone | gym id> pro             Pro with no end date
//   npm run plan -- <owner phone | gym id> pro --days 14   Pro trial for 14 days, then Free
//   npm run plan -- <owner phone | gym id> free            back to Free
//
// Uses DATABASE_URL (production when set). A running server picks the change up within 30 seconds.
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { closeDatabase, openDatabase } from '../db/client.js';
import { branches, users } from '../db/schema.js';
import { validId } from '../db/queries.js';
import { gymPlanOf } from '../services/plan.js';
import { isPlan, PLANS } from '../utils/plans.js';
import { normalizePhone } from '../utils/roles.js';

const [target, planArg, ...rest] = process.argv.slice(2);
const daysFlag = rest.indexOf('--days');
const days = daysFlag >= 0 ? Number(rest[daysFlag + 1]) : undefined;

async function main() {
    if (!target) throw new Error('Usage: npm run plan -- <owner phone | gym id> [free|pro|max] [--days N]');
    if (planArg !== undefined && !isPlan(planArg)) throw new Error(`Plan must be one of: ${PLANS.join(', ')}`);
    if (days !== undefined && !(Number.isInteger(days) && days > 0)) throw new Error('--days needs a whole number above 0');

    const db = await openDatabase();
    const gymId = validId(target)
        ?? (await db.select({ id: users.branchId }).from(users).where(eq(users.phoneNumber, normalizePhone(target))).limit(1))[0]?.id;
    const [gym] = gymId ? await db.select().from(branches).where(eq(branches.id, gymId)).limit(1) : [];
    if (!gym) throw new Error(`No gym found for ${target}`);

    if (planArg) {
        const planExpiresAt = days ? new Date(Date.now() + days * 86_400_000) : null;
        await db.update(branches).set({ plan: planArg, planExpiresAt, updatedAt: new Date() }).where(eq(branches.id, gym.id));
        Object.assign(gym, { plan: planArg, planExpiresAt });
    }
    const current = gymPlanOf(gym);
    const until = gym.planExpiresAt ? ` until ${gym.planExpiresAt.toISOString()}` : '';
    console.log(`${gym.name} (${gym.id}): stored ${gym.plan}${until}; in effect ${current.plan} [${current.features.join(', ') || 'no paid features'}]`);
}

main()
    .catch((error) => {
        console.error(error.message ?? error);
        process.exitCode = 1;
    })
    .finally(() => closeDatabase());
