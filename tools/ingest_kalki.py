#!/usr/bin/env python3
"""
Ingests the 25 real K01..K25 body-region geometry buffers embedded in
`Kalki_Assembly_Atlas (1).html` and repacks them into a single glTF 2.0 .glb
with 25 named mesh primitives, plus a trimmed manifest.json for the canonical
engineering model.

Binary layout (reverse-engineered from the source app's own loader,
`app.js` function `xp`, and verified byte-for-byte against K01):

    per-group buffer (after gzip decompress) =
        Float32 position[vertices * 3]
        Float32 normal[vertices * 3]
        Float32 tangent[vertices * 4]
        Float32 uv[vertices * 2]
        Uint32  index[triangles * 3]

Run from the robot-twin-dashboard/ directory:
    python3 tools/ingest_kalki.py
"""
import base64
import gzip
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # robot-twin-dashboard/
SOURCE_DIR = ROOT.parent                                 # Kalki_Assembly_Atlas (1)/
HTML_PATH = SOURCE_DIR / "Kalki_Assembly_Atlas (1).html"
OUT_ASSETS = ROOT / "public" / "assets"
OUT_TEXTURES = OUT_ASSETS / "textures"

K_IDS = [f"K{n:02d}" for n in range(1, 26)]


def load_html():
    print(f"Reading {HTML_PATH} ...")
    with open(HTML_PATH, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def extract_manifest(html):
    m = re.search(
        r'<script type="application/json" id="manifestData">(.*?)</script>',
        html, re.S,
    )
    if not m:
        sys.exit("manifestData script block not found")
    return json.loads(m.group(1))


def extract_asset_block(html, asset_id):
    m = re.search(
        rf'<script type="application/octet-stream" id="asset:{re.escape(asset_id)}">(.*?)</script>',
        html, re.S,
    )
    if not m:
        sys.exit(f"asset block {asset_id} not found")
    return base64.b64decode(m.group(1).strip())


def extract_texture_jpeg(html, script_index_hint_name):
    """Textures are raw base64 JPEG <script> blocks near the end of the file,
    identified by being large JPEG data (SOI marker) rather than gzip data."""
    scripts = re.findall(r'<script(?:\s+[^>]*)?>(.*?)</script>', html, re.S)
    jpegs = []
    for s in scripts:
        s = s.strip()
        if s.startswith("/9j/"):  # base64 for JPEG SOI (0xFFD8FF..)
            jpegs.append(s)
    return jpegs


def decode_group(raw_gz_bytes, vertices, triangles, group_id):
    dec = gzip.decompress(raw_gz_bytes)
    pos_n = vertices * 3
    norm_n = vertices * 3
    tan_n = vertices * 4
    uv_n = vertices * 2
    idx_n = triangles * 3

    expected_len = (pos_n + norm_n + tan_n + uv_n) * 4 + idx_n * 4
    if expected_len != len(dec):
        sys.exit(
            f"[{group_id}] layout mismatch: expected {expected_len} bytes, "
            f"got {len(dec)} (vertices={vertices} triangles={triangles})"
        )
    return dec  # raw bytes, already in position/normal/tangent/uv/index order


def build_glb(groups_meta, group_bins, out_path):
    """groups_meta: list of dicts with id/key/vertices/triangles/min/max
    group_bins:  list of raw decoded byte buffers (same order)"""

    buffer_chunks = []
    running_offset = 0
    accessors = []
    buffer_views = []
    meshes = []
    nodes = []
    scene_node_indices = []

    for gi, (meta, raw) in enumerate(zip(groups_meta, group_bins)):
        V = meta["vertices"]
        T = meta["triangles"]

        pos_bytes = V * 3 * 4
        norm_bytes = V * 3 * 4
        tan_bytes = V * 4 * 4
        uv_bytes = V * 2 * 4
        idx_bytes = T * 3 * 4

        local_offsets = {
            "position": 0,
            "normal": pos_bytes,
            "tangent": pos_bytes + norm_bytes,
            "uv": pos_bytes + norm_bytes + tan_bytes,
            "index": pos_bytes + norm_bytes + tan_bytes + uv_bytes,
        }

        base = running_offset

        def add_bufferview(byte_offset, byte_length, target=None):
            bv = {"buffer": 0, "byteOffset": base + byte_offset, "byteLength": byte_length}
            if target is not None:
                bv["target"] = target
            buffer_views.append(bv)
            return len(buffer_views) - 1

        ARRAY_BUFFER = 34962
        ELEMENT_ARRAY_BUFFER = 34963

        bv_pos = add_bufferview(local_offsets["position"], pos_bytes, ARRAY_BUFFER)
        bv_norm = add_bufferview(local_offsets["normal"], norm_bytes, ARRAY_BUFFER)
        bv_tan = add_bufferview(local_offsets["tangent"], tan_bytes, ARRAY_BUFFER)
        bv_uv = add_bufferview(local_offsets["uv"], uv_bytes, ARRAY_BUFFER)
        bv_idx = add_bufferview(local_offsets["index"], idx_bytes, ELEMENT_ARRAY_BUFFER)

        FLOAT = 5126
        UNSIGNED_INT = 5125

        acc_pos = {
            "bufferView": bv_pos, "componentType": FLOAT, "count": V, "type": "VEC3",
            "min": meta["min"], "max": meta["max"],
        }
        acc_norm = {"bufferView": bv_norm, "componentType": FLOAT, "count": V, "type": "VEC3"}
        acc_tan = {"bufferView": bv_tan, "componentType": FLOAT, "count": V, "type": "VEC4"}
        acc_uv = {"bufferView": bv_uv, "componentType": FLOAT, "count": V, "type": "VEC2"}
        acc_idx = {"bufferView": bv_idx, "componentType": UNSIGNED_INT, "count": T * 3, "type": "SCALAR"}

        idx_acc_pos = len(accessors); accessors.append(acc_pos)
        idx_acc_norm = len(accessors); accessors.append(acc_norm)
        idx_acc_tan = len(accessors); accessors.append(acc_tan)
        idx_acc_uv = len(accessors); accessors.append(acc_uv)
        idx_acc_idx = len(accessors); accessors.append(acc_idx)

        mesh = {
            "name": meta["key"],
            "primitives": [{
                "attributes": {
                    "POSITION": idx_acc_pos,
                    "NORMAL": idx_acc_norm,
                    "TANGENT": idx_acc_tan,
                    "TEXCOORD_0": idx_acc_uv,
                },
                "indices": idx_acc_idx,
                "material": 0,
                "mode": 4,
            }],
        }
        meshes.append(mesh)

        node = {"name": meta["key"], "mesh": gi}
        nodes.append(node)
        scene_node_indices.append(gi)

        buffer_chunks.append(raw)
        running_offset += len(raw)

    bin_blob = b"".join(buffer_chunks)
    # glTF BIN chunk must be 4-byte aligned; our data is all float32/uint32 so
    # running_offset is already a multiple of 4.
    assert len(bin_blob) % 4 == 0

    gltf = {
        "asset": {"version": "2.0", "generator": "ingest_kalki.py (Kalki digital twin)"},
        "scene": 0,
        "scenes": [{"nodes": scene_node_indices}],
        "nodes": nodes,
        "meshes": meshes,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_blob)}],
        "materials": [{
            "name": "Kalki_Body_Material",
            "pbrMetallicRoughness": {
                "baseColorFactor": [1.0, 1.0, 1.0, 1.0],
                "metallicFactor": 1.0,
                "roughnessFactor": 1.0,
                "baseColorTexture": {"index": 0, "texCoord": 0},
                "metallicRoughnessTexture": {"index": 1, "texCoord": 0},
            },
            "normalTexture": {"index": 2, "texCoord": 0},
            "alphaMode": "OPAQUE",
            "doubleSided": True,
        }],
        "textures": [
            {"sampler": 0, "source": 0},
            {"sampler": 0, "source": 1},
            {"sampler": 0, "source": 2},
        ],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
        "images": [
            {"uri": "textures/base_color.jpg"},
            {"uri": "textures/metallic_roughness.jpg"},
            {"uri": "textures/normal.jpg"},
        ],
    }

    json_bytes = json.dumps(gltf).encode("utf-8")
    # pad JSON chunk to 4-byte boundary with spaces (per glTF-Binary spec)
    pad = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b" " * pad

    bin_pad = (4 - (len(bin_blob) % 4)) % 4
    bin_blob_padded = bin_blob + (b"\x00" * bin_pad)

    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_blob_padded)

    with open(out_path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total_length))
        f.write(struct.pack("<I4s", len(json_bytes), b"JSON"))
        f.write(json_bytes)
        f.write(struct.pack("<I4s", len(bin_blob_padded), b"BIN\x00"))
        f.write(bin_blob_padded)

    print(f"Wrote {out_path} ({total_length/1e6:.1f} MB, {len(meshes)} parts)")


def main():
    OUT_ASSETS.mkdir(parents=True, exist_ok=True)
    OUT_TEXTURES.mkdir(parents=True, exist_ok=True)

    html = load_html()
    manifest = extract_manifest(html)

    groups_by_id = {g["id"]: g for g in manifest["groups"]}
    missing = [k for k in K_IDS if k not in groups_by_id]
    if missing:
        sys.exit(f"Missing expected groups in manifest: {missing}")

    groups_meta = []
    group_bins = []
    for kid in K_IDS:
        g = groups_by_id[kid]
        print(f"Decoding {kid} ({g['name']}) — {g['vertices']} verts, {g['triangles']} tris ...")
        raw_gz = extract_asset_block(html, g["file"].replace(".bin.gz", "") + ".bin.gz")
        raw = decode_group(raw_gz, g["vertices"], g["triangles"], kid)
        groups_meta.append(g)
        group_bins.append(raw)

    build_glb(groups_meta, group_bins, OUT_ASSETS / "kalki_body.glb")

    # --- textures ---
    print("Extracting textures ...")
    jpegs = extract_texture_jpeg(html, None)
    tex_meta = manifest["textures"]
    if len(jpegs) < len(tex_meta):
        sys.exit(f"Expected {len(tex_meta)} JPEG blocks, found {len(jpegs)}")
    # Order in the HTML matches order in manifest["textures"]: base_color, metallic_roughness, normal
    name_map = {"base_color": "base_color.jpg", "metallic_roughness": "metallic_roughness.jpg", "normal": "normal.jpg"}
    for i, tmeta in enumerate(tex_meta):
        fname = name_map[tmeta["name"]]
        data = base64.b64decode(jpegs[i])
        out_path = OUT_TEXTURES / fname
        with open(out_path, "wb") as f:
            f.write(data)
        print(f"  wrote {out_path} ({len(data)/1e6:.1f} MB, expected {tmeta['bytes']/1e6:.1f} MB)")

    # --- trimmed manifest for the canonical model ---
    trimmed = {
        "version": manifest["version"],
        "source": manifest["source"],
        "unitStatus": manifest["unitStatus"],
        "bodyBounds": manifest["bodyBounds"],
        "bodyRegions": manifest["bodyRegions"],
        "preservation": manifest["preservation"],
        "checks": manifest["checks"],
        "groups": [
            {
                "id": g["id"], "key": g["key"], "name": g["name"], "region": g["region"],
                "min": g["min"], "max": g["max"], "center": g["center"], "explode": g["explode"],
                "vertices": g["vertices"], "triangles": g["triangles"],
                "observed": g["observed"], "proposal": g["proposal"], "check": g["check"],
            }
            for g in groups_meta
        ],
    }
    with open(OUT_ASSETS / "kalki_manifest.json", "w") as f:
        json.dump(trimmed, f, indent=2)
    print(f"Wrote {OUT_ASSETS / 'kalki_manifest.json'}")

    print("Done.")


if __name__ == "__main__":
    main()
