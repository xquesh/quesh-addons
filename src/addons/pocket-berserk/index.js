import { createBerserkTracker, DEFAULTS, GROUP_BERSERK_ID, OFFSET_MAX, OFFSET_MIN, SOLO_BERSERK_ID, updateBerserkTracker } from './data.js';
import { heroOperationalLevel, sendBerserkSetting, startPocketBerserk } from './runtime.js';
import { POCKET_BERSERK_CSS } from './style.js';

const MODE_NAMES = Object.freeze({ [SOLO_BERSERK_ID]: 'Samotnie', [GROUP_BERSERK_ID]: 'W drużynie' });

export function createPocketBerserk() {
    const tracker = createBerserkTracker();
    return {
        id: 'pocket-berserk',
        name: 'Kieszonkowy berserk',
        description: 'Szybko przełącza agresywność potworów osobno dla gry solo i w grupie, z filtrami oraz zakresem poziomów.',
        defaultEnabled: true,
        defaults: DEFAULTS,
        init: ctx => {
            if (ctx.game.latestSettings) updateBerserkTracker(tracker, ctx.game.latestSettings);
            ctx.events.on('gamePacket', packet => {
                if (updateBerserkTracker(tracker, packet)) ctx.events.emit('pocketBerserkDataChanged');
            });
        },
        enable: ctx => startPocketBerserk(ctx, tracker),
        onSettingsChange: ctx => ctx.events.emit('pocketBerserkChanged'),
        renderSettings(ctx) {
            ctx.styles.set('settings', POCKET_BERSERK_CSS);
            const section = document.createElement('section');
            section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Kieszonkowy berserk</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Mały przycisk <strong>BR</strong> obok slotu 8 przełącza tryb właściwy dla gry solo albo grupy. Kliknij go prawym przyciskiem, aby wrócić do tej konfiguracji.</p>
                <div class="qpb-status" data-status>Oczekiwanie na ustawienia gry…</div>
                <div class="ln-grid"><label class="ln-switch"><input type="checkbox" data-setting="showButton">Pokaż przycisk BR obok slotu 8</label></div>
                <div class="qpb-columns" data-modes></div>`;
            const modes = section.querySelector('[data-modes]');
            for (const id of [SOLO_BERSERK_ID, GROUP_BERSERK_ID]) {
                const box = document.createElement('div');
                box.className = 'qpb-mode';
                box.dataset.mode = String(id);
                box.innerHTML = `<h3>${MODE_NAMES[id]}</h3>
                    <label class="ln-switch"><input type="checkbox" data-key="v">Włącz berserk</label>
                    <label class="ln-switch"><input type="checkbox" data-key="common">Zwykłe potwory</label>
                    <label class="ln-switch"><input type="checkbox" data-key="elite">Elity i elity z obstawą</label>
                    <label class="ln-switch"><input type="checkbox" data-key="elite2">Elity II i elity II z obstawą</label>
                    <div class="qpb-levels"><label>Minimalny poziom<input type="number" data-key="lvlmin"></label><label>Maksymalny poziom<input type="number" data-key="lvlmax"></label></div>`;
                modes.append(box);
            }
            const enabled = section.querySelector('[data-enabled]');

            function sync() {
                enabled.checked = ctx.enabled;
                section.querySelector('[data-setting="showButton"]').checked = ctx.settings.showButton !== false;
                const level = heroOperationalLevel(ctx.game.page, tracker);
                for (const box of section.querySelectorAll('[data-mode]')) {
                    const mode = tracker.modes[Number(box.dataset.mode)];
                    box.querySelectorAll('[data-key]').forEach(input => {
                        input.disabled = !ctx.enabled || !mode;
                        if (!mode) return;
                        const key = input.dataset.key;
                        if (input.type === 'checkbox') input.checked = Boolean(mode[key]);
                        else {
                            input.value = String(level + mode[key]);
                            input.min = String(level + OFFSET_MIN);
                            input.max = String(level + OFFSET_MAX);
                        }
                    });
                }
                const activeId = tracker.inParty ? GROUP_BERSERK_ID : SOLO_BERSERK_ID;
                const active = tracker.modes[activeId];
                const status = section.querySelector('[data-status]');
                status.dataset.enabled = String(Boolean(active?.v));
                status.textContent = active ? `Aktualny tryb: ${MODE_NAMES[activeId]} — berserk ${active.v ? 'włączony' : 'wyłączony'}.` : 'Oczekiwanie na ustawienia gry…';
            }

            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            for (const input of section.querySelectorAll('[data-setting]')) ctx.scheduler.listen(input, input.type === 'range' ? 'input' : 'change', () => {
                ctx.changeSettings({ [input.dataset.setting]: input.type === 'checkbox' ? input.checked : Number(input.value) });
                sync();
            });
            for (const box of section.querySelectorAll('[data-mode]')) for (const input of box.querySelectorAll('[data-key]')) ctx.scheduler.listen(input, 'change', () => {
                const id = Number(box.dataset.mode);
                const key = input.dataset.key;
                const level = heroOperationalLevel(ctx.game.page, tracker);
                const value = input.type === 'checkbox' ? input.checked : Number(input.value) - level;
                sendBerserkSetting(ctx.game.page, tracker, id, key, value);
                ctx.events.emit('pocketBerserkChanged');
                sync();
            });
            ctx.events.on('pocketBerserkDataChanged', sync);
            ctx.events.on('pocketBerserkChanged', sync);
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            sync();
            ctx.container.append(section);
        }
    };
}
