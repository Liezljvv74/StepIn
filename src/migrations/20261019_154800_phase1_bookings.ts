import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { bookingFromOrder } from '../collections/hooks/createBookingFromOrder'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_table_plan_shape" AS ENUM('long', 'round', 'square');
  CREATE TYPE "public"."enum_events_tables_shape" AS ENUM('long', 'round', 'square');
  CREATE TYPE "public"."enum__events_v_version_table_plan_shape" AS ENUM('long', 'round', 'square');
  CREATE TYPE "public"."enum__events_v_version_tables_shape" AS ENUM('long', 'round', 'square');
  CREATE TYPE "public"."enum_bookings_guests_status" AS ENUM('paid', 'pay_at_venue', 'not_paying', 'cancelled');
  CREATE TYPE "public"."enum_bookings_source" AS ENUM('phone', 'online');
  CREATE TABLE "events_table_plan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"shape" "enum_events_table_plan_shape" DEFAULT 'long',
  	"count" numeric,
  	"seats" numeric DEFAULT 10
  );
  
  CREATE TABLE "events_tables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"seats" numeric,
  	"shape" "enum_events_tables_shape"
  );
  
  CREATE TABLE "_events_v_version_table_plan" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"shape" "enum__events_v_version_table_plan_shape" DEFAULT 'long',
  	"count" numeric,
  	"seats" numeric DEFAULT 10,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_events_v_version_tables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"seats" numeric,
  	"shape" "enum__events_v_version_tables_shape",
  	"_uuid" varchar
  );
  
  CREATE TABLE "bookings_guests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"status" "enum_bookings_guests_status" DEFAULT 'pay_at_venue' NOT NULL,
  	"table" numeric,
  	"ticket_type" varchar,
  	"price" numeric
  );
  
  CREATE TABLE "bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" integer NOT NULL,
  	"party_name" varchar NOT NULL,
  	"telephone" varchar,
  	"source" "enum_bookings_source" DEFAULT 'phone' NOT NULL,
  	"order_id" integer,
  	"live_guests" numeric,
  	"has_unseated" boolean,
  	"fully_cancelled" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_guests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"ticket_type" varchar,
  	"price" numeric
  );
  
  ALTER TABLE "orders" ALTER COLUMN "event_id" DROP NOT NULL;
  ALTER TABLE "events" ADD COLUMN "highest_table_number" numeric DEFAULT 0;
  ALTER TABLE "_events_v" ADD COLUMN "version_highest_table_number" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "event_name" varchar;
  ALTER TABLE "orders" ADD COLUMN "event_date" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "phone" varchar;
  ALTER TABLE "orders" ADD COLUMN "hold_until" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "bookings_id" integer;
  ALTER TABLE "events_table_plan" ADD CONSTRAINT "events_table_plan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_tables" ADD CONSTRAINT "events_tables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_table_plan" ADD CONSTRAINT "_events_v_version_table_plan_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_tables" ADD CONSTRAINT "_events_v_version_tables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings_guests" ADD CONSTRAINT "bookings_guests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_guests" ADD CONSTRAINT "orders_guests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_table_plan_order_idx" ON "events_table_plan" USING btree ("_order");
  CREATE INDEX "events_table_plan_parent_id_idx" ON "events_table_plan" USING btree ("_parent_id");
  CREATE INDEX "events_tables_order_idx" ON "events_tables" USING btree ("_order");
  CREATE INDEX "events_tables_parent_id_idx" ON "events_tables" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_table_plan_order_idx" ON "_events_v_version_table_plan" USING btree ("_order");
  CREATE INDEX "_events_v_version_table_plan_parent_id_idx" ON "_events_v_version_table_plan" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_tables_order_idx" ON "_events_v_version_tables" USING btree ("_order");
  CREATE INDEX "_events_v_version_tables_parent_id_idx" ON "_events_v_version_tables" USING btree ("_parent_id");
  CREATE INDEX "bookings_guests_order_idx" ON "bookings_guests" USING btree ("_order");
  CREATE INDEX "bookings_guests_parent_id_idx" ON "bookings_guests" USING btree ("_parent_id");
  CREATE INDEX "bookings_event_idx" ON "bookings" USING btree ("event_id");
  CREATE UNIQUE INDEX "bookings_order_idx" ON "bookings" USING btree ("order_id");
  CREATE INDEX "bookings_fully_cancelled_idx" ON "bookings" USING btree ("fully_cancelled");
  CREATE INDEX "bookings_updated_at_idx" ON "bookings" USING btree ("updated_at");
  CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");
  CREATE INDEX "orders_guests_order_idx" ON "orders_guests" USING btree ("_order");
  CREATE INDEX "orders_guests_parent_id_idx" ON "orders_guests" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk" FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "orders_hold_until_idx" ON "orders" USING btree ("hold_until");
  CREATE INDEX "payload_locked_documents_rels_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("bookings_id");`)

  // Existing orders: keep a copy of their event's name and date, and turn each
  // paid one into an online booking so its seats count against the room.
  const { docs: orders } = await payload.find({
    collection: 'orders',
    pagination: false,
    depth: 0,
    req,
  })
  for (const order of orders) {
    if (!order.event) continue
    const event = await payload.findByID({
      collection: 'events',
      id: order.event as number,
      depth: 0,
      disableErrors: true,
      req,
    })
    if (event && !order.eventName) {
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: { eventName: event.name, eventDate: event.date },
        req,
      })
    }
    if (event && order.status === 'paid') {
      const { totalDocs } = await payload.count({
        collection: 'bookings',
        where: { order: { equals: order.id } },
        req,
      })
      if (totalDocs === 0) {
        await payload.create({ collection: 'bookings', data: bookingFromOrder(order), req })
      }
    }
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events_table_plan" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_tables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_version_table_plan" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_version_tables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bookings_guests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bookings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders_guests" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events_table_plan" CASCADE;
  DROP TABLE "events_tables" CASCADE;
  DROP TABLE "_events_v_version_table_plan" CASCADE;
  DROP TABLE "_events_v_version_tables" CASCADE;
  DROP TABLE "bookings_guests" CASCADE;
  DROP TABLE "bookings" CASCADE;
  DROP TABLE "orders_guests" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_bookings_fk";
  
  DROP INDEX "orders_hold_until_idx";
  DROP INDEX "payload_locked_documents_rels_bookings_id_idx";
  ALTER TABLE "orders" ALTER COLUMN "event_id" SET NOT NULL;
  ALTER TABLE "events" DROP COLUMN "highest_table_number";
  ALTER TABLE "_events_v" DROP COLUMN "version_highest_table_number";
  ALTER TABLE "orders" DROP COLUMN "event_name";
  ALTER TABLE "orders" DROP COLUMN "event_date";
  ALTER TABLE "orders" DROP COLUMN "phone";
  ALTER TABLE "orders" DROP COLUMN "hold_until";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "bookings_id";
  DROP TYPE "public"."enum_events_table_plan_shape";
  DROP TYPE "public"."enum_events_tables_shape";
  DROP TYPE "public"."enum__events_v_version_table_plan_shape";
  DROP TYPE "public"."enum__events_v_version_tables_shape";
  DROP TYPE "public"."enum_bookings_guests_status";
  DROP TYPE "public"."enum_bookings_source";`)
}
