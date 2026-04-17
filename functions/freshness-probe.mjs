#!/usr/bin/env node
/**
 * End-to-end freshness test: simulates an admin.html edit and verifies it
 * appears in the manifest on the very next fetch.
 *
 * Must be run under firebase emulators:exec (which sets FIRESTORE_EMULATOR_HOST).
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('FIRESTORE_EMULATOR_HOST not set — run under firebase emulators:exec');
  process.exit(1);
}

const MANIFEST_URL = 'http://localhost:5500/api/advising-manifest.json';

initializeApp({ projectId: 'dcda-advisor-mobile' });
const db = getFirestore();

async function fetchManifest() {
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`);
  return res.json();
}

function highlightedCountForTerm(manifest, termLabel) {
  const program = manifest.programs.find((p) => p.id === 'dcda-major');
  const entry = (program.highlightedCourses || []).find((t) => t.term === termLabel);
  return entry ? entry.courses.length : 0;
}

async function main() {
  const m1 = await fetchManifest();
  const initial = highlightedCountForTerm(m1, 'Fall 2026');
  console.log(`Initial Fall 2026 highlighted count: ${initial}`);

  const ref = db.collection('dcda_config').doc('offerings_fa26');
  const snap = await ref.get();
  const before = snap.data();
  const newSection = {
    code: 'DCDA 99999',
    section: 'TEST',
    title: 'Freshness Test Course',
    schedule: 'MWF 9:00-9:50',
    modality: 'Face to Face',
    enrollment: '0/25',
  };
  await ref.set({
    ...before,
    offeredCodes: [...before.offeredCodes, 'DCDA 99999'].sort(),
    sections: [...before.sections, newSection],
  });
  console.log('Injected new section DCDA 99999 into dcda_config/offerings_fa26');

  const m2 = await fetchManifest();
  const after = highlightedCountForTerm(m2, 'Fall 2026');
  console.log(`After-edit Fall 2026 highlighted count: ${after}`);

  if (after !== initial + 1) {
    console.error(`FAIL: expected ${initial + 1}, got ${after}`);
    process.exit(1);
  }

  const injected = m2.programs[0].highlightedCourses
    .find((t) => t.term === 'Fall 2026')
    .courses.find((c) => c.code === 'DCDA 99999');
  if (!injected) {
    console.error('FAIL: injected course not found in manifest');
    process.exit(1);
  }
  console.log(`PASS: injected course surfaced in manifest (title="${injected.title}")`);
}

main().catch((err) => {
  console.error('Test error:', err.message);
  process.exit(1);
});
