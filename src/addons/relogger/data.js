export const defaults = { sort: 'level-desc', barPosition: 'bottom', horizontal: 100, showWorldButton: true, showTimers: true, hotkeys: false, selectedWorld: '', switchMode: 'direct' };
export function worldName(value) { return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(value) ? value : ''; }
export function characterList(data) {
    if (!Array.isArray(data)) throw new Error('Serwer nie zwrócił listy postaci.');
    const seen = new Set();
    return data.filter(hero => hero && /^\d+$/.test(String(hero.id)) && worldName(hero.world) && typeof hero.nick === 'string')
        .filter(hero => { const key = `${hero.world}:${hero.id}`; if (seen.has(key)) return false; seen.add(key); return true; })
        .map(hero => ({ id: String(hero.id), world: hero.world, nick: hero.nick, lvl: Number(hero.lvl) || 0, prof: String(hero.prof || ''), icon: String(hero.icon || '') }));
}
export function sortedHeroes(heroes, world, sort) {
    return heroes.filter(hero => hero.world === world).sort((a, b) => {
        const order = sort === 'name' ? a.nick.localeCompare(b.nick, 'pl') : (a.lvl - b.lvl) * (sort === 'level-asc' ? 1 : -1);
        return order || a.id.localeCompare(b.id);
    });
}
export function heroLevel(hero) {
    const level = Math.max(0, Math.trunc(Number(hero?.lvl) || 0));
    const profession = [...String(hero?.prof || '').trim().toLocaleLowerCase('pl-PL')][0] || '';
    return `${level}${profession}`;
}
export function countdown(seconds) {
    const value = Math.max(0, Math.ceil(seconds));
    const pad = n => String(n).padStart(2, '0');
    return value >= 3600 ? `${Math.floor(value / 3600)}:${pad(Math.floor(value / 60) % 60)}:${pad(value % 60)}` : `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
}
export function heroTimers(data, heroId, now, fadeout = 600) {
    if (!Array.isArray(data)) return [];
    const expiry = Number.isFinite(Number(fadeout)) && Number(fadeout) >= 0 ? Number(fadeout) : 600;
    return data.filter(timer => timer && String(timer.heroData?.id) === String(heroId) &&
        (timer.type === 2 || timer.type === 'hero' || timer.user === 1) && Number.isFinite(Number(timer.presp)) && Number(timer.presp) > 0 && now - Number(timer.presp) < expiry)
        .map(timer => {
            const end = Number(timer.presp);
            const min = Number(timer.minResp);
            const state = end <= now ? 'due' : min > 0 && min <= now ? 'window' : 'waiting';
            return { name: String(timer.name || 'Timer'), end, state, text: state === 'due' ? 'Czas minął' : countdown(end - now) };
        }).sort((a, b) => a.end - b.end);
}
export function characterDestination(hero, page) {
    let domain = page.location.hostname.match(/(?:^|\.)margonem\.(pl|com)$/)?.[1];
    if (!domain) {
        try { domain = new URL(page.Engine?.worldConfig?.getApiDomain?.()).hostname.match(/(?:^|\.)margonem\.(pl|com)$/)?.[1]; }
        catch {}
    }
    if (!domain || !worldName(hero.world) || !/^\d+$/.test(String(hero.id))) throw new Error('Nieprawidłowy świat lub postać.');
    return { url: `https://${hero.world}.margonem.${domain}/`, cookieDomain: `margonem.${domain}`, id: String(hero.id) };
}
export function relogTarget(hero, page) {
    const engine = page.Engine;
    if (engine?.allInit !== true) throw new Error('Poczekaj na załadowanie gry.');
    if (engine.changePlayer?.id != null) throw new Error('Zmiana postaci już trwa.');
    if (engine.dialogue && typeof engine.dialogue === 'object') throw new Error('Najpierw zamknij rozmowę z NPC.');
    if (String(engine.hero?.d?.id || page.getCookie?.('mchar_id')) === String(hero.id)) throw new Error('Ta postać jest już zalogowana.');
    return characterDestination(hero, page);
}
export function reloadCharacter(hero, page, navigate = url => page.location.replace(url), schedule = (callback, delay) => page.setTimeout(callback, delay)) {
    const target = characterDestination(hero, page);
    if (typeof page.setCookie !== 'function') throw new Error('Gra nie udostępnia zmiany postaci.');
    const canCloseSession = typeof page._g === 'function' && typeof page.setTimeout === 'function';
    if (canCloseSession) page._g('logoff&a=start');
    page.setCookie('mchar_id', target.id, new Date(Date.now() + 30 * 86400000), '/', target.cookieDomain, true);
    if (canCloseSession) schedule(() => navigate(target.url), 500);
    else navigate(target.url);
    return 'reload';
}
export function changeCharacter(hero, page, navigate = url => page.location.replace(url)) {
    relogTarget(hero, page);
    return reloadCharacter(hero, page, navigate);
}
export function changeCharacterNative(hero, page) {
    const target = relogTarget(hero, page);
    if (page.Engine?.logOff) throw new Error('Trwa już wylogowywanie. Anuluj je przed zmianą postaci.');
    if (typeof page.Engine?.changePlayer?.changePlayerRequest === 'function') {
        page.Engine.changePlayer.changePlayerRequest(Number(target.id));
        return 'native';
    }
    if (typeof page.Engine?.changePlayer?.changePlayer === 'function') {
        page.Engine.changePlayer.changePlayer(Number(target.id));
        return 'native';
    }
    return reloadCharacter(hero, page);
}
