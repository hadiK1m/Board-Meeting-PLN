/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = process.env.SESSION_SECRET || "default-secret-key-jangan-lupa-ganti";
const key = new TextEncoder().encode(secretKey);

const SESSION_DURATION = 60 * 60 * 24 * 7; // 1 Minggu

export async function encrypt(payload: any) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(key);
}

export async function decrypt(session: string | undefined = "") {
    try {
        const { payload } = await jwtVerify(session, key, {
            algorithms: ["HS256"],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function createSession(userId: string, role: string | null) {
    const expires = new Date(Date.now() + SESSION_DURATION * 1000);
    const session = await encrypt({ userId, role, expires });

    // Simpan ke Cookies
    const cookieStore = await cookies();
    cookieStore.set("session", session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: expires,
        sameSite: "lax",
        path: "/",
    });
}

export async function verifySession() {
    const cookieStore = await cookies();
    const cookie = cookieStore.get("session")?.value;
    const session = await decrypt(cookie);

    if (!session?.userId) {
        return null;
    }

    return { isAuth: true, userId: session.userId as string, role: session.role as string };
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete("session");
}