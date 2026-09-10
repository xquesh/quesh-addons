export const REMINDER_CSS = `
#qaddons-reminder-button{position:fixed;left:116px;bottom:68px;z-index:31000;width:32px;height:26px;border:1px solid #777;border-radius:0;background:#050505;color:#eee;font:700 9px Arial;cursor:pointer}
#qaddons-reminder-button:hover,#qaddons-reminder-button[data-alert="true"]{border-color:#fff;box-shadow:0 0 8px rgba(255,255,255,.75);color:#fff}
#qaddons-reminder-button[data-alert="true"]::after{content:"";position:absolute;right:2px;top:2px;width:5px;height:5px;background:#fff;box-shadow:0 0 5px #fff}
#qaddons-reminder{position:fixed;right:12px;bottom:92px;z-index:32000;width:300px;border:1px solid #777;background:#000;color:#ddd;font:12px/1.4 Arial;box-shadow:0 4px 18px rgba(0,0,0,.85)}
#qaddons-reminder[hidden]{display:none}
#qaddons-reminder .qrp-head{display:flex;align-items:center;justify-content:space-between;height:29px;padding:0 8px;border-bottom:1px solid #333;background:#0b0b0b;color:#fff;font-weight:700}
#qaddons-reminder .qrp-close{width:24px;height:22px;padding:0;border:0;background:transparent;color:#ddd;font-size:17px;cursor:pointer}
#qaddons-reminder .qrp-close:hover{color:#fff;text-shadow:0 0 6px #fff}
#qaddons-reminder .qrp-body{padding:5px 8px 8px}
#qaddons-reminder .qrp-row{padding:7px 2px;border-bottom:1px solid #252525}
#qaddons-reminder .qrp-row:last-child{border-bottom:0}
#qaddons-reminder .qrp-row strong{display:block;color:#fff;margin-bottom:2px}
#qaddons-reminder .qrp-row p{margin:0 0 6px;color:#aaa}
#qaddons-reminder .qrp-actions{display:flex;gap:5px;flex-wrap:wrap}
#qaddons-reminder button[data-action]{border:1px solid #555;border-radius:0;background:#111;color:#ddd;padding:4px 7px;font:11px Arial;cursor:pointer}
#qaddons-reminder button[data-action]:hover{border-color:#aaa;color:#fff;background:#1b1b1b}
#qaddons-reminder button[data-danger="true"]{border-color:#8d3737;color:#ffb0b0}
#qaddons-reminder .qrp-error{color:#ff8f8f}
`;
