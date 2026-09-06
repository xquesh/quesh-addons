import { build, context } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const options = {
    entryPoints: ['src/main.js'],
    outfile: 'dist/margonem-toolkit.user.js',
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: false,
    charset: 'utf8',
    legalComments: 'inline',
    banner: { js: (await readFile('src/userscript-header.txt', 'utf8')).replace(/\r\n/g, '\n').trim() },
    logLevel: 'info',
    plugins: [{
        name: 'syntax-check',
        setup(builder) {
            builder.onEnd(result => {
                if (!result.errors.length) {
                    execFileSync(process.execPath, ['--check', options.outfile], { stdio: 'inherit' });
                    console.log('Userscript syntax: OK');
                }
            });
        }
    }]
};

if (process.argv.includes('--watch')) {
    const watcher = await context(options);
    await watcher.watch();
} else {
    await build(options);
}
