import { useState, useRef, useEffect, useCallback } from "react";

// ── User param: yourapp.com?user=jake ────────────────────────────
const ALLOWED_USERS = ["jake","sarah","mike","tom","emma","alex","chris","nat","ben","lily"];
const DEFAULT_USER  = "demo";

function getUser() {
  try {
    const p = new URLSearchParams(window.location.search).get("user");
    const u = p ? p.toLowerCase().trim() : DEFAULT_USER;
    return ALLOWED_USERS.includes(u) ? u : DEFAULT_USER;
  } catch { return DEFAULT_USER; }
}

const USER = getUser();
const NS   = (key) => `${USER}::${key}`; // namespace all keys per user

// Falls back gracefully: tries window.storage (Claude), then localStorage
const storage = {
  async get(key) {
    try {
      if (typeof window !== "undefined" && window.storage?.get) {
        const r = await window.storage.get(NS(key));
        return r?.value ? JSON.parse(r.value) : null;
      }
    } catch {}
    try {
      const v = localStorage.getItem(NS(key));
      return v ? JSON.parse(v) : null;
    } catch {}
    return null;
  },
  async set(key, value) {
    try {
      if (typeof window !== "undefined" && window.storage?.set) {
        await window.storage.set(NS(key), JSON.stringify(value)); return;
      }
    } catch {}
    try { localStorage.setItem(NS(key), JSON.stringify(value)); } catch {}
  }
};

const DEFAULT_SESSIONS = [
  { id:1, label:"S1", title:"Shoulders + Chest", tag:"Priority", tagColor:"#f97316", note:"Come in fresh. Shoulders first, always.",
    exercises:[
      { name:"Barbell OHP", sets:[{reps:"6-8",weight:"30kg"},{reps:"6-8",weight:"30kg"},{reps:"6-8",weight:"30kg"}], tip:"Stop 1 rep shy of failure.", progression:"3×8 → 32.5kg" },
      { name:"Arnold Press", sets:[{reps:"10-12",weight:"8kg"},{reps:"10-12",weight:"8kg"},{reps:"10-12",weight:"8kg"}], tip:"Full rotation. Don't rush.", progression:"3×12 → 10kg" },
      { name:"Cable Lateral Raise", sets:[{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"}], tip:"No swing. Constant tension.", progression:"4×20 → next pin" },
      { name:"Incline DB Press", sets:[{reps:"6-8",weight:"16kg"},{reps:"6-8",weight:"16kg"},{reps:"6-8",weight:"16kg"},{reps:"6-8",weight:"16kg"}], tip:"Upper chest only.", progression:"4×8 → 18kg" },
      { name:"Cable Fly Low→High", sets:[{reps:"12-15",weight:"9kg"},{reps:"12-15",weight:"9kg"},{reps:"12-15",weight:"9kg"}], tip:"Squeeze at top.", progression:"3×15 → 11kg" },
      { name:"DB Lateral Raise", sets:[{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"}], tip:"Slight forward lean.", progression:"4×20 → 7kg" },
    ]},
  { id:2, label:"S2", title:"Back — Width", tag:"V-Taper", tagColor:"#3b82f6", note:"Pull elbows to hips, not hands to chest.",
    exercises:[
      { name:"Wide Grip Pulldown", sets:[{reps:"8-10",weight:"36kg"},{reps:"8-10",weight:"36kg"},{reps:"8-10",weight:"36kg"},{reps:"8-10",weight:"36kg"}], tip:"Full stretch at top. Own the negative.", progression:"9th rep → 38kg" },
      { name:"Chest Supported Row", sets:[{reps:"8-10",weight:"25kg"},{reps:"8-10",weight:"25kg"},{reps:"8-10",weight:"25kg"}], tip:"Chest on pad. Elbows drive down.", progression:"3×10 → 27.5kg" },
      { name:"Close Neutral Pulldown", sets:[{reps:"10-12",weight:"36kg"},{reps:"10-12",weight:"36kg"},{reps:"10-12",weight:"36kg"}], tip:"Full stretch. Don't shorten range.", progression:"3×10 → 38kg" },
      { name:"Straight Arm Pulldown", sets:[{reps:"15",weight:"20kg"},{reps:"15",weight:"20kg"},{reps:"15",weight:"20kg"}], tip:"Feel lats, not triceps.", progression:"3×15 → 22.5kg" },
      { name:"Rear Delt Fly (Machine)", sets:[{reps:"15",weight:"25kg"},{reps:"15",weight:"25kg"},{reps:"15",weight:"25kg"}], tip:"Pause at peak contraction.", progression:"3×15 → 27kg" },
      { name:"DB Lateral Raise", sets:[{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"}], tip:"Keep delt frequency high.", progression:"4×20 → 7kg" },
    ]},
  { id:3, label:"S3", title:"Arms + Rear Delts", tag:"Beach Builder", tagColor:"#a855f7", note:"Pump-focused. No ego. Clean reps, blood volume.",
    exercises:[
      { name:"DB Curl", sets:[{reps:"8-10",weight:"9kg"},{reps:"8-10",weight:"9kg"},{reps:"8-10",weight:"9kg"}], tip:"3 sec down. No swing.", progression:"10/10/10 → 10kg" },
      { name:"Incline DB Curl", sets:[{reps:"10-12",weight:"6kg"},{reps:"10-12",weight:"6kg"},{reps:"10-12",weight:"6kg"}], tip:"Builds peak. Strict.", progression:"3×12 → 7kg" },
      { name:"Hammer Curl", sets:[{reps:"12",weight:"6kg"},{reps:"12",weight:"6kg"}], tip:"Forearm and brachialis.", progression:"2×12 → 8kg" },
      { name:"Rope Pushdown", sets:[{reps:"10-12",weight:"32kg"},{reps:"10-12",weight:"32kg"},{reps:"10-12",weight:"32kg"}], tip:"Full lockout. 1 sec pause.", progression:"3×12 → 35kg" },
      { name:"Overhead Cable Extension", sets:[{reps:"12-15",weight:"10kg"},{reps:"12-15",weight:"10kg"},{reps:"12-15",weight:"10kg"}], tip:"Stretch is the point.", progression:"3×15 → next weight" },
      { name:"Rear Delt Cable Fly", sets:[{reps:"15-20",weight:"light"},{reps:"15-20",weight:"light"},{reps:"15-20",weight:"light"}], tip:"Chase contraction not weight.", progression:"2x per week" },
      { name:"DB Lateral Raise", sets:[{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"}], tip:"Non-negotiable. Every session.", progression:"4×20 → 7kg" },
    ]},
  { id:4, label:"S4", title:"Rest + Recovery", tag:"Grow", tagColor:"#22c55e", note:"Muscles grow here. This day is training.",
    exercises:[{ name:"Stomach Vacuums", sets:[{reps:"20-30 sec",weight:"×5"}], tip:"Before breakfast. Tightens waist fast.", progression:"Build to 45 sec" }]},
  { id:5, label:"S5", title:"Chest + Side Delts", tag:"Volume", tagColor:"#f97316", note:"Chest gets proper volume. Delts tacked on for frequency.",
    exercises:[
      { name:"Incline DB Press", sets:[{reps:"8-10",weight:"16kg"},{reps:"8-10",weight:"16kg"},{reps:"8-10",weight:"16kg"},{reps:"8-10",weight:"16kg"}], tip:"Different angle to S1. Focus on stretch.", progression:"4×10 → 18kg" },
      { name:"Machine Chest Press", sets:[{reps:"10-12",weight:"50kg"},{reps:"10-12",weight:"50kg"},{reps:"10-12",weight:"50kg"}], tip:"Volume not ego. Control the rep.", progression:"3×12 → 54kg" },
      { name:"Incline Cable Fly", sets:[{reps:"12-15",weight:"9kg"},{reps:"12-15",weight:"9kg"},{reps:"12-15",weight:"9kg"}], tip:"Upper chest stretch.", progression:"3×15 → 11kg" },
      { name:"Push-ups", sets:[{reps:"RPE 9",weight:"BW"},{reps:"RPE 9",weight:"BW"}], tip:"Finisher. Leave 1 rep in tank.", progression:"Just pump" },
      { name:"Cable Lateral Raise", sets:[{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"}], tip:"Short rest 30-45 sec.", progression:"4×20 → next pin" },
      { name:"DB Lateral Raise", sets:[{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"}], tip:"Finish the delts.", progression:"3×20 → 7kg" },
    ]},
  { id:6, label:"S6", title:"Legs", tag:"Foundation", tagColor:"#eab308", note:"One leg day. Don't annihilate — legs drain systemic recovery.",
    exercises:[
      { name:"Squat", sets:[{reps:"6-8",weight:"40kg"},{reps:"6-8",weight:"40kg"},{reps:"6-8",weight:"40kg"},{reps:"6-8",weight:"40kg"}], tip:"Stop 1-2 reps shy of failure.", progression:"4×8 → 42.5kg" },
      { name:"Romanian Deadlift", sets:[{reps:"8-10",weight:"40kg"},{reps:"8-10",weight:"40kg"},{reps:"8-10",weight:"40kg"}], tip:"Slow 3 sec down. Hamstrings stretch.", progression:"3×10 → add 2.5kg" },
      { name:"Leg Press", sets:[{reps:"10-12",weight:"moderate"},{reps:"10-12",weight:"moderate"},{reps:"10-12",weight:"moderate"}], tip:"Don't lock out knees.", progression:"3×12 → add weight" },
      { name:"Leg Curl", sets:[{reps:"12-15",weight:"43kg"},{reps:"12-15",weight:"43kg"},{reps:"12-15",weight:"43kg"}], tip:"Slow negatives.", progression:"3×15 → next pin" },
      { name:"Calf Raise (Smith)", sets:[{reps:"12-15",weight:"30kg"},{reps:"12-15",weight:"30kg"},{reps:"12-15",weight:"30kg"},{reps:"12-15",weight:"30kg"}], tip:"Pause at bottom and top.", progression:"4×15 → 35kg" },
      { name:"Hip Abduction", sets:[{reps:"15",weight:"15kg"},{reps:"15",weight:"15kg"},{reps:"15",weight:"15kg"}], tip:"Glute med. Helps V-taper.", progression:"3×15 → next pin" },
    ]},
];

const CARDIO_TYPES = ["Run","Boxing","Cycling","Swim","HIIT","Incline Walk","Other"];
const KEY_LIFTS    = ["Barbell OHP","Incline DB Press","Wide Grip Pulldown","Squat","DB Curl","Rope Pushdown"];

// per 100g cooked — conservative real-world values
const PROTEIN_SOURCES = [
  {name:"Chicken breast",    p:27, f:1,  carb:0},
  {name:"Turkey breast",     p:25, f:1,  carb:0},
  {name:"Lean beef mince",   p:22, f:8,  carb:0},
  {name:"Salmon",            p:20, f:13, carb:0},
  {name:"White fish (cod)",  p:18, f:1,  carb:0},
  {name:"Tuna (canned)",     p:25, f:1,  carb:0},
  {name:"Prawns",            p:20, f:1,  carb:1},
  {name:"Eggs (whole)",      p:13, f:11, carb:1},
  {name:"Egg whites",        p:11, f:0,  carb:1},
  {name:"Greek yogurt (0%)", p:10, f:0,  carb:4},
  {name:"Cottage cheese",    p:11, f:2,  carb:3},
  {name:"Whey (30g serve)",  p:22, f:2,  carb:3},
  {name:"Other protein",     p:18, f:4,  carb:2},
];

// per 100g as served
const VEG_SOURCES = [
  {name:"Broccoli",       p:3, f:0, carb:7},
  {name:"Spinach",        p:3, f:0, carb:4},
  {name:"Mixed salad",    p:2, f:0, carb:3},
  {name:"Cucumber",       p:1, f:0, carb:4},
  {name:"Zucchini",       p:2, f:0, carb:3},
  {name:"Asparagus",      p:2, f:0, carb:4},
  {name:"Green beans",    p:2, f:0, carb:7},
  {name:"Cauliflower",    p:2, f:0, carb:5},
  {name:"Capsicum",       p:1, f:0, carb:6},
  {name:"Mushrooms",      p:3, f:0, carb:3},
  {name:"Bok choy",       p:1, f:0, carb:2},
  {name:"Edamame",        p:11,f:5, carb:8},
  {name:"Baby corn",      p:2, f:0, carb:8},
  {name:"Kale",           p:3, f:1, carb:9},
  {name:"Other veg",      p:2, f:0, carb:5},
];

// per 100g cooked/as served
const CARB_SOURCES = [
  {name:"White rice (cooked)",    p:3, f:0, carb:28},
  {name:"Brown rice (cooked)",    p:3, f:1, carb:23},
  {name:"Jasmine rice (cooked)",  p:3, f:0, carb:29},
  {name:"Sweet potato (baked)",   p:2, f:0, carb:20},
  {name:"White potato (boiled)",  p:2, f:0, carb:17},
  {name:"Oats (cooked)",          p:3, f:2, carb:12},
  {name:"Pasta (cooked)",         p:4, f:1, carb:25},
  {name:"Udon noodles (cooked)",  p:3, f:0, carb:21},
  {name:"Sourdough (per slice)",  p:4, f:1, carb:33},
  {name:"Corn tortilla (each)",   p:2, f:1, carb:20},
  {name:"Banana (medium 120g)",   p:1, f:0, carb:27},
  {name:"Mango (100g)",           p:1, f:0, carb:15},
  {name:"Other carbs",            p:3, f:1, carb:20},
];

const PLATE_COLORS   = ["#f97316","#3b82f6","#a855f7","#22c55e","#ec4899"];
const PROTEIN_TARGET = 160;
const KCAL_TARGET    = 1950;

const newPlate = (idx=0) => ({
  protein: {source:"Chicken breast",         grams:200},
  veg:     {source:"Broccoli",               grams:150},
  carbs:   {source:"White rice (cooked)",    grams:150},
  includeCarbs: idx === 1,
});

function todayKey() { return new Date().toISOString().slice(0,10); }
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}) + " · " + d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
}
function macros(sources, name, grams) {
  const s = sources.find(x => x.name === name);
  const g = parseFloat(grams) || 0;
  if (!s) return {p:0,f:0,carb:0};
  return { p:Math.round((s.p/100)*g), f:Math.round((s.f/100)*g), carb:Math.round((s.carb/100)*g) };
}
function plateMacros(plate) {
  const pm = macros(PROTEIN_SOURCES, plate.protein.source, plate.protein.grams);
  const vm = macros(VEG_SOURCES,     plate.veg.source,     plate.veg.grams);
  const cm = plate.includeCarbs ? macros(CARB_SOURCES, plate.carbs.source, plate.carbs.grams) : {p:0,f:0,carb:0};
  const p=pm.p+vm.p+cm.p, f=pm.f+vm.f+cm.f, carb=pm.carb+vm.carb+cm.carb;
  return {p, f, carb, kcal: p*4+f*9+carb*4};
}

const inp = {fontFamily:"inherit",background:"#0a0a0a",border:"1px solid #1e1e1e",color:"#ccc",borderRadius:5,padding:"4px 7px",fontSize:9,outline:"none"};
const sel = {...inp,cursor:"pointer"};

function Ed({value,onChange,style,placeholder}) {
  const [ed,setEd]=useState(false);
  const [v,setV]=useState(value);
  const r=useRef();
  useEffect(()=>{ if(ed&&r.current)r.current.focus(); },[ed]);
  useEffect(()=>setV(value),[value]);
  const commit=()=>{ setEd(false); if(v!==value)onChange(v); };
  if(ed) return <input ref={r} value={v} onChange={e=>setV(e.target.value)} onBlur={commit} onKeyDown={e=>e.key==="Enter"&&commit()} style={{...style,...inp,padding:"1px 5px"}} placeholder={placeholder}/>;
  return <span onClick={()=>setEd(true)} style={{...style,cursor:"text",borderBottom:"1px dashed #222"}}>{v||<span style={{color:"#2a2a2a"}}>{placeholder}</span>}</span>;
}

// Donut ring pie — grey base fills with macro colour segments
function MacroPie({p,f,carb,size=44}) {
  const totalKcal = p*4 + f*9 + carb*4 || 0;
  const toRad = deg => (deg-90)*Math.PI/180;
  const cx=size/2, cy=size/2, r=size/2-3, ir=r-5;
  const arc = (startDeg, endDeg) => {
    if (endDeg - startDeg >= 359.9) return `M ${cx} ${cy-r} A ${r} ${r} 0 1 1 ${cx-0.01} ${cy-r} Z`;
    const s=toRad(startDeg), e=toRad(endDeg), lg=endDeg-startDeg>180?1:0;
    return `M ${cx+r*Math.cos(s)} ${cy+r*Math.sin(s)} A ${r} ${r} 0 ${lg} 1 ${cx+r*Math.cos(e)} ${cy+r*Math.sin(e)} L ${cx+ir*Math.cos(e)} ${cy+ir*Math.sin(e)} A ${ir} ${ir} 0 ${lg} 0 ${cx+ir*Math.cos(s)} ${cy+ir*Math.sin(s)} Z`;
  };
  const pKcal=p*4, fKcal=f*9, cKcal=carb*4;
  const total=pKcal+fKcal+cKcal||1;
  let deg=0; const segs=[];
  [[pKcal,"#22c55e"],[fKcal,"#f97316"],[cKcal,"#eab308"]].forEach(([k,col])=>{
    const sweep=(k/total)*360;
    if(sweep>0.5) segs.push({start:deg,end:deg+sweep,col});
    deg+=sweep;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grey base ring */}
      <circle cx={cx} cy={cy} r={(r+ir)/2} fill="none" stroke="#222" strokeWidth={r-ir}/>
      {/* Macro colour segments */}
      {totalKcal>0&&segs.map((seg,i)=><path key={i} d={arc(seg.start,seg.end)} fill={seg.col} opacity="0.9"/>)}
      {/* Centre kcal */}
      {totalKcal>0&&<text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle" fill="#777" fontSize={size>40?8:6} fontFamily="monospace">{totalKcal}</text>}
    </svg>
  );
}

export default function App() {
  const [ready,setReady]           = useState(false);
  const [templates,setTemplates]   = useState(DEFAULT_SESSIONS);
  const [history,setHistory]       = useState([]);
  const [deletedHist,setDeletedHist] = useState(null);
  const [liveData,setLiveData]     = useState({});
  const [nutrition,setNutrition]   = useState({});
  const [activeSession,setActiveSession] = useState(0);
  const [activeTab,setActiveTab]   = useState("today");
  const [expandedHist,setExpandedHist] = useState(null);
  const [expandedEx,setExpandedEx] = useState({});
  const [toast,setToast]           = useState(null);
  const [copied,setCopied]         = useState(false);

  useEffect(()=>{
    (async()=>{
      try {
        const [t,h,l,n]=await Promise.all([
          storage.get("lm4-templates"),storage.get("lm4-history"),
          storage.get("lm4-live"),storage.get("lm4-nutrition"),
        ]);
        if(t)setTemplates(t); if(h)setHistory(h);
        if(l)setLiveData(l); if(n)setNutrition(n);
      } catch{}
      setReady(true);
    })();
  },[]);

  const showToast = (msg,dur=2200)=>{ setToast(msg); setTimeout(()=>setToast(null),dur); };
  const saveTpl   = useCallback(async v=>{setTemplates(v);await storage.set("lm4-templates",v);},[]);
  const saveHist  = useCallback(async v=>{setHistory(v); await storage.set("lm4-history",v);},[]);
  const saveLive  = useCallback(async v=>{setLiveData(v);await storage.set("lm4-live",v);},[]);
  const saveNutr  = useCallback(async v=>{setNutrition(v);await storage.set("lm4-nutrition",v);},[]);

  const tpl    = templates[activeSession]||DEFAULT_SESSIONS[0];
  const tc     = tpl.tagColor;
  const lk     = `s${tpl.id}`;
  const live   = liveData[lk]||{sets:{},cardio:[],notes:""};
  const dk     = todayKey();
  const todayN = nutrition[dk]||{plates:[newPlate(0),newPlate(1),newPlate(2)],water:0,weight:"",bodyfat:"",notes:""};

  const updateLive = v=>saveLive({...liveData,[lk]:{...live,...v}});
  const updateNutr = v=>saveNutr({...nutrition,[dk]:{...todayN,...v}});

  const getSet    =(ei,si)=>{ const k=`${ei}-${si}`,lv=live.sets?.[k],tp=tpl.exercises[ei]?.sets[si]; return{reps:lv?.reps??tp?.reps??"10",weight:lv?.weight??tp?.weight??"—",done:lv?.done??false}; };
  const toggleSet =(ei,si)=>{ const k=`${ei}-${si}`; updateLive({sets:{...live.sets,[k]:{...live.sets?.[k],done:!getSet(ei,si).done}}}); };
  const updSetF   =(ei,si,f,v)=>{ const k=`${ei}-${si}`; updateLive({sets:{...live.sets,[k]:{...live.sets?.[k],[f]:v}}}); };
  const addSet    =ei=>{ const l=getSet(ei,tpl.exercises[ei].sets.length-1); saveTpl(templates.map((s,i)=>i!==activeSession?s:{...s,exercises:s.exercises.map((ex,x)=>x!==ei?ex:{...ex,sets:[...ex.sets,{reps:l.reps,weight:l.weight}]})})); };
  const rmSet     =(ei,si)=>{ if(tpl.exercises[ei].sets.length<=1)return; saveTpl(templates.map((s,i)=>i!==activeSession?s:{...s,exercises:s.exercises.map((ex,x)=>x!==ei?ex:{...ex,sets:ex.sets.filter((_,j)=>j!==si)})})); };
  const updExF    =(ei,f,v)=>saveTpl(templates.map((s,i)=>i!==activeSession?s:{...s,exercises:s.exercises.map((ex,x)=>x!==ei?ex:{...ex,[f]:v})}));
  const addEx     =()=>saveTpl(templates.map((s,i)=>i!==activeSession?s:{...s,exercises:[...s.exercises,{name:"New Exercise",sets:[{reps:"10",weight:"—"},{reps:"10",weight:"—"},{reps:"10",weight:"—"}],tip:"Add notes",progression:"Add target"}]}));
  const rmEx      =ei=>saveTpl(templates.map((s,i)=>i!==activeSession?s:{...s,exercises:s.exercises.filter((_,x)=>x!==ei)}));
  const updCardio =(ci,f,v)=>updateLive({cardio:(live.cardio||[]).map((c,i)=>i!==ci?c:{...c,[f]:v})});
  const addCardio =()=>updateLive({cardio:[...(live.cardio||[]),{type:"",duration:"",notes:""}]});
  const rmCardio  =ci=>updateLive({cardio:(live.cardio||[]).filter((_,i)=>i!==ci)});

  const updPlateF =(pi,field,sub,val)=>{ const plates=todayN.plates.map((p,i)=>i!==pi?p:{...p,[field]:{...p[field],[sub]:val}}); updateNutr({plates}); };
  const toggleCarbs=pi=>{ const plates=todayN.plates.map((p,i)=>i!==pi?p:{...p,includeCarbs:!p.includeCarbs}); updateNutr({plates}); };
  const addPlate  =()=>updateNutr({plates:[...todayN.plates,newPlate(todayN.plates.length)]});
  const rmPlate   =pi=>{ if(todayN.plates.length<=1)return; updateNutr({plates:todayN.plates.filter((_,i)=>i!==pi)}); };

  const dayM       = todayN.plates.reduce((acc,pl)=>{ const m=plateMacros(pl); return{p:acc.p+m.p,f:acc.f+m.f,carb:acc.carb+m.carb,kcal:acc.kcal+m.kcal}; },{p:0,f:0,carb:0,kcal:0});
  const proteinPct = Math.min((dayM.p/PROTEIN_TARGET)*100,100);
  const totalSets  = tpl.exercises.reduce((a,ex)=>a+ex.sets.length,0);
  const doneSets   = tpl.exercises.reduce((a,ex,ei)=>a+ex.sets.filter((_,si)=>getSet(ei,si).done).length,0);

  const buildExport = (sess,nutr)=>{
    const lines=[`LOOKSMAXX · ${sess.title}`,fmtDate(sess.date),"─".repeat(28)];
    sess.exercises?.forEach(ex=>{ lines.push(`\n${ex.name}`); ex.sets.forEach((s,i)=>lines.push(`  Set ${i+1}: ${s.reps} @ ${s.weight}${s.done?" ✓":""}`)); });
    const cardio=sess.cardio?.filter(c=>c.type);
    if(cardio?.length){lines.push("\nCARDIO");cardio.forEach(c=>lines.push(`  ${c.type}${c.duration?" · "+c.duration:""}${c.notes?" · "+c.notes:""}`));}
    if(sess.notes)lines.push(`\nNotes: ${sess.notes}`);
    lines.push(`\n${sess.setsCompleted}/${sess.setsTotal} sets`);
    if(nutr){
      lines.push("\n── NUTRITION ──");
      nutr.plates?.forEach((pl,i)=>{ const m=plateMacros(pl); lines.push(`Plate ${i+1}: ${pl.protein.source} ${pl.protein.grams}g + ${pl.veg.source} ${pl.veg.grams}g${pl.includeCarbs?` + ${pl.carbs.source} ${pl.carbs.grams}g`:""} → ${m.p}P ${m.f}F ${m.carb}C ${m.kcal}kcal`); });
      lines.push(`Day: ${sess.dayMacros?.p||0}P · ${sess.dayMacros?.f||0}F · ${sess.dayMacros?.carb||0}C · ${sess.dayMacros?.kcal||0}kcal`);
      if(nutr.weight)lines.push(`Weight: ${nutr.weight}kg${nutr.bodyfat?" · "+nutr.bodyfat+"% BF":""}`);
      if(nutr.water)lines.push(`Water: ${nutr.water}L`);
      if(nutr.notes)lines.push(`Nutr notes: ${nutr.notes}`);
    }
    return lines.join("\n");
  };

  const currentExport = buildExport({title:tpl.title,date:new Date().toISOString(),exercises:tpl.exercises.map((ex,ei)=>({name:ex.name,sets:ex.sets.map((_,si)=>getSet(ei,si))})),cardio:live.cardio||[],notes:live.notes||"",setsCompleted:doneSets,setsTotal:totalSets,dayMacros:dayM},todayN);

  const finishSession = async()=>{
    const sess={id:Date.now(),date:new Date().toISOString(),sessionId:tpl.id,title:tpl.title,tagColor:tc,tag:tpl.tag,
      exercises:tpl.exercises.map((ex,ei)=>({name:ex.name,sets:ex.sets.map((_,si)=>getSet(ei,si))})),
      cardio:live.cardio||[],notes:live.notes||"",setsCompleted:doneSets,setsTotal:totalSets,
      dayMacros:dayM,nutrition:todayN};
    await saveHist([sess,...history].slice(0,100));
    await saveLive({...liveData,[lk]:{sets:{},cardio:[],notes:""}});
    showToast("Session saved ✓");
  };

  const deleteHistItem = i=>{
    const removed=history[i];
    saveHist(history.filter((_,x)=>x!==i));
    setExpandedHist(null);
    setDeletedHist({item:removed,index:i});
    showToast("Deleted",3500);
  };

  const undoDelete = ()=>{
    if(!deletedHist)return;
    const newH=[...history];
    newH.splice(deletedHist.index,0,deletedHist.item);
    saveHist(newH);
    setDeletedHist(null);
    showToast("Restored ✓");
  };

  const copyText = async text=>{ try{await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);showToast("Copied ✓");}catch{showToast("Copy failed");} };

  const getTrend = lift=>{ const pts=[]; [...history].reverse().forEach(s=>{ const ex=s.exercises?.find(e=>e.name===lift); if(ex){const ws=ex.sets.filter(s=>s.done&&!isNaN(parseFloat(s.weight)));if(ws.length)pts.push({w:Math.max(...ws.map(s=>parseFloat(s.weight)))});} }); return pts; };

  if(!ready)return <div style={{background:"#080808",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:"monospace",fontSize:10,color:"#333",letterSpacing:2}}>LOADING...</span></div>;

  const card   = (extra={})=>({background:"#080808",border:"1px solid #1e1e1e",borderRadius:8,padding:"9px 11px",...extra});
  const lbl    = {fontSize:9,letterSpacing:1.5,color:"#444"};
  const ttl    = {fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:"#e0e0e0"};
  const btn    = (extra={})=>({background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",...extra});

  const BarRow = ({label,pct,color})=>(
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <span style={{fontSize:9,color:"#555",minWidth:56,letterSpacing:.3}}>{label}</span>
      <div style={{flex:1,height:2,background:"#1e1e1e",borderRadius:1}}>
        <div style={{height:"100%",background:color,borderRadius:1,width:`${pct}%`,transition:"width .4s"}}/>
      </div>
    </div>
  );

  const Sparkline = ({pts,color,H=38})=>{
    const W=280;
    if(pts.length<2)return <p style={{fontSize:9,color:"#2a2a2a"}}>Log more sessions to see trend.</p>;
    const max=Math.max(...pts.map(p=>p.w)),min=Math.min(...pts.map(p=>p.w)),range=max-min||1;
    return(
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,overflow:"visible"}}>
        <polyline points={pts.map((p,i)=>`${(i/(pts.length-1))*W},${H-2-((p.w-min)/range)*(H-8)}`).join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i)=><circle key={i} cx={(i/(pts.length-1))*W} cy={H-2-((p.w-min)/range)*(H-8)} r={i===pts.length-1?3:2} fill={i===pts.length-1?color:"#1a1a1a"} stroke={color} strokeWidth="1"/>)}
      </svg>
    );
  };

  const WorkoutPanel = ()=>(
    <div>
      <div style={{display:"flex",gap:4,overflowX:"auto",marginBottom:9,scrollbarWidth:"none"}}>
        {templates.map((s,i)=>(
          <button key={s.id} onClick={()=>setActiveSession(i)} style={{flexShrink:0,padding:"3px 10px",borderRadius:20,background:activeSession===i?s.tagColor:"#0a0a0a",color:activeSession===i?"#000":"#555",fontSize:9,letterSpacing:1,border:`1px solid ${activeSession===i?s.tagColor:"#1e1e1e"}`,cursor:"pointer",fontFamily:"inherit"}}>
            {s.label}
          </button>
        ))}
      </div>
      <div style={{marginBottom:9}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
          <span style={ttl}>{tpl.title}</span>
          <span style={{fontSize:8,padding:"2px 6px",borderRadius:3,background:tc+"1a",color:tc,letterSpacing:1}}>{tpl.tag}</span>
        </div>
        <BarRow label="SETS" pct={totalSets?(doneSets/totalSets)*100:0} color={tc}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {tpl.exercises.map((ex,ei)=>{
          const allDone=ex.sets.every((_,si)=>getSet(ei,si).done);
          const open=expandedEx[ei];
          return(
            <div key={ei} style={{...card(),border:`1px solid ${allDone?tc+"44":"#1e1e1e"}`,opacity:allDone?.55:1,transition:"all .2s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <Ed value={ex.name} onChange={v=>updExF(ei,"name",v)} style={{fontSize:11,color:"#ccc"}} placeholder="Exercise"/>
                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  <button onClick={()=>setExpandedEx(p=>({...p,[ei]:!p[ei]}))} style={btn({fontSize:9,color:"#2a2a2a"})}>{open?"▲":"▼"}</button>
                  <button onClick={()=>rmEx(ei)} style={btn({fontSize:10,color:"#222",padding:"1px 3px"})}>✕</button>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3,marginBottom:4}}>
                {ex.sets.map((_,si)=>{
                  const s=getSet(ei,si);
                  return(
                    <div key={si} style={{display:"flex",alignItems:"center",gap:5}}>
                      <div onClick={()=>toggleSet(ei,si)} style={{width:13,height:13,borderRadius:"50%",flexShrink:0,cursor:"pointer",border:`1.5px solid ${s.done?tc:"#222"}`,background:s.done?tc:"none",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                        {s.done&&<span style={{fontSize:6,color:"#000",fontWeight:"bold"}}>✓</span>}
                      </div>
                      <span style={{fontSize:8,color:"#2a2a2a",minWidth:9}}>{si+1}</span>
                      <Ed value={s.reps} onChange={v=>updSetF(ei,si,"reps",v)} style={{fontSize:9,color:"#555",minWidth:28}} placeholder="reps"/>
                      <span style={{fontSize:8,color:"#1e1e1e"}}>@</span>
                      <Ed value={s.weight} onChange={v=>updSetF(ei,si,"weight",v)} style={{fontSize:9,color:tc,flex:1}} placeholder="wt"/>
                      <button onClick={()=>rmSet(ei,si)} style={btn({fontSize:9,color:"#222",padding:"0 2px"})}>−</button>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button onClick={()=>addSet(ei)} style={btn({fontSize:8,color:"#2a2a2a",letterSpacing:1})}>+ SET</button>
                {open&&<Ed value={ex.progression} onChange={v=>updExF(ei,"progression",v)} style={{fontSize:8,color:"#2a2a2a"}} placeholder="next target"/>}
              </div>
              {open&&<div style={{marginTop:5,paddingTop:5,borderTop:"1px solid #111"}}><Ed value={ex.tip} onChange={v=>updExF(ei,"tip",v)} style={{fontSize:8,color:"#333",lineHeight:1.5}} placeholder="Tip..."/></div>}
            </div>
          );
        })}
      </div>
      <button onClick={addEx} style={{width:"100%",marginTop:5,padding:"6px",background:"none",border:"1px dashed #1a1a1a",borderRadius:7,color:"#2a2a2a",fontSize:8,letterSpacing:2,cursor:"pointer",fontFamily:"inherit"}}>+ ADD EXERCISE</button>
      <div style={{...card(),marginTop:7}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={lbl}>CARDIO</span>
          <button onClick={addCardio} style={btn({fontSize:8,color:"#22c55e",letterSpacing:1})}>+ ADD</button>
        </div>
        {(!live.cardio||live.cardio.length===0)&&<p style={{fontSize:9,color:"#2a2a2a"}}>None logged.</p>}
        {(live.cardio||[]).map((c,ci)=>(
          <div key={ci} style={{marginBottom:6,paddingBottom:6,borderBottom:ci<live.cardio.length-1?"1px solid #111":"none"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:5}}>
                  {CARDIO_TYPES.map(t=><button key={t} onClick={()=>updCardio(ci,"type",t)} style={{padding:"2px 7px",borderRadius:20,fontSize:8,background:c.type===t?"#22c55e":"#0a0a0a",color:c.type===t?"#000":"#444",border:`1px solid ${c.type===t?"#22c55e":"#1a1a1a"}`,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>)}
                </div>
                <div style={{display:"flex",gap:5}}>
                  <input value={c.duration} onChange={e=>updCardio(ci,"duration",e.target.value)} placeholder="Duration" style={{...inp,flex:1}}/>
                  <input value={c.notes}    onChange={e=>updCardio(ci,"notes",e.target.value)}    placeholder="Notes"    style={{...inp,flex:1}}/>
                </div>
              </div>
              <button onClick={()=>rmCardio(ci)} style={btn({fontSize:10,color:"#252525",padding:"1px 5px",marginLeft:5})}>✕</button>
            </div>
          </div>
        ))}
      </div>
      <textarea value={live.notes||""} onChange={e=>updateLive({notes:e.target.value})} placeholder="Session notes..." rows={2} style={{width:"100%",marginTop:6,...inp,padding:"7px 9px",fontSize:10,resize:"none",lineHeight:1.6,color:"#444"}}/>
    </div>
  );

  const NutritionPanel = ()=>(
    <div>
      <div style={{marginBottom:9}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
          <span style={ttl}>NUTRITION</span>
        </div>
        <BarRow label="PROTEIN" pct={proteinPct} color={dayM.p>=PROTEIN_TARGET?"#22c55e":tc}/>
      </div>

      {todayN.plates.map((plate,pi)=>{
        const col=PLATE_COLORS[pi%PLATE_COLORS.length];
        const pm=plateMacros(plate);
        return(
          <div key={pi} style={{...card({border:`1px solid ${col}44`}),marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <MacroPie p={pm.p} f={pm.f} carb={pm.carb} size={32}/>
                <span style={{fontSize:10,color:col,letterSpacing:1}}>Plate {pi+1}</span>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <button onClick={()=>toggleCarbs(pi)} style={{fontSize:8,padding:"2px 7px",borderRadius:20,background:plate.includeCarbs?"#1a1500":"none",color:plate.includeCarbs?"#eab308":"#333",border:`1px solid ${plate.includeCarbs?"#eab30844":"#222"}`,cursor:"pointer",fontFamily:"inherit"}}>
                  {plate.includeCarbs?"CARBS ✓":"+ CARBS"}
                </button>
                {todayN.plates.length>1&&<button onClick={()=>rmPlate(pi)} style={btn({fontSize:10,color:"#2a2a2a",padding:"1px 3px"})}>✕</button>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
              <span style={{fontSize:8,color:"#444",width:26,flexShrink:0}}>PROT</span>
              <select value={plate.protein.source} onChange={e=>updPlateF(pi,"protein","source",e.target.value)} style={{...sel,flex:2}}>
                {PROTEIN_SOURCES.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <input value={plate.protein.grams} onChange={e=>updPlateF(pi,"protein","grams",e.target.value)} style={{...inp,width:38,textAlign:"center"}} placeholder="g"/>
              <span style={{fontSize:9,color:col,width:24,textAlign:"right",flexShrink:0}}>{macros(PROTEIN_SOURCES,plate.protein.source,plate.protein.grams).p}g</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:plate.includeCarbs?4:0}}>
              <span style={{fontSize:8,color:"#444",width:26,flexShrink:0}}>VEG</span>
              <select value={plate.veg.source} onChange={e=>updPlateF(pi,"veg","source",e.target.value)} style={{...sel,flex:2}}>
                {VEG_SOURCES.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <input value={plate.veg.grams} onChange={e=>updPlateF(pi,"veg","grams",e.target.value)} style={{...inp,width:38,textAlign:"center"}} placeholder="g"/>
              <span style={{fontSize:9,color:"#2a2a2a",width:24,textAlign:"right",flexShrink:0}}>—</span>
            </div>
            {plate.includeCarbs&&(
              <div style={{display:"flex",alignItems:"center",gap:5,paddingTop:4,borderTop:"1px solid #111"}}>
                <span style={{fontSize:8,color:"#444",width:26,flexShrink:0}}>CARB</span>
                <select value={plate.carbs.source} onChange={e=>updPlateF(pi,"carbs","source",e.target.value)} style={{...sel,flex:2}}>
                  {CARB_SOURCES.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
                <input value={plate.carbs.grams} onChange={e=>updPlateF(pi,"carbs","grams",e.target.value)} style={{...inp,width:38,textAlign:"center"}} placeholder="g"/>
                <span style={{fontSize:9,color:"#eab308",width:24,textAlign:"right",flexShrink:0}}>{macros(CARB_SOURCES,plate.carbs.source,plate.carbs.grams).carb}g</span>
              </div>
            )}
            <div style={{display:"flex",gap:8,marginTop:5,paddingTop:4,borderTop:"1px solid #111"}}>
              <span style={{fontSize:8,color:"#22c55e"}}>{pm.p}P</span>
              <span style={{fontSize:8,color:"#f97316"}}>{pm.f}F</span>
              <span style={{fontSize:8,color:"#eab308"}}>{pm.carb}C</span>
              <span style={{fontSize:8,color:"#444",marginLeft:"auto"}}>{pm.kcal} kcal</span>
            </div>
          </div>
        );
      })}

      <button onClick={addPlate} style={{width:"100%",marginBottom:7,padding:"6px",background:"none",border:"1px dashed #1a1a1a",borderRadius:7,color:"#2a2a2a",fontSize:8,letterSpacing:2,cursor:"pointer",fontFamily:"inherit"}}>+ ADD PLATE</button>

      {/* Day total */}
      <div style={{...card(),marginBottom:7,display:"flex",alignItems:"center",gap:14}}>
        <MacroPie p={dayM.p} f={dayM.f} carb={dayM.carb} size={54}/>
        <div style={{flex:1}}>
          <p style={{...lbl,marginBottom:5}}>DAY TOTAL</p>
          <div style={{display:"flex",gap:10,marginBottom:4}}>
            <span style={{fontSize:11,color:"#22c55e"}}>{dayM.p}<span style={{fontSize:8,color:"#333"}}> P</span></span>
            <span style={{fontSize:11,color:"#f97316"}}>{dayM.f}<span style={{fontSize:8,color:"#333"}}> F</span></span>
            <span style={{fontSize:11,color:"#eab308"}}>{dayM.carb}<span style={{fontSize:8,color:"#333"}}> C</span></span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{flex:1,height:2,background:"#1e1e1e",borderRadius:1}}>
              <div style={{height:"100%",background:dayM.kcal>=KCAL_TARGET?"#22c55e":"#555",borderRadius:1,width:`${Math.min((dayM.kcal/KCAL_TARGET)*100,100)}%`,transition:"width .4s"}}/>
            </div>
            <span style={{fontSize:9,color:"#444"}}>{dayM.kcal}/{KCAL_TARGET}</span>
          </div>
        </div>
      </div>

      {/* Water */}
      <div style={{...card(),marginBottom:6}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={lbl}>WATER</span>
          <span style={{fontSize:11,color:todayN.water>=4?"#22c55e":"#3b82f6"}}>{todayN.water}L<span style={{color:"#333",fontSize:9}}> / 4</span></span>
        </div>
        <div style={{height:2,background:"#1e1e1e",borderRadius:1,marginBottom:6}}>
          <div style={{height:"100%",background:todayN.water>=4?"#22c55e":"#3b82f6",borderRadius:1,width:`${Math.min((todayN.water/4)*100,100)}%`,transition:"width .3s"}}/>
        </div>
        <div style={{display:"flex",gap:4}}>
          {[0.25,0.5,0.75,1].map(v=>(
            <button key={v} onClick={()=>updateNutr({water:Math.min(+(todayN.water+v).toFixed(2),10)})} style={{flex:1,padding:"4px 0",borderRadius:4,background:"#0a0a0a",color:"#3b82f6",fontSize:9,border:"1px solid #1a1a1a",cursor:"pointer",fontFamily:"inherit"}}>+{v}</button>
          ))}
          <button onClick={()=>updateNutr({water:0})} style={{padding:"4px 7px",borderRadius:4,background:"#0a0a0a",color:"#333",fontSize:9,border:"1px solid #1a1a1a",cursor:"pointer",fontFamily:"inherit"}}>↺</button>
        </div>
      </div>

      {/* Body stats */}
      <div style={{...card(),marginBottom:6}}>
        <p style={{...lbl,marginBottom:7}}>BODY STATS</p>
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1}}>
            <p style={{fontSize:8,color:"#333",marginBottom:4}}>WEIGHT</p>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <input value={todayN.weight||""} onChange={e=>updateNutr({weight:e.target.value})} placeholder="72.5" style={{...inp,flex:1,fontSize:13,color:"#888",textAlign:"center"}}/>
              <span style={{fontSize:9,color:"#333"}}>kg</span>
            </div>
          </div>
          <div style={{flex:1}}>
            <p style={{fontSize:8,color:"#333",marginBottom:4}}>BODY FAT</p>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <input value={todayN.bodyfat||""} onChange={e=>updateNutr({bodyfat:e.target.value})} placeholder="22" style={{...inp,flex:1,fontSize:13,color:"#888",textAlign:"center"}}/>
              <span style={{fontSize:9,color:"#333"}}>%</span>
            </div>
          </div>
        </div>
      </div>

      <textarea value={todayN.notes||""} onChange={e=>updateNutr({notes:e.target.value})} placeholder="Nutrition notes..." rows={2} style={{width:"100%",...inp,padding:"7px 9px",fontSize:10,resize:"none",lineHeight:1.6,color:"#444"}}/>
    </div>
  );

  const HistoryPanel = ()=>(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <p style={lbl}>{history.length} SESSIONS LOGGED</p>
        {deletedHist&&(
          <button onClick={undoDelete} style={{fontSize:9,padding:"3px 10px",borderRadius:4,background:"#1a1500",color:"#eab308",border:"1px solid #eab30844",cursor:"pointer",fontFamily:"inherit",letterSpacing:.5}}>UNDO DELETE</button>
        )}
      </div>
      {history.length===0&&<p style={{fontSize:11,color:"#2a2a2a",marginTop:40,textAlign:"center",lineHeight:2}}>No sessions yet.<br/>Finish a session to build history.</p>}
      {history.map((sess,i)=>(
        <div key={sess.id} style={{...card(),marginBottom:6,padding:0,overflow:"hidden"}}>
          <div onClick={()=>setExpandedHist(expandedHist===i?null:i)} style={{padding:"10px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                <span style={{fontSize:11,color:"#bbb"}}>{sess.title}</span>
                <span style={{fontSize:8,padding:"2px 5px",borderRadius:3,background:sess.tagColor+"1a",color:sess.tagColor}}>{sess.tag}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:9,color:"#333"}}>{fmtDate(sess.date)}</span>
                {sess.dayMacros&&<span style={{fontSize:8,color:"#444"}}>{sess.dayMacros.kcal}kcal · {sess.dayMacros.p}P</span>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:9,color:"#333"}}>{sess.setsCompleted}/{sess.setsTotal}</span>
              <span style={{fontSize:9,color:"#2a2a2a"}}>{expandedHist===i?"▲":"▼"}</span>
            </div>
          </div>
          {expandedHist===i&&(
            <div style={{padding:"0 12px 12px",borderTop:"1px solid #111"}}>
              {sess.exercises?.map((ex,ei)=>(
                <div key={ei} style={{marginTop:8}}>
                  <p style={{fontSize:10,color:"#555",marginBottom:4}}>{ex.name}</p>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {ex.sets.map((s,si)=>(
                      <span key={si} style={{fontSize:9,padding:"2px 7px",borderRadius:4,background:s.done?sess.tagColor+"1a":"#0a0a0a",color:s.done?sess.tagColor:"#333",border:`1px solid ${s.done?sess.tagColor+"33":"#141414"}`}}>{s.reps} @ {s.weight}</span>
                    ))}
                  </div>
                </div>
              ))}
              {sess.cardio?.filter(c=>c.type).length>0&&(
                <div style={{marginTop:8}}>
                  <p style={{fontSize:8,color:"#22c55e",marginBottom:3,letterSpacing:1}}>CARDIO</p>
                  {sess.cardio.filter(c=>c.type).map((c,ci)=><p key={ci} style={{fontSize:9,color:"#444"}}>{c.type}{c.duration?" · "+c.duration:""}{c.notes?" · "+c.notes:""}</p>)}
                </div>
              )}
              {sess.dayMacros&&(
                <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10}}>
                  <MacroPie p={sess.dayMacros.p} f={sess.dayMacros.f} carb={sess.dayMacros.carb} size={36}/>
                  <div style={{display:"flex",gap:8}}>
                    <span style={{fontSize:9,color:"#22c55e"}}>{sess.dayMacros.p}P</span>
                    <span style={{fontSize:9,color:"#f97316"}}>{sess.dayMacros.f}F</span>
                    <span style={{fontSize:9,color:"#eab308"}}>{sess.dayMacros.carb}C</span>
                    <span style={{fontSize:9,color:"#444"}}>{sess.dayMacros.kcal}kcal</span>
                  </div>
                </div>
              )}
              {sess.nutrition?.weight&&<p style={{fontSize:9,color:"#444",marginTop:5}}>{sess.nutrition.weight}kg{sess.nutrition.bodyfat?" · "+sess.nutrition.bodyfat+"%BF":""}</p>}
              {sess.notes&&<p style={{fontSize:9,color:"#333",marginTop:6,fontStyle:"italic"}}>{sess.notes}</p>}
              <div style={{display:"flex",gap:7,marginTop:10}}>
                <button onClick={()=>copyText(buildExport(sess,sess.nutrition))} style={{fontSize:9,padding:"4px 12px",borderRadius:4,background:"#0a0a0a",color:"#555",border:"1px solid #1a1a1a",cursor:"pointer",fontFamily:"inherit"}}>COPY FOR CLAUDE</button>
                <button onClick={()=>deleteHistItem(i)} style={{fontSize:9,padding:"4px 12px",borderRadius:4,background:"#0a0a0a",color:"#442222",border:"1px solid #2a1a1a",cursor:"pointer",fontFamily:"inherit"}}>DELETE</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const TrendsPanel = ()=>{
    const wpts=Object.entries(nutrition).filter(([,v])=>v.weight&&!isNaN(parseFloat(v.weight))).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>({w:parseFloat(v.weight)}));
    const bfpts=Object.entries(nutrition).filter(([,v])=>v.bodyfat&&!isNaN(parseFloat(v.bodyfat))).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>({w:parseFloat(v.bodyfat)}));
    const StatCard=({label,pts,color,unit=""})=>{ const latest=pts[pts.length-1],prev=pts[pts.length-2],delta=prev?+(latest.w-prev.w).toFixed(1):0; return(
      <div style={{...card(),marginBottom:6}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
          <span style={{fontSize:10,color:"#888"}}>{label}</span>
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            <span style={{fontSize:10,color:"#555"}}>{latest.w}{unit}</span>
            {prev&&<span style={{fontSize:9,color:delta<0?"#22c55e":"#ef4444"}}>{delta<0?"▼":"▲"}{Math.abs(delta)}{unit}</span>}
          </div>
        </div>
        <Sparkline pts={pts} color={color}/>
      </div>
    );};
    return(
      <div>
        <p style={{...lbl,marginBottom:14}}>LIFT TRENDS</p>
        {KEY_LIFTS.map(lift=>{ const pts=getTrend(lift); if(!pts.length)return null;
          const latest=pts[pts.length-1],prev=pts[pts.length-2],delta=prev?latest.w-prev.w:0;
          return(<div key={lift} style={{...card(),marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
              <span style={{fontSize:10,color:"#888"}}>{lift}</span>
              <div style={{display:"flex",gap:7,alignItems:"center"}}>
                <span style={{fontSize:10,color:"#555"}}>{latest.w}kg</span>
                {prev&&<span style={{fontSize:9,color:delta>0?"#22c55e":"#ef4444"}}>{delta>0?"▲":"▼"}{Math.abs(delta)}kg</span>}
              </div>
            </div>
            <Sparkline pts={pts} color={tc}/>
          </div>);
        })}
        {wpts.length>=2&&<StatCard label="Bodyweight" pts={wpts} color="#22c55e" unit="kg"/>}
        {bfpts.length>=2&&<StatCard label="Body Fat %" pts={bfpts} color="#3b82f6" unit="%"/>}
        {KEY_LIFTS.every(l=>!getTrend(l).length)&&wpts.length<2&&<p style={{fontSize:11,color:"#2a2a2a",marginTop:40,textAlign:"center",lineHeight:2}}>No data yet.<br/>Finish sessions to start tracking.</p>}
      </div>
    );
  };

  return(
    <div style={{fontFamily:"'DM Mono','Courier New',monospace",background:"#080808",minHeight:"100vh",color:"#e5e5e5"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:2px;height:2px;} ::-webkit-scrollbar-thumb{background:#1a1a1a;}
        input,select,textarea{font-family:inherit;}
        @media(max-width:640px){.grid2{grid-template-columns:1fr!important;}}
      `}</style>

      {toast&&(
        <div style={{position:"fixed",top:14,left:"50%",transform:"translateX(-50%)",background:"#1a1a1a",color:"#ccc",fontSize:10,padding:"7px 14px",borderRadius:20,zIndex:999,letterSpacing:.5,whiteSpace:"nowrap",display:"flex",gap:10,alignItems:"center",border:"1px solid #333"}}>
          {toast}
          {deletedHist&&<button onClick={undoDelete} style={{background:"#eab308",color:"#000",border:"none",borderRadius:3,padding:"2px 8px",fontSize:9,cursor:"pointer",fontFamily:"inherit",letterSpacing:.5}}>UNDO</button>}
        </div>
      )}

      <div style={{padding:"13px 14px 0",borderBottom:"1px solid #111"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"baseline",gap:8}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:3,color:"#fff"}}>LOOKSMAXX</span>
              <span style={{fontSize:9,color:"#2a2a2a",letterSpacing:1}}>{USER === "demo" ? "DEMO" : USER.toUpperCase()}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:9,color:"#2a2a2a"}}>{new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span>
              {activeTab==="today"&&<>
                <button onClick={()=>copyText(currentExport)} style={{fontSize:9,padding:"4px 10px",borderRadius:4,background:copied?"#22c55e":"#111",color:copied?"#000":"#555",border:`1px solid ${copied?"#22c55e":"#1e1e1e"}`,cursor:"pointer",fontFamily:"inherit"}}>{copied?"✓":"COPY"}</button>
                <button onClick={finishSession} style={{fontSize:9,padding:"4px 10px",borderRadius:4,background:doneSets>0?tc:"#111",color:doneSets>0?"#000":"#2a2a2a",border:`1px solid ${doneSets>0?tc:"#1e1e1e"}`,cursor:"pointer",fontFamily:"inherit"}}>FINISH</button>
              </>}
            </div>
          </div>
          <div style={{display:"flex"}}>
            {[["today","TODAY"],["history","HISTORY"],["trends","TRENDS"],["info","INFO"]].map(([t,l])=>(
              <button key={t} onClick={()=>setActiveTab(t)} style={{padding:"5px 11px",background:"none",border:"none",borderBottom:activeTab===t?`2px solid ${tc}`:"2px solid transparent",fontSize:9,letterSpacing:1.5,color:activeTab===t?"#fff":"#333",cursor:"pointer",fontFamily:"inherit"}}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"0 14px 60px"}}>
        {activeTab==="today"&&(
          <div className="grid2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,paddingTop:12,alignItems:"start"}}>
            <WorkoutPanel/>
            <NutritionPanel/>
          </div>
        )}
        {activeTab==="history"&&<div style={{paddingTop:14}}><HistoryPanel/></div>}
        {activeTab==="trends"&&<div style={{paddingTop:14}}><TrendsPanel/></div>}
        {activeTab==="info"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:14}}>
            <div>
              <p style={{...lbl,marginBottom:9}}>TARGETS</p>
              {[["Calories","~1950 kcal"],["Protein","160g daily"],["Water","3–4L"],["Sodium","Consistent"]].map(([l,v],i)=>(
                <div key={i} style={{...card(),marginBottom:5,display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:8,color:"#333"}}>{l}</span><span style={{fontSize:9,color:tc}}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <p style={{...lbl,marginBottom:9}}>RULES</p>
              {["Reps before weight","Hit top of range first","Strength in deficit = winning","Compounds: 1-2 reps shy","Elbow pain → drop weight"].map((r,i)=>(
                <div key={i} style={{display:"flex",gap:7,...card(),marginBottom:5}}>
                  <span style={{fontSize:8,color:tc,minWidth:14}}>0{i+1}</span>
                  <span style={{fontSize:9,color:"#333",lineHeight:1.5}}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
