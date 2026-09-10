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
    const unique = new Map();
    for (const fighter of Object.values(fight.w)) {
        if (!fighter || fighter.npc || fighter.team !== fight.myteam || fighter.originalId == null || !fighter.prof) continue;
        const id = String(fighter.originalId);
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

    function applyStyles() {
        ctx.styles.set('runtime', chanceCss(ctx.settings));
    }

    function clear() {
        document.querySelectorAll('.qaddons-loot-chance').forEach(node => node.remove());
        document.querySelectorAll('.qaddons-loot-chance-anchor').forEach(node => node.classList.remove('qaddons-loot-chance-anchor'));
    }

    function render(packet = latest) {
        latest = packet;
        clear();
        if (!packet || packet.loot?.owners || members.length <= 1) return;
        const root = findLootRoot();
        if (!root) return;
        const ownId = String(heroId(ctx.game.page) ?? '');
        const currentMembers = members.map(member => ({ ...member, isHero: member.id === ownId }));
        const entries = Object.entries(packet.item || packet.items || {}).map(([key, item]) => ({ key, item }));
        entries.forEach((entry, index) => {
            if (!isLegendary(entry.item)) return;
            const chance = catchingChance(entry.item, currentMembers);
            if (chance == null) return;
            const icon = findIcon(root, entry, index);
            if (!icon) return;
            if (getComputedStyle(icon).position === 'static') icon.classList.add('qaddons-loot-chance-anchor');
            const overlay = document.createElement('span');
            overlay.className = 'qaddons-loot-chance';
            overlay.dataset.level = chanceLevel(chance);
            overlay.dataset.itemId = itemId(entry);
            overlay.textContent = `${chance}%`;
            overlay.title = tooltip(chance, eligibleMembers(entry.item, currentMembers));
            icon.append(overlay);
        });
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
    ctx.scheduler.cleanup(clear);
}
