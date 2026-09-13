import { labelForItem } from './data.js';
import { teleportLabelsCss } from './style.js';

const MAX_ITEM_CACHE = 1000;

function values(value) {
    if (value instanceof Map) return [...value.values()];
    if (Array.isArray(value)) return value;
    return value && typeof value === 'object' ? Object.values(value) : [];
}

function itemId(item, fallback = '') {
    const id = item?.id ?? fallback;
    return /^-?\d+$/.test(String(id)) ? String(id) : '';
}

function nodeItemId(node) {
    return itemId({ id: node?.dataset?.itemId ?? String(node?.className || '').match(/(?:^|\s)item-id-(-?\d+)(?=\s|$)/)?.[1] });
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

    function remember(items, replace = false) {
        for (const [fallback, item] of Object.entries(items || {})) {
            const id = itemId(item, fallback);
            if (!id) continue;
            if (item?.del) cache.delete(id);
            else cache.set(id, replace ? item : { ...(cache.get(id) || {}), ...item, id: Number(id) });
        }
        while (cache.size > MAX_ITEM_CACHE) cache.delete(cache.keys().next().value);
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
        const itemNodes = [...document.querySelectorAll('.item,.bottomItem')];
        const liveItems = engineItems(page);
        if (liveItems.length) {
            const live = new Set(liveItems.map(item => itemId(item)).filter(Boolean));
            itemNodes.map(nodeItemId).filter(Boolean).forEach(id => live.add(id));
            for (const id of cache.keys()) if (!live.has(id)) cache.delete(id);
            remember(Object.fromEntries(liveItems.map((item, index) => [itemId(item, index), item])), true);
        }
        const active = new Set();
        if (ctx.settings.labels !== false) for (const node of itemNodes) {
            if (node.closest('#mtk-panel')) continue;
            const label = labelForItem(cache.get(nodeItemId(node)), ctx.settings.customLabels);
            if (!label) continue;
            addLabel(node, label); active.add(node);
        }
        document.querySelectorAll('.qaddons-teleport-label').forEach(overlay => {
            if (!active.has(overlay.parentElement)) overlay.remove();
        });
    }

    function schedule() {
        if (!frame) frame = ctx.scheduler.frame(sync);
    }

    ctx.events.on('gamePacket', packet => {
        let changed = false;
        for (const data of Array.isArray(packet) ? packet.flat(Infinity) : [packet]) {
            if (data?.item) { remember(data.item); changed = true; }
            if (data?.town?.file) changed = true;
        }
        if (changed) schedule();
    });
    ctx.events.on('teleportLabelsChanged', () => {
        ctx.styles.set('runtime', teleportLabelsCss(ctx.settings));
        schedule();
    });
    ctx.scheduler.observer(MutationObserver, records => {
        if (records.some(record => {
            const changed = [...record.addedNodes, ...record.removedNodes];
            if (record.type === 'childList' && changed.length && changed.every(node => node.nodeType === 1 &&
                node.matches?.('.qaddons-item-bonus,[data-qaddons-item-extra],.qaddons-teleport-label'))) return false;
            if (record.target.closest?.('.item,.bottomItem')) return true;
            return changed.some(node => node.nodeType === 1 &&
                !node.classList?.contains('qaddons-teleport-label') &&
                (node.matches?.('.item,.bottomItem') || node.querySelector?.('.item,.bottomItem')));
        })) schedule();
    }).observe(document.body, { childList: true, subtree: true });
    const poll = () => {
        if (!document.hidden) schedule();
        ctx.scheduler.timeout(poll, 2500);
    };
    ctx.events.on('visibilityChanged', hidden => { if (!hidden) schedule(); });
    ctx.scheduler.cleanup(() => document.querySelectorAll('.qaddons-teleport-label').forEach(node => node.remove()));
    sync(); poll();
}
