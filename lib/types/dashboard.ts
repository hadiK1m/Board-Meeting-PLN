// lib/types/dashboard.ts

export interface DirectorChartItem {
    name: string;
    attendance: number;
    total: number;
    percentage: number;
    fill?: string;
}

// Versi dari API (opsional, kalau mau pisah)
export interface ApiDirectorChartItem {
    name: string;
    present: number;      // ← dari backend
    total: number;
    percentage: number;
    fill: string;
}

export interface DashboardStats {
    rakordir: {
        draft: number;
        dapatDilanjutkan: number;
        dijadwalkan: number;
        ditunda: number;
        selesai: number;
        dibatalkan: number;
        total: number;
    };
    radir: {
        draft: number;
        dapatDilanjutkan: number;
        dijadwalkan: number;
        ditunda: number;
        selesai: number;
        dibatalkan: number;
        total: number;
    };
    followUp: {
        radir: { inProgress: number; done: number; total: number };
        rakordir: { inProgress: number; done: number; total: number };
    };
    directorChartData: DirectorChartItem[];   // ← pakai ini
    listData: AgendaTableItem[];              // ← ubah dari any[] → lebih aman
}

// Ekspor ini supaya bisa diimport di client & table
export interface AgendaTableItem {
    id: string;
    title: string;
    meetingType: string;
    status: string;
    monevStatus: string;
    contactPerson: string;
    contactPhone: string;
    executionDate: string | null;
    // tambah field lain kalau API kirim lebih banyak
}

// TableFilter tetap
export type TableFilter = {
    meetingType?: "RAKORDIR" | "RADIR";
    status?: string;
    clearLabel?: string;
};