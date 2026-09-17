# Explore assets

Real 3D models for Stellar Explore, built by scripting Blender headless. No
hand modelling: every asset is a deterministic Python script under
`blender/`, re-run to rebuild the same file.

```
blender/lib/        shared bpy helpers: scene, model (bevel, boolean, subdivide,
                    decimate), uv (smart project + pack), bake (colour, normal,
                    packed roughness/metalness), decal (Georgian flag, wordmark)
blender/<asset>.py  one build script per asset
renders/<asset>/    turntable + side-by-side sheets for review (not shipped)
build/              raw exports and baked textures (ignored by git)
```

## Build an asset

```
/Applications/Blender.app/Contents/MacOS/Blender -b -P assets-src/blender/crate.py -- assets-src/build assets-src/renders/crate
npx --yes @gltf-transform/cli optimize assets-src/build/crate.glb public/explore/models/crate.glb --compress meshopt --texture-compress webp --texture-size 1024
```

Blender 4.5 LTS (Intel macOS is supported there; later releases may not be).
`@gltf-transform/cli` is run as a one-off with `npx` and is not a dependency.

## Budgets

Hero assets ≤ 25k triangles at LOD0, base modules ≤ 8k, props ≤ 1.5k. One
or two materials per asset. Textures ≤ 1K (2K only for the cosmonaut). Files:
hero ≤ 3 MB, module ≤ 800 KB. LOD1 ≈ 40 %, LOD2 ≈ 12 % via decimate, exported
as children named `<Asset>_LOD1` / `_LOD2`.

## Runtime

`src/game/models.ts` loads a file once per URL (GLTFLoader + meshopt) and
ref-counts it per environment, so a surface takes its models' GPU memory with
it when it is disposed. Repeated props go into an `InstancedMesh`.

## Markings

STELLAR wordmark and the full five-cross Georgian flag. Never a lone red cross
on white, and no NASA, USSR or Star Trek marks. See `~/Desktop/stellar-refs/NOTES.md`.
