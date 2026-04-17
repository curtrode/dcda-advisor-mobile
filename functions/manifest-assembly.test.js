import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHours,
  parseLevel,
  termStartDate,
  buildCourseFactory,
  buildRequirementCategories,
  buildPrerequisites,
  fetchUpcomingOfferings,
  assembleManifest,
  validateManifest,
} from './manifest-assembly.js';

// ---------- parseHours ----------

test('parseHours: standard 3-hour course ends in 3', () => {
  assert.equal(parseHours('DCDA 20813'), 3);
});

test('parseHours: 1-hour course ends in 1', () => {
  assert.equal(parseHours('ENGL 10011'), 1);
});

test('parseHours: 6-hour course ends in 6', () => {
  assert.equal(parseHours('DCDA 40836'), 6);
});

test('parseHours: variable-credit code ending in 0 defaults to 3', () => {
  assert.equal(parseHours('DCDA 30970'), 3);
});

test('parseHours: digit > 6 defaults to 3 (not a valid credit hours digit)', () => {
  assert.equal(parseHours('FOO 12349'), 3);
});

test('parseHours: non-numeric suffix defaults to 3', () => {
  assert.equal(parseHours('NODIGITS'), 3);
});

// ---------- parseLevel ----------

test('parseLevel: 10000-level is lower division', () => {
  assert.equal(parseLevel('ENGL 10803'), 'lower');
});

test('parseLevel: 20000-level is lower division', () => {
  assert.equal(parseLevel('DCDA 20813'), 'lower');
});

test('parseLevel: 29999 is lower (boundary)', () => {
  assert.equal(parseLevel('XXX 29999'), 'lower');
});

test('parseLevel: 30000 is upper (boundary)', () => {
  assert.equal(parseLevel('XXX 30000'), 'upper');
});

test('parseLevel: 40000-level is upper division', () => {
  assert.equal(parseLevel('DCDA 40833'), 'upper');
});

test('parseLevel: no 5-digit run returns undefined', () => {
  assert.equal(parseLevel('SHORT 123'), undefined);
});

// ---------- termStartDate ----------

test('termStartDate: spring starts Jan 15', () => {
  const d = termStartDate('sp', 26);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 0);
  assert.equal(d.getDate(), 15);
});

test('termStartDate: summer starts May 20', () => {
  const d = termStartDate('su', 26);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 4);
  assert.equal(d.getDate(), 20);
});

test('termStartDate: fall starts Aug 20', () => {
  const d = termStartDate('fa', 26);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 7);
  assert.equal(d.getDate(), 20);
});

test('termStartDate: unknown season returns null', () => {
  assert.equal(termStartDate('wi', 26), null);
});

// ---------- buildCourseFactory ----------

test('buildCourseFactory: known course includes title, description, category', () => {
  const courses = [
    { code: 'DCDA 20813', title: 'Intro to DCDA', description: 'Foundations.', category: 'dc' },
  ];
  const build = buildCourseFactory(courses);
  const course = build('DCDA 20813');
  assert.equal(course.code, 'DCDA 20813');
  assert.equal(course.title, 'Intro to DCDA');
  assert.equal(course.hours, 3);
  assert.equal(course.level, 'lower');
  assert.equal(course.description, 'Foundations.');
  assert.equal(course.category, 'dc');
});

test('buildCourseFactory: unknown code falls back to title = code and no description', () => {
  const build = buildCourseFactory([]);
  const course = build('NEW 40833');
  assert.equal(course.code, 'NEW 40833');
  assert.equal(course.title, 'NEW 40833');
  assert.equal(course.hours, 3);
  assert.equal(course.level, 'upper');
  assert.equal(course.description, undefined);
  assert.equal(course.category, undefined);
});

// ---------- buildRequirementCategories ----------

test('buildRequirementCategories: flags selectOne with a note', () => {
  const courses = [{ code: 'DCDA 20813', title: 'A', category: 'dc' }];
  const build = buildCourseFactory(courses);
  const cats = buildRequirementCategories(
    {
      required: {
        categories: [
          { id: 'stats', name: 'Statistics', hours: 3, courses: ['DCDA 20813'], selectOne: true },
        ],
      },
    },
    courses,
    build
  );
  assert.equal(cats.length, 1);
  assert.equal(cats[0].note, 'Select one course from this category');
});

test('buildRequirementCategories: elective categories pull courses by category match', () => {
  const courses = [
    { code: 'DCDA 30813', title: 'DC Elective A', category: 'dc' },
    { code: 'DCDA 30823', title: 'DC Elective B', category: 'dc' },
    { code: 'DCDA 30833', title: 'DA Elective',   category: 'da' },
  ];
  const build = buildCourseFactory(courses);
  const cats = buildRequirementCategories(
    {
      electives: {
        categories: [
          { id: 'dcElective', name: 'DC Electives', hours: 6, category: 'dc', count: 2 },
        ],
      },
    },
    courses,
    build
  );
  assert.equal(cats.length, 1);
  assert.equal(cats[0].courses.length, 2);
  assert.deepEqual(cats[0].courses.map((c) => c.code), ['DCDA 30813', 'DCDA 30823']);
  assert.equal(cats[0].note, 'Select 2 course(s) from dc electives');
});

test('buildRequirementCategories: generalElectives includes every course in catalog', () => {
  const courses = [
    { code: 'DCDA 30813', title: 'A', category: 'dc' },
    { code: 'DCDA 30833', title: 'B', category: 'da' },
  ];
  const build = buildCourseFactory(courses);
  const cats = buildRequirementCategories(
    { generalElectives: { name: 'General Electives', hours: 9, count: 3 } },
    courses,
    build
  );
  assert.equal(cats.length, 1);
  assert.equal(cats[0].id, 'generalElectives');
  assert.equal(cats[0].courses.length, 2);
  assert.match(cats[0].note, /Select 3/);
});

// ---------- buildPrerequisites ----------

test('buildPrerequisites: maps a category prereq to its courses', () => {
  const prereqs = buildPrerequisites({
    required: {
      categories: [
        { id: 'intro',   name: 'Intro',   hours: 3, courses: ['DCDA 20813'] },
        { id: 'capstone', name: 'Capstone', hours: 3, courses: ['DCDA 40833'], prerequisites: ['intro'] },
      ],
    },
  });
  assert.deepEqual(prereqs, { 'DCDA 40833': ['DCDA 20813'] });
});

test('buildPrerequisites: categories without prerequisites produce no entries', () => {
  const prereqs = buildPrerequisites({
    required: {
      categories: [{ id: 'intro', name: 'Intro', hours: 3, courses: ['DCDA 20813'] }],
    },
  });
  assert.deepEqual(prereqs, {});
});

// ---------- Firestore-backed helpers ----------

function makeMockDb(docs) {
  return {
    collection(name) {
      assert.equal(name, 'dcda_config');
      const entries = Object.entries(docs);
      return {
        async get() {
          return {
            forEach(cb) {
              for (const [id, data] of entries) {
                cb({ id, data: () => data });
              }
            },
          };
        },
        doc(id) {
          return {
            async get() {
              if (id in docs) return { exists: true, data: () => docs[id] };
              return { exists: false, data: () => undefined };
            },
          };
        },
      };
    },
  };
}

test('fetchUpcomingOfferings: filters past terms and sorts chronologically', async () => {
  // Run at a fixed point in 2026: fa25 is past, su26/fa26/sp27 are upcoming.
  const past = Date.now();
  const currentYear = new Date(past).getFullYear();
  // Build term codes relative to current real year to keep the test
  // future-proof: pick two upcoming terms after the current date.
  const yy = String(currentYear + 1).slice(-2);
  const db = makeMockDb({
    [`offerings_fa${yy}`]: { offeredCodes: ['DCDA 20813'], sections: [] },
    [`offerings_sp${yy}`]: { offeredCodes: ['DCDA 30813'], sections: [] },
    offerings_fa00: { offeredCodes: ['OLD 10000'], sections: [] }, // way in the past
    not_an_offering_doc: { foo: 'bar' }, // unrelated doc in collection
  });
  const terms = await fetchUpcomingOfferings(db);
  assert.equal(terms.length, 2);
  // Spring sorts before Fall within same year (SEASON_ORDER: sp=0, su=1, fa=2)
  assert.equal(terms[0].season, 'sp');
  assert.equal(terms[1].season, 'fa');
  assert.match(terms[0].label, /^Spring 20\d\d$/);
});

test('fetchUpcomingOfferings: ignores docs that do not match offerings_ pattern', async () => {
  const db = makeMockDb({
    courses: { courses: [] },
    requirements: { major: {}, minor: {} },
  });
  const terms = await fetchUpcomingOfferings(db);
  assert.deepEqual(terms, []);
});

// ---------- assembleManifest smoke test + validation ----------

test('assembleManifest: produces a schema-valid manifest from minimal mock Firestore', async () => {
  const yy = String(new Date().getFullYear() + 1).slice(-2);
  const db = makeMockDb({
    courses: {
      courses: [
        { code: 'DCDA 20813', title: 'Intro to DCDA', description: 'Foundations.', category: 'dc' },
        { code: 'DCDA 30813', title: 'DC Elective',   description: 'Advanced.',    category: 'dc' },
        { code: 'DCDA 40833', title: 'Capstone',      description: 'Capstone.',    category: 'capstone' },
      ],
    },
    requirements: {
      major: {
        totalHours: 33,
        required: {
          categories: [
            { id: 'intro',    name: 'Intro',    hours: 3, courses: ['DCDA 20813'] },
            { id: 'capstone', name: 'Capstone', hours: 3, courses: ['DCDA 40833'], prerequisites: ['intro'] },
          ],
        },
        electives: {
          categories: [
            { id: 'dcElective', name: 'DC Elective', hours: 6, category: 'dc', count: 2 },
          ],
        },
      },
      minor: {
        totalHours: 21,
        required: {
          categories: [
            { id: 'intro', name: 'Intro', hours: 3, courses: ['DCDA 20813'] },
          ],
        },
      },
    },
    [`offerings_fa${yy}`]: {
      offeredCodes: ['DCDA 20813'],
      sections: [
        { code: 'DCDA 20813', title: 'Intro', schedule: 'MWF 9-9:50', modality: 'Face to Face' },
      ],
    },
  });

  const manifest = await assembleManifest(db);
  const { valid, errors } = validateManifest(manifest);
  assert.equal(valid, true, `schema errors: ${JSON.stringify(errors)}`);

  // Structural checks
  assert.equal(manifest.manifestVersion, '1.0');
  assert.equal(manifest.department, 'Digital Culture and Data Analytics');
  assert.equal(manifest.programs.length, 2);
  assert.equal(manifest.programs[0].id, 'dcda-major');
  assert.equal(manifest.programs[1].id, 'dcda-minor');

  // Major has requirements categories + prereqs + highlighted courses
  const major = manifest.programs[0];
  assert.equal(major.totalHours, 33);
  assert.ok(major.requirements.categories.length >= 2);
  assert.deepEqual(major.prerequisites['DCDA 40833'], ['DCDA 20813']);
  assert.equal(major.highlightedCourses.length, 1);
  assert.match(major.highlightedCourses[0].term, /^Fall 20\d\d$/);
  assert.equal(major.highlightedCourses[0].courses[0].schedule, 'MWF 9-9:50');

  // Course catalog exposed and advising notes present
  assert.equal(manifest.courseCatalog.length, 3);
  assert.ok(manifest.advisingNotes.length >= 1);
});

test('assembleManifest: skips highlightedCourses when no sections are present', async () => {
  const yy = String(new Date().getFullYear() + 1).slice(-2);
  const db = makeMockDb({
    courses: { courses: [{ code: 'DCDA 20813', title: 'Intro', category: 'dc' }] },
    requirements: {
      major: {
        totalHours: 33,
        required: {
          categories: [{ id: 'intro', name: 'Intro', hours: 3, courses: ['DCDA 20813'] }],
        },
      },
    },
    [`offerings_fa${yy}`]: { offeredCodes: ['DCDA 20813'], sections: [] },
  });
  const manifest = await assembleManifest(db);
  assert.equal(manifest.programs[0].highlightedCourses, undefined);
});
