import { bindDrag } from './controls.js';
import { installSettingsStyles } from './settings-styles.js';
import buttonIcon from '../../assets/quesh.png';
import { VERSION } from '../../version.js';
import { createUpdateChecker } from '../updates.js';

export function createPanel(settings, styles, scheduler, events) {
    let manager;
    let closeView = null;
    let currentView = 'addons';
    const style = styles.scope('core:panel');
    installSettingsStyles(style);
    style.set('panel', `
        #mtk-button, #mtk-panel { color:#d6dfe7; font:12px Consolas,monospace; z-index:2147483001; }
        #mtk-button { position:fixed; box-sizing:border-box; width:58px; height:58px; padding:3px; display:grid; place-items:center; border:1px solid #2b3943; border-radius:12px; background:#101820; cursor:grab; touch-action:none; }
        #mtk-button img { display:block; width:50px; height:50px; object-fit:contain; image-rendering:pixelated; pointer-events:none; user-select:none; }
        #mtk-panel { position:fixed; width:760px; height:570px; max-width:calc(100vw - 16px); max-height:calc(100vh - 16px); display:flex; flex-direction:column; border:1px solid #293640; border-radius:8px; background:#0c1218; box-shadow:0 20px 65px #000b; overflow:hidden; }
        #mtk-panel[hidden] { display:none; }
        #mtk-panel > header { display:flex; gap:10px; align-items:center; padding:10px; border-bottom:1px solid #293640; cursor:move; touch-action:none; }
        #mtk-panel header strong { flex:1; }
        #mtk-panel .mtk-version { margin-left:8px; color:#8997a2; font-size:11px; font-weight:normal; }
        #mtk-panel .mtk-update-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid #293640; }
        #mtk-panel .mtk-update-status { flex:1; display:flex; align-items:center; gap:8px; font-size:11px; }
        #mtk-panel .mtk-update-light { flex:0 0 8px; height:8px; border-radius:50%; background:#8997a2; }
        #mtk-panel [data-status="current"] .mtk-update-light { background:#45df87; box-shadow:0 0 8px #45df8780; }
        #mtk-panel [data-status="outdated"] .mtk-update-light { background:#ff5b67; box-shadow:0 0 8px #ff5b6780; }
        #mtk-panel [data-status="error"] .mtk-update-light { background:#e8b04d; }
        #mtk-panel [data-check-update]:disabled { opacity:.5; cursor:wait; }
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
    button.title = 'QADDONS';
    button.setAttribute('aria-label', 'Otwórz QADDONS');
    const icon = document.createElement('img');
    icon.src = buttonIcon;
    icon.alt = '';
    icon.draggable = false;
    button.append(icon);
    button.style.right = `${settings.data.core.buttonRight ?? 20}px`;
    button.style.top = `${settings.data.core.buttonTop ?? 120}px`;
    const panel = document.createElement('section');
    panel.id = 'mtk-panel';
    panel.hidden = true;
    panel.style.left = `${Math.max(0, Math.min(innerWidth - 60, settings.data.core.panelX))}px`;
    panel.style.top = `${Math.max(0, Math.min(innerHeight - 40, settings.data.core.panelY))}px`;
    panel.innerHTML = '<header><strong>QADDONS<span class="mtk-version"></span></strong><button class="ln-btn" data-view="addons">DODATKI</button><button class="ln-btn" data-close aria-label="Zamknij">×</button></header><div class="mtk-update-bar"><span class="mtk-update-status" role="status" aria-live="polite" data-status="checking"><span class="mtk-update-light" aria-hidden="true"></span><span data-update-text>Sprawdzanie wersji…</span></span><button class="ln-btn" data-check-update>Sprawdź aktualizacje</button></div><div id="mtk-content"></div>';
    panel.querySelector('.mtk-version').textContent = `v${VERSION}`;
    const updateStatus = panel.querySelector('.mtk-update-status');
    const updateText = panel.querySelector('[data-update-text]');
    const checkButton = panel.querySelector('[data-check-update]');
    const updates = createUpdateChecker(scheduler, ({ status, latestVersion }) => {
        updateStatus.dataset.status = status;
        checkButton.disabled = status === 'checking';
        updateText.textContent = {
            checking: 'Sprawdzanie wersji…',
            current: 'Masz aktualną wersję',
            outdated: `Dostępna v${latestVersion} — odśwież grę (Ctrl+F5)`,
            error: 'Nie udało się sprawdzić wersji. Spróbuj ponownie.'
        }[status];
    });
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
    scheduler.listen(checkButton, 'click', () => updates.check());
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
    updates.check();

    return {
        connect(addonManager) { manager = addonManager; }, open, close, openSettings, showAddons,
        destroy() { closeSettings(); scheduler.destroy(); button.remove(); panel.remove(); style.clear(); }
    };
}
