/* Minimal Node smoke test for the AttrCM-LivingMeta statistical engines.
 *
 * No test framework required: run with `node test/smoke.test.js`.
 * Exits non-zero on the first failed assertion.
 *
 * Covers:
 *   - module load (no document required; bootstrap must self-guard)
 *   - logit / invLogit round-trip
 *   - DTA DOR identity: log(DOR) === logit(Se) + logit(Sp)  (DOR = exp(mu1 + mu2))
 *   - poolDLRE fixed/random-effect pooling on a known 2-study case
 */
'use strict';

const path = require('path');
const assert = require('assert');

let failures = 0;
function ok(name, cond) {
  if (cond) { console.log('  PASS  ' + name); }
  else { console.error('  FAIL  ' + name); failures++; }
}
function approx(a, b, tol) { return Math.abs(a - b) < (tol == null ? 1e-9 : tol); }

// --- load the engine (bootstrap is document-guarded). The IIFE binds its
//     export object to `this`, which under CommonJS is the loaded file's
//     module.exports — so `require` returns it directly. ---
const root = path.resolve(__dirname, '..');
const DTABivariate = require(path.join(root, 'assets', 'vendor', 'dta-bivariate.js')).DTABivariate
  || global.DTABivariate;

ok('module loaded and exposed DTABivariate', !!(DTABivariate && DTABivariate.__test__));

const T = DTABivariate.__test__;

// --- logit / invLogit round-trip ---
{
  const p = 0.73;
  ok('logit/invLogit round-trip', approx(T.invLogit(T.logit(p)), p, 1e-12));
}

// --- DOR identity: log(DOR) = logit(Se) + logit(Sp) ---
{
  const Se = 0.85, Sp = 0.90;
  const DOR = (Se * Sp) / ((1 - Se) * (1 - Sp)); // direct definition
  const logDOR_via_sum = T.logit(Se) + T.logit(Sp);
  ok('DOR = exp(logitSe + logitSp)', approx(Math.exp(logDOR_via_sum), DOR, 1e-9));
}

// --- poolDLRE: identical studies -> pooled mean equals their common value, tau2=0 ---
{
  const yi = [0.5, 0.5];
  const vi = [0.04, 0.04];
  const pool = T.poolDLRE(yi, vi);
  ok('poolDLRE returns object for k=2', pool != null);
  ok('poolDLRE pooled mean of identical studies', approx(pool.mean, 0.5, 1e-9));
  ok('poolDLRE tau2 = 0 when no heterogeneity', approx(pool.tau2, 0, 1e-9));
  // FE SE for two equal vi=0.04 -> 1/(1/0.04 + 1/0.04) = 0.02 -> se = sqrt(0.02)
  ok('poolDLRE SE for two equal studies', approx(pool.se, Math.sqrt(0.02), 1e-9));
}

// --- poolDLRE guards k<2 ---
{
  ok('poolDLRE returns null for k=1', T.poolDLRE([0.5], [0.04]) === null);
}

if (failures) {
  console.error('\n' + failures + ' assertion(s) failed.');
  process.exit(1);
}
console.log('\nAll smoke assertions passed.');
