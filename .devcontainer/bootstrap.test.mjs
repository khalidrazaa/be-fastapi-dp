import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { bootstrap, frontendInstall, isInstallablePackage, pythonManifest } from './bootstrap.mjs';

const cache = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.cache');

function fixture(t, { checkouts = true } = {}) {
  const parent = join(cache, `bootstrap-test-${randomUUID()}`);
  mkdirSync(parent, { recursive: true });
  t.after(() => {
    const withinCache = relative(cache, resolve(parent));
    assert.ok(withinCache && withinCache !== '..' && !withinCache.startsWith(`..${sep}`));
    rmSync(parent, { recursive: true });
  });
  const root = join(parent, 'be-fastapi-dp');
  mkdirSync(root);
  if (checkouts) {
    for (const name of ['packages-dp', 'ui-nextjs-dp']) mkdirSync(join(parent, name, '.git'), { recursive: true });
    writeFileSync(join(parent, 'ui-nextjs-dp', 'package.json'), '{}');
    writeFileSync(join(parent, 'ui-nextjs-dp', 'bun.lock'), '{}');
  }
  const calls = [];
  const run = (command, args, options) => {
    calls.push({ command, args, ...options });
    if (command === 'uv' && args[0] === 'venv') mkdirSync(join(options.cwd, '.venv'));
    return { status: 0 };
  };
  return { root, parent, calls, run, log() {}, env: {} };
}

test('preserves existing checkouts, branches, and environment files on reruns', (t) => {
  const options = fixture(t);
  const marker = join(options.parent, 'packages-dp', '.git', 'HEAD');
  writeFileSync(marker, 'ref: refs/heads/my-work\n');
  const dotenv = join(options.root, '.env');
  writeFileSync(dotenv, 'PRIVATE=keep-me\n');
  bootstrap(options);
  bootstrap(options);
  assert.equal(readFileSync(marker, 'utf8'), 'ref: refs/heads/my-work\n');
  assert.equal(readFileSync(dotenv, 'utf8'), 'PRIVATE=keep-me\n');
  assert.equal(options.calls.filter((call) => call.command === 'git').length, 0);
  assert.equal(options.calls.filter((call) => call.command === 'uv' && call.args[0] === 'venv').length, 2);
  assert.equal(options.calls.filter((call) => call.command === 'bun').length, 2);
});

test('preflights all non-repository collisions without invoking commands', (t) => {
  const options = fixture(t, { checkouts: false });
  mkdirSync(join(options.parent, 'ui-nextjs-dp'));
  assert.throws(() => bootstrap(options), /not a Git checkout/);
  assert.equal(options.calls.length, 0);
});

test('clone uses literal argument arrays and honors refs only for missing repos', (t) => {
  const options = fixture(t, { checkouts: false });
  options.env = { PACKAGES_REPO_REF: 'feature; echo never-execute', UI_REPO_REF: 'release/v1' };
  const baseRun = options.run;
  options.run = (command, args, settings) => {
    if (command === 'git') {
      const target = args.at(-1);
      mkdirSync(join(target, '.git'), { recursive: true });
      if (target.endsWith('ui-nextjs-dp')) {
        writeFileSync(join(target, 'package.json'), '{}');
        writeFileSync(join(target, 'bun.lock'), '{}');
      }
    }
    return baseRun(command, args, settings);
  };
  bootstrap(options);
  const clones = options.calls.filter((call) => call.command === 'git');
  assert.deepEqual(clones[0].args, ['clone', '--branch', options.env.PACKAGES_REPO_REF, '--', 'https://github.com/khalidrazaa/packages-dp.git', join(options.parent, 'packages-dp')]);
  assert.equal(clones[1].args[2], 'release/v1');
  assert.ok(clones.every((call) => call.shell === false));
  assert.ok(!existsSync(join(options.parent, 'never-execute')));
});

test('locked Python projects sync before shared package installation into backend', (t) => {
  const options = fixture(t);
  const packages = join(options.parent, 'packages-dp');
  writeFileSync(join(packages, 'pyproject.toml'), '[build-system]\nrequires = ["setuptools"]\n');
  writeFileSync(join(packages, 'uv.lock'), 'version = 1\n');
  writeFileSync(join(options.root, 'pyproject.toml'), '[project]\nname = "backend"\n');
  bootstrap(options);
  assert.deepEqual(options.calls[0].args, ['sync', '--python', '3.12', '--locked']);
  assert.equal(options.calls[0].cwd, packages);
  assert.deepEqual(options.calls[1].args, ['sync', '--python', '3.12']);
  const editable = options.calls.findIndex((call) => call.args.includes('--editable'));
  assert.ok(editable > 1);
  assert.equal(options.calls[editable].args.at(-1), packages);
  assert.equal(options.calls[editable].cwd, options.root);
  assert.deepEqual(options.calls.at(-1).args, ['install', '--frozen-lockfile']);
});

test('requirements use a repository environment and empty scaffolds get no fabricated dependencies', (t) => {
  const options = fixture(t);
  writeFileSync(join(options.root, 'requirements-dev.txt'), 'ruff\n');
  writeFileSync(join(options.root, 'requirements.txt'), 'fastapi\n');
  bootstrap(options);
  const install = options.calls.find((call) => call.command === 'uv' && call.args[0] === 'pip');
  assert.deepEqual(install.args.slice(-4), ['--requirement', 'requirements.txt', '--requirement', 'requirements-dev.txt']);
  assert.equal(options.calls.filter((call) => call.args.includes('--editable')).length, 0);
  assert.equal(pythonManifest(join(options.parent, 'packages-dp')).kind, 'empty');
});

test('tool-only pyproject is not treated as an installable shared package', (t) => {
  const options = fixture(t);
  const packages = join(options.parent, 'packages-dp');
  writeFileSync(join(packages, 'pyproject.toml'), '[tool.ruff]\nline-length = 100\n');
  assert.equal(isInstallablePackage(packages), false);
  bootstrap(options);
  assert.equal(options.calls.some((call) => call.args[0] === 'sync'), false);
  assert.equal(options.calls.some((call) => call.args.includes('--editable')), false);
  writeFileSync(join(packages, 'setup.py'), 'from setuptools import setup\nsetup()\n');
  assert.equal(isInstallablePackage(packages), true);
});

test('frontend honors frozen Bun and npm lockfiles without choosing a new manager', (t) => {
  const options = fixture(t);
  const ui = join(options.parent, 'ui-nextjs-dp');
  assert.deepEqual(frontendInstall(ui), ['bun', ['install', '--frozen-lockfile']]);
  rmSync(join(ui, 'bun.lock'));
  writeFileSync(join(ui, 'package-lock.json'), '{}');
  assert.deepEqual(frontendInstall(ui), ['npm', ['ci']]);
});

test('clone failure is actionable and stops further setup without deleting partial work', (t) => {
  const options = fixture(t, { checkouts: false });
  options.run = (command, args) => {
    options.calls.push({ command, args });
    mkdirSync(args.at(-1), { recursive: true });
    return { status: 128 };
  };
  assert.throws(() => bootstrap(options), /Check Codespaces repository access/);
  assert.equal(options.calls.length, 1);
  assert.ok(existsSync(join(options.parent, 'packages-dp')));
});

test('dependency failure stops the setup and reports an actionable command error', (t) => {
  const options = fixture(t);
  const baseRun = options.run;
  options.run = (command, args, settings) => command === 'bun' ? { error: new Error('ENOENT') } : baseRun(command, args, settings);
  assert.throws(() => bootstrap(options), /Ensure it is installed and available on PATH/);
});
