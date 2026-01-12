"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    // Timer 2 detik agar animasi sempat terlihat
    // Anda bisa mengubah angkanya (2000 = 2 detik)
    const timer = setTimeout(() => {
      router.push("/dashboard")
    }, 2000)

    // Bersihkan timer jika komponen di-unmount
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-700">

        {/* LOGO (Opsional - Ganti src dengan logo Anda jika ada) */}
        {/* <div className="h-20 w-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-2">
           <Image src="/logo.png" width={50} height={50} alt="Logo" /> 
        </div> */}

        {/* Loading Spinner */}
        <div className="relative">
          <div className="absolute inset-0 bg-[#125d72]/20 blur-xl rounded-full"></div>
          <Loader2 className="relative h-16 w-16 animate-spin text-[#125d72]" />
        </div>

        {/* Teks */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Board Meeting PLN
          </h1>
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Sedang memuat dashboard...
          </p>
        </div>
      </div>
    </div>
  )
}