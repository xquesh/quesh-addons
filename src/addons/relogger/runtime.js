import { characterList, worldName, sortedHeroes, heroTimers, changeCharacter } from './data.js';
import { barStyle } from './style.js';
import { bindDrag } from '../../core/ui/controls.js';

export function startRelogger(ctx) {
    const page = ctx.game.page;
    const { scheduler, settings } = ctx;
    const bar = document.createElement('aside');
    bar.id = 'qaddons-relogger';
    bar.setAttribute('aria-label', 'Przelogawka QADDONS');
    bar.innerHTML = `<header><strong>POSTACIE</strong><select aria-label="Świat"></select><button type="button" data-refresh title="Odśwież listę postaci">↻</button><button type="button" data-collapse aria-label="Zwiń belkę">−</button></header><div class="qr-body"><div class="qr-cards"></div><div class="qr-status" role="status"></div><div class="qr-details" hidden></div></div>`;
    const select = bar.querySelector('select');
    const cards = bar.querySelector('.qr-cards');
    const status = bar.querySelector('.qr-status');
    const details = bar.querySelector('.qr-details');
    const refresh = bar.querySelector('[data-refresh]');
    let heroes = [];
    let visible = [];
    let currentWorld = '';
    let request = null;
    let loading = false;
    let loaded = false;
    let error = '';
    let account = '';
    let selectedHero = '';
    let relogging = false;
    const entries = new Map();
    ctx.styles.set('bar', barStyle);
    document.body.append(bar);

    function position() {
        const width = Math.min(512, page.innerWidth - 16);
        const x = Number.isFinite(settings.x) ? settings.x : page.innerWidth - width - 16;
        const y = Number.isFinite(settings.y) ? settings.y : 80;
        bar.style.left = `${Math.max(0, Math.min(page.innerWidth - width - 8, x))}px`;
        bar.style.top = `${Math.max(0, Math.min(page.innerHeight - 40, y))}px`;
    }
    bindDrag(bar, bar.querySelector('header'), scheduler, (x, y) => ctx.changeSettings({ x, y }));
    scheduler.listen(page, 'resize', position);
    function timersStore() {
        try {
            const name = page.Engine?.windowsData?.name?.addon_17;
            return name ? page.Engine.serverStorage?.get?.(name) : null;
        } catch { return null; }
    }
    function updateTimers() {
        const store = settings.showTimers ? timersStore() : null;
        const available = Array.isArray(store?.data);
        const now = Date.now() / 1000;
        for (const hero of visible) {
            const button = entries.get(hero.id);
            if (!button) continue;
            const timers = settings.showTimers ? heroTimers(store?.data, hero.id, now, store?.settings?.fadeout) : [];
            const next = timers[0];
            const state = next?.state || 'none';
            if (button.dataset.state !== state) button.dataset.state = state;
            const label = next?.text || '—';
            const time = button.querySelector('.qr-time');
            if (time.textContent !== label) time.textContent = label;
            const title = `${hero.nick} · ${hero.lvl}${hero.prof}\n${timers.length ? timers.map(timer => `${timer.name}: ${timer.text}${timer.state === 'window' ? ' · możliwy respawn' : ''}`).join('\n') : settings.showTimers && !available ? 'Dane timerów niedostępne' : 'Brak aktywnych timerów'}`;
            if (button.title !== title) button.title = title;
            if (selectedHero === hero.id && details.textContent !== title) details.textContent = title;
        }
        const text = error || (loading ? 'Pobieranie postaci…' : !loaded ? 'Oczekiwanie na zalogowanie do gry…' : !heroes.length ? 'Brak postaci na koncie.' :
            settings.showTimers ? available ? 'Zielony: czas minął · bursztynowy: możliwy respawn · najedź, aby zobaczyć timery.' : 'Timery niedostępne — przelogowanie działa niezależnie.' : 'Kliknij postać, aby się przelogować.');
        if (status.textContent !== text) status.textContent = text;
    }
    function render() {
        bar.dataset.compact = String(settings.compact === true);
        bar.querySelector('.qr-body').hidden = settings.collapsed === true;
        bar.querySelector('[data-collapse]').textContent = settings.collapsed ? '+' : '−';
        bar.querySelector('[data-collapse]').setAttribute('aria-label', settings.collapsed ? 'Rozwiń belkę' : 'Zwiń belkę');
        const worlds = [...new Set(heroes.map(hero => hero.world))].sort();
        currentWorld = worlds.includes(settings.selectedWorld) ? settings.selectedWorld : worlds.includes(currentWorld) ? currentWorld : worlds[0] || '';
        select.replaceChildren(...worlds.map(world => { const option = document.createElement('option'); option.value = world; option.textContent = world; return option; }));
        select.value = currentWorld; select.disabled = !worlds.length;
        cards.replaceChildren(); entries.clear(); selectedHero = ''; details.hidden = true;
        visible = sortedHeroes(heroes, currentWorld, settings.sort);
        visible.forEach((hero, index) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'qr-card'; button.dataset.hero = hero.id;
            button.innerHTML = '<span class="qr-portrait"></span><span class="qr-nick"></span><span class="qr-level"></span><span class="qr-time"></span>';
            button.querySelector('.qr-nick').textContent = hero.nick;
            button.querySelector('.qr-level').textContent = `${hero.lvl}${hero.prof}`;
            button.setAttribute('aria-label', `Przeloguj na ${hero.nick}, ${hero.world}${settings.hotkeys && index < 9 ? `, Alt+${index + 1}` : ''}`);
            button.setAttribute('aria-current', String(String(page.Engine?.hero?.d?.id) === hero.id));
            if (/^[a-zA-Z0-9_./-]+\.(gif|png|webp)$/i.test(hero.icon) && !hero.icon.includes('..')) button.querySelector('.qr-portrait').style.backgroundImage = `url("https://micc.garmory-cdn.cloud/obrazki/postacie/${hero.icon}")`;
            else button.querySelector('.qr-portrait').textContent = [...hero.nick][0] || '?';
            entries.set(hero.id, button); cards.append(button);
        });
        updateTimers(); position();
    }
    async function load() {
        const user = page.getCookie?.('user_id');
        const token = page.getCookie?.('hs3');
        if (loading || page.Engine?.allInit !== true || !user || !token) return;
        const controller = new AbortController(); request = controller;
        loading = true; error = ''; refresh.disabled = true; updateTimers();
        const timeout = scheduler.timeout(() => controller.abort(), 12000);
        try {
            const api = new URL(page.Engine.worldConfig.getApiDomain());
            if (api.protocol !== 'https:' || !/(^|\.)margonem\.(pl|com)$/.test(api.hostname)) throw new Error('Nieprawidłowy adres API gry.');
            const url = new URL('/account/charlist', api);
            url.searchParams.set('hs3', token);
            const response = await page.fetch(url.href, { credentials: 'include', signal: controller.signal });
            if (!response.ok) throw new Error('Serwer nie udostępnił listy postaci.');
            const list = characterList(await response.json());
            if (scheduler.disposed || page.getCookie?.('user_id') !== user) return;
            heroes = list; loaded = true; account = user;
            currentWorld = worldName(page.Engine.worldConfig.getWorldName());
        } catch (cause) {
            if (!scheduler.disposed) error = cause.name === 'AbortError' ? 'Przekroczono czas pobierania. Użyj ↻, aby ponowić.' : 'Nie udało się pobrać postaci. Użyj ↻, aby ponowić.';
        } finally {
            scheduler.clearTimeout(timeout);
            request = null; loading = false;
            if (!scheduler.disposed) { refresh.disabled = false; render(); }
        }
    }
    function relog(hero) {
        if (!hero || relogging) return;
        if (page.getCookie?.('user_id') !== account) { error = 'Konto się zmieniło. Odśwież listę postaci.'; updateTimers(); return; }
        try { changeCharacter(hero, page); relogging = true; entries.forEach(button => { button.disabled = true; }); }
        catch (cause) { error = cause.message; updateTimers(); }
    }
    scheduler.listen(cards, 'click', event => relog(visible.find(hero => hero.id === event.target.closest('[data-hero]')?.dataset.hero)));
    const showDetails = event => {
        const button = event.target.closest('[data-hero]');
        if (!button) return;
        selectedHero = button.dataset.hero; details.textContent = button.title; details.hidden = false;
    };
    scheduler.listen(cards, 'pointerover', showDetails); scheduler.listen(cards, 'focusin', showDetails);
    scheduler.listen(bar, 'pointerleave', () => { if (!bar.contains(document.activeElement)) { selectedHero = ''; details.hidden = true; } });
    scheduler.listen(bar, 'focusout', event => { if (!bar.contains(event.relatedTarget)) { selectedHero = ''; details.hidden = true; } });
    scheduler.listen(select, 'change', () => ctx.changeSettings({ selectedWorld: select.value }));
    scheduler.listen(refresh, 'click', load);
    scheduler.listen(bar.querySelector('[data-collapse]'), 'click', () => ctx.changeSettings({ collapsed: !settings.collapsed }));
    scheduler.listen(document, 'keydown', event => {
        if (!settings.hotkeys || !event.altKey || event.ctrlKey || event.shiftKey || event.metaKey || event.repeat || event.defaultPrevented || event.isComposing || event.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
        const index = /^Digit[1-9]$/.test(event.code) ? Number(event.code.slice(-1)) - 1 : -1;
        if (index < 0 || !visible[index]) return;
        event.preventDefault(); relog(visible[index]);
    });
    ctx.events.on('reloggerChanged', render);
    ctx.events.on('reloggerRefresh', load);
    scheduler.cleanup(() => { request?.abort(); bar.remove(); });
    let attemptedAccount = '';
    const tick = () => {
        const user = page.getCookie?.('user_id') || '';
        if (account && user !== account) { heroes = []; loaded = false; account = ''; error = ''; attemptedAccount = ''; render(); }
        if (!loading && attemptedAccount !== user && page.Engine?.allInit === true && user && page.getCookie?.('hs3')) { attemptedAccount = user; load(); }
        updateTimers(); scheduler.timeout(tick, 1000);
    };
    render(); tick();
}
