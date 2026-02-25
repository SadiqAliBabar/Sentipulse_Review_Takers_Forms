# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "qrcode[pil]",
#   "pillow",
# ]
# ///

"""
generate_qr.py

Generates QR code images for every brand/branch combination.

Layout:
    +-----------------------+
    |      BRAND NAME       |  <- bold, top
    |   [ QR CODE IMAGE ]   |  <- middle
    |      Branch Name      |  <- regular, bottom
    +-----------------------+

Output: scripts/qr_codes/{Brand}/{Branch}.png

Usage:
    python scripts/generate_qr.py          <- interactive prompt
    python scripts/generate_qr.py --base-url https://yourserver.com
"""

import os
import re
import argparse
import urllib.parse
import qrcode
from PIL import Image, ImageDraw, ImageFont

# ── Brand/Branch data (mirrors RESTAURANT_DATA in script.js) ────────────────
RESTAURANT_DATA = {
    "Ginyaki": [
        "Bahria Town Ph:4, RWP",
        "Bahria Town Ph:7, RWP",
        "Centaurus Mall, ISB",
        "F10 Tariq Market, ISB",
        "F7 Markaz, ISB",
    ],
    "Benediction": [
        "Benediction",
        "Bennys By Benediction",
    ],
    "Mojo": [
        "Mojo Café",
    ],
    "Sweet Affairs": [
        "Sweet Affairs",
    ],
    "MASALAWALA": [
        "MASALAWALA",
    ],
}

# ── Image settings ───────────────────────────────────────────────────────────
QR_BOX_SIZE   = 10     # pixels per QR box
QR_BORDER     = 4      # QR quiet zone (in boxes)
PADDING       = 24     # outer padding around everything
GAP           = 14     # gap between text and QR code
FONT_BRAND    = 30     # font size for brand name (top)
FONT_BRANCH   = 22     # font size for branch name (bottom)
BG_COLOR      = (255, 255, 255)   # white background
TEXT_COLOR    = (0, 0, 0)         # black text


def get_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Load Arial from Windows fonts. Falls back to PIL default if not found."""
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Arial Bold.ttf" if bold else "C:/Windows/Fonts/Arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    # PIL built-in fallback (no size control, but always works)
    return ImageFont.load_default()


def text_size(draw: ImageDraw.ImageDraw, text: str, font) -> tuple[int, int]:
    """Return (width, height) of rendered text."""
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def generate_qr_image(brand: str, branch: str, base_url: str) -> Image.Image:
    """Build and return a QR code image with brand on top, branch on bottom."""

    # ── 1. Build URL ──────────────────────────────────────────────────────────
    url = f"{base_url}/pk/{urllib.parse.quote(brand)}/{urllib.parse.quote(branch)}/qrform"

    # ── 2. Generate QR code ───────────────────────────────────────────────────
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=QR_BOX_SIZE,
        border=QR_BORDER,
    )
    qr.add_data(url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_w, qr_h = qr_img.size

    # ── 3. Measure text sizes ─────────────────────────────────────────────────
    font_brand  = get_font(FONT_BRAND,  bold=True)
    font_branch = get_font(FONT_BRANCH, bold=False)

    # Use a throw-away draw to measure
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    brand_w,  brand_h  = text_size(probe, brand,  font_brand)
    branch_w, branch_h = text_size(probe, branch, font_branch)

    # ── 4. Calculate canvas size ──────────────────────────────────────────────
    content_w = max(qr_w, brand_w, branch_w)
    canvas_w  = content_w + PADDING * 2
    canvas_h  = (PADDING
                 + brand_h + GAP
                 + qr_h    + GAP
                 + branch_h
                 + PADDING)

    # ── 5. Draw everything onto canvas ────────────────────────────────────────
    canvas = Image.new("RGB", (canvas_w, canvas_h), BG_COLOR)
    draw   = ImageDraw.Draw(canvas)

    # Brand name — top center
    brand_x = (canvas_w - brand_w) // 2
    brand_y = PADDING
    draw.text((brand_x, brand_y), brand, font=font_brand, fill=TEXT_COLOR)

    # QR code — center
    qr_x = (canvas_w - qr_w) // 2
    qr_y = brand_y + brand_h + GAP
    canvas.paste(qr_img, (qr_x, qr_y))

    # Branch name — bottom center
    branch_x = (canvas_w - branch_w) // 2
    branch_y = qr_y + qr_h + GAP
    draw.text((branch_x, branch_y), branch, font=font_branch, fill=TEXT_COLOR)

    return canvas


def safe_filename(name: str) -> str:
    """Convert a branch name into a filesystem-safe filename."""
    replacements = {"/": "-", ":": "", ",": "", " ": "_"}
    for char, rep in replacements.items():
        name = name.replace(char, rep)
    return name.strip("_") + ".png"


def is_local(host: str) -> bool:
    """Return True if the host looks like a local IP or localhost."""
    local_patterns = [
        r"^localhost",
        r"^127\.",
        r"^192\.168\.",
        r"^10\.",
        r"^172\.(1[6-9]|2[0-9]|3[01])\.",
    ]
    return any(re.match(p, host) for p in local_patterns)


def resolve_url(raw: str) -> str:
    """
    Turn whatever the user typed into a clean base URL.

    Examples:
        192.168.1.195:9013   ->  http://192.168.1.195:9013
        localhost:9013       ->  http://localhost:9013
        mysite.com           ->  https://mysite.com
        https://mysite.com   ->  https://mysite.com  (unchanged)
        mysite.com/          ->  https://mysite.com  (trailing slash stripped)
    """
    raw = raw.strip().rstrip("/")

    # Already has a protocol — trust it as-is
    if re.match(r"^https?://", raw):
        return raw

    # Extract just the host part (before any path or port) to decide http vs https
    host = raw.split(":")[0].split("/")[0]

    protocol = "http" if is_local(host) else "https"
    return f"{protocol}://{raw}"


def prompt_for_url() -> str:
    """Interactively ask the user for a domain/IP and return a resolved base URL."""
    print("\nSentiPulse QR Code Generator")
    print("-" * 52)
    print("Enter your server address. Examples:")
    print("  192.168.1.195:9013   (local IP with port)")
    print("  localhost:9013       (local dev)")
    print("  mysite.com           (production domain)")
    print("-" * 52)

    while True:
        raw = input("Server address: ").strip()
        if not raw:
            print("  [!] Cannot be empty. Try again.")
            continue

        resolved = resolve_url(raw)
        confirm = input(f"  -> Will use: {resolved}  OK? [Y/n]: ").strip().lower()
        if confirm in ("", "y", "yes"):
            return resolved
        print("  Let's try again.\n")


def main():
    parser = argparse.ArgumentParser(description="Generate QR codes for all brand/branch combos")
    parser.add_argument(
        "--base-url",
        default=None,
        help="Base server URL. If omitted, you will be prompted interactively.",
    )
    args = parser.parse_args()

    # ── Resolve base URL ──────────────────────────────────────────────────────
    if args.base_url:
        base_url = resolve_url(args.base_url)
        print(f"\nBase URL : {base_url}")
    else:
        base_url = prompt_for_url()
        print(f"\nBase URL : {base_url}")

    # ── Output directory: scripts/qr_codes/ ───────────────────────────────────
    output_root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "qr_codes")
    os.makedirs(output_root, exist_ok=True)
    print(f"Output   : {output_root}\n")
    print("-" * 52)

    total = 0
    for brand, branches in RESTAURANT_DATA.items():
        brand_dir = os.path.join(output_root, brand)
        os.makedirs(brand_dir, exist_ok=True)

        for branch in branches:
            img      = generate_qr_image(brand, branch, base_url)
            filename = safe_filename(branch)
            filepath = os.path.join(brand_dir, filename)
            img.save(filepath)
            total += 1
            print(f"  OK  {brand:20s}  /  {branch}")

    print("-" * 52)
    print(f"\nDone! {total} QR codes saved to:\n   {output_root}\n")


if __name__ == "__main__":
    main()
