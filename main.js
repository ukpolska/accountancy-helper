const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const fs = require('fs');
const path = require('path');

// okno zasłonięte lub zminimalizowane nie może wstrzymywać pracy (odczyt skanów/OCR wymaga rysowania)
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows', 'true');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
const baseDir = () => process.env.ACCOUNTANCY_HELPER_DATA_DIR || path.join(app.getPath('documents'), 'Accountancy Helper');   // zmienna tylko do testów
// Profile (kilka firm w jednym programie). Profil „default” używa głównego folderu danych (tak jak dotychczas, więc istniejące dane działają bez zmian);
// pozostałe mają własne foldery w podfolderze Profile. Rejestr profili: profile.json w głównym folderze.
const profilesFile = () => path.join(baseDir(), 'profile.json');
let PROFILES = null;
function loadProfiles() {
  if (PROFILES) return PROFILES;
  let o = null;
  try { o = JSON.parse(fs.readFileSync(profilesFile(), 'utf8')); } catch (e) { o = null; }
  if (!o || typeof o !== 'object' || !Array.isArray(o.list)) o = { active: 'default', list: [] };
  o.list = o.list.filter(p => p && typeof p.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(p.id) && typeof p.name === 'string').map(p => ({ id: p.id, name: p.name.slice(0, 60) }));
  if (!o.list.some(p => p.id === 'default')) o.list.unshift({ id: 'default', name: '' });
  if (typeof o.active !== 'string' || !o.list.some(p => p.id === o.active)) o.active = 'default';
  PROFILES = o; return o;
}
function saveProfiles() {
  fs.mkdirSync(baseDir(), { recursive: true });
  const tmp = profilesFile() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(PROFILES, null, 1), 'utf8'); fs.renameSync(tmp, profilesFile());
}
const profDir = id => id === 'default' ? baseDir() : path.join(baseDir(), 'Profile', id);
const dataDir = () => profDir(loadProfiles().active);
const dataFile = () => path.join(dataDir(), 'dane.json');

// Odczyt: główny plik, a gdyby był uszkodzony (np. przerwa w zasilaniu) – poprzednia wersja, potem najnowsza kopia dzienna.
ipcMain.handle('store:load', () => {
  const tryRead = f => { try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } };
  const main = tryRead(dataFile());
  if (main) return main;
  const prev = tryRead(path.join(dataDir(), 'dane.poprzednia.json'));
  if (prev) return prev;
  try {
    const bdir = path.join(dataDir(), 'Kopie zapasowe');
    const files = fs.readdirSync(bdir).filter(f => /^dane-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
    for (const f of files) { const o = tryRead(path.join(bdir, f)); if (o) return o; }
  } catch (e) {}
  return null;
});
ipcMain.handle('store:save', (_e, obj) => {
  try {
    fs.mkdirSync(dataDir(), { recursive: true });
    try { if (fs.existsSync(dataFile())) { JSON.parse(fs.readFileSync(dataFile(), 'utf8')); fs.copyFileSync(dataFile(), path.join(dataDir(), 'dane.poprzednia.json')); } } catch (e) { /* uszkodzony plik nie nadpisuje dobrej poprzedniej wersji */ }
    // zapis przez plik tymczasowy i zmianę nazwy – przerwanie w trakcie nie zostawia ucięcia pliku
    const tmp = dataFile() + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 1), 'utf8');
    fs.renameSync(tmp, dataFile());
    // jedna kopia dziennie (nadpisywana w ciągu dnia), ostatnie 60 dni
    const bdir = path.join(dataDir(), 'Kopie zapasowe');
    fs.mkdirSync(bdir, { recursive: true });
    const d = new Date(), p2 = n => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    fs.copyFileSync(dataFile(), path.join(bdir, `dane-${stamp}.json`));
    fs.readdirSync(bdir).filter(f => /^dane-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(0, -60)
      .forEach(f => fs.unlinkSync(path.join(bdir, f)));
    return { ok: true, path: dataFile(), backupDir: bdir };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});

// Wyszukiwanie firmy po NIP. Najpierw Wykaz podatników VAT (Ministerstwo Finansów) – zna tylko podatników VAT; jeśli firmy tam nie ma
// (np. zwolnionej z VAT) i podano klucz API, pytamy rejestr REGON (GUS), który zna wszystkie firmy. Wysyłany jest wyłącznie numer NIP.
async function vatLookup(digits) {
  const n = new Date(), z = x => String(x).padStart(2, '0');
  const date = `${n.getFullYear()}-${z(n.getMonth() + 1)}-${z(n.getDate())}`;
  try {
    const res = await fetch(`https://wl-api.mf.gov.pl/api/search/nip/${digits}?date=${date}`, { signal: AbortSignal.timeout(15000) });
    const body = await res.json().catch(() => ({}));
    const sub = body && body.result && body.result.subject;
    if (res.ok && sub) return { ok: true, source: 'MF', name: sub.name || '', regon: sub.regon || '', statusVat: sub.statusVat || '', address: sub.workingAddress || sub.residenceAddress || '' };
    if (res.ok) return { ok: false, error: 'notfound' };
    return { ok: false, error: body.message || ('HTTP ' + res.status) };
  } catch (e) { return { ok: false, error: String((e && e.message) || e), network: true }; }
}
// CEIDG (rejestr działalności jednoosobowych) – Hurtownia Danych API v3: GET /firma?nip=..., nagłówek Authorization: Bearer <token>.
// Specyfikacja: oficjalna "Dokumentacja dla integratorów API v3" (biznes.gov.pl). Limit: 1000 zapytań na 60 minut.
const CEIDG_BASE = process.env.ACCOUNTANCY_HELPER_CEIDG_BASE || 'https://dane.biznes.gov.pl/api/ceidg/v3/';   // zmienna tylko do testów
async function ceidgLookup(digits, token) {
  try {
    const res = await fetch(CEIDG_BASE + 'firma?nip=' + digits, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (res.status === 204 || res.status === 404) return { ok: false, error: 'notfound' };
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'token CEIDG nie został przyjęty / the CEIDG token was not accepted', ceidg: true };
    if (res.status === 429) return { ok: false, error: 'CEIDG: zbyt wiele zapytań, spróbuj później / too many requests, try later', ceidg: true };
    if (!res.ok) return { ok: false, error: 'CEIDG: HTTP ' + res.status, ceidg: true };
    const body = await res.json().catch(() => null);
    const list = body && (body.firma || body.firmy);
    if (!Array.isArray(list) || !list.length) return { ok: false, error: 'notfound' };
    const rank = { AKTYWNY: 0, ZAWIESZONY: 1, OCZEKUJE_NA_ROZPOCZECIE_DZIALANOSCI: 2, WYLACZNIE_W_FORMIE_SPOLKI: 3, WYKRESLONY: 4 };
    const f = list.slice().sort((a, b) => (rank[a.status] !== undefined ? rank[a.status] : 9) - (rank[b.status] !== undefined ? rank[b.status] : 9) || String(b.dataRozpoczecia || '').localeCompare(String(a.dataRozpoczecia || '')))[0];
    const a = f.adresDzialalnosci || {}, nr = [a.budynek, a.lokal].filter(Boolean).join('/');
    const street = a.ulica ? [a.ulica, nr].filter(Boolean).join(' ') : [a.miasto, nr].filter(Boolean).join(' ');
    const address = [street, [a.kod, a.miasto].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const pk = f.pkdGlowny;
    return { ok: true, source: 'CEIDG', name: f.nazwa || '', regon: (f.wlasciciel && f.wlasciciel.regon) || '', statusVat: '', address, pkd: pk && pk.kod ? [pk.kod, pk.nazwa].filter(Boolean).join(' ') : '', registerStatus: f.status || '' };
  } catch (e) { return { ok: false, error: String((e && e.message) || e), network: true }; }
}
async function gusLookup(digits, key) {
  let bir;
  try {
    const { default: Bir } = await import('bir1');
    bir = key === '__test__' ? new Bir() : new Bir({ key });   // '__test__' = publiczny klucz testowej bazy GUS (dane zanonimizowane) – tylko do testów
    const r = await bir.search({ nip: digits });
    const o = Array.isArray(r) ? r[0] : r;
    if (!o || !o.Nazwa) return { ok: false, error: 'notfound' };
    const nr = [o.NrNieruchomosci, o.NrLokalu].filter(Boolean).join('/');
    const street = o.Ulica ? [o.Ulica, nr].filter(Boolean).join(' ') : [o.Miejscowosc, nr].filter(Boolean).join(' ');   // wieś bez ulic: "Miejscowość numer"
    const address = [street, [o.KodPocztowy, o.MiejscowoscPoczty || o.Miejscowosc].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return { ok: true, source: 'GUS', name: o.Nazwa, regon: o.Regon || '', statusVat: '', address };
  } catch (e) {
    const msg = String((e && e.message) || e);
    if (/no data found|not found|nie znaleziono/i.test(msg)) return { ok: false, error: 'notfound' };
    if (/empty response/i.test(msg)) return { ok: false, error: 'klucz GUS nie został przyjęty lub usługa GUS nie odpowiada / the GUS key was not accepted or the GUS service is not responding', gus: true };
    return { ok: false, error: 'GUS: ' + msg, gus: true };
  } finally { try { if (bir) await bir.logout(); } catch (e) {} }
}
function bundledKeys() { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'app', 'lookup-keys.json'), 'utf8').replace(/^﻿/, '')) || {}; } catch (e) { return {}; } }
ipcMain.handle('nip:lookup', async (_e, nip, keys) => {
  const digits = String(nip || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(digits)) return { ok: false, error: 'NIP' };
  const k = typeof keys === 'string' ? { gus: keys } : (keys || {});
  // klucze wbudowane w program (app/lookup-keys.json) – dzięki nim wyszukiwanie działa od razu, bez konfiguracji; wpis w Ustawieniach ma pierwszeństwo
  const built = bundledKeys();
  const gus = (typeof k.gus === 'string' && k.gus.trim()) || (typeof built.gus === 'string' ? built.gus.trim() : '');
  const ceidg = (typeof k.ceidg === 'string' && k.ceidg.trim()) || (typeof built.ceidg === 'string' ? built.ceidg.trim() : '');
  const first = await vatLookup(digits);
  if (first.ok || first.network || first.error !== 'notfound') return first;
  if (!gus && !ceidg) return Object.assign(first, { needGusKey: true });
  let problem = null;
  if (ceidg) { const r = await ceidgLookup(digits, ceidg); if (r.ok) return r; if (r.error !== 'notfound') problem = r; }
  if (gus) { const r = await gusLookup(digits, gus); if (r.ok) return r; if (r.error !== 'notfound' && !problem) problem = r; }
  return problem || { ok: false, error: 'notfound' };
});

// Zasady roczne: wbudowany plik oraz pobranie nowszego z adresu https. Pobrane dane są tylko zwracane – zastosowanie wymaga zgody użytkownika.
ipcMain.handle('rules:bundled', () => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'app', 'rules.json'), 'utf8')); } catch (e) { return null; }
});
ipcMain.handle('rules:fetch', async (_e, url) => {
  if (typeof url !== 'string' || !/^https:\/\//.test(url)) return { ok: false, error: 'URL' };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };
    const text = await res.text();
    if (text.length > 200000) return { ok: false, error: 'size' };
    return { ok: true, data: JSON.parse(text) };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
});

// ---------- Dziennik działań: jedna linia JSON na zdarzenie, dopisywana do pliku (przerwa w zasilaniu nie psuje starszych wpisów) ----------
const logFile = () => path.join(dataDir(), 'dziennik.jsonl');
const SESSION_ID = new Date().toISOString();
const localStamp = (d = new Date()) => { const z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`; };
function appendLog(k, a) {
  try {
    if (typeof k !== 'string' || !k || k.length > 40) return false;
    const arr = (Array.isArray(a) ? a : []).slice(0, 12).map(x => typeof x === 'number' ? x : String(x == null ? '' : x).slice(0, 300));
    fs.mkdirSync(dataDir(), { recursive: true });
    fs.appendFileSync(logFile(), JSON.stringify({ ts: localStamp(), sid: SESSION_ID, k, a: arr }) + '\n', 'utf8');
    return true;
  } catch (e) { return false; }
}
function readLogEntries() {
  try { return fs.readFileSync(logFile(), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(e => e && typeof e.k === 'string' && typeof e.ts === 'string'); } catch (e) { return []; }
}
// dziennik: ostatnie 400 dni i najwyżej 20 000 wpisów
function trimLog() {
  try {
    const all = readLogEntries(); if (!all.length) return;
    const limit = localStamp(new Date(Date.now() - 400 * 86400000));
    const keep = all.filter(e => e.ts >= limit).slice(-20000);
    if (keep.length === all.length) return;
    const tmp = logFile() + '.tmp';
    fs.writeFileSync(tmp, keep.map(e => JSON.stringify(e)).join('\n') + (keep.length ? '\n' : ''), 'utf8'); fs.renameSync(tmp, logFile());
  } catch (e) {}
}
ipcMain.handle('log:append', (_e, entry) => appendLog(entry && entry.k, entry && entry.a));
ipcMain.handle('log:read', () => readLogEntries());

ipcMain.handle('manual:open', () => {
  try {
    const cands = [path.join(process.resourcesPath || '', 'Instrukcja-Manual.pdf'), path.join(__dirname, 'Instrukcja-Manual.pdf')];
    const f = cands.find(x => { try { return fs.existsSync(x); } catch (e) { return false; } });
    return f ? shell.openPath(f) : 'manual not found';
  } catch (e) { return String(e.message || e); }
});
ipcMain.handle('profiles:list', () => { const o = loadProfiles(); return { active: o.active, list: o.list.map(p => ({ id: p.id, name: p.name, dir: profDir(p.id) })) }; });
ipcMain.handle('profiles:create', (_e, name, seed) => {
  try {
    const o = loadProfiles(); const nm = String(name == null ? '' : name).trim().slice(0, 60);
    if (!nm) return { ok: false, error: 'name' };
    if (o.list.some(p => p.name.trim().toLowerCase() === nm.toLowerCase())) return { ok: false, error: 'exists' };
    const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    fs.mkdirSync(profDir(id), { recursive: true });
    if (seed && typeof seed === 'object' && !Array.isArray(seed)) fs.writeFileSync(path.join(profDir(id), 'dane.json'), JSON.stringify(Object.assign({ app: 'jdg-kalkulator', version: 2 }, seed), null, 1), 'utf8');
    o.list.push({ id, name: nm }); saveProfiles();
    return { ok: true, id };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('profiles:switch', (_e, id) => {
  try { const o = loadProfiles(); if (!o.list.some(p => p.id === id)) return { ok: false, error: 'unknown' }; o.active = id; saveProfiles(); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('profiles:rename', (_e, id, name) => {
  try {
    const o = loadProfiles(), p = o.list.find(x => x.id === id), nm = String(name == null ? '' : name).trim().slice(0, 60);
    if (!p) return { ok: false, error: 'unknown' }; if (!nm) return { ok: false, error: 'name' };
    if (o.list.some(x => x.id !== id && x.name.trim().toLowerCase() === nm.toLowerCase())) return { ok: false, error: 'exists' };
    p.name = nm; saveProfiles(); return { ok: true };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
// „Usunięcie” profilu tylko wyrejestrowuje go z listy; pliki zostają na dysku (nic nie jest kasowane)
ipcMain.handle('profiles:remove', (_e, id) => {
  try {
    const o = loadProfiles();
    if (id === 'default' || id === o.active || !o.list.some(p => p.id === id)) return { ok: false, error: 'not-allowed' };
    const dir = profDir(id); o.list = o.list.filter(p => p.id !== id); saveProfiles(); return { ok: true, dir };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('store:open', () => {
  try { fs.mkdirSync(dataDir(), { recursive: true }); return shell.openPath(dataDir()); } catch (e) { return String(e.message || e); }
});

function createWindow() {
  trimLog(); appendLog('sStart', []);
  const win = new BrowserWindow({
    show: !process.env.ACCOUNTANCY_HELPER_TEST_HIDDEN,   // tylko dla automatycznych testów: okno niewidoczne
    width: 1200, height: 850, title: "Accountancy Helper",
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  // Linki zewnętrzne otwieramy w domyślnej przeglądarce, nie w oknie programu.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => appendLog('sEnd', []));
