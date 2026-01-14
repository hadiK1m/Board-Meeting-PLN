/* eslint-disable @typescript-eslint/no-unused-vars */
'use server'

import { db } from '@/db'
import { users, loginLogs } from '@/db/schema'
import { eq, ilike } from 'drizzle-orm'
import { createSession, deleteSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { authenticator } from 'otplib'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
// [FIX] Gunakan schema terpusat agar konsisten
import { loginSchema } from '@/lib/validations/auth'

type FormState = {
    error?: string | null
    message?: string | null
    twoFactorRequired?: boolean
    userId?: string
} | null

// --- HELPER: RECORD LOG ---
async function recordLogin(userId: string) {
    const headersList = await headers()
    // [NOTE] Pastikan server Anda (Vercel/Nginx) menimpa header ini dari upstream yang terpercaya.
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
        // Jangan log error detail database ke console production untuk menghindari kebocoran struktur
        console.error("Gagal mencatat log login")
    }
}

// --- 1. LOGIN ACTION ---
export async function loginAction(prevState: FormState, formData: FormData) {
    const rawData = {
        email: formData.get('email'),
        password: formData.get('password'),
    }

    const validatedFields = loginSchema.safeParse(rawData)
    if (!validatedFields.success) return { error: "Format input tidak valid." }

    const { email, password } = validatedFields.data
    const supabase = await createClient()

    // Variabel untuk menyimpan data user setelah lolos try-catch
    let userToRedirect = null;

    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            // ✅ DEBUG: Ubah sementara agar kita tahu alasan aslinya
            console.error("SUPABASE AUTH ERROR:", authError.message)
            return { error: `Auth Error: ${authError.message}` }
        }

        if (!authData.user) return { error: "User tidak ditemukan." }

        const userResult = await db.select()
            .from(users)
            .where(ilike(users.email, email))
            .limit(1)

        const userProfile = userResult[0]

        if (!userProfile) {
            await supabase.auth.signOut()
            return { error: "Profil database tidak ditemukan. Hubungi Admin." }
        }

        if (userProfile.twoFactorEnabled) {
            return {
                twoFactorRequired: true,
                userId: userProfile.id,
                error: null
            }
        }

        await recordLogin(userProfile.id)
        await createSession(userProfile.id, userProfile.role)

        // Simpan tanda sukses
        userToRedirect = true;

    } catch (error) {
        // Jika ini adalah error redirect internal Next.js, lemparkan kembali
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error;

        console.error('Login Error (Internal):', error)
        return { error: "Terjadi kesalahan pada server internal." }
    }

    // ✅ Pindahkan redirect ke LUAR blok try-catch
    if (userToRedirect) {
        redirect('/dashboard')
    }
}
// --- 2. VERIFY 2FA ACTION ---
export async function verifyTwoFactorAction(userId: string, token: string) {
    if (!token || token.length !== 6) {
        return { error: "Format kode OTP tidak valid." }
    }

    try {
        const userResult = await db.select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)

        const user = userResult[0]

        // [SECURE] Jika user tidak ditemukan saat verify step, jangan beri info detail
        if (!user) return { error: "Verifikasi gagal." }

        const isValid = user.twoFactorSecret && authenticator.verify({
            token,
            secret: user.twoFactorSecret
        })

        if (!isValid) {
            return { error: "Kode OTP tidak valid atau kedaluwarsa." }
        }

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
    await supabase.auth.signOut()
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
        return { error: "Gagal menghubungkan ke Google." }
    }

    if (data.url) {
        redirect(data.url)
    }
}