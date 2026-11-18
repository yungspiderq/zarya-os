'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = filename => fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
const css = read('css/components.css');
const component = read('js/components.js');
const page = read('index.html');

// Regression: a tall catalog used to be clipped by .win-body {overflow:hidden}.
const shopBlock = css.match(/\.parts-app\s*\{([^}]+)\}/);
assert.ok(shopBlock, 'the store needs its own scroll viewport');
assert.match(shopBlock[1], /height\s*:\s*100%\s*;/);
assert.match(shopBlock[1], /min-height\s*:\s*0\s*;/);
assert.match(shopBlock[1], /overflow-y\s*:\s*auto\s*;/);
assert.match(shopBlock[1], /overflow-x\s*:\s*hidden\s*;/);
assert.match(css, /\.parts-app\s+\.part-products[\s\S]*?flex-shrink\s*:\s*0/);
assert.match(css, /\.parts-app\s+\.part-categories\s*\{[^}]*position\s*:\s*sticky/);
assert.ok(component.includes('class="app parts-app" tabindex="0"'), 'shop must accept keyboard focus');
assert.match(page, /href="css\/components\.css\?v=1\.8\.0"/);
console.log('Component shop scroll CSS and keyboard navigation regression checks passed.');
