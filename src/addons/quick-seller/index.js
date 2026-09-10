import { startQuickSeller } from './runtime.js';

export function createQuickSeller() {
    return {
        id: 'quick-seller', name: 'Sprzedawczyk',
        description: 'Szybko opróżnia koszyk u otwartego handlarza podczas przytrzymania przycisku lub klawisza.',
        defaultEnabled: true,
        defaults: { showButton: true, hotkey: 'F8', interval: 150 },
        enable: startQuickSeller,
        onSettingsChange: ctx => ctx.events.emit('quickSellerChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Sprzedawczyk</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Otwórz okno handlarza i przytrzymaj mały przycisk <strong>SPR</strong> albo skonfigurowany klawisz. Sprzedawanie zatrzyma się natychmiast po puszczeniu.</p>
                <div class="ln-grid"><label class="ln-switch"><input type="checkbox" data-setting="showButton">Pokaż przycisk SPR</label>
                <label class="ln-field">Klawisz przytrzymania<input type="text" readonly data-hotkey title="Kliknij i naciśnij wybrany klawisz"></label>
                <label class="ln-field">Odstęp między seriami<input type="range" min="100" max="500" step="10" data-setting="interval"><output data-interval></output></label></div>
                <p data-status>Klawisz działa tylko poza polami tekstowymi. Przycisk jest nieaktywny, dopóki handlarz nie jest otwarty.</p>`;
            const enabled = section.querySelector('[data-enabled]');
            const hotkey = section.querySelector('[data-hotkey]');
            const interval = section.querySelector('[data-setting="interval"]');
            const show = section.querySelector('[data-setting="showButton"]');
            const sync = () => { enabled.checked = ctx.enabled; hotkey.value = ctx.settings.hotkey || 'Brak'; interval.value = ctx.settings.interval; show.checked = ctx.settings.showButton !== false; section.querySelector('[data-interval]').textContent = `${ctx.settings.interval} ms`; };
            sync();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            ctx.scheduler.listen(show, 'change', () => ctx.changeSettings({ showButton: show.checked }));
            ctx.scheduler.listen(interval, 'input', () => { ctx.changeSettings({ interval: Number(interval.value) }); sync(); });
            ctx.scheduler.listen(hotkey, 'keydown', event => { event.preventDefault(); event.stopPropagation(); if (event.code === 'Escape') ctx.changeSettings({ hotkey: '' }); else ctx.changeSettings({ hotkey: event.code }); sync(); });
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.container.append(section);
        }
    };
}
