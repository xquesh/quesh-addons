export const GARBAGE_TRUCK_CSS = `
#qaddons-garbage-truck-button{position:fixed;left:8px;bottom:68px;z-index:31000;width:32px;height:26px;border:1px solid #666;border-radius:0;background:#050505;color:#ddd;font:700 9px Arial;cursor:pointer}
#qaddons-garbage-truck-button:hover{border-color:#fff;color:#fff;box-shadow:0 0 8px #fff8}
#qaddons-garbage-truck{position:fixed;z-index:33020;width:286px;border:1px solid #777;background:#000;color:#ddd;box-shadow:0 5px 22px #000;font:11px Arial}
#qaddons-garbage-truck[hidden]{display:none}
#qaddons-garbage-truck .qgt-head{display:flex;align-items:center;justify-content:space-between;height:27px;padding:0 7px;border-bottom:1px solid #555;font-weight:700}
#qaddons-garbage-truck .qgt-head button{border:0;background:none;color:#ddd;font-size:15px;cursor:pointer}
#qaddons-garbage-truck .qgt-body{padding:7px}.qgt-list{display:grid;gap:3px;max-height:190px;overflow:auto;margin:6px 0}
#qaddons-garbage-truck .qgt-row{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;min-height:34px;border:1px solid #333;background:#0b0b0b;padding:2px}
#qaddons-garbage-truck .qgt-icon{width:30px;height:30px;display:grid;place-items:center;border:1px solid #444;background:#111;color:#999;font-size:9px}
#qaddons-garbage-truck .qgt-actions{display:flex;gap:5px}.qgt-actions button{flex:1;height:25px;border:1px solid #666;border-radius:0;background:#0b0b0b;color:#eee;font:700 10px Arial;cursor:pointer}
#qaddons-garbage-truck .qgt-actions button:hover{border-color:#fff}.qgt-actions button:disabled{opacity:.45;cursor:default}
.qgt-drop{min-height:45px;border:1px dashed #666;padding:6px;text-align:center;color:#aaa}.qgt-drop[data-dragging="true"]{border-color:#fff;box-shadow:inset 0 0 8px #fff4}
.qgt-marked{display:grid;gap:3px;margin-top:5px}.qgt-marked-row{display:flex;justify-content:space-between;align-items:center;border:1px solid #333;padding:4px 6px}.qgt-marked-row button{border:0;background:none;color:#ddd;cursor:pointer}
`;
