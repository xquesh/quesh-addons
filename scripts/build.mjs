import { build, context } from 'esbuild';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const options = {
    entryPoints: ['src/main.js'],
    outfile: 'dist/margonem-toolkit.js',
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: false,
    charset: 'utf8',
    loader: { '.png': 'dataurl' },
    legalComments: 'inline',
    logLevel: 'info',
    plugins: [{
        name: 'installer-and-syntax-check',
        setup(builder) {
            builder.onEnd(async result => {
                if (!result.errors.length) {
                    const header = await readFile('src/userscript-header.txt', 'utf8');
                    const loader = await readFile('src/installer.js', 'utf8');
                    await writeFile('dist/installer.user.js', `${header.trim()}\n\n${loader.trim()}\n`.replace(/\r\n/g, '\n'));
                    await rm('dist/margonem-toolkit.user.js', { force: true });
                    for (const file of [options.outfile, 'dist/installer.user.js']) {
                        execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
                    }
                    console.log('Runtime and installer syntax: OK');
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
