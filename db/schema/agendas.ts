import { uuid, text, varchar, timestamp, date, time, pgTable, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users";

export const agendas = pgTable("agendas", {
    // ID Utama
    id: uuid("id").defaultRandom().primaryKey(),

    // Informasi Utama Agenda
    title: text("title").notNull(),

    // ── PERUBAHAN: Menjadi text agar mendukung penjelasan panjang dari Textarea ──
    urgency: text("urgency"),

    deadline: timestamp("deadline"),

    // Field Opsional Fleksibel (RADIR/RAKORDIR)
    priority: text("priority"),
    director: text("director"),
    initiator: text("initiator"),
    support: text("support"),
    contactPerson: text("contact_person"),
    position: text("position"),
    phone: text("phone"),

    // File Attachments (Storage Paths) - Semuanya Opsional
    legalReview: text("legal_review"),
    riskReview: text("risk_review"),
    complianceReview: text("compliance_review"),
    regulationReview: text("regulation_review"),
    recommendationNote: text("recommendation_note"),
    proposalNote: text("proposal_note"),
    presentationMaterial: text("presentation_material"),
    supportingDocuments: jsonb("supporting_documents").default([]),

    // Logika Dokumen & Status Alur Kerja
    notRequiredFiles: jsonb("not_required_files").default([]).notNull(),
    status: text("status").default("Draft").notNull(),

    // Field Khusus Kepdir Sirkuler
    kepdirSirkulerDoc: text("kepdir_sirkuler_doc"),
    grcDoc: text("grc_doc"),

    /** FIELD PEMBATALAN */
    cancellationReason: text("cancellation_reason"),

    /** FIELD LOGISTIK RAPAT */
    executionDate: date("execution_date"),
    startTime: time("start_time"),
    endTime: varchar("end_time", { length: 50 }).default("Selesai"),
    meetingMethod: varchar("meeting_method", { length: 50 }), // OFFLINE, ONLINE, HYBRID
    meetingLocation: text("meeting_location"),
    meetingLink: text("meeting_link"),
    meetingType: text("meeting_type").default("RADIR"),

    // NOMOR & TAHUN RAPAT (Digunakan untuk Grouping)
    meetingNumber: varchar("meeting_number", { length: 50 }),
    meetingYear: varchar("meeting_year", { length: 4 }),

    /** FIELD PELAKSANAAN RAPAT (RISALAH & NOTULENSI) */
    pimpinanRapat: jsonb("pimpinan_rapat").default([]),
    attendanceData: jsonb("attendance_data").default({}),
    guestParticipants: jsonb("guest_participants").default([]),

    // Field Teks Narasi Hasil Rapat
    executiveSummary: text("executive_summary"),
    considerations: text("considerations"),
    risalahBody: text("risalah_body"),
    catatanRapat: text("catatan_rapat"), // Khusus untuk export Notulensi Rakordir

    // ── FIELD KHUSUS RAKORDIR ──
    // Arahan Direksi disimpan sebagai JSON Array
    arahanDireksi: jsonb("arahan_direksi").default([]),

    // ── FIELD KHUSUS RADIR ──
    // Keputusan Rapat RADIR
    meetingDecisions: jsonb("meeting_decisions").default([]),

    dissentingOpinion: text("dissenting_opinion"),
    meetingStatus: text("meeting_status").default("PENDING"),

    // GROUPING & TRACKING
    risalahGroupId: uuid("risalah_group_id").defaultRandom(),
    risalahTtd: text("risalah_ttd"),
    monevStatus: text("monev_status").default("ON_PROGRESS"),

    // Audit Trail
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type Definitions untuk TypeScript
export type Agenda = typeof agendas.$inferSelect;
export type NewAgenda = typeof agendas.$inferInsert;