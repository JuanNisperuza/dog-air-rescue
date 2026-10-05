"""Corta las hojas de efectos y del jefe (fondo magenta) en frames PNG con transparencia.

Estas hojas traen bordes de cuadrícula y celdas de distinto tamaño, por eso tienen
su propio script (Python: Pillow, numpy y scipy). Después: npm run atlas -- fx boss
Uso: python tools/slice-fx.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'art/source'
OUT = 'art/frames'
KEY_SOLID, KEY_CLEAR = 70, 150


def key_out(rgb):
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    key = np.minimum(r, b) - g
    alpha = np.clip((KEY_CLEAR - key) / (KEY_CLEAR - KEY_SOLID), 0, 1)
    # Despill solo en los bordes: quita el tinte magenta
    edge = alpha < 0.98
    excess = np.clip(np.minimum(r, b) - g, 0, None)
    r = np.where(edge, r - excess * 0.9, r)
    b = np.where(edge, b - excess * 0.9, b)
    out = np.dstack([r, g, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    out[..., 3][out[..., 3] < 20] = 0
    return out


def drop_small(rgba, min_area=60, drop_flat=False):
    """Quita islas pequeñas (ruido) y, si se pide, sombras planas abajo."""
    mask = rgba[..., 3] > 40
    lab, n = ndimage.label(mask)
    if n == 0:
        return rgba
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool)
    biggest = int(np.argmax(sizes)) + 1
    for i, s in enumerate(sizes, 1):
        if s < min_area:
            continue
        if drop_flat:
            ys, xs = np.nonzero(lab == i)
            h, w = np.ptp(ys) + 1, np.ptp(xs) + 1
            by = ndimage.find_objects((lab == biggest).astype(int))[0][0]
            if h < w * 0.35 and ys.min() > by.stop - 40:
                continue  # sombra elíptica bajo el personaje
        keep[i] = True
    soft = ndimage.binary_dilation(keep[lab], iterations=3)
    rgba = rgba.copy()
    rgba[..., 3] = np.where(soft, rgba[..., 3], 0)
    return rgba


def cell(img, box, inset=8):
    x0, y0, x1, y1 = box
    return np.array(img.crop((x0 + inset, y0 + inset, x1 - inset, y1 - inset)).convert('RGB'))


def save(rgba, path, scale):
    im = Image.fromarray(rgba, 'RGBA')
    if scale != 1:
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)


def centered(frames, scale, path_fmt):
    """Recorta cada frame a su contenido y lo centra en un lienzo común."""
    boxes = []
    for f in frames:
        ys, xs = np.nonzero(f[..., 3] > 20)
        boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    W = max(b[2] - b[0] for b in boxes) + 4
    H = max(b[3] - b[1] for b in boxes) + 4
    for i, (f, (x0, y0, x1, y1)) in enumerate(zip(frames, boxes)):
        canvas = np.zeros((H, W, 4), np.uint8)
        ox, oy = (W - (x1 - x0)) // 2, (H - (y1 - y0)) // 2
        canvas[oy:oy + y1 - y0, ox:ox + x1 - x0] = f[y0:y1, x0:x1]
        save(canvas, path_fmt.format(i + 1), scale)


def grid(cols, rows):
    return [[(c[0], r[0], c[1], r[1]) for c in cols] for r in rows]


def anchored(frames, anchor_fn, scale, path_fmt):
    """Alinea frames por un punto de anclaje (ej. el centro del zepelín)."""
    anchors = [anchor_fn(f) for f in frames]
    left = max(ax for ax, ay in anchors)
    top = max(ay for ax, ay in anchors)
    right = max(f.shape[1] - ax for f, (ax, ay) in zip(frames, anchors))
    bottom = max(f.shape[0] - ay for f, (ax, ay) in zip(frames, anchors))
    W, H = left + right, top + bottom
    for i, (f, (ax, ay)) in enumerate(zip(frames, anchors)):
        canvas = np.zeros((H, W, 4), np.uint8)
        ox, oy = left - ax, top - ay
        canvas[oy:oy + f.shape[0], ox:ox + f.shape[1]] = f
        save(canvas, path_fmt.format(i + 1), scale)
    return (left * scale, top * scale, W * scale, H * scale)


def feather(rgba, px=40):
    """Desvanece los bordes del recorte (humo cortado por la celda)."""
    h, w = rgba.shape[:2]
    ramp_x = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / px, 0, 1)
    ramp_y = np.clip(np.minimum(np.arange(h), h - 1 - np.arange(h)) / px, 0, 1)
    out = rgba.copy()
    out[..., 3] = (out[..., 3] * ramp_x[None, :] * ramp_y[:, None]).astype(np.uint8)
    return out


def zeppelin_anchor(rgba):
    a = rgba.astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    grey = (al > 200) & (abs(r - g) < 18) & (abs(g - b) < 18) & (r > 45) & (r < 120)
    ys, xs = np.nonzero(grey)
    # el zepelín es la masa gris grande de la mitad de abajo
    sel = ys > rgba.shape[0] * 0.45
    return int(np.median(xs[sel])), int(np.median(ys[sel]))


SHEETS = ['fx_explosion', 'fx_hits_smoke', 'fx_projectiles', 'puppy', 'boss_idle_attack', 'boss_angry_defeated', 'powerups']
img = {i: Image.open(f'{SRC}/{name}.jpeg') for i, name in enumerate(SHEETS, 1)}

# 1. Explosión: 8 cajas con borde negro (el último frame casi vacío se omite)
boxes = grid([(19, 502), (528, 1011), (1037, 1519), (1546, 2028)], [(406, 1011), (1036, 1526)])
frames = [b for row in boxes for b in row][:7]
for i, b in enumerate(frames, 1):
    save(drop_small(key_out(cell(img[1], b, 10))), f'{OUT}/fx/fx_boom_{i:04d}.png', 0.3)

# 2. Chispas (fila 2) y humo (fila 3, los 3 primeros)
cols2 = [(14, 508), (523, 1016), (1031, 1525), (1540, 2033)]
for i, b in enumerate(grid(cols2, [(425, 1016)])[0], 1):
    save(key_out(cell(img[2], b, 10)), f'{OUT}/fx/fx_spark_{i:04d}.png', 0.16)
for i, b in enumerate(grid(cols2, [(1031, 1590)])[0][:3], 1):
    save(drop_small(key_out(cell(img[2], b, 10))), f'{OUT}/fx/fx_puff_{i:04d}.png', 0.2)

# 3. Hueso (fila 1) y lana (fila 3)
cols3 = [(0, 506), (516, 1019), (1028, 1531), (1541, 2048)]
centered([drop_small(key_out(cell(img[3], b, 12))) for b in grid(cols3, [(0, 507)])[0]], 0.09, OUT + '/fx/fx_bone_{:04d}.png')
centered([drop_small(key_out(cell(img[3], b, 12))) for b in grid(cols3, [(1028, 1531)])[0]], 0.09, OUT + '/fx/fx_yarn_{:04d}.png')

# 4. Perrito: en burbuja (fila 1) y feliz (fila 2, sin la sombra del piso)
cols4 = [(0, 512), (512, 1024), (1024, 1536), (1536, 2048)]
centered([drop_small(key_out(cell(img[4], b, 6))) for b in grid(cols4, [(0, 1024)])[0]], 0.15, OUT + '/fx/pup_bubble_{:04d}.png')
centered([drop_small(key_out(cell(img[4], b, 6)), drop_flat=True) for b in grid(cols4, [(1024, 2048)])[0]], 0.15, OUT + '/fx/pup_happy_{:04d}.png')

# 7. Íconos de power-ups
names = ['spread', 'rapid', 'shield', 'super']
for i, name in enumerate(names):
    b = (i * 1032, 0, (i + 1) * 1032, 1024)
    save(drop_small(key_out(cell(img[7], b, 6))), f'{OUT}/fx/pu_{name}.png', 0.07)

# 5 y 6. Jefe: todos los frames alineados por el centro del zepelín
cols5 = [(0, 510), (513, 1022), (1026, 1534), (1538, 2048)]
rows5 = [(0, 1022), (1026, 2048)]
boss = {}
for sheet, names_ in ((5, ['idle', 'attack']), (6, ['angry', 'defeated'])):
    for row_name, row in zip(names_, grid(cols5, rows5)):
        boss[row_name] = [feather(drop_small(key_out(cell(img[sheet], b, 6)), min_area=200)) for b in row]

all_frames = [f for k in ['idle', 'attack', 'angry', 'defeated'] for f in boss[k]]
anchors = [zeppelin_anchor(f) for f in all_frames]
left = max(a[0] for a in anchors); top = max(a[1] for a in anchors)
right = max(f.shape[1] - a[0] for f, a in zip(all_frames, anchors))
bottom = max(f.shape[0] - a[1] for f, a in zip(all_frames, anchors))
W, H = left + right, top + bottom
SCALE = 0.42
i = 0
for k in ['idle', 'attack', 'angry', 'defeated']:
    for n in range(4):
        f, (ax, ay) = all_frames[i], anchors[i]
        canvas = np.zeros((H, W, 4), np.uint8)
        ox, oy = left - ax, top - ay
        canvas[oy:oy + f.shape[0], ox:ox + f.shape[1]] = f
        save(canvas, f'{OUT}/boss/boss_{k}_{n + 1:04d}.png', SCALE)
        i += 1
print('boss canvas', W * SCALE, H * SCALE, 'anchor', left * SCALE, top * SCALE)
