import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { DICT, OTHER } from './dict'
import { EXTRA, EXTRA_LANGS } from './dict2'

export type Lang = 'en' | (typeof OTHER)[number] | (typeof EXTRA_LANGS)[number]

/** Native name first (what the reader recognises), English name second. */
export const LANGUAGES: { code: Lang; native: string; english: string }[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
  { code: 'mr', native: 'मराठी', english: 'Marathi' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
  { code: 'or', native: 'ଓଡ଼ିଆ', english: 'Odia' },
  { code: 'as', native: 'অসমীয়া', english: 'Assamese' },
  { code: 'ur', native: 'اردو', english: 'Urdu' },
  { code: 'ne', native: 'नेपाली', english: 'Nepali' },
]

const RTL: Lang[] = ['ur']

const KEY = 'sp.lang'
const valid = (c: string | null): c is Lang => !!c && LANGUAGES.some((l) => l.code === c)

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (valid(saved)) return saved
  } catch { /* storage blocked */ }
  const guess = (navigator.language || 'en').slice(0, 2).toLowerCase()
  return valid(guess) ? guess : 'en'
}

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (text: string, vars?: Record<string, string | number>) => string }
const I18n = createContext<Ctx>({ lang: 'en', setLang: () => {}, t: (s) => s })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial)
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = RTL.includes(lang) ? 'rtl' : 'ltr'
  }, [lang])
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
  }, [])
  const t = useCallback((text: string, vars?: Record<string, string | number>) => {
    let out = text
    if (lang !== 'en') {
      const xi = EXTRA_LANGS.indexOf(lang as (typeof EXTRA_LANGS)[number])
      out = (xi >= 0 ? EXTRA[text]?.[xi] : DICT[text]?.[OTHER.indexOf(lang as (typeof OTHER)[number])]) || text
    }
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
    return out
  }, [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18n.Provider value={value}>{children}</I18n.Provider>
}

export const useI18n = () => useContext(I18n)
export const useT = () => useContext(I18n).t

/** Globe button with a list of every supported language. `tone="dark"` suits the navy hero. */
export function LanguageSelect({ tone = 'light', compact = false }: { tone?: 'light' | 'dark'; compact?: boolean }) {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key) }
  }, [open])
  const current = LANGUAGES.find((l) => l.code === lang)!
  return (
    <div className={`langsel ${tone} ${compact ? 'compact' : ''}`} ref={ref}>
      <button type="button" className="langsel-b" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label={t('Language')}>
        <Globe size={17} />
        {!compact && <span>{current.native}</span>}
        <ChevronDown size={14} />
      </button>
      {open && (
        <ul className="langsel-l" role="listbox" aria-label={t('Language')}>
          {LANGUAGES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === lang}>
              <button type="button" className={l.code === lang ? 'on' : ''} lang={l.code} onClick={() => { setLang(l.code); setOpen(false) }}>
                <b>{l.native}</b>
                <small>{l.english}</small>
                {l.code === lang && <Check size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
