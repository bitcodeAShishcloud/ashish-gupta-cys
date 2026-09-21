from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

BASE = r"C:\Windows\Fonts"
def font(name, size):
    fn = {"segoe": "segoeui.ttf", "segoeb": "segoeuib.ttf", "cons": "consola.ttf", "conzb": "consolab.ttf"}
    return ImageFont.truetype(BASE + "/" + fn[name], size)

BG, TEXT, MUTED = (5, 7, 10), (230, 237, 243), (139, 152, 165)
GREEN, VIOLET = (0, 229, 168), (124, 92, 255)
W, H = 1200, 630

img = Image.new("RGB", (W, H), BG)

# soft glows: green top-left, violet top-right (single soft background glow rule)
glow = Image.new("RGB", (W, H), BG)
gd = ImageDraw.Draw(glow)
gd.ellipse([-220, -260, 620, 480], fill=GREEN)
gd.ellipse([820, -300, 1460, 300], fill=VIOLET)
img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(220)), 0.10)
d = ImageDraw.Draw(img)

# hairline grid, ~2% white
grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd2 = ImageDraw.Draw(grid)
for x in range(0, W, 40):
    gd2.line([(x, 0), (x, H)], fill=(255, 255, 255, 6), width=1)
for y in range(0, H, 40):
    gd2.line([(0, y), (W, y)], fill=(255, 255, 255, 6), width=1)
img = Image.alpha_composite(img.convert("RGBA"), grid)

# corner frame
fd = ImageDraw.Draw(img)
fd.rectangle([24, 24, W - 24, H - 24], outline=(255, 255, 255, 26), width=1)

d = ImageDraw.Draw(img)
d.text((64, 64), "~/portfolio", font=font("cons", 22), fill=GREEN)

# name: "Ashish " in text color + "Gupta" green->violet gradient (the one word)
f_name = font("segoeb", 92)
y_name = 140
d.text((64, y_name), "Ashish ", font=f_name, fill=TEXT)
x_g = int(64 + d.textlength("Ashish ", font=f_name))
w_g = int(d.textlength("Gupta", font=f_name))
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).text((x_g, y_name), "Gupta", font=f_name, fill=255)
grad = Image.new("RGB", (W, H))
gp = grad.load()
for x in range(x_g, x_g + w_g + 2):
    t = (x - x_g) / max(w_g, 1)
    r = int(GREEN[0] + (VIOLET[0] - GREEN[0]) * t)
    g = int(GREEN[1] + (VIOLET[1] - GREEN[1]) * t)
    b = int(GREEN[2] + (VIOLET[2] - GREEN[2]) * t)
    for y in range(H):
        gp[x, y] = (r, g, b)
img.paste(grad, (0, 0), mask)

d = ImageDraw.Draw(img)
d.text((64, 272), "Cyber Security Student  -  B.Tech, NIET Greater Noida", font=font("segoe", 34), fill=MUTED)
d.line([(64, 356), (W - 64, 356)], fill=(255, 255, 255, 26), width=1)

f_v, f_l = font("conzb", 40), font("cons", 20)
x = 64
for val, label in [("10+", "projects"), ("2", "internships"), ("2", "certifications")]:
    d.text((x, 392), val, font=f_v, fill=GREEN)
    lw = int(d.textlength(val, font=f_v))
    d.text((x + lw + 14, 414), label, font=f_l, fill=MUTED)
    x += lw + 14 + int(d.textlength(label, font=f_l)) + 64

d.rectangle([64, 496, 128, 560], fill=(17, 24, 32), outline=(255, 255, 255, 34), width=1)
d.text((78, 512), ">_", font=font("conzb", 26), fill=GREEN)
d.text((152, 512), "ashishcys.cyou", font=font("segoeb", 30), fill=TEXT)

out = img.convert("RGB")
out.save("public/assets/og-image.webp", "WEBP", quality=92, method=4)
print("og-image.webp", out.size, os.path.getsize("public/assets/og-image.webp") // 1024, "KB")

# profile photo: 512px webp within 40KB
p = Image.open("public/assets/profile-photo.png").convert("RGB").resize((512, 512), Image.LANCZOS)
kb = 0
for q in (82, 78, 74, 70, 64, 58):
    p.save("public/assets/profile-photo.webp", "WEBP", quality=q, method=5)
    kb = os.path.getsize("public/assets/profile-photo.webp") // 1024
    print(f"profile q{q}: {kb} KB")
    if kb <= 38:
        break
print("final profile-photo.webp", p.size, kb, "KB")
