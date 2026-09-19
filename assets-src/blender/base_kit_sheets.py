"""Review sheets for the base kit: each module's turntable beside its piece
of the reference's asset-overview row, and the whole kit lineup over the
reference row. Plain Python 3 with Pillow (not Blender).

Run:  python3 assets-src/blender/base_kit_sheets.py <renders-dir> [reference.png]
Reads <renders-dir>/<Module>/view-*.png and lineup.png (from base_kit.py),
writes <renders-dir>/<Module>-sheet.png and kit-lineup-sheet.png.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

RENDERS = sys.argv[1]
REF = sys.argv[2] if len(sys.argv) > 2 else os.path.expanduser('~/Desktop/stellar-refs/base/Moon Base.png')
BG = (98, 100, 105, 255)
INK = (225, 226, 228)
# Each module's cell in the reference's "modular asset overviews" row (1448 px wide image).
CROPS = {
    'Garage': (272, 905, 440, 1045), 'CommsMast': (440, 905, 495, 1045), 'Dish': (500, 905, 595, 1045),
    'TelescopePlatform': (595, 905, 660, 1045), 'SolarArray': (660, 905, 760, 1045),
}
ROW = (0, 900, 1448, 1050)


def font(size):
    for f in ('/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def flat(path):
    im = Image.open(path).convert('RGBA')
    return Image.alpha_composite(Image.new('RGBA', im.size, BG), im).convert('RGB')


def module_sheet(name, ref):
    d = os.path.join(RENDERS, name)
    views = sorted(f for f in os.listdir(d) if f.startswith('view-'))
    tile = 384
    crop = ref.crop(CROPS[name])
    scale = (2 * tile) / crop.height
    crop = crop.resize((int(crop.width * scale), 2 * tile), Image.LANCZOS)
    head = 56
    sheet = Image.new('RGB', (crop.width + 16 + 4 * tile, 2 * tile + head), BG[:3])
    sheet.paste(crop, (0, head))
    for i, v in enumerate(views[:8]):
        im = flat(os.path.join(d, v)).resize((tile, tile), Image.LANCZOS)
        sheet.paste(im, (crop.width + 16 + (i % 4) * tile, head + (i // 4) * tile))
    dr = ImageDraw.Draw(sheet)
    dr.text((12, 14), 'REFERENCE', fill=INK, font=font(22))
    dr.text((crop.width + 28, 14), f'{name}  ·  base-kit.glb  ·  8-angle turntable (moving parts posed open)', fill=INK, font=font(22))
    out = os.path.join(RENDERS, f'{name}-sheet.png')
    sheet.save(out)
    return out


def lineup_sheet(ref):
    line = flat(os.path.join(RENDERS, 'lineup.png'))
    row = ref.crop(ROW)
    row = row.resize((line.width, int(row.height * line.width / row.width)), Image.LANCZOS)
    head = 60
    sheet = Image.new('RGB', (line.width, head * 2 + line.height + row.height), BG[:3])
    dr = ImageDraw.Draw(sheet)
    dr.text((20, 16), 'STELLAR BASE KIT  ·  base-kit.glb  ·  13 pieces, one atlas', fill=INK, font=font(30))
    sheet.paste(line, (0, head))
    dr.text((20, head + line.height + 16), 'REFERENCE  ·  Moon Base.png, modular asset overviews', fill=INK, font=font(30))
    sheet.paste(row, (0, head * 2 + line.height))
    out = os.path.join(RENDERS, 'kit-lineup-sheet.png')
    sheet.save(out)
    return out


def main():
    ref = Image.open(REF).convert('RGB')
    for name in CROPS:
        if os.path.isdir(os.path.join(RENDERS, name)):
            print(module_sheet(name, ref))
    if os.path.exists(os.path.join(RENDERS, 'lineup.png')):
        print(lineup_sheet(ref))


main()
