import { uuid, text, varchar, timestamp, date, time, pgTable, jsonb } from "drizzle-orm/pg-core";

export const agendas = pgTable("agendas", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    urgency: varchar("urgency", { length: 50 }),
    deadline: timestamp("deadline"),
    priority: text("priority").notNull(),
    director: text("director").notNull(),
    initiator: text("initiator").notNull(),
    support: text("support"),
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
     * Ditambahkan tanpa menghapus field lama untuk menjaga compatibility
     */
    pimpinanRapat: jsonb("pimpinan_rapat").default([]), // Menyimpan array pimpinan dari MasterData
    attendanceData: jsonb("attendance_data").default({}), // Menyimpan objek Hadir/Tidak/Kuasa
    guestParticipants: jsonb("guest_participants").default([]), // Manajemen Atas & Undangan Luar

    executiveSummary: text("executive_summary"), // Ringkasan Eksekutif
    considerations: text("considerations"), // Dasar Pertimbangan
    risalahBody: text("risalah_body"), // Isi Utama Notulensi (Rich Text/Simple Text)

    // Keputusan disimpan dalam format JSON Array: [{id: 1, text: "..."}]
    meetingDecisions: jsonb("meeting_decisions").default([]),

    dissentingOpinion: text("dissenting_opinion"), // Catatan perbedaan pendapat

    meetingStatus: text("meeting_status").default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED

    // ── FIELD BARU: GROUPING UNTUK RISALAH ──
    risalahGroupId: uuid("risalah_group_id").defaultRandom(), // UUID untuk menandai agenda dalam satu sesi risalah yang sama

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Helper Types untuk penggunaan di Server Actions dan UI
export type Agenda = typeof agendas.$inferSelect;
export type NewAgenda = typeof agendas.$inferInsert;