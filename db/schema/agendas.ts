import { uuid, text, varchar, timestamp, date, time, pgTable, jsonb } from "drizzle-orm/pg-core";

export const agendas = pgTable("agendas", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    urgency: varchar("urgency", { length: 50 }),
    deadline: timestamp("deadline").notNull(),
    priority: text("priority").notNull(),
    director: text("director").notNull(),
    initiator: text("initiator").notNull(),
    support: text("support").notNull(),
    contactPerson: text("contact_person").notNull(),
    position: text("position").notNull(),
    phone: text("phone").notNull(),

    // File Attachments (Storage Paths)
    legalReview: text("legal_review"),
    riskReview: text("risk_review"),
    complianceReview: text("compliance_review"),
    regulationReview: text("regulation_review"),
    recommendationNote: text("recommendation_note"),
    proposalNote: text("proposal_note"),
    presentationMaterial: text("presentation_material"),
    supportingDocuments: jsonb("supporting_documents").default([]),

    // Logika Dokumen & Status
    notRequiredFiles: jsonb("not_required_files").default([]).notNull(),
    status: text("status").default("Draft").notNull(),

    /** * FIELD BARU: Pembatalan 
     * Menampung alasan mengapa agenda dibatalkan (nullable)
     */
    cancellationReason: text("cancellation_reason"),
    executionDate: date("execution_date"),
    startTime: time("start_time"),
    endTime: varchar("end_time", { length: 50 }).default("Selesai"),
    meetingMethod: varchar("meeting_method", { length: 50 }), // OFFLINE, ONLINE, HYBRID
    meetingLocation: text("meeting_location"),
    meetingLink: text("meeting_link"),
    meetingType: text("meeting_type").default("RADIR"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    // Audit Trail
});

// Helper Types untuk penggunaan di Server Actions dan UI
export type Agenda = typeof agendas.$inferSelect;
export type NewAgenda = typeof agendas.$inferInsert;