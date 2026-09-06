import { DEFAULTS } from './defaults.js';
import { PRESETS } from './presets.js';
import { IDS } from './constants.js';
import { rangeHtml } from '../../core/ui/controls.js';
import { setPanelTab, panelTabButton, panelTabPane } from '../../core/ui/tabs.js';

const VERSION = '6.2.1';

export function createSettingsUi(state, ctx, runtime) {
    function effectOptions() {
        return `<option value="none"> Wyłączone </option> <option value="static"> Statyczny neon </option> <option value="breathe"> Oddychanie </option> <option value="pulse"> Pulsowanie </option> <option value="heartbeat"> Podwójny impuls </option> <option value="orbit"> Krążący neon </option> <option value="dual"> Dwa krążące neony </option> <option value="comet"> Neonowa kometa </option> <option value="scannerH"> Skaner poziomy </option> <option value="scannerV"> Skaner pionowy </option> <option value="scannerCross"> Skaner krzyżowy </option>`;
    }

    function directionOptions() {
        return `<option value="cw"> Normalny </option> <option value="ccw"> Odwrócony </option>`;
    }

    function targetSection( prefix, title, help ) {
        return `<section class="ln-section"> <div class="ln-section-head"> <span> ${title} </span> <span> FX </span> </div> <div class="ln-grid"> <label class="ln-field ln-full"> <span class="ln-label"> Animacja </span> <select data-key="${prefix}Effect" > ${effectOptions()} </select> <span class="ln-help"> ${help} </span> </label> <label class="ln-switch"> <input type="checkbox" data-key="${prefix}Glow" > <span> Backlight </span> </label> <label class="ln-switch"> <input type="checkbox" data-key="${prefix}Ambient" > <span> Glow powierzchni </span> </label> <label class="ln-field"> <span class="ln-label"> Kolor bazowy </span> <input type="color" data-key="${prefix}Color" > </label> <label class="ln-field"> <span class="ln-label"> Akcent animacji </span> <input type="color" data-key="${prefix}Accent" > </label> ${rangeHtml( prefix + 'Width', 'Grubość', 1, 6, 1, ' px' )} ${rangeHtml( prefix + 'Speed', 'Czas animacji', 0.4, 9, 0.05, ' s' )} ${rangeHtml( prefix + 'Intensity', 'Moc', 0.1, 2, 0.05, '×' )} ${rangeHtml( prefix + 'Padding', 'Odsunięcie', -8, 16, 1, ' px' )} <label class="ln-field ln-full"> <span class="ln-label"> Kierunek </span> <select data-key="${prefix}Direction" > ${directionOptions()} </select> </label> </div> </section>`;
    }

    function canvasSection() {
        return `${targetSection('canvas', 'GAME CANVAS', '#GAME_CANVAS')}
        <section class="ln-section">
            <div class="ln-section-head">
                <span>ŚWIATŁO DO ŚRODKA</span>
                <span>INNER</span>
            </div>
            <div class="ln-grid">
                <label class="ln-switch ln-full">
                    <input type="checkbox" data-key="canvasInnerGlow">
                    <span>Świeć również do wnętrza pola gry</span>
                </label>
                ${rangeHtml('canvasInnerIntensity', 'Moc światła do środka', 0, 2, 0.05, '×')}
                <div class="ln-help ln-full">
                    Ta poświata jest rysowana nad mapą, ale nadal wewnątrz warstwy pola gry,
                    więc HUD i tooltipy pozostają nad nią.
                </div>
            </div>
        </section>`;
    }

    function multiLayerSection() {
        return `<section class="ln-section"> <div class="ln-section-head"> <span> WIELOWARSTWOWY NEON </span> <span> 3 WARSTWY </span> </div> <div class="ln-grid"> <label class="ln-switch ln-full"> <input type="checkbox" data-key="multiLayerEnabled" > <span> Wielowarstwowa neonowa rurka </span> </label> <div class="ln-help ln-full"> Rdzeń + trzy warstwy światła. Każda warstwa ma osobno kolor, siłę, krycie i szerokość. Warstwa 1 trzyma światło blisko rurki, warstwa 2 buduje średnią poświatę, a warstwa 3 odpowiada za najdalszy i najmocniej rozlany rozbłysk. </div> <label class="ln-field"> <span class="ln-label"> Rdzeń </span> <input type="color" data-key="neonCoreColor" > </label> ${rangeHtml( 'neonCoreOpacity', 'Moc rdzenia', 0, 1, 0.01 )} <div class="ln-help ln-full"> <b>WARSTWA 1 — BLISKA</b> </div> <label class="ln-field"> <span class="ln-label"> Kolor warstwy 1 </span> <input type="color" data-key="neonLayer1Color" > </label> ${rangeHtml( 'neonLayer1Strength', 'Siła warstwy 1', 0, 5, 1 )} ${rangeHtml( 'neonLayer1Opacity', 'Krycie warstwy 1', 0, 5, 1 )} ${rangeHtml( 'neonLayer1Width', 'Szerokość warstwy 1', 0, 5, 1 )} <div class="ln-help ln-full"> <b>WARSTWA 2 — ŚREDNIA</b> </div> <label class="ln-field"> <span class="ln-label"> Kolor warstwy 2 </span> <input type="color" data-key="neonLayer2Color" > </label> ${rangeHtml( 'neonLayer2Strength', 'Siła warstwy 2', 0, 5, 1 )} ${rangeHtml( 'neonLayer2Opacity', 'Krycie warstwy 2', 0, 5, 1 )} ${rangeHtml( 'neonLayer2Width', 'Szerokość warstwy 2', 0, 5, 1 )} <div class="ln-help ln-full"> <b>WARSTWA 3 — DALEKA</b><br> Na głównym oknie łupu ta warstwa odpowiada za duży rozbłysk i może mieć bardzo duży zasięg. Na HUD, mapie i pojedynczym przedmiocie ten sam poziom jest automatycznie renderowany ciaśniej, żeby kilka ramek nie zalewało całego ekranu. </div> <label class="ln-field"> <span class="ln-label"> Kolor warstwy 3 </span> <input type="color" data-key="neonLayer3Color" > </label> ${rangeHtml( 'neonLayer3Strength', 'Siła warstwy 3', 0, 5, 1 )} ${rangeHtml( 'neonLayer3Opacity', 'Krycie warstwy 3', 0, 5, 1 )} ${rangeHtml( 'neonLayer3Width', 'Szerokość warstwy 3', 0, 5, 1 )} <label class="ln-switch"> <input type="checkbox" data-key="neonInside" > <span> Świeć do środka </span> </label> <label class="ln-switch"> <input type="checkbox" data-key="neonOutside" > <span> Świeć na zewnątrz </span> </label> </div> </section>`;
    }

    function uiSection() {
        return `<section class="ln-section"> <div class="ln-section-head"> <span> RAMKI INTERFEJSU </span> <span> HUD </span> </div> <div class="ln-grid"> <label class="ln-switch ln-full"> <input type="checkbox" data-key="uiEnabled" > <span> Podświetlaj HUD </span> </label> <label class="ln-field"> <span class="ln-label"> Kolor bazowy z </span> <select data-key="uiColorSource" > <option value="outer"> Outer </option> <option value="loot"> Loot </option> <option value="item"> Item </option> <option value="custom"> Własny </option> </select> </label> <label class="ln-field"> <span class="ln-label"> Własny kolor </span> <input type="color" data-key="uiColor" > </label> <label class="ln-field ln-full"> <span class="ln-label"> Animacja </span> <select data-key="uiEffect" > ${effectOptions()} <option value="cascade"> Kaskada </option> <option value="lootWave"> Fala od łupu </option> </select> </label> <label class="ln-field"> <span class="ln-label"> Kierunek </span> <select data-key="uiDirection" > ${directionOptions()} </select> </label> <label class="ln-field"> <span class="ln-label"> Rdzeń klasyczny </span> <select data-key="uiCoreMode" > <option value="white"> Biały </option> <option value="original"> Oryginalny </option> <option value="neon"> Neonowy </option> </select> </label> ${rangeHtml( 'uiCoreOpacity', 'Widoczność rdzenia', 0.1, 1, 0.01 )} ${rangeHtml( 'uiGlowPower', 'Moc HUD', 0.1, 2, 0.05, '×' )} ${rangeHtml( 'uiWidth', 'Grubość', 1, 4, 1, ' px' )} ${rangeHtml( 'uiSpeed', 'Czas animacji', 0.5, 9, 0.05, ' s' )} ${rangeHtml( 'uiWaveSpan', 'Rozrzut fali', 0.1, 3, 0.05, ' s' )} </div> </section> <section class="ln-section"> <div class="ln-section-head"> <span> NAJDALSZA RAMKA </span> <span> SHELL </span> </div> <div class="ln-grid"> <label class="ln-switch ln-full"> <input type="checkbox" data-key="uiShellFrame" > <span> Zewnętrzny obrys UI </span> </label> ${rangeHtml( 'uiShellPadding', 'Globalne odsunięcie', -10, 14, 1, ' px' )} <div></div> ${rangeHtml( 'uiShellLeft', 'Lewa', -12, 12, 1, ' px' )} ${rangeHtml( 'uiShellRight', 'Prawa', -12, 12, 1, ' px' )} ${rangeHtml( 'uiShellTop', 'Góra', -12, 12, 1, ' px' )} ${rangeHtml( 'uiShellBottom', 'Dół', -12, 12, 1, ' px' )} </div> </section> <section class="ln-section"> <div class="ln-section-head"> <span> ELEMENTY HUD </span> <span> TARGETS </span> </div> <div class="ln-grid"> <label class="ln-switch"> <input type="checkbox" data-key="uiTopFrame"> <span>Górna belka</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiBottomFrame"> <span>Dolna belka</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiGameFrame"> <span>Pole gry</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiChatFrame"> <span>Chat</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiChatInnerLines"> <span>Linie chatu</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiRightFrame"> <span>Prawa kolumna</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiEquipmentFrame"> <span>Ekwipunek</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiInventoryFrame"> <span>Inventory</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiBattleFrame"> <span>Ramka walki</span> </label> </div> </section> <section class="ln-section"> <div class="ln-section-head"> <span> STRUCTURAL AUTO </span> <span> EXPERIMENTAL </span> </div> <div class="ln-grid"> <label class="ln-switch ln-full"> <input type="checkbox" data-key="uiStructuralAuto" > <span> Automatycznie wykrywaj duże ramki </span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiAutoBorder"> <span>Border</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiAutoOutline"> <span>Outline</span> </label> <label class="ln-switch"> <input type="checkbox" data-key="uiAutoShadow"> <span>Shadow</span> </label> <div></div> ${rangeHtml( 'uiAutoThreshold', 'Próg jasności', 35, 180, 1 )} ${rangeHtml( 'uiAutoNeutrality', 'Tolerancja szarości', 10, 130, 1 )} ${rangeHtml( 'uiAutoMinLength', 'Min. długość', 60, 400, 5, ' px' )} ${rangeHtml( 'uiAutoMaxTargets', 'Limit', 5, 50, 1 )} </div> </section>`;
    }

    function createPanel() {
        const panel = document.createElement('div');
        panel.id = IDS.panel;

        const generalTab = `
            <section class="ln-section">
                <div class="ln-section-head"><span>SYSTEM</span><span>CORE</span></div>
                <div class="ln-grid">
                    <label class="ln-switch">
                        <input type="checkbox" data-addon-enabled>
                        <span>Dodatek aktywny</span>
                    </label>
                    <div></div>

                    <label class="ln-field ln-full">
                        <span class="ln-label">Preset</span>
                        <div style="display:flex;gap:5px">
                            <select id="ln580-preset" style="flex:1">
                                <option value="referenceCyanTube">CYAN CLEAN</option>
                                <option value="referenceCyanStrong">CYAN STRONG</option>
                                <option value="referenceCyanBreathe">CYAN BREATHE</option>
                                <option value="referenceCyanOrbit">CYAN ORBIT</option>
                                <option value="referenceCyanScanner">CYAN SCANNER</option>
                                <option value="referencePink">PINK NEON</option>
                                <option value="cyberViolet">VIOLET NEON</option>
                                <option value="goldenLegend">GOLD NEON</option>
                                <option value="performance">PERFORMANCE</option>
                                <option value="minimal">MINIMAL</option>
                            </select>
                            <button class="ln-btn" data-action="preset">UŻYJ</button>
                        </div>
                    </label>
                </div>
            </section>

            <section class="ln-section">
                <div class="ln-section-head"><span>WYDAJNOŚĆ</span><span>PERFORMANCE</span></div>
                <div class="ln-grid">
                    <label class="ln-field ln-full">
                        <span class="ln-label">Tryb wydajności</span>
                        <select data-key="performanceMode">
                            <option value="eco">Oszczędny</option>
                            <option value="balanced">Zbalansowany</option>
                            <option value="quality">Jakość</option>
                        </select>
                    </label>

                    <label class="ln-switch ln-full">
                        <input type="checkbox" data-key="pauseWhenHidden">
                        <span>Wstrzymuj efekty w tle</span>
                    </label>

                    <label class="ln-switch ln-full">
                        <input type="checkbox" data-key="animationBaseLine">
                        <span>Stała rurka pod ruchomą animacją</span>
                    </label>

                    ${rangeHtml('animationBaseOpacity', 'Moc stałej rurki', 0, 0.8, 0.01)}
                </div>
            </section>`;

        const neonTab = `
            ${multiLayerSection()}
            <section class="ln-section">
                <div class="ln-section-head"><span>AMBIENT</span><span>SURFACE</span></div>
                <div class="ln-grid">
                    ${rangeHtml('ambientPower', 'Moc ambientu', 0, 0.6, 0.01)}
                    ${rangeHtml('ambientSpread', 'Zasięg ambientu', 6, 60, 1, ' px')}
                    <label class="ln-field ln-full">
                        <span class="ln-label">Zachowanie ambientu</span>
                        <select data-key="ambientMode">
                            <option value="static">Stały</option>
                            <option value="breathe">Oddychający</option>
                            <option value="pulse">Pulsujący</option>
                        </select>
                    </label>
                </div>
            </section>`;

        const outerTab = `
            ${targetSection('outer', 'GŁÓWNA RAMKA ŁUPÓW', 'Największa ramka okna Łupy.')}
            <section class="ln-section">
                <div class="ln-section-head"><span>DOPASOWANIE OUTER</span><span>PIXEL</span></div>
                <div class="ln-grid">
                    ${rangeHtml('outerLeft', 'Lewa', -12, 12, 1, ' px')}
                    ${rangeHtml('outerRight', 'Prawa', -12, 12, 1, ' px')}
                    ${rangeHtml('outerTop', 'Góra', -12, 12, 1, ' px')}
                    ${rangeHtml('outerBottom', 'Dół', -12, 12, 1, ' px')}
                </div>
            </section>`;

        const worldTab = `
            <section class="ln-section">
                <div class="ln-section-head"><span>OTOCZENIE</span><span>WORLD</span></div>
                <div class="ln-grid">
                    <label class="ln-switch">
                        <input type="checkbox" data-key="worldEnabled">
                        <span>Aura ekranu</span>
                    </label>
                    <label class="ln-field">
                        <span class="ln-label">Kolor</span>
                        <input type="color" data-key="worldColor">
                    </label>
                    ${rangeHtml('worldPower', 'Moc', 0, 0.4, 0.01)}
                </div>
            </section>`;

        const audioTab = `
            <section class="ln-section">
                <div class="ln-section-head"><span>DŹWIĘK</span><span>AUDIO</span></div>
                <div class="ln-grid">
                    <label class="ln-switch">
                        <input type="checkbox" data-key="mute">
                        <span>Wycisz</span>
                    </label>
                    <div></div>

                    <label class="ln-field ln-full">
                        <span class="ln-label">URL dźwięku</span>
                        <input type="url" data-key="customAudio" placeholder="https://...">
                    </label>

                    ${rangeHtml('fallbackDuration', 'Czas awaryjny', 1, 120, 1, ' s')}
                </div>
            </section>`;

        panel.innerHTML = `
            <div class="ln-panel-head">
                <div>
                    <div class="ln-panel-title">
                        LEGENDARY NOTIFICATOR
                        <span id="${IDS.status}" class="ln-status">AKTYWNY</span>
                    </div>
                    <div class="ln-panel-sub">v${VERSION} / MULTILAYER NEON ENGINE</div>
                </div>
                <button class="ln-panel-close" data-action="close">×</button>
            </div>

            <div class="ln-panel-body">
                <nav class="ln-tabs">
                    ${panelTabButton('general', 'OGÓLNE', 'preset / wydajność')}
                    ${panelTabButton('neon', 'NEON', 'warstwy / ambient')}
                    ${panelTabButton('outer', 'OKNO ŁUPÓW', 'zewnętrzna ramka')}
                    ${panelTabButton('loot', 'WNĘTRZE', 'loot-window')}
                    ${panelTabButton('card', 'KARTA', 'karta legendy')}
                    ${panelTabButton('item', 'LEGENDA', 'ikona przedmiotu')}
                    ${panelTabButton('confirm', 'POTWIERDŹ', 'przycisk')}
                    ${panelTabButton('canvas', 'CANVAS', 'pole gry')}
                    ${panelTabButton('hud', 'HUD', 'ramki interfejsu')}
                    ${panelTabButton('world', 'AURA EKRANU', 'otoczenie')}
                    ${panelTabButton('audio', 'DŹWIĘK', 'audio / timeout')}
                </nav>

                <div class="ln-tab-content">
                    ${panelTabPane('general', generalTab)}
                    ${panelTabPane('neon', neonTab)}
                    ${panelTabPane('outer', outerTab)}
                    ${panelTabPane('loot', targetSection('loot', 'WEWNĘTRZNE OKNO ŁUPÓW', '.loot-window'))}
                    ${panelTabPane('card', targetSection('card', 'KARTA PRZEDMIOTU', 'Ikona + Chcę + ✓ / ✕.'))}
                    ${panelTabPane('item', targetSection('item', 'IKONA LEGENDY', 'Bezpośrednia ramka itemu.'))}
                    ${panelTabPane('confirm', targetSection('confirm', 'PRZYCISK POTWIERDŹ', 'Domyślnie wyłączony.'))}
                    ${panelTabPane('canvas', canvasSection())}
                    ${panelTabPane('hud', uiSection())}
                    ${panelTabPane('world', worldTab)}
                    ${panelTabPane('audio', audioTab)}
                </div>
            </div>

            <div class="ln-panel-foot">
                <small>Legendary Notificator v${VERSION}</small>
                <div class="ln-actions">
                    <button class="ln-btn danger" data-action="reset">DOMYŚLNE</button>
                    <button class="ln-btn test" data-action="test">TESTUJ</button>
                    <button class="ln-btn" data-action="apply">ZASTOSUJ</button>
                    <button class="ln-btn" data-action="close">ZAMKNIJ</button>
                </div>
            </div>`;

        ctx.container.appendChild(panel);

        bindPanel(panel);

        setPanelTab(panel, ctx.storage.core.legendaryTab || 'general');

        fillForm();
        updateStatus();
    }

    function updateSettingFromInput(input) {
        if (!input?.dataset?.key) {
            return false;
        }

        const key = input.dataset.key;

        if (input.type === 'checkbox') {
            state.settings[key] = input.checked;
        } else if (input.type === 'range') {
            state.settings[key] = Number(input.value);
        } else {
            state.settings[key] = input.value;
        }

        return true;
    }

    function updateSingleRangeValue(input) {
        if ( !input || input.type !== 'range' || !input.dataset.key ) {
            return;
        }

        const panel = document.getElementById( IDS.panel );

        const output = panel?.querySelector( `[data-range-value="${input.dataset.key}"]` );

        if (!output) {
            return;
        }

        const step = Number(input.step);

        const decimals = step < 1 ? ( String(input.step) .split('.')[1] ?.length || 2 ) : 0;

        output.textContent = Number(input.value) .toFixed(decimals) + ( input.dataset.suffix || '' );
    }

    function fillForm() {
        const panel = document.getElementById( IDS.panel );

        if (!panel) {
            return;
        }

        panel.querySelectorAll( '[data-key]' ).forEach( input => {
                const key = input.dataset.key;

                if ( input.type === 'checkbox' ) {
                    input.checked = Boolean( state.settings[key] );
                } else {
                    input.value = state.settings[key] ?? '';
                }
            }
        );

        updateRangeValues();
    }

    function readForm() {
        const panel = document.getElementById( IDS.panel );

        if (!panel) {
            return;
        }

        panel.querySelectorAll( '[data-key]' ).forEach( input => {
                const key = input.dataset.key;

                if ( input.type === 'checkbox' ) {
                    state.settings[key] = input.checked;
                } else if ( input.type === 'range' ) {
                    state.settings[key] = Number( input.value );
                } else {
                    state.settings[key] = input.value;
                }
            }
        );
    }

    function updateRangeValues() {
        const panel = document.getElementById( IDS.panel );

        if (!panel) {
            return;
        }

        panel.querySelectorAll( 'input[type="range"]' ).forEach( input => {
                const output = panel.querySelector( `[data-range-value="${input.dataset.key}"]` );

                if (!output) {
                    return;
                }

                const step = Number(input.step);

                let decimals = 0;

                if (step < 1) {
                    decimals = String(input.step) .split('.')[1] ?.length || 2;
                }

                output.textContent = Number( input.value ).toFixed( decimals ) + ( input.dataset.suffix || '' );
            }
        );
    }

    function applyPreset(name) {
        if (!PRESETS[name]) {
            return false;
        }

        const keep = {
            mute: state.settings.mute,

            customAudio: state.settings.customAudio,

            fallbackDuration: state.settings.fallbackDuration

        };

        Object.assign(state.settings, {
            ...DEFAULTS, ...PRESETS[name], ...keep
        });

        saveSettings();

        fillForm();

        return true;
    }
    function updateStatus() {
        const panel = document.getElementById(IDS.panel);
        const enabled = panel?.querySelector('[data-addon-enabled]');
        if (enabled) enabled.checked = ctx.enabled;
        const test = panel?.querySelector('[data-action="test"]');
        if (test) test.disabled = !ctx.enabled;
    }

    function saveSettings() {
        ctx.changeSettings(state.settings);
    }

    function bindPanel(panel) {
        ctx.scheduler.listen(panel, 'click', event => {
            const tab = event.target.closest?.('[data-tab]');
            if (tab) {
                setPanelTab(panel, tab.dataset.tab, legendaryTab => ctx.storage.updateCore({ legendaryTab }));
                return;
            }
            const action = event.target.closest?.('[data-action]')?.dataset.action;
            if (action === 'close') ctx.ui.close();
            if (action === 'apply') { readForm(); saveSettings(); }
            if (action === 'test' && ctx.enabled) { readForm(); saveSettings(); runtime.testLoot(); }
            if (action === 'preset') applyPreset(panel.querySelector('#ln580-preset').value);
            if (action === 'reset') {
                const keep = { mute: state.settings.mute, customAudio: state.settings.customAudio };
                Object.assign(state.settings, DEFAULTS, keep);
                saveSettings();
                fillForm();
            }
        });
        ctx.scheduler.listen(panel, 'change', event => {
            if (event.target.matches('[data-addon-enabled]')) {
                ctx.setEnabled(event.target.checked);
                return;
            }
            if (updateSettingFromInput(event.target)) {
                updateSingleRangeValue(event.target);
                saveSettings();
            }
        });
        let previewTimer = 0;
        ctx.scheduler.listen(panel, 'input', event => {
            if (event.target.type !== 'range' || !updateSettingFromInput(event.target)) return;
            updateSingleRangeValue(event.target);
            ctx.scheduler.clearTimeout(previewTimer);
            previewTimer = ctx.scheduler.timeout(() => {
                if (state.active) runtime.rebuildEffects();
            }, 220);
        });
        ctx.events.on('addonChanged', event => {
            if (event.id === ctx.id) updateStatus();
        });
    }


    return { createPanel, fillForm, applyPreset };
}
