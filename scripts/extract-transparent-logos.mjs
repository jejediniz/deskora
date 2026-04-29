/**
 * Gera PNGs com fundo transparente a partir dos JPEGs da marca.
 * Usa superamostragem 2x + leve sharpen para legibilidade ao reduzir no CSS.
 * Executar na raiz: node scripts/extract-transparent-logos.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const imgDir = path.join(root, "public", "img");

/** Escala interna para o símbolo (ícone / rodapé). */
const UPSCALE = 2;

/** Wordmark escuro (header/login): mais pixels para downscale nítido em HiDPI. */
const WORDMARK_UPSCALE = 3;

/** Wordmark claro: mantém 2× (fonte 1024²; 3× infla trim/alpha no pipeline claro). */
const WORDMARK_LIGHT_UPSCALE = 2;

function featherAlpha(t, lo, hi) {
  if (t <= lo) return 0;
  if (t >= hi) return 255;
  return Math.round(((t - lo) / (hi - lo)) * 255);
}

async function writePngFromRgba(out, w, h, destPath) {
  await sharp(out, {
    raw: { width: w, height: h, channels: 4 },
  })
    .trim()
    .png({
      compressionLevel: 6,
      adaptiveFiltering: true,
      palette: false,
    })
    .sharpen({ sigma: 0.6, m1: 0.5, m2: 3, x1: 3, y2: 15, y3: 15 })
    .toFile(destPath);

  const meta = await sharp(destPath).metadata();
  console.info("wrote", path.relative(root, destPath), `${meta.width}x${meta.height}`);
}

/**
 * Remove fundo escuro (preto / quase preto).
 */
async function removeDarkBackground(srcPath, destPath, opts = {}) {
  const lo = opts.lo ?? 36;
  const hi = opts.hi ?? 54;
  const upscale = opts.upscale ?? UPSCALE;
  let pipeline = sharp(srcPath).ensureAlpha();

  if (upscale > 1) {
    const meta = await pipeline.metadata();
    const tw = Math.round((meta.width || 1024) * upscale);
    const th = Math.round((meta.height || 1024) * upscale);
    pipeline = sharp(await pipeline.resize(tw, th, { kernel: sharp.kernel.lanczos3 }).toBuffer()).ensureAlpha();
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  const { width: w, height: h } = info;

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const mx = Math.max(r, g, b);
    const a = featherAlpha(mx, lo, hi);
    out[i + 3] = Math.min(out[i + 3], a);
  }

  await writePngFromRgba(out, w, h, destPath);
}

/**
 * Remove fundo claro (branco / quase branco).
 * Usa (255 - min(rgb)): fundo claro → min alto → transparência.
 */
async function removeLightBackground(srcPath, destPath, opts = {}) {
  const lo = opts.lo ?? 6;
  const hi = opts.hi ?? 38;
  const upscale = opts.upscale ?? UPSCALE;
  let pipeline = sharp(srcPath).ensureAlpha();

  if (upscale > 1) {
    const meta = await pipeline.metadata();
    const tw = Math.round((meta.width || 1024) * upscale);
    const th = Math.round((meta.height || 1024) * upscale);
    pipeline = sharp(await pipeline.resize(tw, th, { kernel: sharp.kernel.lanczos3 }).toBuffer()).ensureAlpha();
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  const { width: w, height: h } = info;

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const mn = Math.min(r, g, b);
    const t = 255 - mn;
    const a = featherAlpha(t, lo, hi);
    out[i + 3] = Math.min(out[i + 3], a);
  }

  await writePngFromRgba(out, w, h, destPath);
}

async function main() {
  if (!fs.existsSync(imgDir)) {
    console.error("missing", imgDir);
    process.exit(1);
  }

  const darkUiSrc = path.join(imgDir, "operadesk-logo-on-dark.jpg");
  const lightUiSrc = path.join(imgDir, "operadesk-logo-on-light.jpg");
  const symbolLightSrc = path.join(imgDir, "operadesk-symbol-on-light.jpg");

  const darkUiOut = path.join(imgDir, "operadesk-wordmark-dark-ui.png");
  const lightUiOut = path.join(imgDir, "operadesk-wordmark-light-ui.png");
  const symbolOut = path.join(imgDir, "operadesk-symbol-transparent.png");

  if (fs.existsSync(darkUiSrc)) {
    await removeDarkBackground(darkUiSrc, darkUiOut, { upscale: WORDMARK_UPSCALE });
  } else {
    console.warn("skip (missing):", darkUiSrc);
  }

  if (fs.existsSync(lightUiSrc)) {
    await removeLightBackground(lightUiSrc, lightUiOut, { upscale: WORDMARK_LIGHT_UPSCALE });
  } else {
    console.warn("skip (missing):", lightUiSrc);
  }

  if (fs.existsSync(symbolLightSrc)) {
    await removeLightBackground(symbolLightSrc, symbolOut, { lo: 5, hi: 36 });
    const iconDest = path.join(root, "app", "icon.png");
    await fs.promises.copyFile(symbolOut, iconDest);
    console.info("wrote", path.relative(root, iconDest));
  } else {
    console.warn("skip (missing):", symbolLightSrc);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
