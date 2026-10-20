import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DROP COLUMN "generate_slug";
  ALTER TABLE "_events_v" DROP COLUMN "version_generate_slug";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "_events_v" ADD COLUMN "version_generate_slug" boolean DEFAULT true;`)
}
