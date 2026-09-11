export const DEFAULTS = Object.freeze({
    disableOnGuest: false,
    autoCheck: true,
    additionalGarbage: []
});

const PROTECTED_SLOTS = new Set([10, 20, 21, 22, 26]);

export function values(source) {
    if (source instanceof Map) return [...source.values()];
    if (Array.isArray(source)) return source;
    return source && typeof source === 'object' ? Object.values(source) : [];
}

export function inventoryItems(page) {
    try { return values(page.Engine?.items?.testMyItems?.()); }
    catch { return []; }
}

export function isExpired(item) {
    try { return Boolean(item?.checkExpires?.()); }
    catch { return false; }
}

export function garbageCandidates(items, templates = []) {
    const marked = new Set((templates || []).map(entry => Number(entry?.tpl ?? entry)).filter(Number.isFinite));
    return values(items).filter(item => item?.id != null
        && String(item.loc || 'g') === 'g'
        && !PROTECTED_SLOTS.has(Number(item.st))
        && (isExpired(item) || marked.has(Number(item.tpl))));
}

export function itemIdentity(item) {
    return {
        tpl: Number(item?.tpl ?? item?.id),
        name: String(item?.name || item?._cachedStats?.name || `Przedmiot #${item?.tpl ?? item?.id ?? '?'}`)
    };
}
