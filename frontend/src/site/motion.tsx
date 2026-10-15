import { ReactNode, useEffect, useRef, useState } from 'react'

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Adds .in to every .rv element once it scrolls into view. Without IntersectionObserver or with reduced motion everything is shown at once. */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.rv'))
    if (reduced() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
}

export function Rv({ children, d = 0, as: T = 'div', className = '' }: { children: ReactNode; d?: number; as?: 'div' | 'li' | 'article'; className?: string }) {
  return <T className={`rv ${className}`} style={{ ['--d' as string]: `${d}ms` }}>{children}</T>
}

/** Counts up to `to` when first visible. */
export function Count({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [v, setV] = useState(reduced() ? to : 0)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced()) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const f = (t: number) => { const k = Math.min(1, (t - t0) / 1200); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(f) }
      requestAnimationFrame(f)
    }, { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{v}{suffix}</span>
}

/** Muted looping product video; falls back to the poster image if autoplay is blocked or motion is reduced. */
export function TourVideo({ className = '', controls = false, autoPlay = true }: { className?: string; controls?: boolean; autoPlay?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v || !autoPlay || reduced()) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }, { threshold: 0.25 })
    io.observe(v)
    return () => io.disconnect()
  }, [autoPlay])
  return (
    <video ref={ref} className={className} poster="/video/tour-poster.jpg" muted loop playsInline preload="metadata" controls={controls} aria-label="Product walkthrough video">
      <source src="/video/tour.webm" type="video/webm" /><source src="/video/tour.mp4" type="video/mp4" />
    </video>
  )
}

/** Thin page-scroll progress bar; updates via transform only. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const f = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const h = document.documentElement.scrollHeight - window.innerHeight
      el.style.transform = `scaleX(${h > 0 ? Math.min(1, window.scrollY / h) : 0})`
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(f) }
    f()
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on)
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return <div className="gl-progress" ref={ref} aria-hidden="true" />
}

/** Headline that reveals word by word. Parts flagged `hl` get the gradient accent. */
export function Words({ parts }: { parts: { t: string; hl?: boolean }[] }) {
  let i = 0
  return (
    <>
      {parts.flatMap((p, pi) => p.t.split(' ').filter(Boolean).map((w, wi) => {
        const k = i++
        return <span key={`${pi}-${wi}`}><span className={`gl-w ${p.hl ? 'hl' : ''}`} style={{ ['--i' as string]: k }}>{w}</span>{' '}</span>
      }))}
    </>
  )
}

/** Small pointer-driven 3D tilt for the hero product card (fine pointers only, off for reduced motion). */
export function Tilt({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reduced() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    let raf = 0
    const move = (e: PointerEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const r = el.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        el.style.setProperty('--gl-ry', `${(x * 7).toFixed(2)}deg`)
        el.style.setProperty('--gl-rx', `${(-y * 6).toFixed(2)}deg`)
      })
    }
    const leave = () => { el.style.setProperty('--gl-ry', '0deg'); el.style.setProperty('--gl-rx', '0deg') }
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return <div ref={ref} className={`gl-tilt ${className}`}>{children}</div>
}
