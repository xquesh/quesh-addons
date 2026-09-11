import { labelForItem } from './data.js';
import { teleportLabelsCss } from './style.js';

function values(value) {
    if (value instanceof Map) return [...value.values()];
    if (Array.isArray(value)) return value;
    return value && typeof value === 'object' ? Object.values(value) : [];
}

function itemId(item, fallback = '') {
    const id = item?.id ?? fallback;
    return /^-?\d+$/.test(String(id)) ? String(id) : '';
}

function engineItems(page) {
    const result = [];
    const model = page.Engine?.items;
    for (const location of ['g', 'e', 'p']) {
        try { result.push(...values(model?.fetchLocationItems?.(location))); } catch {}
    }
    try { result.push(...values(model?.testMyItems?.())); } catch {}
    result.push(...values(model?.items));
    return result.filter(item => item && typeof item === 'object');
}

export function startTeleportLabels(ctx) {
    const page = ctx.game.page;
    const cache = new Map();
    let frame = 0;
    ctx.styles.set('runtime', teleportLabelsCss(ctx.settings));

    function remember(items) {
        for (const [fallback, item] of Object.entries(items || {})) {
            const id = itemId(item, fallback);
            if (!id) continue;
            if (item?.del) cache.delete(id);
            else cache.set(id, { ...(cache.get(id) || {}), ...item, id: Number(id) });
        }
    }

    function addLabel(node, label) {
        let overlay = [...node.children].find(child => child.classList?.contains('qaddons-teleport-label'));
        if (!overlay) {
            overlay = document.createElement('span');
            overlay.className = 'qaddons-teleport-label';
            node.append(overlay);
        }
        if (overlay.textContent !== label) overlay.textContent = label;
    }

    function sync() {
        frame = 0;
        remember(Object.fromEntries(engineItems(page).map((item, index) => [itemId(item, index), item])));
        const active = new Set();
        if (ctx.settings.labels !== false) for (const [id, item] of cache) {
            const label = labelForItem(item, ctx.settings.customLabels);
            if (!label) continue;
            for (const node of document.querySelectorAll(`.item-id-${CSS.escape(id)},[data-item-id="${CSS.escape(id)}"]`)) {
                if (node.closest('#mtk-panel') || node.classList.contains('qaddons-teleport-label')) continue;
                addLabel(node, label); active.add(node);
            }
        }
        document.querySelectorAll('.qaddons-teleport-label').forEach(overlay => {
            if (!active.has(overlay.parentElement)) overlay.remove();
        });
    }

    function schedule() {
        if (!frame) frame = ctx.scheduler.frame(sync);
    }

    ctx.events.on('gamePacket', packet => {
        for (const data of Array.isArray(packet) ? packet.flat(Infinity) : [packet]) if (data?.item) remember(data.item);
        schedule();
    });
    ctx.events.on('teleportLabelsChanged', () => {
        ctx.styles.set('runtime', teleportLabelsCss(ctx.settings));
        schedule();
    });
    ctx.scheduler.observer(MutationObserver, records => {
        if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => !node.classList?.contains?.('qaddons-teleport-label')))) schedule();
    }).observe(document.body, { childList: true, subtree: true });
    const poll = () => { schedule(); ctx.scheduler.timeout(poll, 750); };
    ctx.scheduler.cleanup(() => document.querySelectorAll('.qaddons-teleport-label').forEach(node => node.remove()));
    sync(); poll();
}
