'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
// ✅ PERBAIKAN 1: Import nama fungsi yang benar dari file server action baru
import { loginAction, verifyTwoFactorAction } from '@/server/actions/auth-actions';

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // State untuk menangani mode 2FA
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [tempUserId, setTempUserId] = useState<string | null>(null);

    // Handler Login Utama (Step 1)
    const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);

        // ✅ PERBAIKAN 2: Panggil 'loginAction' (bukan login)
        const result = await loginAction(null, formData);

        if (result?.error) {
            setErrorMessage(result.error);
            setIsLoading(false);
        } else if (result?.twoFactorRequired && result.userId) {
            setTempUserId(result.userId);
            setShowTwoFactor(true);
            setIsLoading(false);
            setErrorMessage(null);
        } else {
            // Login sukses, redirect ditangani server atau kita set loading UI
            setIsRedirecting(true);
        }
    };

    // Handler Verifikasi OTP (Step 2)
    const handleOTPSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!tempUserId) return;

        setIsLoading(true);
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);
        const token = formData.get('otp') as string;

        // ✅ PERBAIKAN 3: Panggil 'verifyTwoFactorAction' (bukan verifyLoginTwoFactor)
        const result = await verifyTwoFactorAction(tempUserId, token);

        if (result?.error) {
            setErrorMessage(result.error);
            setIsLoading(false);
        } else {
            setIsRedirecting(true);
        }
    };

    // --- TAMPILAN 1: FORM INPUT OTP ---
    if (showTwoFactor) {
        return (
            <div className="w-full animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Verifikasi 2FA</h1>
                        <p className="text-slate-500 text-sm">Masukkan kode dari Google Authenticator</p>
                    </div>
                </div>

                {errorMessage && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-medium text-sm">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleOTPSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[15px] font-semibold text-slate-900 mb-2">Kode 6-Digit</label>
                        <input
                            name="otp"
                            type="text"
                            maxLength={6}
                            autoFocus
                            placeholder="123456"
                            className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                            disabled={isLoading || isRedirecting}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || isRedirecting}
                        className="w-full bg-[#121212] hover:bg-slate-800 text-white py-4 px-4 rounded-xl font-bold text-lg transition-all shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isRedirecting ? (
                            <><Loader2 className="animate-spin" /> Mengarahkan...</>
                        ) : isLoading ? (
                            <><Loader2 className="animate-spin" /> Verifikasi</>
                        ) : (
                            'Verifikasi Login'
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setShowTwoFactor(false); setTempUserId(null); }}
                        className="w-full text-slate-500 hover:text-slate-900 text-sm font-medium flex items-center justify-center gap-2 mt-4"
                        disabled={isLoading || isRedirecting}
                    >
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Login
                    </button>
                </form>
            </div>
        );
    }

    // --- TAMPILAN 2: FORM LOGIN BIASA ---
    return (
        <div className="w-full min-h-screen flex flex-col justify-center px-0">
            <div className="flex items-center gap-3 mb-10">
                <div className="relative h-12 w-12">
                    <Image
                        src="/logo-pln.png"
                        alt="Logo PLN"
                        width={48}
                        height={48}
                        className="h-full w-auto object-contain"
                        priority
                    />
                </div>
                <span className="font-bold text-2xl tracking-tight text-slate-900">Board Meeting PLN</span>
            </div>

            <div className="mb-8">
                <h1 className="text-[32px] font-bold tracking-tight text-slate-900 mb-2">Masuk ke Portal</h1>
                <p className="text-slate-400 text-lg">Akses dokumen dan agenda rapat direksi.</p>
            </div>

            {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="text-red-600 font-medium text-sm">
                        {errorMessage}
                    </div>
                </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                    <label className="block text-[15px] font-semibold text-slate-900 mb-2">Alamat Email</label>
                    <input
                        name="email"
                        type="email"
                        required
                        className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                        placeholder="nama@pln.co.id"
                        disabled={isLoading || isRedirecting}
                    />
                </div>

                <div>
                    <label className="block text-[15px] font-semibold text-slate-900 mb-2">Kata Sandi</label>
                    <div className="relative">
                        <input
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none pr-12"
                            placeholder="••••••••"
                            disabled={isLoading || isRedirecting}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            disabled={isLoading || isRedirecting}
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input type="checkbox" name="remember" className="peer sr-only" disabled={isLoading || isRedirecting} />
                            <div className="w-6 h-6 border-2 border-slate-200 rounded-md bg-white peer-checked:bg-blue-700 peer-checked:border-blue-700 transition-all"></div>
                            <svg className="absolute left-1 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <span className="text-[16px] font-medium text-slate-900">Ingat Saya</span>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || isRedirecting}
                    className="w-full bg-[#121212] hover:bg-slate-800 text-white py-4 px-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                >
                    {isRedirecting ? (
                        <><Loader2 className="animate-spin" /> Mengarahkan...</>
                    ) : isLoading ? (
                        <><Loader2 className="animate-spin" /> Memproses...</>
                    ) : (
                        'Masuk Sekarang'
                    )}
                </button>
            </form>

            <div className="relative my-10">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                <div className="relative flex justify-center text-[17px]">
                    <span className="bg-white px-4 text-slate-500 text-sm">PLN Board Portal v2.0</span>
                </div>
            </div>
        </div>
    );
}