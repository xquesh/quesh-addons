import { DEFAULTS, hotkeyLabel, normalizeHotkey } from './data.js';
import { startQuickGroup } from './runtime.js';

export function createQuickGroup() {
    return {
        id: 'quick-group', name: 'Szybka grupa',
        description: 'Zaprasza graczy oraz automatycznie obsługuje zaproszenia i przywołania drużyny.',
        defaultEnabled: true, defaults: DEFAULTS,
        init(ctx) {
            ctx.settings.hotkey = normalizeHotkey(ctx.settings.hotkey);
            ctx.storage.save();
        },
        enable: startQuickGroup,
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Szybka grupa</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Kliknij <strong>SG</strong> na belce albo użyj skrótu, aby zaprosić klanowiczów, znajomych i sojuszników widocznych na mapie.</p>
                <div class="ln-grid"><label class="ln-field">Skrót zapraszania<input type="text" readonly data-hotkey title="Kliknij i naciśnij kombinację"></label>
                <label class="ln-switch"><input type="checkbox" data-setting="inviteRandos">Zapraszaj także obce postacie stojące obok</label>
                <label class="ln-switch"><input type="checkbox" data-setting="randomInviteOrder">Losowa kolejność zaproszeń</label></div>
                <h2>Automatycznie akceptuj od</h2><div class="ln-grid">
                <label class="ln-switch"><input type="checkbox" data-setting="acceptFriend">Znajomych</label>
                <label class="ln-switch"><input type="checkbox" data-setting="acceptClan">Klanowiczów</label>
                <label class="ln-switch"><input type="checkbox" data-setting="acceptAlly">Sojuszników klanu</label>
                <label class="ln-switch"><input type="checkbox" data-setting="acceptAll">Wszystkich</label>
                <label class="ln-switch"><input type="checkbox" data-setting="rejectOther">Odrzucaj pozostałe zaproszenia</label></div>
                <h2>Przywołanie drużyny</h2><div class="ln-grid">
                <label class="ln-switch"><input type="checkbox" data-setting="autoAcceptSummon">Automatycznie przechodź po przywołaniu drużyny</label></div>
                <div class="ln-grid"><button class="ln-btn" type="button" data-invite>Zaproś teraz</button></div>`;
            const enabled = section.querySelector('[data-enabled]');
            const hotkey = section.querySelector('[data-hotkey]');
            function sync() {
                enabled.checked = ctx.enabled; hotkey.value = hotkeyLabel(ctx.settings.hotkey);
                for (const input of section.querySelectorAll('[data-setting]')) input.checked = Boolean(ctx.settings[input.dataset.setting]);
                section.querySelector('[data-invite]').disabled = !ctx.enabled;
            }
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            for (const input of section.querySelectorAll('[data-setting]')) ctx.scheduler.listen(input, 'change', () => ctx.changeSettings({ [input.dataset.setting]: input.checked }));
            ctx.scheduler.listen(hotkey, 'keydown', event => {
                event.preventDefault(); event.stopPropagation();
                if (['ControlLeft','ControlRight','AltLeft','AltRight','ShiftLeft','ShiftRight'].includes(event.code)) return;
                ctx.changeSettings({ hotkey: { code: event.code, ctrlKey: event.ctrlKey, altKey: event.altKey, shiftKey: event.shiftKey } }); sync();
            });
            ctx.scheduler.listen(section.querySelector('[data-invite]'), 'click', () => ctx.events.emit('quickGroupInvite'));
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            sync(); ctx.container.append(section);
        }
    };
}
