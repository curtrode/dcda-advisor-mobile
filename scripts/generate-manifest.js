#!/usr/bin/env node

/**
 * Manifest Generator for TCU DCDA Department Wizard
 *
 * Reads data from data/ and generates public/advising-manifest.json
 * Validates output against schemas/manifest.schema.json
 *
 * Part of the AddRan Advising Ecosystem integration (Phase 2)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Paths
const DATA_DIR = join(projectRoot, 'data');
const SCHEMA_PATH = join(projectRoot, 'schemas', 'manifest.schema.json');
const OUTPUT_PATH = join(projectRoot, 'public', 'advising-manifest.json');

// Firestore holds the canonical offerings data (dcda_config/offerings_*).
// Uses Application Default Credentials — run `gcloud auth application-default login`
// on this machine if the fetch below fails with an auth error.
initializeApp({
  credential: applicationDefault(),
  projectId: 'dcda-advisor-mobile',
});
const db = getFirestore();

// Load data files
function loadJSON(filename) {
  const path = join(DATA_DIR, filename);
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error.message);
    process.exit(1);
  }
}

/**
 * Fetch all dcda_config/offerings_* docs from Firestore and return the ones
 * whose term has not yet started. Sandra is forward-looking — students use
 * her to plan what to register for next — so the manifest only exposes
 * upcoming terms. Students with current-semester questions use the wizard
 * UI directly, which reads Firestore live.
 *
 * Doc IDs: offerings_{sp|su|fa}{yy} (e.g. offerings_fa26). The doc ID is the
 * source of truth for which term a doc represents; the doc's `term` string
 * field is ignored because it's user-editable and has been observed to drift.
 *
 * Approximate TCU term start dates: sp → Jan 15, su → May 20, fa → Aug 20.
 */
async function fetchUpcomingOfferings() {
  const SEASON_ORDER = { sp: 0, su: 1, fa: 2 };
  const SEASON_LABEL = { sp: 'Spring', su: 'Summer', fa: 'Fall' };

  function termStartDate(season, yy) {
    const year = 2000 + yy;
    if (season === 'sp') return new Date(year, 0, 15);  // Jan 15
    if (season === 'su') return new Date(year, 4, 20);  // May 20
    if (season === 'fa') return new Date(year, 7, 20);  // Aug 20
    return null;
  }

  const snap = await db.collection('dcda_config').get();
  const now = new Date();
  const terms = [];

  snap.forEach(doc => {
    const match = doc.id.match(/^offerings_(sp|su|fa)(\d{2})$/);
    if (!match) return;
    const season = match[1];
    const yy = parseInt(match[2], 10);
    const startDate = termStartDate(season, yy);
    if (!startDate || startDate < now) return;
    terms.push({
      docId: doc.id,
      season,
      yy,
      sortKey: yy * 10 + SEASON_ORDER[season],
      label: `${SEASON_LABEL[season]} 20${yy}`,
      data: doc.data(),
    });
  });

  terms.sort((a, b) => a.sortKey - b.sortKey);
  return terms;
}

console.log('TCU DCDA Department - Manifest Generator\n');

console.log('Fetching upcoming offerings from Firestore...');
let upcomingOfferings;
try {
  upcomingOfferings = await fetchUpcomingOfferings();
} catch (err) {
  // CI fallback: GitHub Actions (and most CI providers) set CI=true and don't
  // have Application Default Credentials. In that case, skip regeneration and
  // leave the committed manifest in place — the build contract is that the
  // wizard maintainer runs `npm run generate-manifest` locally and commits
  // public/advising-manifest.json before pushing content changes.
  if (process.env.CI === 'true' && existsSync(OUTPUT_PATH)) {
    console.warn('\nWARNING: Firestore unreachable — using committed manifest as-is.');
    console.warn(`  Reason: ${err.message}`);
    console.warn(`  Manifest: ${OUTPUT_PATH}`);
    console.warn('  Regenerate and commit locally before pushing new offerings content.\n');
    process.exit(0);
  }

  console.error('\nFailed to read dcda_config from Firestore:');
  console.error(`  ${err.message}`);
  console.error('\nThis script requires Application Default Credentials.');
  console.error('Run: gcloud auth application-default login');
  console.error('Then rerun: npm run generate-manifest\n');
  process.exit(1);
}
if (upcomingOfferings.length === 0) {
  console.warn('Warning: no upcoming offerings found in Firestore dcda_config collection');
} else {
  console.log(`Fetched ${upcomingOfferings.length} upcoming term(s): ${upcomingOfferings.map(t => t.label).join(', ')}`);
}

const courses = loadJSON('courses.json');
const requirements = loadJSON('requirements.json');
const contacts = loadJSON('contacts.json');
const careerOptions = loadJSON('career-options.json');

console.log('Loaded all data files');

// Build course lookup by code
const courseLookup = new Map();
for (const course of courses) {
  courseLookup.set(course.code, course);
}

/**
 * Parse credit hours from a course code (e.g., "ENGL 20813" -> 3)
 * TCU codes: last digit is the credit hours
 * Codes ending in 0 are variable-credit — default to 3
 */
function parseHours(code) {
  const match = code.match(/\d+$/);
  if (match) {
    const lastDigit = parseInt(match[0].slice(-1), 10);
    if (lastDigit >= 1 && lastDigit <= 6) return lastDigit;
  }
  return 3; // default for variable-credit (codes ending in 0) or unparseable
}

/**
 * Determine division level from course code
 * TCU: 10000-20000 = lower, 30000+ = upper
 */
function parseLevel(code) {
  const match = code.match(/(\d{5})/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num < 30000 ? 'lower' : 'upper';
  }
  return undefined;
}

/**
 * Build a manifest course object from a course code
 */
function buildCourse(code) {
  const catalogEntry = courseLookup.get(code);
  const hours = parseHours(code);
  const level = parseLevel(code);

  const course = {
    code,
    title: catalogEntry ? catalogEntry.title : code,
    hours,
  };

  if (level) course.level = level;
  if (catalogEntry?.description) course.description = catalogEntry.description;
  if (catalogEntry?.category) course.category = catalogEntry.category;

  return course;
}

/**
 * Build requirement categories from DCDA requirements structure.
 *
 * DCDA has: required.categories + electives.categories + generalElectives
 * Schema expects: a flat array of { id, name, hours, courses[] }
 */
function buildRequirementCategories(reqData) {
  const categories = [];

  // Required categories (intro, statistics, coding, mmAuthoring, capstone)
  if (reqData.required?.categories) {
    for (const cat of reqData.required.categories) {
      categories.push({
        id: cat.id,
        name: cat.name,
        hours: cat.hours,
        courses: cat.courses.map(code => buildCourse(code)),
        ...(cat.selectOne && { note: 'Select one course from this category' }),
      });
    }
  }

  // Elective categories (DC elective, DA elective) — major only
  if (reqData.electives?.categories) {
    for (const cat of reqData.electives.categories) {
      // These reference a category from the course catalog, not specific codes
      const categoryCourses = courses
        .filter(c => c.category === cat.category)
        .map(c => buildCourse(c.code));

      categories.push({
        id: cat.id,
        name: cat.name,
        hours: cat.hours,
        courses: categoryCourses,
        note: `Select ${cat.count} course(s) from ${cat.category} electives`,
      });
    }
  }

  // General electives
  if (reqData.generalElectives) {
    const ge = reqData.generalElectives;
    // All DCDA-approved courses from any category
    const allCourses = courses.map(c => buildCourse(c.code));

    categories.push({
      id: 'generalElectives',
      name: ge.name,
      hours: ge.hours,
      courses: allCourses,
      note: ge.note || `Select ${ge.count} course(s) from any DCDA-approved category`,
    });
  }

  return categories;
}

/**
 * Build prerequisites mapping from DCDA requirements
 */
function buildPrerequisites(reqData) {
  const prereqs = {};

  // From requirement categories with prerequisites
  if (reqData.required?.categories) {
    for (const cat of reqData.required.categories) {
      if (cat.prerequisites) {
        // Map category prerequisites to course codes
        for (const courseCode of cat.courses) {
          prereqs[courseCode] = cat.prerequisites.map(prereqId => {
            const prereqCat = reqData.required.categories.find(c => c.id === prereqId);
            return prereqCat ? prereqCat.courses : [];
          }).flat();
        }
      }
    }
  }

  return prereqs;
}

// Generate the manifest
function generateManifest() {
  const manifest = {
    manifestVersion: '1.0',
    department: 'Digital Culture and Data Analytics',
    lastUpdated: new Date().toISOString(),
    wizardUrl: 'https://dcda-advisor-mobile.web.app',
    programs: [],
  };

  // Program configs: major and minor
  const programConfigs = [
    {
      key: 'major',
      id: 'dcda-major',
      name: 'Digital Culture and Data Analytics',
      abbreviation: 'DCDA',
      degree: 'Major',
      url: 'https://addran.tcu.edu/dcda/',
    },
    {
      key: 'minor',
      id: 'dcda-minor',
      name: 'Digital Culture and Data Analytics',
      abbreviation: 'DCDA',
      degree: 'Minor',
      url: 'https://addran.tcu.edu/dcda/',
    },
  ];

  for (const config of programConfigs) {
    const reqData = requirements[config.key];
    if (!reqData) {
      console.warn(`Warning: No requirements found for '${config.key}'`);
      continue;
    }

    const program = {
      id: config.id,
      name: config.name,
      abbreviation: config.abbreviation,
      degree: config.degree,
      totalHours: reqData.totalHours,
      url: config.url,
      descriptions: [
        'The Digital Culture and Data Analytics (DCDA) program prepares students to engage critically and creatively with digital technologies and data. Students choose from courses across multiple colleges spanning digital culture, data analytics, and multimedia authoring.',
      ],
      careerOptions: careerOptions[config.key] || [],
      contacts,
      requirements: {
        categories: buildRequirementCategories(reqData),
      },
      prerequisites: buildPrerequisites(reqData),
    };

    manifest.programs.push(program);
  }

  // Add course catalog (full catalog for deep questions)
  manifest.courseCatalog = courses.map(c => ({
    code: c.code,
    title: c.title,
    hours: parseHours(c.code),
    level: parseLevel(c.code),
    description: c.description,
  }));

  // Add advising notes
  manifest.advisingNotes = [
    'DCDA Major requires 33 credit hours; Minor requires 21 credit hours',
    'Capstone (DCDA 40833) requires completion of both Statistics and Coding categories',
    'Students may not receive credit for both MATH 10043 and INSC 20153',
    'Students may not receive credit for both DCDA 20833 and WRIT 20833',
    'DSGN courses: contact Tyra Musoma (t.musoma@tcu.edu) to be placed on waiting list — DSGN majors have priority enrollment',
    'STCO courses: contact the instructor of record to be placed on waiting list',
    `Upcoming term offerings: ${upcomingOfferings.map(t => `${t.label} (${(t.data.offeredCodes || []).length} courses)`).join('; ') || 'none on file'}`,
  ];

  // Highlighted courses across all upcoming terms — array of {term, courses}.
  // Older manifest consumers expected a single {term, courses} object; the
  // schema's oneOf accepts both shapes, and Sandra's converter handles either.
  const highlightedByTerm = upcomingOfferings
    .filter(t => (t.data.sections || []).length > 0)
    .map(t => ({
      term: t.label,
      courses: t.data.sections.map(s => {
        const hours = parseHours(s.code);
        const course = {
          code: s.code,
          title: s.title,
          hours,
        };
        if (s.schedule) course.schedule = s.schedule.replace(/\n/g, ' ');
        if (s.modality) course.modality = s.modality;
        // status and enrollment intentionally omitted — they're point-in-time
        // snapshots that go stale as students register
        return course;
      }),
    }));

  if (highlightedByTerm.length > 0) {
    for (const program of manifest.programs) {
      program.highlightedCourses = highlightedByTerm;
    }
  }

  return manifest;
}

const manifest = generateManifest();

console.log(`Generated manifest with ${manifest.programs.length} programs`);

// Validate against schema
console.log('\nValidating manifest against schema...');

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(manifest);

if (!valid) {
  console.error('Manifest validation failed:\n');
  validate.errors.forEach(error => {
    console.error(`  - ${error.instancePath || '(root)'}: ${error.message}`);
    if (error.params) {
      console.error(`    ${JSON.stringify(error.params)}`);
    }
  });
  console.error('\nFix the errors above and try again.');
  process.exit(1);
}

console.log('Manifest validation passed');

// Ensure public directory exists
try {
  mkdirSync(join(projectRoot, 'public'), { recursive: true });
} catch {
  // Directory exists
}

// Write manifest
try {
  writeFileSync(OUTPUT_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`\nManifest written to: ${OUTPUT_PATH}`);

  // Print summary
  console.log('\nManifest Summary:');
  console.log(`  Version: ${manifest.manifestVersion}`);
  console.log(`  Department: ${manifest.department}`);
  console.log(`  Programs: ${manifest.programs.length}`);
  manifest.programs.forEach(p => {
    console.log(`    - ${p.name} (${p.degree}) — ${p.totalHours} hours`);
  });
  console.log(`  Course Catalog: ${manifest.courseCatalog.length} courses`);
  console.log(`  Last Updated: ${manifest.lastUpdated}`);
  console.log('\nManifest generation complete!\n');
} catch (error) {
  console.error('Error writing manifest:', error.message);
  process.exit(1);
}
