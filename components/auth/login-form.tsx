"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, LoginInput } from "@/lib/validations/auth" // Pastikan file ini ada
import { loginAction, loginWithGoogleAction } from "@/server/actions/auth-actions" // Pastikan file ini ada
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Loader2 } from "lucide-react"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
    const [isPending, startTransition] = useTransition()

    const form = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    async function onSubmit(data: LoginInput) {
        startTransition(async () => {
            const result = await loginAction(data)
            if (result?.error) {
                form.setError("root", { message: result.error })
            }
        })
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            {/* 1. Header Section */}
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Login ke Akun Anda</h1>
                <p className="text-muted-foreground text-sm text-balance">
                    Masukkan email perusahaan Anda di bawah ini
                </p>
            </div>

            {/* 2. Form Section */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">

                    {/* Email Field */}
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="nama@pln.co.id"
                                        type="email"
                                        required
                                        disabled={isPending}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Password Field */}
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <FormLabel>Password</FormLabel>
                                    <a
                                        href="#"
                                        className="ml-auto text-sm underline-offset-4 hover:underline text-muted-foreground"
                                    >
                                        Lupa password?
                                    </a>
                                </div>
                                <FormControl>
                                    <Input
                                        type="password"
                                        required
                                        disabled={isPending}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Global Error Message */}
                    {form.formState.errors.root && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md text-center font-medium">
                            {form.formState.errors.root.message}
                        </div>
                    )}

                    {/* Submit Button */}
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
                    </Button>
                </form>
            </Form>

            {/* 3. Separator Section */}
            <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                <span className="relative z-10 bg-background px-2 text-muted-foreground">
                    Atau lanjut dengan
                </span>
            </div>

            {/* 4. Google Auth Button */}
            <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={() => loginWithGoogleAction()}
                disabled={isPending}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                    />
                </svg>
                Login dengan Google
            </Button>

            {/* 5. Footer Text */}
            <div className="text-center text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <a href="#" className="underline underline-offset-4 hover:text-primary">
                    Hubungi Admin
                </a>
            </div>
        </div>
    )
}