#!/usr/bin/env python3
"""Concept-blokken (mm) -> STL voor Shapr3D. Geen numpy nodig."""
from pathlib import Path

OUT = Path(__file__).parent / "stl"


def box(x0, y0, z0, x1, y1, z1):
    p = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1),
    ]
    faces = (
        (0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1),
        (3, 2, 6, 7), (0, 3, 7, 4), (1, 5, 6, 2),
    )
    tris = []
    for a, b, c, d in faces:
        tris.append((p[a], p[b], p[c]))
        tris.append((p[a], p[c], p[d]))
    return tris


def write_stl(path, triangles, name):
    def nrm(a, b, c):
        ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
        nx = uy * vz - uz * vy
        ny = uz * vx - ux * vz
        nz = ux * vy - uy * vx
        l = (nx * nx + ny * ny + nz * nz) ** 0.5 or 1
        return nx / l, ny / l, nz / l

    lines = [f"solid {name}"]
    for a, b, c in triangles:
        nx, ny, nz = nrm(a, b, c)
        lines.append(f"  facet normal {nx:.6f} {ny:.6f} {nz:.6f}")
        lines.append("    outer loop")
        for v in (a, b, c):
            lines.append(f"      vertex {v[0]:.3f} {v[1]:.3f} {v[2]:.3f}")
        lines.append("    endloop")
        lines.append("  endfacet")
    lines.append(f"endsolid {name}")
    path.write_text("\n".join(lines) + "\n")


def main():
    OUT.mkdir(exist_ok=True)
    # X = breedte, Y = diepte (0 = kassier/voor), Z = omhoog
    parts = {
        "01-ladeblok": box(0, 0, 0, 400, 340, 100),
        "02-star-mechanisme": box(280, 22, 10, 390, 187, 82),
        "02b-papierrol": box(293, 30, 18, 377, 114, 102),
        "03-minipc-nis": box(140, 24, 100, 260, 136, 152),
        "04-alu-nek": box(182, 152, 100, 218, 188, 268),
        "05-elo-kassier": box(27, 40, 200, 373, 68, 420),
        "06-klantenscherm": box(90, 272, 230, 310, 288, 370),
    }
    all_tris = []
    for name, tris in parts.items():
        write_stl(OUT / f"{name}.stl", tris, name)
        all_tris.extend(tris)
    write_stl(OUT / "vysion-kassa-concept.stl", all_tris, "vysion_kassa")
    print(f"geschreven: {OUT}")


if __name__ == "__main__":
    main()
