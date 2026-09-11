import { GROUP_BERSERK_ID, levelCommand, OFFSET_MAX, OFFSET_MIN, settingCommand, SOLO_BERSERK_ID } from './data.js';
import { POCKET_BERSERK_CSS } from './style.js';

export function heroOperationalLevel(page, tracker) {
    const hero = page.Engine?.hero?.d || page.Engine?.hero || page.g?.hero || {};
    return Number(hero.oplvl ?? hero.lvl ?? tracker.heroLevel) || 0;
}

export function sendBerserkSetting(page, tracker, id, key, value) {
    if (typeof page._g !== 'function') return false;
    const mode = tracker.modes[id];
    if (!mode) return false;
    if (key === 'lvlmin' || key === 'lvlmax') {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return false;
        const offset = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, Math.round(numeric)));
        mode[key] = offset;
        page._g(levelCommand(id, key, offset));
    } else {
        mode[key || 'v'] = Boolean(value);
        page._g(settingCommand(id, key, value));
    }
    return true;
}

export function startPocketBerserk(ctx, tracker) {
    const page = ctx.game.page;
    ctx.styles.set('runtime', POCKET_BERSERK_CSS);
    const button = document.createElement('button');
    button.id = 'qaddons-pocket-berserk';
    button.type = 'button';
    button.textContent = 'BR';
    function mountButton() {
        const host = document.querySelector('.bottom-panel-of-bottom-positioner') || document.querySelector('.positioner.bottom');
        const target = host || document.body;
        if (button.parentElement !== target) target.append(button);
        button.dataset.fallback = String(!host);
    }

    function currentId() { return tracker.inParty ? GROUP_BERSERK_ID : SOLO_BERSERK_ID; }
    function render() {
        const id = currentId();
        const mode = tracker.modes[id];
        button.hidden = ctx.settings.showButton === false;
        button.style.setProperty('--qpb-x', `${Math.max(0, Math.min(100, Number(ctx.settings.buttonHorizontal) || 82))}%`);
        button.dataset.ready = String(Boolean(mode));
        button.dataset.enabled = String(Boolean(mode?.v));
        const scope = tracker.inParty ? 'w grupie' : 'solo';
        button.title = mode ? `Kieszonkowy berserk: ${scope} — ${mode.v ? 'włączony' : 'wyłączony'}\nKlik: przełącz · PPM: ustawienia` : 'Kieszonkowy berserk: oczekiwanie na ustawienia gry';
    }

    ctx.scheduler.listen(button, 'click', () => {
        const id = currentId();
        const mode = tracker.modes[id];
        if (!mode) return;
        sendBerserkSetting(page, tracker, id, '', !mode.v);
        render();
        ctx.events.emit('pocketBerserkChanged');
    });
    ctx.scheduler.listen(button, 'contextmenu', event => {
        event.preventDefault();
        ctx.ui.openSettings(ctx.id);
    });
    ctx.events.on('pocketBerserkDataChanged', render);
    ctx.events.on('pocketBerserkChanged', render);
    ctx.scheduler.observer(MutationObserver, mountButton).observe(document.body, { childList: true, subtree: true });
    ctx.scheduler.listen(window, 'resize', render, { passive: true });
    ctx.scheduler.cleanup(() => button.remove());
    mountButton(); render();
}
