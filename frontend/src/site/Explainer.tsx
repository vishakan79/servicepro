import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import narration from './narration.json'

type Lang = 'en' | 'ta'

/** Chapters are timed against public/video/tour.mp4 (39 s). Text is original product copy, no real person is portrayed. */
const CUES = narration as { at: number; title: Record<Lang, string>; text: Record<Lang, string> }[]


/** Original illustrated guide (not based on any real person). Mouth moves while the walkthrough plays. */
function Guide({ talking }: { talking: boolean }) {
  return (
    <svg className={`guide ${talking ? 'talking' : ''}`} viewBox="0 0 120 120" role="img" aria-label="ServicePro guide, an illustrated character">
      <circle cx="60" cy="60" r="58" fill="#e8efff" />
      <path d="M22 118c2-24 18-34 38-34s36 10 38 34z" fill="#d9500a" />
      <path d="M48 84l12 12 12-12" fill="#fff" />
      <rect x="52" y="70" width="16" height="16" rx="6" fill="#c98f6b" />
      <ellipse cx="60" cy="52" rx="24" ry="27" fill="#d9a07a" />
      <path d="M34 50c-4-26 14-34 28-34s30 8 24 36c-4-14-12-20-26-20s-22 6-26 18z" fill="#1d1a2b" />
      <g className="eyes"><ellipse cx="50" cy="52" rx="3" ry="3.6" fill="#1d1a2b" /><ellipse cx="70" cy="52" rx="3" ry="3.6" fill="#1d1a2b" /></g>
      <path d="M44 45q6-4 11-1M65 44q6-3 11 1" stroke="#1d1a2b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="68" rx="7" ry="2.2" className="mouth" fill="#7a2e2e" />
      <path d="M33 56c-2 10 0 18 6 22" stroke="#1648b8" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M39 78q6 4 12 2" stroke="#1648b8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="52" cy="80" r="3" fill="#1648b8" />
    </svg>
  )
}

export default function Explainer() {
  const [lang, setLang] = useState<Lang>('en')
  const [voice, setVoice] = useState(false)
  const [voiceMissing, setVoiceMissing] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [idx, setIdx] = useState(0)
  const v = useRef<HTMLVideoElement>(null)
  const spoken = useRef(-1)
  const clip = useRef<HTMLAudioElement | null>(null)

  const stopAudio = () => {
    if (clip.current) { clip.current.onerror = null; clip.current.pause(); clip.current = null }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }

  const speak = useMemo(() => (i: number, l: Lang, on: boolean) => {
    if (!on) return
    stopAudio()
    // 1) Recorded or AI-generated clip, if present: public/audio/<lang>-<chapter>.mp3
    const fallback = () => {
      if (!('speechSynthesis' in window)) return
      const tag = l === 'ta' ? 'ta' : 'en'
      const match = window.speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith(tag))
      setVoiceMissing(!match)
      const u = new SpeechSynthesisUtterance(CUES[i].text[l])
      u.lang = l === 'ta' ? 'ta-IN' : 'en-IN'
      if (match) u.voice = match
      u.rate = 0.95
      window.speechSynthesis.speak(u)
    }
    const a = new Audio(`/audio/${l}-${i + 1}.mp3`)
    clip.current = a
    a.onerror = fallback
    a.play().then(() => setVoiceMissing(false)).catch(fallback)
  }, [])

  useEffect(() => () => stopAudio(), [])

  const onTime = () => {
    const t = v.current?.currentTime ?? 0
    let i = 0
    CUES.forEach((c, k) => { if (t >= c.at) i = k })
    if (i !== idx) setIdx(i)
    if (i !== spoken.current && !v.current?.paused) { spoken.current = i; speak(i, lang, voice) }
  }
  const seek = (i: number) => { const el = v.current; if (!el) return; el.currentTime = CUES[i].at + 0.05; spoken.current = -1; el.play().catch(() => {}) }
  const toggle = () => { const el = v.current; if (!el) return; el.paused ? el.play().catch(() => {}) : el.pause() }
  const pickLang = (l: Lang) => { setLang(l); spoken.current = -1; stopAudio() }
  const pickVoice = () => { const n = !voice; setVoice(n); spoken.current = -1; if (!n) stopAudio() }

  return (
    <section id="explainer" className="sec">
      <div className="wrap">
        <div className="sec-h rv">
          <p className="kicker dark">Walkthrough · நடைமுறை விளக்கம்</p>
          <h2>{lang === 'en' ? 'See every feature in 40 seconds' : '40 வினாடிகளில் அனைத்து வசதிகளும்'}</h2>
          <p>{lang === 'en' ? 'Captions in English or Tamil. Turn on the voice to hear each step read aloud.' : 'ஆங்கிலம் அல்லது தமிழில் வசன வரிகள். ஒவ்வொரு படியையும் குரலில் கேட்க “குரல்” என்பதை இயக்குங்கள்.'}</p>
        </div>
        <div className="xp rv">
          <div className="xp-stage">
            <video ref={v} className="xp-vid" poster="/video/tour-poster.jpg" playsInline muted preload="metadata"
              onTimeUpdate={onTime} onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); stopAudio() }} onEnded={() => { setPlaying(false); setIdx(0); spoken.current = -1 }}>
              <source src="/video/tour.webm" type="video/webm" /><source src="/video/tour.mp4" type="video/mp4" />
            </video>
            <div className="xp-guide"><Guide talking={playing} /><span>{lang === 'en' ? 'Your guide' : 'உங்கள் வழிகாட்டி'}</span></div>
            <div className="xp-cap" aria-live="polite" lang={lang === 'ta' ? 'ta' : 'en'}><b>{CUES[idx].title[lang]}</b><span>{CUES[idx].text[lang]}</span></div>
            {!playing && <button className="xp-play" onClick={toggle} aria-label={lang === 'en' ? 'Play walkthrough' : 'வீடியோவை இயக்கு'}><Play size={30} fill="currentColor" /></button>}
          </div>
          <div className="xp-bar">
            <button className="btn sm" onClick={toggle}>{playing ? <Pause size={15} /> : <Play size={15} />} {playing ? (lang === 'en' ? 'Pause' : 'நிறுத்து') : (lang === 'en' ? 'Play' : 'இயக்கு')}</button>
            <div className="seg" role="group" aria-label="Language">
              <button className={lang === 'en' ? 'on' : ''} onClick={() => pickLang('en')} aria-pressed={lang === 'en'}>English</button>
              <button className={lang === 'ta' ? 'on' : ''} onClick={() => pickLang('ta')} aria-pressed={lang === 'ta'} lang="ta">தமிழ்</button>
            </div>
            <button className={`btn sm ${voice ? 'p' : ''}`} onClick={pickVoice} aria-pressed={voice}>{voice ? <Volume2 size={15} /> : <VolumeX size={15} />} {lang === 'en' ? 'Voice' : 'குரல்'}</button>
          </div>
          {voice && voiceMissing && <p className="xp-note">{lang === 'en' ? 'This device has no voice for this language, so only captions are shown.' : 'இந்த சாதனத்தில் இந்த மொழிக்கான குரல் இல்லை; வசன வரிகள் மட்டும் காட்டப்படும்.'}</p>}
          <ol className="xp-list">
            {CUES.map((c, k) => (
              <li key={c.at}><button className={k === idx ? 'on' : ''} onClick={() => seek(k)}><i>{k + 1}</i><span>{c.title[lang]}</span></button></li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
