export const DEFAULTS = {
    hideSolo: false,
    position: 'top-right',
    fontSize: 12,
    fontFamily: 'Arial',
    bold: true,
    shadow: 'outline',
    customColors: true,
    colorNone: '#b30000',
    colorLow: '#c25a00',
    colorMid: '#bd9700',
    colorHigh: '#0ba800'
};

export function itemStats(item) {
    if (item?.stat && typeof item.stat === 'object') return item.stat;
    return String(item?.stat || '').split(';').reduce((stats, part) => {
        const separator = part.indexOf('=');
        if (separator < 0) {
            if (part) stats[part] = true;
        } else {
            stats[part.slice(0, separator)] = part.slice(separator + 1);
        }
        return stats;
    }, {});
}

export function isLegendary(item) {
    const stats = itemStats(item);
    const rarity = item?._cachedStats?.rarity ?? item?.cachedStats?.rarity ?? item?.rarity ?? stats.rarity;
    return /^(?:legendary|legend|l)$/i.test(String(rarity || ''))
        || Object.hasOwn(stats, 'legendary')
        || Object.keys(stats).some(key => /^legbon(?:_|$)/i.test(key));
}

export function requiredProfessions(item) {
    const value = itemStats(item).reqp ?? item?._cachedStats?.reqp ?? item?.cachedStats?.reqp;
    if (Array.isArray(value)) return value.map(String);
    return String(value || '').toLowerCase().match(/[a-z]/g) || [];
}

export function eligibleMembers(item, members) {
    const professions = requiredProfessions(item);
    if (!professions.length) return [...members];
    const eligible = members.filter(member => professions.includes(String(member.prof || '').toLowerCase()));
    return eligible.length ? eligible : [...members];
}

export function catchingChance(item, members) {
    if (!members.length) return null;
    const professions = requiredProfessions(item);
    const eligible = professions.length
        ? members.filter(member => professions.includes(String(member.prof || '').toLowerCase()))
        : [...members];
    if (!eligible.length) return Math.round(100 / members.length);
    return eligible.some(member => member.isHero) ? Math.round(100 / eligible.length) : 0;
}

export function chanceLevel(chance) {
    if (chance === 0) return 'none';
    if (chance <= 33) return 'low';
    if (chance === 50) return 'mid';
    return 'high';
}
