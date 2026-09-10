import { catchingChance, chanceLevel, eligibleMembers, isLegendary } from './data.js';
import { chanceCss } from './style.js';

function packetList(packet) {
    return Array.isArray(packet) ? packet.flat(Infinity).filter(Boolean) : [packet];
}

function heroId(page) {
    return page.Engine?.hero?.d?.id ?? page.Engine?.hero?.id ?? page.hero?.id ?? page.g?.hero?.id;
}

export function fightMembers(packet, page) {
    const fight = packet?.f;
    if (!fight?.w || typeof fight.w !== 'object') return null;
    const ownId = String(heroId(page) ?? '');
    const fighters = Object.values(fight.w).filter(Boolean);
    const ownFighter = fighters.find(fighter => String(fighter.originalId ?? fighter.id ?? '') === ownId);
    const ownTeam = fight.myteam ?? ownFighter?.team;
    const unique = new Map();
    for (const fighter of fighters) {
        const originalId = fighter.originalId ?? fighter.id;
        if (fighter.npc || originalId == null || !fighter.prof) continue;
        if (ownTeam != null && String(fighter.team) !== String(ownTeam)) continue;
        const id = String(originalId);
        if (!unique.has(id)) unique.set(id, {
            id, name: String(fighter.name || `Postać ${id}`), prof: String(fighter.prof).toLowerCase(), isHero: id === ownId
        });
    }
    return [...unique.values()];
}

function itemId(entry) {
    return String(entry.item?.id ?? entry.item?.hid ?? entry.key);
}

function findLootRoot() {
    const roots = [...document.querySelectorAll('.loot-wnd')];
    return roots.reverse().find(root => root.isConnected && root.getClientRects().length) || roots.at(-1) || null;
}

function findIcon(root, entry, index) {
    const id = itemId(entry);
    const icons = [...root.querySelectorAll('.item,[data-item-id],[class*="item-id-"]')];
    const exact = icons.find(node => node.dataset?.itemId === id || node.dataset?.id === id
        || [...node.classList].includes(`item-id-${id}`));
    if (exact) return exact;
    const cards = [...root.querySelectorAll('.loot-item-wrapper')];
    return cards[index]?.querySelector('.item,[data-item-id],[class*="item-id-"]') || cards[index] || null;
}

function tooltip(chance, members) {
    const list = members.map((member, index) => `${index + 1}. ${member.name}${member.isHero ? ' (ty)' : ''}`);
    return [`Szansa na przedmiot: ${chance}%`, '', 'Losują:', ...list].join('\n');
}

export function startLootChances(ctx) {
    let members = [];
    let latest = null;
    let testRoot = null;

    function applyStyles() {
        ctx.styles.set('runtime', chanceCss(ctx.settings));
    }

    function clear() {
        document.querySelectorAll('.qaddons-loot-chance').forEach(node => node.remove());
        document.querySelectorAll('.qaddons-loot-chance-anchor').forEach(node => node.classList.remove('qaddons-loot-chance-anchor'));
    }

    function currentMembers(source = members) {
        const id = String(heroId(ctx.game.page) ?? '');
        if (source.length) return source.map(member => ({ ...member, isHero: member.id === id }));
        const hero = ctx.game.page.Engine?.hero?.d || ctx.game.page.Engine?.hero || ctx.game.page.hero || ctx.game.page.g?.hero || {};
        return [{ id, name: String(hero.nick || hero.name || 'Twoja postać'), prof: String(hero.prof || '').toLowerCase(), isHero: true }];
    }

    function render(packet = latest, candidates = members, remember = true) {
        if (remember) latest = packet;
        clear();
        if (!packet || packet.loot?.owners) return;
        const root = findLootRoot();
        if (!root) return;
        const participants = currentMembers(candidates);
        if (ctx.settings.hideSolo && participants.length <= 1) return;
        const entries = Object.entries(packet.item || packet.items || {}).map(([key, item]) => ({ key, item }));
        entries.forEach((entry, index) => {
            if (!isLegendary(entry.item)) return;
            const chance = catchingChance(entry.item, participants);
            if (chance == null) return;
            const icon = findIcon(root, entry, index);
            if (!icon) return;
            if (getComputedStyle(icon).position === 'static') icon.classList.add('qaddons-loot-chance-anchor');
            const overlay = document.createElement('span');
            overlay.className = 'qaddons-loot-chance';
            overlay.dataset.level = chanceLevel(chance);
            overlay.dataset.itemId = itemId(entry);
            overlay.textContent = `${chance}%`;
            overlay.title = tooltip(chance, eligibleMembers(entry.item, participants));
            icon.append(overlay);
        });
    }

    function closeTest() {
        testRoot?.remove();
        testRoot = null;
        clear();
        if (latest) render(latest);
    }

    function showTest() {
        closeTest();
        testRoot = document.createElement('div');
        testRoot.className = 'loot-wnd qaddons-loot-test';
        const heading = document.createElement('div'); heading.className = 'qaddons-loot-test-title'; heading.textContent = 'TEST — legendarny łup';
        const close = document.createElement('button'); close.type = 'button'; close.className = 'qaddons-loot-test-close'; close.textContent = '×';
        const windowNode = document.createElement('div'); windowNode.className = 'loot-window';
        const card = document.createElement('div'); card.className = 'loot-item-wrapper';
        const icon = document.createElement('div'); icon.className = 'item item-id-qaddons-test'; icon.dataset.itemId = 'qaddons-test'; icon.dataset.itemType = 't-leg';
        const label = document.createElement('span'); label.className = 'qaddons-loot-test-label'; label.textContent = 'Przykładowa legenda';
        card.append(icon, label); windowNode.append(card); testRoot.append(heading, close, windowNode); document.body.append(testRoot);
        ctx.scheduler.listen(close, 'click', closeTest, { once: true });
        const hero = currentMembers()[0];
        const previewMembers = [hero, { id: 'qaddons-test-player', name: 'Drugi gracz', prof: hero.prof || 'w', isHero: false }];
        render({ loot: { init: 1 }, item: { 'qaddons-test': { id: 'qaddons-test', stat: `rarity=legendary${hero.prof ? `;reqp=${hero.prof}` : ''}` } } }, previewMembers, false);
    }

    function schedule(packet) {
        latest = packet;
        [0, 40, 120].forEach(delay => ctx.scheduler.timeout(() => render(packet), delay));
    }

    applyStyles();
    ctx.events.on('gamePacket', packet => {
        for (const data of packetList(packet)) {
            const next = fightMembers(data, ctx.game.page);
            if (next) members = next;
        }
    });
    ctx.events.on('lootOpened', schedule);
    ctx.events.on('lootClosed', () => { latest = null; clear(); });
    ctx.events.on('lootChancesChanged', () => { applyStyles(); render(); });
    ctx.events.on('lootChancesTest', showTest);
    ctx.scheduler.cleanup(() => { clear(); testRoot?.remove(); });
}
