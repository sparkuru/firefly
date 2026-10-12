import { spawn } from 'node:child_process';
import { lstat, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = path.join(packageRoot, 'dist');
const publicMediaRoot = path.join(packageRoot, 'public/media');

const REQUIRED_MEDIA = Object.freeze([
  Object.freeze({
    input: 'images/slide-01.jpg',
    output: 'media/images/slide-01.jpg'
  }),
  Object.freeze({
    input: 'images/slide-02.jpg',
    output: 'media/images/slide-02.jpg'
  }),
  Object.freeze({
    input: 'images/slide-03.jpg',
    output: 'media/images/slide-03.jpg'
  }),
  Object.freeze({
    input: 'images/preload-04.jpg',
    output: 'media/images/preload-04.jpg'
  }),
  Object.freeze({
    input: 'images/preload-05.png',
    output: 'media/images/preload-05.png'
  }),
  Object.freeze({
    input: 'music/track-01.mp3',
    output: 'media/music/track-01.mp3'
  }),
  Object.freeze({
    input: 'music/track-02.mp3',
    output: 'media/music/track-02.mp3'
  }),
  Object.freeze({
    input: 'music/track-03.mp3',
    output: 'media/music/track-03.mp3'
  })
]);

function contained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function validateMediaInput(relativePath) {
  const candidate = path.resolve(publicMediaRoot, relativePath);
  if (!contained(publicMediaRoot, candidate)) {
    throw new TypeError(`[majo] Invalid public media path: ${relativePath}`);
  }

  let stats;
  try {
    stats = await lstat(candidate);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`[majo] Missing required local media input: public/media/${relativePath}`);
    }
    throw error;
  }
  if (stats.isSymbolicLink()) {
    throw new TypeError(`[majo] Public media input must not be a symbolic link: public/media/${relativePath}`);
  }
  if (!stats.isFile()) {
    throw new TypeError(`[majo] Public media input must be a regular file: public/media/${relativePath}`);
  }
  const resolvedPackageRoot = await realpath(packageRoot);
  const resolvedRoot = await realpath(publicMediaRoot);
  if (!contained(resolvedPackageRoot, resolvedRoot)) {
    throw new TypeError('[majo] Public media root resolves outside the Experiment package.');
  }
  const resolvedCandidate = await realpath(candidate);
  if (!contained(resolvedRoot, resolvedCandidate)) {
    throw new TypeError(`[majo] Public media input resolves outside public/media/: public/media/${relativePath}`);
  }
  return candidate;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: packageRoot,
      stdio: 'inherit'
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`[majo] ${path.basename(command)} ${args.join(' ')} failed with ${signal ?? `exit ${String(code)}`}.`));
    });
  });
}

async function verifyOutput(relativePath) {
  const candidate = path.join(outputRoot, relativePath);
  const stats = await lstat(candidate);
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new TypeError(`[majo] Build output is not a regular file: dist/${relativePath}`);
  }
}

async function main() {
  await rm(outputRoot, { recursive: true, force: true });
  await Promise.all(REQUIRED_MEDIA.map(({ input }) => validateMediaInput(input)));
  const astro = path.join(packageRoot, 'node_modules/.bin/astro');
  await run(astro, ['check']);
  await run(astro, ['build']);

  await verifyOutput('index.html');
  await verifyOutput('404.html');
  await Promise.all(REQUIRED_MEDIA.map(({ output }) => verifyOutput(output)));
  console.log(`[majo] built dist/ with ${String(REQUIRED_MEDIA.length)} local media files.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
