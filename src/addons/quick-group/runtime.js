import { inviteCandidates, matchesHotkey, senderName, shouldAcceptInvite } from './data.js';
import { QUICK_GROUP_CSS } from './style.js';

function values(value) {
    if (value instanceof Map) return [...value.values()];
    if (Array.isArray(value)) return value;
    return value && typeof value === 'object' ? Object.values(value) : [];
}

function currentOthers(page) {
    const model = page.Engine?.others;
    try {
        return values(model?.getAll?.() || model?.others || model?.list || page.g?.other).filter(other => other && !other.del);
    } catch { return values(page.g?.other).filter(other => other && !other.del); }
}

function heroData(page) {
    return page.Engine?.hero?.d || page.Engine?.hero || page.g?.hero || {};
}

function partyData(page, tracked) {
    try { return page.Engine?.party?.get?.() || page.Engine?.party?.d || page.Engine?.party || tracked; }
    catch { return tracked; }
}

function partyState(page, tracked) {
    const party = partyData(page, tracked);
    if (!party || typeof party !== 'object') return { exists: false, ids: new Set(), commanderId: null };
    const source = party.members && typeof party.members === 'object' ? party.members : party;
    const members = Object.entries(source).filter(([key, member]) => /^\d+$/.test(key) || Number.isFinite(Number(member?.id)));
    const ids = new Set(members.map(([key, member]) => String(member?.id ?? key)));
    const commander = party.commander?.id ?? party.commander_id ?? party.commanderId ?? party.leader?.id ?? party.leader_id;
    return { exists: ids.size > 0, ids, commanderId: commander == null ? null : String(commander) };
}

function editable(target) { return target?.closest?.('input,textarea,select,[contenteditable="true"]'); }

function showMessage(page, text, error = false) {
    if (typeof page.message === 'function') page.message(text, error);
    else console[error ? 'error' : 'info'](`[QADDONS: Szybka grupa] ${text}`);
}

export function startQuickGroup(ctx) {
    const page = ctx.game.page;
    const blocked = new Set();
    let trackedParty = null;
    let busy = false;
    ctx.styles.set('runtime', QUICK_GROUP_CSS);
    const button = document.createElement('button');
    button.id = 'qaddons-quick-group'; button.type = 'button'; button.textContent = 'SG';
    button.title = 'Szybka grupa — zaproś · PPM: ustawienia';
    document.body.append(button);

    function invite() {
        if (busy || page.Engine?.allInit !== true || typeof page._g !== 'function') return 0;
        const hero = heroData(page);
        const party = partyState(page, trackedParty);
        if (party.exists && party.commanderId && party.commanderId !== String(hero.id)) {
            showMessage(page, 'Tylko dowódca może zapraszać innych graczy do drużyny.', true);
            return 0;
        }
        const candidates = inviteCandidates(currentOthers(page), hero, party.ids, blocked, ctx.settings);
        busy = true; button.dataset.busy = 'true';
        for (const other of candidates) page._g(`party&a=inv&id=${encodeURIComponent(Number(other.id))}`);
        busy = false; button.dataset.busy = 'false';
        showMessage(page, candidates.length ? `Wysłano ${candidates.length} zaproszeń do grupy.` : 'Brak postaci spełniających warunki zapraszania.');
        return candidates.length;
    }

    function processPacket(packet) {
        const list = Array.isArray(packet) ? packet.flat(Infinity) : [packet];
        for (const data of list) {
            if (!data || typeof data !== 'object') continue;
            if (Object.hasOwn(data, 'party')) trackedParty = data.party;
            if (data.town?.file) blocked.clear();
            for (const emotion of values(data.emo)) {
                const id = String(emotion?.source_id ?? emotion?.id ?? '');
                if (!id) continue;
                if (['battle', 'stasis'].includes(emotion.name)) blocked.add(id);
                else if (emotion.name === 'noemo') blocked.delete(id);
            }
        }
    }

    function processInviteBefore(packet) {
        const list = Array.isArray(packet) ? packet.flat(Infinity) : [packet];
        for (const data of list) {
            const ask = data?.ask;
            if (!ask || String(ask.re || '') !== 'party&a=accept&answer=') continue;
            const nick = senderName(ask.q);
            if (!nick) {
                console.error('[QADDONS: Szybka grupa] Nie udało się odczytać nadawcy zaproszenia.', ask);
                continue;
            }
            const sender = currentOthers(page).find(other => String(other.nick || other.name || '').toLocaleLowerCase('pl-PL') === nick.toLocaleLowerCase('pl-PL')) || null;
            if (shouldAcceptInvite(ctx.settings, sender)) {
                page._g(`${ask.re}1`); delete data.ask;
                showMessage(page, `Zaakceptowano grupę od ${nick}.`);
            } else if (ctx.settings.rejectOther) {
                page._g(`${ask.re}0`); delete data.ask;
                showMessage(page, `Odrzucono grupę od ${nick}.`);
            }
        }
    }

    ctx.scheduler.listen(button, 'click', invite);
    ctx.scheduler.listen(button, 'contextmenu', event => { event.preventDefault(); ctx.ui.openSettings(ctx.id); });
    ctx.scheduler.listen(document, 'keydown', event => {
        if (event.repeat || event.defaultPrevented || editable(event.target) || !matchesHotkey(event, ctx.settings.hotkey)) return;
        event.preventDefault(); invite();
    }, { capture: true });
    ctx.events.on('gamePacket', processPacket);
    ctx.events.on('gamePacketBefore', processInviteBefore);
    ctx.events.on('quickGroupInvite', invite);
    ctx.scheduler.cleanup(() => button.remove());
}
