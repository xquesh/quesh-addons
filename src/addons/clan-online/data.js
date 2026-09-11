export const DEFAULTS = Object.freeze({
    showButton: true,
    windowOpen: true,
    searchEnabled: true,
    showCoordinates: true,
    wrapLocation: false,
    fontSize: 11,
    refreshInterval: 10,
    sort: 'level-desc',
    windowX: null,
    windowY: 70,
    windowWidth: 370,
    windowHeight: 310
});

export const PROFESSION_NAMES = Object.freeze({
    w: 'Wojownik', p: 'Paladyn', b: 'Tancerz ostrzy', m: 'Mag', t: 'Tropiciel', h: 'Łowca'
});

function memberFromTuple(tuple) {
    if (!Array.isArray(tuple) || tuple.length < 10) return null;
    const id = Number(tuple[0]);
    if (!Number.isFinite(id)) return null;
    return {
        id,
        nick: String(tuple[1] ?? ''),
        level: Number(tuple[2]) || 0,
        operationLevel: Number(tuple[3]) || 0,
        profession: String(tuple[4] ?? '').toLowerCase(),
        location: String(tuple[5] ?? ''),
        x: Number(tuple[6]),
        y: Number(tuple[7]),
        rank: Number(tuple[8]) || 0,
        offlineTime: Number(tuple[9]) || 0,
        icon: String(tuple[10] ?? '')
    };
}

export function parseClanMembers(raw) {
    if (!Array.isArray(raw)) return [];
    const tuples = Array.isArray(raw[0]) ? raw : Array.from({ length: Math.floor(raw.length / 11) }, (_, index) => raw.slice(index * 11, index * 11 + 11));
    return tuples.map(memberFromTuple).filter(Boolean);
}

export function onlineMembers(raw) {
    return parseClanMembers(raw).filter(member => member.offlineTime <= 0);
}

export function memberLevel(member) {
    const level = member.operationLevel > 0 ? `${member.level}|${member.operationLevel}` : String(member.level);
    return `${level}${member.profession}`;
}

export function filterMembers(members, query = '') {
    const phrase = String(query).trim().toLocaleLowerCase('pl-PL');
    if (!phrase) return [...members];
    return members.filter(member => [member.nick, member.location, memberLevel(member), PROFESSION_NAMES[member.profession]]
        .some(value => String(value || '').toLocaleLowerCase('pl-PL').includes(phrase)));
}

export function sortMembers(members, mode = 'level-desc') {
    const result = [...members];
    const text = value => String(value || '').toLocaleLowerCase('pl-PL');
    if (mode === 'name') result.sort((a, b) => text(a.nick).localeCompare(text(b.nick), 'pl'));
    else if (mode === 'profession') result.sort((a, b) => text(a.profession).localeCompare(text(b.profession), 'pl') || b.level - a.level);
    else if (mode === 'location') result.sort((a, b) => text(a.location).localeCompare(text(b.location), 'pl') || text(a.nick).localeCompare(text(b.nick), 'pl'));
    else if (mode === 'level-asc') result.sort((a, b) => a.level - b.level || text(a.nick).localeCompare(text(b.nick), 'pl'));
    else result.sort((a, b) => b.level - a.level || text(a.nick).localeCompare(text(b.nick), 'pl'));
    return result;
}

export function hasClan(page) {
    const hero = page.Engine?.hero?.d || page.Engine?.hero || page.g?.hero;
    if (!hero) return null;
    const clan = hero.clan ?? hero.clanId ?? hero.clan_id;
    if (clan && typeof clan === 'object') return true;
    return Boolean(clan || hero.clanname || hero.clanName);
}
