/**
 * Tangkapan layar tiap halaman untuk Lampiran D laporan.
 *
 * Menjalankan Chrome headless dan mengendalikannya lewat DevTools Protocol
 * dengan WebSocket bawaan node -- tanpa Puppeteer, tanpa Playwright, tanpa satu
 * pun dependensi baru. Alasannya sama dengan `npm run eval`: perintah yang
 * butuh unduhan 300 MB adalah perintah yang tidak dijalankan orang pada hari ia
 * dibutuhkan.
 *
 *   npm run dev          (di terminal lain)
 *   npm run shots
 *
 * Hasilnya di docs/img/ui/. Nama berkasnya dipakai apa adanya oleh
 * docs/laporan-lampiran-d.md, jadi menambah adegan berarti menambah satu baris
 * di SCENES dan satu paragraf di dokumen itu.
 */

import { spawn } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'

const BASE = 'http://localhost:5173'
const OUT = resolve('docs/img/ui')
const WIDTH = 1440
const HEIGHT = 900
const PORT = 9333

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p))

if (!CHROME) {
  console.error('Chrome atau Edge tidak ditemukan.')
  process.exit(1)
}

// --- CDP tipis ---------------------------------------------------------------

let ws
let seq = 0
const waiting = new Map()

function send(method, params = {}) {
  const id = ++seq
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((res, rej) => waiting.set(id, { res, rej }))
}

async function connect() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json())
      const page = list.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // Chrome belum siap. Ini yang normal pada beberapa putaran pertama.
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('Chrome tidak menyediakan endpoint debug.')
}

/** Jalankan JS di halaman dan tunggu hasilnya. */
async function evaluate(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: `(async () => { ${expression} })()`,
    awaitPromise: true,
    returnByValue: true,
  })
  if (exceptionDetails) throw new Error(exceptionDetails.text + ' ' + (exceptionDetails.exception?.description ?? ''))
  return result.value
}

async function shoot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(resolve(OUT, `${name}.png`), Buffer.from(data, 'base64'))
  console.log('  ->', name + '.png', Math.round(data.length / 1024) + 'kb')
}

// --- Adegan ------------------------------------------------------------------

/*
  Tiap adegan: satu tangkapan, satu keadaan yang ingin ditunjukkan laporan.
  Yang dikejar bukan "tiap halaman sekali", melainkan **alur** -- masukan sampai
  keluaran, dan keadaan tersembunyi, supaya pembaca laporan bisa mengikuti cara
  memakainya tanpa pernah membuka aplikasinya.
*/
const pause = (ms) => `await new Promise(r => setTimeout(r, ${ms}));`

// Tiap pemanggilan dibungkus blok sendiri: dua palet berurutan dalam satu
// adegan kalau tidak begini akan mendeklarasikan ulang nama yang sama.
const palette = (query) => `{
  document.dispatchEvent(new KeyboardEvent('keydown', {key:'k', ctrlKey:true, bubbles:true}));
  ${pause(350)}
  const inp = document.querySelector('.palette-input');
  const setv = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setv.call(inp, ${JSON.stringify(query)});
  inp.dispatchEvent(new Event('input', {bubbles:true}));
  ${pause(250)}
}`

const runPalette = (query) => `{
  ${palette(query)}
  document.querySelector('.palette-input').dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
  ${pause(900)}
}`

const FIT = `{
  const b = [...document.querySelectorAll('button')].find(x => /Paskan/.test(x.getAttribute('aria-label') || ''));
  if (b) b.click();
  await new Promise(r => setTimeout(r, 900));
}`

const SCENES = [
  { name: '01-masuk', url: '/', clearName: true, wait: 1200 },
  { name: '02-dasbor', url: '/ruang', wait: 1400 },
  {
    name: '03-ruang-baru',
    url: '/ruang',
    after: `document.querySelector('.room-new').click(); ${pause(500)}
      const t = document.querySelector('#new-room-title');
      const sv = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      sv.call(t, 'Rapat evaluasi tengah semester'); t.dispatchEvent(new Event('input',{bubbles:true}));
      const g = document.querySelector('#new-room-guest');
      sv.call(g, 'dewi.anggraini@kampus.ac.id'); g.dispatchEvent(new Event('input',{bubbles:true}));
      ${pause(200)}
      document.querySelector('#new-room-guest').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      ${pause(400)}`,
    wait: 1400,
  },
  // Dipaskan ke layar supaya seluruh diagram masuk, bukan sepotong yang
  // kebetulan ada di tengah saat halaman dibuka.
  { name: '04-kanvas', url: '/ruang/KUR-482', after: FIT, wait: 1800 },
  {
    name: '05-palet-perintah',
    url: '/ruang/KUR-482',
    after: palette('sisipkan'),
    wait: 1600,
  },
  {
    name: '06-alat-templat',
    url: '/ruang/KUR-482',
    after: `document.querySelector('.rail-group .icon-btn:last-of-type').click(); ${pause(500)}`,
    wait: 1600,
  },
  {
    name: '07-alat-di-kanvas',
    url: '/ruang/KUR-482',
    after: runPalette('sisipkan retro') + runPalette('sisipkan matriks') + pause(900) + FIT,
    wait: 1800,
  },
  { name: '08-outline', url: '/ruang/KUR-482/outline', wait: 1600 },
  {
    name: '09-mendengarkan',
    url: '/ruang/KUR-482/perintah',
    after: `
      const mic = [...document.querySelectorAll('button')].find(b => /Bicara/.test(b.textContent));
      mic.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
      ${pause(60)}
      mic.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
      ${pause(700)}`,
    wait: 1600,
  },
  {
    name: '10-draf-siap',
    url: '/ruang/KUR-482/perintah',
    after: `
      const mic = () => [...document.querySelectorAll('button')].find(b => /Bicara|Terkunci|Mendengarkan/.test(b.textContent));
      const tap = async () => { const b = mic();
        b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); await new Promise(r=>setTimeout(r,60));
        b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); await new Promise(r=>setTimeout(r,200)); };
      await tap(); ${pause(900)} await tap(); ${pause(2200)}`,
    wait: 1600,
  },
  {
    name: '11-konteks-model',
    url: '/ruang/KUR-482/perintah',
    after: `
      const mic = () => [...document.querySelectorAll('button')].find(b => /Bicara|Terkunci|Mendengarkan/.test(b.textContent));
      const tap = async () => { const b = mic();
        b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); await new Promise(r=>setTimeout(r,60));
        b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true})); await new Promise(r=>setTimeout(r,200)); };
      await tap(); ${pause(900)} await tap(); ${pause(2200)}
      const d = document.querySelector('.agent-context'); if (d) d.open = true;
      ${pause(300)}`,
    wait: 1600,
  },
  { name: '12-peserta', url: '/ruang/KUR-482/peserta', wait: 1600 },
  { name: '13-komentar', url: '/ruang/KUR-482/komentar', wait: 1600 },
  {
    name: '14-panel-disembunyikan',
    url: '/ruang/KUR-482',
    after: `document.dispatchEvent(new KeyboardEvent('keydown',{key:']',bubbles:true})); ${pause(600)}
            document.dispatchEvent(new KeyboardEvent('keydown',{key:'[',bubbles:true})); ${pause(800)}`,
    wait: 1600,
  },
  {
    name: '15-bagikan',
    url: '/ruang/KUR-482',
    after: `[...document.querySelectorAll('button')].find(b => /Bagikan/.test(b.textContent)).click(); ${pause(500)}`,
    wait: 1600,
  },
  {
    name: '16-pintasan',
    url: '/ruang/KUR-482',
    after: `document.dispatchEvent(new KeyboardEvent('keydown',{key:'?',bubbles:true})); ${pause(600)}`,
    wait: 1600,
  },
  { name: '17-ringkasan', url: '/ruang/KUR-482/ringkasan', wait: 1600 },
  { name: '18-pengaturan', url: '/ruang/KUR-482/pengaturan', wait: 1600 },
]

// --- Jalan -------------------------------------------------------------------

const profile = resolve(tmpdir(), 'karsa-shots-profile')
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${WIDTH},${HEIGHT}`,
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    BASE,
  ],
  { stdio: 'ignore' },
)

await mkdir(OUT, { recursive: true })

const url = await connect()
ws = new WebSocket(url)
await new Promise((res, rej) => {
  ws.onopen = res
  ws.onerror = rej
})
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  const pending = waiting.get(msg.id)
  if (!pending) return
  waiting.delete(msg.id)
  if (msg.error) pending.rej(new Error(msg.error.message))
  else pending.res(msg.result)
}

await send('Page.enable')
await send('Runtime.enable')
// Tema terang dipaksa, bukan diwarisi dari sistem: laporan dicetak di kertas
// putih, dan sesi tangkapan yang temanya ikut jam kerja bukan sesi yang bisa
// diulang.
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

async function goto(path) {
  await send('Page.navigate', { url: BASE + path })
  await new Promise((r) => setTimeout(r, 700))
}

console.log(`
Menangkap ${SCENES.length} adegan pada ${WIDTH}x${HEIGHT}, tema terang.
`)

/*
  Keadaan awal disiapkan ulang sebelum tiap adegan, bukan sekali di awal.

  Satu adegan yang mengubah penyimpanan -- halaman masuk mengosongkan nama --
  kalau tidak begini akan mengubah semua adegan sesudahnya, dan kesalahan
  seperti itu baru ketahuan setelah gambarnya masuk laporan.
*/
async function reset(clearName) {
  await goto('/')
  const nama = clearName
    ? "localStorage.removeItem('karsa:nama');"
    : "localStorage.setItem('karsa:nama', 'Rina Halimah');"
  await evaluate(`
    localStorage.setItem('karsa:tema', 'light');
    localStorage.removeItem('karsa:ruang');
    ${nama}
  `)
}

let failed = 0
for (const scene of SCENES) {
  console.log(scene.name)
  try {
    await reset(scene.clearName)
    await goto(scene.url)
    await new Promise((r) => setTimeout(r, scene.wait ?? 1200))
    if (scene.after) await evaluate(scene.after)
    await new Promise((r) => setTimeout(r, 400))
    await shoot(scene.name)
  } catch (error) {
    // Satu adegan gagal tidak boleh membatalkan tujuh belas lainnya.
    failed += 1
    console.log('  !! gagal:', error.message.split(String.fromCharCode(10))[0])
  }
}

console.log(failed ? `Selesai, ${failed} adegan gagal.` : 'Selesai. Berkas ada di docs/img/ui/')
ws.close()
chrome.kill()
process.exit(0)
