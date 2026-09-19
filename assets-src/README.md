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

A skinned or multi-node asset (the cosmonaut) must keep its nodes and meshes
apart, so the optimiser may not join, flatten or simplify them:

```
/Applications/Blender.app/Contents/MacOS/Blender -b -P assets-src/blender/cosmonaut.py -- assets-src/build assets-src/renders/cosmonaut
npx --yes @gltf-transform/cli optimize assets-src/build/cosmonaut.glb public/explore/models/cosmonaut.glb --compress meshopt --texture-compress webp --texture-size 2048 --join false --flatten false --simplify false --instance false --palette false
```

`cosmonaut.py -- preview <dir>` skips the bake: it prints the low-poly
triangle count and renders the high-poly in its procedural paint from the
reference sheet's six views (front, back, left, right, top, three-quarter)
on the sheet's grey. The full build renders the same views baked into
`<renders>/ref/`. Pair any of these with the reference:

```
python3 assets-src/blender/ref_sheets.py cosmonaut <renders>/ref assets-src/renders/cosmonaut/sheet.png
```

Ships keep their node tree (wing hinges, named empties), so optimise them
without flattening, joining or simplifying:

```
/Applications/Blender.app/Contents/MacOS/Blender -b -P assets-src/blender/ship_stellar.py -- assets-src/build assets-src/renders/ship-stellar
npx --yes @gltf-transform/cli optimize assets-src/build/shipstellar.glb public/explore/models/ship-stellar.glb --compress meshopt --texture-compress webp --texture-size 1024 --flatten false --join false --simplify false --prune false
```

(`ship_fighter.py` → `shipfighter.glb` → `ship-fighter.glb`, `ship_cruiser.py`
→ `shipcruiser.glb` → `ship-cruiser.glb`.) `lib/vehicle.py` runs their
loop: high- and low-poly from one build function, an emission-swap bake of
colour / normal / ORM / emissive into one 1K atlas with a hull slot and a
lamp slot, the moving parts split out under hinge empties, LODs, empties,
export and the reference-view renders.

The Moon base is one **kit** file: thirteen pieces, each its own root node,
all sharing one 2K atlas (`lib/kit.py` lays the pieces out apart for the
bake, bakes once, then cuts them back into pieces at the origin with their
hinge empties, lamp meshes and `<Piece>_LOD1`):

```
/Applications/Blender.app/Contents/MacOS/Blender -b -P assets-src/blender/base_kit.py -- assets-src/build assets-src/renders/base-kit
npx --yes @gltf-transform/cli optimize assets-src/build/basekit.glb public/explore/models/base-kit.glb --compress meshopt --texture-compress webp --texture-size 2048 --flatten false --join false --simplify false --prune false --instance false --palette false
python3 assets-src/blender/base_kit_sheets.py assets-src/renders/base-kit   # review sheets
```

Iterate on one piece without baking (high-poly, procedural paint, two views):
`Blender -b -P assets-src/blender/base_kit.py -- preview <dir> Garage,Dish`.
`KIT_ATLAS=1024` bakes a quicker test atlas.

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
