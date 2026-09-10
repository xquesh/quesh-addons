export const DEFAULTS = {
    calendarEnabled: true,
    calendarAutoClaim: false,
    promotionsEnabled: true,
    promotionsAutoClaim: false,
    expiredEnabled: true,
    showButton: false,
    checkInterval: 300
};

function warsawDateNumber(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

export function calendarReminder(calendar, now = new Date()) {
    if (!calendar?.start_ts) return null;
    const start = new Date(Number(calendar.start_ts) * 1000);
    if (Number.isNaN(start.getTime())) return null;
    const index = Math.round((warsawDateNumber(now) - warsawDateNumber(start)) / 86400000);
    const day = calendar.days?.[index];
    return !day || day.isOpened ? null : { dayNo: index + 1 };
}

export function freePromotions(promotions) {
    const active = Array.isArray(promotions?.active) ? promotions.active : [];
    return active.filter(item => item && !item.price && !item.is_used && item.id != null);
}

export function expiredItems(page) {
    let items;
    try { items = page.Engine?.items?.testMyItems?.(); }
    catch { return []; }
    return Object.values(items || {}).filter(item => {
        try { return item?.id != null && Boolean(item?.checkExpires?.()); }
        catch { return false; }
    });
}

export function resultSignature(result) {
    const ids = list => list.map(item => String(item.id)).sort().join(',');
    return [result.calendar?.dayNo || '', ids(result.promotions || []), ids(result.expired || [])].join('|');
}
