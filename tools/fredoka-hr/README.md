# Fredoka HR

Fredoka (the brand heading font) has no č, ć or đ. This script builds them from Fredoka's own caron, acute and bar, so Croatian headings stay in one typeface.

1. Download Fredoka SemiBold as TTF: `curl -A "Wget/1.21" "https://fonts.googleapis.com/css2?family=Fredoka:wght@600"` prints the file URL; save it here as `Fredoka-600.ttf`.
2. `npm install` and `npm run build`.
3. Copy `out/Fredoka-HR-600.otf` to `frontend/assets/fonts` and `backend/assets/fonts` (share images and the PDF report), and `out/Fredoka-HR-letters.otf` to `frontend/src/fonts` (the web, layered in front of Google's Fredoka with `unicode-range`).
4. Open `out/preview.svg` to check the letters.

Fredoka is under the SIL Open Font License 1.1 (see `frontend/assets/fonts/OFL.txt`); the modified font is distributed under the same licence.
