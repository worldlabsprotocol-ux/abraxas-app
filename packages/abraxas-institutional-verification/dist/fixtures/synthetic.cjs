'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
// src/fixtures/synthetic.ts
var fixtureDir = path.join(path.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('synthetic.cjs', document.baseURI).href)))), "../../fixtures/synthetic");
var SYNTHETIC_FIXTURE_NOTICE = "Synthetic Ed25519 keys and receipts for local SDK smoke tests only. Never use in production.";
var SYNTHETIC_PARTNER_ID = "institutional-rp-example";
var SYNTHETIC_POLICY_ID = "institutional-age-21-v1";
var SYNTHETIC_FIXTURE_NOW_ISO = "2026-06-15T12:00:00.000Z";
function loadSyntheticTrustRegistryJson() {
  return fs.readFileSync(path.join(fixtureDir, "trust-registry.json"), "utf8");
}
function loadSyntheticSignedReceipt() {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, "signed-receipt.valid.json"), "utf8"));
}
function loadSyntheticDigestPin() {
  return fs.readFileSync(path.join(fixtureDir, "trust-digest-v2.txt"), "utf8").trim();
}

exports.SYNTHETIC_FIXTURE_NOTICE = SYNTHETIC_FIXTURE_NOTICE;
exports.SYNTHETIC_FIXTURE_NOW_ISO = SYNTHETIC_FIXTURE_NOW_ISO;
exports.SYNTHETIC_PARTNER_ID = SYNTHETIC_PARTNER_ID;
exports.SYNTHETIC_POLICY_ID = SYNTHETIC_POLICY_ID;
exports.loadSyntheticDigestPin = loadSyntheticDigestPin;
exports.loadSyntheticSignedReceipt = loadSyntheticSignedReceipt;
exports.loadSyntheticTrustRegistryJson = loadSyntheticTrustRegistryJson;
//# sourceMappingURL=synthetic.cjs.map
//# sourceMappingURL=synthetic.cjs.map