import { rangeControl } from '../../core/ui/controls.js';

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
    ctx.container.append(section);
}
