import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const contacts = JSON.parse(readFileSync(join(__dirname, 'contacts.json'), 'utf-8'));
const careerOptions = JSON.parse(readFileSync(join(__dirname, 'career-options.json'), 'utf-8'));
const schema = JSON.parse(readFileSync(join(__dirname, 'manifest.schema.json'), 'utf-8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

const SEASON_ORDER = { sp: 0, su: 1, fa: 2 };
const SEASON_LABEL = { sp: 'Spring', su: 'Summer', fa: 'Fall' };

export function termStartDate(season, yy) {
  const year = 2000 + yy;
  if (season === 'sp') return new Date(year, 0, 15);
  if (season === 'su') return new Date(year, 4, 20);
  if (season === 'fa') return new Date(year, 7, 20);
  return null;
}

export function parseHours(code) {
  const match = code.match(/\d+$/);
  if (match) {
    const lastDigit = parseInt(match[0].slice(-1), 10);
    if (lastDigit >= 1 && lastDigit <= 6) return lastDigit;
  }
  return 3;
}

export function parseLevel(code) {
  const match = code.match(/(\d{5})/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num < 30000 ? 'lower' : 'upper';
  }
  return undefined;
}

export function buildCourseFactory(courses) {
  const lookup = new Map(courses.map((c) => [c.code, c]));
  return function buildCourse(code) {
    const catalogEntry = lookup.get(code);
    const course = {
      code,
      title: catalogEntry ? catalogEntry.title : code,
      hours: parseHours(code),
    };
    const level = parseLevel(code);
    if (level) course.level = level;
    if (catalogEntry?.description) course.description = catalogEntry.description;
    if (catalogEntry?.category) course.category = catalogEntry.category;
    return course;
  };
}

export function buildRequirementCategories(reqData, courses, buildCourse) {
  const categories = [];

  if (reqData.required?.categories) {
    for (const cat of reqData.required.categories) {
      categories.push({
        id: cat.id,
        name: cat.name,
        hours: cat.hours,
        courses: cat.courses.map((code) => buildCourse(code)),
        ...(cat.selectOne && { note: 'Select one course from this category' }),
      });
    }
  }

  if (reqData.electives?.categories) {
    for (const cat of reqData.electives.categories) {
      const categoryCourses = courses
        .filter((c) => c.category === cat.category)
        .map((c) => buildCourse(c.code));
      categories.push({
        id: cat.id,
        name: cat.name,
        hours: cat.hours,
        courses: categoryCourses,
        note: `Select ${cat.count} course(s) from ${cat.category} electives`,
      });
    }
  }

  if (reqData.generalElectives) {
    const ge = reqData.generalElectives;
    const allCourses = courses.map((c) => buildCourse(c.code));
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

export function buildPrerequisites(reqData) {
  const prereqs = {};
  if (reqData.required?.categories) {
    for (const cat of reqData.required.categories) {
      if (cat.prerequisites) {
        for (const courseCode of cat.courses) {
          prereqs[courseCode] = cat.prerequisites
            .map((prereqId) => {
              const prereqCat = reqData.required.categories.find((c) => c.id === prereqId);
              return prereqCat ? prereqCat.courses : [];
            })
            .flat();
        }
      }
    }
  }
  return prereqs;
}

export async function fetchUpcomingOfferings(db) {
  const snap = await db.collection('dcda_config').get();
  const now = new Date();
  const terms = [];
  snap.forEach((doc) => {
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

async function fetchFirestoreDoc(db, docId) {
  const snap = await db.collection('dcda_config').doc(docId).get();
  if (!snap.exists) {
    throw new Error(`Firestore doc dcda_config/${docId} does not exist`);
  }
  return snap.data();
}

export async function assembleManifest(db) {
  const [coursesDoc, requirementsDoc, upcomingOfferings] = await Promise.all([
    fetchFirestoreDoc(db, 'courses'),
    fetchFirestoreDoc(db, 'requirements'),
    fetchUpcomingOfferings(db),
  ]);

  const courses = coursesDoc.courses || [];
  const requirements = requirementsDoc;
  const buildCourse = buildCourseFactory(courses);

  const manifest = {
    manifestVersion: '1.0',
    department: 'Digital Culture and Data Analytics',
    lastUpdated: new Date().toISOString(),
    wizardUrl: 'https://dcda-advisor-mobile.web.app',
    programs: [],
  };

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
    if (!reqData) continue;
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
        categories: buildRequirementCategories(reqData, courses, buildCourse),
      },
      prerequisites: buildPrerequisites(reqData),
    };
    manifest.programs.push(program);
  }

  manifest.courseCatalog = courses.map((c) => ({
    code: c.code,
    title: c.title,
    hours: parseHours(c.code),
    level: parseLevel(c.code),
    description: c.description,
  }));

  manifest.advisingNotes = [
    'DCDA Major requires 33 credit hours; Minor requires 21 credit hours',
    'Capstone (DCDA 40833) requires completion of both Statistics and Coding categories',
    'Students may not receive credit for both MATH 10043 and INSC 20153',
    'Students may not receive credit for both DCDA 20833 and WRIT 20833',
    'DSGN courses: contact Tyra Musoma (t.musoma@tcu.edu) to be placed on waiting list — DSGN majors have priority enrollment',
    'STCO courses: contact the instructor of record to be placed on waiting list',
    `Upcoming term offerings: ${
      upcomingOfferings.map((t) => `${t.label} (${(t.data.offeredCodes || []).length} courses)`).join('; ') ||
      'none on file'
    }`,
  ];

  const highlightedByTerm = upcomingOfferings
    .filter((t) => (t.data.sections || []).length > 0)
    .map((t) => ({
      term: t.label,
      courses: t.data.sections.map((s) => {
        const course = {
          code: s.code,
          title: s.title,
          hours: parseHours(s.code),
        };
        if (s.schedule) course.schedule = s.schedule.replace(/\n/g, ' ');
        if (s.modality) course.modality = s.modality;
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

export function validateManifest(manifest) {
  const valid = validateSchema(manifest);
  return {
    valid,
    errors: valid ? null : validateSchema.errors,
  };
}
