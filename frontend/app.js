/* VoiceGuard frontend — browser audio decode + REST integration. No build step. */
const API = ""; const TARGET_SR = 16000; const LIVE_SECONDS = 4;
const $ = id => document.getElementById(id);
let audioCtx = null; const ctx = () => (audioCtx ||= new (window.AudioContext||window.webkitAudioContext)());
let modelReady = false;
if (location.protocol === "file:") document.body.insertAdjacentHTML("afterbegin", `<div style="background:#7f1d1d;color:#fff;padding:12px;text-align:center;font-weight:700">\u26A0\uFE0F Opened directly \u2014 run <code>run.cmd</code>, then open <code>http://localhost:8001</code></div>`);
async function refreshHealth(){
  const b=$("healthBadge");
  try{const r=await fetch(`${API}/api/health`);const h=await r.json();
    if(h.model_loaded){b.textContent="\u25CF model online";b.className="health ok";modelReady=true;$("recBtn").disabled=false;$("recBtn").title="";}
    else{b.textContent="\u25CF warming up...";b.className="health";modelReady=false;$("recBtn").disabled=true;$("recBtn").title="Model warming up...";}}
  catch{b.textContent="\u25CF server unreachable";b.className="health bad";modelReady=false;}}
async function loadModelInfo(){
  try{const r=await fetch(`${API}/api/model/info`);const m=await r.json();
    $("modelInfo").innerHTML=`<b style="color:var(--txt)">${m.architecture}</b><br>Classes: <span class="mono">${m.classes.join(" \u00B7 ")}</span> (bonafide = <b>${m.bonafide_class}</b>)<br>Window ${m.window_samples} @ ${m.sample_rate} Hz \u00B7 threshold ${m.threat_threshold}% \u00B7 weights: <span class="mono">${(m.weights_path||"").split(/[\\/]/).pop()||"?"}</span>`;}
  catch{$("modelInfo").textContent="Could not reach model API.";}}
async function decodeTo16kMono(blob){
  const buf=await blob.arrayBuffer();const audio=await ctx().decodeAudioData(buf.slice(0));
  const off=new OfflineAudioContext(1,Math.ceil(audio.duration*TARGET_SR),TARGET_SR);
  const src=off.createBufferSource();src.buffer=audio;src.connect(off.destination);src.start(0);
  const rendered=await off.startRendering();return rendered.getChannelData(0);}
function f32ToB64(f32){const bytes=new Uint8Array(f32.buffer,f32.byteOffset,f32.byteLength);let bin="";const CH=32768;
  for(let i=0;i<bytes.length;i+=CH)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH));return btoa(bin);}
async function analyzePCM(f32,label){
  const res=await fetch(`${API}/api/analyze-pcm`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({audio_base64:f32ToB64(f32),dtype:"float32",sample_rate:TARGET_SR,label})});
  if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.detail||`Server error ${res.status}`);}
  return res.json();}
function showResult(r){
  $("result").hidden=false;const v=$("verdict");
  if(r.is_synthetic){v.className="verdict fake";v.textContent=`\u26A0\uFE0F SYNTHETIC \u2014 ${r.action}`;}
  else{v.className="verdict real";v.textContent=`\u2705 BONAFIDE \u2014 ${r.action}`;}
  $("threatBar").style.width=`${r.threat_score}%`;$("threatVal").textContent=`${r.threat_score}%`;
  $("authBar").style.width=`${r.authenticity_score}%`;$("authVal").textContent=`${r.authenticity_score}%`;
  $("metaTop").textContent=`Top class: ${r.top_class} (${r.confidence}%)`;$("metaMs").textContent=`Inference: ${r.inference_ms} ms`;
  $("statLatency").textContent=`${r.inference_ms} ms`;
  const pb=$("probBars");pb.innerHTML="";
  for(const[label,pct] of Object.entries(r.probabilities)){
    const row=document.createElement("div");row.className="prow"+(label===r.top_class?" top":"");
    row.innerHTML=`<span class="pn mono">${label}</span><div class="bar"><div class="fill ${label==="gt"?"auth":"threat"}" style="width:${pct}%"></div></div><span class="pv">${pct}%</span>`;pb.appendChild(row);}
  loadHistory();}
async function runAnalysis(f32,label){
  if(!modelReady){alert("Model warming up (first start ~40s). Wait for green \u25CF model online badge.");await refreshHealth();if(!modelReady)return;}
  $("analyzing").hidden=false;$("result").hidden=true;
  try{const r=await analyzePCM(f32,label);showResult(r);}catch(e){alert("Analysis failed: "+e.message);}
  finally{$("analyzing").hidden=true;}}
async function handleFile(file){
  if(!file)return;const url=URL.createObjectURL(file);const p=$("player");p.src=url;p.hidden=false;
  try{const pcm=await decodeTo16kMono(file);await runAnalysis(pcm,file.name);}catch(e){alert("Could not decode: "+e.message);}}
$("fileInput").addEventListener("change",e=>handleFile(e.target.files[0]));
const dz=$("dropzone");["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("over");}));
["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("over");}));
dz.addEventListener("drop",e=>handleFile(e.dataTransfer.files[0]));
let recording=false;$("recBtn").addEventListener("click",async()=>{
  if(recording)return;let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}
  catch{alert("Mic permission denied (use localhost or HTTPS).");return;}
  recording=true;const st=$("recState");st.textContent=`\u25CF recording ${LIVE_SECONDS}s...`;st.className="rec-state rec";$("recBtn").disabled=true;const m=$("liveMeter");m.style.width="0%";
  const rec=new MediaRecorder(stream);const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  const done=new Promise(r=>rec.onstop=r);rec.start();const t0=Date.now();const tick=setInterval(()=>{const p=Math.min(100,((Date.now()-t0)/(LIVE_SECONDS*1000))*100);m.style.width=`${p}%`;},100);
  await new Promise(r=>setTimeout(r,LIVE_SECONDS*1000));rec.stop();await done;clearInterval(tick);m.style.width="100%";stream.getTracks().forEach(t=>t.stop());
  st.textContent="decoding...";const blob=new Blob(chunks,{type:rec.mimeType||"audio/webm"});
  try{const pcm=await decodeTo16kMono(blob);st.textContent="analyzing...";await runAnalysis(pcm,"mic-live-4s");st.textContent="done \u2713";}
  catch(e){st.textContent="failed";alert("Mic failed: "+e.message);}
  finally{st.className="rec-state";$("recBtn").disabled=false;recording=false;setTimeout(()=>{st.textContent="idle";m.style.width="0%";},4000);});
async function loadHistory(){
  try{const r=await fetch(`${API}/api/history?limit=20`);const h=await r.json();const b=$("histBody");b.innerHTML="";
    if(!h.entries.length){b.innerHTML=`<tr><td colspan="6" class="dim">No analyses yet.</td></tr>`;return;}
    for(const e of h.entries){const tr=document.createElement("tr");
      tr.innerHTML=`<td class="mono">${e.time}</td><td>${escapeHtml(e.label||e.source)}</td><td><span class="pill ${e.is_synthetic?"fake":"real"}">${e.is_synthetic?"SYNTHETIC":"BONAFIDE"}</span></td><td class="mono">${e.threat_score}%</td><td class="mono">${e.top_class}</td><td class="mono">${e.inference_ms} ms</td>`;b.appendChild(tr);}}
  catch{}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&","<":"<",">":">",'"':""","'":"'"}[c]));}
$("clearHist").addEventListener("click",async()=>{await fetch(`${API}/api/history`,{method:"DELETE"}).catch(()=>{});loadHistory();});
$("liveSecs").textContent=`${LIVE_SECONDS} seconds`;refreshHealth();setInterval(refreshHealth,10000);loadModelInfo();loadHistory();