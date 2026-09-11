export const ABYSS_STATES = Object.freeze({
    NONE: 0,
    SEARCHING: 1,
    FOUND: 2,
    PREPARATION: 3,
    PREPARATION_ACCEPTED: 4,
    BATTLING: 5
});

export const PROFESSIONS = Object.freeze([
    ['w', 'Wojownik'],
    ['p', 'Paladyn'],
    ['b', 'Tancerz ostrzy'],
    ['m', 'Mag'],
    ['t', 'Tropiciel'],
    ['h', 'Łowca']
]);

export const DEFAULTS = Object.freeze({
    autoFight: false,
    buildW: 'auto',
    buildP: 'auto',
    buildB: 'auto',
    buildM: 'auto',
    buildT: 'auto',
    buildH: 'auto'
});

const ALIASES = {
    w: ['woj', 'wojownik'],
    p: ['pal', 'paladyn'],
    b: ['tanc', 'tancerz', 'tańc'],
    m: ['mag'],
    t: ['trop', 'tropiciel'],
    h: ['lowca', 'łowca']
};

function normalized(value) {
    return String(value || '').toLocaleLowerCase('pl-PL');
}

export function normalizeBuilds(source) {
    if (!source || typeof source !== 'object') return [];
    return Object.entries(source).map(([key, value]) => {
        const build = value && typeof value === 'object' ? value : {};
        const id = Number(build.id ?? key);
        if (!Number.isFinite(id) || id < 1) return null;
        return { ...build, id, name: String(build.name || `Zestaw ${id}`) };
    }).filter(Boolean).sort((a, b) => a.id - b.id);
}

export function inferBuild(builds, profession) {
    const list = normalizeBuilds(builds);
    let best = null;
    let bestScore = 0;
    for (const build of list) {
        const name = normalized(build.name);
        if (['kolos', 'tytan', 'ustawk'].some(term => name.includes(term))) continue;
        let score = name.includes('exp') ? 1 : 0;
        if ((ALIASES[profession] || []).some(alias => name.includes(alias))) score = 5;
        const compact = name.includes('exp') ? '' : name
            .replace(/pvp|1h|2h|ogień|ogien|błysk|blysk|zimno|fizyk|gr|truta/g, '')
            .replace(/[^wpbmth]/g, '');
        if (compact && compact.includes(profession)) {
            score = Math.max(score, 8 - compact.length);
        }
        if (score > bestScore) { best = build; bestScore = score; }
    }
    return best;
}

export function configuredBuild(builds, profession, setting, currentId = 0) {
    if (setting === 'current') return null;
    if (setting && setting !== 'auto') {
        return normalizeBuilds(builds).find(build => build.id === Number(setting)) || null;
    }
    const inferred = inferBuild(builds, profession);
    return inferred && inferred.id !== Number(currentId) ? inferred : null;
}

export function packetList(packet) {
    return Array.isArray(packet) ? packet.flat(Infinity).filter(Boolean) : [packet].filter(Boolean);
}

export function stateLabel(state) {
    return ({
        0: 'Poza kolejką',
        1: 'Szukanie przeciwnika',
        2: 'Znaleziono przeciwnika',
        3: 'Wybór wyposażenia',
        4: 'Oczekiwanie na walkę',
        5: 'Walka'
    })[state] || 'Oczekiwanie na dane gry';
}
