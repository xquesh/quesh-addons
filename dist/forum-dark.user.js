// ==UserScript==
// @name         QADDONS — Ciemne forum Margonem
// @namespace    quesh.addons
// @version      1.0.0
// @description  Ciemny, czytelny motyw forum Margonem.
// @match        https://forum.margonem.pl/*
// @match        http://forum.margonem.pl/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const css = `
        :root { color-scheme: dark; }
        html, body { min-height: 100%; background:#090b0e !important; color:#d9dde3 !important; }
        body { margin:0 !important; font-family:Inter,Segoe UI,Arial,sans-serif !important; }
        body::before { content:""; position:fixed; inset:0; pointer-events:none; z-index:-1; background:radial-gradient(ellipse at 50% -15%,#21152f38,transparent 56%),linear-gradient(120deg,#050505,#0d0b10 55%,#050505); }
        body > img, #side-left, #ornlu, #ornld, #ornru, #ornrd, #esflores, #esflores2 { display:none !important; }
        .main { width:min(1220px,100%) !important; margin:0 auto !important; height:auto !important; font-family:inherit !important; }
        .main .ver, .main .hor, .main .tver { display:none !important; }
        .main > tbody > tr > td { background:transparent !important; }
        .logo { background:#090909 !important; border:1px solid #302b35; border-top:0; box-shadow:0 14px 38px #0009; }
        .logo img { max-width:100%; height:auto !important; opacity:.88; filter:brightness(.82) contrast(1.08) saturate(.75); }
        #paper, #paper > tbody > tr > td, #mainbox { background:#0c0c0d !important; color:#d9dde3 !important; }
        #paper { min-height:100vh; border:1px solid #302b35 !important; border-top:0 !important; box-shadow:0 18px 44px #0008; }
        #paper > tbody > tr > td:first-child, #paper > tbody > tr > td:last-child { width:0 !important; padding:0 !important; background:none !important; }
        #mainbox { padding:20px !important; }
        #footer { width:min(1220px,100%) !important; margin:0 auto; padding:13px; height:auto !important; background:#080a0d !important; color:#7f8996 !important; }
        #forum { max-width:1120px; margin:0 auto; color:#d9dde3; }
        #forum h1, #forum h2, #forum h3, #forum h4 { color:#f2f5f8 !important; text-shadow:none !important; }
        #forum h2 { padding:12px 14px; margin:0 0 12px; border-left:3px solid #b752d6; background:linear-gradient(90deg,#24172d,#0c0c0d); font-size:18px; }
        #forum .ncatg, #forum .topics, #posts { width:100% !important; border-collapse:separate !important; border-spacing:0 5px !important; table-layout:auto !important; }
        #forum .ncatg td, #forum .topics td, #posts td { border:1px solid #343039 !important; background:#121214 !important; color:#d9dde3 !important; }
        #forum .ncatg tr:hover td, #forum .topics tr:hover td { background:#201827 !important; }
        #forum .ncatbar, #forum .catbar, #forum .topics th { color:#f4f1f6 !important; background:#271b30 !important; border:1px solid #574264 !important; font-size:13px !important; height:36px !important; }
        #forum .ncatg td { padding:12px !important; }
        #forum .topics td { padding:9px 10px !important; border-width:1px 0 1px 1px !important; }
        #forum .topics td:last-child { border-right-width:1px !important; }
        #forum .topics .sticky, #forum .sticky { background:#2a2615 !important; }
        #forum .topics .topname { text-align:left; }
        #forum .topics small, #forum small { color:#91a0af !important; }
        #forum a, #posts a { color:#71df45 !important; text-decoration:none !important; }
        #forum a:hover, #posts a:hover { color:#d2ff7a !important; text-decoration:underline !important; }
        #forum .msg, #paper h4 { margin:14px 0 !important; padding:12px 14px !important; border:1px solid #a88a3c !important; background:#2b2515 !important; color:#ffe6a3 !important; }
        #posts { border-collapse:separate !important; border-spacing:0 10px !important; }
        #posts tr { box-shadow:0 5px 14px #0004; }
        #posts td.puser, #posts td.postid, #posts td.pns, #posts td.smg, #posts td.zsp, #posts td.mod, #posts td.system { width:138px !important; border-color:#39313f !important; background:#151217 !important; color:#e1e7ed !important; }
        #posts td.puser, #posts td.postid { background-image:none !important; }
        #posts td.pcont { border-color:#39313f !important; background:#0e0e10 !important; color:#d8dde3 !important; line-height:1.5; }
        #posts td.pbar { border-color:#39313f !important; background:#171319 !important; color:#a9a0ac !important; }
        #posts .nickwood, #posts h3 { width:auto !important; background:#26192e !important; color:#f3edf6 !important; }
        #posts .puser center, #posts table.repbar { width:100% !important; background:#1b1520 !important; }
        #posts .sepbar { height:0 !important; background:none !important; }
        .pavatar { border:1px solid #55435e; background:#080808; }
        blockquote { width:auto !important; margin:12px 4px !important; padding:12px !important; border:1px solid #584365 !important; border-left:3px solid #b752d6 !important; background:#18131d !important; color:#d5cbd9 !important; }
        code, pre { padding:10px !important; border:1px solid #3b3340 !important; background:#070708 !important; color:#e4d7ff !important; white-space:pre-wrap !important; overflow:auto; }
        input, textarea, select { border:1px solid #493c50 !important; border-radius:2px; background:#0a0a0b !important; color:#e5ebf0 !important; padding:6px 8px !important; }
        textarea { min-height:120px; line-height:1.45; }
        input:focus, textarea:focus, select:focus { outline:1px solid #b752d6; border-color:#b752d6 !important; }
        button, input[type="submit"], input[type="button"], .but { border:1px solid #634273 !important; border-radius:2px; background:linear-gradient(#2a1e31,#171119) !important; color:#f3edf6 !important; padding:6px 12px !important; cursor:pointer; }
        button:hover, input[type="submit"]:hover, input[type="button"]:hover, .but:hover { background:#40244d !important; border-color:#d168ec !important; }
        #alert, #ajaxWait, #msgbox, #vote, #pollview { border-color:#60436b !important; background:#141015 !important; color:#e8e1eb !important; box-shadow:0 14px 38px #000b; }
        #alert h3, #pollview h3, .topmsg, .topmsg_good { background:#2c1b34 !important; color:#f7f1f9 !important; border-color:#825695 !important; }
        .rules, #forum .rules { border-color:#465563 !important; background:#1a222b !important; color:#d8e0e7 !important; }
        #tip { border-color:#674b73 !important; background:#110f13 !important; color:#ece6ef !important; box-shadow:0 9px 24px #000b; }
        #tip.item { background:#22180f !important; border-color:#916a35 !important; }
        #bans, #bans td, #bans th, #artlist, #artlist td, #artlist th, #polllist, #polllist td, #polllist th, #menulist, #menulist td, #menulist th { border-color:#344250 !important; color:#dbe3ea !important; background:#161d24 !important; }
        #bans tr, #bans tr:hover { background:#1b222a !important; color:#dbe3ea !important; }
        #forum img, .pcont img { max-width:100%; height:auto; }
        @media (max-width:720px) {
            #mainbox { padding:10px !important; }
            #posts td.puser, #posts td.postid, #posts td.pns, #posts td.smg, #posts td.zsp, #posts td.mod, #posts td.system { width:86px !important; font-size:10px; }
            #forum .topics td { padding:7px 5px !important; font-size:12px; }
        }
    `;

    const style = document.createElement('style');
    style.id = 'qaddons-forum-dark-theme';
    style.textContent = css;
    (document.head || document.documentElement).append(style);
})();
