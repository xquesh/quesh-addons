import { SHORTCUTS } from '../../core/shortcuts.js';
import { SHORTCUT_BAR_CSS } from './style.js';

const DEFAULTS = Object.freeze({ locked: false, x: null, y: null });

function startShortcutBar(ctx) {
    ctx.styles.set('runtime', SHORTCUT_BAR_CSS);
    const bar = document.createElement('div');
    bar.id = 'qaddons-shortcut-bar';
    const grip = document.createElement('button');
    grip.type = 'button'; grip.className = 'qsb-grip'; grip.textContent = '⋮';
    grip.title = 'Przeciągnij belkę · PPM: ustawienia belki';
    bar.append(grip); document.body.append(bar);
    let drag = null;
    let scanFrame = 0;

    function clampPosition(x, y) {
        return {
            x: Math.max(0, Math.min(window.innerWidth - bar.offsetWidth, Number(x) || 0)),
            y: Math.max(0, Math.min(window.innerHeight - bar.offsetHeight, Number(y) || 0))
        };
    }

    function defaultPosition() {
        const slot = document.querySelector('.bottom-panel-of-bottom-positioner .usable-slot-8, .positioner.bottom .usable-slot-8, .usable-slot-8');
        const rect = slot?.getBoundingClientRect();
        if (rect?.width > 0 && rect?.height > 0) return clampPosition(rect.right + 4, rect.top + (rect.height - bar.offsetHeight) / 2);
        return clampPosition(window.innerWidth - bar.offsetWidth - 8, window.innerHeight - bar.offsetHeight - 68);
    }

    function place() {
        bar.dataset.locked = String(ctx.settings.locked === true);
        const saved = ctx.settings.x !== null && ctx.settings.y !== null && Number.isFinite(Number(ctx.settings.x)) && Number.isFinite(Number(ctx.settings.y));
        const position = saved ? clampPosition(ctx.settings.x, ctx.settings.y) : defaultPosition();
        bar.style.left = `${Math.round(position.x)}px`;
        bar.style.top = `${Math.round(position.y)}px`;
    }

    function generatedButton(shortcut, addon) {
        const button = document.createElement('button');
        button.type = 'button'; button.id = `qaddons-shortcut-${shortcut.id}`;
        button.className = 'qsb-generated'; button.dataset.qsbAddon = shortcut.id;
        button.textContent = shortcut.label;
        button.title = `${addon.name} · kliknij lub użyj PPM, aby otworzyć ustawienia`;
        return button;
    }

    function collect() {
        scanFrame = 0;
        const addons = new Map(ctx.ui.listAddons().map(addon => [addon.id, addon]));
        for (const shortcut of SHORTCUTS) {
            const addon = addons.get(shortcut.id);
            if (!addon) continue;
            const native = shortcut.buttonId ? document.getElementById(shortcut.buttonId) : null;
            const placeholder = bar.querySelector(`#qaddons-shortcut-${shortcut.id}`);
            let button = native || placeholder;
            if (native && placeholder) placeholder.remove();
            if (!button) button = generatedButton(shortcut, addon);
            button.dataset.qsbAddon = shortcut.id;
            button.dataset.qsbHidden = String(!addon.showOnBar);
            button.classList.add('qsb-addon-button');
            if (button.parentElement !== bar) bar.append(button);
        }
        place();
    }

    function scheduleCollect() {
        if (!scanFrame) scanFrame = ctx.scheduler.frame(collect);
    }

    ctx.scheduler.listen(grip, 'pointerdown', event => {
        if (ctx.settings.locked === true || event.button !== 0) return;
        const rect = bar.getBoundingClientRect();
        drag = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        try { grip.setPointerCapture?.(event.pointerId); } catch {}
        event.preventDefault();
    });
    ctx.scheduler.listen(grip, 'pointermove', event => {
        if (!drag) return;
        const position = clampPosition(event.clientX - drag.x, event.clientY - drag.y);
        bar.style.left = `${Math.round(position.x)}px`; bar.style.top = `${Math.round(position.y)}px`;
    });
    ctx.scheduler.listen(grip, 'pointerup', () => {
        if (!drag) return;
        drag = null; ctx.changeSettings({ x: Math.round(bar.offsetLeft), y: Math.round(bar.offsetTop) });
    });
    ctx.scheduler.listen(bar, 'click', event => {
        const generated = event.target.closest('.qsb-generated[data-qsb-addon]');
        if (generated) ctx.ui.openSettings(generated.dataset.qsbAddon);
    });
    ctx.scheduler.listen(bar, 'contextmenu', event => {
        event.preventDefault(); event.stopPropagation();
        const addonId = event.target.closest('[data-qsb-addon]')?.dataset.qsbAddon;
        ctx.ui.openSettings(addonId || ctx.id);
    }, { capture: true });
    ctx.scheduler.listen(window, 'resize', place, { passive: true });
    ctx.events.on('shortcutBarChanged', place);
    ctx.events.on('addonSettingsChanged', scheduleCollect);
    ctx.events.on('addonChanged', scheduleCollect);
    ctx.scheduler.observer(MutationObserver, scheduleCollect).observe(document.body, { childList: true, subtree: true });
    ctx.scheduler.cleanup(() => {
        for (const button of bar.querySelectorAll('.qsb-addon-button')) {
            if (button.classList.contains('qsb-generated')) continue;
            button.classList.remove('qsb-addon-button');
            button.removeAttribute('data-qsb-addon'); button.removeAttribute('data-qsb-hidden');
            document.body.append(button);
        }
        bar.remove();
    });
    collect();
}

export function createShortcutBar() {
    return {
        id: 'shortcut-bar', name: 'Belka skrótów',
        description: 'Trzyma skróty dodatków w jednym, przesuwanym miejscu i otwiera ich ustawienia prawym przyciskiem myszy.',
        defaultEnabled: true, defaults: DEFAULTS, enable: startShortcutBar,
        onSettingsChange: ctx => ctx.events.emit('shortcutBarChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section');
            section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Belka skrótów</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Przeciągaj belkę za uchwyt z kropkami. PPM na skrócie otwiera ustawienia jego dodatku.</p>
                <div class="ln-grid"><label class="ln-switch"><input type="checkbox" data-setting="locked">Zablokuj pozycję belki</label>
                <button class="ln-btn" type="button" data-reset>Ustaw ponownie obok slotu 8</button></div>`;
            const enabled = section.querySelector('[data-enabled]');
            const locked = section.querySelector('[data-setting="locked"]');
            function sync() {
                enabled.checked = ctx.enabled; locked.checked = ctx.settings.locked === true;
                locked.disabled = !ctx.enabled; section.querySelector('[data-reset]').disabled = !ctx.enabled;
            }
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            ctx.scheduler.listen(locked, 'change', () => ctx.changeSettings({ locked: locked.checked }));
            ctx.scheduler.listen(section.querySelector('[data-reset]'), 'click', () => ctx.changeSettings({ x: null, y: null }));
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            sync(); ctx.container.append(section);
        }
    };
}
