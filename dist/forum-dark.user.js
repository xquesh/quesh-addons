// ==UserScript==
// @name         QADDONS — Ciemne forum Margonem
// @namespace    quesh.addons
// @version      1.0.3
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
        body { background-color:#090909 !important; color:#d9dde3 !important; }
        body::before { content:""; position:fixed; inset:0; pointer-events:none; z-index:-1; background:radial-gradient(ellipse at 50% -15%,#21152f38,transparent 56%),linear-gradient(120deg,#050505,#0d0b10 55%,#050505); }
        .logo { box-shadow:0 14px 38px #0009; }
        .logo img { opacity:.88; filter:brightness(.82) contrast(1.08) saturate(.75); }
        #paper, #paper > tbody > tr > td, #mainbox { background:#0c0c0d !important; color:#d9dde3 !important; }
        #paper { border-color:#302b35 !important; box-shadow:0 18px 44px #0008; }
        #footer { background:#080a0d !important; color:#7f8996 !important; }
        #forum { color:#d9dde3; }
        #forum h1, #forum h2, #forum h3, #forum h4 { color:#f2f5f8 !important; text-shadow:none !important; }
        #forum h2 { padding:12px 14px; margin:0 0 12px; border-left:3px solid #b752d6; background:linear-gradient(90deg,#24172d,#0c0c0d); font-size:18px; }
        #forum .ncatg, #forum .topics, #posts { border-color:#343039 !important; }
        #forum .ncatg > tbody > tr > td, #forum .topics > tbody > tr > td, #posts > tbody > tr > td { border-color:#343039 !important; color:#d9dde3 !important; }
        #forum .ncatg > tbody > tr:hover > td, #forum .topics > tbody > tr:hover > td { background:#201827 !important; }
        #forum .ncatbar, #forum .catbar, #forum .topics th { color:#f4f1f6 !important; background:#271b30 !important; border:1px solid #574264 !important; font-size:13px !important; height:36px !important; }
        #forum .topics .sticky, #forum .sticky { background:#2a2615 !important; }
        #forum .topics .topname { text-align:left; }
        #forum .topics small, #forum small { color:#91a0af !important; }
        #forum a, #posts a { color:#71df45 !important; text-decoration:none !important; }
        #forum a:hover, #posts a:hover { color:#d2ff7a !important; text-decoration:underline !important; }
        #forum .msg, #paper h4 { margin:14px 0 !important; padding:12px 14px !important; border:1px solid #a88a3c !important; background:#2b2515 !important; color:#ffe6a3 !important; }
        #posts td.puser, #posts td.postid, #posts td.pns, #posts td.smg, #posts td.zsp, #posts td.mod, #posts td.system { border-color:#39313f !important; background:#151217 !important; color:#e1e7ed !important; }
        #posts td.puser, #posts td.postid { background-image:none !important; }
        #posts td.pcont { border-color:#39313f !important; background:#0e0e10 !important; color:#d8dde3 !important; line-height:1.5; }
        #posts td.pbar { border-color:#39313f !important; background:#171319 !important; color:#a9a0ac !important; }
        #posts .nickwood, #posts h3 { background:#26192e !important; color:#f3edf6 !important; }
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
        /* Avatar jest arkuszem klatek — jego kontener 32×48 wycina jedną postać. */
        #forum .pavatar_new a img { max-width:none !important; width:auto !important; height:auto !important; }
        #forum img.pavatar { width:32px !important; height:48px !important; max-width:none !important; }
    `;

    const style = document.createElement('style');
    style.id = 'qaddons-forum-dark-theme';
    style.textContent = css;
    (document.head || document.documentElement).append(style);
})();
