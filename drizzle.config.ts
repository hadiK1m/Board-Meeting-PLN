import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Membaca file .env.local secara manual
dotenv.config({
    path: ".env.local",
});

export default defineConfig({
    schema: "./db/schema.ts", // Sesuaikan dengan lokasi schema Anda
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL!, // Pastikan di .env.local namanya DATABASE_URL
    },
});