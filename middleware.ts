import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    // 1. Jalankan Refresh Token Supabase
    // Kita terima 'supabaseResponse' yang MUNGKIN berisi cookie baru.
    const { supabaseResponse, user } = await updateSession(request)

    // 2. Ambil Cookie Custom Session (untuk data tambahan seperti role/id)
    const cookie = request.cookies.get('session')?.value
    const session = await decrypt(cookie)

    // 3. Identifikasi Halaman
    const path = request.nextUrl.pathname

    const isPublicRoute =
        path === '/login' ||
        path.startsWith('/auth') ||
        path === '/'

    const isStaticFile =
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.includes('.')

    // Jika file statis, langsung loloskan dengan response dari supabase (agar cookie tetap update)
    if (isStaticFile) {
        return supabaseResponse
    }

    // --- 4. LOGIKA PROTEKSI TERPUSAT (The Gatekeeper) ---

    // A. Proteksi Route Privat
    // Syarat akses: Harus bukan public route AND (Harus ada User Supabase OR Harus ada Session Custom)
    // [SECURE] Disarankan mewajibkan keduanya (User Supabase & Session Local) agar sinkron.
    if (!isPublicRoute && (!user || !session?.userId)) {
        // Buat URL redirect
        const loginUrl = new URL('/login', request.nextUrl)

        // Buat response redirect baru
        const redirectResponse = NextResponse.redirect(loginUrl)

        // [CRITICAL FIX] Salin cookie dari 'supabaseResponse' ke 'redirectResponse'
        // Jika Supabase mencoba me-refresh token atau menghapus token, kita harus meneruskannya ke browser.
        copyCookies(supabaseResponse, redirectResponse)

        return redirectResponse
    }

    // B. Redirect User Login menjauh dari halaman Login
    if (isPublicRoute && path !== '/' && user && session?.userId) {
        const dashboardUrl = new URL('/dashboard', request.nextUrl)
        const redirectResponse = NextResponse.redirect(dashboardUrl)

        copyCookies(supabaseResponse, redirectResponse)

        return redirectResponse
    }

    // C. Jika lolos semua cek, kembalikan supabaseResponse yang asli
    // (Ini penting karena response ini memegang set-cookie header jika ada refresh token)
    return supabaseResponse
}

// --- HELPER: COPY COOKIES ---
// Fungsi ini memastikan header Set-Cookie tidak hilang saat kita melakukan Redirect
function copyCookies(sourceResponse: NextResponse, targetResponse: NextResponse) {
    const setCookieHeader = sourceResponse.headers.get('set-cookie')
    if (setCookieHeader) {
        // Next.js mungkin menggabungkan multiple cookies dengan koma, atau split header
        // Kita copy header 'set-cookie' mentah ke response baru
        targetResponse.headers.set('set-cookie', setCookieHeader)
    }
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)',
    ],
}