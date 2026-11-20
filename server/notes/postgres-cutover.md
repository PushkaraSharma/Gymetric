# Postgres cutover runbook

Moves the live GymKarta API from MongoDB to Postgres. The app needs no update: routes, request bodies and
response JSON (including `_id`) are unchanged, and tokens issued by the Mongo build keep working.

Plan for a 1–2 hour window in the late evening (IST). With 3–4 gyms, a short freeze is fine.

## What you need

| Item | Notes |
|------|-------|
| Postgres database | Any host. Only `DATABASE_URL` is read. Migrations run on server start. |
| Production Mongo URI | `MONGO_PROD_URL` in `server/.env`. `MONGO_URI` there points at the dev database. |
| New build deployed next to the old one | Same env as today (`JWT_SECRET`, `CRON_SECRET`, Cloudinary, Firebase, WhatsApp, Sentry) plus `DATABASE_URL`. `MONGO_URI` is no longer needed by the server. Give it a temporary URL, e.g. `https://pg.api.gymkarta.indieroots.in`. |
| `mongodump` / `mongorestore` | `brew install mongodb-database-tools` |

`JWT_SECRET` must be identical on both builds, otherwise owners get logged out and the compare script cannot sign tokens.

## Rehearsal (a day before)

Run against a throwaway database, not the real one:

```bash
cd server
MONGO_URI="$MONGO_PROD_URL" DATABASE_URL="postgres://.../gymkarta_rehearsal" npm run migrate:mongo -- --dry-run
```

Every gym must end with `ok`. Read the warnings (deleted plans, payments pointing at deleted memberships, rounded ages); they are informational. A `MISMATCH` line or a non-zero exit means stop and investigate.

Also run the write-flow smoke test once (embedded database, nothing external is touched):

```bash
npm run smoke:writes
```

## Cutover

1. **Tell the gyms** the app will be read-only for about an hour.

2. **Pause the cron jobs** so they do not write to Mongo mid-copy:
   ```bash
   gh workflow disable daily-expiry.yml
   gh workflow disable daily-push-summary.yml
   ```

3. **Back up Mongo** somewhere other than the server:
   ```bash
   mongodump --uri "$MONGO_PROD_URL" --out ~/backups/gymkarta-$(date +%Y%m%d-%H%M)
   ```

4. **Migrate.** Smallest gym first, then everything:
   ```bash
   export MONGO_URI="$MONGO_PROD_URL" DATABASE_URL="postgres://.../gymkarta"
   npm run migrate:mongo -- --gym <smallGymMongoId>
   npm run migrate:mongo
   ```
   The script only reads Mongo. It is safe to re-run: rows are upserted by Mongo id, and imported rows whose Mongo document disappeared are removed. Rows created in Postgres after cutover are never touched.

5. **Compare the two APIs.** Both servers must be up and pointed at their own database:
   ```bash
   OLD_API_URL=https://api.gymkarta.indieroots.in \
   NEW_API_URL=https://pg.api.gymkarta.indieroots.in \
   DATABASE_URL="postgres://.../gymkarta" JWT_SECRET=... \
   npm run compare:api -- --sample 300
   ```
   The go signal is `N of N responses identical` and exit code 0. Differences that are known and accepted are already normalised by the script (see below).

6. **If anything was written to Mongo after step 4** (an owner ignored the freeze, a WhatsApp delivery receipt arrived), re-run step 4. It picks up the changes.

7. **Switch traffic.** Point `api.gymkarta.indieroots.in` at the Postgres build. The WhatsApp webhook URL in Meta stays the same because the domain does not change.

8. **Check on a real phone:** dashboard, one member profile, one renewal or payment, WhatsApp logs.

9. **Re-enable the cron jobs** and trigger each once:
   ```bash
   gh workflow enable daily-expiry.yml && gh workflow run daily-expiry.yml
   gh workflow enable daily-push-summary.yml
   ```

10. **Leave Mongo untouched for two weeks.** Do not delete the cluster or the dump.

## Rollback

Point the domain back at the Mongo build. Anything written after the switch is lost, which is acceptable at this size. If needed, `mongorestore --uri "$MONGO_PROD_URL" --drop <dump folder>` restores the backup.

Owners who logged in on the Postgres build hold tokens with uuids, which the Mongo build cannot resolve; their requests fail until they log out and log in again.

## Behaviour that intentionally differs from Mongo

The compare script accepts these; nothing in the app depends on them.

- Fields older Mongo documents never had (`isSeeded`, `pauseHistory`, `totalPausedDays`, payment `type`, default receipt settings) are now always present with their schema default. Explicit `null` fields are omitted.
- Tied entries in "top selling plans" and payment-method breakdowns now have a fixed order.
- A membership that pointed at a plan deleted before the import keeps that link as `ffffffff-xxxx-...` (the old ObjectId inside a uuid) so sales still group per plan.
- Biometric fields found in some dev documents (`biometricPin`, `fingerprint*`, `attendanceEnabled`) are not part of GymKarta's schema and are not copied.
- Money is stored as `double precision` so every Mongo amount is kept exactly. The migration report lists non-integer amounts per gym; switching to integer paise can be done later.
- Activities older than 180 days are not copied (Mongo deleted them via TTL); the daily expiry job now prunes them.

## Browsing the data

Any Postgres client works with the same `DATABASE_URL`: TablePlus, Beekeeper Studio, DBeaver or `psql`. If the database only listens on a private network (e.g. a droplet), connect through an SSH tunnel: `ssh -L 5433:localhost:5432 user@host`, then use `localhost:5433`.
