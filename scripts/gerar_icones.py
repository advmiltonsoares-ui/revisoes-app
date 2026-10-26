"""Gera os ícones PNG do app: letras RVA brancas em fundo preto."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FONTE = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"
SAIDA = Path(__file__).resolve().parent.parent / "public" / "icons"


def icone(tamanho: int, escala_texto: float, cantos: bool) -> Image.Image:
    img = Image.new("RGBA", (tamanho, tamanho), (0, 0, 0, 0 if cantos else 255))
    d = ImageDraw.Draw(img)
    if cantos:
        d.rounded_rectangle((0, 0, tamanho - 1, tamanho - 1), radius=int(tamanho * 0.22), fill="black")
    fonte = ImageFont.truetype(FONTE, int(tamanho * escala_texto))
    d.text((tamanho / 2, tamanho / 2), "RVA", font=fonte, fill="white", anchor="mm")
    return img


SAIDA.mkdir(parents=True, exist_ok=True)
icone(192, 0.34, True).save(SAIDA / "icone-192.png")
icone(512, 0.34, True).save(SAIDA / "icone-512.png")
# Maskable: fundo cheio e texto menor (o sistema recorta as bordas).
icone(512, 0.26, False).save(SAIDA / "icone-maskable-512.png")
# iPhone: sem transparência, o próprio iOS arredonda.
icone(180, 0.34, False).convert("RGB").save(SAIDA / "apple-touch-icon.png")
print("Ícones gerados em", SAIDA)
