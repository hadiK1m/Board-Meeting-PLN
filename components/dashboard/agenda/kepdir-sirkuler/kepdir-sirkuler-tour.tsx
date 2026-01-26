"use client";

import React, { useEffect, useRef, useState } from "react";

type Step = {
    selector?: string;
    title: string;
    content: string;
    placement?: "top" | "bottom" | "left" | "right";
    textFallbacks?: string[]; // fallback untuk mencari elemen berdasarkan teks
};

const STEPS: Step[] = [
    {
        selector: "h1, h2, .text-2xl, .text-3xl",
        title: "Kepdir Sirkuler",
        content: "Halaman Kepdir Sirkuler — lihat daftar usulan dan buat usulan baru dari sini.",
        placement: "bottom",
    },
    {
        // kolom pencarian (cari input dengan placeholder atau class pl-10)
        selector: "input[placeholder], input.pl-10, input[class*='pl-10']",
        title: "Kolom Pencarian",
        content: "Gunakan kolom pencarian untuk menemukan usulan berdasarkan judul atau pemrakarsa.",
        placement: "bottom",
    },
    {
        // filter/status select — fallback mencari teks "Status" atau "Jenis Rapat"
        selector: "select, .w-44.h-11, .select-trigger, [role='combobox']",
        title: "Filter / Pilihan",
        content: "Gunakan filter untuk menyaring jenis atau status usulan.",
        placement: "bottom",
        textFallbacks: ["Status", "Jenis Rapat", "Filter Tanggal"],
    },
    {
        // tombol tambah — cari tombol yang mengandung kata 'Tambah' atau modal trigger AddKepdir
        title: "Tambah Usulan",
        content: "Klik tombol ini untuk menambah usulan Kepdir Sirkuler baru.",
        placement: "left",
        textFallbacks: ["Tambah", "Tambah Usulan", "Buat Usulan", "Tambah Kepdir", "Form Usulan"],
    },
    {
        // daftar: fallback ke elemen table atau container daftar
        selector: "table, #agenda-table-section, .bg-white.rounded-xl, .grid",
        title: "Daftar Usulan",
        content: "Daftar usulan ditampilkan di sini. Klik item untuk melihat detail.",
        placement: "top",
        textFallbacks: ["Daftar", "Judul", "Pemrakarsa"],
    },
];

const STORAGE_KEY = "bm:onboard:kepdir-sirkuler:done";

function findByTextFallback(texts: string[]) {
    if (!texts || texts.length === 0) return null;
    // search buttons first (and elements that often act as triggers)
    const candidates = Array.from(document.querySelectorAll("button, a, [role='button'], [role='combobox'], select, input, div"));
    for (const t of texts) {
        const lower = t.toLowerCase();
        const el = candidates.find((el) => {
            const txt = (el.textContent || el.getAttribute("aria-label") || "").toLowerCase().trim();
            return txt.includes(lower);
        });
        if (el) return el as HTMLElement;
    }
    return null;
}

function resolveElement(step: Step) {
    // 1) try selector
    if (step.selector) {
        try {
            const el = document.querySelector(step.selector) as HTMLElement | null;
            if (el) return el;
            // if selector looks like a group, try more permissive queries
            const parts = step.selector.split(",").map(s => s.trim());
            for (const p of parts) {
                const found = document.querySelector(p) as HTMLElement | null;
                if (found) return found;
            }
        } catch {
            // ignore
        }
    }

    // 2) try text fallbacks
    if (step.textFallbacks && step.textFallbacks.length) {
        const byText = findByTextFallback(step.textFallbacks);
        if (byText) return byText;
    }

    // 3) try generic fallbacks: table, main content, first large card/list
    const table = document.querySelector("table");
    if (table) return table as HTMLElement;

    const listContainer =
        document.querySelector("#agenda-table-section") ||
        document.querySelector(".bg-white.rounded-xl") ||
        document.querySelector(".grid") ||
        document.querySelector(".space-y-6");

    return (listContainer as HTMLElement) || null;
}

export default function KepdirSirkulerTour() {
    const [active, setActive] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        try {
            const done = localStorage.getItem(STORAGE_KEY);
            const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
            const force = urlParams?.get("tour") === "1";
            if (!done || force) {
                timerRef.current = window.setTimeout(() => setActive(true), 300);
            }
        } catch {
            // ignore
        }
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, []);

    // allow external trigger from header button
    useEffect(() => {
        const handler = () => {
            setStepIndex(0);
            setActive(true);
            setTargetRect(null);
        };
        window.addEventListener("bm:tour:start", handler);
        return () => window.removeEventListener("bm:tour:start", handler);
    }, []);

    useEffect(() => {
        if (!active) return;
        const step = STEPS[stepIndex];

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const el = resolveElement(step);

        if (el) {
            // scroll into view and measure after short delay
            try {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            } catch { }
            timerRef.current = window.setTimeout(() => {
                try {
                    const rect = el.getBoundingClientRect();
                    setTargetRect(rect);
                } catch {
                    setTargetRect(null);
                }
            }, 300);
        } else {
            // fallback: center screen
            timerRef.current = window.setTimeout(() => {
                setTargetRect(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }, 0);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [active, stepIndex]);

    if (!active) return null;
    const step = STEPS[stepIndex];
    if (!step) return null;

    const close = (markDone = false) => {
        setActive(false);
        if (markDone) {
            try {
                localStorage.setItem(STORAGE_KEY, "1");
            } catch { }
        }
    };

    const next = () => {
        if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1);
        else close(true);
    };
    const prev = () => {
        if (stepIndex > 0) setStepIndex(stepIndex - 1);
    };

    const tooltipStyle: React.CSSProperties = { position: "fixed", zIndex: 99999, maxWidth: 360 };
    if (targetRect) {
        const margin = 12;
        switch (step.placement) {
            case "top":
                tooltipStyle.left = Math.max(8, targetRect.left + targetRect.width / 2 - 180);
                tooltipStyle.top = Math.max(8, targetRect.top - 140 - margin);
                break;
            case "left":
                tooltipStyle.left = Math.max(8, targetRect.left - 380 - margin);
                tooltipStyle.top = Math.max(8, targetRect.top + targetRect.height / 2 - 60);
                break;
            case "right":
                tooltipStyle.left = Math.min(window.innerWidth - 360 - 8, targetRect.right + margin);
                tooltipStyle.top = Math.max(8, targetRect.top + targetRect.height / 2 - 60);
                break;
            default:
                tooltipStyle.left = Math.max(8, targetRect.left + targetRect.width / 2 - 180);
                tooltipStyle.top = Math.min(window.innerHeight - 140 - 8, targetRect.bottom + margin);
        }
    } else {
        tooltipStyle.left = Math.max(8, window.innerWidth / 2 - 180);
        tooltipStyle.top = Math.max(8, window.innerHeight / 2 - 80);
    }

    return (
        <>
            <div
                aria-hidden
                style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", zIndex: 99990, pointerEvents: "auto" }}
                onClick={() => close(true)}
            />

            {targetRect && (
                <div
                    style={{
                        position: "fixed",
                        left: Math.max(0, targetRect.left - 4),
                        top: Math.max(0, targetRect.top - 4),
                        width: Math.min(window.innerWidth - (targetRect.left - 4), targetRect.width + 8),
                        height: Math.min(window.innerHeight - (targetRect.top - 4), targetRect.height + 8),
                        borderRadius: 8,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.08) inset",
                        border: "2px solid rgba(255,255,255,0.92)",
                        zIndex: 99995,
                        pointerEvents: "none",
                        transition: "all 0.18s cubic-bezier(.4,2,.6,1)",
                    }}
                />
            )}

            <div style={tooltipStyle} role="dialog" aria-modal="true">
                <div
                    style={{
                        background: "white",
                        color: "#0f172a",
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: "0 8px 30px rgba(2,6,23,0.4)",
                        fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
                        zIndex: 99999,
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#125d72", textTransform: "uppercase", letterSpacing: "0.06em" }}>{step.title}</div>
                            <div style={{ fontSize: 13, marginTop: 6 }}>{step.content}</div>
                        </div>
                        <div style={{ marginLeft: 8 }}>
                            <button onClick={() => close(true)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer" }} title="Lewati">
                                Lewati
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={prev} disabled={stepIndex === 0} style={{ padding: "8px 12px", background: stepIndex === 0 ? "#f1f5f9" : "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, cursor: stepIndex === 0 ? "not-allowed" : "pointer" }}>
                                Sebelumnya
                            </button>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => close(true)} style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}>
                                Lewati
                            </button>

                            <button onClick={next} style={{ padding: "8px 12px", background: "#125d72", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
                                {stepIndex === STEPS.length - 1 ? "Selesai" : "Berikutnya"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}