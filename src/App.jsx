import { useState, useRef, useEffect, useCallback } from "react";

// ── User param: yourapp.com?user=jake ────────────────────────────
const ALLOWED_USERS = ["jake","sarah","mike","tom","emma","alex","chris","nat","ben","lily"];
const DEFAULT_USER  = "demo";

// 🔑 Replace with your Anthropic API key
const ANTHROPIC_API_KEY = "YOUR_API_KEY_HERE";

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
  return <span onClick={()=>setEd(true)} style={{...style,cursor:"text",borderBottom:"1px dashed #222"}}>{v||<span style={{color:"#888"}}>{placeholder}</span>}</span>;
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

// ══════════════════════════════════════════════════════════════
// WIZARD — onboarding slide-in panel
// ══════════════════════════════════════════════════════════════

const GOALS = [
  { id:"aesthetic",  label:"Aesthetic",     desc:"Broad shoulders, arms, chest. Look good.", icon:"◈", color:"#f97316" },
  { id:"fat_loss",   label:"Fat Loss",      desc:"Cut body fat, keep muscle. Leaner look.",  icon:"◎", color:"#22c55e" },
  { id:"strength",   label:"Strength",      desc:"Get strong. Compound lifts, heavy.",        icon:"◉", color:"#3b82f6" },
  { id:"glutes",     label:"Glutes & Legs", desc:"Lower body focus. Glutes, hamstrings.",     icon:"◍", color:"#ec4899" },
  { id:"general",    label:"General Fit",   desc:"Balanced beginner program. All bases.",     icon:"◌", color:"#a855f7" },
];

const EQUIPMENT = ["Full gym","Dumbbells only","Barbells + rack","Machines only","Home gym","Resistance bands"];
const INJURIES  = ["None","Lower back","Knees","Shoulders","Elbows/wrists","Hips","Neck"];

const STEPS = ["Welcome","Body Stats","Goal","Training","Limitations"];

function Wizard({profile, onComplete, onSkip}) {
  const [step, setStep]   = useState(0);
  const [data, setData]   = useState({
    name:"", age:"", height:"", weight:"", bodyfat:"",
    goal:"aesthetic",
    daysPerWeek:"4", sessionLength:"60",
    equipment:"Full gym", injuries:[], other:"",
  });

  const set = (k,v) => setData(p=>({...p,[k]:v}));
  const toggleInj = v => set("injuries", data.injuries.includes(v) ? data.injuries.filter(x=>x!==v) : [...data.injuries, v]);

  const inp  = {fontFamily:"inherit",background:"#111",border:"1px solid #1e1e1e",color:"#ccc",borderRadius:6,padding:"9px 12px",fontSize:12,outline:"none",width:"100%"};
  const lbl  = {fontSize:9,letterSpacing:1.5,color:"#888",display:"block",marginBottom:5};
  const card = (active,color="#f97316")=>({
    background:active?"#0f0f0f":"#080808",
    border:`1px solid ${active?color+"66":"#1e1e1e"}`,
    borderRadius:10,padding:"12px 14px",cursor:"pointer",
    transition:"all .15s",
  });

  const canNext = () => true;

  // ── Progress bar ──
  const Progress = ()=>(
    <div style={{marginBottom:28}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:"#fff"}}>LOOKSMAXX</span>
        <span style={{fontSize:9,color:"#777"}}>{step+1} / {STEPS.length}</span>
      </div>
      <div style={{display:"flex",gap:4}}>
        {STEPS.map((s,i)=>(
          <div key={i} style={{flex:1,height:2,borderRadius:1,background:i<=step?"#f97316":"#1e1e1e",transition:"background .3s"}}/>
        ))}
      </div>
      <p style={{fontSize:9,color:"#888",marginTop:7,letterSpacing:1}}>{STEPS[step].toUpperCase()}</p>
    </div>
  );

  // ── Step 0: Welcome ──
  if(step===0) return(
    <div>
      <Progress/>
      <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:2,color:"#fff",lineHeight:1.1,marginBottom:12}}>
        LET'S BUILD<br/>YOUR PROGRAM.
      </p>
      <p style={{fontSize:11,color:"#777",lineHeight:1.7,marginBottom:28}}>
        5 quick questions. We'll set up a training split personalised to your body, goal, and schedule.
      </p>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <span style={lbl}>YOUR NAME (optional)</span>
          <input value={data.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Jake" style={inp}/>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:28}}>
        <button onClick={onSkip} style={{background:"none",border:"none",color:"#888",fontSize:9,cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>SKIP SETUP</button>
        <button onClick={()=>setStep(1)} style={{background:"#f97316",color:"#000",border:"none",borderRadius:8,padding:"11px 28px",fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>LET'S GO →</button>
      </div>
    </div>
  );

  // ── Step 1: Body Stats ──
  if(step===1) return(
    <div>
      <Progress/>
      <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,color:"#fff",marginBottom:18}}>BODY STATS</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div><span style={lbl}>AGE</span><input value={data.age} onChange={e=>set("age",e.target.value)} placeholder="22" style={inp} type="number"/></div>
        <div><span style={lbl}>HEIGHT (cm)</span><input value={data.height} onChange={e=>set("height",e.target.value)} placeholder="173" style={inp} type="number"/></div>
        <div><span style={lbl}>WEIGHT (kg)</span><input value={data.weight} onChange={e=>set("weight",e.target.value)} placeholder="72.5" style={inp} type="number"/></div>
        <div><span style={lbl}>BODY FAT % (est.)</span><input value={data.bodyfat} onChange={e=>set("bodyfat",e.target.value)} placeholder="22" style={inp} type="number"/></div>
      </div>
      <p style={{fontSize:9,color:"#888",lineHeight:1.6}}>Body fat is optional — best guess is fine. Used to tailor the program.</p>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:28}}>
        <button onClick={()=>setStep(0)} style={{background:"none",border:"1px solid #1e1e1e",color:"#888",fontSize:9,cursor:"pointer",fontFamily:"inherit",borderRadius:6,padding:"8px 18px",letterSpacing:1}}>← BACK</button>
        <button onClick={()=>setStep(2)} disabled={!canNext()} style={{background:canNext()?"#f97316":"#111",color:canNext()?"#000":"#333",border:"none",borderRadius:8,padding:"11px 28px",fontSize:11,cursor:canNext()?"pointer":"default",fontFamily:"inherit",letterSpacing:1,transition:"all .2s"}}>NEXT →</button>
      </div>
    </div>
  );

  // ── Step 2: Goal ──
  if(step===2) return(
    <div>
      <Progress/>
      <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,color:"#fff",marginBottom:6}}>WHAT'S THE GOAL?</p>
      <p style={{fontSize:9,color:"#888",marginBottom:18,lineHeight:1.6}}>This shapes your entire split — exercise selection, volume, intensity.</p>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {GOALS.map(g=>(
          <div key={g.id} onClick={()=>set("goal",g.id)} style={card(data.goal===g.id, g.color)}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:22,color:data.goal===g.id?g.color:"#888",transition:"color .15s"}}>{g.icon}</span>
              <div>
                <p style={{fontSize:12,color:data.goal===g.id?"#fff":"#555",marginBottom:2,transition:"color .15s"}}>{g.label}</p>
                <p style={{fontSize:9,color:data.goal===g.id?"#666":"#2a2a2a",lineHeight:1.5,transition:"color .15s"}}>{g.desc}</p>
              </div>
              {data.goal===g.id&&<span style={{marginLeft:"auto",fontSize:10,color:g.color}}>✓</span>}
            </div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:24}}>
        <button onClick={()=>setStep(1)} style={{background:"none",border:"1px solid #1e1e1e",color:"#888",fontSize:9,cursor:"pointer",fontFamily:"inherit",borderRadius:6,padding:"8px 18px",letterSpacing:1}}>← BACK</button>
        <button onClick={()=>setStep(3)} style={{background:"#f97316",color:"#000",border:"none",borderRadius:8,padding:"11px 28px",fontSize:11,cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>NEXT →</button>
      </div>
    </div>
  );

  // ── Step 3: Training Setup ──
  if(step===3) return(
    <div>
      <Progress/>
      <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,color:"#fff",marginBottom:18}}>TRAINING SETUP</p>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div>
          <span style={lbl}>DAYS PER WEEK</span>
          <div style={{display:"flex",gap:6}}>
            {["2","3","4","5","6"].map(d=>(
              <button key={d} onClick={()=>set("daysPerWeek",d)} style={{flex:1,padding:"10px 0",borderRadius:7,background:data.daysPerWeek===d?"#f97316":"#111",color:data.daysPerWeek===d?"#000":"#444",border:`1px solid ${data.daysPerWeek===d?"#f97316":"#1e1e1e"}`,cursor:"pointer",fontFamily:"inherit",fontSize:12,transition:"all .15s"}}>{d}</button>
            ))}
          </div>
        </div>
        <div>
          <span style={lbl}>SESSION LENGTH</span>
          <div style={{display:"flex",gap:6}}>
            {[["30","30m"],["45","45m"],["60","1hr"],["75","75m"],["90","90m+"]].map(([v,l])=>(
              <button key={v} onClick={()=>set("sessionLength",v)} style={{flex:1,padding:"10px 0",borderRadius:7,background:data.sessionLength===v?"#f97316":"#111",color:data.sessionLength===v?"#000":"#444",border:`1px solid ${data.sessionLength===v?"#f97316":"#1e1e1e"}`,cursor:"pointer",fontFamily:"inherit",fontSize:10,transition:"all .15s"}}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <span style={lbl}>EQUIPMENT ACCESS</span>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {EQUIPMENT.map(e=>(
              <button key={e} onClick={()=>set("equipment",e)} style={{padding:"7px 12px",borderRadius:6,background:data.equipment===e?"#f97316":"#111",color:data.equipment===e?"#000":"#444",border:`1px solid ${data.equipment===e?"#f97316":"#1e1e1e"}`,cursor:"pointer",fontFamily:"inherit",fontSize:9,transition:"all .15s"}}>{e}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:28}}>
        <button onClick={()=>setStep(2)} style={{background:"none",border:"1px solid #1e1e1e",color:"#888",fontSize:9,cursor:"pointer",fontFamily:"inherit",borderRadius:6,padding:"8px 18px",letterSpacing:1}}>← BACK</button>
        <button onClick={()=>setStep(4)} disabled={!canNext()} style={{background:canNext()?"#f97316":"#111",color:canNext()?"#000":"#333",border:"none",borderRadius:8,padding:"11px 28px",fontSize:11,cursor:canNext()?"pointer":"default",fontFamily:"inherit",letterSpacing:1,transition:"all .2s"}}>NEXT →</button>
      </div>
    </div>
  );

  // ── Step 4: Limitations ──
  if(step===4) return(
    <div>
      <Progress/>
      <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,color:"#fff",marginBottom:6}}>ANY LIMITATIONS?</p>
      <p style={{fontSize:9,color:"#888",marginBottom:16,lineHeight:1.6}}>Injuries, pain, or movements to avoid. Skipped exercises won't appear in your program.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
        {INJURIES.map(inj=>{
          const active=data.injuries.includes(inj);
          return(
            <button key={inj} onClick={()=>toggleInj(inj)} style={{padding:"7px 12px",borderRadius:6,background:active?"#1a0a0a":"#111",color:active?"#ef4444":"#444",border:`1px solid ${active?"#ef444444":"#1e1e1e"}`,cursor:"pointer",fontFamily:"inherit",fontSize:9,transition:"all .15s"}}>{inj}</button>
          );
        })}
      </div>
      <div>
        <span style={lbl}>ANYTHING ELSE?</span>
        <textarea value={data.other} onChange={e=>set("other",e.target.value)} placeholder="e.g. no barbell squats, prefer machines..." rows={2} style={{fontFamily:"inherit",background:"#111",border:"1px solid #1e1e1e",color:"#ccc",borderRadius:6,padding:"9px 12px",fontSize:11,outline:"none",width:"100%",resize:"none",lineHeight:1.6}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:24}}>
        <button onClick={()=>setStep(3)} style={{background:"none",border:"1px solid #1e1e1e",color:"#888",fontSize:9,cursor:"pointer",fontFamily:"inherit",borderRadius:6,padding:"8px 18px",letterSpacing:1}}>← BACK</button>
        <button onClick={()=>setStep(5)} style={{background:"#f97316",color:"#000",border:"none",borderRadius:8,padding:"11px 28px",fontSize:11,cursor:"pointer",fontFamily:"inherit",letterSpacing:1,fontWeight:"bold"}}>GENERATE MY PROGRAM →</button>
      </div>
    </div>
  );

  // ── Step 5: Generate + Preview ──
  if(step===5) return(
    <WizardGenerate
      data={data}
      onApply={(program)=>onComplete({...data, program})}
      onBack={()=>setStep(4)}
    />
  );

  return null;
}

// ── WizardGenerate — API call, loading, preview ───────────────
const LOADING_MSGS = [
  "Analysing your stats...",
  "Matching goal to training science...",
  "Building your split...",
  "Selecting exercises...",
  "Writing progression targets...",
  "Almost there...",
];

function WizardGenerate({data, onApply, onBack}) {
  const [phase, setPhase]       = useState("idle"); // idle | loading | preview | error
  const [msgIdx, setMsgIdx]     = useState(0);
  const [program, setProgram]   = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef                = useRef(null);

  const goalLabel = {aesthetic:"Aesthetic / Physique",fat_loss:"Fat Loss",strength:"Strength",glutes:"Glutes & Legs",general:"General Fitness"}[data.goal]||data.goal;

  const startGeneration = async () => {
    setPhase("loading");
    setMsgIdx(0);

    // cycle loading messages
    let i=0;
    timerRef.current = setInterval(()=>{ i=(i+1)%LOADING_MSGS.length; setMsgIdx(i); }, 2400);

    const prompt = `You are an expert personal trainer. Generate a personalised workout program as JSON.

USER PROFILE:
- Name: ${data.name||"User"}
- Age: ${data.age}, Height: ${data.height}cm, Weight: ${data.weight}kg, Body fat: ${data.bodyfat||"unknown"}%
- Goal: ${goalLabel}
- Training days per week: ${data.daysPerWeek}
- Session length: ${data.sessionLength} minutes
- Equipment: ${data.equipment}
- Injuries/limitations: ${data.injuries.length?data.injuries.join(", "):"None"}
- Extra notes: ${data.other||"None"}

Generate exactly ${data.daysPerWeek} training sessions (plus 1 rest/recovery day if days < 6).

Return ONLY valid JSON, no markdown, no explanation. Structure:
{
  "sessions": [
    {
      "id": 1,
      "label": "S1",
      "title": "Session Title",
      "tag": "Short Tag",
      "tagColor": "#f97316",
      "note": "One sentence coaching note for this session.",
      "exercises": [
        {
          "name": "Exercise Name",
          "sets": [
            {"reps": "8-10", "weight": "start light"}
          ],
          "tip": "One technique cue.",
          "progression": "When/how to progress"
        }
      ]
    }
  ]
}

RULES:
- tagColor must be one of: #f97316, #3b82f6, #a855f7, #22c55e, #ec4899, #eab308
- Each session should have 4-7 exercises appropriate for ${data.sessionLength} min
- Sets per exercise: 2-5 sets depending on priority
- Reps as strings like "6-8", "10-12", "15-20"
- Weight as strings like "moderate", "heavy", "light", "bodyweight", or a starting suggestion
- Avoid any exercises involving: ${data.injuries.length?data.injuries.join(", "):"none"}
- Match volume and intensity to goal: ${goalLabel}
- One session should be rest/active recovery if total sessions < 6
- Make tips specific and actionable, not generic
- Make progression targets concrete (e.g. "3x10 clean → add 2.5kg")`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","x-api-key": ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({
          model:"claude-opus-4-5",
          max_tokens:4000,
          messages:[{role:"user",content:prompt}]
        })
      });

      clearInterval(timerRef.current);

      if(!res.ok){ const e=await res.json(); throw new Error(e.error?.message||"API error"); }
      const json = await res.json();
      const raw  = json.content?.[0]?.text||"";

      // strip any accidental markdown fences
      const cleaned = raw.replace(/```json|```/g,"").trim();
      const parsed  = JSON.parse(cleaned);

      if(!parsed.sessions?.length) throw new Error("No sessions returned");
      setProgram(parsed.sessions);
      setPhase("preview");

    } catch(err) {
      clearInterval(timerRef.current);
      setErrorMsg(err.message||"Something went wrong");
      setPhase("error");
    }
  };

  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  const ttl = {fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,color:"#fff",marginBottom:8};

  // ── Idle: prompt to generate ──
  if(phase==="idle") return(
    <div>
      <div style={{marginBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:"#fff"}}>LOOKSMAXX</span>
          <span style={{fontSize:9,color:"#777"}}>5 / 5</span>
        </div>
        <div style={{display:"flex",gap:4}}>
          {[0,1,2,3,4].map(i=><div key={i} style={{flex:1,height:2,borderRadius:1,background:"#f97316"}}/>)}
        </div>
        <p style={{fontSize:9,color:"#666",marginTop:7,letterSpacing:1}}>GENERATE</p>
      </div>

      <p style={ttl}>READY TO BUILD.</p>
      <p style={{fontSize:11,color:"#777",lineHeight:1.8,marginBottom:20}}>
        Based on your profile, Claude will generate a personalised {data.daysPerWeek}-day program tailored to your goal, schedule, and limitations.
      </p>

      {/* Profile summary */}
      <div style={{background:"#111",border:"1px solid #1e1e1e",borderRadius:10,padding:"14px 16px",marginBottom:24}}>
        <p style={{fontSize:9,color:"#555",letterSpacing:1.5,marginBottom:10}}>YOUR PROFILE</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {[
            ["Goal",    goalLabel],
            ["Days",    `${data.daysPerWeek}x / week`],
            ["Session", `${data.sessionLength} min`],
            ["Equipment", data.equipment],
            ["Weight",  data.weight?`${data.weight}kg`:"—"],
            ["Injuries",data.injuries.length?data.injuries.join(", "):"None"],
          ].map(([k,v])=>(
            <div key={k}>
              <span style={{fontSize:8,color:"#555",display:"block",letterSpacing:.5}}>{k}</span>
              <span style={{fontSize:10,color:"#aaa"}}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <button onClick={onBack} style={{background:"none",border:"1px solid #1e1e1e",color:"#666",fontSize:9,cursor:"pointer",fontFamily:"inherit",borderRadius:6,padding:"8px 18px",letterSpacing:1}}>← BACK</button>
        <button onClick={startGeneration} style={{background:"#f97316",color:"#000",border:"none",borderRadius:8,padding:"13px 28px",fontSize:12,cursor:"pointer",fontFamily:"inherit",letterSpacing:1,fontWeight:"bold"}}>
          GENERATE ✦
        </button>
      </div>
    </div>
  );

  // ── Loading ──
  if(phase==="loading") return(
    <div style={{minHeight:320,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24}}>
      <div style={{position:"relative",width:60,height:60}}>
        <svg viewBox="0 0 60 60" style={{width:60,height:60}}>
          <circle cx="30" cy="30" r="26" fill="none" stroke="#1e1e1e" strokeWidth="3"/>
          <circle cx="30" cy="30" r="26" fill="none" stroke="#f97316" strokeWidth="3"
            strokeDasharray="163" strokeDashoffset="40"
            style={{transformOrigin:"center",animation:"spin 1.2s linear infinite"}}/>
        </svg>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
      <div style={{textAlign:"center"}}>
        <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:"#fff",marginBottom:6}}>BUILDING YOUR PROGRAM</p>
        <p style={{fontSize:10,color:"#777",transition:"all .4s"}}>{LOADING_MSGS[msgIdx]}</p>
      </div>
    </div>
  );

  // ── Error ──
  if(phase==="error") return(
    <div style={{minHeight:280,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,textAlign:"center"}}>
      <span style={{fontSize:32}}>⚠</span>
      <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:"#fff"}}>GENERATION FAILED</p>
      <p style={{fontSize:10,color:"#777",maxWidth:300,lineHeight:1.6}}>{errorMsg}</p>
      <p style={{fontSize:9,color:"#555"}}>Check your API key is correct in the code.</p>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <button onClick={onBack} style={{background:"none",border:"1px solid #1e1e1e",color:"#666",fontSize:9,cursor:"pointer",fontFamily:"inherit",borderRadius:6,padding:"8px 18px"}}>← BACK</button>
        <button onClick={startGeneration} style={{background:"#f97316",color:"#000",border:"none",borderRadius:8,padding:"9px 20px",fontSize:10,cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>TRY AGAIN</button>
      </div>
    </div>
  );

  // ── Preview ──
  if(phase==="preview"&&program) return(
    <div>
      <p style={ttl}>YOUR PROGRAM.</p>
      <p style={{fontSize:10,color:"#777",marginBottom:16,lineHeight:1.6}}>Review your generated split. Apply it to replace your current program, or regenerate.</p>

      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20,maxHeight:"42vh",overflowY:"auto",paddingRight:4}}>
        {program.map((sess,i)=>(
          <div key={i} style={{background:"#111",border:`1px solid ${sess.tagColor}33`,borderRadius:10,padding:"12px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1.5,color:"#fff"}}>{sess.title}</span>
              <span style={{fontSize:8,padding:"2px 6px",borderRadius:3,background:sess.tagColor+"1a",color:sess.tagColor,letterSpacing:1}}>{sess.tag}</span>
            </div>
            <p style={{fontSize:9,color:"#666",marginBottom:8,lineHeight:1.5}}>{sess.note}</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {sess.exercises.map((ex,j)=>(
                <span key={j} style={{fontSize:8,padding:"3px 8px",borderRadius:4,background:"#0a0a0a",color:"#888",border:"1px solid #1e1e1e"}}>{ex.name}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={startGeneration} style={{flex:1,padding:"11px",background:"none",border:"1px solid #1e1e1e",color:"#777",borderRadius:8,fontSize:10,cursor:"pointer",fontFamily:"inherit",letterSpacing:.5}}>↺ REGENERATE</button>
        <button onClick={()=>onApply(program)} style={{flex:2,padding:"11px",background:"#f97316",color:"#000",border:"none",borderRadius:8,fontSize:11,cursor:"pointer",fontFamily:"inherit",letterSpacing:1,fontWeight:"bold"}}>APPLY PROGRAM ✓</button>
      </div>
    </div>
  );

  return null;
}

// ══════════════════════════════════════════════════════════════

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
  const [wizardOpen,setWizardOpen] = useState(false);
  const [profile,setProfile]       = useState(null);

  useEffect(()=>{
    (async()=>{
      try {
        const [t,h,l,n,pr]=await Promise.all([
          storage.get("lm4-templates"),storage.get("lm4-history"),
          storage.get("lm4-live"),storage.get("lm4-nutrition"),
          storage.get("lm4-profile"),
        ]);
        if(t)setTemplates(t); if(h)setHistory(h);
        if(l)setLiveData(l); if(n)setNutrition(n);
        if(pr){ setProfile(pr); } else { setWizardOpen(true); } // new user → open wizard
      } catch{}
      setReady(true);
    })();
  },[]);

  const showToast = (msg,dur=2200)=>{ setToast(msg); setTimeout(()=>setToast(null),dur); };
  const saveTpl     = useCallback(async v=>{setTemplates(v);await storage.set("lm4-templates",v);},[]);
  const saveHist    = useCallback(async v=>{setHistory(v); await storage.set("lm4-history",v);},[]);
  const saveLive    = useCallback(async v=>{setLiveData(v);await storage.set("lm4-live",v);},[]);
  const saveNutr    = useCallback(async v=>{setNutrition(v);await storage.set("lm4-nutrition",v);},[]);
  const saveProfile = useCallback(async v=>{setProfile(v); await storage.set("lm4-profile",v);},[]);

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

  if(!ready)return <div style={{background:"#080808",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:"monospace",fontSize:10,color:"#777",letterSpacing:2}}>LOADING...</span></div>;

  const card   = (extra={})=>({background:"#080808",border:"1px solid #1e1e1e",borderRadius:8,padding:"9px 11px",...extra});
  const lbl    = {fontSize:9,letterSpacing:1.5,color:"#888"};
  const ttl    = {fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:2,color:"#e0e0e0"};
  const btn    = (extra={})=>({background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",...extra});

  const BarRow = ({label,pct,color})=>(
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <span style={{fontSize:9,color:"#777",minWidth:56,letterSpacing:.3}}>{label}</span>
      <div style={{flex:1,height:2,background:"#1e1e1e",borderRadius:1}}>
        <div style={{height:"100%",background:color,borderRadius:1,width:`${pct}%`,transition:"width .4s"}}/>
      </div>
    </div>
  );

  const Sparkline = ({pts,color,H=38})=>{
    const W=280;
    if(pts.length<2)return <p style={{fontSize:9,color:"#888"}}>Log more sessions to see trend.</p>;
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
                  <button onClick={()=>setExpandedEx(p=>({...p,[ei]:!p[ei]}))} style={btn({fontSize:9,color:"#888"})}>{open?"▲":"▼"}</button>
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
                      <span style={{fontSize:8,color:"#888",minWidth:9}}>{si+1}</span>
                      <Ed value={s.reps} onChange={v=>updSetF(ei,si,"reps",v)} style={{fontSize:9,color:"#777",minWidth:28}} placeholder="reps"/>
                      <span style={{fontSize:8,color:"#888"}}>@</span>
                      <Ed value={s.weight} onChange={v=>updSetF(ei,si,"weight",v)} style={{fontSize:9,color:tc,flex:1}} placeholder="wt"/>
                      <button onClick={()=>rmSet(ei,si)} style={btn({fontSize:9,color:"#222",padding:"0 2px"})}>−</button>
                    </div>
                  );
                })}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button onClick={()=>addSet(ei)} style={btn({fontSize:8,color:"#888",letterSpacing:1})}>+ SET</button>
                {open&&<Ed value={ex.progression} onChange={v=>updExF(ei,"progression",v)} style={{fontSize:8,color:"#888"}} placeholder="next target"/>}
              </div>
              {open&&<div style={{marginTop:5,paddingTop:5,borderTop:"1px solid #111"}}><Ed value={ex.tip} onChange={v=>updExF(ei,"tip",v)} style={{fontSize:8,color:"#777",lineHeight:1.5}} placeholder="Tip..."/></div>}
            </div>
          );
        })}
      </div>
      <button onClick={addEx} style={{width:"100%",marginTop:5,padding:"6px",background:"none",border:"1px dashed #1a1a1a",borderRadius:7,color:"#888",fontSize:8,letterSpacing:2,cursor:"pointer",fontFamily:"inherit"}}>+ ADD EXERCISE</button>
      <div style={{...card(),marginTop:7}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={lbl}>CARDIO</span>
          <button onClick={addCardio} style={btn({fontSize:8,color:"#22c55e",letterSpacing:1})}>+ ADD</button>
        </div>
        {(!live.cardio||live.cardio.length===0)&&<p style={{fontSize:9,color:"#888"}}>None logged.</p>}
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
      <textarea value={live.notes||""} onChange={e=>updateLive({notes:e.target.value})} placeholder="Session notes..." rows={2} style={{width:"100%",marginTop:6,...inp,padding:"7px 9px",fontSize:10,resize:"none",lineHeight:1.6,color:"#888"}}/>
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
                {todayN.plates.length>1&&<button onClick={()=>rmPlate(pi)} style={btn({fontSize:10,color:"#888",padding:"1px 3px"})}>✕</button>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
              <span style={{fontSize:8,color:"#888",width:26,flexShrink:0}}>PROT</span>
              <select value={plate.protein.source} onChange={e=>updPlateF(pi,"protein","source",e.target.value)} style={{...sel,flex:2}}>
                {PROTEIN_SOURCES.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <input value={plate.protein.grams} onChange={e=>updPlateF(pi,"protein","grams",e.target.value)} style={{...inp,width:38,textAlign:"center"}} placeholder="g"/>
              <span style={{fontSize:9,color:col,width:24,textAlign:"right",flexShrink:0}}>{macros(PROTEIN_SOURCES,plate.protein.source,plate.protein.grams).p}g</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:plate.includeCarbs?4:0}}>
              <span style={{fontSize:8,color:"#888",width:26,flexShrink:0}}>VEG</span>
              <select value={plate.veg.source} onChange={e=>updPlateF(pi,"veg","source",e.target.value)} style={{...sel,flex:2}}>
                {VEG_SOURCES.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <input value={plate.veg.grams} onChange={e=>updPlateF(pi,"veg","grams",e.target.value)} style={{...inp,width:38,textAlign:"center"}} placeholder="g"/>
              <span style={{fontSize:9,color:"#888",width:24,textAlign:"right",flexShrink:0}}>—</span>
            </div>
            {plate.includeCarbs&&(
              <div style={{display:"flex",alignItems:"center",gap:5,paddingTop:4,borderTop:"1px solid #111"}}>
                <span style={{fontSize:8,color:"#888",width:26,flexShrink:0}}>CARB</span>
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
              <span style={{fontSize:8,color:"#888",marginLeft:"auto"}}>{pm.kcal} kcal</span>
            </div>
          </div>
        );
      })}

      <button onClick={addPlate} style={{width:"100%",marginBottom:7,padding:"6px",background:"none",border:"1px dashed #1a1a1a",borderRadius:7,color:"#888",fontSize:8,letterSpacing:2,cursor:"pointer",fontFamily:"inherit"}}>+ ADD PLATE</button>

      {/* Day total */}
      <div style={{...card(),marginBottom:7,display:"flex",alignItems:"center",gap:14}}>
        <MacroPie p={dayM.p} f={dayM.f} carb={dayM.carb} size={54}/>
        <div style={{flex:1}}>
          <p style={{...lbl,marginBottom:5}}>DAY TOTAL</p>
          <div style={{display:"flex",gap:10,marginBottom:4}}>
            <span style={{fontSize:11,color:"#22c55e"}}>{dayM.p}<span style={{fontSize:8,color:"#777"}}> P</span></span>
            <span style={{fontSize:11,color:"#f97316"}}>{dayM.f}<span style={{fontSize:8,color:"#777"}}> F</span></span>
            <span style={{fontSize:11,color:"#eab308"}}>{dayM.carb}<span style={{fontSize:8,color:"#777"}}> C</span></span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{flex:1,height:2,background:"#1e1e1e",borderRadius:1}}>
              <div style={{height:"100%",background:dayM.kcal>=KCAL_TARGET?"#22c55e":"#555",borderRadius:1,width:`${Math.min((dayM.kcal/KCAL_TARGET)*100,100)}%`,transition:"width .4s"}}/>
            </div>
            <span style={{fontSize:9,color:"#888"}}>{dayM.kcal}/{KCAL_TARGET}</span>
          </div>
        </div>
      </div>

      {/* Water */}
      <div style={{...card(),marginBottom:6}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={lbl}>WATER</span>
          <span style={{fontSize:11,color:todayN.water>=4?"#22c55e":"#3b82f6"}}>{todayN.water}L<span style={{color:"#777",fontSize:9}}> / 4</span></span>
        </div>
        <div style={{height:2,background:"#1e1e1e",borderRadius:1,marginBottom:6}}>
          <div style={{height:"100%",background:todayN.water>=4?"#22c55e":"#3b82f6",borderRadius:1,width:`${Math.min((todayN.water/4)*100,100)}%`,transition:"width .3s"}}/>
        </div>
        <div style={{display:"flex",gap:4}}>
          {[0.25,0.5,0.75,1].map(v=>(
            <button key={v} onClick={()=>updateNutr({water:Math.min(+(todayN.water+v).toFixed(2),10)})} style={{flex:1,padding:"4px 0",borderRadius:4,background:"#0a0a0a",color:"#3b82f6",fontSize:9,border:"1px solid #1a1a1a",cursor:"pointer",fontFamily:"inherit"}}>+{v}</button>
          ))}
          <button onClick={()=>updateNutr({water:0})} style={{padding:"4px 7px",borderRadius:4,background:"#0a0a0a",color:"#777",fontSize:9,border:"1px solid #1a1a1a",cursor:"pointer",fontFamily:"inherit"}}>↺</button>
        </div>
      </div>

      {/* Body stats */}
      <div style={{...card(),marginBottom:6}}>
        <p style={{...lbl,marginBottom:7}}>BODY STATS</p>
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1}}>
            <p style={{fontSize:8,color:"#777",marginBottom:4}}>WEIGHT</p>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <input value={todayN.weight||""} onChange={e=>updateNutr({weight:e.target.value})} placeholder="72.5" style={{...inp,flex:1,fontSize:13,color:"#888",textAlign:"center"}}/>
              <span style={{fontSize:9,color:"#777"}}>kg</span>
            </div>
          </div>
          <div style={{flex:1}}>
            <p style={{fontSize:8,color:"#777",marginBottom:4}}>BODY FAT</p>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <input value={todayN.bodyfat||""} onChange={e=>updateNutr({bodyfat:e.target.value})} placeholder="22" style={{...inp,flex:1,fontSize:13,color:"#888",textAlign:"center"}}/>
              <span style={{fontSize:9,color:"#777"}}>%</span>
            </div>
          </div>
        </div>
      </div>

      <textarea value={todayN.notes||""} onChange={e=>updateNutr({notes:e.target.value})} placeholder="Nutrition notes..." rows={2} style={{width:"100%",...inp,padding:"7px 9px",fontSize:10,resize:"none",lineHeight:1.6,color:"#888"}}/>
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
      {history.length===0&&<p style={{fontSize:11,color:"#888",marginTop:40,textAlign:"center",lineHeight:2}}>No sessions yet.<br/>Finish a session to build history.</p>}
      {history.map((sess,i)=>(
        <div key={sess.id} style={{...card(),marginBottom:6,padding:0,overflow:"hidden"}}>
          <div onClick={()=>setExpandedHist(expandedHist===i?null:i)} style={{padding:"10px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
                <span style={{fontSize:11,color:"#bbb"}}>{sess.title}</span>
                <span style={{fontSize:8,padding:"2px 5px",borderRadius:3,background:sess.tagColor+"1a",color:sess.tagColor}}>{sess.tag}</span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:9,color:"#777"}}>{fmtDate(sess.date)}</span>
                {sess.dayMacros&&<span style={{fontSize:8,color:"#888"}}>{sess.dayMacros.kcal}kcal · {sess.dayMacros.p}P</span>}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:9,color:"#777"}}>{sess.setsCompleted}/{sess.setsTotal}</span>
              <span style={{fontSize:9,color:"#888"}}>{expandedHist===i?"▲":"▼"}</span>
            </div>
          </div>
          {expandedHist===i&&(
            <div style={{padding:"0 12px 12px",borderTop:"1px solid #111"}}>
              {sess.exercises?.map((ex,ei)=>(
                <div key={ei} style={{marginTop:8}}>
                  <p style={{fontSize:10,color:"#777",marginBottom:4}}>{ex.name}</p>
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
                  {sess.cardio.filter(c=>c.type).map((c,ci)=><p key={ci} style={{fontSize:9,color:"#888"}}>{c.type}{c.duration?" · "+c.duration:""}{c.notes?" · "+c.notes:""}</p>)}
                </div>
              )}
              {sess.dayMacros&&(
                <div style={{marginTop:8,display:"flex",alignItems:"center",gap:10}}>
                  <MacroPie p={sess.dayMacros.p} f={sess.dayMacros.f} carb={sess.dayMacros.carb} size={36}/>
                  <div style={{display:"flex",gap:8}}>
                    <span style={{fontSize:9,color:"#22c55e"}}>{sess.dayMacros.p}P</span>
                    <span style={{fontSize:9,color:"#f97316"}}>{sess.dayMacros.f}F</span>
                    <span style={{fontSize:9,color:"#eab308"}}>{sess.dayMacros.carb}C</span>
                    <span style={{fontSize:9,color:"#888"}}>{sess.dayMacros.kcal}kcal</span>
                  </div>
                </div>
              )}
              {sess.nutrition?.weight&&<p style={{fontSize:9,color:"#888",marginTop:5}}>{sess.nutrition.weight}kg{sess.nutrition.bodyfat?" · "+sess.nutrition.bodyfat+"%BF":""}</p>}
              {sess.notes&&<p style={{fontSize:9,color:"#777",marginTop:6,fontStyle:"italic"}}>{sess.notes}</p>}
              <div style={{display:"flex",gap:7,marginTop:10}}>
                <button onClick={()=>copyText(buildExport(sess,sess.nutrition))} style={{fontSize:9,padding:"4px 12px",borderRadius:4,background:"#0a0a0a",color:"#777",border:"1px solid #1a1a1a",cursor:"pointer",fontFamily:"inherit"}}>COPY FOR CLAUDE</button>
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
            <span style={{fontSize:10,color:"#777"}}>{latest.w}{unit}</span>
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
                <span style={{fontSize:10,color:"#777"}}>{latest.w}kg</span>
                {prev&&<span style={{fontSize:9,color:delta>0?"#22c55e":"#ef4444"}}>{delta>0?"▲":"▼"}{Math.abs(delta)}kg</span>}
              </div>
            </div>
            <Sparkline pts={pts} color={tc}/>
          </div>);
        })}
        {wpts.length>=2&&<StatCard label="Bodyweight" pts={wpts} color="#22c55e" unit="kg"/>}
        {bfpts.length>=2&&<StatCard label="Body Fat %" pts={bfpts} color="#3b82f6" unit="%"/>}
        {KEY_LIFTS.every(l=>!getTrend(l).length)&&wpts.length<2&&<p style={{fontSize:11,color:"#888",marginTop:40,textAlign:"center",lineHeight:2}}>No data yet.<br/>Finish sessions to start tracking.</p>}
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
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:9,color:"#888",letterSpacing:1}}>{USER === "demo" ? "DEMO" : USER.toUpperCase()}</span>
                <button onClick={()=>setWizardOpen(true)} title="Edit profile" style={{background:"none",border:"none",color:"#252525",fontSize:11,cursor:"pointer",fontFamily:"inherit",padding:"0 2px",lineHeight:1}}>⚙</button>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:9,color:"#888"}}>{new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span>
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
                  <span style={{fontSize:8,color:"#777"}}>{l}</span><span style={{fontSize:9,color:tc}}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <p style={{...lbl,marginBottom:9}}>RULES</p>
              {["Reps before weight","Hit top of range first","Strength in deficit = winning","Compounds: 1-2 reps shy","Elbow pain → drop weight"].map((r,i)=>(
                <div key={i} style={{display:"flex",gap:7,...card(),marginBottom:5}}>
                  <span style={{fontSize:8,color:tc,minWidth:14}}>0{i+1}</span>
                  <span style={{fontSize:9,color:"#777",lineHeight:1.5}}>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* ── Wizard slide-in overlay ── */}
      <div style={{
        position:"fixed",inset:0,zIndex:100,
        background:"rgba(0,0,0,0.7)",
        backdropFilter:"blur(4px)",
        display:"flex",alignItems:"center",justifyContent:"center",
        padding:"20px 16px",
        opacity:wizardOpen?1:0,
        pointerEvents:wizardOpen?"all":"none",
        transition:"opacity .3s",
      }}>
        <div style={{
          width:"100%",maxWidth:520,
          background:"#0a0a0a",
          border:"1px solid #222",
          borderRadius:16,
          padding:"28px 24px 36px",
          transform:wizardOpen?"translateY(0) scale(1)":"translateY(40px) scale(.97)",
          transition:"transform .35s cubic-bezier(.4,0,.2,1)",
          maxHeight:"88vh",overflowY:"auto",
        }}>
          <Wizard
            profile={profile}
            onComplete={async(data)=>{
              await saveProfile(data);
              if(data.program){
                // map generated sessions into app template format
                const newTpls = data.program.map((s,i)=>({
                  ...s,
                  id: i+1,
                  label: s.label||`S${i+1}`,
                  exercises: s.exercises.map(ex=>({
                    ...ex,
                    sets: Array.isArray(ex.sets)?ex.sets:[{reps:ex.sets||"10",weight:"start light"}]
                  }))
                }));
                await saveTpl(newTpls);
                setActiveSession(0);
              }
              setWizardOpen(false);
              showToast(data.program?"Program applied ✓":"Profile saved ✓");
            }}
            onSkip={async()=>{ await saveProfile({skipped:true}); setWizardOpen(false); }}
          />
        </div>
      </div>
    </div>
  );
}
