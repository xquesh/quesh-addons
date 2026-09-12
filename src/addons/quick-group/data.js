export const RELATION = Object.freeze({ NONE: 1, FRIEND: 2, CLAN: 4, ALLY: 5 });

export const DEFAULTS = Object.freeze({
    hotkey: { code: 'KeyG', altKey: false, ctrlKey: false, shiftKey: false },
    acceptAll: false,
    acceptFriend: true,
    acceptClan: false,
    acceptAlly: false,
    rejectOther: false,
    autoAcceptSummon: false,
    inviteRandos: false,
    randomInviteOrder: false
});

export const PARTY_SUMMON_ACCEPT_COMMAND = 'party&a=acceptsummon&answer=1';
const PARTY_SUMMON_PHRASES = Object.freeze([
    'przyzywa do siebie swoją drużynę',
    'is summoning your party'
]);

export function partySummonPrompt(value) {
    const message = typeof value === 'string' ? value : value?.q;
    if (typeof message !== 'string') return false;
    const normalized = message.toLocaleLowerCase('pl-PL');
    return PARTY_SUMMON_PHRASES.some(phrase => normalized.includes(phrase));
}

export function normalizeOthers(source) {
    const entries = source instanceof Map ? [...source.entries()] : Array.isArray(source)
        ? source.map((value, index) => [index, value]) : source && typeof source === 'object' ? Object.entries(source) : [];
    return entries.map(([key, raw]) => {
        const data = raw?.d && typeof raw.d === 'object' ? raw.d : raw;
        if (!data || typeof data !== 'object' || data.del || raw?.del) return null;
        const id = Number(data.id ?? raw?.id ?? key);
        if (!Number.isFinite(id)) return null;
        return {
            ...data,
            id,
            nick: String(data.nick ?? data.name ?? raw?.nick ?? raw?.name ?? ''),
            relation: data.relation ?? data.rel ?? raw?.relation ?? raw?.rel,
            x: Number(data.x ?? raw?.x ?? raw?.rx),
            y: Number(data.y ?? raw?.y ?? raw?.ry)
        };
    }).filter(Boolean);
}

export function normalizeHotkey(value) {
    if (typeof value === 'string') return { code: value || 'KeyG', altKey: false, ctrlKey: false, shiftKey: false };
    return {
        code: String(value?.code || value?.key || 'KeyG'),
        altKey: Boolean(value?.altKey), ctrlKey: Boolean(value?.ctrlKey), shiftKey: Boolean(value?.shiftKey)
    };
}

export function matchesHotkey(event, value) {
    const hotkey = normalizeHotkey(value);
    return event.code === hotkey.code && event.altKey === hotkey.altKey && event.ctrlKey === hotkey.ctrlKey && event.shiftKey === hotkey.shiftKey;
}

export function hotkeyLabel(value) {
    const hotkey = normalizeHotkey(value);
    return [...(hotkey.ctrlKey ? ['Ctrl'] : []), ...(hotkey.altKey ? ['Alt'] : []), ...(hotkey.shiftKey ? ['Shift'] : []), hotkey.code.replace(/^(Key|Digit)/, '')].join('+');
}

export function senderName(question) {
    const text = String(question || '');
    return (text.match(/\[b\]([^[]+)\[\/b\]/i) || text.match(/<b>([^<]+)<\/b>/i))?.[1]?.trim() || '';
}

export function shouldAcceptInvite(settings, sender) {
    if (settings.acceptAll) return true;
    if (!sender) return Boolean(settings.acceptClan || settings.acceptFriend);
    const relation = Number(sender.relation ?? sender.rel);
    return relation === RELATION.CLAN && settings.acceptClan || relation === RELATION.FRIEND && settings.acceptFriend || relation === RELATION.ALLY && settings.acceptAlly;
}

export function inviteCandidates(others, hero, partyIds, blockedIds, settings) {
    const candidates = others.filter(other => {
        const id = Number(other?.id);
        if (!Number.isFinite(id) || partyIds.has(String(id)) || blockedIds.has(String(id))) return false;
        const relation = Number(other.relation ?? other.rel);
        if ([RELATION.CLAN, RELATION.FRIEND, RELATION.ALLY].includes(relation)) return true;
        return settings.inviteRandos && Math.abs(Number(hero.x) - Number(other.x)) <= 1 && Math.abs(Number(hero.y) - Number(other.y)) <= 1;
    });
    if (!settings.randomInviteOrder) return candidates;
    for (let index = candidates.length - 1; index > 0; index--) {
        const swap = Math.floor(Math.random() * (index + 1));
        [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
    }
    return candidates;
}
