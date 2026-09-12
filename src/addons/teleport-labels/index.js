import { DEFAULTS, parseCustomLabels, serializeCustomLabels } from './data.js';
import { startTeleportLabels } from './runtime.js';

export function createTeleportLabels() {
    return {
        id: 'teleport-labels', name: 'Podpisownik',
        description: 'Dodaje krótkie, czytelne podpisy do teleportów i zwojów przywołania drużyny.',
        defaultEnabled: true, defaults: DEFAULTS,
        enable: startTeleportLabels,
        onSettingsChange: ctx => ctx.events.emit('teleportLabelsChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings qtl-settings';
            section.innerHTML = `<h2>Podpisownik</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Podpis jest dobierany z celu zapisanego w statystyce <strong>teleport</strong> lub <strong>custom_teleport</strong>. Zwoje przywołania drużyny są rozpoznawane po <strong>townlimit</strong> i nazwie herosa.</p>
                <h2>Wygląd podpisów</h2><div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="labels">Wyświetlaj podpisy</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="bold">Pogrubienie</label>
                    <label class="ln-field">Rozmiar (7–14 px)<input type="number" min="7" max="14" data-setting="fontSize"></label>
                    <label class="ln-field">Kolor<input type="color" data-setting="color"></label>
                    <label class="ln-field">Cień / poświata<select data-setting="shadow"><option value="outline">Obrys</option><option value="soft">Miękki cień</option><option value="glow">Poświata</option><option value="none">Brak</option></select></label>
                    <label class="ln-field">Kolor cienia / poświaty<input type="color" data-setting="shadowColor"></label>
                    <label class="ln-field">Siła (0–12)<input type="number" min="0" max="12" data-setting="shadowStrength"></label>
                </div><h2>Własne podpisy</h2><p>Każdy wpis umieść w nowej linii: <strong>ID_MAPY=PODPIS</strong>. Dla przywołania użyj <strong>name:Nazwa herosa=PODPIS</strong>. Maksymalnie 8 znaków.</p>
                <div class="ln-grid"><label class="ln-field ln-full">Lista własnych podpisów<textarea data-custom rows="8" spellcheck="false" placeholder="1224=KEND\nname:Domina Ecclesiae=DOMI"></textarea></label>
                    <button class="ln-btn" type="button" data-save>Zapisz własne podpisy</button><button class="ln-btn" type="button" data-clear>Wyczyść własne podpisy</button>
                    <div class="ln-help ln-full" data-status role="status"></div></div>`;
            ctx.styles.set('settings', '#mtk-panel .qtl-settings textarea{width:100%;resize:vertical;min-height:120px;padding:7px;border:1px solid #333;border-radius:0;background:#080808;color:#eee;font:12px/1.5 monospace;}');
            const enabled = section.querySelector('[data-enabled]');
            const custom = section.querySelector('[data-custom]');
            const status = section.querySelector('[data-status]');
            function sync() {
                enabled.checked = ctx.enabled;
                for (const input of section.querySelectorAll('[data-setting]')) {
                    const value = ctx.settings[input.dataset.setting];
                    if (input.type === 'checkbox') input.checked = value !== false; else input.value = value;
                }
                custom.value = serializeCustomLabels(ctx.settings.customLabels);
            }
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            for (const input of section.querySelectorAll('[data-setting]')) ctx.scheduler.listen(input, input.type === 'number' || input.type === 'color' ? 'input' : 'change', () => {
                if (input.type === 'number' && !input.checkValidity()) return;
                ctx.changeSettings({ [input.dataset.setting]: input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value });
            });
            ctx.scheduler.listen(section.querySelector('[data-save]'), 'click', () => {
                const labels = parseCustomLabels(custom.value); ctx.changeSettings({ customLabels: labels });
                custom.value = serializeCustomLabels(labels); status.textContent = `Zapisano ${Object.keys(labels).length} własnych podpisów.`;
            });
            ctx.scheduler.listen(section.querySelector('[data-clear]'), 'click', () => {
                custom.value = ''; ctx.changeSettings({ customLabels: {} }); status.textContent = 'Własne podpisy zostały wyczyszczone.';
            });
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            sync(); ctx.container.append(section);
        }
    };
}
