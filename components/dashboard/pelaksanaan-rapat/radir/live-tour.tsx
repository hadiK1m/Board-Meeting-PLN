"use client"

import React, { useEffect, useRef, useState } from "react"

/**
 * Live page tour - highlight specific JSX blocks (resolver functions included).
 * Trigger: window.dispatchEvent(new Event("bm:tour:start")) or visit ?tour=1
 */

type Step = {
    selector: string // can be CSS selector or special fn:<key>
    title: string
    content: string
    placement?: "top" | "bottom" | "left" | "right"
}

const STEPS: Step[] = [
    {
        selector: "fn:editor-header",
        title: "Editor Risalah",
        content: "Area editor tempat menulis ringkasan / pertimbangan rapat.",
        placement: "bottom",
    },
    {
        selector: "fn:toolbar",
        title: "Toolbar Editor",
        content: "Kontrol formatting, list, dan indent tersedia di sini.",
        placement: "bottom",
    },
    {
        selector: "fn:export-button",
        title: "Export Dokumen",
        content: "Gunakan tombol ini untuk mengunduh hasil risalah (DOCX).",
        placement: "left",
    },
    {
        selector: "fn:save-button",
        title: "Aksi Rapat",
        content: "Simpan progres, selesaikan rapat, atau kirim notifikasi dari tombol-tombol ini.",
        placement: "top",
    },
]

const STORAGE_KEY = "bm:onboard:radir-live:done"

function resolveSpecial(selectorKey: string): HTMLElement | null {
    try {
        switch (selectorKey) {
            case "editor-header": {
                // Prefer exact CardHeader classes if present
                const byClass = document.querySelector(
                    "div.bg-white.border-b.border-slate-100.py-4.px-6"
                ) as HTMLElement | null
                if (byClass) return byClass

                // fallback: find CardTitle text "Penyusunan Risalah" or similar
                const byText = Array.from(document.querySelectorAll("h1,h2,div")).find((el) =>
                    /Penyusunan Risalah|Ringkasan Eksekutif|DASAR PERTIMBANGAN/i.test(el.textContent ?? "")
                ) as HTMLElement | undefined
                return byText ?? null
            }

            case "toolbar": {
                // Prefer exact toolbar container (sticky, z-20)
                const byClass = document.querySelector("div.sticky.top-0.z-20") as HTMLElement | null
                if (byClass) return byClass

                // fallback: find ProseMirror sibling toolbar area
                const pm = document.querySelector(".ProseMirror") as HTMLElement | null
                if (pm) {
                    // try previous sibling that looks like toolbar
                    const prev = pm.previousElementSibling as HTMLElement | null
                    if (prev && /toolbar|flex/.test(prev.className || "")) return prev
                }

                // generic fallback: find element that contains buttons for bold/italic/undo
                const candidate = Array.from(document.querySelectorAll("div"))
                    .find((d) => d.textContent && /Bold|Italic|Undo|Redo|JUDUL|ARAHAN/i.test(d.textContent))
                return (candidate as HTMLElement) ?? null
            }

            case "export-button": {
                // Find button with text 'EXPORT DOCX' (case-insensitive)
                const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[]
                const byText = buttons.find((b) => (b.innerText || "").toUpperCase().includes("EXPORT DOCX"))
                if (byText) return byText

                // Fallback: button that contains <svg> Download icon
                const bySvg = buttons.find((b) => {
                    return !!b.querySelector("svg") && /download/i.test((b.querySelector("svg") as SVGElement)?.getAttribute("class") || "")
                })
                if (bySvg) return bySvg

                return null
            }

            case "save-button": {
                // Button that contains 'SIMPAN SEMUA RISALAH' (case-insensitive)
                const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[]
                const byText = buttons.find((b) => (b.innerText || "").toUpperCase().includes("SIMPAN SEMUA RISALAH"))
                if (byText) return byText

                // fallback: button with Save svg icon and prominent classes
                const byIcon = buttons.find((b) => {
                    return !!b.querySelector("svg") && /save/i.test((b.querySelector("svg") as SVGElement)?.getAttribute("class") || "")
                })
                return byIcon ?? null
            }

            default:
                return null
        }
    } catch {
        return null
    }
}

export default function LiveTour() {
    const [active, setActive] = useState(false)
    const [stepIndex, setStepIndex] = useState(0)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const timerRef = useRef<number | null>(null)

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

    useEffect(() => {
        const handler = () => {
            setStepIndex(0)
            setActive(true)
            setTargetRect(null)
        }
        window.addEventListener("bm:tour:start", handler)
        return () => window.removeEventListener("bm:tour:start", handler)
    }, [])

    useEffect(() => {
        if (!active) return
        const step = STEPS[stepIndex]
        if (!step) {
            setTimeout(() => setTargetRect(null), 0)
            return
        }

        if (timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
        }

        const selector = step.selector
        let el: HTMLElement | null = null

        if (selector.startsWith("fn:")) {
            const key = selector.slice(3)
            el = resolveSpecial(key)
        } else {
            el = document.querySelector(selector) as HTMLElement | null
        }

        if (el) {
            try { el.scrollIntoView({ behavior: "smooth", block: "center" }) } catch { /* noop */ }
            timerRef.current = window.setTimeout(() => {
                try {
                    const rect = el!.getBoundingClientRect()
                    setTargetRect(rect)
                } catch {
                    setTargetRect(null)
                }
            }, 350)
        } else {
            timerRef.current = window.setTimeout(() => {
                setTargetRect(null)
                window.scrollTo({ top: 0, behavior: "smooth" })
            }, 120)
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

    const rect = targetRect
    const tooltipStyle: React.CSSProperties = (() => {
        const base: React.CSSProperties = {
            position: "fixed",
            zIndex: 1201,
            maxWidth: 420,
            padding: 12,
            background: "white",
            borderRadius: 10,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            border: "1px solid rgba(0,0,0,0.06)",
        }
        if (!rect) return { ...base, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        if (step.placement === "top") return { ...base, left: Math.max(12, rect.left + rect.width / 2 - 200), top: Math.max(12, rect.top - rect.height - 12) }
        if (step.placement === "left") return { ...base, left: Math.max(12, rect.left - 440), top: Math.max(12, rect.top) }
        if (step.placement === "right") return { ...base, left: Math.min(window.innerWidth - 440, rect.right + 12), top: Math.max(12, rect.top) }
        return { ...base, left: Math.max(12, rect.left + rect.width / 2 - 200), top: Math.min(window.innerHeight - 120, rect.bottom + 12) }
    })()

    const highlightStyle: React.CSSProperties = rect ? {
        position: "fixed",
        zIndex: 1200,
        pointerEvents: "none",
        left: rect.left - 8,
        top: rect.top - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
        borderRadius: 8,
        outline: "3px solid rgba(255,255,255,0.9)",
        transition: "all 240ms ease",
    } : {}

    const close = (markDone = false) => {
        setActive(false)
        setStepIndex(0)
        setTargetRect(null)
        if (markDone) {
            try { localStorage.setItem(STORAGE_KEY, "1") } catch { /* ignore */ }
        }
    }

    const next = () => {
        if (stepIndex + 1 >= STEPS.length) close(true)
        else setStepIndex(stepIndex + 1)
    }

    const prev = () => {
        if (stepIndex > 0) setStepIndex(stepIndex - 1)
    }

    return (
        <>
            <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 1199, pointerEvents: "auto" }} onClick={() => close(false)} />
            {rect && <div style={highlightStyle} />}

            <div role="dialog" aria-modal style={tooltipStyle}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{step.title}</div>
                        <div style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>{step.content}</div>
                        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                            <button onClick={prev} disabled={stepIndex === 0} className="px-3 py-1 rounded-md border text-sm" aria-label="Sebelumnya">Sebelumnya</button>
                            <button onClick={next} className="px-3 py-1 rounded-md bg-[#125d72] text-white text-sm" aria-label="Lanjut"> {stepIndex + 1 >= STEPS.length ? "Selesai" : "Lanjut"} </button>
                            <div style={{ flex: 1 }} />
                            <button onClick={() => close(true)} className="text-xs text-slate-500 underline">Tandai selesai</button>
                            <button onClick={() => close(false)} className="text-xs text-slate-400 ml-2">Tutup</button>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: "#94a3b8" }}>{stepIndex + 1} / {STEPS.length}</div>
                    </div>
                </div>
            </div>
        </>
    )
}