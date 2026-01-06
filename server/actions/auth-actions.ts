'use server'

import { createClient } from '@/lib/supabase/server'
import { loginSchema, LoginInput } from '@/lib/validations/auth'
import { redirect } from 'next/navigation'

export async function loginAction(data: LoginInput) {
    const result = loginSchema.safeParse(data);

    if (!result.success) {
        return { error: "Data tidak valid" };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
    });

    if (error) {
        // Return error untuk ditampilkan di UI
        return { error: error.message };
    }

    // Redirect ditangani middleware atau client, tapi standardnya di sini
    redirect('/dashboard');
}

export async function signOutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}

export async function loginWithGoogleAction() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    if (data.url) {
        redirect(data.url);
    }
}