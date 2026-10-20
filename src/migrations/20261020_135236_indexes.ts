import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "bookings_fully_cancelled_idx";
  CREATE INDEX "events_date_idx" ON "events" USING btree ("date");
  CREATE INDEX "_events_v_version_version_date_idx" ON "_events_v" USING btree ("version_date");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "events_date_idx";
  DROP INDEX "_events_v_version_version_date_idx";
  CREATE INDEX "bookings_fully_cancelled_idx" ON "bookings" USING btree ("fully_cancelled");`)
}
