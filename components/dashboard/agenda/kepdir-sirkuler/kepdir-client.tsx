"use client"

import { useState, useMemo } from "react"
import {
    Search,
    FileText,
    MoreHorizontal,
    Plus,
    Building2,
    ShieldCheck,
    FileSignature,
    Trash2,
    Edit3
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AddKepdirModal } from "./add-kepdir-modal"
// import { EditKepdirModal } from "./edit-kepdir-modal" 

// 1. DEFINISI TIPE DATA (Pengganti 'any')
interface AgendaItem {
    id: string
    title: string
    director: string
    initiator: string
    contactPerson: string
    phone: string
    position: string
    status: string
    kepdirSirkulerDoc?: string | null
    grcDoc?: string | null
    supportingDocuments?: string[] | null // Asumsi sudah diparsing jadi array string
}

interface KepdirClientProps {
    initialData: AgendaItem[]
}

export default function KepdirClient({ initialData }: KepdirClientProps) {
    const [searchTerm, setSearchTerm] = useState("")
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    // 3. OPSI EDIT (Dikomentari sementara agar tidak error 'unused vars')
    // const [selectedAgenda, setSelectedAgenda] = useState<AgendaItem | null>(null)
    // const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    // ✅ Filter Pencarian (Judul & PIC)
    const filteredData = useMemo(() => {
        return initialData.filter((item) => {
            return (
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
            )
        })
    }, [searchTerm, initialData])

    const getInitials = (name: string) => {
        return name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "PIC"
    }

    return (
        <div className="space-y-4">
            {/* 🛠 TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Cari judul sirkuler atau narahubung..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-slate-50 border-none focus-visible:ring-[#14a2ba]"
                    />
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-[#14a2ba] hover:bg-[#125d72] text-white font-bold w-full md:w-auto"
                >
                    <Plus className="mr-2 h-4 w-4" /> Tambah Sirkuler
                </Button>
            </div>

            {/* 📋 TABLE */}
            <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="w-[45%] font-bold text-[#125d72]">Judul Kepdir Sirkuler</TableHead>
                            <TableHead className="font-bold text-[#125d72]">Pemrakarsa</TableHead>
                            <TableHead className="font-bold text-[#125d72]">Narahubung</TableHead>
                            <TableHead className="font-bold text-[#125d72]">Dokumen</TableHead>
                            <TableHead className="text-right font-bold text-[#125d72]">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length > 0 ? (
                            filteredData.map((item) => (
                                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <TableCell>
                                        <div className="space-y-1">
                                            <p className="font-bold text-[#125d72] leading-tight group-hover:text-[#14a2ba] transition-colors">
                                                {item.title}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[9px] uppercase border-slate-200 text-slate-400">
                                                    ID: {item.id.substring(0, 8)}
                                                </Badge>
                                                <Badge className="bg-blue-50 text-blue-600 text-[9px] hover:bg-blue-50 border-blue-100 uppercase">
                                                    {item.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <Building2 className="h-3 w-3 text-[#14a2ba]" />
                                                <span className="text-xs font-bold text-slate-700">{item.director}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500 pl-4.5">{item.initiator}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-7 w-7 border">
                                                <AvatarFallback className="bg-slate-100 text-[#125d72] text-[10px] font-bold">
                                                    {getInitials(item.contactPerson)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-700">{item.contactPerson}</span>
                                                <span className="text-[10px] text-emerald-600 font-medium">{item.phone}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {item.kepdirSirkulerDoc && (
                                                <div title="Dokumen Kepdir Sirkuler">
                                                    <FileSignature className="h-4 w-4 text-blue-500" />
                                                </div>
                                            )}
                                            {item.grcDoc && (
                                                <div title="Dokumen GRC">
                                                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                                </div>
                                            )}
                                            {item.supportingDocuments && item.supportingDocuments.length > 0 && (
                                                <div title="Dokumen Pendukung">
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-[#e7f6f9]">
                                                    <MoreHorizontal className="h-4 w-4 text-[#125d72]" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 p-2">
                                                <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-bold">Opsi Sirkuler</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        // setSelectedAgenda(item);
                                                        // setIsEditModalOpen(true);
                                                        console.log("Edit clicked", item.id)
                                                    }}
                                                    className="cursor-pointer font-bold text-[#125d72] py-2"
                                                >
                                                    <Edit3 className="mr-2 h-4 w-4" /> Ubah Data
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer text-slate-600 py-2">
                                                    <FileText className="mr-2 h-4 w-4" /> Lihat Detail
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 py-2">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Hapus
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic text-sm">
                                    Tidak ada data Kepdir Sirkuler ditemukan.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* 🛠 MODALS */}
            <AddKepdirModal
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
            />

            {/* <EditKepdirModal 
                agenda={selectedAgenda}
                open={isEditModalOpen} 
                onOpenChange={setIsEditModalOpen} 
            /> 
            */}
        </div>
    )
}