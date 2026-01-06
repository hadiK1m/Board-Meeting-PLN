ALTER TABLE "agendas" ALTER COLUMN "urgency" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "priority" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "priority" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "support" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "phone" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agendas" ALTER COLUMN "status" SET DEFAULT 'Draft';--> statement-breakpoint
ALTER TABLE "agendas" ADD COLUMN "not_required_files" jsonb DEFAULT '[]'::jsonb NOT NULL;