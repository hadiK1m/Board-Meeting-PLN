import { LoginForm } from "@/components/auth/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login - Board Meeting PLN",
    description: "Masuk ke aplikasi Board Meeting",
};

export default function LoginPage() {
    return <LoginForm />;
}