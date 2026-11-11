import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositories = [
  { name: 'packages-dp', refVariable: 'PACKAGES_REPO_REF' },
  { name: 'ui-nextjs-dp', refVariable: 'UI_REPO_REF' },
];

function execute(run, env, command, args, cwd) {
  let result;
  try {
    result = run(command, args, { cwd, env, stdio: 'inherit', shell: false });
  } catch (error) {
    throw new Error(`Could not run ${command}: ${error.message}`, { cause: error });
  }
  if (result?.error) {
    throw new Error(`Could not run ${command}. Ensure it is installed and available on PATH.`, { cause: result.error });
  }
  if (result?.status !== 0) {
    throw new Error(`${command} failed (exit ${result?.status ?? 'unknown'}). Check the output above.`);
  }
}

export function pythonManifest(directory) {
  if (existsSync(join(directory, 'uv.lock'))) return { kind: 'uv-lock' };
  const pyproject = join(directory, 'pyproject.toml');
  if (existsSync(pyproject)
    && /^\s*\[(?:project|build-system|tool\.poetry)\]\s*(?:#.*)?$/m.test(readFileSync(pyproject, 'utf8'))) {
    return { kind: 'pyproject' };
  }
  const requirements = readdirSync(directory)
    .filter((name) => /^requirements(?:[-_.][\w.-]+)?\.txt$/.test(name))
    .sort((a, b) => (a === 'requirements.txt' ? -1 : b === 'requirements.txt' ? 1 : a.localeCompare(b)));
  return requirements.length ? { kind: 'requirements', files: requirements } : { kind: 'empty' };
}

export function isInstallablePackage(directory) {
  if (existsSync(join(directory, 'setup.py'))) return true;
  const path = join(directory, 'pyproject.toml');
  return existsSync(path) && /^\s*\[build-system\]\s*(?:#.*)?$/m.test(readFileSync(path, 'utf8'));
}

export function frontendInstall(directory) {
  const packagePath = join(directory, 'package.json');
  if (!existsSync(packagePath)) throw new Error('ui-nextjs-dp has no package.json; add the frontend manifest before running setup.');
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'));
  const declared = manifest.packageManager?.split('@')[0];
  if (declared && !['bun', 'npm', 'pnpm', 'yarn'].includes(declared)) {
    throw new Error(`Unsupported frontend package manager: ${declared}. Configure its install command explicitly.`);
  }
  if (existsSync(join(directory, 'bun.lock')) || existsSync(join(directory, 'bun.lockb'))) {
    return ['bun', ['install', '--frozen-lockfile']];
  }
  if (existsSync(join(directory, 'pnpm-lock.yaml'))) return ['pnpm', ['install', '--frozen-lockfile']];
  if (existsSync(join(directory, 'package-lock.json')) || existsSync(join(directory, 'npm-shrinkwrap.json'))) return ['npm', ['ci']];
  if (existsSync(join(directory, 'yarn.lock'))) {
    const classic = manifest.packageManager?.startsWith('yarn@1.')
      || readFileSync(join(directory, 'yarn.lock'), 'utf8').includes('# yarn lockfile v1');
    return ['yarn', ['install', classic ? '--frozen-lockfile' : '--immutable']];
  }
  return [declared || 'npm', ['install']];
}

export function bootstrap({ root = defaultRoot, run = spawnSync, env = process.env, log = console.log } = {}) {
  root = resolve(root);
  const parent = dirname(root);
  const siblings = repositories.map((repo) => ({ ...repo, directory: join(parent, repo.name) }));
  // Check every destination before cloning anything; never repurpose user files.
  for (const repo of siblings) {
    if (existsSync(repo.directory)
      && (!statSync(repo.directory).isDirectory() || !existsSync(join(repo.directory, '.git')))) {
      throw new Error(`${repo.directory} already exists and is not a Git checkout. Inspect it and choose a different workspace location before retrying.`);
    }
  }
  for (const repo of siblings) {
    if (existsSync(repo.directory)) {
      log(`Keeping existing ${repo.name} checkout and branch.`);
      continue;
    }
    log(`Cloning ${repo.name} beside the backend repository.`);
    const args = ['clone'];
    if (env[repo.refVariable]) args.push('--branch', env[repo.refVariable]);
    args.push('--', `https://github.com/khalidrazaa/${repo.name}.git`, repo.directory);
    try {
      execute(run, env, 'git', args, parent);
    } catch (error) {
      throw new Error(`Could not clone ${repo.name}. Check Codespaces repository access and the requested branch/tag. Inspect any partial destination before retrying; setup has not deleted it.`, { cause: error });
    }
  }

  function preparePython(directory) {
    const manifest = pythonManifest(directory);
    if (manifest.kind === 'uv-lock' || manifest.kind === 'pyproject') {
      const args = ['sync', '--python', '3.12'];
      if (manifest.kind === 'uv-lock') args.push('--locked');
      execute(run, env, 'uv', args, directory);
    } else {
      if (!existsSync(join(directory, '.venv'))) execute(run, env, 'uv', ['venv', '--python', '3.12', '.venv'], directory);
      if (manifest.kind === 'requirements') {
        const args = ['pip', 'install', '--python', pythonExecutable(directory)];
        for (const file of manifest.files) args.push('--requirement', file);
        execute(run, env, 'uv', args, directory);
      } else {
        log(`${directory}: Python environment ready; no dependency manifest exists yet.`);
      }
    }
  }

  const packages = join(parent, 'packages-dp');
  const ui = join(parent, 'ui-nextjs-dp');
  preparePython(packages);
  preparePython(root);
  if (isInstallablePackage(packages)) {
    execute(run, env, 'uv', ['pip', 'install', '--python', pythonExecutable(root), '--editable', packages], root);
  } else {
    log('packages-dp is a scaffold; editable installation will start when it has a build-system or setup.py.');
  }
  const [manager, args] = frontendInstall(ui);
  log(`Installing frontend dependencies with ${manager}.`);
  execute(run, env, manager, args, ui);
  log('Setup complete. Open data-plateform.code-workspace to work on all three repositories.');
}

function pythonExecutable(directory) {
  return join(directory, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    bootstrap();
  } catch (error) {
    console.error(`Codespaces setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
