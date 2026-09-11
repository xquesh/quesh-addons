export const enhancerStyle = `
#qaddons-enhancer-toggle{position:fixed;left:44px;bottom:68px;z-index:31000;width:30px;height:26px;border:1px solid #777;border-radius:0;background:#050505;color:#eee;font:700 10px Arial;cursor:pointer}
#qaddons-enhancer-toggle:hover{border-color:#fff;box-shadow:0 0 8px rgba(255,255,255,.75)}
#qaddons-enhancer{position:fixed;left:84px;bottom:68px;z-index:31010;width:220px;border:1px solid #858585;background:#050505;color:#ddd;font:10px Arial;box-shadow:0 4px 14px #000}
#qaddons-enhancer[hidden]{display:none}#qaddons-enhancer *{box-sizing:border-box}
#qaddons-enhancer header{height:22px;padding:0 6px;border-bottom:1px solid #444;display:flex;align-items:center;justify-content:space-between;background:#0b0b0b;color:#fff;font-size:10px;font-weight:700;cursor:move}
#qaddons-enhancer header button{width:18px;height:18px;min-height:0!important;padding:0;border:0;background:none;color:#ddd;font-size:14px;line-height:16px;cursor:pointer}
#qaddons-enhancer .qe-body{padding:4px}.qe-toolbar,.qe-slots,.qe-actions{display:flex;gap:3px;align-items:center}.qe-toolbar{justify-content:space-between;margin-bottom:3px}
#qaddons-enhancer button,#qaddons-enhancer select{border:1px solid #555;border-radius:0;background:#0b0b0b;color:#eee;min-height:21px;padding:2px 6px;font:9px Arial}
#qaddons-enhancer button:hover{border-color:#fff}.qe-state[data-active="true"]{color:#7dff9b;border-color:#7dff9b}.qe-slots{justify-content:center;align-items:center;flex-wrap:nowrap}
.qe-slot{position:relative;flex:0 0 36px;width:36px;min-width:36px;height:36px;min-height:36px;padding:1px;border:1px dashed #666;background:#090909;color:#777;text-align:center;overflow:visible;font:bold 15px Arial!important}
.qe-slot[data-filled="true"]{border-color:#aaa;color:transparent}.qe-slot[data-picking="true"]{outline:1px solid #fff;box-shadow:0 0 8px #fff}
.qe-item-preview{position:relative;display:block;width:32px;height:32px;margin:0;pointer-events:none}.qe-item-preview>.qe-item-image{position:relative!important;inset:auto!important;display:block!important;width:32px!important;height:32px!important;margin:0!important;opacity:1!important;visibility:visible!important;transform:none!important}
.qe-slots[data-dragging="true"] .qe-slot{border-color:#aaa;background:#111}.qe-slot[data-drop="true"]{border-style:solid!important;border-color:#fff!important;background:#1a1a1a!important;box-shadow:0 0 9px rgba(255,255,255,.7)}
.qe-progress{height:4px;margin:3px 0 2px;border:1px solid #555;background:#000}.qe-progress span{display:block;height:100%;width:0;background:#eee}.qe-meta{display:flex;justify-content:space-between;color:#aaa;font-size:9px;line-height:10px}.qe-actions{margin-top:3px}.qe-actions button{flex:1;padding-left:2px;padding-right:2px;white-space:nowrap}.qe-status{min-height:0;margin:3px 0 0;padding-top:3px;border-top:1px solid #333;color:#bbb;font-size:9px;line-height:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qaddons-enhancer-buffer{outline:1px solid #fff!important;box-shadow:0 0 7px rgba(255,255,255,.8)!important}
`;
