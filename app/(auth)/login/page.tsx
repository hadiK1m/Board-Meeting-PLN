import { DashboardMockup } from '@/components/auth/dashboard-mockup';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
    return (
        <div className="flex min-h-screen w-full bg-white font-sans overflow-hidden">

            {/* Left Section: Visual Mockup (62% Width) */}
            <div className="hidden lg:flex lg:w-[62%] bg-[#F9FAFB] items-center justify-center p-16 relative overflow-hidden">

                {/* Decorative elements background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.4] pointer-events-none">
                    {/* Blob Kanan Atas */}
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-200/50 rounded-full blur-[120px]"></div>

                    {/* Blob Kiri Bawah (Menggunakan custom spacing w-125) */}
                    <div className="absolute bottom-0 left-1/4 w-125 h-125 bg-slate-100/50 rounded-full blur-[150px]"></div>
                </div>

                {/* Subtle grid background */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
                </div>

                {/* Wavy dashed line circles (Animations) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 border border-dashed border-slate-200 rounded-full opacity-40 animate-[spin_60s_linear_infinite] pointer-events-none"></div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 border border-dashed border-slate-100 rounded-full opacity-30 animate-[spin_100s_linear_infinite_reverse] pointer-events-none"></div>

                {/* The Mockup Component */}
                <div className="relative z-10 w-full max-w-2xl transform transition-all duration-700 ease-in-out">
                    <DashboardMockup />
                </div>
            </div>

            {/* Right Section: Login Form (38% Width) */}
            {/* PERBAIKAN: Menghapus div pembungkus tambahan yang membuat form gepeng */}
            <div className="w-full lg:w-[38%] flex flex-col justify-center items-center px-6 md:px-12 lg:px-20 py-12 bg-white border-l border-slate-100 z-10 relative shadow-xl lg:shadow-none">
                <LoginForm />
            </div>
        </div>
    );
}