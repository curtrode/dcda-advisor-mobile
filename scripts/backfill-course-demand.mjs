#!/usr/bin/env node

/**
 * Backfill course demand aggregates from existing dcda_submissions.
 *
 * Reads all anonymous submissions and writes aggregated scheduled/completed
 * course counts to dcda_analytics/course_demand/terms/{termId}.
 *
 * Usage:
 *   node scripts/backfill-course-demand.mjs              # write to current term
 *   node scripts/backfill-course-demand.mjs --dry-run    # preview only, no writes
 *   node scripts/backfill-course-demand.mjs --term fa26  # override target term
 *
 * Requires: firebase-admin (uses Application Default Credentials)
 * Run: gcloud auth application-default login   (if not already authenticated)
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    term:      { type: 'string' },
    help:      { type: 'boolean', short: 'h' },
  },
})

if (values.help) {
  console.log(`Backfill course demand from existing dcda_submissions.

Usage:
  node scripts/backfill-course-demand.mjs              Write to current term
  node scripts/backfill-course-demand.mjs --dry-run    Preview, no writes
  node scripts/backfill-course-demand.mjs --term fa26  Override target term`)
  process.exit(0)
}

function getNextTerm() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const yy = (y) => y.toString().slice(-2)
  if (month >= 8) return `sp${yy(year + 1)}`
  return `fa${yy(year)}`
}

initializeApp({
  credential: applicationDefault(),
  projectId: 'dcda-advisor-mobile',
})

const db = getFirestore()

async function main() {
  const termId = values.term ?? getNextTerm()
  const dryRun = values['dry-run']

  console.log(`\nBackfilling course demand → term: ${termId}`)
  if (dryRun) console.log('(dry run — no writes)\n')

  // Read all anonymous submissions
  const subsSnap = await db.collection('dcda_submissions').get()
  console.log(`Found ${subsSnap.size} submissions\n`)

  if (subsSnap.empty) {
    console.log('No submissions to aggregate.')
    return
  }

  // Aggregate scheduled and completed course counts
  const scheduled = {}
  const completed = {}
  for (const doc of subsSnap.docs) {
    const data = doc.data()
    for (const code of data.scheduledCourseCodes ?? []) {
      scheduled[code] = (scheduled[code] ?? 0) + 1
    }
    for (const code of data.completedCourseCodes ?? []) {
      completed[code] = (completed[code] ?? 0) + 1
    }
  }

  console.log(`Unique scheduled courses: ${Object.keys(scheduled).length}`)
  console.log(`Unique completed courses:  ${Object.keys(completed).length}`)

  // Preview top 10 scheduled
  const topScheduled = Object.entries(scheduled).sort(([, a], [, b]) => b - a).slice(0, 10)
  if (topScheduled.length > 0) {
    console.log('\nTop scheduled courses:')
    for (const [code, count] of topScheduled) {
      console.log(`  ${code}: ${count}`)
    }
  }

  if (dryRun) {
    console.log('\nDry run complete — no data written.')
    return
  }

  // Write to Firestore — plain counts (not FieldValue.increment) since this
  // is a full backfill from a snapshot. Safe to run multiple times: merge:true
  // means re-running overwrites with the same correct values.
  const demandRef = db
    .collection('dcda_analytics')
    .doc('course_demand')
    .collection('terms')
    .doc(termId)

  const payload = {}
  if (Object.keys(scheduled).length > 0) payload.scheduled = scheduled
  if (Object.keys(completed).length > 0) payload.completed = completed

  await demandRef.set(payload, { merge: true })
  console.log(`\nWritten to dcda_analytics/course_demand/terms/${termId}`)
  console.log('Verify with: node scripts/read-analytics.mjs')
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
