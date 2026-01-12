import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/session'
import { updateSession } from '@/lib/supabase/middleware' // Pastikan path ini sesuai dengan file supabase middleware Anda

export async function middleware(request: NextRequest) {
    // 1. Update Session Supabase (Agar token refresh berjalan)
    const response = await updateSession(request)

    // 2. Ambil Cookie Custom Session
    const cookie = request.cookies.get('session')?.value
    const session = await decrypt(cookie)

    // 3. Identifikasi Halaman
    const path = request.nextUrl.pathname

    // Daftar halaman yang BOLEH diakses tanpa login (Public Routes)
    const isPublicRoute =
        path === '/login' ||
        path.startsWith('/auth') || // Untuk callback google dsb
        path === '/' // Landing page jika ada

    // Daftar file statis yang harus diabaikan (Next.js internals)
    const isStaticFile =
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.includes('.') // Mendeteksi file extension (.png, .svg, .ico)

    // 4. LOGIKA PROTEKSI (The Gatekeeper)

    // A. Jika bukan public route & bukan file statis & TIDAK ADA session -> TENDANG KE LOGIN
    if (!isPublicRoute && !isStaticFile && !session?.userId) {
        const loginUrl = new URL('/login', request.nextUrl)
        // (Opsional) Simpan url tujuan agar setelah login bisa redirect balik
        // loginUrl.searchParams.set('from', path) 
        return NextResponse.redirect(loginUrl)
    }

    // B. Jika user mengakses /login tapi SUDAH login -> LEMPAR KE DASHBOARD
    if (path === '/login' && session?.userId) {
        return NextResponse.redirect(new URL('/dashboard', request.nextUrl))
    }

    // C. Lolos pemeriksaan
    return response
}

export const config = {
    /*
     * Matcher: Menangkap semua request path kecuali:
     * 1. /api/ (API routes)
     * 2. /_next/ (Next.js internals)
     * 3. /_static (Inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. File dengan ekstensi (e.g. favicon.ico, sitemap.xml)
     */
    matcher: [
        '/((?!api|_next/static|_next/image|_vercel|.*\\..*).*)',
    ],
}