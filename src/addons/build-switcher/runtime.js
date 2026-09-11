import { buildItemIds, clampGeometry, mergeBuildPacket, normalizeBuilds, readBuildState } from './data.js';
import { BUILD_SWITCHER_CSS } from './style.js';

function packetList(packet) { return Array.isArray(packet) ? packet.flat(Infinity).filter(Boolean) : [packet].filter(Boolean); }
function escapeSelector(value) { return globalThis.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^\w-]/g, '\\$&'); }

export function startBuildSwitcher(ctx) {
    const page = ctx.game.page;
    const initial = readBuildState(page);
    const state = { builds: initial.builds, currentId: initial.currentId, offers: initial.offers };
    let menuId = 0; let busy = false; let drag = null; let geometryTimer = 0; let applyingGeometry = false;
    ctx.styles.set('runtime', BUILD_SWITCHER_CSS);
    const button = document.createElement('button'); button.id = 'qaddons-build-switcher-button'; button.type = 'button'; button.textContent = 'ZES'; button.title = 'Zmieniacz zestawów';
    const panel = document.createElement('section'); panel.id = 'qaddons-build-switcher'; panel.hidden = ctx.settings.windowOpen === false;
    panel.innerHTML = '<header><span data-title>ZMIENIACZ ZESTAWÓW</span><span><button type="button" data-buy title="Dokup zestaw">＋</button><button type="button" data-close aria-label="Zamknij">×</button></span></header><div class="qbs-grid" data-grid></div><div class="qbs-menu" data-menu hidden><button type="button" data-action="rename">NAZWA</button><button type="button" data-action="preview">PODGLĄD</button><button type="button" data-action="hide">UKRYJ</button></div><div class="qbs-purchase" data-purchase hidden><span data-purchase-label></span><button type="button" data-currency="gold"></button><button type="button" data-currency="credits"></button></div><div class="qbs-status" data-status></div>';
    document.body.append(button, panel);

    function hidden(id) { return ctx.settings.hiddenBuilds?.[id] === true; }
    function status(text) { panel.querySelector('[data-status]').textContent = text; }
    function setOpen(open) { panel.hidden = !open; if (ctx.settings.windowOpen !== open) ctx.changeSettings({ windowOpen: open }); }
    function applyGeometry() {
        const geometry = clampGeometry(ctx.settings, innerWidth, innerHeight);
        applyingGeometry = true;
        panel.style.left = `${geometry.x}px`; panel.style.top = `${geometry.y}px`;
        panel.style.width = `${geometry.width}px`; panel.style.height = `${geometry.height}px`;
        ctx.scheduler.frame(() => { applyingGeometry = false; });
    }
    function persistGeometry() {
        if (panel.hidden || !panel.isConnected || applyingGeometry) return;
        const geometry = clampGeometry({
            windowX: panel.offsetLeft, windowY: panel.offsetTop,
            windowWidth: panel.offsetWidth, windowHeight: panel.offsetHeight
        }, innerWidth, innerHeight);
        panel.style.left = `${geometry.x}px`; panel.style.top = `${geometry.y}px`;
        const patch = { windowX: geometry.x, windowY: geometry.y, windowWidth: geometry.width, windowHeight: geometry.height };
        if (Object.entries(patch).some(([key, value]) => Number(ctx.settings[key]) !== value)) ctx.changeSettings(patch);
    }
    function scheduleGeometrySave() {
        ctx.scheduler.clearTimeout(geometryTimer);
        geometryTimer = ctx.scheduler.timeout(persistGeometry, 180);
    }
    function refreshEngine() {
        const next = readBuildState(page);
        if (next.builds.length) state.builds = next.builds;
        if (next.currentId) state.currentId = next.currentId;
    }
    function render() {
        refreshEngine();
        const grid = panel.querySelector('[data-grid]'); grid.replaceChildren();
        const columns = Math.max(1, Math.min(5, Number(ctx.settings.columns) || 3));
        grid.style.setProperty('--qbs-columns', columns);
        panel.querySelector('[data-title]').textContent = ctx.settings.minimalist ? 'ZESTAWY' : 'ZMIENIACZ ZESTAWÓW';
        panel.querySelector('[data-buy]').hidden = !state.offers.length;
        for (const build of normalizeBuilds(state.builds)) {
            if (hidden(build.id) && !ctx.settings.grayHidden) continue;
            const item = document.createElement('button'); item.type = 'button'; item.className = 'qbs-build'; item.dataset.build = String(build.id);
            item.dataset.selected = String(build.id === Number(state.currentId)); item.dataset.hidden = String(hidden(build.id));
            item.textContent = ctx.settings.minimalist ? String(build.id) : build.name;
            if (!ctx.settings.disableTips) item.title = `${build.name}\nRozdane umiejętności: ${build.skillsLearnt ?? '?'} / ${build.skillsTotal ?? '?'}\nPPM — więcej opcji`;
            grid.append(item);
        }
        button.hidden = ctx.settings.showOnBar === false;
        if (!grid.children.length) status('Otwórz w grze okno zestawów, aby pobrać dane.');
    }
    async function select(id) {
        if (busy || hidden(id) || id === Number(state.currentId)) return;
        busy = true; status(`Włączanie zestawu ${id}…`);
        try {
            const skillshop = page.Engine?.skills ? '&skillshop=1' : '';
            await ctx.game.request(`builds&action=updateCurrent&id=${id}${skillshop}`, packet => {
                const value = packet?.builds?.currentId ?? packet?.builds?.current_id;
                return Number(value) === id;
            }, { timeout: 5000, signal: ctx.scheduler.signal });
            state.currentId = id; status(`Włączono zestaw ${id}.`); render();
        } catch (error) { if (error?.name !== 'AbortError') status(error?.message || 'Zmiana zestawu nie powiodła się.'); }
        finally { busy = false; }
    }
    function selectedBuild() { return state.builds.find(build => Number(build.id) === menuId); }
    function rename() {
        const build = selectedBuild(); if (!build) return;
        const name = prompt('Podaj nową nazwę zestawu:', build.name);
        if (!name?.trim()) return;
        page._g?.(`builds&action=update&id=${build.id}&name=${encodeURIComponent(name.trim())}`);
        build.name = name.trim(); status('Nazwa zostanie zapisana przez grę.'); render();
    }
    function preview() {
        const build = selectedBuild(); if (!build) return;
        let preview = panel.querySelector('.qbs-preview');
        if (!preview) { preview = document.createElement('div'); preview.className = 'qbs-preview'; panel.querySelector('[data-menu]').after(preview); }
        preview.replaceChildren();
        for (const id of buildItemIds(build)) {
            const source = [...document.querySelectorAll(`.item-id-${escapeSelector(id)}`)].find(node => !node.closest('#qaddons-build-switcher'));
            if (source) { const clone = source.cloneNode(true); clone.removeAttribute('id'); preview.append(clone); }
            else { const slot = document.createElement('span'); slot.className = 'item'; slot.title = `Przedmiot #${id}`; preview.append(slot); }
        }
        if (!preview.children.length) preview.textContent = 'Gra nie udostępniła listy przedmiotów tego zestawu.';
    }
    function toggleHidden() {
        if (!menuId) return;
        const next = { ...(ctx.settings.hiddenBuilds || {}), [menuId]: !hidden(menuId) };
        ctx.changeSettings({ hiddenBuilds: next }); render();
    }
    function showPurchase() {
        const offer = state.offers[0]; if (!offer) return;
        const root = panel.querySelector('[data-purchase]'); root.hidden = !root.hidden;
        root.querySelector('[data-purchase-label]').textContent = `Zestaw ${offer.id}`;
        root.querySelector('[data-currency="gold"]').textContent = `${offer.cost?.gold ?? '?'} zł`;
        root.querySelector('[data-currency="credits"]').textContent = `${offer.cost?.credits ?? '?'} SŁ`;
    }
    function purchase(currency) {
        if (!state.offers.length || !['gold', 'credits'].includes(currency)) return;
        page._g?.(`builds&action=buy&currency=${currency}`);
        panel.querySelector('[data-purchase]').hidden = true;
        status('Wysłano prośbę zakupu zestawu.');
    }

    ctx.scheduler.listen(button, 'click', () => setOpen(panel.hidden));
    ctx.scheduler.listen(panel.querySelector('[data-close]'), 'click', () => setOpen(false));
    ctx.scheduler.listen(panel.querySelector('[data-buy]'), 'click', showPurchase);
    ctx.scheduler.listen(panel.querySelector('[data-purchase]'), 'click', event => purchase(event.target.closest('[data-currency]')?.dataset.currency));
    ctx.scheduler.listen(panel.querySelector('[data-grid]'), 'click', event => { const id = Number(event.target.closest('[data-build]')?.dataset.build); if (id) select(id); });
    ctx.scheduler.listen(panel.querySelector('[data-grid]'), 'contextmenu', event => {
        const id = Number(event.target.closest('[data-build]')?.dataset.build); if (!id) return;
        event.preventDefault(); menuId = id; panel.querySelector('[data-menu]').hidden = false;
        panel.querySelector('[data-action="hide"]').textContent = hidden(id) ? 'POKAŻ' : 'UKRYJ';
    });
    ctx.scheduler.listen(panel.querySelector('[data-menu]'), 'click', event => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'rename') rename(); if (action === 'preview') preview(); if (action === 'hide') toggleHidden();
    });
    const header = panel.querySelector('header');
    ctx.scheduler.listen(header, 'pointerdown', event => {
        if (event.button !== 0 || event.target.closest('button')) return;
        const rect = panel.getBoundingClientRect();
        drag = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
        try { header.setPointerCapture?.(event.pointerId); } catch {}
        event.preventDefault();
    });
    ctx.scheduler.listen(header, 'pointermove', event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const geometry = clampGeometry({
            windowX: event.clientX - drag.offsetX, windowY: event.clientY - drag.offsetY,
            windowWidth: panel.offsetWidth, windowHeight: panel.offsetHeight
        }, innerWidth, innerHeight);
        panel.style.left = `${geometry.x}px`; panel.style.top = `${geometry.y}px`;
    });
    function finishDrag(event) {
        if (!drag || event.pointerId !== drag.pointerId) return;
        drag = null;
        try { if (header.hasPointerCapture?.(event.pointerId)) header.releasePointerCapture(event.pointerId); } catch {}
        persistGeometry();
    }
    ctx.scheduler.listen(header, 'pointerup', finishDrag);
    ctx.scheduler.listen(header, 'pointercancel', finishDrag);
    ctx.scheduler.listen(header, 'lostpointercapture', finishDrag);
    if (typeof ResizeObserver === 'function') ctx.scheduler.observer(ResizeObserver, scheduleGeometrySave).observe(panel);
    ctx.scheduler.listen(window, 'resize', () => { persistGeometry(); applyGeometry(); }, { passive: true });
    ctx.events.on('gamePacket', packet => {
        let changed = false; for (const data of packetList(packet)) changed = mergeBuildPacket(state, data) || changed;
        if (changed) render();
    });
    ctx.events.on('buildSwitcherChanged', () => { panel.hidden = ctx.settings.windowOpen === false; applyGeometry(); render(); });
    ctx.scheduler.cleanup(() => { button.remove(); panel.remove(); });
    applyGeometry(); render();
}
