import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fullDollDesign} from '../app/src/doll-full-design.js';
import {BODY_FORMS} from '../app/src/doll-profiles.js';
import {coreShapeKey} from '../app/src/doll-core-geometry.js';
// A stale bundle is safe (the loader falls back to the worker) but brings back the wait.
test('prebuilt body-type torsos match the current body designs',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../app/public/doll-body-types/preview.json',import.meta.url),'utf8'));
  for(const id of Object.keys(BODY_FORMS)){
    const design=fullDollDesign(id);assert.equal(design.previewBundle,'body-types');
    assert.ok(manifest.entries.some(e=>e.name==='torso'&&e.shapeKey===coreShapeKey(design,'torso')),`${id}: rebuild with node scripts/build-doll-full-preview.mjs body-types`);
  }
});
