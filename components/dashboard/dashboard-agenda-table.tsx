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
    BarChart3
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

// Tipe Data untuk Tabel
export type AgendaTableItem = {
    id: string
    title: string
    meetingType: string
    status: string
    monevStatus: string
    contactPerson: string
    contactPhone: string
    executionDate: string | null
}

// Helper WA Link
const getWaLink = (phone: string) => {
    if (!phone) return "#"
    // Bersihkan karakter non-angka
    let clean = phone.replace(/\D/g, "")
    // Ganti 08 di depan dengan 628
    if (clean.startsWith("0")) {
        clean = "62" + clean.slice(1)
    }
    return `https://wa.me/${clean}`
}

export const columns: ColumnDef<AgendaTableItem>[] = [
    {
        accessorKey: "title",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="text-xs font-bold uppercase tracking-wider"
                >
                    Judul Agenda
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
            )
        },
        cell: ({ row }) => (
            <div className="flex flex-col max-w-75">
                <span className="font-bold text-slate-700 truncate">{row.getValue("title")}</span>
                <span className="text-[10px] text-slate-400">
                    {row.original.executionDate
                        ? format(new Date(row.original.executionDate), "dd MMM yyyy", { locale: id })
                        : "Tanggal belum set"}
                </span>
            </div>
        ),
    },
    {
        accessorKey: "meetingType",
        header: "Tipe",
        cell: ({ row }) => {
            const type = row.getValue("meetingType") as string
            return (
                <Badge variant="outline" className={type === "RAKORDIR" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                    {type === "RAKORDIR" ? <FileText className="w-3 h-3 mr-1" /> : <BarChart3 className="w-3 h-3 mr-1" />}
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
            let color = "bg-slate-100 text-slate-600"
            if (status === "RAPAT_SELESAI" || status === "COMPLETED") color = "bg-emerald-100 text-emerald-700"
            if (status === "DIJADWALKAN" || status === "SCHEDULED") color = "bg-blue-100 text-blue-700"
            if (status === "DRAFT") color = "bg-slate-200 text-slate-600"

            return <Badge className={`border-none ${color}`}>{status.replace("_", " ")}</Badge>
        },
    },
    {
        accessorKey: "monevStatus",
        header: "Status Monev",
        cell: ({ row }) => {
            const status = row.getValue("monevStatus") as string
            let color = "bg-slate-100 text-slate-500"
            if (status === "Selesai" || status === "DONE") color = "bg-emerald-50 text-emerald-600 border border-emerald-200"
            if (status === "On Progress") color = "bg-amber-50 text-amber-600 border border-amber-200"

            return <div className={`text-[10px] px-2 py-1 rounded-full font-bold text-center w-fit ${color}`}>{status}</div>
        },
    },
    {
        accessorKey: "contactPerson",
        header: "Narahubung",
        cell: ({ row }) => {
            const name = row.getValue("contactPerson") as string
            const phone = row.original.contactPhone

            return (
                <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <span className="text-xs font-medium">{name}</span>
                        <span className="text-[10px] text-slate-400">{phone}</span>
                    </div>
                    {phone && phone.length > 5 && (
                        <a
                            href={getWaLink(phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
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

    // Pagination State
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 25, // Default 25
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
                {/* 1. Pencarian Global (Title) */}
                <div className="flex items-center w-full md:w-auto relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cari Judul Agenda..."
                        value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("title")?.setFilterValue(event.target.value)
                        }
                        className="pl-8 h-9 w-full md:w-64"
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
                        <SelectTrigger className="h-9 w-32.5">
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
                            <Button variant="outline" size="sm" className="ml-auto h-9">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                Tampilan
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id === 'title' ? 'Judul' :
                                                column.id === 'meetingType' ? 'Tipe' :
                                                    column.id === 'contactPerson' ? 'Narahubung' : column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
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
                                    className="hover:bg-slate-50/50"
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
                                    className="h-24 text-center text-slate-500 italic"
                                >
                                    Tidak ada data agenda ditemukan.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 4. Pagination Controls */}
            <div className="flex items-center justify-between space-x-2 py-2">
                <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 font-medium">Baris per halaman:</p>
                    <Select
                        value={`${table.getState().pagination.pageSize}`}
                        onValueChange={(value) => {
                            table.setPageSize(Number(value))
                        }}
                    >
                        <SelectTrigger className="h-8 w-17.5">
                            <SelectValue placeholder={table.getState().pagination.pageSize} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {[10, 25, 50, 100].map((pageSize) => (
                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                    {pageSize}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="text-xs text-slate-500 mr-2">
                        Halaman {table.getState().pagination.pageIndex + 1} dari {table.getPageCount()}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Sebelumnya
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Selanjutnya
                    </Button>
                </div>
            </div>
        </div>
    )
}