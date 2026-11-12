// ==UserScript==
// @name         Lootlog Fair Group
// @namespace    quesh.addons
// @version      1.2.7
// @description  Ranking graczy z mapy według liczby bić wybranego potwora w ostatnich 7 dniach.
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
    const VERSION = '1.2.7';
    const STORAGE_KEY = 'lootlog-fair-group-settings-v1';
    const DEFAULTS = Object.freeze({
        guildId: '1447651903222841461',
        npcName: '',
        selectedNpcName: '',
        titanCatalog: [],
        npcId: '',
        world: '',
        x: 18,
        y: 210,
        panelX: 56,
        panelY: 245,
        panelHeight: 390
    });
    const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    let settings = loadSettings();
    let panel;
    let status;
    let list;
    let refreshing = false;
    let latestRanking = null;

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
        for (const [key, value] of Object.entries(params)) {
            if (value === '' || value == null) continue;
            if (Array.isArray(value)) value.filter(item => item !== '' && item != null).forEach(item => search.append(key, String(item)));
            else search.set(key, String(value));
        }
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
                players.set(id, { id, nick, level: data.lvl ?? data.level ?? raw?.lvl ?? raw?.level ?? '', isHero: false });
            }
        }
        const hero = page.Engine?.hero?.d || page.Engine?.hero || page.g?.hero || {};
        const nick = String(hero.nick ?? hero.name ?? '').trim();
        const id = Number(hero.id);
        if (nick && Number.isFinite(id)) players.set(id, { id, nick, level: hero.lvl ?? hero.level ?? '', isHero: true });
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
            const kills = Number(
                entry.kills ?? entry.killCount ?? entry.totalKills ?? entry.uniqueKills ?? entry.participationCount ?? entry.participations ??
                entry.count ?? entry.stats?.kills ?? entry.stats?.killCount ?? entry.stats?.totalKills ?? 0
            );
            if (!name || !Number.isFinite(kills)) continue;
            const key = normalize(name);
            merged.set(key, Math.max(merged.get(key) ?? 0, kills));
        }
        return merged;
    }

    function lootRecords(payload) {
        return arraysIn(payload).flat().filter(entry => entry && typeof entry === 'object' && Array.isArray(entry.players) && Array.isArray(entry.npcs));
    }

    function lootParticipations(records, npcName) {
        const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const wanted = normalize(npcName);
        const counts = new Map();
        const lastHit = new Map();
        const valid = records.filter(record => {
            const time = Date.parse(record.createdAt ?? record.date ?? '');
            const hasNpc = record.npcs.some(npc => normalize(npc?.name ?? npc?.npcName ?? npc) === wanted);
            return hasNpc && Number.isFinite(time) && time >= since;
        });
        for (const record of valid) for (const player of record.players) {
            const name = String(player?.name ?? player?.nick ?? '').trim();
            const key = normalize(name);
            const timestamp = Date.parse(record.createdAt ?? record.date ?? '');
            if (name) {
                counts.set(key, (counts.get(key) ?? 0) + 1);
                lastHit.set(key, Math.max(lastHit.get(key) ?? 0, timestamp));
            }
        }
        return { counts, lastHit, records: valid };
    }

    function formatDate(timestamp) {
        return timestamp ? new Date(timestamp).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }) : '';
    }

    function renderRanking(players, killsByName, lastHitByName, npcName) {
        list.replaceChildren();
        const ranked = players.map(player => {
            const key = normalize(player.nick);
            return { ...player, kills: killsByName.get(key) ?? 0, lastHit: lastHitByName.get(key) ?? 0, found: killsByName.has(key) };
        }).sort((a, b) => a.kills - b.kills || a.lastHit - b.lastHit || a.nick.localeCompare(b.nick, 'pl'));
        if (!ranked.length) {
            const empty = document.createElement('p'); empty.className = 'llfg-empty'; empty.textContent = 'Na aktualnej mapie nie znaleziono innych postaci.';
            list.append(empty); return;
        }
        ranked.forEach((player, index) => {
            const row = document.createElement('div'); row.className = 'llfg-row';
            const rank = document.createElement('b'); rank.textContent = `${index + 1}.`;
            const name = document.createElement('span'); name.className = 'llfg-name'; name.textContent = `${player.nick}${player.level !== '' ? ` (${player.level})` : ''}`;
            const count = document.createElement('span'); count.className = 'llfg-count'; count.textContent = `${player.kills} bić`;
            const note = document.createElement('small'); note.textContent = player.found ? `Lootlog · ostatnio ${formatDate(player.lastHit)}` : 'brak wpisu · 0';
            if (player.isHero) {
                const self = document.createElement('span'); self.className = 'llfg-self'; self.textContent = 'TY';
                row.append(rank, name, count, self, note);
            } else {
                const invite = document.createElement('button'); invite.type = 'button'; invite.className = 'llfg-invite'; invite.textContent = '+';
                invite.title = `Zaproś ${player.nick} do drużyny`;
                invite.addEventListener('click', () => {
                    if (typeof page._g !== 'function') { setStatus('Gra nie jest gotowa do wysłania zaproszenia.', 'error'); return; }
                    page._g(`party&a=inv&id=${encodeURIComponent(player.id)}`);
                    setStatus(`Wysłano zaproszenie do: ${player.nick}.`, 'ok');
                });
                row.append(rank, name, count, invite, note);
            }
            list.append(row);
        });
        setStatus(`Ranking: ${npcName} · ${ranked.length} osób z mapy · ostatnie 7 dni.`, 'ok');
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
            const filters = query({ npcs: [npcName], limit: 100, world: settings.world });
            const payload = await request(`/guilds/${guildId}/loots${filters}`);
            const participation = lootParticipations(lootRecords(payload), npcName);
            const killsByName = participation.counts;
            const players = getMapPlayers();
            const matched = players.filter(player => killsByName.has(normalize(player.nick)));
            const namesMismatch = killsByName.size && !matched.length;
            latestRanking = { killsByName, lastHit: participation.lastHit, npcName };
            renderRanking(players, killsByName, participation.lastHit, npcName);
            if (!participation.records.length) {
                setStatus(`Nie znaleziono zapisanych walk „${npcName}” z ostatnich 7 dni.`, 'error');
            } else if (namesMismatch) setStatus('Lootlog zwrócił osoby, ale ich nazwy nie pasują do nicków na mapie.', 'error');
        } catch (error) {
            setStatus(error?.message || 'Nie udało się pobrać rankingu.', 'error');
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
                throw new Error('Lootlog nie zwrócił rozpoznawalnych rekordów NPC.');
            }
            saveSettings({ titanCatalog: names }); refreshTitanSelect();
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
        panel.style.left = `${settings.panelX}px`; panel.style.top = `${settings.panelY}px`; panel.style.height = `${settings.panelHeight}px`;
        panel.innerHTML = `<header><strong>LOOTLOG · FAIR GROUP <small>v${VERSION}</small></strong><button type="button" data-close aria-label="Zamknij">×</button></header><div class="llfg-config"></div><div class="llfg-picker"><select data-titan-select title="Używane tylko, gdy tytana nie ma na mapie"></select><button type="button" data-load-titans>POBIERZ TYTANY</button></div><div class="llfg-actions"><button type="button" data-refresh>ODŚWIEŻ RANKING</button></div><p class="llfg-status" data-status>Automatyczny odczyt z mapy ma pierwszeństwo przed wyborem z listy ze statystyk grupy.</p><div class="llfg-list"></div><div class="llfg-resize" data-resize title="Przeciągnij pionowo, aby zmienić wysokość okna">↕ PRZECIĄGNIJ, ABY ZMIENIĆ WYSOKOŚĆ</div><footer>Sortowanie rosnąco: najmniej bić = najwyższy priorytet.</footer>`;
        const config = panel.querySelector('.llfg-config');
        const guildField = field('ID grupy Lootlog', 'guildId', 'z linku Lootlog');
        const npcField = field('Potwór (z mapy)', 'npcName', 'wykrywany automatycznie');
        const npcInput = npcField.querySelector('input');
        npcInput.readOnly = true;
        npcInput.title = 'Ta nazwa jest odczytywana automatycznie wyłącznie z tytana na aktualnej mapie.';
        config.append(guildField, npcField, field('Świat (opcjonalnie)', 'world', 'np. fobos'));
        refreshTitanSelect();
        status = panel.querySelector('[data-status]'); list = panel.querySelector('.llfg-list');
        // Margonem przechwytuje kółko myszy na poziomie gry. Przewijamy listę
        // ręcznie, aby dłuższy ranking zawsze dało się przeczytać bez ruszania mapy.
        list.addEventListener('wheel', event => {
            event.preventDefault();
            event.stopPropagation();
            list.scrollTop += event.deltaY;
        }, { passive: false });
        const resizeHandle = panel.querySelector('[data-resize]');
        let resize = null;
        resizeHandle.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            resize = { id: event.pointerId, y: event.clientY, height: panel.offsetHeight };
            resizeHandle.setPointerCapture(event.pointerId);
            event.preventDefault();
        });
        resizeHandle.addEventListener('pointermove', event => {
            if (!resize || event.pointerId !== resize.id) return;
            const height = Math.max(250, Math.min(innerHeight - 12, resize.height + event.clientY - resize.y));
            panel.style.height = `${height}px`;
        });
        function endResize(event) {
            if (!resize || event.pointerId !== resize.id) return;
            resize = null;
            if (resizeHandle.hasPointerCapture(event.pointerId)) resizeHandle.releasePointerCapture(event.pointerId);
            saveSettings({ panelHeight: Math.round(panel.offsetHeight) });
        }
        resizeHandle.addEventListener('pointerup', endResize);
        resizeHandle.addEventListener('pointercancel', endResize);
        const header = panel.querySelector('header');
        let panelDrag = null;
        header.addEventListener('pointerdown', event => {
            if (event.button !== 0 || event.target.closest('button')) return;
            const rect = panel.getBoundingClientRect();
            panelDrag = { id: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
            header.setPointerCapture(event.pointerId); event.preventDefault();
        });
        header.addEventListener('pointermove', event => {
            if (!panelDrag || event.pointerId !== panelDrag.id) return;
            const x = Math.max(0, Math.min(innerWidth - panel.offsetWidth, event.clientX - panelDrag.dx));
            const y = Math.max(0, Math.min(innerHeight - 28, event.clientY - panelDrag.dy));
            panel.style.left = `${x}px`; panel.style.top = `${y}px`;
        });
        function endPanelDrag(event) {
            if (!panelDrag || event.pointerId !== panelDrag.id) return;
            panelDrag = null;
            if (header.hasPointerCapture(event.pointerId)) header.releasePointerCapture(event.pointerId);
            saveSettings({ panelX: Math.round(parseFloat(panel.style.left)), panelY: Math.round(parseFloat(panel.style.top)) });
        }
        header.addEventListener('pointerup', endPanelDrag);
        header.addEventListener('pointercancel', endPanelDrag);
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
        panel.querySelector('[data-refresh]').addEventListener('click', refresh);
        document.body.append(button, panel);
        injectCss();
        // Nowe osoby mogą pojawić się po odczycie Lootloga. Odświeżamy tylko
        // dane mapy — bez cyklicznych dodatkowych zapytań do zewnętrznej usługi.
        setInterval(() => {
            if (panel.hidden || !latestRanking) return;
            renderRanking(getMapPlayers(), latestRanking.killsByName, latestRanking.lastHit, latestRanking.npcName);
        }, 5000);
    }

    function injectCss() {
        const style = document.createElement('style');
        style.textContent = '#lootlog-fair-group-button{position:fixed;z-index:34000;width:32px;height:26px;border:1px solid #888;border-radius:0;background:#050505;color:#eee;font:700 9px Arial;cursor:pointer;touch-action:none}#lootlog-fair-group-button:hover{border-color:#fff;box-shadow:0 0 8px #fff9}#lootlog-fair-group{position:fixed;z-index:34001;display:flex;flex-direction:column;width:330px;min-height:250px;max-width:calc(100vw - 24px);max-height:calc(100vh - 12px);border:1px solid #777;background:#050505;color:#ddd;box-shadow:0 6px 22px #000;font:11px Arial;overflow:hidden}#lootlog-fair-group[hidden]{display:none}#lootlog-fair-group *{box-sizing:border-box}#lootlog-fair-group header{height:28px;flex:0 0 28px;display:flex;align-items:center;justify-content:space-between;padding:0 7px;border-bottom:1px solid #555;color:#fff;cursor:move;touch-action:none}#lootlog-fair-group header button{border:0;background:none;color:#ddd;font-size:16px;cursor:pointer}.llfg-config{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:6px}.llfg-config label{display:grid;gap:2px;color:#aaa;font-size:9px}.llfg-config input,.llfg-picker select{width:100%;height:22px;border:1px solid #555;border-radius:0;background:#0a0a0a;color:#eee;padding:2px 4px;font:10px Arial}.llfg-picker{display:grid;grid-template-columns:minmax(0,1fr) 110px;gap:4px;padding:0 6px 6px}.llfg-picker button{border:1px solid #777;border-radius:0;background:#111;color:#eee;font:700 8px Arial;cursor:pointer}.llfg-actions{padding:0 6px 6px}.llfg-actions button{width:100%;height:23px;border:1px solid #777;border-radius:0;background:#111;color:#eee;font:700 9px Arial;cursor:pointer}.llfg-actions button:hover,.llfg-picker button:hover{border-color:#fff}.llfg-status{min-height:27px;margin:0;padding:5px 7px;border-top:1px solid #333;border-bottom:1px solid #333;color:#aaa}.llfg-status[data-type="error"]{color:#ff8585}.llfg-status[data-type="ok"]{color:#8dff9f}.llfg-list{min-height:36px;flex:1 1 auto;overflow-x:hidden;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#858585 #090909}.llfg-list::-webkit-scrollbar{width:8px}.llfg-list::-webkit-scrollbar-track{background:#090909;border-left:1px solid #333}.llfg-list::-webkit-scrollbar-thumb{background:#5c5c5c;border:1px solid #999}.llfg-list::-webkit-scrollbar-thumb:hover{background:#aaa}.llfg-row{display:grid;grid-template-columns:25px minmax(0,1fr) 45px 20px;gap:4px;align-items:center;min-height:28px;padding:3px 7px;border-bottom:1px solid #252525}.llfg-row b{color:#aaa}.llfg-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff}.llfg-count{text-align:right;color:#fff;font-weight:700}.llfg-invite{width:19px;height:19px;padding:0;border:1px solid #666;border-radius:0;background:#101010;color:#fff;font:700 14px/16px Arial;cursor:pointer}.llfg-invite:hover{border-color:#fff;box-shadow:0 0 5px #fff8}.llfg-self{color:#888;text-align:center;font:700 8px Arial}.llfg-row small{grid-column:2 / 5;color:#888;font-size:9px}.llfg-empty{padding:12px 7px;color:#999;text-align:center}.llfg-resize{height:18px;flex:0 0 18px;display:flex;align-items:center;justify-content:center;cursor:ns-resize;border-top:1px solid #555;border-bottom:1px solid #333;background:#111;color:#aaa;font:700 8px Arial;letter-spacing:.2px;touch-action:none;user-select:none}.llfg-resize:hover{border-color:#ddd;background:#1c1c1c;color:#fff}#lootlog-fair-group footer{flex:0 0 auto;padding:5px 7px;color:#888;font-size:9px}';
        document.head.append(style);
    }

    function waitForGame() {
        if (document.body && (page.Engine?.allInit === true || page.g?.hero)) buildUi();
        else setTimeout(waitForGame, 250);
    }
    waitForGame();
})();
