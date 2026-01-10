ALTER TABLE "agendas" ALTER COLUMN "urgency" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "urgency" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "deadline" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "support" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "kepdir_sirkuler_doc" text;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "grc_doc" text;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "execution_date" date;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "start_time" time;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "end_time" varchar(50) DEFAULT 'Selesai';--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "meeting_method" varchar(50);--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "meeting_location" text;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "meeting_link" text;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "meeting_type" text DEFAULT 'RADIR';--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "meeting_number" varchar(50);--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "meeting_year" varchar(4);--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "pimpinan_rapat" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "attendance_data" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "guest_participants" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "executive_summary" text;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "considerations" text;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "risalah_body" text;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "meeting_decisions" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "dissenting_opinion" text;--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "meeting_status" text DEFAULT 'PENDING';