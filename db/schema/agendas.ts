import { uuid, text, varchar, timestamp, date, time, pgTable, jsonb } from "drizzle-orm/pg-core";

export const agendas = pgTable("agendas", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(), // Judul tetap wajib diisi
    urgency: varchar("urgency", { length: 50 }),
    deadline: timestamp("deadline"),

    // Field di bawah ini diubah menjadi opsional (tanpa .notNull()) 
    // agar fleksibel untuk berbagai jenis rapat (RADIR/RAKORDIR)
    priority: text("priority"),
    director: text("director"),
    initiator: text("initiator"),
    support: text("support"),
    contactPerson: text("contact_person"),
    position: text("position"),
    phone: text("phone"),

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

    // Field Khusus Kepdir Sirkuler
    kepdirSirkulerDoc: text("kepdir_sirkuler_doc"),
    grcDoc: text("grc_doc"),

    /** * FIELD PEMBATALAN */
    cancellationReason: text("cancellation_reason"),

    /**
     * FIELD LOGISTIK RAPAT
     */
    executionDate: date("execution_date"),
    startTime: time("start_time"),
    endTime: varchar("end_time", { length: 50 }).default("Selesai"),
    meetingMethod: varchar("meeting_method", { length: 50 }), // OFFLINE, ONLINE, HYBRID
    meetingLocation: text("meeting_location"),
    meetingLink: text("meeting_link"),
    meetingType: text("meeting_type").default("RADIR"),

    // ── FIELD BARU: NOMOR & TAHUN RAPAT ──
    meetingNumber: varchar("meeting_number", { length: 50 }),
    meetingYear: varchar("meeting_year", { length: 4 }),

    /**
     * FIELD PELAKSANAAN RAPAT (RISALAH)
     */
    pimpinanRapat: jsonb("pimpinan_rapat").default([]),
    attendanceData: jsonb("attendance_data").default({}),
    guestParticipants: jsonb("guest_participants").default([]),

    executiveSummary: text("executive_summary"),
    considerations: text("considerations"),
    risalahBody: text("risalah_body"),

    // Keputusan disimpan dalam format JSON Array: [{id: 1, text: "..."}]
    meetingDecisions: jsonb("meeting_decisions").default([]),

    dissentingOpinion: text("dissenting_opinion"),

    meetingStatus: text("meeting_status").default("PENDING"),

    // ── FIELD BARU: GROUPING UNTUK RISALAH ──
    risalahGroupId: uuid("risalah_group_id").defaultRandom(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Helper Types untuk penggunaan di Server Actions dan UI
export type Agenda = typeof agendas.$inferSelect;
export type NewAgenda = typeof agendas.$inferInsert;