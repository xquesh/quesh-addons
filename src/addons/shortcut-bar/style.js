export const SHORTCUT_BAR_CSS = `
#qaddons-shortcut-bar{position:fixed;left:0;top:0;z-index:32010;display:flex;align-items:center;gap:2px;width:max-content;height:30px;box-sizing:border-box;padding:2px;border:1px solid #343a3e;background:#000b;color:#aaa;box-shadow:0 2px 8px #000;pointer-events:auto}
#qaddons-shortcut-bar[data-locked="true"]{border-color:#24292c}
#qaddons-shortcut-bar .qsb-grip{display:grid;place-items:center;flex:0 0 11px;width:11px;height:24px;padding:0;border:0;border-right:1px solid #343a3e;border-radius:0;background:transparent;color:#888;font:700 12px/24px Arial;cursor:move;touch-action:none;user-select:none}
#qaddons-shortcut-bar[data-locked="true"] .qsb-grip{color:#444;cursor:default}
#qaddons-shortcut-bar[data-show-handle="false"] .qsb-grip{display:none}
#qaddons-shortcut-bar>.qsb-addon-button{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;display:inline-grid!important;place-items:center!important;vertical-align:top!important;flex:0 0 30px!important;box-sizing:border-box!important;width:30px!important;height:24px!important;margin:0!important;padding:0!important;border-radius:0!important;font-size:9px!important}
#qaddons-shortcut-bar>.qsb-addon-button[hidden]{display:none!important}
#qaddons-shortcut-bar>.qsb-addon-button[data-qsb-hidden="true"]{display:none!important}
#qaddons-shortcut-bar>.qsb-addon-button[data-qsb-hidden="false"]{display:inline-grid!important}
#qaddons-shortcut-bar>.qsb-generated{border:1px solid #555;background:#050505;color:#ddd;cursor:pointer}
#qaddons-shortcut-bar>.qsb-generated:hover{border-color:#fff;color:#fff;box-shadow:0 0 7px rgba(255,255,255,.65)}
#qaddons-shortcut-bar>#qaddons-clan-online-button .qco-badge{right:1px;top:1px}
`;
