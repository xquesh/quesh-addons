import { rangeControl } from '../../core/ui/controls.js';

export function renderSettings(ctx) {
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
    ctx.container.append(label, rangeControl({
        label: 'Odległość od dołu', value: ctx.settings.bottom, min: 0, max: 300,
        onChange: bottom => ctx.changeSettings({ bottom })
    }, ctx.scheduler));
}
