export function installSettingsStyles(styles) {
    styles.set('settings', `#mtk-panel { --ln-ui-accent: #49dfca; --ln-ui-border: #293640; --ln-ui-text: #d6dfe7; } /* ========================================================= CONFIG BUTTON ========================================================= */ #mtk-unused-button { position: fixed; width: 58px; height: 58px; right: 20px; top: 120px; z-index: 2147483000; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid #2b3943; border-radius: 12px; background: linear-gradient( 180deg, #151e25, #070b0f ); box-shadow: 0 10px 30px rgba(0,0,0,.75), inset 0 1px rgba(255,255,255,.04); color: #4ce2cb; font: 800 16px Consolas, monospace; cursor: grab; user-select: none; } #mtk-unused-button small { margin-top: 2px; color: #70808a; font-size: 7px; } /* ========================================================= PANEL ========================================================= */ #mtk-legendary-settings { position: fixed; left: 70px; top: 55px; width: 510px; height: 535px; max-width: calc(100vw - 16px); max-height: calc(100vh - 16px); z-index: 2147483001; display: none; flex-direction: column; overflow: hidden; border: 1px solid #293640; border-radius: 8px; background: linear-gradient( 180deg, #111820, #070a0e ); box-shadow: 0 20px 65px rgba(0,0,0,.82); color: var(--ln-ui-text); font: 10px Consolas, monospace; } #mtk-legendary-settings.visible { display: flex; } .ln-panel-head { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 9px 11px; border-bottom: 1px solid #293640; background: #0c1218; cursor: move; user-select: none; } .ln-panel-title { font-size: 13px; font-weight: 700; } .ln-panel-sub { margin-top: 2px; color: #6f7e89; font-size: 8px; } .ln-status { display: inline-block; margin-left: 8px; padding: 3px 6px; border: 1px solid rgba(73,223,202,.3); border-radius: 4px; color: #85e7d8; font-size: 8px; } .ln-status.off { color: #ff8492; border-color: rgba(255,132,146,.3); } .ln-panel-close, .ln-btn { border: 1px solid #2c3943; border-radius: 4px; background: #10171d; color: #b5bec7; font: 9px Consolas, monospace; cursor: pointer; } .ln-panel-close { width: 28px; height: 28px; } .ln-panel-body { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 9px; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #35444f #080c10; } .ln-section { margin-bottom: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,.065); border-radius: 6px; background: rgba(0,0,0,.20); } .ln-section-head { display: flex; align-items: center; justify-content: space-between; padding: 7px 9px; border-bottom: 1px solid rgba(255,255,255,.055); background: rgba(255,255,255,.018); color: #bdc7cf; font-weight: 700; } .ln-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 12px; padding: 9px; } .ln-full { grid-column: 1 / -1; } .ln-field, .ln-range { display: flex; flex-direction: column; gap: 5px; } .ln-label { color: #bbc5ce; font-weight: 600; } .ln-help { color: #6f7e89; font-size: 8px; line-height: 1.5; } .ln-switch { min-height: 28px; display: flex; align-items: center; gap: 7px; } .ln-switch input { width: 15px; height: 15px; accent-color: #49dfca; } #mtk-legendary-settings select, #mtk-legendary-settings input[type="url"] { box-sizing: border-box; width: 100%; height: 31px; padding: 4px 6px; border: 1px solid #26323d; border-radius: 4px; outline: none; background: #080c10; color: #d4dde5; font: 10px Consolas, monospace; } #mtk-legendary-settings input[type="color"] { box-sizing: border-box; width: 100%; height: 31px; padding: 2px; border: 1px solid #26323d; border-radius: 4px; background: #080c10; } #mtk-legendary-settings input[type="range"] { width: 100%; accent-color: #49dfca; } .ln-range-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; } .ln-range-value { min-width: 54px; padding: 2px 5px; border: 1px solid rgba(73,223,202,.15); border-radius: 3px; color: #7ce5d5; text-align: center; font-size: 8px; } .ln-panel-foot { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 7px 8px; border-top: 1px solid #293640; background: #0c1218; } .ln-panel-foot small { color: #64727d; } .ln-actions { display: flex; gap: 4px; } .ln-btn { height: 28px; padding: 0 8px; } .ln-btn.test { color: #7be5d6; border-color: rgba(73,223,202,.35); } .ln-btn.danger { color: #dc8b94; } /* ========================================================= FX ========================================================= */ /* =========================================================
   TABBED CONFIG PANEL
========================================================= */
#mtk-legendary-settings {
    width: 760px;
    height: 570px;
}
.ln-panel-body {
    display: flex;
    flex: 1;
    min-height: 0;
    padding: 0;
    overflow: hidden;
}
.ln-tabs {
    flex: 0 0 150px;
    min-width: 150px;
    padding: 8px 6px;
    overflow-y: auto;
    overflow-x: hidden;
    border-right: 1px solid #293640;
    background: #0a1015;
    scrollbar-width: thin;
    scrollbar-color: #35444f #080c10;
}
.ln-tab-button {
    width: 100%;
    min-height: 34px;
    margin: 0 0 5px;
    padding: 7px 8px;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    color: #8997a2;
    font: 9px Consolas, monospace;
    text-align: left;
    cursor: pointer;
    transition: background .12s ease, border-color .12s ease, color .12s ease;
}
.ln-tab-button:hover {
    background: rgba(255,255,255,.035);
    color: #cbd5dd;
}
.ln-tab-button.active {
    border-color: rgba(73,223,202,.28);
    background: rgba(73,223,202,.075);
    color: #7fe8d8;
}
.ln-tab-button small {
    display: block;
    margin-top: 2px;
    color: #5f6d77;
    font-size: 7px;
    pointer-events: none;
}
.ln-tab-button.active small {
    color: #6ca99f;
}
.ln-tab-content {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
}
.ln-tab-pane {
    display: none;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 9px;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: #35444f #080c10;
}
.ln-tab-pane.active {
    display: block;
}
.ln-tab-pane > .ln-section:last-child {
    margin-bottom: 0;
}
@media (max-width: 760px) {
    #mtk-legendary-settings {
        width: calc(100vw - 16px);
    `);
}
