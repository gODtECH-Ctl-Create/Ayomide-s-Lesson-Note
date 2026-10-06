const DOCUMENT_ID = '1tGks5xH6VpQvfbQG9CSYayHXY_vWygj1YyjMIXVIswI';
const TOTAL_WEEKS = 10;
const WEEK_START = new Date('2026-09-14T00:00:00');

function doGet(e) {
  try {
    const data = buildLessonData();
    const callback = e && e.parameter && e.parameter.callback;
    const payload = JSON.stringify({ ok: true, data: data });
    if (callback) {
      const safe = String(callback).replace(/[^a-zA-Z0-9_$.]/g, '');
      return ContentService.createTextOutput(safe + '(' + payload + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    const errorPayload = JSON.stringify({ ok: false, error: String(err && err.message || err) });
    const callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      const safe = String(callback).replace(/[^a-zA-Z0-9_$.]/g, '');
      return ContentService.createTextOutput(safe + '(' + errorPayload + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(errorPayload).setMimeType(ContentService.MimeType.JSON);
  }
}

function buildLessonData() {
  const doc = DocumentApp.openById(DOCUMENT_ID);
  const lines = extractBodyLines(doc.getBody());
  return parseLessonNotes(lines);
}

/*
 * The lesson-note Google Doc uses styled tables for the Week/Topic header
 * and normal paragraphs for the six lesson-note sections. Reading only
 * paragraphs misses the Week/Topic header, so we walk the document structure
 * and flatten both paragraphs and table cells into one ordered line stream.
 */
function extractBodyLines(body) {
  const output = [];

  function addText(text) {
    String(text || '').replace(/\r/g, '').split('\n').forEach(function(line) {
      const clean = line.trim();
      if (clean) output.push(clean);
    });
  }

  function walk(element) {
    const type = element.getType();

    if (type === DocumentApp.ElementType.PARAGRAPH) {
      addText(element.asParagraph().getText());
      return;
    }

    if (type === DocumentApp.ElementType.LIST_ITEM) {
      addText(element.asListItem().getText());
      return;
    }

    if (type === DocumentApp.ElementType.TABLE) {
      const table = element.asTable();
      for (let r = 0; r < table.getNumRows(); r++) {
        const row = table.getRow(r);
        for (let c = 0; c < row.getNumCells(); c++) {
          const cell = row.getCell(c);
          for (let i = 0; i < cell.getNumChildren(); i++) {
            walk(cell.getChild(i));
          }
        }
      }
    }
  }

  for (let i = 0; i < body.getNumChildren(); i++) {
    walk(body.getChild(i));
  }

  return output;
}

function parseLessonNotes(lines) {
  const subjectNames = [
    'English Language',
    'Mathematics',
    'Basic Science',
    'Information Technology',
    'Physical and Health Education (P.H.E.)',
    'Christian Religious Studies (C.R.S.)',
    'Islamic Studies',
    'Civic Education',
    'Social Studies',
    'Security Education',
    'Vocational Education',
    'Home Economics',
    'Agricultural Science',
    'Cultural and Creative Arts',
    'Yoruba Language',
    'Igbo Language',
    'French Language',
    'History',
    'Verbal Reasoning',
    'Quantitative Reasoning'
  ];

  const weeks = Array.from({length: TOTAL_WEEKS}, function(_, i) {
    return { week: i + 1, dateRange: weekRange(i + 1), subjects: [] };
  });

  let currentWeek = null;
  let currentSubjectName = '';
  let currentSubject = null;
  let currentField = '';
  let buffer = [];

  const fieldAliases = {
    'BEHAVIORAL OBJECTIVES': 'behavioralObjectives',
    'BEHAVIOURAL OBJECTIVES': 'behavioralObjectives',
    'INSTRUCTIONAL MATERIALS': 'instructionalMaterials',
    'LESSON CONTENT': 'lessonContent',
    'TEACHER & LEARNER ACTIVITIES': 'teacherLearnerActivities',
    'TEACHER AND LEARNER ACTIVITIES': 'teacherLearnerActivities',
    'TEACHER/LEARNER ACTIVITIES': 'teacherLearnerActivities',
    'EVALUATION': 'evaluation',
    'ASSIGNMENT': 'assignment'
  };

  function cleanKey(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function flushField() {
    if (!currentSubject || !currentField) {
      buffer = [];
      return;
    }
    const value = buffer.join('\n').trim();
    if (value) currentSubject[currentField] = value;
    buffer = [];
  }

  function startLesson(weekNumber, dateRange, topic) {
    flushField();
    currentWeek = Number(weekNumber);
    currentSubject = {
      subject: currentSubjectName,
      topic: topic || 'Lesson Topic',
      dateRange: dateRange || weekRange(currentWeek),
      behavioralObjectives: '',
      instructionalMaterials: '',
      lessonContent: '',
      teacherLearnerActivities: '',
      evaluation: '',
      assignment: ''
    };
    if (currentWeek >= 1 && currentWeek <= TOTAL_WEEKS && currentSubjectName) {
      weeks[currentWeek - 1].subjects.push(currentSubject);
    }
    currentField = '';
    buffer = [];
  }

  function startField(label, remainder) {
    flushField();
    currentField = fieldAliases[cleanKey(label)] || '';
    buffer = [];
    if (remainder) buffer.push(remainder.trim());
  }

  lines.forEach(function(rawLine) {
    const line = String(rawLine || '').trim();
    if (!line) return;

    // Subject headings in the source document are numbered, e.g.
    // "1. English Language".
    const numberedSubject = line.match(/^\d+\.\s*(.+)$/);
    if (numberedSubject) {
      const possibleName = numberedSubject[1].trim();
      const match = subjectNames.find(function(name) {
        return cleanKey(name) === cleanKey(possibleName);
      });
      if (match) {
        flushField();
        currentSubjectName = match;
        currentSubject = null;
        currentWeek = null;
        currentField = '';
        buffer = [];
        return;
      }
    }

    // The Week/Topic header is stored in a table cell in the Google Doc.
    const weekHeader = line.match(/^WEEK\s*(\d+)\s*[•·\-]\s*(.+)$/i);
    if (weekHeader) {
      const weekNumber = Number(weekHeader[1]);
      const headerText = weekHeader[2].trim();
      let dateRange = headerText;
      let topic = '';
      const topicSplit = headerText.split(/\s+Topic\s*:\s*/i);
      if (topicSplit.length > 1) {
        dateRange = topicSplit[0].trim();
        topic = topicSplit.slice(1).join(' Topic: ').trim();
      }
      startLesson(weekNumber, dateRange, topic);
      return;
    }

    // Also support a separate Week line followed by a Topic line.
    const plainWeek = line.match(/^WEEK\s*(\d+)\s*$/i);
    if (plainWeek) {
      startLesson(Number(plainWeek[1]), '', '');
      return;
    }

    const topicLine = line.match(/^TOPIC\s*:\s*(.+)$/i);
    if (topicLine) {
      flushField();
      if (currentSubject) currentSubject.topic = topicLine[1].trim();
      continue;
    }

    const fieldMatch = line.match(/^(Behavioral Objectives|Behavioural Objectives|Instructional Materials|Lesson Content|Teacher\s*&\s*Learner Activities|Teacher\s+and\s+Learner Activities|Teacher\/Learner Activities|Evaluation|Assignment)\s*:\s*(.*)$/i);
    if (fieldMatch) {
      startField(fieldMatch[1], fieldMatch[2]);
      return;
    }

    if (currentSubject && currentField) {
      buffer.push(line);
    }
  });

  flushField();

  // Keep the source ordering but guarantee exactly one entry per week for
  // every subject that is present in the document.
  return {
    title: "Ayomide's Lesson Note",
    grade: 'Basic 1',
    term: 'First Term',
    year: 2026,
    weeks: weeks
  };
}

function weekRange(weekNumber) {
  const start = new Date(WEEK_START);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return formatDate(start) + ' – ' + formatDate(end);
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'MMM d, yyyy');
}
