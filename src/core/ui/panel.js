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
        #mtk-button, #mtk-panel { color:#ddd; font:13px Arial,sans-serif; z-index:2147483001; }
        #mtk-button { position:relative; vertical-align:top; flex:0 0 44px; box-sizing:border-box; width:44px; height:44px; padding:3px; display:inline-grid; place-items:center; border:1px solid #444; border-radius:0; background:#050505; cursor:pointer; pointer-events:auto; touch-action:manipulation; transition:box-shadow .15s,border-color .15s; }
        #mtk-button:hover, #mtk-button:focus-visible { border-color:#bbb; box-shadow:0 0 12px #ffffff60; outline:none; }
        #mtk-button img { display:block; width:36px; height:36px; object-fit:contain; image-rendering:pixelated; pointer-events:none; user-select:none; }
        #mtk-panel { position:fixed; width:760px; height:570px; max-width:calc(100vw - 16px); max-height:calc(100vh - 16px); display:flex; flex-direction:column; border:1px solid #333; border-radius:0; background:#000; box-shadow:0 12px 40px #0009; overflow:hidden; }
        #mtk-panel[hidden] { display:none; }
        #mtk-panel > header { display:flex; gap:8px; align-items:center; padding:6px 8px; border-bottom:1px solid #292929; background:#080808; cursor:move; touch-action:none; }
        #mtk-panel header strong { flex:1; }
        #mtk-panel .mtk-version { margin-left:8px; color:#999; font-size:11px; font-weight:normal; }
        #mtk-panel .mtk-update-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #292929; background:#000; }
        #mtk-panel .mtk-update-status { flex:1; display:flex; align-items:center; gap:8px; font-size:11px; }
        #mtk-panel .mtk-update-light { flex:0 0 8px; height:8px; border-radius:50%; background:#999; }
        #mtk-panel [data-status="current"] .mtk-update-light { background:#45df87; box-shadow:0 0 8px #45df8780; }
        #mtk-panel [data-status="outdated"] .mtk-update-light { background:#ff5b67; box-shadow:0 0 8px #ff5b6780; }
        #mtk-panel [data-status="error"] .mtk-update-light { background:#e8b04d; }
        #mtk-panel [data-check-update]:disabled { opacity:.5; cursor:wait; }
        #mtk-panel button { cursor:pointer; }
        #mtk-content { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; }
        #mtk-panel .mtk-addon { margin:10px; padding:0 0 12px; border-bottom:1px solid #222; }
        #mtk-panel .mtk-addon > strong { display:block; padding:6px 9px; border:1px solid #292929; background:#101010; color:#eee; }
        #mtk-panel .mtk-addon p { margin:10px; color:#aaa; line-height:1.5; }
        #mtk-panel .mtk-addon > label { margin-left:10px; }
        #mtk-panel .mtk-addon button { margin-left:15px; }
        #mtk-panel .mtk-range { display:grid; grid-template-columns:1fr auto; gap:14px; padding:16px; }
        #mtk-panel .mtk-range input { grid-column:1/-1; width:100%; }
        #mtk-panel .mtk-enabled { display:block; padding:16px; }
        #mtk-legendary-settings { position:relative; left:auto; top:auto; width:100%; height:100%; max-width:none; max-height:none; display:flex; flex-direction:column; border:0; background:#000; box-shadow:none; }
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
    scheduler.listen(button, 'click', () => panel.hidden ? open() : close());
    scheduler.cleanup(events.on('addonChanged', () => {
        if (!panel.hidden && currentView === 'addons') showAddons();
    }));
    const buttonHostSelector = '.interface-layer .top.positioner .top-left.main-buttons-container, .positioner.top .top-left.main-buttons-container, .top-left.main-buttons-container';
    function mountButton() {
        const host = document.querySelector(buttonHostSelector);
        if (host && button.parentElement !== host) host.append(button);
    }
    document.body.append(panel);
    mountButton();
    const buttonHostObserver = scheduler.observer(MutationObserver, mountButton);
    buttonHostObserver.observe(document.body, { childList: true, subtree: true });
    updates.check();

    return {
        connect(addonManager) { manager = addonManager; }, open, close, openSettings, showAddons,
        destroy() { closeSettings(); scheduler.destroy(); button.remove(); panel.remove(); style.clear(); }
    };
}
