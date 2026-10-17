import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const outDir = 'dist';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

await esbuild.build({
  entryPoints: ['src/hianime.js', 'src/anikoto.js'],
  bundle: true,
  outdir: outDir,
  platform: 'browser', // Avoid Node.js built-ins
  target: ['es2020'],
  format: 'iife',
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}).then(() => {
  console.log("Build successful: dist/hianime.js and dist/anikoto.js created.");
}).catch((e) => {
  console.error("Build failed:", e);
  process.exit(1);
});
