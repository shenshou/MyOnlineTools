import fs from 'node:fs';

const auditPath = process.argv[2] ?? 'npm-audit.json';
const allowedAdvisory = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const threshold = new Set(['moderate', 'high', 'critical']);

let audit;
try {
  audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
} catch (error) {
  console.error(`Unable to read npm audit JSON: ${error.message}`);
  process.exit(1);
}

if (audit.error) {
  console.error('npm audit could not complete:', audit.error.summary ?? audit.error.code ?? audit.error);
  process.exit(1);
}

const vulnerabilities = audit.vulnerabilities ?? {};

function isOnlyAllowlistedAdvisory(name, seen = new Set()) {
  if (seen.has(name)) return false;
  const vulnerability = vulnerabilities[name];
  if (!vulnerability || !Array.isArray(vulnerability.via) || vulnerability.via.length === 0) {
    return false;
  }

  const nextSeen = new Set(seen);
  nextSeen.add(name);

  return vulnerability.via.every((item) => {
    if (typeof item === 'string') {
      return isOnlyAllowlistedAdvisory(item, nextSeen);
    }

    return item
      && typeof item === 'object'
      && item.url === allowedAdvisory
      && item.name === 'picomatch';
  });
}

const blocking = [];
const ignored = [];

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if (!threshold.has(vulnerability.severity)) continue;

  if (isOnlyAllowlistedAdvisory(name)) {
    ignored.push(name);
  } else {
    blocking.push(`${name} (${vulnerability.severity})`);
  }
}

if (ignored.length > 0) {
  console.warn(`Temporarily allowlisted GHSA-fc5q-39xc-vjpf affecting: ${ignored.join(', ')}`);
}

if (blocking.length > 0) {
  console.error('Blocking npm audit findings:', blocking.join(', '));
  process.exit(1);
}

console.log('npm audit passed: no non-allowlisted moderate-or-higher vulnerabilities.');
