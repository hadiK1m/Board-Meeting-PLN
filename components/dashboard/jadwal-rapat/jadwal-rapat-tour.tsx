"use client";

import React, { useEffect, useRef, useState } from "react";

type Step = {
    selector: string;
    title: string;
    content: string;
    placement?: "top" | "bottom" | "left" | "right";
};

const STEPS: Step[] = [
    {
        selector: "h1.text-3xl, h1.text-3xl.font-extrabold",
        title: "Jadwal Rapat",
        content: "Halaman ini menampilkan jadwal rapat yang telah ditetapkan. Mulai dari sini Anda dapat meninjau agenda yang sudah dijadwalkan.",
        placement: "bottom",
    },
    {
        selector: "input.pl-10, input[class*='pl-10']",
        title: "Pencarian Agenda",
        content: "Gunakan kolom pencarian untuk menemukan agenda berdasarkan judul atau pemrakarsa.",
        placement: "bottom",
    },
    {
        selector: ".w-44.h-11, .w-44, .select-trigger, select",
        title: "Filter Jenis Rapat",
        content: "Ubah filter 'Jenis Rapat' untuk menampilkan RADIR atau RAKORDIR saja.",
        placement: "bottom",
    },
    {
        selector: "div.space-y-6, .space-y-6",
        title: "Daftar Agenda",
        content: "Daftar agenda / kartu rapat muncul di sini. Klik baris agenda untuk membuka detail atau jadwalkan agenda.",
        placement: "top",
    },
];

const STORAGE_KEY = "bm:onboard:jadwal-rapat:done";

export default function JadwalRapatTour() {
    const [active, setActive] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        // Auto-show only if not done, or when ?tour=1
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

    // allow external trigger (button in header dispatches bm:tour:start)
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

        if (!step) {
            timerRef.current = window.setTimeout(() => setTargetRect(null), 0);
            return () => {
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
            };
        }

        const el = document.querySelector(step.selector) as HTMLElement | null;

        if (el) {
            // Scroll to element then measure
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            timerRef.current = window.setTimeout(() => {
                try {
                    const rect = el.getBoundingClientRect();
                    setTargetRect(rect);
                } catch {
                    setTargetRect(null);
                }
            }, 300);
        } else {
            // fallback center
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

    const tooltipStyle: React.CSSProperties = { position: "fixed", zIndex: 99999, maxWidth: 380 };
    if (targetRect) {
        const margin = 12;
        switch (step.placement) {
            case "top":
                tooltipStyle.left = Math.max(8, targetRect.left + targetRect.width / 2 - 190);
                tooltipStyle.top = Math.max(8, targetRect.top - 160 - margin);
                break;
            case "left":
                tooltipStyle.left = Math.max(8, targetRect.left - 400 - margin);
                tooltipStyle.top = Math.max(8, targetRect.top + targetRect.height / 2 - 60);
                break;
            case "right":
                tooltipStyle.left = Math.min(window.innerWidth - 380 - 8, targetRect.right + margin);
                tooltipStyle.top = Math.max(8, targetRect.top + targetRect.height / 2 - 60);
                break;
            default:
                tooltipStyle.left = Math.max(8, targetRect.left + targetRect.width / 2 - 190);
                tooltipStyle.top = Math.min(window.innerHeight - 160 - 8, targetRect.bottom + margin);
        }
    } else {
        tooltipStyle.left = Math.max(8, window.innerWidth / 2 - 190);
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
                        left: targetRect.left - 8,
                        top: targetRect.top - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                        borderRadius: 8,
                        boxShadow: "0 8px 30px rgba(0,0,0,0.6), 0 0 0 3px rgba(255,255,255,0.06) inset",
                        border: "2px solid rgba(255,255,255,0.85)",
                        zIndex: 99995,
                        pointerEvents: "none",
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