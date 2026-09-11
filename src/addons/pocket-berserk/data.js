export const SOLO_BERSERK_ID = 34;
export const GROUP_BERSERK_ID = 35;
export const OFFSET_MIN = -50;
export const OFFSET_MAX = 13;

export const DEFAULTS = Object.freeze({
    showButton: true
});

export const DEFAULT_MODE = Object.freeze({
    v: false,
    common: true,
    elite: true,
    elite2: true,
    lvlmin: -10,
    lvlmax: 13
});

function unwrap(value, fallback) {
    const raw = value && typeof value === 'object' && Object.hasOwn(value, 'v') ? value.v : value;
    return raw == null ? fallback : raw;
}

function normalizeMode(raw, previous = DEFAULT_MODE) {
    const mode = { ...previous };
    if (!raw || typeof raw !== 'object') return mode;
    for (const key of ['v', 'common', 'elite', 'elite2']) {
        if (Object.hasOwn(raw, key)) mode[key] = Boolean(Number(unwrap(raw[key], mode[key])));
    }
    for (const key of ['lvlmin', 'lvlmax']) {
        if (!Object.hasOwn(raw, key)) continue;
        const value = Number(unwrap(raw[key], mode[key]));
        if (Number.isFinite(value)) mode[key] = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, Math.round(value)));
    }
    return mode;
}

function settingEntries(settings) {
    const entries = [];
    if (!settings || typeof settings !== 'object') return entries;
    if ([SOLO_BERSERK_ID, GROUP_BERSERK_ID].includes(Number(settings.id))) {
        const data = settings.d || settings.data || (settings.key ? { [settings.key]: settings.v } : settings);
        entries.push([Number(settings.id), data]);
    }
    const list = Array.isArray(settings.list) ? settings.list : settings.list && typeof settings.list === 'object'
        ? Object.entries(settings.list).map(([id, value]) => ({ id, d: value?.d || value })) : [];
    for (const entry of list) {
        if (!entry || typeof entry !== 'object') continue;
        if ([SOLO_BERSERK_ID, GROUP_BERSERK_ID].includes(Number(entry.id))) {
            entries.push([Number(entry.id), entry.d || entry.data || entry]);
            continue;
        }
        for (const [key, value] of Object.entries(entry)) {
            if ([SOLO_BERSERK_ID, GROUP_BERSERK_ID].includes(Number(key))) entries.push([Number(key), value?.d || value]);
        }
    }
    return entries;
}

function packetList(packet) {
    return Array.isArray(packet) ? packet.flat(Infinity).filter(Boolean) : [packet].filter(Boolean);
}

function partyPresent(party) {
    if (!party || typeof party !== 'object') return false;
    const members = party.members && typeof party.members === 'object' ? party.members : party;
    return Object.entries(members).some(([key, value]) => /^\d+$/.test(key) || Number.isFinite(Number(value?.id)));
}

export function createBerserkTracker() {
    return { modes: { [SOLO_BERSERK_ID]: null, [GROUP_BERSERK_ID]: null }, inParty: false, heroLevel: 0 };
}

export function updateBerserkTracker(tracker, packet) {
    let changed = false;
    for (const data of packetList(packet)) {
        if (!data || typeof data !== 'object') continue;
        const hero = data.h || data.hero;
        if (hero && typeof hero === 'object') {
            const level = Number(hero.oplvl ?? hero.d?.oplvl ?? hero.lvl ?? hero.d?.lvl);
            if (Number.isFinite(level) && level !== tracker.heroLevel) { tracker.heroLevel = level; changed = true; }
        }
        if (Object.hasOwn(data, 'party')) {
            const inParty = partyPresent(data.party);
            if (inParty !== tracker.inParty) { tracker.inParty = inParty; changed = true; }
        }
        for (const [id, raw] of settingEntries(data.settings)) {
            const next = normalizeMode(raw, tracker.modes[id] || DEFAULT_MODE);
            if (JSON.stringify(next) !== JSON.stringify(tracker.modes[id])) { tracker.modes[id] = next; changed = true; }
        }
    }
    return changed;
}

export function settingCommand(id, key, value) {
    const suffix = key ? `&key=${encodeURIComponent(key)}` : '';
    return `settings&action=update&id=${Number(id)}${suffix}&v=${encodeURIComponent(Number(Boolean(value)))}`;
}

export function levelCommand(id, key, value) {
    const offset = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, Math.round(Number(value) || 0)));
    return `settings&action=update&id=${Number(id)}&key=${encodeURIComponent(key)}&v=${offset}`;
}
