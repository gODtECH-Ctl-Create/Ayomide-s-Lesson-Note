const CONFIG={dataUrl:"lesson-data.json",totalWeeks:10};
const state={data:null,week:1,subject:"all",search:""};

const searchPage=document.getElementById("searchPage"),resultsPage=document.getElementById("resultsPage");
const searchInput=document.getElementById("searchInput"),searchBtn=document.getElementById("searchBtn");
const searchStatus=document.getElementById("searchStatus"),homeBtn=document.getElementById("homeBtn");
const weekSelect=document.getElementById("weekSelect"),subjectSelect=document.getElementById("subjectSelect");
const resultSearch=document.getElementById("resultSearch"),lessonArea=document.getElementById("lessonArea");
const prevBtn=document.getElementById("prevBtn"),nextBtn=document.getElementById("nextBtn"),printBtn=document.getElementById("printBtn");
const resultsSummary=document.getElementById("resultsSummary"),template=document.getElementById("lessonTemplate");

for(let i=1;i<=10;i++){const o=document.createElement("option");o.value=i;o.textContent="Week "+i;weekSelect.appendChild(o)}

function escapeHtml(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function richText(v){
 if(Array.isArray(v))return "<ul>"+v.map(x=>"<li>"+escapeHtml(x)+"</li>").join("")+"</ul>";
 const t=String(v||"").trim();if(!t)return "<p>Not provided.</p>";
 const lines=t.split(/
/).map(x=>x.trim()).filter(Boolean);
 return "<p>"+lines.map(escapeHtml).join("<br>")+"</p>";
}
async function loadData(){
 const r=await fetch(CONFIG.dataUrl+"?v="+Date.now(),{cache:"no-store"});
 if(!r.ok)throw new Error("Lesson data could not be loaded.");
 state.data=await r.json();
 populateSubjects();
}
function populateSubjects(){
 const set=new Set();
 state.data.weeks.forEach(w=>(w.subjects||[]).forEach(x=>set.add(x.subject)));
 subjectSelect.innerHTML='<option value="all">All subjects</option>';
 Array.from(set).sort().forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;subjectSelect.appendChild(o)});
 subjectSelect.value=state.subject;
}
function getWeek(){return state.data.weeks.find(w=>Number(w.week)===state.week)||state.data.weeks[0]}
function searchable(x){return [x.subject,x.topic,x.behavioralObjectives,x.instructionalMaterials,x.lessonContent,x.teacherLearnerActivities,x.evaluation,x.assignment].map(v=>Array.isArray(v)?v.join(" "):String(v||"")).join(" ").toLowerCase()}
function render(){
 const week=getWeek(),q=state.search.trim().toLowerCase();
 const lessons=(week.subjects||[]).filter(x=>(state.subject==="all"||x.subject===state.subject)&&(!q||searchable(x).includes(q)));
 lessonArea.innerHTML="";
 if(!lessons.length){lessonArea.innerHTML='<div class="empty"><strong>No lesson note found.</strong><br>Try another search or select a different week.</div>';resultsSummary.textContent="No matching lesson notes.";return}
 resultsSummary.textContent=lessons.length+" lesson note"+(lessons.length===1?"":"s")+" found • "+week.dateRange;
 lessons.forEach(item=>{
  const node=template.content.cloneNode(true);
  node.querySelector(".lesson-subject").textContent=item.subject;
  node.querySelector(".lesson-topic").textContent=item.topic||"Lesson Topic";
  node.querySelector(".date-badge").textContent=week.dateRange;
  const f={objectives:item.behavioralObjectives,materials:item.instructionalMaterials,content:item.lessonContent,activities:item.teacherLearnerActivities,evaluation:item.evaluation,assignment:item.assignment};
  Object.keys(f).forEach(k=>node.querySelector('[data-field="'+k+'"]').innerHTML=richText(f[k]));
  lessonArea.appendChild(node);
 });
 weekSelect.value=state.week;subjectSelect.value=state.subject;
 prevBtn.disabled=state.week<=1;nextBtn.disabled=state.week>=10;
}
function openResults(query,week){
 state.search=query||"";state.week=week||1;state.subject="all";
 searchPage.hidden=true;resultsPage.hidden=false;resultSearch.value=state.search;render();
 history.pushState({results:true},"","#results");
 window.scrollTo(0,0);
}
function goHome(){
 searchPage.hidden=false;resultsPage.hidden=true;searchInput.value="";history.pushState({},"","#");
 window.scrollTo(0,0);searchInput.focus();
}
searchBtn.addEventListener("click",()=>openResults(searchInput.value.trim(),1));
searchInput.addEventListener("keydown",e=>{if(e.key==="Enter")openResults(searchInput.value.trim(),1)});
document.querySelectorAll("[data-week]").forEach(b=>b.addEventListener("click",()=>openResults("",Number(b.dataset.week))));
homeBtn.addEventListener("click",goHome);
weekSelect.addEventListener("change",e=>{state.week=Number(e.target.value);render();window.scrollTo(0,0)});
subjectSelect.addEventListener("change",e=>{state.subject=e.target.value;render()});
resultSearch.addEventListener("input",e=>{state.search=e.target.value;render()});
prevBtn.addEventListener("click",()=>{if(state.week>1){state.week--;render();window.scrollTo(0,0)}});
nextBtn.addEventListener("click",()=>{if(state.week<10){state.week++;render();window.scrollTo(0,0)}});
printBtn.addEventListener("click",()=>window.print());
window.addEventListener("popstate",()=>{if(location.hash==="#results"){searchPage.hidden=true;resultsPage.hidden=false;render()}else goHome()});
loadData().catch(e=>{searchStatus.textContent=e.message;searchStatus.classList.add("error")});