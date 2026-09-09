import { defaults, imageUrl, BONUSES, abbreviation } from './data.js';
import { startItemTools } from './runtime.js';
import { createTooltipTools } from './tooltip.js';

export function createItemTools() {
    return {
        id: 'item-tools', name: 'Przedmioty: ramki i tooltipy',
        description: 'Własne ramki i nakładki, skróty bonusów legendarnych oraz informacje o ulepszeniach i łupie.',
        defaultEnabled: true, defaults,
        enable: startItemTools,
        onSettingsChange: ctx => ctx.events.emit('itemToolsChanged'),
        renderSettings
    };
}

function renderSettings(ctx) {
    const section = document.createElement('section');
    section.className = 'mtk-addon-settings qaddons-items-settings';
    section.innerHTML = `<h2>Przedmioty: ramki i tooltipy</h2>
        <label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
        <nav class="qi-tabs" aria-label="Ustawienia przedmiotów">
            <button type="button" class="ln-btn" data-tab="appearance" aria-pressed="true">Ramki i nakładki</button>
            <button type="button" class="ln-btn" data-tab="bonuses" aria-pressed="false">Bonusy legendarne</button>
            <button type="button" class="ln-btn" data-tab="tooltips" aria-pressed="false">Tooltipy</button>
        </nav>
        <div data-pane="appearance"><p>Dodaj adres HTTPS arkusza ramek lub nakładek zgodnego z Margonem (kafelki 32 × 32 px). Wybór zapisuje się od razu. „Wygląd gry” przywraca oryginał.</p>
            ${['frame', 'overlay'].map(type => `<h2>${type === 'frame' ? 'Ramki' : 'Nakładki'}</h2><div data-library="${type}"></div>
                <form data-add="${type}" class="ln-grid"><label class="ln-field">Nazwa<input type="text" name="name" maxlength="60" required placeholder="Moja ${type === 'frame' ? 'ramka' : 'nakładka'}"></label>
                <label class="ln-field">Adres grafiki HTTPS<input type="url" name="url" required placeholder="https://…/grafika.png"></label>
                <div class="qi-art-preview" aria-label="Podgląd arkusza"><span></span><small>Podgląd ramki legendarnej</small></div>
                <button class="ln-btn" type="submit">Dodaj i zastosuj</button><div class="ln-help ln-full" role="status" data-message></div></form>`).join('')}
        </div>
        <div data-pane="bonuses" hidden><h2>Skrót w prawym dolnym rogu</h2>
            <label class="mtk-enabled"><input type="checkbox" data-setting="bonusLabels"> Pokaż bonus na legendarnych przedmiotach</label>
            <p>Skrót pojawia się na ikonie przedmiotu, również z oryginalną ramką. Kilka słów → pierwsze litery; jedno słowo → dwie pierwsze litery. Polskie znaki zostają zachowane.</p>
            <div class="qi-bonus-preview">${['Krytyczna osłona', 'Cios bardzo krytyczny', 'Oślepienie'].map(name => `<div><div class="qi-example-icon">◇<span>${abbreviation(name)}</span></div><small>${name}</small></div>`).join('')}</div>
            <h2>Rozpoznawane bonusy</h2><div class="qi-bonus-list">${Object.values(BONUSES).map(name => `<div><b>${abbreviation(name)}</b><span>${name}</span></div>`).join('')}</div>
            <p>Przedmiot bez bonusu lub z nierozpoznanym bonusem pozostaje bez etykiety. Etykieta nie przechwytuje kliknięć ani tooltipów.</p>
        </div>
        <div data-pane="tooltips" hidden><h2>Rozszerzenie opisu przedmiotu</h2>
            <div class="ln-grid">${[
                ['tooltipEnabled', 'Rozszerzone tooltipy'], ['showUpgradeCost', 'Koszty ulepszania'],
                ['showLootDate', 'Data zdobycia'], ['showLootGroup', 'Liczebność grupy'], ['showEssence', 'Esencja z przedmiotu']
            ].map(([key, name]) => `<label class="ln-switch"><input type="checkbox" data-setting="${key}">${name}</label>`).join('')}
            <label class="ln-field">Pokazywane koszty<select data-setting="upgradeDisplay"><option value="both">Każdy poziom i suma</option><option value="all">Każdy poziom</option><option value="sum">Tylko suma</option></select></label></div>
            <h2>Koszty dla wybranych rang</h2><div class="ln-grid">${Object.entries({ zwykly: 'Zwykłe', unikatowy: 'Unikatowe', heroiczny: 'Heroiczne', ulepszony: 'Ulepszone', legendarny: 'Legendarne' }).map(([key, name]) => `<label class="ln-switch"><input type="checkbox" data-rarity="${key}">${name}</label>`).join('')}</div>
            <h2>Podgląd</h2><p>Przykładowy legendarny przedmiot, poziom 100, ulepszenie +3. Koszty zachowują wzory z dostarczonego skryptu.</p><div class="qi-tip-preview"></div>
        </div>`;
    ctx.styles.set('settings', `
        #mtk-panel .qi-tabs{display:flex;flex-wrap:wrap;gap:5px;margin:12px 0;}
        #mtk-panel .qi-tabs [aria-pressed="true"]{border-color:#aaa;background:#222;color:#fff;}
        #mtk-panel .qi-library-row{display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid #292929;}
        #mtk-panel .qi-library-row label{flex:1;min-width:0;overflow-wrap:anywhere;cursor:pointer;}
        #mtk-panel .qi-library-row input{margin-right:8px;accent-color:#ccc;}
        #mtk-panel .qi-art-preview{display:flex;align-items:center;gap:10px;color:#aaa;}
        #mtk-panel .qi-art-preview>span{display:block;width:32px;height:32px;background-color:#111;background-position:-128px 0;flex:none;border:1px solid #333;box-sizing:content-box;}
        #mtk-panel .qi-bonus-preview{display:flex;gap:22px;padding:14px 10px;flex-wrap:wrap;}
        #mtk-panel .qi-bonus-preview>div{display:flex;align-items:center;gap:9px;}
        #mtk-panel .qi-example-icon{position:relative;width:32px;height:32px;flex:none;border:1px solid #888;color:#aaa;text-align:center;line-height:28px;font-size:23px;background:#111;}
        #mtk-panel .qi-example-icon span{position:absolute;bottom:0;right:0;background:transparent;color:#fff;font:bold 9px/11px Arial;padding:0;border:0;}
        #mtk-panel .qi-bonus-list{display:grid;grid-template-columns:1fr 1fr;gap:0 15px;padding:0 10px 14px;}
        #mtk-panel .qi-bonus-list>div{display:flex;gap:10px;border-bottom:1px solid #222;padding:5px 0;font-size:12px;}
        #mtk-panel .qi-bonus-list b{min-width:30px;color:#fff;}
        #mtk-panel .qi-tip-preview{margin:10px;background:#080808;border:1px solid #333;padding:10px;color:#ccc;font:11px/1.55 Arial;}
    `);
    const enabled = section.querySelector('[data-enabled]');
    enabled.checked = ctx.enabled;
    ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
    ctx.events.on('addonChanged', event => { if (event.id === ctx.id) enabled.checked = event.enabled; });
    const preview = () => {
        const target = section.querySelector('.qi-tip-preview');
        const tools = createTooltipTools(ctx.settings);
        target.innerHTML = ctx.settings.tooltipEnabled ?
            (ctx.settings.showUpgradeCost ? tools.upgradeHtml({ level: 100, currentUpgrade: 3, rarity: 'legendarny' }) : '') +
            (ctx.settings.showLootDate ? '<div>Zdobyto: 09.09.2026 12:00:00</div>' : '') +
            (ctx.settings.showLootGroup ? '<div>Grupa: 3 graczy</div>' : '') +
            (ctx.settings.showEssence ? '<div>Esencja: 60</div>' : '') : 'Rozszerzenie tooltipów jest wyłączone.';
        if (!target.textContent) target.textContent = 'Wybrane informacje nie dotyczą tego przykładu.';
    };
    for (const button of section.querySelectorAll('[data-tab]')) ctx.scheduler.listen(button, 'click', () => {
        section.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
        section.querySelectorAll('[data-pane]').forEach(pane => { pane.hidden = pane.dataset.pane !== button.dataset.tab; });
    });
    for (const input of section.querySelectorAll('[data-setting],[data-rarity]')) {
        const key = input.dataset.setting;
        if (input.type === 'checkbox') input.checked = key ? !!ctx.settings[key] : ctx.settings.rarities?.[input.dataset.rarity] !== false;
        else input.value = ctx.settings[key];
        ctx.scheduler.listen(input, 'change', () => {
            ctx.changeSettings(key ? { [key]: input.type === 'checkbox' ? input.checked : input.value } : { rarities: { ...ctx.settings.rarities, [input.dataset.rarity]: input.checked } });
            preview();
        });
    }
    for (const type of ['frame', 'overlay']) {
        const key = type === 'frame' ? 'frames' : 'overlays';
        const active = type === 'frame' ? 'activeFrame' : 'activeOverlay';
        const library = section.querySelector(`[data-library="${type}"]`);
        function renderLibrary() {
            library.replaceChildren();
            const list = Array.isArray(ctx.settings[key]) ? ctx.settings[key] : [];
            [{ name: 'Wygląd gry', url: '' }, ...list].forEach((item, index) => {
                const row = document.createElement('div'); row.className = 'qi-library-row';
                const label = document.createElement('label');
                const input = document.createElement('input'); input.type = 'radio'; input.name = `qi-${type}`; input.value = item.url;
                input.checked = (ctx.settings[active] || '') === item.url;
                label.append(input, document.createTextNode(item.name)); row.append(label);
                if (index) { const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'ln-btn'; remove.textContent = 'Usuń'; remove.dataset.removeIndex = index - 1; row.append(remove); }
                library.append(row);
            });
        }
        ctx.scheduler.listen(library, 'change', event => { if (event.target.matches('input[type="radio"]')) ctx.changeSettings({ [active]: event.target.value }); });
        ctx.scheduler.listen(library, 'click', event => {
            const button = event.target.closest('[data-remove-index]');
            if (!button) return;
            const list = [...ctx.settings[key]];
            const [removed] = list.splice(Number(button.dataset.removeIndex), 1);
            ctx.changeSettings({ [key]: list, ...(removed?.url === ctx.settings[active] ? { [active]: '' } : {}) });
            renderLibrary();
        });
        const form = section.querySelector(`[data-add="${type}"]`);
        const urlInput = form.elements.url;
        const message = form.querySelector('[data-message]');
        ctx.scheduler.listen(urlInput, 'input', () => {
            const url = imageUrl(urlInput.value);
            form.querySelector('.qi-art-preview>span').style.backgroundImage = url ? `url(${JSON.stringify(url)})` : '';
            message.textContent = urlInput.value && !url ? 'Podaj pełny adres HTTPS grafiki.' : '';
        });
        ctx.scheduler.listen(form, 'submit', event => {
            event.preventDefault();
            const url = imageUrl(urlInput.value);
            const name = form.elements.name.value.trim();
            if (!url || !name) { message.textContent = 'Podaj nazwę i poprawny adres HTTPS.'; return; }
            const list = (Array.isArray(ctx.settings[key]) ? ctx.settings[key] : []).filter(item => item.url !== url);
            ctx.changeSettings({ [key]: [...list, { name, url }], [active]: url });
            renderLibrary(); form.reset(); form.querySelector('.qi-art-preview>span').style.backgroundImage = '';
            message.textContent = 'Zapisano i wybrano grafikę.';
        });
        renderLibrary();
    }
    preview(); ctx.container.append(section);
}
