import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(join(tmpdir(), 'margonem-toolkit-browser-'));
const processHandle = spawn(browser, [
    '--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${profile}`, '--allow-file-access-from-files',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--remote-debugging-port=0', '--window-size=1200,900', 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
let browserError = '';
processHandle.stderr.on('data', chunk => { browserError = (browserError + chunk).slice(-8000); });
processHandle.on('error', error => { browserError = error.message; });
const delay = milliseconds => new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds));
const deadline = Date.now() + 35000;
let socket;
let command;
try {
    let port;
    while (!port && Date.now() < deadline) {
        try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
        catch { await delay(100); }
        if (processHandle.exitCode !== null) throw new Error(browserError);
    }
    if (!port) throw new Error(browserError || 'Chrome startup timeout');
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolveOpen, rejectOpen) => {
        socket.addEventListener('open', resolveOpen, { once: true });
        socket.addEventListener('error', rejectOpen, { once: true });
    });
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
        const response = JSON.parse(event.data);
        if (!pending.has(response.id)) return;
        const handler = pending.get(response.id);
        pending.delete(response.id);
        if (response.error) handler.reject(new Error(response.error.message));
        else handler.resolve(response.result);
    });
    command = (method, params = {}) => new Promise((resolveCommand, rejectCommand) => {
        const id = ++sequence;
        pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
        socket.send(JSON.stringify({ id, method, params }));
    });
    await command('Page.bringToFront');
    await command('Page.navigate', { url: pathToFileURL(resolve('scripts/browser-sanity.html')).href });
    let summary = '';
    while (Date.now() < deadline) {
        await delay(100);
        const result = await command('Runtime.evaluate', { expression: 'document.getElementById("result")?.textContent' });
        summary = result.result?.value || '';
        if (/^(PASS|FAIL):/.test(summary)) break;
    }
    if (!summary.startsWith('PASS:')) throw new Error(summary || 'Browser sanity timeout');
    console.log(summary);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    if (command && socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ id: 999999, method: 'Browser.close' }));
        socket.close();
    } else processHandle.kill();
}
