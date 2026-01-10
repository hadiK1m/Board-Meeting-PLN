import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email({ message: "Email tidak valid" }),
    password: z.string().min(6, { message: "Password minimal 6 karakter" }),
});

export type LoginInput = z.infer<typeof loginSchema>;