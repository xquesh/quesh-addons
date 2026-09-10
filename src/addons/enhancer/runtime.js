import { DEFAULTS, TYPE_GROUPS, itemEligible, parseStats } from './data.js';
import { enhancerStyle } from './style.js';

const SLOT_LABELS = { all: 'Dowolny przedmiot', armor: 'Pancerz', jewelry: 'Biżuteria', weapon: 'Broń' };

function allItems(page) {
    try { return Object.values(page.Engine?.items?.testMyItems?.() || {}); } catch { return []; }
}
function itemName(item) { return parseStats(item)?.name || item?.name || `Przedmiot #${item?.id}`; }
function elementItemId(element) {
    const node = element?.closest?.('[data-id],[data-item-id],[class*="item-id-"]');
    const value = node?.dataset?.id || node?.dataset?.itemId || String(node?.className || '').match(/(?:^|\s)item-id-(\d+)/)?.[1];
    return Number(value) || null;
}
function itemPreview(item) {
    const id = Number(item?.id);
    const source = [...document.querySelectorAll(`.item-id-${id}`)]
        .find(node => !node.closest('#qaddons-enhancer'));
    let image = source?.cloneNode(true);
    if (!image) {
        image = document.createElement('div');
        image.className = `item item-id-${id}`;
        const icon = String(item?.icon || item?.img || item?.image || '');
        if (/^[a-z0-9_./-]+\.(?:gif|png|webp)(?:\?.*)?$/i.test(icon)) {
            image.style.backgroundImage = `url("${icon.startsWith('/') ? icon : `/obrazki/itemy/${icon}`}")`;
        }
    }
    image.removeAttribute('id');
    image.removeAttribute('draggable');
    image.querySelectorAll?.('[id]').forEach(node => node.removeAttribute('id'));
    image.classList.add('qe-item-image');
    const wrapper = document.createElement('span');
    wrapper.className = 'qe-item-preview'; wrapper.setAttribute('aria-hidden', 'true'); wrapper.append(image);
    return wrapper;
}
function heroId(page) { return String(page.Engine?.hero?.d?.id || '0'); }
function settingsWithDefaults(settings) {
    settings.rarity = { ...DEFAULTS.rarity, ...settings.rarity };
    settings.types = { ...DEFAULTS.types, ...settings.types };
    settings.targets ||= {};
    return settings;
}

export function startEnhancer(ctx) {
    const page = ctx.game.page;
    const settings = settingsWithDefaults(ctx.settings);
    const toggle = document.createElement('button');
    toggle.id = 'qaddons-enhancer-toggle'; toggle.type = 'button'; toggle.textContent = 'UL'; toggle.title = 'Ulepszarka';
    const windowElement = document.createElement('section');
    windowElement.id = 'qaddons-enhancer'; windowElement.hidden = true;
    windowElement.innerHTML = `<header><span>ULEPSZARKA</span><button type="button" data-close aria-label="Zamknij">×</button></header><div class="qe-body"><div class="qe-toolbar"><button type="button" class="qe-state" data-active></button><select data-mode><option value="regular">Zwykły</option><option value="type">Po typie</option><option value="hybrid">Hybrydowy</option></select></div><div class="qe-slots"></div><div class="qe-progress"><span></span></div><div class="qe-meta"><span data-buffer>Bufor: 0</span><span data-limit>Limit: —</span></div><div class="qe-actions"><button type="button" data-enhance>ULEPSZ TERAZ</button><button type="button" data-rescan>ODŚWIEŻ BUFOR</button></div><p class="qe-status" role="status">Wybierz przedmiot do ulepszania.</p></div>`;
    ctx.styles.set('runtime', enhancerStyle);
    document.body.append(toggle, windowElement);
    const slots = windowElement.querySelector('.qe-slots');
    const status = windowElement.querySelector('.qe-status');
    const progress = windowElement.querySelector('.qe-progress span');
    const bufferLabel = windowElement.querySelector('[data-buffer]');
    const limitLabel = windowElement.querySelector('[data-limit]');
    let active = settings.rememberActive ? Boolean(settings.active) : false;
    let draggedItemId = null;
    let busy = false;
    let buffer = [];
    let usage = null;

    function targetMap() { return settings.targets[heroId(page)] ||= {}; }
    function target(slot) { const id = Number(targetMap()[slot]); return allItems(page).find(item => Number(item.id) === id) || null; }
    function modeSlots() { return settings.mode === 'regular' ? ['all'] : settings.mode === 'type' ? ['armor','jewelry','weapon'] : ['all','armor','jewelry','weapon']; }
    function message(text, error = false) {
        if (!ctx.enabled || ctx.scheduler.disposed) return;
        status.textContent = text;
        status.style.color = error ? '#ff7979' : '#bbb';
        if (settings.messages && page.message) page.message(text, error);
    }
    function persistActive() { if (settings.rememberActive) ctx.changeSettings({ active }); }
    function candidateItems(group = null) {
        const excluded = new Set(Object.values(targetMap()).map(Number));
        return allItems(page).filter(item => itemEligible(item, settings, excluded) && (!group || TYPE_GROUPS[group].includes(Number(item.cl))));
    }
    function highlight() {
        document.querySelectorAll('.qaddons-enhancer-buffer').forEach(node => node.classList.remove('qaddons-enhancer-buffer'));
        if (!settings.highlight) return;
        buffer.forEach(item => document.querySelectorAll(`.item-id-${Number(item.id)}`).forEach(node => node.classList.add('qaddons-enhancer-buffer')));
    }
    function scan() {
        buffer = candidateItems().slice(0, Math.max(1, Math.min(126, Number(settings.bufferSize) || 25)));
        bufferLabel.textContent = `Bufor: ${buffer.length} / ${Math.max(1, Math.min(126, Number(settings.bufferSize) || 25))}`;
        highlight();
        return buffer;
    }
    function renderSlots() {
        slots.replaceChildren(...modeSlots().map(slot => {
            const item = target(slot);
            const button = document.createElement('button'); button.type = 'button'; button.className = 'qe-slot'; button.dataset.slot = slot;
            button.dataset.filled = String(Boolean(item));
            button.innerHTML = `<small>${SLOT_LABELS[slot]}</small><strong></strong><small>${item ? 'Przeciągnij inny · PPM: usuń' : 'Przeciągnij przedmiot tutaj'}</small>`;
            button.querySelector('strong').textContent = item ? itemName(item) : 'PUSTY SLOT';
            if (item) {
                button.dataset.itemId = String(item.id);
                button.title = itemName(item);
                button.prepend(itemPreview(item));
            }
            return button;
        }));
        windowElement.querySelector('[data-mode]').value = settings.mode;
    }
    function refresh() {
        toggle.hidden = settings.showWindowButton === false;
        windowElement.querySelector('[data-active]').textContent = active ? 'AUTO: WŁ.' : 'AUTO: WYŁ.';
        windowElement.querySelector('[data-active]').dataset.active = String(active);
        renderSlots(); scan();
    }
    async function gameRequest(command, match, strip = []) {
        return ctx.game.request(command, match, { strip, timeout: 7000, signal: ctx.scheduler.signal });
    }
    function pause(milliseconds) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const release = ctx.scheduler.cleanup(() => {
                if (settled) return;
                settled = true;
                reject(new DOMException('Ulepszarka została wyłączona.', 'AbortError'));
            });
            ctx.scheduler.timeout(() => {
                if (settled) return;
                settled = true;
                release();
                resolve();
            }, milliseconds);
        });
    }
    async function openItem(id) {
        let packet = await gameRequest(`enhancement&action=open&item=${id}`, data => Number(data?.enhancement?.itemId) === Number(id) || data?.t === 'stop', ['enhancement','artisanship']);
        if (packet?.t === 'stop') {
            await gameRequest('artisanship&action=open', data => Boolean(data?.artisanship), ['artisanship']);
            packet = await gameRequest(`enhancement&action=open&item=${id}`, data => Number(data?.enhancement?.itemId) === Number(id), ['enhancement','artisanship']);
        }
        return packet;
    }
    async function updateUsage() {
        try {
            const packet = await gameRequest('artisanship&action=open', data => Boolean(data?.artisanship), ['artisanship']);
            usage = packet?.enhancement?.usages_preview || usage;
            if (usage) limitLabel.textContent = `Limit: ${usage.count} / ${usage.limit}`;
        } catch { limitLabel.textContent = 'Limit: brak danych'; }
    }
    function renderProgress(data) {
        const current = Number(data?.current) || 0, max = Number(data?.max) || 0;
        progress.style.width = `${max ? Math.min(100, current / max * 100) : 0}%`;
        progress.title = max ? `${current} / ${max}` : '';
    }
    async function validateAndSet(slot, item) {
        if (!item || !modeSlots().includes(slot)) return;
        const allowed = slot === 'all' || TYPE_GROUPS[slot]?.includes(Number(item.cl));
        if (!allowed) return message(`Ten przedmiot nie pasuje do slotu „${SLOT_LABELS[slot]}”.`, true);
        status.textContent = `Sprawdzanie: ${itemName(item)}…`;
        try {
            const packet = await openItem(Number(item.id));
            const enhancement = packet?.enhancement;
            const up = enhancement?.upgradable;
            if (enhancement?.completed === 1 || (up && Number(up.upgradeLevel) >= 4 && Number(up.current) >= Number(up.max))) throw new Error('Ten przedmiot jest już maksymalnie ulepszony.');
            targetMap()[slot] = Number(item.id); ctx.storage.save(); renderProgress(up); refresh();
            message(`Wybrano: ${itemName(item)}.`);
        } catch (error) { if (ctx.enabled) { refresh(); message(error.message || 'Nie można ulepszyć tego przedmiotu.', true); } }
    }
    async function usageReached() {
        await updateUsage(); return usage && Number(usage.count) >= Number(usage.limit);
    }
    async function enhanceTarget(slot, ingredients) {
        const item = target(slot);
        if (!item || !ingredients.length) return { done: false };
        await openItem(Number(item.id));
        const ids = ingredients.slice(0, 25).map(entry => Number(entry.id));
        const packet = await gameRequest(`enhancement&action=progress&item=${Number(item.id)}&ingredients=${ids.join(',')}`, data => Number(data?.enhancement?.itemId) === Number(item.id), []);
        const enhancement = packet?.enhancement || packet;
        usage = enhancement?.usages_preview || usage;
        if (usage) limitLabel.textContent = `Limit: ${usage.count} / ${usage.limit}`;
        renderProgress(enhancement?.upgradable || enhancement?.progressing);
        const maxed = enhancement?.completed === 1 || (enhancement?.upgradable && Number(enhancement.upgradable.upgradeLevel) >= 4 && Number(enhancement.upgradable.current) >= Number(enhancement.upgradable.max));
        return { done: maxed, used: new Set(ids) };
    }
    async function enhance() {
        if (busy) return;
        busy = true; windowElement.dataset.busy = 'true';
        try {
            scan();
            if (await usageReached()) return message('Osiągnięto dzienny limit ulepszania.', true);
            const plan = [];
            if (settings.mode !== 'regular') for (const slot of ['armor','jewelry','weapon']) if (target(slot)) plan.push([slot, slot]);
            if (settings.mode !== 'type' && target('all')) plan.push(['all', null]);
            if (!plan.length) return message('Najpierw wybierz przedmiot do ulepszania.', true);
            let usedAnything = false;
            for (const [slot, group] of plan) {
                const candidates = candidateItems(group);
                while (candidates.length) {
                    const batch = candidates.splice(0, 25);
                    const result = await enhanceTarget(slot, batch); usedAnything = true;
                    if (result.done || usage && Number(usage.count) >= Number(usage.limit)) break;
                    await pause(150);
                }
            }
            scan(); message(usedAnything ? 'Ulepszanie zakończone.' : 'Brak przedmiotów spełniających filtry.');
        } catch (error) { if (ctx.enabled) message(error.message || 'Ulepszanie nie powiodło się.', true); }
        finally { busy = false; if (!ctx.scheduler.disposed) delete windowElement.dataset.busy; }
    }
    ctx.scheduler.listen(toggle, 'click', () => { windowElement.hidden = !windowElement.hidden; if (!windowElement.hidden) { refresh(); updateUsage(); } });
    ctx.scheduler.listen(windowElement.querySelector('[data-close]'), 'click', () => { windowElement.hidden = true; });
    ctx.scheduler.listen(windowElement.querySelector('[data-active]'), 'click', () => { active = !active; persistActive(); refresh(); });
    ctx.scheduler.listen(windowElement.querySelector('[data-mode]'), 'change', event => { ctx.changeSettings({ mode: event.target.value }); refresh(); });
    ctx.scheduler.listen(windowElement.querySelector('[data-enhance]'), 'click', enhance);
    ctx.scheduler.listen(windowElement.querySelector('[data-rescan]'), 'click', () => { scan(); message('Bufor został odświeżony.'); });
    ctx.scheduler.listen(slots, 'contextmenu', event => { const slot = event.target.closest('[data-slot]')?.dataset.slot; if (!slot) return; event.preventDefault(); delete targetMap()[slot]; ctx.storage.save(); renderProgress(null); refresh(); });
    function markDropTarget(event) {
        const slot = event.target.closest?.('[data-slot]');
        slots.querySelectorAll('.qe-slot').forEach(node => node.dataset.drop = String(node === slot));
        return slot;
    }
    function clearDrag() {
        draggedItemId = null;
        delete slots.dataset.dragging;
        slots.querySelectorAll('.qe-slot').forEach(node => delete node.dataset.drop);
    }
    function dropOn(slot, id) {
        const item = allItems(page).find(entry => Number(entry.id) === Number(id));
        if (!slot || !item) { clearDrag(); return; }
        const slotName = slot.dataset.slot;
        clearDrag();
        validateAndSet(slotName, item);
    }
    ctx.scheduler.listen(document, 'pointerdown', event => {
        if (windowElement.hidden || windowElement.contains(event.target) || event.button !== 0) return;
        draggedItemId = elementItemId(event.target);
        if (draggedItemId) slots.dataset.dragging = 'true';
    }, { capture: true });
    ctx.scheduler.listen(document, 'pointermove', event => {
        if (!draggedItemId) return;
        const hovered = document.elementFromPoint?.(event.clientX, event.clientY) || event.target;
        markDropTarget({ target: hovered });
    }, { capture: true });
    ctx.scheduler.listen(document, 'pointerup', event => {
        if (!draggedItemId) return;
        const hovered = event.target.closest?.('[data-slot]') || document.elementFromPoint?.(event.clientX, event.clientY)?.closest?.('[data-slot]');
        const id = draggedItemId;
        delete slots.dataset.dragging;
        dropOn(hovered, id);
    }, { capture: true });
    ctx.scheduler.listen(document, 'dragstart', event => {
        if (windowElement.hidden || windowElement.contains(event.target)) return;
        const id = elementItemId(event.target);
        if (!id) return;
        draggedItemId = id; slots.dataset.dragging = 'true';
        try { event.dataTransfer?.setData('text/qaddons-item-id', String(id)); } catch {}
    }, { capture: true });
    ctx.scheduler.listen(slots, 'dragover', event => { if (draggedItemId) { event.preventDefault(); markDropTarget(event); } });
    ctx.scheduler.listen(slots, 'dragleave', event => { if (!slots.contains(event.relatedTarget)) slots.querySelectorAll('.qe-slot').forEach(node => delete node.dataset.drop); });
    ctx.scheduler.listen(slots, 'drop', event => {
        const id = draggedItemId || Number(event.dataTransfer?.getData('text/qaddons-item-id'));
        if (!id) return;
        event.preventDefault(); delete slots.dataset.dragging; dropOn(event.target.closest('[data-slot]'), id);
    });
    ctx.scheduler.listen(document, 'dragend', clearDrag, { capture: true });
    ctx.scheduler.listen(document, 'keydown', event => { if (event.code === settings.hotkey && !event.repeat && !event.target.closest?.('input,textarea,select,[contenteditable="true"]')) { event.preventDefault(); enhance(); } }, { capture: true });
    let drag = null;
    ctx.scheduler.listen(windowElement.querySelector('header'), 'pointerdown', event => { if (event.target.closest('button')) return; const rect = windowElement.getBoundingClientRect(); drag = { x: event.clientX - rect.left, y: event.clientY - rect.top }; event.currentTarget.setPointerCapture?.(event.pointerId); });
    ctx.scheduler.listen(windowElement.querySelector('header'), 'pointermove', event => { if (!drag) return; windowElement.style.left = `${Math.max(0, event.clientX - drag.x)}px`; windowElement.style.top = `${Math.max(0, event.clientY - drag.y)}px`; windowElement.style.bottom = 'auto'; });
    ctx.scheduler.listen(windowElement.querySelector('header'), 'pointerup', () => { drag = null; });
    ctx.events.on('enhancerChanged', refresh);
    ctx.events.on('gamePacket', packet => { const data = Array.isArray(packet) ? packet.flat(Infinity) : [packet]; const update = data.find(entry => entry?.enhancement?.progressing || entry?.enhancement?.upgradable); if (update) renderProgress(update.enhancement.progressing || update.enhancement.upgradable); });
    ctx.scheduler.cleanup(() => { clearDrag(); document.querySelectorAll('.qaddons-enhancer-buffer').forEach(node => node.classList.remove('qaddons-enhancer-buffer')); toggle.remove(); windowElement.remove(); });
    const tick = () => {
        if (active && !busy) {
            const count = scan().length;
            const threshold = Math.max(1, Math.min(126, Number(settings.bufferSize) || 25));
            const usable = settings.mode === 'regular' ? (target('all') ? candidateItems().length : 0)
                : ['armor','jewelry','weapon'].reduce((sum, slot) => sum + (target(slot) ? candidateItems(slot).length : 0), 0)
                    + (settings.mode === 'hybrid' && target('all') ? candidateItems().length : 0);
            let free = Infinity;
            try { free = (page.Engine?.bags || []).slice(0, 3).reduce((sum, bag) => sum + (bag ? Number(bag[0]) - Number(bag[1]) : 0), 0); } catch {}
            if (usable > 0 && (count >= threshold || count > 0 && free < 5)) enhance();
        }
        ctx.scheduler.timeout(tick, 900);
    };
    refresh(); tick();
}
