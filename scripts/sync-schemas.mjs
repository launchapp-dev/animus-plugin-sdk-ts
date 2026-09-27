import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const sdkRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: { 'protocol-root': { type: 'string' }, ref: { type: 'string' } },
});
if (!values['protocol-root'] || !values.ref) {
  throw new Error('Usage: npm run schemas:sync -- --protocol-root <checkout> --ref <tag-or-commit>');
}
const protocolRoot = resolve(values['protocol-root']);
const git = (...args) => execFileSync('git', ['-C', protocolRoot, ...args], { encoding: 'utf8' }).trim();
const commit = git('rev-parse', '--verify', `${values.ref}^{commit}`);
if (git('rev-parse', 'HEAD') !== commit) {
  throw new Error('Protocol checkout HEAD must match --ref; use a dedicated worktree for that revision.');
}
if (git('status', '--porcelain', '--untracked-files=all', '--', '*.rs', 'Cargo.toml', '**/Cargo.toml', '.cargo')) {
  throw new Error('Protocol source has local changes; export from a clean source revision.');
}
const metadata = JSON.parse(execFileSync('cargo', ['metadata', '--no-deps', '--format-version=1'], {
  cwd: protocolRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
}));
const exporters = metadata.packages
  .filter((pkg) => metadata.workspace_members.includes(pkg.id))
  .flatMap((pkg) => pkg.targets
    .filter((target) => target.kind.includes('bin') && target.name === `${pkg.name}-export-schema`)
    .map((target) => ({ crate: pkg.name, bin: target.name })))
  .sort((a, b) => a.crate.localeCompare(b.crate));
if (exporters.length === 0) throw new Error('No Rust schema exporters found.');

const staging = mkdtempSync(join(tmpdir(), 'animus-schema-sync-'));
try {
  for (const exporter of exporters) {
    const out = join(staging, exporter.crate);
    execFileSync('cargo', ['run', '--quiet', '-p', exporter.crate, '--bin', exporter.bin, '--', '--out', out], {
      cwd: protocolRoot, stdio: 'inherit',
    });
    const bundle = JSON.parse(readFileSync(join(out, '_all.json'), 'utf8'));
    if (!bundle.$defs || Object.keys(bundle.$defs).length === 0) {
      throw new Error(`Missing definitions in ${exporter.crate}`);
    }
  }
  for (const exporter of exporters) {
    const target = join(sdkRoot, 'schemas', exporter.crate);
    mkdirSync(target, { recursive: true });
    copyFileSync(join(staging, exporter.crate, '_all.json'), join(target, '_all.json'));
  }
  writeFileSync(join(sdkRoot, 'schemas', 'source.json'), `${JSON.stringify({
    repository: 'https://github.com/launchapp-dev/animus-protocol',
    ref: values.ref,
    commit,
    crates: exporters.map((exporter) => exporter.crate),
  }, null, 2)}\n`);
  execFileSync(process.execPath, [join(sdkRoot, 'scripts', 'codegen.mjs')], { cwd: sdkRoot, stdio: 'inherit' });
} finally {
  rmSync(staging, { recursive: true, force: true });
}
