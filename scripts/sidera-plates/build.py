"""Writes every First Light plate as three layers: public/cards/plate/<DESIGNATION>/{sky,object,survey}.svg

    python3 scripts/sidera-plates/build.py [path/to/JetBrainsMono-Regular.ttf]

The layers are served as images, so the survey layer carries its own subset of
JetBrains Mono. fontTools (and brotli) are needed only for that subset.
"""
import base64, io, os, re, sys
from drawing import andromeda, saturn
import more
from fl_kept import PLATES as KEPT
from fl_solar import PLATES as SOLAR
from fl_deep import PLATES as DEEP

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'cards', 'plate')

# Every plate on the full-art canvas (582 × 832), in the set's order of families.
ART = {
    'JUPITER': lambda u: more.jupiter(u, more.HF), 'SATURN': lambda u: saturn(u, more.HF), 'HALLEY': lambda u: more.halley(u, more.HF),
    'M45': lambda u: more.m45(u, more.HF), 'M42': lambda u: more.m42(u, more.HF), 'M31': lambda u: andromeda(u, more.HF),
    **KEPT, **SOLAR, **DEEP,
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
