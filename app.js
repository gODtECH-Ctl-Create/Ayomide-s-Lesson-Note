const CONFIG={dataUrl:"lesson-data.json",totalWeeks:10};
const state={data:null,week:1,subject:"all",search:"",error:""};

const resultsPage=document.getElementById("resultsPage");
const weekSelect=document.getElementById("weekSelect");
const subjectSelect=document.getElementById("subjectSelect");
const resultSearch=document.getElementById("resultSearch");
const lessonArea=document.getElementById("lessonArea");
const prevBtn=document.getElementById("prevBtn");
const nextBtn=document.getElementById("nextBtn");
const printBtn=document.getElementById("printBtn");
const resultsSummary=document.getElementById("resultsSummary");
const template=document.getElementById("lessonTemplate");

function escapeHtml(v){
 return String(v==null?"":v)
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function richText(v){
 if(Array.isArray(v))return "<ul>"+v.map(x=>"<li>"+escapeHtml(x)+"</li>").join("")+"</ul>";
 const t=String(v||"").trim();
 if(!t)return "<p>Not provided.</p>";
 return "<p>"+t.split(/\n/).map(x=>x.trim()).filter(Boolean).map(escapeHtml).join("<br>")+"</p>";
}
function params(){
 const p=new URLSearchParams(location.search);
 const requestedWeek=Number(p.get("week"));
 state.week=requestedWeek>=1&&requestedWeek<=CONFIG.totalWeeks?requestedWeek:1;
 state.search=(p.get("q")||"").trim();
}
async function loadData(){
 try{
  const r=await fetch("./"+CONFIG.dataUrl+"?v="+Date.now(),{cache:"no-store"});
  if(!r.ok)throw new Error("Lesson data could not be loaded.");
  state.data=await r.json();
  state.error="";
  if(resultsPage){
   populateSubjects();
   render();
  }
 }catch(e){
  state.error=e.message||"Lesson data could not be loaded.";
  if(resultsPage)render();
 }
}
function populateSubjects(){
 if(!subjectSelect||!state.data)return;
 const set=new Set();
 state.data.weeks.forEach(w=>(w.subjects||[]).forEach(x=>set.add(x.subject)));
 subjectSelect.innerHTML='<option value="all">All subjects</option>';
 Array.from(set).sort().forEach(s=>{
  const o=document.createElement("option");
  o.value=s;o.textContent=s;subjectSelect.appendChild(o);
 });
 subjectSelect.value=state.subject;
}
function getWeek(){
 if(!state.data||!Array.isArray(state.data.weeks))return null;
 return state.data.weeks.find(w=>Number(w.week)===state.week)||state.data.weeks[0];
}
function searchable(x){
 return [
  x.subject,x.topic,x.behavioralObjectives,x.instructionalMaterials,
  x.lessonContent,x.teacherLearnerActivities,x.evaluation,x.assignment
 ].map(v=>Array.isArray(v)?v.join(" "):String(v||"")).join(" ").toLowerCase();
}
function syncUrl(){
 const p=new URLSearchParams();
 p.set("week",String(state.week));
 if(state.search)p.set("q",state.search);
 history.replaceState(null,"","results.html?"+p.toString());
}
function render(){
 if(!resultsPage)return;
 lessonArea.innerHTML="";
 if(!state.data){
  resultsSummary.textContent=state.error?"Unable to load the lesson notes.":"Loading lesson notes…";
  lessonArea.innerHTML=state.error
   ? '<div class="empty"><strong>Lesson notes could not be loaded.</strong><br>Refresh the page and try again.</div>'
   : '<div class="empty"><strong>Loading lesson notes…</strong><br>Please wait a moment.</div>';
  prevBtn.disabled=true;nextBtn.disabled=true;return;
 }
 const week=getWeek();
 if(!week){
  resultsSummary.textContent="No lesson notes found.";
  lessonArea.innerHTML='<div class="empty"><strong>No lesson note found.</strong><br>Try another week.</div>';
  return;
 }
 const q=state.search.toLowerCase();
 const lessons=(week.subjects||[]).filter(x=>
  (state.subject==="all"||x.subject===state.subject)&&(!q||searchable(x).includes(q))
 );
 if(!lessons.length){
  resultsSummary.textContent="No matching lesson notes.";
  lessonArea.innerHTML='<div class="empty"><strong>No lesson note found.</strong><br>Try another search or select a different week.</div>';
 }else{
  resultsSummary.textContent=lessons.length+" lesson note"+(lessons.length===1?"":"s")+" found • "+week.dateRange;
  lessons.forEach(item=>{
   const node=template.content.cloneNode(true);
   node.querySelector(".lesson-subject").textContent=item.subject;
   node.querySelector(".lesson-topic").textContent=item.topic||"Lesson Topic";
   node.querySelector(".date-badge").textContent=week.dateRange;
   const fields={
    objectives:item.behavioralObjectives,
    materials:item.instructionalMaterials,
    content:item.lessonContent,
    activities:item.teacherLearnerActivities,
    evaluation:item.evaluation,
    assignment:item.assignment
   };
   Object.keys(fields).forEach(k=>{
    node.querySelector('[data-field="'+k+'"]').innerHTML=richText(fields[k]);
   });
   lessonArea.appendChild(node);
  });
 }
 weekSelect.value=String(state.week);
 subjectSelect.value=state.subject;
 resultSearch.value=state.search;
 prevBtn.disabled=state.week<=1;
 nextBtn.disabled=state.week>=CONFIG.totalWeeks;
}
if(resultsPage){
 params();
 for(let i=1;i<=CONFIG.totalWeeks;i++){
  const o=document.createElement("option");
  o.value=i;o.textContent="Week "+i;weekSelect.appendChild(o);
 }
 weekSelect.addEventListener("change",e=>{
  state.week=Number(e.target.value);syncUrl();render();window.scrollTo(0,0);
 });
 subjectSelect.addEventListener("change",e=>{
  state.subject=e.target.value;render();
 });
 resultSearch.addEventListener("input",e=>{
  state.search=e.target.value;syncUrl();render();
 });
 prevBtn.addEventListener("click",()=>{
  if(state.week>1){state.week--;syncUrl();render();window.scrollTo(0,0);}
 });
 nextBtn.addEventListener("click",()=>{
  if(state.week<CONFIG.totalWeeks){state.week++;syncUrl();render();window.scrollTo(0,0);}
 });
 printBtn.addEventListener("click",()=>window.print());
}
loadData();
