"""Writes every Set 001 plate as three layers: public/cards/plate/<DESIGNATION>/{sky,object,survey}.svg

    python3 scripts/sidera-plates/build.py [path/to/JetBrainsMono-Regular.ttf]

The layers are served as images, so the survey layer carries its own subset of
JetBrains Mono. fontTools (and brotli) are needed only for that subset.
"""
import base64, io, os, re, sys
from drawing import moon, andromeda, saturn, m87
import more

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'cards', 'plate')

ART = {
    'MOON': moon, 'TRANQUILITY-BASE': more.tranquility, 'VENUS': more.venus, 'MARS': more.mars, 'JUPITER': more.jupiter,
    'SATURN': saturn, 'PLUTO': more.pluto, 'HALLEY': more.halley, 'SIRIUS': more.sirius, 'POLARIS': more.polaris,
    'BETELGEUSE': more.betelgeuse, 'M42': more.m42, 'M45': more.m45, 'M31': andromeda, 'M16': more.m16, 'M87': m87,
    'TWIN-SUN': more.twin_sun, 'TIDE-WORLD': more.tide_world, 'RING-HABITAT': more.ring_habitat, 'UNIT-7': more.unit7,
    'SENTINEL': more.sentinel, 'BLACK-SLAB': more.black_slab, 'DERELICT': more.derelict, 'WORMHOLE': more.wormhole,
}


def standalone(s, style=''):
    s = s.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ', 1)
    return s.replace('<defs>', '<defs>' + style, 1) if style else s


def font_face(texts, ttf):
    from fontTools import subset
    from fontTools.ttLib import TTFont
    chars = set(''.join(texts)) | set('0123456789')
    font = TTFont(ttf)
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = []; opts.name_IDs = []
    sub = subset.Subsetter(opts); sub.populate(text=''.join(sorted(chars))); sub.subset(font)
    buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf)
    return "<style>@font-face{font-family:'JetBrains Mono';src:url(data:font/woff2;base64,%s) format('woff2')}</style>" % base64.b64encode(buf.getvalue()).decode()


def main():
    ttf = sys.argv[1] if len(sys.argv) > 1 else None
    layers = {k: fn('p') for k, fn in ART.items()}
    face = ''
    if ttf:
        texts = [re.sub(r'<[^>]+>', ' ', ann) for _, _, ann in layers.values()]
        face = font_face(texts, ttf)
    for k, (bg, obj, ann) in layers.items():
        d = os.path.join(OUT, k)
        os.makedirs(d, exist_ok=True)
        for name, s in (('sky', standalone(bg)), ('object', standalone(obj)), ('survey', standalone(ann, face))):
            open(os.path.join(d, name + '.svg'), 'w').write(s)
        print(k, len(bg), len(obj), len(ann))


main()
