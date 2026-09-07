export function installSettingsStyles(styles) {
    styles.set('settings', `
        #mtk-panel { color-scheme:dark; --ln-ui-accent:#eee; --ln-ui-border:#333; --ln-ui-text:#ddd; }
        #mtk-panel *, #mtk-panel *::before, #mtk-panel *::after { box-sizing:border-box; }
        #mtk-panel button, #mtk-panel input, #mtk-panel select { font:inherit; }
        #mtk-panel .ln-btn, #mtk-panel .ln-panel-close {
            min-height:28px; padding:4px 10px; border:1px solid #333; border-radius:0;
            background:#080808; color:#ddd; font:12px Arial,sans-serif; cursor:pointer;
        }
        #mtk-panel button:hover:not(:disabled) { background:#202020; border-color:#777; color:#fff; }
        #mtk-panel button:focus-visible, #mtk-panel input:focus-visible, #mtk-panel select:focus-visible {
            outline:1px solid #fff; outline-offset:2px;
        }
        #mtk-panel button:disabled { opacity:.45; cursor:default; }
        #mtk-panel input[type="checkbox"] {
            appearance:none; display:inline-grid; place-content:center; flex:0 0 15px;
            width:15px; height:15px; margin:0 7px 0 0; vertical-align:middle;
            border:1px solid #454545; border-radius:0; background:#000; cursor:pointer;
        }
        #mtk-panel input[type="checkbox"]:checked::after { content:'✓'; color:#fff; font:bold 13px Arial,sans-serif; }
        #mtk-panel input[type="range"] { width:100%; accent-color:#ccc; }
        #mtk-panel select, #mtk-panel input[type="url"], #mtk-panel input[type="text"], #mtk-panel input[type="number"] {
            width:100%; min-width:0; height:30px; padding:4px 6px; border:1px solid #333;
            border-radius:0; background:#080808; color:#eee; font:12px Arial,sans-serif;
        }
        #mtk-panel input[type="color"] { width:100%; height:30px; padding:2px; border:1px solid #333; border-radius:0; background:#080808; }
        #mtk-panel .ln-panel-head { display:none; }
        #mtk-panel .ln-panel-body { display:flex; flex:1; min-height:0; padding:0; overflow:hidden; }
        #mtk-panel .ln-tabs {
            flex:0 0 150px; min-width:0; padding:6px; overflow-y:auto; overflow-x:hidden;
            border-right:1px solid #292929; background:#000;
        }
        #mtk-panel .ln-tab-button {
            display:block; width:100%; min-height:34px; margin:0 0 3px; padding:7px 8px;
            border:1px solid transparent; border-radius:0; background:#000; color:#999;
            font:12px Arial,sans-serif; text-align:left; cursor:pointer;
        }
        #mtk-panel .ln-tab-button.active { border-color:#444; background:#171717; color:#fff; }
        #mtk-panel .ln-tab-button small { display:block; margin-top:3px; color:#888; font-size:10px; pointer-events:none; }
        #mtk-panel .ln-tab-content { position:relative; flex:1; min-width:0; min-height:0; overflow:hidden; }
        #mtk-panel .ln-tab-pane {
            display:none; width:100%; height:100%; padding:10px; overflow-y:auto;
            overflow-x:hidden; overscroll-behavior:contain; background:#000;
        }
        #mtk-panel .ln-tab-pane.active { display:block; }
        #mtk-panel .ln-section { margin:0 0 12px; border:1px solid #292929; border-radius:0; background:#000; }
        #mtk-panel .ln-section-head {
            display:flex; align-items:center; justify-content:space-between; gap:8px;
            padding:6px 9px; border-bottom:1px solid #292929; background:#101010; color:#eee; font-weight:bold;
        }
        #mtk-panel .ln-section-head > :last-child:not(:first-child) { color:#888; font-size:10px; font-weight:normal; }
        #mtk-panel .ln-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:12px; padding:10px; }
        #mtk-panel .ln-full { grid-column:1 / -1; }
        #mtk-panel .ln-field, #mtk-panel .ln-range { display:flex; flex-direction:column; min-width:0; gap:6px; }
        #mtk-panel .ln-label { color:#ddd; font-weight:normal; }
        #mtk-panel .ln-help { color:#999; font-size:11px; line-height:1.5; }
        #mtk-panel .ln-switch { display:flex; align-items:center; gap:0; min-height:26px; color:#ccc; }
        #mtk-panel .ln-range-top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
        #mtk-panel .ln-range-value { padding:2px 5px; border:1px solid #333; color:#eee; font-size:11px; white-space:nowrap; }
        #mtk-panel .ln-panel-foot {
            display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between;
            gap:8px; padding:7px 10px; border-top:1px solid #292929; background:#080808;
        }
        #mtk-panel .ln-panel-foot small { color:#999; font-size:11px; }
        #mtk-panel .ln-actions { display:flex; gap:5px; }
        #mtk-panel .ln-status { margin-left:8px; padding:2px 5px; border:1px solid #555; border-radius:0; color:#eee; font-size:11px; }
        #mtk-panel .ln-status.off { color:#999; border-color:#333; }
        #mtk-panel .mtk-addon-settings { padding:10px; line-height:1.6; }
        #mtk-panel .mtk-addon-settings h2 { margin:0 0 10px; padding:6px 9px; border:1px solid #292929; background:#101010; color:#eee; font-size:13px; }
        #mtk-panel .mtk-addon-settings p { padding:0 10px; color:#bbb; }
        #mtk-panel .mtk-addon-settings .mtk-enabled { padding:8px 10px; }
        #mtk-panel ::-webkit-scrollbar { width:7px; height:7px; }
        #mtk-panel ::-webkit-scrollbar-track { background:#050505; }
        #mtk-panel ::-webkit-scrollbar-thumb { background:#555; border:1px solid #080808; }
        #mtk-panel .ln-tabs, #mtk-panel .ln-tab-pane, #mtk-content { scrollbar-width:thin; scrollbar-color:#555 #050505; }
        @media (max-width:600px) {
            #mtk-panel .ln-tabs { flex-basis:112px; }
            #mtk-panel .ln-grid { grid-template-columns:minmax(0,1fr); }
            #mtk-panel .ln-panel-foot small { display:none; }
        }
    `);
}
