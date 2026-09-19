"""Side-by-side review sheets: each reference view over the render from the
same angle. Plain Python 3 with Pillow (not Blender).

Run:  python3 assets-src/blender/ref_sheets.py <asset> <views-dir> <out.png>
<asset> is `cosmonaut` or `ship-stellar`; <views-dir> holds the PNGs the
asset's build script writes in its reference views (`ref_views`).
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

REFS = os.path.expanduser('~/Desktop/stellar-refs')
BG = (98, 100, 105)
INK = (225, 226, 228)
# Per asset: the reference image, the render files' prefix and, per view, its
# crop box (in the reference image's own pixels).
SHEETS = {
    'cosmonaut': ('cosmonaut/Cosmonaut 2.png', '', [
        ('front', (0, 0, 362, 543)), ('back', (362, 0, 724, 543)), ('left', (724, 0, 1086, 543)),
        ('right', (1086, 0, 1448, 543)), ('top', (130, 543, 610, 1086)), ('three-quarter', (905, 543, 1267, 1086)),
    ]),
    'ship-stellar': ('ship/spaceship.png', 'view-', [
        ('front', (11, 77, 318, 318)), ('back', (324, 77, 636, 318)), ('left', (647, 77, 1070, 318)),
        ('right', (1075, 77, 1525, 318)), ('top', (11, 340, 422, 647)), ('bottom', (433, 340, 855, 647)),
        ('three-quarter', (866, 340, 1305, 669)),
    ]),
}


def font(size):
    for f in ('/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def flat(path):
    """A render over the sheet's grey, whether or not it has a transparent background."""
    im = Image.open(path).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if box and box != (0, 0) + im.size:
        # A transparent render: frame it tight, as the reference crops are.
        m = 12
        im = im.crop((max(0, box[0] - m), max(0, box[1] - m), min(im.width, box[2] + m), min(im.height, box[3] + m)))
    return Image.alpha_composite(Image.new('RGBA', im.size, BG + (255,)), im).convert('RGB')


def fit(im, h):
    return im.resize((max(1, int(im.width * h / im.height)), h), Image.LANCZOS)


def main():
    asset, views_dir, out = sys.argv[1:4]
    ref_path, prefix, views = SHEETS[asset]
    ref = Image.open(os.path.join(REFS, ref_path)).convert('RGB')
    h = 420
    cols = []
    for name, box in views:
        a = fit(ref.crop(box), h)
        p = os.path.join(views_dir, f'{prefix}{name}.png')
        b = fit(flat(p), h) if os.path.exists(p) else Image.new('RGB', a.size, BG)
        cols.append((name, a, b))
    head = 40
    per_row = []
    row, w = [], 12
    for c in cols:
        cw = max(c[1].width, c[2].width) + 12
        if row and w + cw > 2400:
            per_row.append(row)
            row, w = [], 12
        row.append(c)
        w += cw
    per_row.append(row)
    width = max(12 + sum(max(a.width, b.width) + 12 for _, a, b in r) for r in per_row)
    sheet = Image.new('RGB', (width, len(per_row) * (2 * h + 2 * head + 12)), BG)
    dr = ImageDraw.Draw(sheet)
    y = 0
    for r in per_row:
        x = 12
        for name, a, b in r:
            dr.text((x, y + 10), f'REFERENCE  {name}', fill=INK, font=font(20))
            sheet.paste(a, (x, y + head))
            dr.text((x, y + head + h + 10), f'MODEL  {name}', fill=INK, font=font(20))
            sheet.paste(b, (x, y + 2 * head + h))
            x += max(a.width, b.width) + 12
        y += 2 * h + 2 * head + 12
    sheet.save(out)
    print(out)


main()
