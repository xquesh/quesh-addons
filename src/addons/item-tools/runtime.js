import { cssImage, imageUrl, legendaryBonus } from './data.js';
import { createTooltipTools } from './tooltip.js';
import { bonusStyle, bonusFont, bonusCss } from './bonus-style.js';

const ITEM_SELECTOR = '.item, .bottomItem';
const HIGHLIGHTS = '.item .highlight.h-exist,.bottomItem .highlight.h-exist,.item .icon.h-exist,.bottomItem .icon.h-exist';
export function startItemTools(ctx) {
    const { scheduler, settings } = ctx;
    const page = ctx.game.page;
    const tips = createTooltipTools(settings);
    const fingerprints = new WeakMap();
    const renderedExtras = new WeakMap();
    const groundDraws = new Map();
    let pending = 0;
    let ground = null;
    let groundFrameChanged = false;
    let groundOverlayChanged = false;
    let appearanceKey = '';
    const sample = document.querySelector('.item .highlight.h-exist');
    const nativeStyle = sample ? getComputedStyle(sample) : null;
    const nativeFrame = nativeStyle?.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1] || '/img/gui/item_frames/frames/item_frames.png';
    const nativeOffset = Math.max(0, -(parseFloat(nativeStyle?.backgroundPositionY) || 0) / 32);
    const nativeOverlayStyle = sample ? getComputedStyle(sample, '::after') : null;
    const nativeOverlay = nativeOverlayStyle?.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1] || null;

    function resolveItem(element) {
        try {
            const attached = page.$?.(element)?.data?.('item');
            if (attached) return attached;
            const id = element.className?.match?.(/(?:^|\s)item-id-(-?\d+)(?=\s|$)/)?.[1] || element.dataset.itemId;
            return tips.itemById(id);
        } catch { return null; }
    }
    function badges() {
        for (const element of document.querySelectorAll(ITEM_SELECTOR)) {
            const badge = element.querySelector(':scope > .qaddons-item-bonus');
            const bonus = settings.bonusLabels ? legendaryBonus(resolveItem(element), element.matches('[data-item-type="t-leg"]') || !!element.querySelector('.t-leg')) : null;
            if (!bonus) {
                badge?.remove();
                element.classList.remove('qaddons-bonus-static');
                continue;
            }
            if (!badge && getComputedStyle(element).position === 'static') element.classList.add('qaddons-bonus-static');
            const label = badge || document.createElement('span');
            if (!badge) { label.className = 'qaddons-item-bonus'; element.append(label); }
            if (label.textContent !== bonus.short) label.textContent = bonus.short;
            if (label.getAttribute('aria-label') !== bonus.name) label.setAttribute('aria-label', bonus.name);
        }
    }
    function tooltips() {
        for (const element of document.querySelectorAll('.tip-wrapper .content')) {
            const extra = element.querySelector(':scope > [data-qaddons-item-extra]');
            if (!settings.tooltipEnabled) { extra?.remove(); fingerprints.delete(element); continue; }
            const clone = element.cloneNode(true);
            clone.querySelectorAll('[data-qaddons-item-extra]').forEach(node => node.remove());
            const html = clone.innerHTML;
            if (document.querySelector('.item:hover')?.closest('.show-equipment') || document.querySelector('.item:hover')?.className.includes('-showeq')) { extra?.remove(); continue; }
            const id = tips.currentItemId(html);
            const item = tips.itemById(id) || tips.itemByHid(tips.currentHid(html));
            const fingerprint = html + JSON.stringify([id, item?.hid, tips.statFromItem(item), item?.salvageItems, settings.tooltipEnabled, settings.showUpgradeCost, settings.upgradeDisplay, settings.showLootDate, settings.showLootGroup, settings.showEssence, settings.rarities]);
            if (fingerprints.get(element) === fingerprint && extra) continue;
            fingerprints.set(element, fingerprint);
            const info = tips.parseItemInfo(html);
            const upgrade = settings.showUpgradeCost && tips.isUpgradeableItem(html) ? tips.upgradeHtml(info) : '';
            const loot = tips.lootHtml(id, tips.isUpgradeableItem(html) ? info : null, html);
            const content = upgrade + loot;
            if (!content) { extra?.remove(); continue; }
            // Natywny opis (np. licznik czasu) może zmieniać się bez zmiany naszego dodatku.
            // Nie odpinamy sekcji: usuń/wstaw wymusza ponowne mierzenie i pozycjonowanie tooltipu.
            if (extra && renderedExtras.get(extra) === content) continue;
            const wrapper = extra || document.createElement('div');
            wrapper.dataset.qaddonsItemExtra = '1';
            wrapper.innerHTML = content;
            renderedExtras.set(wrapper, content);
            if (!extra) {
                const anchor = element.querySelector(':scope > .tip-item-stat-reqp,:scope > .tip-item-stat-lvl');
                element.insertBefore(wrapper, anchor || null);
            }
        }
    }
    function restoreGround() {
        if (groundFrameChanged) ground?.changeFrames?.(nativeFrame, nativeOffset);
        if (groundOverlayChanged) ground?.changeOverlays?.(nativeOverlay);
        groundFrameChanged = groundOverlayChanged = false;
    }
    function groundAppearance() {
        const next = page.Engine?.map?.groundItems;
        const key = JSON.stringify([settings.activeFrame, settings.activeOverlay]);
        if (next === ground && key === appearanceKey) return;
        if (next !== ground) { restoreGround(); ground = next; }
        appearanceKey = key;
        const frame = imageUrl(settings.activeFrame);
        const overlay = imageUrl(settings.activeOverlay);
        if (frame || groundFrameChanged) ground?.changeFrames?.(frame || nativeFrame, frame ? 0 : nativeOffset);
        if (overlay || groundOverlayChanged) ground?.changeOverlays?.(overlay || nativeOverlay);
        groundFrameChanged = !!frame;
        groundOverlayChanged = !!overlay;
    }
    function groundBadges() {
        const drawables = new Set(page.Engine?.map?.groundItems?.getDrawableItems?.() || []);
        for (const [item, restore] of groundDraws) if (!drawables.has(item) || !settings.bonusLabels) { restore(); groundDraws.delete(item); }
        if (!settings.bonusLabels) return;
        for (const item of drawables) {
            if (!item.i || typeof item.draw !== 'function' || groundDraws.has(item)) continue;
            const original = item.draw;
            let active = true;
            const wrapper = function(canvas, ...args) {
                const result = original.call(this, canvas, ...args);
                if (!active || scheduler.disposed || !settings.bonusLabels || !this.frames || !this.sprite) return result;
                const bonus = legendaryBonus(this.i);
                const engine = page.Engine;
                if (!bonus || !engine?.map?.offset || !engine.mapShift?.getShift) return result;
                const shift = engine.mapShift.getShift();
                const x = Math.round(this.i.x * 32 - engine.map.offset[0] - shift[0]) + 31;
                const y = Math.round(this.i.y * 32 - engine.map.offset[1] - shift[1]) + 31;
                canvas.save();
                canvas.globalAlpha = 1;
                const textStyle = bonusStyle(settings);
                canvas.font = bonusFont(textStyle);
                canvas.fillStyle = textStyle.color; canvas.textAlign = 'right'; canvas.textBaseline = 'bottom';
                canvas.shadowColor = textStyle.shadowColor; canvas.shadowBlur = ['soft', 'glow'].includes(textStyle.shadow) ? textStyle.shadowStrength : 0;
                canvas.shadowOffsetX = 0; canvas.shadowOffsetY = textStyle.shadow === 'soft' ? 1 : 0;
                if (textStyle.shadow === 'outline') {
                    canvas.strokeStyle = textStyle.shadowColor; canvas.lineWidth = 2; canvas.lineJoin = 'round';
                    canvas.strokeText(bonus.short, x - 2, y);
                }
                canvas.fillText(bonus.short, x - 2, y);
                canvas.restore();
                return result;
            };
            item.draw = wrapper;
            groundDraws.set(item, () => { active = false; if (item.draw === wrapper) item.draw = original; });
        }
    }
    function scan() {
        pending = 0;
        badges(); tooltips(); groundAppearance(); groundBadges();
    }
    function queue() { if (!pending) pending = scheduler.timeout(scan, 80); }
    function apply() {
        const frame = imageUrl(settings.activeFrame);
        const overlay = imageUrl(settings.activeOverlay);
        ctx.styles.set('items', `
            ${frame ? `${HIGHLIGHTS}{background-image:url(${cssImage(frame)})!important;background-position-y:0!important;}` : ''}
            ${overlay ? `${HIGHLIGHTS.split(',').map(selector => selector + '::after').join(',')}{content:"";position:absolute;inset:0;z-index:1;background-image:url(${cssImage(overlay)})!important;pointer-events:none;}` : ''}
            .qaddons-bonus-static{position:relative!important}
            .qaddons-item-bonus{position:absolute!important;right:1px!important;bottom:1px!important;z-index:6;pointer-events:none!important;
                padding:0!important;margin:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:#fff!important;box-shadow:none!important;
                ${bonusCss(bonusStyle(settings))}letter-spacing:0!important;white-space:nowrap!important;}
            [data-qaddons-item-extra]{pointer-events:none;background:#080808;color:#ddd;border:1px solid #333;padding:6px 8px;margin:6px 0;font:11px/1.55 Arial,sans-serif;}
            [data-qaddons-item-extra]>div:first-child{border-top:0!important;margin-top:0!important;padding-top:0!important;}
        `);
        queue();
    }
    // Obserwator reaguje na wymianę ikon i tooltipów. Poll uzupełnia zmiany danych bez mutacji DOM.
    scheduler.observer(MutationObserver, records => {
        if (records.some(record => !record.target.closest?.('.qaddons-item-bonus,[data-qaddons-item-extra]') &&
            (record.type !== 'childList' || [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType !== 1 || !node.matches('.qaddons-item-bonus,[data-qaddons-item-extra]'))))) queue();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-item-type', 'data-item-id', 'data-hid'], characterData: true });
    const poll = () => { queue(); scheduler.timeout(poll, 500); };
    ctx.events.on('itemToolsChanged', apply);
    scheduler.cleanup(() => {
        groundDraws.forEach(restore => restore()); groundDraws.clear(); restoreGround();
        document.querySelectorAll('.qaddons-item-bonus,[data-qaddons-item-extra]').forEach(node => node.remove());
        document.querySelectorAll('.qaddons-bonus-static').forEach(node => node.classList.remove('qaddons-bonus-static'));
    });
    apply(); poll();
}
