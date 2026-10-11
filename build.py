#!/usr/bin/env python3
"""Inline web/ + data/chores.json into one offline file: dist/chore-reward-chart.html."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(rel):
    with open(os.path.join(HERE, rel), encoding="utf-8") as f:
        return f.read()


def main():
    chores_path = os.path.join(HERE, "data", "chores.json")
    with open(chores_path, encoding="utf-8") as f:
        chores = json.load(f)
    chores_js = json.dumps(chores, ensure_ascii=False)
    n_kids = len(chores.get("kids", []))
    n_chores = sum(len(k.get("chores", [])) for k in chores.get("kids", []))
    n_perks = len(chores.get("perks", []))
    html = rd("web/index.html")
    html = html.replace("/*__CSS__*/", rd("web/app.css"))
    html = html.replace("/*__CHORES__*/ null /*__/CHORES__*/", chores_js)
    app = rd("web/app.js").replace("</script", "<\\/script")
    html = html.replace("/*__APP__*/", app)
    os.makedirs(os.path.join(HERE, "dist"), exist_ok=True)
    out = os.path.join(HERE, "dist", "chore-reward-chart.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(
        f"built {out} ({os.path.getsize(out):,} bytes) · "
        f"kids={n_kids} chores={n_chores} perks={n_perks}"
    )


if __name__ == "__main__":
    main()
