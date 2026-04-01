#!/usr/bin/env node
// scripts/generate-icons.js
// Run: node scripts/generate-icons.js
// Generates placeholder PNG icons from an SVG source.
// Replace the SVG below with your real logo before production.

const fs   = require('fs');
const path = require('path');

const SIZES = [72, 96, 120, 128, 144, 152, 180, 192, 512];
const OUT   = path.join(__dirname, '../public/icons');

// SVG source — black background, "DR" in accent yellow-green
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000"/>
  <rect x="40" y="460" width="432" height="8" fill="#CDFF00"/>
  <text x="256" y="300" text-anchor="middle" 
    font-family="Arial Black, sans-serif" font-weight="900"
    font-size="220" fill="#CDFF00" letter-spacing="-8">DR</text>
  <text x="256" y="390" text-anchor="middle"
    font-family="Arial, sans-serif" font-weight="400"
    font-size="42" fill="#555555" letter-spacing="12">RUNNERS</text>
</svg>`;

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Write SVG versions (browsers can use these too)
SIZES.forEach((size) => {
  const svgPath = path.join(OUT, `icon-${size}.svg`);
  fs.writeFileSync(svgPath, svg(size), 'utf8');
  console.log(`✓ icon-${size}.svg`);
});

// Also write the maskable variant (same design with more padding)
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#000000"/>
  <rect x="60" y="440" width="392" height="6" fill="#CDFF00"/>
  <text x="256" y="290" text-anchor="middle"
    font-family="Arial Black, sans-serif" font-weight="900"
    font-size="190" fill="#CDFF00" letter-spacing="-6">DR</text>
  <text x="256" y="370" text-anchor="middle"
    font-family="Arial, sans-serif" font-weight="400"
    font-size="36" fill="#555555" letter-spacing="10">RUNNERS</text>
</svg>`;

fs.writeFileSync(path.join(OUT, 'icon-512-maskable.svg'), maskable, 'utf8');
console.log('✓ icon-512-maskable.svg');

console.log('\nAll SVG icons generated in public/icons/');
console.log('NOTE: For production, convert SVGs to PNGs using:');
console.log('  npx sharp-cli --input public/icons/icon-{size}.svg --output public/icons/icon-{size}.png');
console.log('  Or use https://realfavicongenerator.net with your logo.\n');
