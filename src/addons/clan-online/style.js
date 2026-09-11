export const CLAN_ONLINE_CSS = `
#qaddons-clan-online-button{position:relative;display:inline-grid;place-items:center;vertical-align:top;box-sizing:border-box;width:44px;height:44px;padding:0;border:1px solid #555;border-radius:0;background:#050505;color:#eee;font:700 10px Arial;cursor:pointer}
#qaddons-clan-online-button:hover{border-color:#fff;color:#fff;box-shadow:0 0 8px rgba(255,255,255,.72)}
#qaddons-clan-online-button[hidden]{display:none!important}
#qaddons-clan-online-button .qco-badge{position:absolute;right:2px;top:2px;min-width:12px;height:12px;padding:0 2px;box-sizing:border-box;background:#111;border:1px solid #777;color:#fff;font:700 8px/10px Arial}
#qaddons-clan-online{position:fixed;z-index:32000;box-sizing:border-box;width:370px;max-width:calc(100vw - 12px);height:310px;max-height:calc(100vh - 12px);min-width:250px;min-height:145px;display:flex;flex-direction:column;overflow:hidden;resize:both;border:1px solid #777;background:#000;color:#ddd;box-shadow:0 5px 20px rgba(0,0,0,.9);font:11px/1.25 Arial}
#qaddons-clan-online[hidden]{display:none}
#qaddons-clan-online .qco-head{height:29px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 9px;border-bottom:1px solid #333;background:#090909;color:#fff;font-weight:700;cursor:move;user-select:none}
#qaddons-clan-online .qco-head button{width:23px;height:22px;padding:0;border:0;background:transparent;color:#bbb;font-size:17px;cursor:pointer}
#qaddons-clan-online .qco-head button:hover{color:#fff;text-shadow:0 0 6px #fff}
#qaddons-clan-online .qco-tools{display:grid;grid-template-columns:minmax(0,1fr) 128px 27px;gap:4px;padding:5px;border-bottom:1px solid #292929}
#qaddons-clan-online input,#qaddons-clan-online select{box-sizing:border-box;height:24px;min-width:0;border:1px solid #444;border-radius:0;background:#090909;color:#ddd;padding:2px 5px;font:11px Arial;outline:0}
#qaddons-clan-online input:focus,#qaddons-clan-online select:focus{border-color:#aaa}
#qaddons-clan-online .qco-refresh{height:24px;border:1px solid #555;border-radius:0;background:#111;color:#ddd;cursor:pointer}
#qaddons-clan-online .qco-refresh:hover{border-color:#aaa;color:#fff}
#qaddons-clan-online .qco-list{min-height:0;flex:1;overflow:auto;padding:3px 5px 5px}
#qaddons-clan-online .qco-row{position:relative;display:grid;grid-template-columns:minmax(105px,1fr) minmax(110px,1.25fr) 25px;align-items:center;min-height:22px;border-bottom:1px solid #252525;font-size:var(--qco-font-size,11px)}
#qaddons-clan-online .qco-row:hover{background:#111}
#qaddons-clan-online .qco-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-weight:700}
#qaddons-clan-online .qco-level{color:#aaa;font-weight:400}
#qaddons-clan-online .qco-location{min-width:0;text-align:right;color:#bbb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#qaddons-clan-online[data-wrap="true"] .qco-location{white-space:normal;overflow-wrap:anywhere}
#qaddons-clan-online .qco-invite{justify-self:end;width:20px;height:18px;padding:0;border:1px solid #555;border-radius:0;background:#0b0b0b;color:#ddd;font:700 12px Arial;cursor:pointer}
#qaddons-clan-online .qco-invite:hover{border-color:#fff;color:#fff;box-shadow:0 0 5px rgba(255,255,255,.5)}
#qaddons-clan-online .qco-invite:disabled{opacity:.35;cursor:default;box-shadow:none}
#qaddons-clan-online .qco-empty{padding:18px 8px;text-align:center;color:#999}
#qaddons-clan-online .qco-foot{height:23px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 7px;border-top:1px solid #292929;color:#888;font-size:10px}
`;
