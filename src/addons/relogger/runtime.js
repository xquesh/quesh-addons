import { characterList, worldName, sortedHeroes, heroTimers, changeCharacter, heroLevel } from './data.js';
import { barStyle } from './style.js';

export function startRelogger(ctx) {
    const page = ctx.game.page;
    const { scheduler, settings } = ctx;
    const bar = document.createElement('aside');
    bar.id = 'qaddons-relogger';
    bar.setAttribute('aria-label', 'Przelogawka QADDONS');
    bar.innerHTML = `<header><button type="button" data-world-toggle aria-label="Wybierz świat" aria-expanded="false" aria-controls="qr-world-menu"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor"><circle cx="8" cy="8" r="6"/><ellipse cx="8" cy="8" rx="2.5" ry="6"/><path d="M2 8h12"/></g></svg></button><button type="button" data-refresh hidden>Odśwież postacie</button></header><div id="qr-world-menu" class="qr-world-menu" role="group" aria-label="Wybór świata" hidden></div><div class="qr-body"><div class="qr-cards"></div><div class="qr-status" role="status"></div><div class="qr-details" hidden></div></div>`;
    const worldButton = bar.querySelector('[data-world-toggle]');
    const worldMenu = bar.querySelector('.qr-world-menu');
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
    let reloggingFrom = '';
    let reloggingObserved = false;
    let relogStartedAt = 0;
    let relogTimeout = 0;
    const entries = new Map();
    ctx.styles.set('bar', barStyle);
    document.body.append(bar);

    function position() {
        const dock = settings.barPosition === 'top' ? 'top' : 'bottom';
        const anchor = dock === 'top'
            ? document.querySelector('.interface-layer .positioner.top, .positioner.top')
            : document.querySelector('.bottom-panel-of-bottom-positioner');
        const anchorRect = anchor?.getBoundingClientRect();
        const gameRect = document.querySelector('.game-window-positioner')?.getBoundingClientRect();
        const left = gameRect?.width > 0 ? Math.max(0, gameRect.left) : 0;
        const right = gameRect?.width > 0 ? Math.min(page.innerWidth, gameRect.right) : page.innerWidth;
        const height = anchorRect?.height > 0 ? Math.max(36, Math.min(60, anchorRect.height)) : 52;
        bar.style.setProperty('--qr-height', `${height}px`);
        const width = Math.min(bar.getBoundingClientRect().width, right - left - 8);
        const value = Number(settings.horizontal);
        const horizontal = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 100;
        const vertical = anchorRect?.height > 0 ? (dock === 'top' ? anchorRect.top : anchorRect.bottom) : (dock === 'top' ? 0 : page.innerHeight);
        bar.dataset.dock = dock;
        bar.style.left = `${Math.max(0, left + 4 + Math.max(0, right - left - width - 8) * horizontal / 100)}px`;
        bar.style.top = `${Math.max(0, Math.min(page.innerHeight - height, dock === 'top' ? vertical : vertical - height))}px`;
        const barLeft = parseFloat(bar.style.left);
        details.style.left = `${Math.max(-barLeft, Math.min(0, page.innerWidth - barLeft - 264))}px`;
        details.style.right = 'auto';
    }
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
            const title = `${hero.nick} · ${hero.lvl}${hero.prof}\n${timers.length ? timers.map(timer => `${timer.name}: ${timer.text}${timer.state === 'window' ? ' · możliwy respawn' : ''}`).join('\n') : settings.showTimers && !available ? 'Dane timerów niedostępne' : 'Brak aktywnych timerów'}`;
            if (button.title !== title) button.title = title;
            if (selectedHero === hero.id && details.textContent !== title) details.textContent = title;
        }
        const text = error || (relogging ? 'Zmienianie postaci…' : loading ? 'Pobieranie postaci…' : !loaded ? 'Oczekiwanie na zalogowanie do gry…' : !heroes.length ? 'Brak postaci na koncie.' :
            settings.showTimers ? available ? 'Zielony: czas minął · bursztynowy: możliwy respawn · najedź, aby zobaczyć timery.' : 'Timery niedostępne — przelogowanie działa niezależnie.' : 'Kliknij postać, aby się przelogować.');
        if (status.textContent !== text) status.textContent = text;
        bar.dataset.notice = String(!!error || !loaded);
        worldButton.title = `${currentWorld || 'Świat'} — ${text}`;
    }
    function render() {
        const worlds = [...new Set(heroes.map(hero => hero.world))].sort();
        currentWorld = worlds.includes(settings.selectedWorld) ? settings.selectedWorld : worlds.includes(currentWorld) ? currentWorld : worlds[0] || '';
        worldMenu.replaceChildren(...worlds.map(world => { const option = document.createElement('button'); option.type = 'button'; option.dataset.world = world; option.textContent = world; option.setAttribute('aria-pressed', String(world === currentWorld)); return option; }));
        worldButton.disabled = !worlds.length;
        bar.querySelector('header').hidden = settings.showWorldButton === false;
        closeWorldMenu();
        cards.replaceChildren(); entries.clear(); selectedHero = ''; details.hidden = true;
        visible = sortedHeroes(heroes, currentWorld, settings.sort);
        visible.forEach((hero, index) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'qr-card'; button.dataset.hero = hero.id;
            button.disabled = relogging;
            button.innerHTML = '<span class="qr-portrait"></span><span class="qr-nick"></span><span class="qr-level"></span>';
            button.querySelector('.qr-nick').textContent = hero.nick;
            button.querySelector('.qr-level').textContent = heroLevel(hero);
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
            if (!scheduler.disposed) error = cause.name === 'AbortError' ? 'Przekroczono czas pobierania. Odśwież postacie w ustawieniach.' : 'Nie udało się pobrać postaci. Odśwież postacie w ustawieniach.';
        } finally {
            scheduler.clearTimeout(timeout);
            request = null; loading = false;
            if (!scheduler.disposed) { refresh.disabled = false; render(); }
        }
    }
    function unlockRelog(message = '') {
        scheduler.clearTimeout(relogTimeout); relogTimeout = 0;
        relogging = false; reloggingFrom = ''; reloggingObserved = false; relogStartedAt = 0;
        entries.forEach(button => { button.disabled = false; });
        if (message) error = message;
        updateTimers();
    }
    function relog(hero) {
        if (!hero || relogging) return;
        if (page.getCookie?.('user_id') !== account) { error = 'Konto się zmieniło. Odśwież listę postaci.'; updateTimers(); return; }
        try {
            reloggingFrom = String(page.Engine?.hero?.d?.id || '');
            changeCharacter(hero, page); relogging = true; error = '';
            reloggingObserved = page.Engine?.changePlayer?.id != null;
            relogStartedAt = Date.now();
            entries.forEach(button => { button.disabled = true; }); updateTimers();
            relogTimeout = scheduler.timeout(() => unlockRelog('Zmiana postaci nie zakończyła się. Możesz spróbować ponownie.'), 10000);
        }
        catch (cause) {
            reloggingFrom = ''; reloggingObserved = false; relogStartedAt = 0;
            error = cause.message; updateTimers();
        }
    }
    scheduler.listen(cards, 'click', event => relog(visible.find(hero => hero.id === event.target.closest('[data-hero]')?.dataset.hero)));
    scheduler.listen(cards, 'wheel', event => {
        if (cards.scrollWidth <= cards.clientWidth) return;
        cards.scrollLeft += event.deltaY || event.deltaX; event.preventDefault();
    }, { passive: false });
    const showDetails = event => {
        const button = event.target.closest('[data-hero]');
        if (!button) return;
        selectedHero = button.dataset.hero; details.textContent = button.title; details.hidden = false;
    };
    scheduler.listen(cards, 'pointerover', showDetails); scheduler.listen(cards, 'focusin', showDetails);
    scheduler.listen(bar, 'pointerleave', () => { if (!bar.contains(document.activeElement)) { selectedHero = ''; details.hidden = true; } });
    scheduler.listen(bar, 'focusout', event => { if (!bar.contains(event.relatedTarget)) { selectedHero = ''; details.hidden = true; } });
    function closeWorldMenu() { worldMenu.hidden = true; worldButton.setAttribute('aria-expanded', 'false'); }
    scheduler.listen(worldButton, 'click', () => {
        const open = worldMenu.hidden;
        worldMenu.hidden = !open; worldButton.setAttribute('aria-expanded', String(open));
        details.hidden = true; selectedHero = '';
        if (open) worldMenu.querySelector('[aria-pressed="true"]')?.focus();
    });
    scheduler.listen(worldMenu, 'click', event => {
        const option = event.target.closest('[data-world]');
        if (option) { ctx.changeSettings({ selectedWorld: option.dataset.world }); worldButton.focus(); }
    });
    scheduler.listen(document, 'pointerdown', event => { if (!worldMenu.contains(event.target) && !worldButton.contains(event.target)) closeWorldMenu(); });
    scheduler.listen(bar, 'keydown', event => { if (event.key === 'Escape' && !worldMenu.hidden) { closeWorldMenu(); worldButton.focus(); event.stopPropagation(); } });
    scheduler.listen(refresh, 'click', load);
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
        const activeHero = String(page.Engine?.hero?.d?.id || '');
        const changePending = page.Engine?.changePlayer?.id != null;
        if (relogging && changePending) reloggingObserved = true;
        if (relogging && activeHero && activeHero !== reloggingFrom) { unlockRelog(); render(); }
        else if (relogging && !changePending && (reloggingObserved || Date.now() - relogStartedAt >= 1500)) unlockRelog();
        if (account && user !== account) { unlockRelog(); heroes = []; loaded = false; account = ''; error = ''; attemptedAccount = ''; render(); }
        if (!loading && attemptedAccount !== user && page.Engine?.allInit === true && user && page.getCookie?.('hs3')) { attemptedAccount = user; load(); }
        updateTimers(); position(); scheduler.timeout(tick, 1000);
    };
    render(); tick();
}
