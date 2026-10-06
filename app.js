const CONFIG = {
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbyZFr8lZHap08ViwRJ2fUUj46svNHv4b_Py3lqX51ObJJ0NF1SxD0uH2k79M0n-1a016w/exec",
  docId: "1tGks5xH6VpQvfbQG9CSYayHXY_vWygj1YyjMIXVIswI",
  weekStart: "2026-09-14",
  totalWeeks: 10
};

const state = { data: null, week: 1, subject: "all", search: "" };
const weekSelect = document.getElementById("weekSelect");
const subjectSelect = document.getElementById("subjectSelect");
const searchInput = document.getElementById("searchInput");
const syncBtn = document.getElementById("syncBtn");
const syncStatus = document.getElementById("syncStatus");
const lessonArea = document.getElementById("lessonArea");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const printBtn = document.getElementById("printBtn");
const template = document.getElementById("lessonTemplate");

for (let i=1;i<=CONFIG.totalWeeks;i++){
  const option=document.createElement("option");
  option.value=i;
  option.textContent="Week "+i;
  weekSelect.appendChild(option);
}
weekSelect.value=state.week;

function setStatus(message,isError){
  syncStatus.textContent=message;
  syncStatus.classList.toggle("error",!!isError);
}
function escapeHtml(value){
  return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function richText(value){
  if(Array.isArray(value)) return "<ul>"+value.map(function(x){return "<li>"+escapeHtml(x)+"</li>";}).join("")+"</ul>";
  const text=String(value==null?"":value).trim();
  if(!text) return "<p>Not provided.</p>";
  return text.split(/\n\s*\n/).map(function(block){
    const lines=block.split(/\n/).map(function(x){return x.trim();}).filter(Boolean);
    if(lines.length>1 && lines.every(function(x){return /^[-•*]\s+/.test(x);})){
      return "<ul>"+lines.map(function(x){return "<li>"+escapeHtml(x.replace(/^[-•*]\s+/,""))+"</li>";}).join("")+"</ul>";
    }
    return "<p>"+lines.map(escapeHtml).join("<br>")+"</p>";
  }).join("");
}
function normalizeData(data){
  if(!data) throw new Error("No lesson data returned.");
  if(Array.isArray(data)) return {title:"Ayomide's Lesson Note",weeks:data};
  if(Array.isArray(data.weeks)) return data;
  throw new Error("Unexpected lesson data format.");
}
function populateSubjects(){
  const all=new Set();
  state.data.weeks.forEach(function(w){(w.subjects||[]).forEach(function(s){all.add(s.subject||s.name);});});
  subjectSelect.innerHTML="";
  const allOpt=document.createElement("option"); allOpt.value="all"; allOpt.textContent="All subjects"; subjectSelect.appendChild(allOpt);
  Array.from(all).sort().forEach(function(subject){
    const o=document.createElement("option"); o.value=subject; o.textContent=subject; subjectSelect.appendChild(o);
  });
  subjectSelect.value=state.subject;
}
function getWeek(){
  return state.data.weeks.find(function(w){return Number(w.week)===Number(state.week);}) || state.data.weeks[0];
}
function render(){
  if(!state.data) return;
  const week=getWeek();
  const query=state.search.trim().toLowerCase();
  const subjects=(week && week.subjects || []).filter(function(item){
    const subject=item.subject||item.name||"";
    const okSubject=state.subject==="all" || subject===state.subject;
    const values=[subject,item.topic,item.objectives,item.behavioralObjectives,item.materials,item.instructionalMaterials,item.content,item.lessonContent,item.activities,item.teacherLearnerActivities,item.evaluation,item.assignment];
    const hay=values.map(function(v){return Array.isArray(v)?v.join(" "):String(v==null?"":v);}).join(" ").toLowerCase();
    return okSubject && (!query || hay.indexOf(query)!==-1);
  });
  lessonArea.innerHTML="";
  if(!subjects.length){
    lessonArea.innerHTML="<div class="empty"><strong>No lesson note matched your filters.</strong><br>Try another subject, week, or search term.</div>";
    return;
  }
  subjects.forEach(function(item){
    const node=template.content.cloneNode(true);
    node.querySelector(".lesson-subject").textContent=item.subject||item.name||"Subject";
    node.querySelector(".lesson-topic").textContent=item.topic||"Lesson Topic";
    node.querySelector(".date-badge").textContent=week.dateRange || item.dateRange || "";
    const values={
      objectives:item.objectives!=null?item.objectives:item.behavioralObjectives,
      materials:item.materials!=null?item.materials:item.instructionalMaterials,
      content:item.content!=null?item.content:item.lessonContent,
      activities:item.activities!=null?item.activities:item.teacherLearnerActivities,
      evaluation:item.evaluation,
      assignment:item.assignment
    };
    Object.keys(values).forEach(function(field){
      node.querySelector('[data-field="'+field+'"]').innerHTML=richText(values[field]);
    });
    lessonArea.appendChild(node);
  });
  prevBtn.disabled=Number(state.week)<=1;
  nextBtn.disabled=Number(state.week)>=CONFIG.totalWeeks;
}
function saveCache(){
  try{localStorage.setItem("ayomide-lesson-note",JSON.stringify({savedAt:Date.now(),data:state.data}));}catch(_){}
}
function loadCache(){
  try{const raw=localStorage.getItem("ayomide-lesson-note");if(!raw)return null;const cached=JSON.parse(raw);return cached&&cached.data||null;}catch(_){return null;}
}
function jsonp(url){
  return new Promise(function(resolve,reject){
    const callback="__lessonNotes_"+Date.now()+"_"+Math.random().toString(36).slice(2);
    const script=document.createElement("script");
    function cleanup(){delete window[callback];script.remove();}
    window[callback]=function(payload){cleanup();resolve(payload);};
    script.onerror=function(){cleanup();reject(new Error("Could not reach the Google Apps Script endpoint."));};
    script.src=url+(url.indexOf("?")>=0?"&":"?")+"callback="+encodeURIComponent(callback)+"&docId="+encodeURIComponent(CONFIG.docId);
    document.body.appendChild(script);
  });
}
async function sync(){
  setStatus("Syncing…",false);
  if(!CONFIG.appsScriptUrl){
    const cached=loadCache();
    if(cached){
      state.data=normalizeData(cached);populateSubjects();render();
      setStatus("Showing cached lesson notes. Add the Apps Script URL in app.js to enable live sync.",false);
    }else{
      setStatus("Google Apps Script URL is not configured yet. See README for setup.",true);
      lessonArea.innerHTML="<div class="empty"><strong>Connect the Google Doc.</strong><br>Deploy the included Google Apps Script and paste its web-app URL into <code>app.js</code>.</div>";
    }
    return;
  }
  try{
    const payload=await jsonp(CONFIG.appsScriptUrl);
    if(payload && payload.ok===false) throw new Error(payload.error||"The source returned an error.");
    state.data=normalizeData(payload && payload.data || payload);
    populateSubjects();saveCache();render();
    setStatus("Synced just now • "+state.data.weeks.length+" weeks",false);
  }catch(error){
    const cached=loadCache();
    if(cached){
      state.data=normalizeData(cached);populateSubjects();render();
      setStatus("Live sync failed. Showing the last saved copy.",true);
    }else{
      setStatus(error.message||"Sync failed.",true);
      lessonArea.innerHTML="<div class="empty"><strong>Could not load the lesson notes.</strong><br>"+escapeHtml(error.message||"Unknown error.")+"</div>";
    }
  }
}
weekSelect.addEventListener("change",function(e){state.week=Number(e.target.value);render();window.scrollTo({top:0,behavior:"smooth"});});
subjectSelect.addEventListener("change",function(e){state.subject=e.target.value;render();});
searchInput.addEventListener("input",function(e){state.search=e.target.value;render();});
syncBtn.addEventListener("click",sync);
prevBtn.addEventListener("click",function(){if(state.week>1){state.week--;weekSelect.value=state.week;render();}});
nextBtn.addEventListener("click",function(){if(state.week<CONFIG.totalWeeks){state.week++;weekSelect.value=state.week;render();}});
printBtn.addEventListener("click",function(){window.print();});
const params=new URLSearchParams(location.search);
if(params.get("week")) state.week=Math.min(CONFIG.totalWeeks,Math.max(1,Number(params.get("week"))||1));
weekSelect.value=state.week;
sync();
