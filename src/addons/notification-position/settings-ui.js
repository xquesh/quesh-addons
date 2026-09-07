import { rangeControl } from '../../core/ui/controls.js';
import { defaults } from './defaults.js';
import { FONTS, normalize, typographyCss } from './typography.js';

export function renderSettings(ctx) {
    const section = document.createElement('section');
    section.className = 'mtk-addon-settings';
    const heading = document.createElement('h2');
    heading.textContent = 'Pozycja powiadomień';
    const label = document.createElement('label');
    label.className = 'mtk-enabled';
    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = ctx.enabled;
    ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
    ctx.events.on('addonChanged', event => {
        if (event.id === ctx.id) enabled.checked = event.enabled;
    });
    label.append(enabled, ' Pozycja powiadomień włączona');
    section.append(heading, label, rangeControl({
        label: 'Odległość od dołu', value: ctx.settings.bottom, min: 0, max: 300,
        onChange: bottom => ctx.changeSettings({ bottom })
    }, ctx.scheduler));
    const appearance = document.createElement('div');
    appearance.innerHTML = `<h2>Wygląd tekstu</h2>
        <label class="mtk-enabled"><input type="checkbox" data-notification-setting="customTypography"> Własny wygląd powiadomień</label>
        <div class="ln-grid" data-typography-controls>
            <label class="ln-field"><span>Czcionka</span><select data-notification-setting="fontFamily">${Object.entries(FONTS).map(([key, font]) => `<option value="${key}">${font.label}</option>`).join('')}</select></label>
            <label class="ln-field"><span>Grubość tekstu</span><select data-notification-setting="fontWeight"><option value="game">Domyślna gry</option><option value="400">Normalna</option><option value="600">Półgruba</option><option value="700">Pogrubiona</option><option value="900">Bardzo gruba</option></select></label>
            <label class="ln-switch"><input type="checkbox" data-notification-setting="italic"> Kursywa</label>
            <label class="ln-field"><span>Cień tekstu</span><select data-notification-setting="shadow"><option value="game">Domyślny gry</option><option value="none">Brak</option><option value="soft">Miękki cień</option><option value="outline">Czarny obrys</option></select></label>
            <label class="ln-switch"><input type="checkbox" data-notification-setting="customColor"> Własny kolor tekstu</label>
            <label class="ln-field"><span>Kolor</span><input type="color" data-notification-setting="color"></label>
        </div>
        <div data-typography-ranges></div>
        <h2>Podgląd</h2><p data-notification-preview>Zdobyto legendarny przedmiot!<br>Przykładowe powiadomienie QADDONS.</p>
        <p class="ln-help">Bez własnego koloru zachowane są kolory komunikatów gry. Czcionki korzystają z zasobów systemu.</p>
        <button type="button" class="ln-btn" data-reset-typography>Przywróć wygląd gry</button>`;
    const rangeSpecs = [
        ['fontSize', 'Rozmiar czcionki', 10, 40, 1, 'px'],
        ['letterSpacing', 'Odstęp między literami', -1, 5, 0.1, 'px'],
        ['lineHeight', 'Odstęp między wierszami', 1, 2, 0.1, '×']
    ];
    for (const [key, title, min, max, step, unit] of rangeSpecs) {
        const control = document.createElement('label');
        control.className = 'mtk-range';
        control.innerHTML = `<span>${title}</span><output data-output="${key}"></output><input type="range" min="${min}" max="${max}" step="${step}" data-notification-setting="${key}">`;
        control.querySelector('output').dataset.unit = unit;
        appearance.querySelector('[data-typography-ranges]').append(control);
    }
    const controls = [...appearance.querySelectorAll('[data-notification-setting]')];
    const preview = appearance.querySelector('[data-notification-preview]');
    function syncPreview(value) {
        preview.style.cssText = typographyCss(value);
        for (const output of appearance.querySelectorAll('[data-output]')) {
            output.textContent = `${value[output.dataset.output]} ${output.dataset.unit}`;
        }
    }
    function sync() {
        const value = normalize(ctx.settings);
        for (const input of controls) {
            const key = input.dataset.notificationSetting;
            if (input.type === 'checkbox') input.checked = value[key];
            else input.value = value[key];
            input.disabled = key !== 'customTypography' && (!value.customTypography || (key === 'color' && !value.customColor));
        }
        syncPreview(value);
    }
    for (const input of controls) {
        const key = input.dataset.notificationSetting;
        const read = () => input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
        ctx.scheduler.listen(input, 'input', () => syncPreview({ ...normalize(ctx.settings), [key]: read() }));
        ctx.scheduler.listen(input, 'change', () => { ctx.changeSettings({ [key]: read() }); sync(); });
    }
    ctx.scheduler.listen(appearance.querySelector('[data-reset-typography]'), 'click', () => {
        ctx.changeSettings({ ...defaults, bottom: ctx.settings.bottom });
        sync();
    });
    sync();
    section.append(appearance);
    ctx.container.append(section);
}
