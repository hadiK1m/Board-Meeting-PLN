"use client"

import React, { useEffect, useState, useRef } from "react"

type Step = {
    selector: string
    title: string
    content: string
    placement?: "top" | "bottom" | "left" | "right"
}

const STEPS: Step[] = [
    {
        selector: "h2.text-3xl",
        title: "Executive Dashboard",
        content: "Ringkasan aktivitas rapat dan kartu metrik utama.",
        placement: "bottom",
    },
    {
        selector: "div.grid.gap-6, div.grid.grid-cols-1, div.lg\\:grid-cols-3",
        title: "Kartu Ringkasan",
        content: "Lihat ringkasan 3 metrik teratas di sini.",
        placement: "bottom",
    },
    {
        selector: "#agenda-table-section",
        title: "Daftar Agenda",
        content: "Di sini Anda dapat melihat daftar agenda yang terjadwal atau siap rapat.",
        placement: "top",
    },
]

const STORAGE_KEY = "bm:onboard:dashboard:done"

export default function OnboardingTour() {
    const [active, setActive] = useState<boolean>(false)
    const [stepIndex, setStepIndex] = useState<number>(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const timerRef = useRef<number | null>(null)

    // Init: auto-show jika belum pernah selesai, atau jika query param ?tour=1
    useEffect(() => {
        try {
            const done = localStorage.getItem(STORAGE_KEY)
            const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
            const force = urlParams?.get("tour") === "1"
            if (!done || force) {
                timerRef.current = window.setTimeout(() => setActive(true), 400)
            }
        } catch {
            // ignore
        }
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
        }
    }, [])

    // Listen for external trigger (e.g., tombol di header)
    useEffect(() => {
        const handler = () => {
            // reset to first step and show
            setStepIndex(0)
            setActive(true)
            // also reset targetRect to force recalculation
            setTargetRect(null)
        }
        window.addEventListener("bm:tour:start", handler)
        return () => window.removeEventListener("bm:tour:start", handler)
    }, [])

    // Update highlight target when active or stepIndex changes
    useEffect(() => {
        if (!active) return
        const step = STEPS[stepIndex]

        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }

        if (!step) {
            timerRef.current = window.setTimeout(() => {
                setTargetRect(null)
            }, 0)
            return () => {
                if (timerRef.current) {
                    clearTimeout(timerRef.current)
                    timerRef.current = null
                }
            }
        }

        const el = document.querySelector(step.selector) as HTMLElement | null

        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" })
            timerRef.current = window.setTimeout(() => {
                try {
                    const rect = el.getBoundingClientRect()
                    setTargetRect(rect)
                } catch {
                    setTargetRect(null)
                }
            }, 350)
        } else {
            timerRef.current = window.setTimeout(() => {
                setTargetRect(null)
                window.scrollTo({ top: 0, behavior: "smooth" })
            }, 0)
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
        }
    }, [active, stepIndex])

    if (!active) return null
    const step = STEPS[stepIndex]
    if (!step) return null

    const close = (markDone = false) => {
        setActive(false)
        if (markDone) {
            try {
                localStorage.setItem(STORAGE_KEY, "1")
            } catch { }
        }
    }

    const next = () => {
        if (stepIndex < STEPS.length - 1) setStepIndex(stepIndex + 1)
        else close(true)
    }
    const prev = () => {
        if (stepIndex > 0) setStepIndex(stepIndex - 1)
    }

    // compute tooltip position
    const tooltipStyle: React.CSSProperties = { position: "fixed", zIndex: 99999, maxWidth: 360 }
    if (targetRect) {
        const margin = 12
        switch (step.placement) {
            case "top":
                tooltipStyle.left = Math.max(8, targetRect.left + targetRect.width / 2 - 180)
                tooltipStyle.top = Math.max(8, targetRect.top - 140 - margin)
                break
            case "left":
                tooltipStyle.left = Math.max(8, targetRect.left - 380 - margin)
                tooltipStyle.top = Math.max(8, targetRect.top + targetRect.height / 2 - 60)
                break
            case "right":
                tooltipStyle.left = Math.min(window.innerWidth - 360 - 8, targetRect.right + margin)
                tooltipStyle.top = Math.max(8, targetRect.top + targetRect.height / 2 - 60)
                break
            default: // bottom
                tooltipStyle.left = Math.max(8, targetRect.left + targetRect.width / 2 - 180)
                tooltipStyle.top = Math.min(window.innerHeight - 140 - 8, targetRect.bottom + margin)
        }
    } else {
        // center
        tooltipStyle.left = Math.max(8, window.innerWidth / 2 - 180)
        tooltipStyle.top = Math.max(8, window.innerHeight / 2 - 80)
    }

    return (
        <>
            {/* Backdrop */}
            <div
                aria-hidden
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(2,6,23,0.6)",
                    zIndex: 99990,
                    pointerEvents: "auto",
                }}
                onClick={() => close(true)}
            />

            {/* Highlight box */}
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

            {/* Tooltip */}
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
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#125d72", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                {step.title}
                            </div>
                            <div style={{ fontSize: 13, marginTop: 6 }}>{step.content}</div>
                        </div>
                        <div style={{ marginLeft: 8 }}>
                            <button
                                onClick={() => close(true)}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#64748b",
                                    cursor: "pointer",
                                }}
                                aria-label="Skip tour"
                                title="Skip tour"
                            >
                                Lewati
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={prev}
                                disabled={stepIndex === 0}
                                style={{
                                    padding: "8px 12px",
                                    background: stepIndex === 0 ? "#f1f5f9" : "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 8,
                                    cursor: stepIndex === 0 ? "not-allowed" : "pointer",
                                }}
                            >
                                Sebelumnya
                            </button>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={() => close(true)}
                                style={{
                                    padding: "8px 12px",
                                    background: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                }}
                            >
                                Lewati
                            </button>

                            <button
                                onClick={next}
                                style={{
                                    padding: "8px 12px",
                                    background: "#125d72",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                }}
                            >
                                {stepIndex === STEPS.length - 1 ? "Selesai" : "Berikutnya"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}