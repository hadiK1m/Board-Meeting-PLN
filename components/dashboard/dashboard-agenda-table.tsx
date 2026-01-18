/* eslint-disable react-hooks/incompatible-library */
"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {
    ArrowUpDown,
    Search,
    Phone,
    SlidersHorizontal,
    FileText,
    BarChart3,
    CheckCircle2,
    Clock,
    AlertCircle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"

// ✅ Tipe Data Diperbarui untuk Monev yang Lebih Detail
export type AgendaTableItem = {
    id: string
    title: string
    meetingType: string
    status: string
    // Kita ubah monev menjadi object agar bisa akses angka
    monev: {
        status: "DONE" | "IN_PROGRESS" | "NONE";
        done: number;
        total: number;
    }
    contactPerson: string
    contactPhone: string
    executionDate: string | null
}

// Helper WA Link
const getWaLink = (phone: string) => {
    if (!phone) return "#"
    let clean = phone.replace(/\D/g, "")
    if (clean.startsWith("0")) {
        clean = "62" + clean.slice(1)
    }
    return `https://wa.me/${clean}`
}

export const columns: ColumnDef<AgendaTableItem>[] = [
    {
        id: "no",
        header: () => (
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">No</span>
        ),
        cell: ({ row }) => <span className="text-xs font-medium text-slate-500 ml-1">{row.index + 1}</span>,
        size: 40,
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "title",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="text-xs font-bold uppercase tracking-wider -ml-4"
                >
                    Judul Agenda
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            )
        },
        cell: ({ row }) => (
            <div className="flex flex-col max-w-70" title={row.getValue("title")}>
                <span className="font-bold text-slate-700 truncate text-sm">{row.getValue("title")}</span>
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {row.original.executionDate
                        ? format(new Date(row.original.executionDate), "dd MMMM yyyy", { locale: id })
                        : "Tanggal belum diatur"}
                </span>
            </div>
        ),
    },
    {
        accessorKey: "meetingType",
        header: "Tipe",
        cell: ({ row }) => {
            const type = row.getValue("meetingType") as string
            const isRakordir = type === "RAKORDIR"
            return (
                <Badge variant="outline" className={cn(
                    "px-2 py-0.5 text-[10px] font-bold border",
                    isRakordir
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                )}>
                    {isRakordir ? <FileText className="w-3 h-3 mr-1.5" /> : <BarChart3 className="w-3 h-3 mr-1.5" />}
                    {type}
                </Badge>
            )
        },
    },
    {
        accessorKey: "status",
        header: "Status Meeting",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            let colorClass = "bg-slate-100 text-slate-600 border-slate-200"
            let icon = null

            if (status === "RAPAT_SELESAI" || status === "COMPLETED") {
                colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200"
                icon = <CheckCircle2 className="w-3 h-3 mr-1" />
            } else if (status === "DIJADWALKAN" || status === "SCHEDULED") {
                colorClass = "bg-sky-50 text-sky-700 border-sky-200"
                icon = <Clock className="w-3 h-3 mr-1" />
            } else if (status === "DRAFT") {
                colorClass = "bg-slate-100 text-slate-500 border-slate-200"
                icon = <FileText className="w-3 h-3 mr-1" />
            }

            return (
                <div className={cn("flex items-center w-fit px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tight", colorClass)}>
                    {icon}
                    {status.replace("_", " ")}
                </div>
            )
        },
    },
    {
        accessorKey: "monev", // Mengakses object monev
        header: "Status Monev",
        cell: ({ row }) => {
            const { status, done, total } = row.original.monev
            const meetingType = row.original.meetingType

            // 1. KONDISI: TIDAK ADA ARAHAN / KEPUTUSAN
            if (status === "NONE") {
                const label = meetingType === "RADIR" ? "Tanpa Keputusan" : "Tanpa Arahan"
                return (
                    <div className="text-[10px] font-medium text-slate-400 italic flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {label}
                    </div>
                )
            }

            // 2. KONDISI: SELESAI
            if (status === "DONE") {
                return (
                    <div className="flex flex-col items-start">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2">
                            Selesai ({done}/{total})
                        </Badge>
                    </div>
                )
            }

            // 3. KONDISI: IN PROGRESS (Tampilkan Detail Angka)
            // Contoh: "In Progress (2/5)"
            return (
                <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-2 w-fit">
                        In Progress
                    </Badge>
                    <span className="text-[10px] font-semibold text-slate-500 ml-1">
                        {done} dari {total} selesai
                    </span>
                    {/* Optional: Mini Progress Bar */}
                    <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${(done / total) * 100}%` }}
                        />
                    </div>
                </div>
            )
        },
    },
    {
        accessorKey: "contactPerson",
        header: "Narahubung",
        cell: ({ row }) => {
            const name = row.getValue("contactPerson") as string
            const phone = row.original.contactPhone

            if (!name || name === "-") return <span className="text-slate-300 text-xs">-</span>

            return (
                <div className="flex items-center justify-between gap-2 max-w-35">
                    <div className="flex flex-col truncate">
                        <span className="text-xs font-semibold text-slate-700 truncate" title={name}>{name}</span>
                        <span className="text-[10px] text-slate-400">{phone}</span>
                    </div>
                    {phone && phone.length > 5 && (
                        <a
                            href={getWaLink(phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-none p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-all shadow-sm border border-green-100"
                            title="Chat WhatsApp"
                        >
                            <Phone className="h-3 w-3" />
                        </a>
                    )}
                </div>
            )
        },
    },
]

export function DashboardAgendaTable({ data }: { data: AgendaTableItem[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10, // Default saya ubah ke 10 agar tidak terlalu panjang di dashboard
    })

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: setPagination,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination,
        },
    })

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* 1. Pencarian Global */}
                <div className="flex items-center w-full md:w-auto relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#125d72] transition-colors" />
                    <Input
                        placeholder="Cari Judul Agenda..."
                        value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("title")?.setFilterValue(event.target.value)
                        }
                        className="pl-9 h-10 w-full md:w-72 rounded-xl border-slate-200 focus:ring-[#125d72] focus:border-[#125d72] text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* 2. Filter Jenis Rapat */}
                    <Select
                        value={(table.getColumn("meetingType")?.getFilterValue() as string) ?? "ALL"}
                        onValueChange={(value) =>
                            table.getColumn("meetingType")?.setFilterValue(value === "ALL" ? "" : value)
                        }
                    >
                        <SelectTrigger className="h-10 w-35 rounded-xl border-slate-200 text-xs font-medium">
                            <SelectValue placeholder="Semua Tipe" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Semua Tipe</SelectItem>
                            <SelectItem value="RAKORDIR">Rakordir</SelectItem>
                            <SelectItem value="RADIR">Radir</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* 3. Filter Kolom */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto h-10 rounded-xl border-slate-200 text-xs font-medium">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                Tampilan
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize text-xs"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id === 'title' ? 'Judul' :
                                                column.id === 'meetingType' ? 'Tipe' :
                                                    column.id === 'contactPerson' ? 'Narahubung' :
                                                        column.id === 'monev' ? 'Monev' : column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-100">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="h-10">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-slate-50/50 border-slate-100 transition-colors"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-32 text-center"
                                >
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <FileText className="h-8 w-8 opacity-20" />
                                        <p className="text-sm font-medium">Tidak ada agenda ditemukan.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 4. Pagination Controls */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rows per page</p>
                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
                    >
                        <SelectTrigger className="h-8 w-17.5 text-xs rounded-lg">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[5, 10, 25, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="text-[10px] text-slate-500 font-medium mr-4">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </div>
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="h-8 text-xs rounded-lg"
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="h-8 text-xs rounded-lg"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}