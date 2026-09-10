export const barStyle = `
#qaddons-relogger{position:fixed;z-index:2147482990;width:510px;max-width:calc(100vw - 16px);color:#ddd;background:#050505;border:1px solid #444;box-shadow:0 5px 20px #0008;font:12px Arial,sans-serif;}
#qaddons-relogger *{box-sizing:border-box;}
#qaddons-relogger header{display:flex;align-items:center;gap:6px;padding:5px 7px;background:#101010;border-bottom:1px solid #333;cursor:move;touch-action:none;}
#qaddons-relogger header strong{font-size:11px;letter-spacing:1px;margin-right:auto;}
#qaddons-relogger button,#qaddons-relogger select{border:1px solid #444;border-radius:0;background:#080808;color:#ddd;font:12px Arial,sans-serif;cursor:pointer;padding:4px 6px;}
#qaddons-relogger button:hover,#qaddons-relogger select:hover{border-color:#aaa;background:#1a1a1a;}
#qaddons-relogger button:focus-visible,#qaddons-relogger select:focus-visible{outline:1px solid #fff;outline-offset:1px;}
#qaddons-relogger button:disabled{cursor:default;opacity:.5;}
#qaddons-relogger select{max-width:150px;}
#qaddons-relogger .qr-cards{display:flex;gap:5px;padding:7px;overflow-x:auto;scrollbar-width:thin;scrollbar-color:#555 #080808;}
#qaddons-relogger .qr-card{flex:0 0 117px;display:grid;grid-template-columns:32px minmax(0,1fr);gap:2px 5px;position:relative;min-height:65px;padding:5px;border-bottom:2px solid #454545;text-align:left;}
#qaddons-relogger .qr-portrait{width:32px;height:48px;grid-row:1/4;background-position:0 0;background-repeat:no-repeat;background-color:#151515;text-align:center;line-height:48px;font-size:22px;color:#999;}
#qaddons-relogger .qr-nick{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:bold;font-size:11px;}
#qaddons-relogger .qr-level{font-size:10px;color:#aaa;}
#qaddons-relogger .qr-time{font-size:10px;white-space:nowrap;}
#qaddons-relogger .qr-card[data-state="window"]{border-bottom-color:#deb358;box-shadow:inset 0 -9px 13px -11px #deb358;}
#qaddons-relogger .qr-card[data-state="window"] .qr-time{color:#deb358;}
#qaddons-relogger .qr-card[data-state="due"]{border-bottom-color:#6ddb9a;box-shadow:inset 0 -9px 13px -10px #6ddb9a;}
#qaddons-relogger .qr-card[data-state="due"] .qr-time{color:#6ddb9a;}
#qaddons-relogger .qr-card[aria-current="true"]{border-top-color:#eee;}
#qaddons-relogger .qr-card[aria-current="true"] .qr-level::after{content:' · TERAZ';font-size:8px;color:#eee;}
#qaddons-relogger[data-compact="true"] .qr-card{flex-basis:83px;}
#qaddons-relogger[data-compact="true"] .qr-nick{display:none;}
#qaddons-relogger[data-compact="true"] .qr-time{grid-column:1/-1;text-align:center;}
#qaddons-relogger[data-compact="true"] .qr-portrait{grid-row:1/3;}
#qaddons-relogger .qr-status{font-size:10px;color:#999;padding:0 8px 6px;}
#qaddons-relogger .qr-details{margin:0 7px 7px;padding:6px 8px;border:1px solid #333;background:#0b0b0b;font-size:11px;max-height:140px;overflow:auto;white-space:pre-line;line-height:1.5;}
#qaddons-relogger [hidden]{display:none!important;}
`;
