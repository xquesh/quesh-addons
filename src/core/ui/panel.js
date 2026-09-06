import { bindDrag } from './controls.js';
import { installSettingsStyles } from './settings-styles.js';

export function createPanel(settings, styles, scheduler, events) {
    let manager;
    let closeView = null;
    let currentView = 'addons';
    const style = styles.scope('core:panel');
    installSettingsStyles(style);
    style.set('panel', `
        #mtk-button, #mtk-panel { color:#d6dfe7; font:12px Consolas,monospace; z-index:2147483001; }
        #mtk-button { position:fixed; width:58px; height:58px; border:1px solid #2b3943; border-radius:12px; background:#101820; color:#4ce2cb; cursor:grab; touch-action:none; }
        #mtk-panel { position:fixed; width:760px; height:570px; max-width:calc(100vw - 16px); max-height:calc(100vh - 16px); display:flex; flex-direction:column; border:1px solid #293640; border-radius:8px; background:#0c1218; box-shadow:0 20px 65px #000b; overflow:hidden; }
        #mtk-panel[hidden] { display:none; }
        #mtk-panel > header { display:flex; gap:10px; align-items:center; padding:10px; border-bottom:1px solid #293640; cursor:move; touch-action:none; }
        #mtk-panel header strong { flex:1; }
        #mtk-panel button { cursor:pointer; }
        #mtk-content { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; }
        .mtk-addon { margin:12px; padding:14px; border:1px solid #293640; border-radius:6px; }
        .mtk-addon p { color:#8997a2; line-height:1.6; }
        .mtk-addon button { margin-left:15px; }
        #mtk-panel input[type=checkbox], #mtk-panel input[type=range] { accent-color:#49dfca; }
        .mtk-range { display:grid; grid-template-columns:1fr auto; gap:14px; padding:20px; }
        .mtk-range input { grid-column:1/-1; width:100%; }
        #mtk-panel .mtk-enabled { display:block; padding:20px; }
        #mtk-legendary-settings { position:relative; left:auto; top:auto; width:100%; height:100%; max-width:none; max-height:none; display:flex; border:0; box-shadow:none; }
        #mtk-legendary-settings .ln-panel-head { display:none; }
    `);
    const button = document.createElement('button');
    button.id = 'mtk-button';
    button.textContent = 'MTK';
    button.title = 'Margonem Toolkit';
    button.style.right = `${settings.data.core.buttonRight ?? 20}px`;
    button.style.top = `${settings.data.core.buttonTop ?? 120}px`;
    const panel = document.createElement('section');
    panel.id = 'mtk-panel';
    panel.hidden = true;
    panel.style.left = `${Math.max(0, Math.min(innerWidth - 60, settings.data.core.panelX))}px`;
    panel.style.top = `${Math.max(0, Math.min(innerHeight - 40, settings.data.core.panelY))}px`;
    panel.innerHTML = '<header><strong>MARGONEM TOOLKIT</strong><button class="ln-btn" data-view="addons">DODATKI</button><button class="ln-btn" data-close aria-label="Zamknij">×</button></header><div id="mtk-content"></div>';
    const content = panel.querySelector('#mtk-content');

    function closeSettings() {
        closeView?.();
        closeView = null;
        content.replaceChildren();
    }

    function showAddons() {
        closeSettings();
        currentView = 'addons';
        settings.updateCore({ lastView: currentView });
        for (const addon of manager.list()) {
            const row = document.createElement('article');
            row.className = 'mtk-addon';
            const title = document.createElement('strong');
            title.textContent = addon.name;
            const description = document.createElement('p');
            description.textContent = addon.description;
            const label = document.createElement('label');
            const enabled = document.createElement('input');
            enabled.type = 'checkbox';
            enabled.checked = addon.enabled;
            enabled.onchange = () => manager.setEnabled(addon.id, enabled.checked);
            label.append(enabled, addon.enabled ? ' WŁĄCZONY' : ' WYŁĄCZONY');
            const configure = document.createElement('button');
            configure.className = 'ln-btn';
            configure.textContent = 'USTAWIENIA';
            configure.onclick = () => openSettings(addon.id);
            row.append(title, description, label, configure);
            content.append(row);
        }
    }

    function openSettings(id) {
        closeSettings();
        currentView = id;
        settings.updateCore({ lastView: id });
        panel.hidden = false;
        closeView = manager.renderSettings(id, content);
    }

    function close() {
        panel.hidden = true;
        closeSettings();
        currentView = 'addons';
    }

    function open() {
        panel.hidden = false;
        showAddons();
    }

    scheduler.listen(panel.querySelector('[data-view]'), 'click', showAddons);
    scheduler.listen(panel.querySelector('[data-close]'), 'click', close);
    scheduler.listen(panel, 'wheel', event => {
        const scroller = event.target.closest('.ln-tabs') || panel.querySelector('.ln-tab-pane.active') || content;
        scroller.scrollTop += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientHeight : 1);
        event.preventDefault();
        event.stopPropagation();
    }, { capture: true, passive: false });
    bindDrag(panel, panel.querySelector('header'), scheduler,
        (panelX, panelY) => settings.updateCore({ panelX, panelY }));
    bindDrag(button, button, scheduler,
        (panelX, panelY) => settings.updateCore({ buttonRight: innerWidth - panelX - 58, buttonTop: panelY }),
        { button: true, click: () => panel.hidden ? open() : close() });
    scheduler.cleanup(events.on('addonChanged', () => {
        if (!panel.hidden && currentView === 'addons') showAddons();
    }));
    document.body.append(button, panel);

    return {
        connect(addonManager) { manager = addonManager; }, open, close, openSettings, showAddons,
        destroy() { closeSettings(); scheduler.destroy(); button.remove(); panel.remove(); style.clear(); }
    };
}
