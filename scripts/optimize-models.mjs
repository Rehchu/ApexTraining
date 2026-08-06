// Web-optimizes the raw pet models: decimate over-dense geometry, resize/compress
// textures, and Draco-compress. Reads from public/models, writes *-opt.glb.
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup, prune, weld, simplify, textureCompress, draco, resample,
} from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import { statSync } from 'node:fs';

// sharp fails to load on some Node/Windows combos; texture compression is
// optional — geometry decimation + Draco is the dominant win for these models.
let sharp = null;
try { sharp = (await import('sharp')).default; sharp({}); } catch { sharp = null; }
console.log('texture compression:', sharp ? 'enabled (sharp)' : 'skipped (sharp unavailable)');

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
  });
await MeshoptSimplifier.ready;

const mb = (p) => (statSync(p).size / 1048576).toFixed(1);

async function optimize(inPath, outPath, { simplifyRatio, texSize }) {
  console.log(`\n${inPath}  (${mb(inPath)} MB)`);
  const doc = await io.read(inPath);

  const steps = [dedup(), resample(), prune()];
  if (simplifyRatio) {
    steps.push(weld({ tolerance: 0.0001 }));
    steps.push(simplify({ simplifier: MeshoptSimplifier, ratio: simplifyRatio, error: 0.01 }));
  }
  if (sharp) steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [texSize, texSize] }));
  steps.push(draco());

  await doc.transform(...steps);
  await io.write(outPath, doc);
  console.log(`  -> ${outPath}  (${mb(outPath)} MB)`);

  // report resulting tri count
  let tris = 0;
  doc.getRoot().listMeshes().forEach((m) => m.listPrimitives().forEach((p) => {
    const idx = p.getIndices();
    tris += idx ? idx.getCount() / 3 : (p.getAttribute('POSITION')?.getCount() || 0) / 3;
  }));
  console.log(`  triangles: ${Math.round(tris)} | animations: ${doc.getRoot().listAnimations().length}`);
}

// Egg: crush 500k tris down to ~2%, small textures.
await optimize('public/models/dragon-egg.glb', 'public/models/dragon-egg-opt.glb', { simplifyRatio: 0.02, texSize: 512 });
// Dragon: keep geometry (rig/anims), just compress textures + Draco.
await optimize('public/models/StokerClassDragon.glb', 'public/models/dragon-opt.glb', { simplifyRatio: 0, texSize: 1024 });

console.log('\nDone.');
