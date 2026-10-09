"""Independent PNG and archive verification (Pillow + Python SHA-256)."""
import base64
import hashlib
import io
import json
from pathlib import Path
import sys
import zipfile
from PIL import Image

archive = Path(sys.argv[1])
sha = lambda b: hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    p = json.loads(z.read('image-project.clarus.json'))
    manifest = json.loads(z.read('image-package-manifest.json'))
    for name, digest in manifest['files'].items():
        assert sha(z.read(name)) == digest, name
    original = p['original']
    source = base64.b64decode(original['file_base64'], validate=True)
    assert sha(source) == original['file_sha256']
    assert z.read('original/image.png' if original['mime'] == 'image/png' else 'original/image.jpg') == source
    initial = base64.b64decode(original['rgba_base64'], validate=True)
    assert sha(initial) == original['rgba_sha256']
    width, height = original['width'], original['height']
    frames = [initial]
    active, redo = [], []
    for e in p['history']:
        previous = frames[-1]
        assert sha(previous) == e['before_rgba_sha256']
        op = e['operation']
        if op['kind'] == 'UNDO':
            assert op['target_version'] == active[-1]
            redo.append(active.pop())
            next_frame = frames[active[-1]] if active else initial
        elif op['kind'] == 'REDO':
            assert op['target_version'] == redo[-1]
            active.append(redo.pop())
            next_frame = frames[active[-1]]
        else:
            buf = bytearray(previous)
            x, y, w, h = op['rect']
            for yy in range(y, y+h):
                for xx in range(x, x+w):
                    i = (yy*width+xx)*4
                    if not previous[i+3] or (op['match_rgb'] is not None and list(previous[i:i+3]) != op['match_rgb']):
                        continue
                    if op['kind'] == 'TRANSPARENT':
                        buf[i+3] = 0
                    else:
                        buf[i:i+3] = bytes(op['replacement_rgb'])
            next_frame = bytes(buf)
            active.append(e['version'])
            redo.clear()
        changed = [i for i in range(width*height) if previous[i*4:i*4+4] != next_frame[i*4:i*4+4]]
        mask = [i for at in range(0, len(e['affected_runs']), 2)
                for i in range(e['affected_runs'][at], e['affected_runs'][at]+e['affected_runs'][at+1])]
        assert changed == mask and len(changed) == e['changed_pixels']
        assert sha(next_frame) == e['after_rgba_sha256']
        frames.append(next_frame)
    rendered = Image.open(io.BytesIO(z.read('edited.png')))
    assert rendered.size == (width, height) and rendered.mode == 'RGBA'
    assert rendered.tobytes() == frames[-1], 'PNG pixels differ from independent replay'
    print(json.dumps({'status': 'PASS', 'original_file_unchanged': True,
                      'independent_pixel_replay': True, 'all_affected_masks_match': True,
                      'png_rgba_including_hidden_rgb': True, 'history_steps': len(p['history'])}))
