"""
Détourage par segmentation (IS-Net / U²-Net via rembg, modèles sous licence Apache 2.0).

Utilisé en secours par `pnpm catalog:build` pour les photos dont le fond n'est
pas uni : le modèle isole l'objet principal, l'emballage n'est ni redessiné ni
généré. Le résultat est ensuite contrôlé (solidité, proportion, netteté du
masque) côté Node : un détourage douteux est rejeté.

Entrée : fichier JSON [{"input": "...jpg", "output": "...png"}, ...]
Usage  : python ml_cutout.py jobs.json [modele]
"""

import json
import sys
from pathlib import Path

from PIL import Image
from rembg import new_session, remove


def main() -> int:
    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    model = sys.argv[2] if len(sys.argv) > 2 else "isnet-general-use"
    session = new_session(model)
    done = 0
    for job in jobs:
        output = Path(job["output"])
        if output.exists():
            done += 1
            continue
        try:
            with Image.open(job["input"]) as img:
                img = img.convert("RGB")
                img.thumbnail((1024, 1024))
                # Sans « alpha matting » (très lent) : le liseré est adouci côté Node.
                cut = remove(img, session=session, post_process_mask=True)
                output.parent.mkdir(parents=True, exist_ok=True)
                cut.save(output, "PNG")
                done += 1
        except Exception as error:  # noqa: BLE001 — on poursuit le lot
            print(f"échec {job['input']}: {error}", file=sys.stderr)
        if done % 25 == 0:
            print(f"  … {done}/{len(jobs)}", flush=True)
    print(f"détourage IA : {done}/{len(jobs)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
