import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // 1. Buat response awal. Ini akan menampung cookie baru jika token di-refresh.
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // Update cookie di request (untuk diproses server sekarang)
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    // Update cookie di response (untuk dikirim balik ke browser)
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 2. Ambil user untuk memastikan token valid & di-refresh jika perlu
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // [SECURE] Hapus logika redirect dari sini. 
    // Kita hanya mengembalikan user dan response yang sudah membawa cookie baru.
    // Biarkan middleware.ts yang mengatur routing.

    return { supabaseResponse, user }
}