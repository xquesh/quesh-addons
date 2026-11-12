// ==UserScript==
// @name         Lootlog Fair Group
// @namespace    quesh.addons
// @version      1.1.0
// @description  Ranking graczy z mapy według liczby bić wybranego potwora w ostatnich 3 dniach.
// @updateURL     https://xquesh.github.io/quesh-addons/dist/lootlog-fair-group.user.js
// @downloadURL   https://xquesh.github.io/quesh-addons/dist/lootlog-fair-group.user.js
// @match        https://*.margonem.pl/*
// @match        https://*.margonem.com/*
// @exclude      https://forum.margonem.pl/*
// @exclude      https://forum.margonem.com/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      api.lootlog.pl
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    const API = 'https://api.lootlog.pl';
    const VERSION = '1.1.0';
    const STORAGE_KEY = 'lootlog-fair-group-settings-v1';
    const DEFAULTS = Object.freeze({
        guildId: '1447651903222841461',
        npcName: '',
        selectedNpcName: '',
        titanCatalog: [],
        npcId: '',
        world: '',
        x: 18,
        y: 210
    });
    const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    let settings = loadSettings();
    let panel;
    let status;
    let list;
    let debug;
    let refreshing = false;

    function loadSettings() {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            return { ...DEFAULTS, ...raw };
        } catch { return { ...DEFAULTS }; }
    }

    function saveSettings(patch = {}) {
        settings = { ...settings, ...patch };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    function normalize(value) {
        return String(value || '').trim().toLocaleLowerCase('pl-PL');
    }

    function setStatus(text, type = '') {
        if (!status) return;
        status.textContent = text;
        status.dataset.type = type;
    }

    function showDebug(value) {
        if (!debug) return;
        try {
            const text = JSON.stringify(value, null, 2);
            debug.textContent = text.length > 12000 ? `${text.slice(0, 12000)}\n…(ucięto)` : text;
            debug.hidden = false;
        } catch { debug.textContent = String(value); debug.hidden = false; }
    }

    function request(path, baseUrl = API) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest !== 'function') {
                reject(new Error('Brak uprawnienia GM_xmlhttpRequest. Zainstaluj skrypt ponownie w Tampermonkey.'));
                return;
            }
            GM_xmlhttpRequest({
                method: 'GET',
                url: `${baseUrl}${path}`,
                responseType: 'json',
                // Wprost zachowujemy sesję Lootloga użytkownika. Nie odczytujemy
                // ani nie zapisujemy ciasteczek, tokenów czy danych logowania.
                anonymous: false,
                timeout: 15000,
                onload(response) {
                    if (response.status < 200 || response.status >= 300) {
                        reject(new Error(response.status === 401
                            ? 'Lootlog wymaga zalogowanej sesji. Otwórz lootlog.pl, zaloguj się i odśwież.'
                            : response.status === 404
                                ? 'Lootlog nie udostępnił tej grupy tej sesji (404). Zaloguj się na lootlog.pl na konto mające dostęp do tej grupy i spróbuj ponownie.'
                                : `Lootlog zwrócił HTTP ${response.status}.`));
                        return;
                    }
                    try { resolve(response.response ?? JSON.parse(response.responseText)); }
                    catch { reject(new Error('Lootlog zwrócił nieprawidłową odpowiedź.')); }
                },
                onerror: () => reject(new Error('Nie udało się połączyć z API Lootlog.')),
                ontimeout: () => reject(new Error('Przekroczono czas oczekiwania na Lootlog.'))
            });
        });
    }

    function query(params) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) if (value !== '' && value != null) search.set(key, String(value));
        return search.toString() ? `?${search}` : '';
    }

    function arraysIn(value, seen = new Set()) {
        if (!value || typeof value !== 'object' || seen.has(value)) return [];
        seen.add(value);
        const output = Array.isArray(value) ? [value] : [];
        for (const child of Object.values(value)) output.push(...arraysIn(child, seen));
        return output;
    }

    function npcFromPayload(payload, name) {
        const wanted = normalize(name);
        const candidates = arraysIn(payload).flat().filter(entry => entry && typeof entry === 'object');
        return candidates.find(entry => normalize(entry.npcName ?? entry.name) === wanted && Number.isFinite(Number(entry.npcId ?? entry.id))) || null;
    }

    function titanNamesFromPayload(payload) {
        const names = new Set();
        for (const entry of arraysIn(payload).flat()) {
            if (!entry || typeof entry !== 'object') continue;
            const name = String(entry.npcName ?? entry.npc?.name ?? '').trim();
            // Zapytanie ma już npcType=TITAN. Widok top-NPC nie zawsze odsyła
            // npcType ani npcId przy każdym rekordzie, więc nie filtrujemy go drugi raz.
            // Nazwa wystarcza do listy; ID zostanie dopasowane przy pobraniu rankingu.
            if (name) names.add(name);
        }
        return [...names].sort((a, b) => a.localeCompare(b, 'pl'));
    }

    function getMapPlayers() {
        const sources = [];
        try {
            sources.push(page.Engine?.others?.check?.(), page.Engine?.others?.getAll?.(), page.Engine?.others?.others, page.g?.other);
        } catch {}
        const players = new Map();
        for (const source of sources) {
            const entries = source instanceof Map ? [...source.entries()] : Array.isArray(source) ? source.map((value, index) => [index, value]) : Object.entries(source || {});
            for (const [fallbackId, raw] of entries) {
                const data = raw?.d && typeof raw.d === 'object' ? raw.d : raw;
                if (!data || typeof data !== 'object' || data.del || raw?.del) continue;
                const nick = String(data.nick ?? data.name ?? raw?.nick ?? raw?.name ?? '').trim();
                const id = Number(data.id ?? raw?.id ?? fallbackId);
                if (!nick || !Number.isFinite(id)) continue;
                players.set(id, { id, nick, level: data.lvl ?? data.level ?? raw?.lvl ?? raw?.level ?? '' });
            }
        }
        return [...players.values()];
    }

    // Klient Margonem koduje rodzaj potwora w d.wt: 100–109 oznacza Tytana.
    // Dodatkowo zachowujemy tekstowy fallback dla innych wariantów klienta.
    function getTitanOnMap() {
        const sources = [];
        try {
            sources.push(
                page.Engine?.npcs?.check?.(), page.Engine?.npcs?.getAll?.(), page.Engine?.npcs?.npcs,
                page.Engine?.mobs?.check?.(), page.Engine?.mobs?.getAll?.(), page.Engine?.mobs?.mobs,
                page.g?.npc, page.g?.npcs, page.npc
            );
        } catch {}
        const found = new Map();
        for (const source of sources) {
            const entries = source instanceof Map ? [...source.entries()] : Array.isArray(source) ? source.map((value, index) => [index, value]) : Object.entries(source || {});
            for (const [fallbackId, raw] of entries) {
                const data = raw?.d && typeof raw.d === 'object' ? raw.d : raw;
                if (!data || typeof data !== 'object' || data.del || raw?.del) continue;
                const name = String(data.nick ?? data.name ?? raw?.nick ?? raw?.name ?? '').trim();
                if (!name) continue;
                const id = String(data.id ?? raw?.id ?? fallbackId);
                const wt = Number(data.wt ?? raw?.wt);
                const rankInfo = [data.rank, data.rarity, data.tier, data.elite, data.elita, data.kind, data.classification, data.typeName, raw?.rank, raw?.rarity, raw?.tier]
                    .filter(value => value != null).join(' ').toLocaleLowerCase('pl-PL');
                if (wt >= 100 && wt <= 109 || /tytan|titan/.test(rankInfo)) found.set(id, { id, name, rankInfo, wt });
            }
        }
        return [...found.values()][0] || null;
    }

    function syncNpcFromMap({ announce = false } = {}) {
        const titan = getTitanOnMap();
        if (!titan) {
            // Nie zostawiamy nazwy poprzedniego bossa: ranking ma działać wyłącznie
            // dla tytana, którego gra faktycznie zgłasza na bieżącej mapie.
            if (settings.npcName) {
                saveSettings({ npcName: '' });
                const input = panel?.querySelector('[data-field="npcName"]');
                if (input) input.value = '';
            }
            if (announce) setStatus('Nie wykryto tytana na mapie. Wejdź na mapę z tytanem i spróbuj ponownie.', 'error');
            return null;
        }
        if (settings.npcName !== titan.name) {
            saveSettings({ npcName: titan.name, npcId: '' });
            const input = panel?.querySelector('[data-field="npcName"]');
            if (input) input.value = titan.name;
        }
        return titan;
    }

    function killerRows(payload) {
        const direct = Array.isArray(payload?.killers) ? payload.killers : null;
        const entries = (direct || arraysIn(payload).find(items => items.some(item => item?.member?.name)) || []);
        const merged = new Map();
        for (const entry of entries) {
            if (!entry || typeof entry !== 'object') continue;
            const name = String(entry.member?.name ?? entry.name ?? entry.nick ?? '').trim();
            const kills = Number(entry.kills ?? entry.killCount ?? entry.totalKills ?? entry.count ?? 0);
            if (!name || !Number.isFinite(kills)) continue;
            const key = normalize(name);
            merged.set(key, Math.max(merged.get(key) ?? 0, kills));
        }
        return merged;
    }

    function renderRanking(players, killsByName, npcName) {
        list.replaceChildren();
        const ranked = players.map(player => ({ ...player, kills: killsByName.get(normalize(player.nick)) ?? 0, found: killsByName.has(normalize(player.nick)) }))
            .sort((a, b) => a.kills - b.kills || a.nick.localeCompare(b.nick, 'pl'));
        if (!ranked.length) {
            const empty = document.createElement('p'); empty.className = 'llfg-empty'; empty.textContent = 'Na aktualnej mapie nie znaleziono innych postaci.';
            list.append(empty); return;
        }
        ranked.forEach((player, index) => {
            const row = document.createElement('div'); row.className = 'llfg-row';
            const rank = document.createElement('b'); rank.textContent = `${index + 1}.`;
            const name = document.createElement('span'); name.className = 'llfg-name'; name.textContent = `${player.nick}${player.level !== '' ? ` (${player.level})` : ''}`;
            const count = document.createElement('span'); count.className = 'llfg-count'; count.textContent = `${player.kills} bić`;
            const note = document.createElement('small'); note.textContent = player.found ? 'Lootlog · 3 dni' : 'brak wpisu · 0';
            row.append(rank, name, count, note); list.append(row);
        });
        setStatus(`Ranking: ${npcName} · ${ranked.length} osób z mapy · ostatnie 3 dni.`, 'ok');
    }

    async function refresh() {
        if (refreshing) return;
        const titan = syncNpcFromMap({ announce: true });
        const guildId = String(settings.guildId).trim();
        const npcName = String(titan?.name || settings.selectedNpcName).trim();
        if (!npcName) return;
        if (!/^\d+$/.test(guildId)) {
            setStatus('W konfiguracji podaj ID z linku Lootloga.', 'error'); return;
        }
        refreshing = true; setStatus('Pobieranie statystyk Lootlog…');
        try {
            let npcId = String(settings.npcId).trim();
            if (!/^\d+$/.test(npcId)) {
                // Nie pobieramy globalnego top 50: target może mieć mniej bić.
                // Lootlog obsługuje dokładnie ten filtr tekstowy również w widoku statystyk.
                const filters = query({ period: '3d', limit: 50, search: npcName, world: settings.world });
                const stats = await request(`/guilds/${guildId}/stats/kills/top-npcs${filters}`);
                const npc = npcFromPayload(stats, npcName);
                if (!npc) throw new Error(`Nie znaleziono „${npcName}” w ostatnich statystykach. Wpisz jego ID Lootloga ręcznie w konfiguracji.`);
                npcId = String(npc.npcId ?? npc.id);
            }
            const filters = query({ period: '3d', limit: 50, search: npcName, world: settings.world });
            const details = await request(`/guilds/${guildId}/stats/kills/npcs/${npcId}/killers${filters}`);
            renderRanking(getMapPlayers(), killerRows(details), npcName);
        } catch (error) {
            setStatus(error?.message || 'Nie udało się pobrać rankingu.', 'error');
        } finally { refreshing = false; }
    }

    async function testLootlog() {
        if (refreshing) return;
        const titan = syncNpcFromMap({ announce: true });
        const guildId = String(settings.guildId).trim();
        const npcName = String(titan?.name || settings.selectedNpcName).trim();
        if (!npcName) return;
        if (!/^\d+$/.test(guildId)) { setStatus('Podaj prawidłowe ID grupy Lootlog.', 'error'); return; }
        refreshing = true; setStatus(`Test Lootlog: ${npcName}…`);
        try {
            const filters = query({ period: '3d', limit: 50, search: npcName, world: settings.world });
            const stats = await request(`/guilds/${guildId}/stats/kills/top-npcs${filters}`);
            const npc = npcFromPayload(stats, npcName);
            if (npc) {
                saveSettings({ npcId: String(npc.npcId ?? npc.id), npcName: titan?.name || '' });
                setStatus(`Test OK — znaleziono „${npcName}” w Lootlogu.`, 'ok');
            } else {
                setStatus(`Lootlog działa, ale „${npcName}” nie jest w pierwszych 50 rekordach z 3 dni. Wpisz ID NPC w konfiguracji.`, 'error');
            }
        } catch (error) {
            setStatus(`Test nieudany: ${error?.message || 'brak odpowiedzi Lootlog.'}`, 'error');
        } finally { refreshing = false; }
    }

    function refreshTitanSelect() {
        const select = panel?.querySelector('[data-titan-select]');
        if (!select) return;
        select.replaceChildren();
        const automatic = document.createElement('option');
        automatic.value = ''; automatic.textContent = 'Automatycznie z mapy'; select.append(automatic);
        for (const name of settings.titanCatalog || []) {
            const option = document.createElement('option'); option.value = name; option.textContent = name; select.append(option);
        }
        select.value = settings.selectedNpcName || '';
    }

    async function loadTitanCatalog() {
        if (refreshing) return;
        const guildId = String(settings.guildId).trim();
        if (!/^\d+$/.test(guildId)) { setStatus('Podaj prawidłowe ID grupy Lootlog.', 'error'); return; }
        refreshing = true; setStatus('Pobieranie tytanów ze statystyk Lootlog…');
        try {
            // Ten endpoint jest używany przez widok statystyk Lootloga. W przeciwieństwie
            // do katalogu nie zwraca 404 i respektuje uprawnienia bieżącej sesji.
            const payload = await request(`/guilds/${guildId}/stats/kills/top-npcs${query({ period: 'all', limit: 50, npcType: 'TITAN', world: settings.world })}`);
            const names = titanNamesFromPayload(payload);
            if (!names.length) {
                showDebug(payload);
                throw new Error('Lootlog nie zwrócił rozpoznawalnych rekordów NPC. Otwórz „DANE DIAGNOSTYCZNE” i prześlij ich treść.');
            }
            saveSettings({ titanCatalog: names }); refreshTitanSelect();
            debug.hidden = true;
            setStatus(`Pobrano ${names.length} tytanów ze statystyk grupy. Wybór ręczny jest dostępny jako fallback.`, 'ok');
        } catch (error) {
            setStatus(`Nie udało się pobrać katalogu: ${error?.message || 'brak odpowiedzi.'}`, 'error');
        } finally { refreshing = false; }
    }

    function field(labelText, key, placeholder = '') {
        const label = document.createElement('label'); label.textContent = labelText;
        const input = document.createElement('input'); input.value = settings[key] || ''; input.placeholder = placeholder;
        input.dataset.field = key;
        input.addEventListener('change', () => saveSettings({ [key]: input.value.trim() }));
        label.append(input); return label;
    }

    function buildUi() {
        const button = document.createElement('button');
        button.id = 'lootlog-fair-group-button'; button.type = 'button'; button.textContent = 'LL'; button.title = 'Lootlog Fair Group';
        Object.assign(button.style, { left: `${settings.x}px`, top: `${settings.y}px` });
        panel = document.createElement('section'); panel.id = 'lootlog-fair-group'; panel.hidden = true;
        panel.innerHTML = `<header><strong>LOOTLOG · FAIR GROUP <small>v${VERSION}</small></strong><button type="button" data-close aria-label="Zamknij">×</button></header><div class="llfg-config"></div><div class="llfg-picker"><select data-titan-select title="Używane tylko, gdy tytana nie ma na mapie"></select><button type="button" data-load-titans>POBIERZ TYTANY</button></div><div class="llfg-actions"><button type="button" data-test>TEST ODCZYTU</button><button type="button" data-refresh>ODŚWIEŻ RANKING</button></div><p class="llfg-status" data-status>Automatyczny odczyt z mapy ma pierwszeństwo przed wyborem z listy ze statystyk grupy.</p><details class="llfg-debug"><summary>DANE DIAGNOSTYCZNE</summary><pre data-debug></pre></details><div class="llfg-list"></div><footer>Sortowanie rosnąco: najmniej bić = najwyższy priorytet.</footer>`;
        const config = panel.querySelector('.llfg-config');
        const guildField = field('ID grupy Lootlog', 'guildId', 'z linku Lootlog');
        const npcField = field('Potwór (z mapy)', 'npcName', 'wykrywany automatycznie');
        const npcInput = npcField.querySelector('input');
        npcInput.readOnly = true;
        npcInput.title = 'Ta nazwa jest odczytywana automatycznie wyłącznie z tytana na aktualnej mapie.';
        config.append(guildField, npcField, field('ID NPC Lootlog (opcjonalne)', 'npcId', 'gdy potwora nie ma w top 50'), field('Świat (opcjonalnie)', 'world', 'np. fobos'));
        refreshTitanSelect();
        status = panel.querySelector('[data-status]'); list = panel.querySelector('.llfg-list'); debug = panel.querySelector('[data-debug]');
        let drag = null;
        let suppressClick = false;
        button.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            const rect = button.getBoundingClientRect();
            drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, dx: event.clientX - rect.left, dy: event.clientY - rect.top, moved: false };
            button.setPointerCapture(event.pointerId);
        });
        button.addEventListener('pointermove', event => {
            if (!drag || event.pointerId !== drag.id) return;
            if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 3) drag.moved = true;
            if (!drag.moved) return;
            const x = Math.max(0, Math.min(innerWidth - button.offsetWidth, event.clientX - drag.dx));
            const y = Math.max(0, Math.min(innerHeight - button.offsetHeight, event.clientY - drag.dy));
            button.style.left = `${x}px`; button.style.top = `${y}px`;
        });
        function endDrag(event) {
            if (!drag || event.pointerId !== drag.id) return;
            const finished = drag; drag = null;
            if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
            if (finished.moved) {
                suppressClick = true;
                saveSettings({ x: Math.round(parseFloat(button.style.left)), y: Math.round(parseFloat(button.style.top)) });
            }
        }
        button.addEventListener('pointerup', endDrag);
        button.addEventListener('pointercancel', endDrag);
        button.addEventListener('click', () => {
            if (suppressClick) { suppressClick = false; return; }
            panel.hidden = !panel.hidden; if (!panel.hidden) refresh();
        });
        panel.querySelector('[data-close]').addEventListener('click', () => { panel.hidden = true; });
        panel.querySelector('[data-titan-select]').addEventListener('change', event => {
            saveSettings({ selectedNpcName: event.target.value, npcId: '' });
            setStatus(event.target.value ? `Wybrano fallback: ${event.target.value}.` : 'Wybór ręczny wyłączony — używany będzie tylko tytan z mapy.');
        });
        panel.querySelector('[data-load-titans]').addEventListener('click', loadTitanCatalog);
        panel.querySelector('[data-test]').addEventListener('click', testLootlog);
        panel.querySelector('[data-refresh]').addEventListener('click', refresh);
        document.body.append(button, panel);
        injectCss();
    }

    function injectCss() {
        const style = document.createElement('style');
        style.textContent = '#lootlog-fair-group-button{position:fixed;z-index:34000;width:32px;height:26px;border:1px solid #888;border-radius:0;background:#050505;color:#eee;font:700 9px Arial;cursor:pointer;touch-action:none}#lootlog-fair-group-button:hover{border-color:#fff;box-shadow:0 0 8px #fff9}#lootlog-fair-group{position:fixed;z-index:34001;left:18px;top:245px;width:330px;max-width:calc(100vw - 24px);border:1px solid #777;background:#050505;color:#ddd;box-shadow:0 6px 22px #000;font:11px Arial}#lootlog-fair-group[hidden]{display:none}#lootlog-fair-group *{box-sizing:border-box}#lootlog-fair-group header{height:28px;display:flex;align-items:center;justify-content:space-between;padding:0 7px;border-bottom:1px solid #555;color:#fff}#lootlog-fair-group header button{border:0;background:none;color:#ddd;font-size:16px;cursor:pointer}.llfg-config{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:6px}.llfg-config label{display:grid;gap:2px;color:#aaa;font-size:9px}.llfg-config input,.llfg-picker select{width:100%;height:22px;border:1px solid #555;border-radius:0;background:#0a0a0a;color:#eee;padding:2px 4px;font:10px Arial}.llfg-picker{display:grid;grid-template-columns:minmax(0,1fr) 110px;gap:4px;padding:0 6px 6px}.llfg-picker button{border:1px solid #777;border-radius:0;background:#111;color:#eee;font:700 8px Arial;cursor:pointer}.llfg-actions{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:0 6px 6px}.llfg-actions button{width:100%;height:23px;border:1px solid #777;border-radius:0;background:#111;color:#eee;font:700 9px Arial;cursor:pointer}.llfg-actions button:hover,.llfg-picker button:hover{border-color:#fff}.llfg-status{min-height:27px;margin:0;padding:5px 7px;border-top:1px solid #333;border-bottom:1px solid #333;color:#aaa}.llfg-status[data-type="error"]{color:#ff8585}.llfg-status[data-type="ok"]{color:#8dff9f}.llfg-debug{margin:0 6px 6px;color:#aaa;font-size:9px}.llfg-debug pre{max-height:180px;overflow:auto;margin:4px 0 0;padding:5px;border:1px solid #333;background:#090909;color:#bbb;font:9px/1.25 monospace;white-space:pre-wrap}.llfg-list{max-height:280px;overflow:auto}.llfg-row{display:grid;grid-template-columns:25px minmax(0,1fr) 45px;gap:4px;align-items:center;min-height:28px;padding:3px 7px;border-bottom:1px solid #252525}.llfg-row b{color:#aaa}.llfg-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff}.llfg-count{text-align:right;color:#fff;font-weight:700}.llfg-row small{grid-column:2 / 4;color:#888;font-size:9px}.llfg-empty{padding:12px 7px;color:#999;text-align:center}#lootlog-fair-group footer{padding:5px 7px;color:#888;font-size:9px}';
        document.head.append(style);
    }

    function waitForGame() {
        if (document.body && (page.Engine?.allInit === true || page.g?.hero)) buildUi();
        else setTimeout(waitForGame, 250);
    }
    waitForGame();
})();
