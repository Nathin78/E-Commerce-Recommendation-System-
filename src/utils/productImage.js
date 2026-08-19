const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" rx="36" fill="#f8fafc"/>
  <rect x="36" y="36" width="728" height="528" rx="28" fill="url(#g)" opacity="0.12"/>
  <circle cx="400" cy="238" r="92" fill="url(#g)" opacity="0.22"/>
  <path d="M292 362c0-60 48-108 108-108s108 48 108 108v28H292v-28Z" fill="url(#g)" opacity="0.25"/>
  <rect x="250" y="390" width="300" height="26" rx="13" fill="url(#g)" opacity="0.35"/>
  <text x="400" y="500" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#334155">Image unavailable</text>
</svg>`.trim();

export const PRODUCT_PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

export function getProductImageSrc(src) {
  return typeof src === "string" && src.trim() ? src : PRODUCT_PLACEHOLDER_IMAGE;
}

