import { GROUP_BERSERK_ID, levelCommand, OFFSET_MAX, OFFSET_MIN, settingCommand, SOLO_BERSERK_ID } from './data.js';
import { POCKET_BERSERK_CSS } from './style.js';

export function heroOperationalLevel(page, tracker) {
    const hero = page.Engine?.hero?.d || page.Engine?.hero || page.g?.hero || {};
    return Number(hero.oplvl ?? hero.lvl ?? tracker.heroLevel) || 0;
}

export function sendBerserkSetting(page, tracker, id, key, value) {
    if (page.Engine?.allInit !== true || typeof page._g !== 'function') return false;
    const mode = tracker.modes[id];
    if (!mode) return false;
    if (key === 'lvlmin' || key === 'lvlmax') {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return false;
        const offset = Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, Math.round(numeric)));
        page._g(levelCommand(id, key, offset));
    } else {
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
    document.body.append(button);
    let positionFrame = 0;
    function positionButton() {
        positionFrame = 0;
        if (button.closest('#qaddons-shortcut-bar')) {
            button.style.left = '';
            button.style.top = '';
            button.dataset.anchored = 'dock';
            return;
        }
        const slot = document.querySelector('.bottom-panel-of-bottom-positioner .usable-slot-8, .positioner.bottom .usable-slot-8, .usable-slot-8');
        const rect = slot?.getBoundingClientRect();
        if (rect?.width > 0 && rect?.height > 0) {
            const rightSide = rect.right + 4;
            const left = rightSide + button.offsetWidth <= window.innerWidth ? rightSide : Math.max(0, rect.left - button.offsetWidth - 4);
            button.style.left = `${Math.round(left)}px`;
            button.style.top = `${Math.round(rect.top + (rect.height - button.offsetHeight) / 2)}px`;
            button.dataset.anchored = 'true';
            return;
        }
        const bar = document.querySelector('.bottom-panel-of-bottom-positioner, .positioner.bottom')?.getBoundingClientRect();
        button.style.left = `${Math.max(4, Math.min(window.innerWidth - button.offsetWidth - 4, (bar?.right || window.innerWidth) - button.offsetWidth - 4))}px`;
        button.style.top = `${Math.max(4, Math.min(window.innerHeight - button.offsetHeight - 4, (bar?.bottom || window.innerHeight - 64) - button.offsetHeight - 3))}px`;
        button.dataset.anchored = 'false';
    }
    function schedulePosition() {
        if (!positionFrame) positionFrame = ctx.scheduler.frame(positionButton);
    }

    function currentId() { return tracker.inParty ? GROUP_BERSERK_ID : SOLO_BERSERK_ID; }
    function render() {
        const id = currentId();
        const mode = tracker.modes[id];
        button.hidden = ctx.settings.showButton === false;
        button.dataset.ready = String(Boolean(mode));
        button.dataset.enabled = String(Boolean(mode?.v));
        const scope = tracker.inParty ? 'w grupie' : 'solo';
        button.title = mode ? `Kieszonkowy berserk: ${scope} — ${mode.v ? 'włączony' : 'wyłączony'}\nKlik: przełącz · PPM: ustawienia` : 'Kieszonkowy berserk: oczekiwanie na ustawienia gry';
        schedulePosition();
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
    ctx.scheduler.observer(MutationObserver, schedulePosition).observe(document.body, { childList: true, subtree: true });
    ctx.scheduler.listen(window, 'resize', schedulePosition, { passive: true });
    ctx.events.on('layoutChanged', schedulePosition);
    ctx.scheduler.cleanup(() => button.remove());
    render();
}
