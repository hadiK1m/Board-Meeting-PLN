CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agendas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"urgency" varchar(20) NOT NULL,
	"deadline" timestamp NOT NULL,
	"director" text NOT NULL,
	"initiator" text NOT NULL,
	"support" text,
	"contact_person" text NOT NULL,
	"position" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"legal_review" text,
	"risk_review" text,
	"compliance_review" text,
	"regulation_review" text,
	"recommendation_note" text,
	"proposal_note" text,
	"presentation_material" text,
	"supporting_documents" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'Draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
