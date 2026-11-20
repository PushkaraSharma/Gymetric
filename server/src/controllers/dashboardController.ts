import { FastifyRequest, FastifyReply } from 'fastify';
import dayjs from 'dayjs';
import { and, count, countDistinct, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client.js';
import { activities, memberships, membershipMembers, members, payments } from '../db/schema.js';
import { compact, serializeActivity } from '../db/serializers.js';
import {
    addUtcDays,
    endOfIstDayExclusive,
    lastMtdEndExclusive,
    parseToISTMidnight,
    startOfMonthMonthsAgo,
    startOfPreviousMonth,
    utcStartOfDay,
    utcStartOfMonth,
} from "../utils/timeUtils.js";
import { cache, getCacheKey } from "../utils/cache.js";

const IST = 'Asia/Kolkata';
// Inlined rather than bound: GROUP BY only matches the SELECT expression when both use the same literal.
const IST_SQL = sql.raw(`'${IST}'`);

const sumOf = (column: SQL | typeof payments.amount | typeof members.balance) =>
    sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);

const calculateTrend = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    return parseFloat(((current - previous) / previous * 100).toFixed(1));
};

const getSixMonthsAgoStart = (today: Date) => startOfMonthMonthsAgo(5, today);

const resolveInclusiveRange = (fromStr?: string, toStr?: string, fallbackFrom?: Date, fallbackToExclusive?: Date) => {
    const from = fromStr ? parseToISTMidnight(fromStr) : fallbackFrom;
    const toExclusive = toStr ? endOfIstDayExclusive(toStr) : fallbackToExclusive;
    if (!from || !toExclusive || Number.isNaN(from.getTime()) || Number.isNaN(toExclusive.getTime())) {
        return { error: 'Invalid date range' as const };
    }
    if (from >= toExclusive) {
        return { error: 'End date must be on or after start date' as const };
    }
    const maxExclusive = dayjs(from).tz(IST).add(6, 'month').add(1, 'day').startOf('day');
    if (dayjs(toExclusive).isAfter(maxExclusive)) {
        return { error: 'Range cannot exceed 6 months' as const };
    }
    return { from, toExclusive };
};

const countMembers = async (gymId: string, extra?: SQL) => {
    const [{ value }] = await db.select({ value: count() }).from(members)
        .where(extra ? and(eq(members.branchId, gymId), extra) : eq(members.branchId, gymId));
    return value;
};

const paymentTotal = async (gymId: string, from: Date, toExclusive?: Date) => {
    const [{ total }] = await db.select({ total: sumOf(payments.amount) }).from(payments)
        .where(and(eq(payments.branchId, gymId), gte(payments.paidAt, from), toExclusive ? lt(payments.paidAt, toExclusive) : undefined));
    return total;
};

// Members whose current (active) plan ends inside [from, to].
const activeEndingWhere = (gymId: string, from: Date, to: SQL) => and(
    eq(members.branchId, gymId),
    eq(members.membershipStatus, 'active'),
    gte(memberships.endDate, from),
    to,
);

// Distinct members (payer + everyone on the plan) of memberships ending in [from, toExclusive).
const membersOfMembershipsEnding = async (gymId: string, from: Date, toExclusive: Date) => {
    const ending = and(eq(memberships.branchId, gymId), gte(memberships.endDate, from), lt(memberships.endDate, toExclusive));
    const [payers, onPlan] = await Promise.all([
        db.select({ id: memberships.primaryMemberId }).from(memberships).where(ending),
        db.select({ id: membershipMembers.memberId }).from(membershipMembers)
            .innerJoin(memberships, eq(memberships.id, membershipMembers.membershipId))
            .where(ending),
    ]);
    return [...new Set([...payers, ...onPlan].map((r) => r.id))];
};

const getRevenueTrend = async (gymId: string, today: Date) => {
    const sixMonthsAgo = getSixMonthsAgoStart(today);
    const year = sql<number>`extract(year from ${payments.paidAt} at time zone ${IST_SQL})`.mapWith(Number);
    const month = sql<number>`extract(month from ${payments.paidAt} at time zone ${IST_SQL})`.mapWith(Number);

    const rows = await db.select({ year, month, total: sumOf(payments.amount) })
        .from(payments)
        .where(and(eq(payments.branchId, gymId), gte(payments.paidAt, sixMonthsAgo)))
        .groupBy(year, month)
        .orderBy(year, month);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return rows.map(item => ({
        label: months[item.month - 1],
        amount: item.total
    }));
};

export const getDashboardSummary = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const cacheKey = getCacheKey('dashboard_summary', gymId);

        const cachedSummary = cache.get(cacheKey);
        if (cachedSummary) {
            return reply.send({ success: true, data: cachedSummary });
        }

        const today = utcStartOfDay();
        const startOfCurrent = utcStartOfMonth(today);
        const startOfLast = startOfPreviousMonth(today);
        const lastMtdExclusive = lastMtdEndExclusive(today);
        const thirtyDaysAgo = addUtcDays(today, -30);
        const fourteenDaysAgo = addUtcDays(today, -14);
        const sevenDaysFromNow = addUtcDays(today, 7);

        const tomorrow = addUtcDays(today, 1);
        const sixMonthsAgo = getSixMonthsAgoStart(today);

        const expiringSoonWhere = and(
            activeEndingWhere(gymId, today, lte(memberships.endDate, sevenDaysFromNow)),
            isNull(members.upcomingMembershipId),
        );
        const todayPayments = and(eq(payments.branchId, gymId), gte(payments.paidAt, today), lt(payments.paidAt, tomorrow));

        const [
            totalClients,
            activeCount,
            expiredCount,
            activeCount30DaysAgo,
            [{ value: expiringSoon }],
            expiringMembersList,
            revCurrentVal,
            revLastVal,
            [{ value: payingCount }],
            ended30Ids,
            ended14Ids,
            newlyJoinedCurrent,
            newlyJoinedLastMTD,
            recentActivities,
            revenueTrend,
            todayCollection,
            [totalOutstanding],
            clientsWithBalance,
            [{ value: expiringToday }],
            paymentMethodsToday,
            topBalanceClients,
            topSellingPlansRaw,
        ] = await Promise.all([
            countMembers(gymId),
            countMembers(gymId, eq(members.membershipStatus, 'active')),
            countMembers(gymId, inArray(members.membershipStatus, ['expired', 'trial_expired'])),
            countMembers(gymId, and(eq(members.membershipStatus, 'active'), lte(members.createdAt, thirtyDaysAgo))),
            db.select({ value: count() }).from(members)
                .innerJoin(memberships, eq(memberships.id, members.activeMembershipId))
                .where(expiringSoonWhere),
            db.select({ _id: members.id, name: members.name, endDate: memberships.endDate }).from(members)
                .innerJoin(memberships, eq(memberships.id, members.activeMembershipId))
                .where(expiringSoonWhere)
                .orderBy(memberships.endDate)
                .limit(5),
            paymentTotal(gymId, startOfCurrent),
            paymentTotal(gymId, startOfLast, lastMtdExclusive),
            db.select({ value: countDistinct(payments.memberId) }).from(payments)
                .where(and(eq(payments.branchId, gymId), gte(payments.paidAt, startOfCurrent))),
            membersOfMembershipsEnding(gymId, thirtyDaysAgo, tomorrow),
            membersOfMembershipsEnding(gymId, fourteenDaysAgo, tomorrow),
            countMembers(gymId, gte(members.createdAt, startOfCurrent)),
            countMembers(gymId, and(gte(members.createdAt, startOfLast), lt(members.createdAt, lastMtdExclusive))),
            db.select().from(activities).where(eq(activities.branchId, gymId)).orderBy(desc(activities.date)).limit(10),
            getRevenueTrend(gymId, today),
            paymentTotal(gymId, today, tomorrow),
            db.select({ total: sumOf(members.balance), count: count() }).from(members)
                .where(and(eq(members.branchId, gymId), gt(members.balance, 0))),
            countMembers(gymId, gt(members.balance, 0)),
            db.select({ value: count() }).from(members)
                .innerJoin(memberships, eq(memberships.id, members.activeMembershipId))
                .where(activeEndingWhere(gymId, today, lt(memberships.endDate, tomorrow))),
            db.select({ method: payments.method, total: sumOf(payments.amount), count: count() }).from(payments)
                .where(todayPayments)
                .groupBy(payments.method),
            db.select({ _id: members.id, name: members.name, balance: members.balance }).from(members)
                .where(and(eq(members.branchId, gymId), gt(members.balance, 0)))
                .orderBy(desc(members.balance))
                .limit(3),
            db.select({
                planId: memberships.packageId,
                planName: sql<string | null>`(array_agg(${memberships.planName} order by ${memberships.createdAt}))[1]`,
                count: count(),
                revenue: sql<number>`coalesce(sum(${memberships.totalAmount}), 0)`.mapWith(Number),
            }).from(memberships)
                .where(and(eq(memberships.branchId, gymId), gte(memberships.createdAt, sixMonthsAgo)))
                .groupBy(memberships.packageId)
                .orderBy(desc(count()), desc(sql`coalesce(sum(${memberships.totalAmount}), 0)`)),
        ]);

        const [renewedCount, recentlyExpiredCount] = await Promise.all([
            ended30Ids.length
                ? countMembers(gymId, and(
                    inArray(members.id, ended30Ids),
                    or(
                        inArray(members.membershipStatus, ['active', 'future', 'trial', 'paused']),
                        isNotNull(members.upcomingMembershipId),
                    ),
                ))
                : 0,
            ended14Ids.length
                ? countMembers(gymId, and(inArray(members.id, ended14Ids), inArray(members.membershipStatus, ['expired', 'trial_expired'])))
                : 0,
        ]);
        const retentionRate = ended30Ids.length > 0
            ? parseFloat(((renewedCount / ended30Ids.length) * 100).toFixed(1))
            : 0;
        const avgRevenuePerMember = payingCount > 0
            ? parseFloat((revCurrentVal / payingCount).toFixed(0))
            : 0;

        const totalPlanSalesLast6Months = topSellingPlansRaw.reduce((sum, p) => sum + p.count, 0);
        const totalPlanRevenueLast6Months = topSellingPlansRaw.reduce((sum, p) => sum + (p.revenue || 0), 0);
        const topSellingPlansLast6Months = topSellingPlansRaw.map((p) => {
            const revenue = p.revenue || 0;
            return {
                planId: String(p.planId),
                planName: p.planName || 'Unknown plan',
                count: p.count,
                sharePercent: totalPlanSalesLast6Months > 0
                    ? Math.round((p.count / totalPlanSalesLast6Months) * 100)
                    : 0,
                revenue,
                avgSaleAmount: p.count > 0 ? Math.round(revenue / p.count) : 0,
            };
        });

        const expiringMembers = expiringMembersList.map((member) => {
            const endDate = new Date(member.endDate);
            const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return {
                _id: member._id,
                name: member.name,
                daysLeft
            };
        });

        const responseData = {
            totalClients,
            activeMembers: {
                value: activeCount,
                trend: calculateTrend(activeCount, activeCount30DaysAgo),
                comparisonText: "vs 30 days ago"
            },
            expiredMembers: expiredCount,
            recentlyExpiredMembers: recentlyExpiredCount,
            expiringIn7Days: expiringSoon,
            expiringMembersList: expiringMembers,
            retentionRate,
            avgRevenuePerMember,
            revenueTrend,
            revenueThisMonth: {
                value: revCurrentVal,
                trend: calculateTrend(revCurrentVal, revLastVal),
                comparisonText: "vs same days last month"
            },
            newlyJoinedThisMonth: {
                value: newlyJoinedCurrent,
                trend: calculateTrend(newlyJoinedCurrent, newlyJoinedLastMTD),
                comparisonText: "vs same days last month"
            },
            activities: recentActivities.map(serializeActivity),
            todayCollection,
            totalOutstanding: totalOutstanding?.total || 0,
            clientsWithBalance: clientsWithBalance || totalOutstanding?.count || 0,
            expiringToday,
            paymentMethodsToday: paymentMethodsToday.map((p) => ({
                method: p.method,
                amount: p.total,
                count: p.count,
            })),
            topBalanceClients,
            topSellingPlansLast6Months,
            totalPlanSalesLast6Months,
            totalPlanRevenueLast6Months,
        };

        cache.set(cacheKey, responseData);

        return reply.send({
            success: true,
            data: responseData
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getRevenueStats = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const { from: fromStr, to: toStr, page: pageStr, limit: limitStr } = (request.query as { from?: string; to?: string; page?: string; limit?: string }) || {};
        const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(limitStr || '50', 10) || 50));
        const today = utcStartOfDay();
        const range = resolveInclusiveRange(
            fromStr,
            toStr,
            utcStartOfMonth(today),
            addUtcDays(today, 1),
        );
        if ('error' in range) {
            return reply.status(400).send({ success: false, error: range.error });
        }
        const { from, toExclusive } = range;
        const inRange = and(eq(payments.branchId, gymId), gte(payments.paidAt, from), lt(payments.paidAt, toExclusive));

        const transactionsQuery = db.select({
            _id: members.id,
            clientId: members.id,
            clientName: members.name,
            amount: payments.amount,
            date: payments.paidAt,
            method: payments.method,
            remarks: payments.remarks,
            type: payments.type,
        }).from(payments)
            .innerJoin(members, eq(members.id, payments.memberId))
            .where(inRange)
            .orderBy(desc(payments.paidAt), desc(payments.createdAt))
            .offset((page - 1) * limit)
            .limit(limit + 1)
            .then((rows) => rows.map((row) => compact(row)));

        if (page > 1) {
            const raw = await transactionsQuery;
            const hasMore = raw.length > limit;
            return reply.send({
                success: true,
                data: { transactions: hasMore ? raw.slice(0, limit) : raw, page, hasMore },
            });
        }

        const day = sql<string>`to_char(${payments.paidAt} at time zone ${IST_SQL}, 'YYYY-MM-DD')`;
        const [dailyRaw, paymentMethodsRaw, transactionsRaw, [{ total }]] = await Promise.all([
            db.select({ day, amount: sumOf(payments.amount) }).from(payments).where(inRange).groupBy(day).orderBy(day),
            db.select({ method: payments.method, total: sumOf(payments.amount), count: count() }).from(payments)
                .where(inRange)
                .groupBy(payments.method),
            transactionsQuery,
            db.select({ total: sumOf(payments.amount) }).from(payments).where(inRange),
        ]);

        const amountByDate = new Map(dailyRaw.map((row) => [row.day, row.amount]));
        const daily: { date: string; amount: number }[] = [];
        for (let d = dayjs(from).tz(IST); d.isBefore(dayjs(toExclusive)); d = d.add(1, 'day')) {
            const key = d.format('YYYY-MM-DD');
            daily.push({ date: key, amount: amountByDate.get(key) || 0 });
        }

        const hasMore = transactionsRaw.length > limit;
        return reply.send({
            success: true,
            data: {
                total,
                daily,
                paymentMethods: paymentMethodsRaw.map((p) => ({
                    method: p.method,
                    amount: p.total,
                    count: p.count,
                })),
                transactions: hasMore ? transactionsRaw.slice(0, limit) : transactionsRaw,
                page,
                hasMore,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};

export const getActivities = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const { gymId } = request.user as any;
        const query = (request.query as { from?: string; to?: string; page?: string; limit?: string }) || {};
        const today = utcStartOfDay();
        const range = resolveInclusiveRange(
            query.from,
            query.to,
            today,
            addUtcDays(today, 1),
        );
        if ('error' in range) {
            return reply.status(400).send({ success: false, error: range.error });
        }
        const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10) || 20));
        const items = await db.select().from(activities)
            .where(and(eq(activities.branchId, gymId), gte(activities.date, range.from), lt(activities.date, range.toExclusive)))
            .orderBy(desc(activities.date))
            .offset((page - 1) * limit)
            .limit(limit + 1);
        const hasMore = items.length > limit;
        return reply.send({
            success: true,
            data: {
                items: (hasMore ? items.slice(0, limit) : items).map(serializeActivity),
                page,
                hasMore,
            },
        });
    } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ success: false, error: error.message });
    }
};
