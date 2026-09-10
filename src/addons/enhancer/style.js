export const enhancerStyle = `
#qaddons-enhancer-toggle{position:fixed;left:44px;bottom:68px;z-index:31000;width:30px;height:26px;border:1px solid #777;border-radius:0;background:#050505;color:#eee;font:700 10px Arial;cursor:pointer}
#qaddons-enhancer-toggle:hover{border-color:#fff;box-shadow:0 0 8px rgba(255,255,255,.75)}
#qaddons-enhancer{position:fixed;left:84px;bottom:68px;z-index:31010;width:340px;border:1px solid #858585;background:#050505;color:#ddd;font:12px Arial;box-shadow:0 5px 20px #000}
#qaddons-enhancer[hidden]{display:none}#qaddons-enhancer *{box-sizing:border-box}
#qaddons-enhancer header{height:27px;padding:0 7px;border-bottom:1px solid #444;display:flex;align-items:center;justify-content:space-between;background:#0b0b0b;color:#fff;font-weight:700;cursor:move}
#qaddons-enhancer header button{border:0;background:none;color:#ddd;font-size:17px;cursor:pointer}
#qaddons-enhancer .qe-body{padding:8px}.qe-toolbar,.qe-slots,.qe-actions{display:flex;gap:5px;align-items:center}.qe-toolbar{justify-content:space-between;margin-bottom:7px}
#qaddons-enhancer button,#qaddons-enhancer select{border:1px solid #555;border-radius:0;background:#0b0b0b;color:#eee;min-height:25px;font:11px Arial}
#qaddons-enhancer button:hover{border-color:#fff}.qe-state[data-active="true"]{color:#7dff9b;border-color:#7dff9b}.qe-slots{align-items:stretch;flex-wrap:wrap}
.qe-slot{position:relative;flex:1 1 96px;min-width:96px;min-height:54px;padding:5px;border:1px solid #555;background:#090909;color:#bbb;text-align:left;overflow:hidden}
.qe-slot strong,.qe-slot small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.qe-slot strong{color:#fff;margin:4px 0}.qe-slot[data-filled="true"]{border-color:#aaa}.qe-slot[data-picking="true"]{outline:1px solid #fff;box-shadow:0 0 8px #fff}
.qe-progress{height:8px;margin:8px 0 4px;border:1px solid #555;background:#000}.qe-progress span{display:block;height:100%;width:0;background:#eee}.qe-meta{display:flex;justify-content:space-between;color:#aaa;font-size:11px}.qe-actions{margin-top:7px}.qe-actions button{flex:1}.qe-status{min-height:30px;margin:7px 0 0;padding-top:6px;border-top:1px solid #333;color:#bbb;line-height:15px}
.qaddons-enhancer-buffer{outline:1px solid #fff!important;box-shadow:0 0 7px rgba(255,255,255,.8)!important}
`;
