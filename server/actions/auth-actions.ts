'use server'

import { db } from '@/db'
import { users, loginLogs } from '@/db/schema'
import { eq, ilike } from 'drizzle-orm'
import { createSession, deleteSession } from '@/lib/session' // ✅ Added deleteSession
import { redirect } from 'next/navigation'
import { authenticator } from 'otplib'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// --- TYPES ---
// ✅ Definisikan tipe untuk state form agar tidak perlu pakai 'any'
type FormState = {
    error?: string | null
    message?: string | null
    twoFactorRequired?: boolean
    userId?: string
} | null

// --- SCHEMAS ---
const loginSchema = z.object({
    email: z.string().email({ message: "Format email tidak valid." }),
    password: z.string().min(1, { message: "Kata sandi wajib diisi." }),
})

// --- HELPER: RECORD LOG ---
async function recordLogin(userId: string) {
    const headersList = await headers()
    const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
    const userAgent = headersList.get('user-agent') || 'unknown'

    try {
        await db.insert(loginLogs).values({
            userId,
            ipAddress,
            userAgent,
            timestamp: new Date()
        })
    } catch (error) {
        console.error("Gagal mencatat log login:", error)
    }
}

// --- 1. LOGIN ACTION ---
export async function loginAction(prevState: FormState, formData: FormData) {
    const validatedFields = loginSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
    })

    if (!validatedFields.success) {
        return { error: validatedFields.error.flatten().fieldErrors.email?.[0] || "Data tidak valid." }
    }

    const { email, password } = validatedFields.data
    const supabase = await createClient()

    try {
        // A. Cek User di DB Lokal (Drizzle)
        const userResult = await db.select()
            .from(users)
            .where(ilike(users.email, email))
            .limit(1)

        const userProfile = userResult[0]

        if (!userProfile) {
            return { error: "Akses Ditolak. Email tidak terdaftar di sistem." }
        }

        // B. Login ke Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError || !authData.user) {
            return { error: "Email atau Password salah." }
        }

        // C. Cek 2FA
        if (userProfile.twoFactorEnabled) {
            return {
                twoFactorRequired: true,
                userId: userProfile.id,
                error: null
            }
        }

        // D. Sukses Tanpa 2FA
        await recordLogin(userProfile.id)
        await createSession(userProfile.id, userProfile.role)

    } catch (error) {
        console.error('Login Error:', error)
        return { error: "Terjadi kesalahan server." }
    }

    redirect('/dashboard')
}

// --- 2. VERIFY 2FA ACTION ---
export async function verifyTwoFactorAction(userId: string, token: string) {
    if (!token || token.length !== 6) {
        return { error: "Format kode OTP harus 6 digit." }
    }

    try {
        const userResult = await db.select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)

        const user = userResult[0]

        if (!user) return { error: "User tidak ditemukan." }

        // Verifikasi OTP
        const isValid = user.twoFactorSecret && authenticator.verify({
            token,
            secret: user.twoFactorSecret
        })

        if (!isValid) {
            return { error: "Kode OTP tidak valid atau kedaluwarsa." }
        }

        // Sukses
        await recordLogin(user.id)
        await createSession(user.id, user.role)

    } catch (error) {
        console.error('2FA Error:', error)
        return { error: "Verifikasi gagal." }
    }

    redirect('/dashboard')
}

// --- 3. SIGNOUT ACTION ---
export async function signOutAction() {
    const supabase = await createClient()

    // 1. Logout dari Supabase
    await supabase.auth.signOut()

    // 2. ✅ Hapus Session Cookie Custom (PENTING)
    await deleteSession()

    redirect("/login")
}

// --- 4. GOOGLE LOGIN ACTION ---
export async function loginWithGoogleAction() {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    })

    if (error) {
        return { error: error.message }
    }

    if (data.url) {
        redirect(data.url)
    }
}