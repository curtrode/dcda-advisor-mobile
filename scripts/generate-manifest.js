#!/usr/bin/env node

/**
 * Manifest Generator for TCU DCDA Department Wizard
 *
 * Reads data from data/ and generates public/advising-manifest.json
 * Validates output against schemas/manifest.schema.json
 *
 * Part of the AddRan Advising Ecosystem integration (Phase 2)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Paths
const DATA_DIR = join(projectRoot, 'data');
const SCHEMA_PATH = join(projectRoot, 'schemas', 'manifest.schema.json');
const OUTPUT_PATH = join(projectRoot, 'public', 'advising-manifest.json');

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

console.log('TCU DCDA Department - Manifest Generator\n');

const courses = loadJSON('courses.json');
const requirements = loadJSON('requirements.json');
const offerings = loadJSON('offerings-sp26.json');
const contacts = loadJSON('contacts.json');
const careerOptions = loadJSON('career-options.json');

console.log('Loaded all data files');

// Build course lookup by code
const courseLookup = new Map();
for (const course of courses) {
  courseLookup.set(course.code, course);
}

// Build set of currently offered course codes
const offeredCodes = new Set(offerings.offeredCodes || []);

// Build section lookup for offered courses
const sectionLookup = new Map();
for (const section of (offerings.sections || [])) {
  if (!sectionLookup.has(section.code)) {
    sectionLookup.set(section.code, []);
  }
  sectionLookup.get(section.code).push(section);
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
    `Current semester offerings (${offerings.term}): ${offerings.offeredCodes?.length || 0} DCDA-approved courses available`,
  ];

  // Add highlighted courses from current offerings
  if (offerings.sections?.length > 0) {
    // Attach highlighted courses to both programs
    const highlightedCourses = {
      term: offerings.term,
      courses: offerings.sections.map(s => {
        const hours = parseHours(s.code);
        const course = {
          code: s.code,
          title: s.title,
          hours,
        };
        if (s.schedule) course.schedule = s.schedule.replace(/\n/g, ' ');
        if (s.modality) course.modality = s.modality;
        if (s.enrollment) course.enrollment = s.enrollment.replace(/\n/g, '/');
        if (s.status) course.status = s.status;
        return course;
      }),
    };

    for (const program of manifest.programs) {
      program.highlightedCourses = highlightedCourses;
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
