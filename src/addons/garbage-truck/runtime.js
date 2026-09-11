import { garbageCandidates, inventoryItems } from './data.js';
import { GARBAGE_TRUCK_CSS } from './style.js';

function escapeText(value) { return String(value ?? ''); }
function guestAccount(page) {
    const hero = page.Engine?.hero?.d || page.Engine?.hero || page.g?.hero || {};
    return Boolean(hero.guest ?? hero.isGuest ?? hero.is_guest);
}

export function startGarbageTruck(ctx) {
    const page = ctx.game.page;
    let candidates = [];
    let busy = false;
    let lastPrompt = '';
    let scanTimer = 0;
    ctx.styles.set('runtime', GARBAGE_TRUCK_CSS);

    const button = document.createElement('button');
    button.id = 'qaddons-garbage-truck-button'; button.type = 'button'; button.textContent = 'ŚM'; button.title = 'Śmieciara — sprawdź przedmioty';
    const panel = document.createElement('section');
    panel.id = 'qaddons-garbage-truck'; panel.hidden = true;
    panel.innerHTML = '<header class="qgt-head"><span>ŚMIECIARA</span><button type="button" data-close aria-label="Zamknij">×</button></header><div class="qgt-body"><div data-info></div><div class="qgt-list" data-list></div><div class="qgt-actions"><button type="button" data-destroy>WYWIEŹ</button><button type="button" data-cancel>ANULUJ</button></div></div>';
    document.body.append(button, panel);

    function place() {
        panel.style.left = `${Math.max(4, Math.round((innerWidth - panel.offsetWidth) / 2))}px`;
        panel.style.top = `${Math.max(4, Math.round((innerHeight - panel.offsetHeight) / 2))}px`;
    }
    function itemNode(item) {
        const row = document.createElement('div'); row.className = 'qgt-row';
        const icon = document.createElement('span'); icon.className = 'qgt-icon'; icon.textContent = 'ITEM';
        const source = [...document.querySelectorAll(`.item-id-${CSS.escape(String(item.id))}`)].find(node => !node.closest('#qaddons-garbage-truck'));
        if (source) { const clone = source.cloneNode(true); clone.removeAttribute('id'); icon.replaceChildren(clone); }
        const name = document.createElement('span'); name.textContent = escapeText(item.name || item._cachedStats?.name || `Przedmiot #${item.id}`);
        row.append(icon, name); return row;
    }
    function render(message = '') {
        const list = panel.querySelector('[data-list]'); list.replaceChildren(...candidates.map(itemNode));
        panel.querySelector('[data-info]').textContent = message || `Znaleziono ${candidates.length} przedm. do bezpowrotnego zniszczenia.`;
        panel.querySelector('[data-destroy]').disabled = busy || !candidates.length;
        panel.querySelector('[data-cancel]').disabled = busy;
        panel.querySelector('[data-close]').disabled = busy;
        if (!panel.hidden) place();
    }
    function signature(items) { return items.map(item => String(item.id)).sort().join(','); }
    function scan(force = false) {
        if (guestAccount(page) && ctx.settings.disableOnGuest) return;
        candidates = garbageCandidates(inventoryItems(page), ctx.settings.additionalGarbage);
        const next = signature(candidates);
        if (candidates.length && (force || next !== lastPrompt)) {
            lastPrompt = next; panel.hidden = false; render(); place();
        } else if (force) {
            panel.hidden = false; render('Nie znaleziono śmieciowych przedmiotów.'); place();
        }
    }
    function scheduleScan() {
        ctx.scheduler.clearTimeout(scanTimer);
        scanTimer = ctx.scheduler.timeout(() => scan(false), 350);
    }
    async function destroyAll() {
        if (busy || !candidates.length) return;
        busy = true; render('Trwa niszczenie…');
        let removed = 0;
        try {
            for (const item of [...candidates]) {
                if (!ctx.enabled) return;
                const response = await ctx.game.request(`moveitem&st=-2&id=${encodeURIComponent(item.id)}`, packet => {
                    const messages = Array.isArray(packet?.msg) ? packet.msg : packet?.msg ? [packet.msg] : [];
                    return packet?.e !== undefined || packet?.item?.[item.id]?.del || messages.length > 0;
                }, { timeout: 6500, signal: ctx.scheduler.signal });
                const messages = Array.isArray(response?.msg) ? response.msg : response?.msg ? [response.msg] : [];
                if (messages.some(message => String(message).includes('Właściciel konta zablokował tę funkcjonalność dla zastępcy'))) {
                    ctx.changeSettings({ disableOnGuest: true });
                    throw new Error('Niszczenie jest zablokowane dla zastępcy. Śmieciara została wyłączona na tym koncie.');
                }
                removed++;
                await new Promise(resolve => ctx.scheduler.timeout(resolve, 1500));
            }
            candidates = []; render(`Zniszczono ${removed} przedm.`);
            ctx.scheduler.timeout(() => { panel.hidden = true; }, 1000);
        } catch (error) {
            if (error?.name !== 'AbortError') render(error?.message || 'Nie udało się zniszczyć przedmiotów.');
        } finally { busy = false; render(panel.querySelector('[data-info]').textContent); }
    }

    ctx.scheduler.listen(button, 'click', () => scan(true));
    ctx.scheduler.listen(panel.querySelector('[data-close]'), 'click', () => { if (!busy) panel.hidden = true; });
    ctx.scheduler.listen(panel.querySelector('[data-cancel]'), 'click', () => { if (!busy) panel.hidden = true; });
    ctx.scheduler.listen(panel.querySelector('[data-destroy]'), 'click', destroyAll);
    ctx.scheduler.listen(window, 'resize', place, { passive: true });
    ctx.events.on('gamePacket', packet => {
        const list = Array.isArray(packet) ? packet.flat(Infinity) : [packet];
        if (ctx.settings.autoCheck !== false && list.some(entry => entry?.item)) scheduleScan();
    });
    ctx.events.on('garbageTruckChanged', () => { button.hidden = ctx.settings.showOnBar === false; if (ctx.settings.autoCheck !== false) scheduleScan(); });
    ctx.scheduler.cleanup(() => { button.remove(); panel.remove(); });
    button.hidden = ctx.settings.showOnBar === false;
    if (ctx.settings.autoCheck !== false) scheduleScan();
}
