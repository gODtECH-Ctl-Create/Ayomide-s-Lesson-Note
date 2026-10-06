const DOCUMENT_ID = '1_bdAnUSTu2ZtbWAygpDhcqYF8_UxA1OC';
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
  const text = DocumentApp.openById(DOCUMENT_ID).getBody().getText();
  return parseLessonNotes(text);
}

function parseLessonNotes(text) {
  const lines = text.replace(/\r/g, '').split('\n').map(function(s){return s.trim();});
  const subjects = [
    'ENGLISH LANGUAGE','ENGLISH','MATHEMATICS','BASIC SCIENCE','INFORMATION TECHNOLOGY',
    'PHYSICAL AND HEALTH EDUCATION (P.H.E.)','P.H.E.','C.R.S.','ISLAMIC STUDIES',
    'CIVIC EDUCATION','SOCIAL STUDIES','SECURITY EDUCATION','VOCATIONAL EDUCATION',
    'HOME ECONOMICS','AGRICULTURAL SCIENCE','AGRIC-SCIENCE','CULTURAL AND CREATIVE ARTS',
    'C & C ARTS','YORUBA','IGBO LANGUAGE','FRENCH LANGUAGE','HISTORY',
    'VERBAL REASONING','QUANTITATIVE REASONING'
  ];

  const weeks = Array.from({length: TOTAL_WEEKS}, function(_, i) {
    return {week:i+1,dateRange:weekRange(i+1),subjects:[]};
  });

  let currentWeek = null, currentSubject = null, currentTopic = '', currentField = '', buffer = [];

  const fieldAliases = {
    'BEHAVIORAL OBJECTIVES':'behavioralObjectives',
    'BEHAVIOURAL OBJECTIVES':'behavioralObjectives',
    'INSTRUCTIONAL MATERIALS':'instructionalMaterials',
    'LESSON CONTENT':'lessonContent',
    'TEACHER & LEARNER ACTIVITIES':'teacherLearnerActivities',
    'TEACHER AND LEARNER ACTIVITIES':'teacherLearnerActivities',
    'TEACHER/LEARNER ACTIVITIES':'teacherLearnerActivities',
    'EVALUATION':'evaluation',
    'ASSIGNMENT':'assignment'
  };

  function flushField() {
    if (!currentSubject || !currentWeek || !currentField) return;
    const value = buffer.join('\n').trim();
    if (value) currentSubject[currentField] = value;
    buffer = [];
  }

  function startSubject(name) {
    flushField();
    const item = {
      subject:name, topic:currentTopic || 'Lesson Topic',
      behavioralObjectives:'', instructionalMaterials:'', lessonContent:'',
      teacherLearnerActivities:'', evaluation:'', assignment:''
    };
    weeks[currentWeek-1].subjects.push(item);
    currentSubject=item; currentField=''; buffer=[];
  }

  lines.forEach(function(line) {
    if (!line) return;
    let m = line.match(/^WEEK\s*(\d+)(?:\s*[—-]\s*(.*))?$/i);
    if (m) {
      flushField(); currentWeek=Number(m[1]); currentSubject=null; currentTopic='';
      currentField=''; buffer=[]; return;
    }
    m = line.match(/^(?:TOPIC\s*:\s*)(.+)$/i);
    if (m) {
      flushField(); currentTopic=m[1].trim();
      if (currentSubject) currentSubject.topic=currentTopic;
      return;
    }
    const upper=line.toUpperCase().replace(/\s+/g,' ');
    if (fieldAliases[upper]) { flushField(); currentField=fieldAliases[upper]; return; }
    const subjectMatch=subjects.find(function(s){return upper===s.toUpperCase();});
    if (subjectMatch) { startSubject(subjectMatch); return; }
    if (currentSubject && currentField) buffer.push(line);
  });

  flushField();
  return {title:"Ayomide's Lesson Note",grade:"Basic 1",term:"First Term",year:2026,weeks:weeks};
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
