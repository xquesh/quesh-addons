export const barStyle = `
#qaddons-relogger{position:fixed;z-index:2147482990;display:flex;align-items:center;gap:3px;width:max-content;max-width:calc(100vw - 8px);height:var(--qr-height,52px);color:#ddd;background:transparent;border:0;box-shadow:none;font:10px Arial,sans-serif;}
#qaddons-relogger *{box-sizing:border-box;}
#qaddons-relogger header{display:flex;align-items:center;gap:2px;flex:none;}
#qaddons-relogger header strong,#qaddons-relogger [data-refresh],#qaddons-relogger .qr-status{display:none;}
#qaddons-relogger[data-notice="true"] .qr-status{display:block;position:absolute;bottom:100%;right:0;width:240px;padding:5px;border:1px solid #444;background:#080808;font-size:10px;}
#qaddons-relogger button,#qaddons-relogger select{border:1px solid #343a3e;border-radius:0;background:#0009;color:#ddd;font:10px Arial,sans-serif;cursor:pointer;padding:0;}
#qaddons-relogger button:hover,#qaddons-relogger select:hover{border-color:#aaa;background:#151515;}
#qaddons-relogger button:focus-visible,#qaddons-relogger select:focus-visible{outline:1px solid #fff;outline-offset:1px;}
#qaddons-relogger button:disabled{cursor:default;opacity:.5;}
#qaddons-relogger [data-world-toggle]{display:grid;place-items:center;width:22px;height:22px;}
#qaddons-relogger .qr-world-menu{position:absolute;bottom:calc(100% + 6px);left:0;min-width:120px;max-height:220px;overflow:auto;padding:4px;border:1px solid #444;background:#080808;box-shadow:0 3px 12px #0008;}
#qaddons-relogger .qr-world-menu button{display:block;width:100%;padding:6px 9px;text-align:left;font-size:12px;}
#qaddons-relogger .qr-world-menu [aria-pressed="true"]{color:#fff;border-color:#aaa;}
#qaddons-relogger .qr-body{min-width:0;}
#qaddons-relogger .qr-cards{display:flex;gap:2px;max-width:340px;overflow-x:auto;scrollbar-width:none;}
#qaddons-relogger .qr-cards::-webkit-scrollbar{display:none;}
#qaddons-relogger .qr-card{flex:0 0 36px;width:36px;height:var(--qr-height,52px);position:relative;overflow:hidden;border:1px solid #343a3e;border-bottom:2px solid #454545;}
#qaddons-relogger .qr-portrait{position:absolute;left:50%;top:50%;width:32px;height:48px;transform:translate(-50%,-50%) scale(var(--qr-portrait-scale,1));background-position:0 0;background-repeat:no-repeat;text-align:center;line-height:44px;font-size:26px;color:#aaa;}
#qaddons-relogger .qr-nick,#qaddons-relogger .qr-level{display:none;}
#qaddons-relogger .qr-card[data-state="window"]{border-bottom-color:#deb358;box-shadow:inset 0 -8px 10px -8px #deb358;}
#qaddons-relogger .qr-card[data-state="due"]{border-bottom-color:#6ddb9a;box-shadow:inset 0 -8px 10px -7px #6ddb9a;}
#qaddons-relogger .qr-card[aria-current="true"]{border-top-color:#eee;}
#qaddons-relogger .qr-details{position:absolute;bottom:calc(100% + 6px);right:0;width:260px;max-width:calc(100vw - 12px);padding:7px 9px;border:1px solid #444;background:#080808;font:11px/1.5 Arial;max-height:170px;overflow:auto;white-space:pre-line;box-shadow:0 3px 12px #0008;}
#qaddons-relogger [hidden]{display:none!important;}
`;
