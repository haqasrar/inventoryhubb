# Preparing the signature image

The signature is a **photo of blue ink on ruled paper**, so it cannot be cleaned the same way
the logo was. The logo was black on a light background, which a simple brightness threshold
handled. Here, brightness alone would fail:

- the **ruled lines** on the paper are darker than the paper,
- part of the photo sits in **shadow**, so "dark" there is still paper,
- the ink itself varies from dark navy to light blue where the pen skipped.

Instead the cleanup keys on **colour**, not brightness. Ballpoint ink is strongly blue, meaning its
blue channel is well above its red channel. Paper, ruled lines and shadow are all roughly neutral
(red ≈ green ≈ blue) no matter how dark they get. So `blue − red` separates ink from everything
else, and shadows fall away for free.

The photo also had **other ink on the page** — notes along the top, a scribble at the right edge,
and the notebook's own blue margin rule. Colour keying alone would have kept all of it, so the
script first crops to a fixed box around the signature (`CROP` in the script) and only then looks
at colour.

## Steps

1. Save the signature photo as `assets/signature-raw.png`. If it is a JPEG, convert it first —
   the script's decoder only reads PNG:

   ```powershell
   Add-Type -AssemblyName System.Drawing
   $i = [System.Drawing.Image]::FromFile("assets\signature-raw.png.jpeg")
   $i.Save("assets\signature-raw.png", [System.Drawing.Imaging.ImageFormat]::Png)
   ```

2. If the signature sits somewhere else in the frame, update `CROP` at the top of
   `prepare-signature.cjs` to the box containing it.

3. Run it:

   ```bash
   node scripts/prepare-signature.cjs .
   ```

   It writes `public/signature.png` — 520×211, transparent, about 10 KB.

The bill shows the signature above the "For Umer Enterprises" line. If `public/signature.png` is
missing, the bill falls back to a blank signing space rather than a broken image.

## Retaking the photo

If the result looks patchy, the input is usually the problem. A better source photo:

- plain **white unlined paper** rather than a ruled notebook,
- **even light**, no shadow falling across the paper,
- shot straight down, not at an angle,
- sign **thickly and slowly** so the ink is solid.
