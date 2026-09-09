// Nazwy z publicznego dictionary_pl.js Margonem (2026-09-09).
export const BONUSES = Object.freeze({
    anguish: 'Krwawa udręka', cleanse: 'Płomienne oczyszczenie', critred: 'Krytyczna osłona',
    curse: 'Klątwa', dmgred: 'Fizyczna osłona', facade: 'Fasada opieki', frenzy: 'Eskalacja szału',
    glare: 'Oślepienie', holytouch: 'Dotyk anioła', lastheal: 'Ostatni ratunek',
    puncture: 'Przeszywająca skuteczność', pushback: 'Odrzut', resgain: 'Ochrona żywiołów',
    retaliation: 'Aura odwetu', verycrit: 'Cios bardzo krytyczny'
});
export const defaults = {
    frames: [], overlays: [], activeFrame: '', activeOverlay: '', bonusLabels: true,
    tooltipEnabled: true, showUpgradeCost: true, upgradeDisplay: 'both',
    showLootDate: true, showLootGroup: true, showEssence: true,
    rarities: { zwykly: true, unikatowy: true, heroiczny: true, ulepszony: true, legendarny: true }
};
export function abbreviation(name) {
    const words = String(name).normalize('NFC').match(/\p{L}+/gu) || [];
    return (words.length === 1 ? [...words[0]].slice(0, 2).join('') : words.map(word => [...word][0]).join('')).toLocaleUpperCase('pl-PL');
}
export function itemStats(item) {
    if (typeof item?.stat?.stat === 'string') return itemStats({ stat: item.stat.stat });
    if (typeof item?.stat === 'string') return Object.fromEntries(item.stat.split(';').filter(Boolean).map(part => {
        const index = part.indexOf('=');
        return index < 0 ? [part, true] : [part.slice(0, index), part.slice(index + 1)];
    }));
    return item?._cachedStats || item?.stat || {};
}
export function legendaryBonus(item, legendaryDom = false) {
    const stats = itemStats(item);
    const type = item?.getItemType?.() || item?.itemType;
    const legendary = type ? type === 't-leg' : Object.hasOwn(stats, 'legendary') || stats.rarity === 'legendary' || legendaryDom;
    if (!legendary) return null;
    // TipsParser traktuje bonusy z gniazd tak samo jak zwykły legbon.
    const values = [item?.getLegbonStat?.(), stats.legbon, stats.socket_injection_legbon, stats.socket_fleeting_legbon];
    const codes = [...new Set(values.filter(value => typeof value === 'string')
        .map(value => value.split(',')[0].trim()).filter(code => Object.hasOwn(BONUSES, code)))];
    if (!codes.length) return null;
    return { name: codes.map(code => BONUSES[code]).join(' / '), short: codes.map(code => abbreviation(BONUSES[code])).join('/') };
}
export function imageUrl(value) {
    try { const url = new URL(String(value)); return url.protocol === 'https:' ? url.href : ''; }
    catch { return ''; }
}
export function cssImage(value) { return JSON.stringify(imageUrl(value)).replace(/</g, '\\3c '); }
