// Generates the walkthrough voice-over (8 clips x English + Tamil) with Google Cloud Text-to-Speech.
// These are Google's stock synthetic voices: no real person is imitated.
//
// 1. Google Cloud Console > enable "Cloud Text-to-Speech API" > Credentials > Create API key.
// 2. Windows (cmd):   set GOOGLE_TTS_KEY=your-key      Mac/Linux: export GOOGLE_TTS_KEY=your-key
// 3. From the frontend folder:  node tools/make-voice.mjs
// Output: public/audio/en-1.mp3 ... ta-8.mp3 (the site picks them up automatically; delete a file to fall back to the browser voice).
// Change VOICES below to try other voices: https://cloud.google.com/text-to-speech/docs/voices
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const key = process.env.GOOGLE_TTS_KEY
if (!key) { console.error('Set GOOGLE_TTS_KEY first (see the comments at the top of this file).'); process.exit(1) }

const VOICES = {
  en: { languageCode: 'en-IN', name: 'en-IN-Wavenet-A' }, // female. Try en-IN-Wavenet-B/C (male) as well.
  ta: { languageCode: 'ta-IN', name: 'ta-IN-Wavenet-A' }, // female. Try ta-IN-Wavenet-B (male) as well.
}
const cues = JSON.parse(readFileSync(new URL('../src/site/narration.json', import.meta.url), 'utf8'))
mkdirSync(new URL('../public/audio/', import.meta.url), { recursive: true })

for (const lang of ['en', 'ta']) {
  for (let i = 0; i < cues.length; i++) {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { text: cues[i].text[lang] }, voice: VOICES[lang], audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 } }),
    })
    const data = await res.json()
    if (!res.ok) { console.error(lang, i + 1, res.status, data.error?.message ?? data); process.exit(1) }
    writeFileSync(new URL(`../public/audio/${lang}-${i + 1}.mp3`, import.meta.url), Buffer.from(data.audioContent, 'base64'))
    console.log('wrote', `${lang}-${i + 1}.mp3`)
  }
}
console.log('Done. Restart `npm run dev`, open the Walkthrough section, switch Voice on.')
