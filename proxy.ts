import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Konvensi baru Next.js 16+: Menggunakan fungsi 'proxy' 
 * sebagai pengganti 'middleware'.
 */
export async function proxy(request: NextRequest) {
    // 1. Jalankan Refresh Token Supabase
    // Kita menerima 'supabaseResponse' yang mungkin berisi cookie baru.
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

    // Jika file statis, langsung loloskan dengan response dari supabase
    if (isStaticFile) {
        return supabaseResponse
    }

    // --- 4. LOGIKA PROTEKSI TERPUSAT (The Gatekeeper) ---

    // A. Proteksi Route Privat
    if (!isPublicRoute && (!user || !session?.userId)) {
        const loginUrl = new URL('/login', request.nextUrl)
        const redirectResponse = NextResponse.redirect(loginUrl)

        // Salin cookie dari 'supabaseResponse' ke 'redirectResponse' agar token tetap sinkron
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

    // C. Jika lolos semua cek, kembalikan supabaseResponse asli
    return supabaseResponse
}

/**
 * HELPER: COPY COOKIES
 * Memastikan header Set-Cookie tidak hilang saat melakukan Redirect.
 */
function copyCookies(sourceResponse: NextResponse, targetResponse: NextResponse) {
    const setCookieHeader = sourceResponse.headers.get('set-cookie')
    if (setCookieHeader) {
        targetResponse.headers.set('set-cookie', setCookieHeader)
    }
}

/**
 * MATCHER CONFIG
 * Menentukan rute mana saja yang akan melewati fungsi proxy ini.
 */
export const config = {
    matcher: [
        /*
         * Cocokkan semua jalur permintaan kecuali:
         * - api (jalur API)
         * - _next/static (file statis)
         * - _next/image (optimasi gambar)
         * - favicon.ico (file favicon)
         */
        '/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)',
    ],
}