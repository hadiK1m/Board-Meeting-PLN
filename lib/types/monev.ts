export interface MonevDecisionItem {
    id: string
    text: string // Bunyi Keputusan (dari notulensi)
    pic?: string // Penanggung Jawab (Opsional)

    // Field Tambahan untuk Monev
    targetOutput?: string      // Apa output yang diharapkan?
    currentProgress?: string   // Update status terkini
    evidencePath?: string      // Path file bukti di storage
    status?: "ON_PROGRESS" | "DONE" // Status per item
    lastUpdated?: string       // Tanggal update terakhir
}

// Tipe helper untuk data list view
export interface MonevRadirItem {
    id: string
    meetingNumber: string
    meetingYear: string
    title: string
    executionDate: string | null
    initiator: string | null
    director: string | null
    contactPerson: string | null
    position: string | null
    phone: string | null
    risalahTtd: string | null
    monevStatus: string | null // 'ON_PROGRESS' | 'DONE'
    meetingDecisions: MonevDecisionItem[]
}