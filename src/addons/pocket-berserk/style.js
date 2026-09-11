export const POCKET_BERSERK_CSS = `
#qaddons-pocket-berserk{position:absolute;left:var(--qpb-x,82%);bottom:3px;transform:translateX(-50%);z-index:31000;box-sizing:border-box;width:30px;height:26px;padding:0;border:1px solid #666;border-radius:0;background:#050505;color:#888;font:700 10px Arial;cursor:pointer;pointer-events:auto}
#qaddons-pocket-berserk[data-fallback="true"]{position:fixed;bottom:68px}
#qaddons-pocket-berserk:hover{border-color:#fff;color:#fff;box-shadow:0 0 8px rgba(255,255,255,.72)}
#qaddons-pocket-berserk[data-enabled="true"]{color:#fff;border-color:#aaa;text-shadow:0 0 5px #fff;box-shadow:0 0 7px rgba(255,255,255,.45)}
#qaddons-pocket-berserk[data-ready="false"]{opacity:.55;cursor:wait}
#qaddons-pocket-berserk[hidden]{display:none!important}
.qpb-status{margin:6px 0 10px;padding:7px 9px;border:1px solid #444;background:#080808;color:#aaa}
.qpb-status[data-enabled="true"]{border-color:#888;color:#fff;box-shadow:inset 3px 0 #fff}
.qpb-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.qpb-mode{border:1px solid #444;background:#050505;padding:8px}
.qpb-mode h3{margin:0 0 7px;color:#fff;font:700 12px Arial}
.qpb-mode .ln-switch{margin:5px 0}
.qpb-levels{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
.qpb-levels label{display:grid;gap:3px;color:#aaa;font-size:10px}
.qpb-levels input{box-sizing:border-box;width:100%;height:25px;border:1px solid #555;border-radius:0;background:#0a0a0a;color:#fff;padding:3px 5px}
@media(max-width:560px){.qpb-columns{grid-template-columns:1fr}}
`;
