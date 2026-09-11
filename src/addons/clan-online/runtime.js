import { filterMembers, hasClan, memberLevel, onlineMembers, PROFESSION_NAMES, sortMembers } from './data.js';
import { CLAN_ONLINE_CSS } from './style.js';

function packetList(packet) {
    return Array.isArray(packet) ? packet.flat(Infinity).filter(Boolean) : [packet].filter(Boolean);
}

function partyIds(packet) {
    const party = packet?.party;
    if (!party || typeof party !== 'object') return null;
    const members = party.members && typeof party.members === 'object' ? party.members : party;
    return new Set(Object.entries(members).map(([key, value]) => String(value?.id ?? key)));
}

export function startClanOnline(ctx) {
    const page = ctx.game.page;
    let members = [];
    let party = new Set();
    let search = '';
    let busy = false;
    let lastUpdate = 0;
    let drag = null;
    let geometryTimer = 0;

    ctx.styles.set('runtime', CLAN_ONLINE_CSS);
    const button = document.createElement('button');
    button.id = 'qaddons-clan-online-button';
    button.type = 'button';
    button.title = 'Klanowicze online';
    button.innerHTML = '<span>KL</span><span class="qco-badge">0</span>';
    const panel = document.createElement('section');
    panel.id = 'qaddons-clan-online';
    panel.hidden = true;
    panel.innerHTML = `<header class="qco-head"><span>Klanowicze online <b data-count>(0)</b></span><button type="button" data-close aria-label="Zamknij">×</button></header>
        <div class="qco-tools"><input type="search" data-search placeholder="Szukaj nicku, lokacji, profesji…"><select data-sort>
            <option value="level-desc">Poziom malejąco</option><option value="level-asc">Poziom rosnąco</option><option value="name">Nick A–Z</option><option value="profession">Profesja</option><option value="location">Lokacja</option>
        </select><button type="button" class="qco-refresh" data-refresh title="Odśwież">↻</button></div>
        <div class="qco-list" data-list></div><footer class="qco-foot"><span data-status>Oczekiwanie na dane gry</span><span data-time></span></footer>`;
    document.body.append(panel);

    const list = panel.querySelector('[data-list]');
    const status = panel.querySelector('[data-status]');
    const time = panel.querySelector('[data-time]');
    const searchInput = panel.querySelector('[data-search]');
    const sortSelect = panel.querySelector('[data-sort]');

    function heroId() {
        return String(page.Engine?.hero?.d?.id ?? page.Engine?.hero?.id ?? page.g?.hero?.id ?? '');
    }

    function mountButton() {
        const host = document.querySelector('.top-left.main-buttons-container, .main-buttons-container, .interface-layer .top-left');
        if (host && button.parentElement !== host) host.append(button);
        else if (!host && !button.isConnected) document.body.append(button);
    }

    function placePanel() {
        const width = Math.max(250, Math.min(window.innerWidth - 12, Number(ctx.settings.windowWidth) || 370));
        const height = Math.max(145, Math.min(window.innerHeight - 12, Number(ctx.settings.windowHeight) || 310));
        panel.style.width = `${width}px`;
        panel.style.height = `${height}px`;
        const x = ctx.settings.windowX == null ? Math.max(6, window.innerWidth - width - 12) : Number(ctx.settings.windowX);
        panel.style.left = `${Math.max(0, Math.min(window.innerWidth - width, x || 0))}px`;
        panel.style.top = `${Math.max(0, Math.min(window.innerHeight - height, Number(ctx.settings.windowY) || 70))}px`;
    }

    function persistGeometry() {
        if (panel.hidden || !panel.isConnected) return;
        const next = {
            windowX: Math.round(panel.offsetLeft),
            windowY: Math.round(panel.offsetTop),
            windowWidth: Math.round(panel.offsetWidth),
            windowHeight: Math.round(panel.offsetHeight)
        };
        if (Object.entries(next).some(([key, value]) => Number(ctx.settings[key]) !== value)) ctx.changeSettings(next);
    }

    function scheduleGeometrySave() {
        clearTimeout(geometryTimer);
        geometryTimer = window.setTimeout(persistGeometry, 180);
    }

    function message(text) {
        status.textContent = text;
    }

    function render() {
        const visible = sortMembers(filterMembers(members, search), ctx.settings.sort);
        button.hidden = ctx.settings.showButton === false;
        button.querySelector('.qco-badge').textContent = String(members.length);
        panel.querySelector('[data-count]').textContent = `(${members.length})`;
        panel.dataset.wrap = String(Boolean(ctx.settings.wrapLocation));
        panel.style.setProperty('--qco-font-size', `${Math.max(9, Math.min(14, Number(ctx.settings.fontSize) || 11))}px`);
        searchInput.hidden = ctx.settings.searchEnabled === false;
        panel.querySelector('.qco-tools').style.gridTemplateColumns = ctx.settings.searchEnabled === false ? 'minmax(0,1fr) 27px' : '';
        sortSelect.value = ctx.settings.sort;
        list.replaceChildren();
        if (!visible.length) {
            const empty = document.createElement('div');
            empty.className = 'qco-empty';
            empty.textContent = hasClan(page) === false ? 'Nie należysz do żadnego klanu.' : members.length ? 'Brak wyników wyszukiwania.' : 'Brak klanowiczów online.';
            list.append(empty);
            return;
        }
        const ownId = heroId();
        for (const member of visible) {
            const row = document.createElement('div');
            row.className = 'qco-row';
            const name = document.createElement('span');
            name.className = 'qco-name';
            name.title = `${member.nick} · ${PROFESSION_NAMES[member.profession] || member.profession}`;
            const nick = document.createTextNode(member.nick + ' ');
            const level = document.createElement('span');
            level.className = 'qco-level';
            level.textContent = `(${memberLevel(member)})`;
            name.append(nick, level);
            const location = document.createElement('span');
            location.className = 'qco-location';
            const coordinates = Number.isFinite(member.x) && Number.isFinite(member.y) ? ` (${member.x},${member.y})` : '';
            location.textContent = member.location + (ctx.settings.showCoordinates ? coordinates : '');
            location.title = member.location + coordinates;
            const invite = document.createElement('button');
            invite.type = 'button';
            invite.className = 'qco-invite';
            invite.dataset.invite = String(member.id);
            invite.textContent = '+';
            invite.title = party.has(String(member.id)) ? 'Postać jest już w grupie' : 'Zaproś do grupy';
            invite.disabled = String(member.id) === ownId || party.has(String(member.id));
            row.append(name, location, invite);
            list.append(row);
        }
    }

    async function refresh(force = false) {
        if (busy || page.Engine?.allInit !== true || typeof page._g !== 'function') return;
        if (hasClan(page) === false) { members = []; message('Brak klanu'); render(); return; }
        if (!force && Date.now() - lastUpdate < 5000) return;
        busy = true;
        message('Odświeżanie…');
        try {
            const packet = await ctx.game.request('clan&a=members', data => Array.isArray(data?.members), {
                strip: ['members'], timeout: 6000, signal: ctx.scheduler.signal
            });
            members = onlineMembers(packet.members);
            lastUpdate = Date.now();
            time.textContent = new Date(lastUpdate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            message(`Online: ${members.length}`);
            render();
        } catch (error) {
            if (error?.name !== 'AbortError') message(error?.message || 'Nie udało się pobrać listy.');
        } finally { busy = false; }
    }

    function tick() {
        if (!panel.hidden) refresh();
        const seconds = [7, 10, 15, 30, 60].includes(Number(ctx.settings.refreshInterval)) ? Number(ctx.settings.refreshInterval) : 10;
        ctx.scheduler.timeout(tick, seconds * 1000);
    }

    mountButton();
    placePanel();
    render();
    ctx.scheduler.observer(MutationObserver, mountButton).observe(document.body, { childList: true, subtree: true });
    ctx.scheduler.listen(button, 'click', () => { panel.hidden = !panel.hidden; if (!panel.hidden) refresh(true); });
    ctx.scheduler.listen(panel.querySelector('[data-close]'), 'click', () => { panel.hidden = true; });
    ctx.scheduler.listen(panel.querySelector('[data-refresh]'), 'click', () => refresh(true));
    ctx.scheduler.listen(searchInput, 'input', () => { search = searchInput.value; render(); });
    ctx.scheduler.listen(sortSelect, 'change', () => { ctx.changeSettings({ sort: sortSelect.value }); render(); });
    ctx.scheduler.listen(list, 'click', event => {
        const invite = event.target.closest('[data-invite]');
        if (!invite || invite.disabled || typeof page._g !== 'function') return;
        page._g(`party&a=inv&id=${encodeURIComponent(invite.dataset.invite)}`);
        invite.disabled = true;
        invite.title = 'Zaproszenie wysłane';
        message('Wysłano zaproszenie do grupy.');
    });
    ctx.scheduler.listen(panel.querySelector('.qco-head'), 'pointerdown', event => {
        if (event.target.closest('button')) return;
        const rect = panel.getBoundingClientRect();
        drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        event.currentTarget.setPointerCapture?.(event.pointerId);
    });
    ctx.scheduler.listen(panel.querySelector('.qco-head'), 'pointermove', event => {
        if (!drag) return;
        panel.style.left = `${Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, event.clientX - drag.x))}px`;
        panel.style.top = `${Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, event.clientY - drag.y))}px`;
    });
    ctx.scheduler.listen(panel.querySelector('.qco-head'), 'pointerup', () => {
        if (!drag) return;
        drag = null;
        persistGeometry();
    });
    if (typeof ResizeObserver === 'function') ctx.scheduler.observer(ResizeObserver, scheduleGeometrySave).observe(panel);
    ctx.scheduler.listen(window, 'resize', placePanel, { passive: true });
    ctx.events.on('gamePacket', packet => {
        for (const data of packetList(packet)) {
            const next = partyIds(data);
            if (next) party = next;
        }
        if (!panel.hidden) render();
    });
    ctx.events.on('clanOnlineChanged', () => { placePanel(); render(); });
    ctx.events.on('clanOnlineRefresh', () => refresh(true));
    ctx.scheduler.cleanup(() => { clearTimeout(geometryTimer); button.remove(); panel.remove(); });
    tick();
}
