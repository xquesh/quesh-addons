import { DEFAULTS, ITEM_TYPES } from './data.js';
import { startEnhancer } from './runtime.js';

const TYPE_LABELS = {
    oneHand: 'Broń jednoręczna', twoHand: 'Broń dwuręczna', oneHalf: 'Broń półtoraręczna', distance: 'Broń dystansowa',
    help: 'Pomocnicza', wand: 'Różdżki', orb: 'Orby', armor: 'Zbroje', helmet: 'Hełmy', boots: 'Buty', gloves: 'Rękawice',
    ring: 'Pierścienie', necklace: 'Naszyjniki', shield: 'Tarcze', arrows: 'Strzały'
};

export function createEnhancer() {
    return {
        id: 'enhancer', name: 'Ulepszarka',
        description: 'Automatyczne i ręczne ulepszanie przedmiotów z filtrami składników oraz trzema trybami pracy.',
        defaultEnabled: true, defaults: DEFAULTS,
        enable: startEnhancer,
        onSettingsChange: ctx => ctx.events.emit('enhancerChanged'),
        renderSettings(ctx) {
            ctx.settings.rarity = { ...DEFAULTS.rarity, ...ctx.settings.rarity };
            ctx.settings.types = { ...DEFAULTS.types, ...ctx.settings.types };
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Ulepszarka</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Przycisk <strong>UL</strong> otwiera małe okno dodatku. Przeciągnij przedmiot z ekwipunku bezpośrednio na odpowiedni slot. Prawy przycisk myszy czyści slot.</p>
                <h2>Działanie</h2><div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="rememberActive">Zapamiętaj stan AUTO</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="messages">Pokazuj komunikaty gry</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="highlight">Podświetl składniki w torbach</label>
                    <label class="ln-field">Tryb ulepszania<select data-setting="mode"><option value="regular">Zwykły — jeden cel</option><option value="type">Po typie — trzy cele</option><option value="hybrid">Hybrydowy — cztery cele</option></select></label>
                    <label class="ln-field">Rozmiar bufora<input type="range" min="1" max="126" step="1" data-setting="bufferSize"><output data-buffer-size></output></label>
                    <label class="ln-field">Klawisz ręcznego startu<input type="text" readonly data-hotkey title="Kliknij i naciśnij klawisz"></label>
                </div>
                <h2>Rzadkość składników</h2><div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-rarity="common">Zwykłe</label><label class="ln-switch"><input type="checkbox" data-rarity="unique">Unikatowe</label><label class="ln-switch"><input type="checkbox" data-rarity="heroic">Heroiczne</label>
                </div><h2>Typy składników</h2><div class="ln-grid">${Object.keys(ITEM_TYPES).map(key => `<label class="ln-switch"><input type="checkbox" data-type="${key}">${TYPE_LABELS[key]}</label>`).join('')}</div>
                <p>Automat uruchamia serię po zapełnieniu bufora albo gdy w pierwszych trzech torbach zostaną mniej niż 5 wolnych miejsc. Jedno zapytanie zużywa maksymalnie 25 składników, zgodnie z limitem gry.</p>`;
            const enabled = section.querySelector('[data-enabled]');
            const hotkey = section.querySelector('[data-hotkey]');
            function sync() {
                enabled.checked = ctx.enabled;
                section.querySelectorAll('[data-setting]').forEach(input => { const value = ctx.settings[input.dataset.setting]; if (input.type === 'checkbox') input.checked = Boolean(value); else input.value = value; });
                section.querySelectorAll('[data-rarity]').forEach(input => { input.checked = Boolean(ctx.settings.rarity[input.dataset.rarity]); });
                section.querySelectorAll('[data-type]').forEach(input => { input.checked = ctx.settings.types[input.dataset.type] !== false; });
                hotkey.value = ctx.settings.hotkey || 'Brak';
                section.querySelector('[data-buffer-size]').textContent = `${ctx.settings.bufferSize} przedm.`;
            }
            sync();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            section.querySelectorAll('[data-setting]').forEach(input => ctx.scheduler.listen(input, input.type === 'range' ? 'input' : 'change', () => { const value = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value; ctx.changeSettings({ [input.dataset.setting]: value }); sync(); }));
            section.querySelectorAll('[data-rarity]').forEach(input => ctx.scheduler.listen(input, 'change', () => { ctx.changeSettings({ rarity: { ...ctx.settings.rarity, [input.dataset.rarity]: input.checked } }); sync(); }));
            section.querySelectorAll('[data-type]').forEach(input => ctx.scheduler.listen(input, 'change', () => { ctx.changeSettings({ types: { ...ctx.settings.types, [input.dataset.type]: input.checked } }); sync(); }));
            ctx.scheduler.listen(hotkey, 'keydown', event => { event.preventDefault(); event.stopPropagation(); ctx.changeSettings({ hotkey: event.code === 'Escape' ? '' : event.code }); sync(); });
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.container.append(section);
        }
    };
}
