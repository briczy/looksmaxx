import { useState, useRef, useEffect, useCallback } from "react";

// ── Safe storage wrapper ──────────────────────────────────────────
const storage = {
  async get(key) {
    try {
      if (typeof window !== "undefined" && window.storage?.get) {
        const r = await window.storage.get(key);
        return r?.value ? JSON.parse(r.value) : null;
      }
    } catch {}
    return null;
  },
  async set(key, value) {
    try {
      if (typeof window !== "undefined" && window.storage?.set) {
        await window.storage.set(key, JSON.stringify(value));
      }
    } catch {}
  }
};

// ── Data ──────────────────────────────────────────────────────────
const DEFAULT_SESSIONS = [
  { id:1, label:"S1", title:"Shoulders + Chest", tag:"Priority", tagColor:"#f97316", note:"Your #1 session. Come in fresh. Shoulders first, always.",
    exercises:[
      { name:"Barbell OHP", sets:[{reps:"6-8",weight:"30kg"},{reps:"6-8",weight:"30kg"},{reps:"6-8",weight:"30kg"}], tip:"Stop 1 rep shy of failure.", progression:"3×8 clean → 32.5kg" },
      { name:"Arnold Press", sets:[{reps:"10-12",weight:"8kg"},{reps:"10-12",weight:"8kg"},{reps:"10-12",weight:"8kg"}], tip:"Full rotation. Don't rush.", progression:"3×12 → 10kg" },
      { name:"Cable Lateral Raise", sets:[{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"}], tip:"No swing. Constant tension.", progression:"4×20 → next pin" },
      { name:"Incline DB Press", sets:[{reps:"6-8",weight:"16kg"},{reps:"6-8",weight:"16kg"},{reps:"6-8",weight:"16kg"},{reps:"6-8",weight:"16kg"}], tip:"Upper chest only.", progression:"4×8 → 18kg" },
      { name:"Cable Fly Low→High", sets:[{reps:"12-15",weight:"9kg"},{reps:"12-15",weight:"9kg"},{reps:"12-15",weight:"9kg"}], tip:"Squeeze at top.", progression:"3×15 → 11kg" },
      { name:"DB Lateral Raise", sets:[{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"}], tip:"Slight forward lean. Burn is the goal.", progression:"4×20 → 7kg" },
    ]},
  { id:2, label:"S2", title:"Back — Width", tag:"V-Taper", tagColor:"#3b82f6", note:"Lat-dominant. Pull elbows to hips, not hands to chest.",
    exercises:[
      { name:"Wide Grip Pulldown", sets:[{reps:"8-10",weight:"36kg"},{reps:"8-10",weight:"36kg"},{reps:"8-10",weight:"36kg"},{reps:"8-10",weight:"36kg"}], tip:"Full stretch at top. Own the negative.", progression:"9th rep last set → 38kg" },
      { name:"Chest Supported Row", sets:[{reps:"8-10",weight:"25kg"},{reps:"8-10",weight:"25kg"},{reps:"8-10",weight:"25kg"}], tip:"Chest stays on pad. Elbows drive down.", progression:"3×10 → 27.5kg" },
      { name:"Close Neutral Pulldown", sets:[{reps:"10-12",weight:"36kg"},{reps:"10-12",weight:"36kg"},{reps:"10-12",weight:"36kg"}], tip:"Full stretch matters.", progression:"3×10 → 38kg" },
      { name:"Straight Arm Pulldown", sets:[{reps:"15",weight:"20kg"},{reps:"15",weight:"20kg"},{reps:"15",weight:"20kg"}], tip:"Feel lats, not triceps.", progression:"3×15 → 22.5kg" },
      { name:"Rear Delt Fly (Machine)", sets:[{reps:"15",weight:"25kg"},{reps:"15",weight:"25kg"},{reps:"15",weight:"25kg"}], tip:"Pause at peak contraction.", progression:"3×15 → 27kg" },
      { name:"DB Lateral Raise", sets:[{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"}], tip:"Keep delt frequency high.", progression:"4×20 → 7kg" },
    ]},
  { id:3, label:"S3", title:"Arms + Rear Delts", tag:"Beach Builder", tagColor:"#a855f7", note:"Pump-focused. No ego. Clean reps and blood volume.",
    exercises:[
      { name:"DB Curl", sets:[{reps:"8-10",weight:"9kg"},{reps:"8-10",weight:"9kg"},{reps:"8-10",weight:"9kg"}], tip:"3 sec down. No swing.", progression:"10/10/10 → 10kg" },
      { name:"Incline DB Curl", sets:[{reps:"10-12",weight:"6kg"},{reps:"10-12",weight:"6kg"},{reps:"10-12",weight:"6kg"}], tip:"Builds peak. Strict.", progression:"3×12 → 7kg" },
      { name:"Hammer Curl", sets:[{reps:"12",weight:"6kg"},{reps:"12",weight:"6kg"}], tip:"Forearm and brachialis.", progression:"2×12 → 8kg" },
      { name:"Rope Pushdown", sets:[{reps:"10-12",weight:"32kg"},{reps:"10-12",weight:"32kg"},{reps:"10-12",weight:"32kg"}], tip:"Full lockout. 1 sec pause.", progression:"3×12 → 35kg" },
      { name:"Overhead Cable Extension", sets:[{reps:"12-15",weight:"10kg"},{reps:"12-15",weight:"10kg"},{reps:"12-15",weight:"10kg"}], tip:"Stretch is the point.", progression:"3×15 → next weight" },
      { name:"Rear Delt Cable Fly", sets:[{reps:"15-20",weight:"light"},{reps:"15-20",weight:"light"},{reps:"15-20",weight:"light"}], tip:"Chase contraction not weight.", progression:"2x per week" },
      { name:"DB Lateral Raise", sets:[{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"}], tip:"Non-negotiable. Every session.", progression:"4×20 → 7kg" },
    ]},
  { id:4, label:"S4", title:"Rest + Recovery", tag:"Grow", tagColor:"#22c55e", note:"Muscles grow here. This day is part of the program.",
    exercises:[
      { name:"Stomach Vacuums", sets:[{reps:"20-30 sec",weight:"×5 sets"}], tip:"Before breakfast. Tightens waist fast.", progression:"Build to 45 sec holds" },
    ]},
  { id:5, label:"S5", title:"Chest + Side Delts", tag:"Volume", tagColor:"#f97316", note:"Chest gets proper volume here. Delts tacked on for frequency.",
    exercises:[
      { name:"Incline DB Press", sets:[{reps:"8-10",weight:"16kg"},{reps:"8-10",weight:"16kg"},{reps:"8-10",weight:"16kg"},{reps:"8-10",weight:"16kg"}], tip:"Different angle to S1. Focus on stretch.", progression:"4×10 → 18kg" },
      { name:"Machine Chest Press", sets:[{reps:"10-12",weight:"50kg"},{reps:"10-12",weight:"50kg"},{reps:"10-12",weight:"50kg"}], tip:"Volume not ego. Control the rep.", progression:"3×12 → 54kg" },
      { name:"Incline Cable Fly", sets:[{reps:"12-15",weight:"9kg"},{reps:"12-15",weight:"9kg"},{reps:"12-15",weight:"9kg"}], tip:"Upper chest stretch.", progression:"3×15 → 11kg" },
      { name:"Push-ups", sets:[{reps:"RPE 9",weight:"BW"},{reps:"RPE 9",weight:"BW"}], tip:"Finisher. Leave 1 rep in tank.", progression:"Just pump" },
      { name:"Cable Lateral Raise", sets:[{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"},{reps:"15-20",weight:"7kg"}], tip:"Short rest 30-45 sec.", progression:"4×20 → next pin" },
      { name:"DB Lateral Raise", sets:[{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"},{reps:"15-20",weight:"6kg"}], tip:"Finish the delts properly.", progression:"3×20 → 7kg" },
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
const KEY_LIFTS = ["Barbell OHP","Incline DB Press","Wide Grip Pulldown","Squat","DB Curl","Rope Pushdown"];
const PROTEIN_SOURCES = [
  {name:"Chicken breast",p:31},{name:"White fish",p:20},{name:"Salmon",p:22},
  {name:"Lean beef",p:26},{name:"Eggs (whole)",p:13},{name:"Egg whites",p:11},
  {name:"Greek yogurt",p:10},{name:"Whey shake",p:80},{name:"Turkey breast",p:29},
  {name:"Tuna",p:28},{name:"Cottage cheese",p:11},{name:"Other",p:20},
];
const PC = ["#f97316","#3b82f6","#a855f7"];
const PL = ["Plate 1","Plate 2","Plate 3"];
const PR = ["Protein + veg. No carbs.","Protein + 150g rice/potato + veg.","Protein + small carbs or veg only."];
const EMPTY_NUTR = { plates:[{items:[]},{items:[]},{items:[]}], water:0, weight:"", notes:"" };

// ── Helpers ───────────────────────────────────────────────────────
function todayKey() { return new Date().toISOString().slice(0,10); }
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}) + " · " + d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
}
function calcProtein(sourceName, grams) {
  const src = PROTEIN_SOURCES.find(s => s.name === sourceName);
  return src ? Math.round((src.p / 100) * (parseFloat(grams) || 0)) : 0;
}

// ── Editable inline text ──────────────────────────────────────────
function Ed({ value, onChange, style, placeholder }) {
  const [ed, setEd] = useState(false);
  const [v, setV] = useState(value);
  const r = useRef();
  useEffect(() => { if (ed && r.current) r.current.focus(); }, [ed]);
  useEffect(() => { setV(value); }, [value]);
  const commit = () => { setEd(false); if (v !== value) onChange(v); };
  if (ed) return (
    <input ref={r} value={v} onChange={e => setV(e.target.value)} onBlur={commit}
      onKeyDown={e => e.key === "Enter" && commit()}
      style={{ ...style, background:"#727272", border:"1px solid #1a1a1a", borderRadius:4, padding:"1px 5px", color:"#e5e5e5", outline:"none", fontFamily:"inherit" }}
      placeholder={placeholder} />
  );
  return (
    <span onClick={() => setEd(true)} style={{ ...style, cursor:"text", borderBottom:"1px dashed #606060" }}>
      {v || <span style={{color:"#999999"}}>{placeholder}</span>}
    </span>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [templates, setTemplates] = useState(DEFAULT_SESSIONS);
  const [history, setHistory] = useState([]);
  const [liveData, setLiveData] = useState({});
  const [nutrition, setNutrition] = useState({});
  const [activeSession, setActiveSession] = useState(0);
  const [activeTab, setActiveTab] = useState("today");
  const [expandedHist, setExpandedHist] = useState(null);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load persisted data
  useEffect(() => {
    (async () => {
      try {
        const [t, h, l, n] = await Promise.all([
          storage.get("lm2-templates"),
          storage.get("lm2-history"),
          storage.get("lm2-live"),
          storage.get("lm2-nutrition"),
        ]);
        if (t) setTemplates(t);
        if (h) setHistory(h);
        if (l) setLiveData(l);
        if (n) setNutrition(n);
      } catch {}
      setReady(true);
    })();
  }, []);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  // Persist helpers
  const saveTpl = useCallback(async v => { setTemplates(v); await storage.set("lm2-templates", v); }, []);
  const saveHist = useCallback(async v => { setHistory(v); await storage.set("lm2-history", v); }, []);
  const saveLive = useCallback(async v => { setLiveData(v); await storage.set("lm2-live", v); }, []);
  const saveNutr = useCallback(async v => { setNutrition(v); await storage.set("lm2-nutrition", v); }, []);

  const tpl = templates[activeSession] || DEFAULT_SESSIONS[0];
  const tc = tpl.tagColor;
  const lk = `s${tpl.id}`;
  const live = liveData[lk] || { sets:{}, cardio:[], notes:"" };
  const dk = todayKey();
  const todayN = nutrition[dk] || EMPTY_NUTR;

  const updateLive = v => saveLive({ ...liveData, [lk]: { ...live, ...v } });
  const updateNutr = v => saveNutr({ ...nutrition, [dk]: { ...todayN, ...v } });

  // Exercise helpers
  const getSet = (ei, si) => {
    const k = `${ei}-${si}`, lv = live.sets?.[k], tp = tpl.exercises[ei]?.sets[si];
    return { reps: lv?.reps ?? tp?.reps ?? "10-12", weight: lv?.weight ?? tp?.weight ?? "—", done: lv?.done ?? false };
  };
  const toggleSet = (ei, si) => {
    const k = `${ei}-${si}`;
    updateLive({ sets: { ...live.sets, [k]: { ...live.sets?.[k], done: !getSet(ei,si).done } } });
  };
  const updSetField = (ei, si, f, v) => {
    const k = `${ei}-${si}`;
    updateLive({ sets: { ...live.sets, [k]: { ...live.sets?.[k], [f]: v } } });
  };
  const addSet = ei => {
    const last = getSet(ei, tpl.exercises[ei].sets.length - 1);
    saveTpl(templates.map((s,i) => i !== activeSession ? s : { ...s, exercises: s.exercises.map((ex,x) => x !== ei ? ex : { ...ex, sets: [...ex.sets, { reps:last.reps, weight:last.weight }] }) }));
  };
  const rmSet = (ei, si) => {
    if (tpl.exercises[ei].sets.length <= 1) return;
    saveTpl(templates.map((s,i) => i !== activeSession ? s : { ...s, exercises: s.exercises.map((ex,x) => x !== ei ? ex : { ...ex, sets: ex.sets.filter((_,j) => j !== si) }) }));
  };
  const updExField = (ei, f, v) => saveTpl(templates.map((s,i) => i !== activeSession ? s : { ...s, exercises: s.exercises.map((ex,x) => x !== ei ? ex : { ...ex, [f]: v }) }));
  const addEx = () => saveTpl(templates.map((s,i) => i !== activeSession ? s : { ...s, exercises: [...s.exercises, { name:"New Exercise", sets:[{reps:"10-12",weight:"—"},{reps:"10-12",weight:"—"},{reps:"10-12",weight:"—"}], tip:"Add notes", progression:"Add target" }] }));
  const rmEx = ei => saveTpl(templates.map((s,i) => i !== activeSession ? s : { ...s, exercises: s.exercises.filter((_,x) => x !== ei) }));

  // Cardio helpers
  const updCardio = (ci, f, v) => updateLive({ cardio: (live.cardio||[]).map((c,i) => i !== ci ? c : { ...c, [f]:v }) });
  const addCardio = () => updateLive({ cardio: [...(live.cardio||[]), { type:"", duration:"", notes:"" }] });
  const rmCardio = ci => updateLive({ cardio: (live.cardio||[]).filter((_,i) => i !== ci) });

  // Nutrition helpers
  const addPlateItem = pi => {
    const plates = todayN.plates.map((p,i) => i !== pi ? p : { ...p, items: [...p.items, { source:"Chicken breast", grams:200, protein:62 }] });
    updateNutr({ plates });
  };
  const updPlateItem = (pi, ii, f, v) => {
    const plates = todayN.plates.map((p, idx) => {
      if (idx !== pi) return p;
      const items = p.items.map((item, i) => {
        if (i !== ii) return item;
        const upd = { ...item, [f]: v };
        if (f === "source") upd.protein = calcProtein(v, item.grams);
        if (f === "grams") upd.protein = calcProtein(item.source, v);
        return upd;
      });
      return { ...p, items };
    });
    updateNutr({ plates });
  };
  const rmPlateItem = (pi, ii) => {
    const plates = todayN.plates.map((p,i) => i !== pi ? p : { ...p, items: p.items.filter((_,j) => j !== ii) });
    updateNutr({ plates });
  };

  const totalProtein = todayN.plates.reduce((a,p) => a + p.items.reduce((b,it) => b + (it.protein||0), 0), 0);
  const proteinPct = Math.min((totalProtein / 160) * 100, 100);
  const totalSets = tpl.exercises.reduce((a,ex) => a + ex.sets.length, 0);
  const doneSets = tpl.exercises.reduce((a,ex,ei) => a + ex.sets.filter((_,si) => getSet(ei,si).done).length, 0);

  const buildExport = sess => {
    const lines = [`LOOKSMAXX · ${sess.title}`, fmtDate(sess.date), "─".repeat(28)];
    sess.exercises?.forEach(ex => { lines.push(`\n${ex.name}`); ex.sets.forEach((s,i) => lines.push(`  Set ${i+1}: ${s.reps} @ ${s.weight}${s.done?" ✓":""}`)); });
    const cardio = sess.cardio?.filter(c => c.type);
    if (cardio?.length) { lines.push("\nCARDIO"); cardio.forEach(c => lines.push(`  ${c.type}${c.duration?" · "+c.duration:""}${c.notes?" · "+c.notes:""}`)); }
    if (sess.notes) lines.push(`\nNotes: ${sess.notes}`);
    if (sess.setsTotal) lines.push(`\n${sess.setsCompleted}/${sess.setsTotal} sets completed`);
    return lines.join("\n");
  };

  const currentExport = buildExport({ title:tpl.title, date:new Date().toISOString(), tag:tpl.tag, exercises:tpl.exercises.map((ex,ei) => ({ name:ex.name, sets:ex.sets.map((_,si) => getSet(ei,si)) })), cardio:live.cardio||[], notes:live.notes||"", setsCompleted:doneSets, setsTotal:totalSets });

  const finishSession = async () => {
    const sess = { id:Date.now(), date:new Date().toISOString(), sessionId:tpl.id, title:tpl.title, tagColor:tc, tag:tpl.tag, exercises:tpl.exercises.map((ex,ei) => ({ name:ex.name, sets:ex.sets.map((_,si) => getSet(ei,si)) })), cardio:live.cardio||[], notes:live.notes||"", setsCompleted:doneSets, setsTotal:totalSets };
    await saveHist([sess, ...history].slice(0, 100));
    await saveLive({ ...liveData, [lk]: { sets:{}, cardio:[], notes:"" } });
    showToast("Session saved ✓");
  };

  const copyText = async text => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); showToast("Copied ✓"); }
    catch { showToast("Copy failed"); }
  };

  const getTrend = lift => {
    const pts = [];
    [...history].reverse().forEach(sess => {
      const ex = sess.exercises?.find(e => e.name === lift);
      if (ex) {
        const ws = ex.sets.filter(s => s.done && !isNaN(parseFloat(s.weight)));
        if (ws.length) pts.push({ date: sess.date.slice(0,10), w: Math.max(...ws.map(s => parseFloat(s.weight))) });
      }
    });
    return pts;
  };

  if (!ready) return (
    <div style={{ background:"#080808", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#999999", letterSpacing:2 }}>LOADING...</span>
    </div>
  );

  // ── Shared styles ─────────────────────────────────────────────
  const card = (extra={}) => ({ background:"#080808", border:"1px solid #111", borderRadius:8, padding:"10px 11px", ...extra });
  const label9 = { fontSize:9, letterSpacing:1.5, color:"#666666" };

  return (
    <div style={{ fontFamily:"'DM Mono','Courier New',monospace", background:"#080808", minHeight:"100vh", color:"#e5e5e5" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;} ::-webkit-scrollbar-thumb{background:#888555;}
        .btn{transition:all .15s;cursor:pointer;border:none;font-family:inherit;}
        .btn:active{transform:scale(.97);}
        .sr:hover .rm{opacity:1!important;}
        input,select,textarea{font-family:inherit;background:#111;border:1px solid #888555;color:#e5e5e5;border-radius:5px;padding:5px 8px;font-size:10px;outline:none;}
        input:focus,select:focus,textarea:focus{border-color:#888555;}
        select option{background:#111;color:#e5e5e5;}
      `}</style>

      {toast && (
        <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"#22c55e", color:"#000", fontSize:10, padding:"7px 18px", borderRadius:20, zIndex:999, letterSpacing:1, whiteSpace:"nowrap" }}>
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ padding:"16px 16px 0", borderBottom:"1px solid #525252" }}>
        <div style={{ maxWidth:960, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:10 }}>
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:3, color:"#fff" }}>LOOKSMAXX</span>
              <span style={{ fontSize:9, color:"#999999", letterSpacing:2 }}>DAILY</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:9, color:"#222" }}>{new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span>
              {activeTab === "today" && <>
                <button className="btn" onClick={() => copyText(currentExport)}
                  style={{ fontSize:9, padding:"4px 11px", borderRadius:4, letterSpacing:1, background:copied?"#22c55e":"#525252", color:copied?"#000":"#777", border:`1px solid ${copied?"#22c55e":"#525252"}` }}>
                  {copied ? "COPIED ✓" : "COPY"}
                </button>
                <button className="btn" onClick={finishSession}
                  style={{ fontSize:9, padding:"4px 11px", borderRadius:4, letterSpacing:1, background:doneSets>0?tc:"#525252", color:doneSets>0?"#000":"#888555", border:`1px solid ${doneSets>0?tc:"#525252"}` }}>
                  FINISH
                </button>
              </>}
            </div>
          </div>
          <div style={{ display:"flex" }}>
            {[["today","TODAY"],["history","HISTORY"],["trends","TRENDS"],["info","INFO"]].map(([t,l]) => (
              <button key={t} className="btn" onClick={() => setActiveTab(t)}
                style={{ padding:"6px 12px", background:"none", fontSize:9, letterSpacing:2, color:activeTab===t?"#fff":"#505050", borderBottom:activeTab===t?`2px solid ${tc}`:"2px solid transparent" }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"0 16px 60px" }}>

        {/* ══ TODAY ══════════════════════════════════════════════ */}
        {activeTab === "today" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, paddingTop:14, alignItems:"start" }}>

            {/* LEFT — WORKOUT */}
            <div>
              <p style={{ ...label9, marginBottom:10 }}>WORKOUT</p>

              {/* Session pills */}
              <div style={{ display:"flex", gap:5, overflowX:"auto", marginBottom:11, scrollbarWidth:"none", paddingBottom:2 }}>
                {templates.map((s,i) => (
                  <button key={s.id} className="btn" onClick={() => setActiveSession(i)}
                    style={{ flexShrink:0, padding:"4px 11px", borderRadius:20, background:activeSession===i?s.tagColor:"#111", color:activeSession===i?"#000":"#555", fontSize:9, letterSpacing:1, border:`1px solid ${activeSession===i?s.tagColor:"#222"}` }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Session header */}
              <div style={{ marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:2, color:"#e0e0e0" }}>{tpl.title}</span>
                  <span style={{ fontSize:8, padding:"2px 6px", borderRadius:3, background:tc+"1a", color:tc, letterSpacing:1 }}>{tpl.tag}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ fontSize:9, color:"#555", minWidth:32 }}>SETS</span>
                  <div style={{ flex:1, height:2, background:"#222", borderRadius:1 }}>
                    <div style={{ height:"100%", background:tc, borderRadius:1, width:totalSets?`${(doneSets/totalSets)*100}%`:"0%", transition:"width .3s" }} />
                  </div>
                  <span style={{ fontSize:9, color:"#666" }}>{doneSets}/{totalSets}</span>
                </div>
              </div>

              {/* Exercise cards */}
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {tpl.exercises.map((ex, ei) => {
                  const allDone = ex.sets.every((_,si) => getSet(ei,si).done);
                  return (
                    <div key={ei} style={{ ...card(), border:`1px solid ${allDone?tc+"33":"#686868"}`, opacity:allDone?.5:1, transition:"all .2s" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                        <Ed value={ex.name} onChange={v => updExField(ei,"name",v)} style={{ fontSize:11, color:"#d4d4d4" }} placeholder="Exercise" />
                        <button className="btn" onClick={() => rmEx(ei)} style={{ fontSize:10, color:"#aaaaaa", background:"none", padding:"1px 4px" }}>✕</button>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:5 }}>
                        {ex.sets.map((_,si) => {
                          const s = getSet(ei,si);
                          return (
                            <div key={si} className="sr" style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div onClick={() => toggleSet(ei,si)} style={{ width:14, height:14, borderRadius:"50%", flexShrink:0, cursor:"pointer", border:`1.5px solid ${s.done?tc:"#606060"}`, background:s.done?tc:"none", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
                                {s.done && <span style={{ fontSize:6, color:"#000", fontWeight:"bold" }}>✓</span>}
                              </div>
                              <span style={{ fontSize:8, color:"#aaaaaa", minWidth:11 }}>{si+1}</span>
                              <Ed value={s.reps} onChange={v => updSetField(ei,si,"reps",v)} style={{ fontSize:9, color:"#aaaaaa", minWidth:30 }} placeholder="reps" />
                              <span style={{ fontSize:8, color:"#aaaaaa" }}>@</span>
                              <Ed value={s.weight} onChange={v => updSetField(ei,si,"weight",v)} style={{ fontSize:9, color:tc, flex:1 }} placeholder="weight" />
                              <button className="btn rm" onClick={() => rmSet(ei,si)} style={{ fontSize:9, color:"#999999", background:"none", padding:"1px 3px", opacity:0, transition:"opacity .15s" }}>−</button>
                            </div>
                          );
                        })}
                      </div>
                      <button className="btn" onClick={() => addSet(ei)} style={{ fontSize:8, color:"#aaaaaa", background:"none", letterSpacing:1, padding:"1px 0", marginBottom:5 }}>+ SET</button>
                      <div style={{ borderTop:"1px solid #727272", paddingTop:5, display:"flex", flexDirection:"column", gap:2 }}>
                        <Ed value={ex.tip} onChange={v => updExField(ei,"tip",v)} style={{ fontSize:8, color:"#999999", lineHeight:1.5 }} placeholder="Tip..." />
                        <div style={{ display:"flex", gap:3, alignItems:"baseline" }}>
                          <span style={{ fontSize:7, color:"#999999", letterSpacing:1 }}>NEXT→</span>
                          <Ed value={ex.progression} onChange={v => updExField(ei,"progression",v)} style={{ fontSize:8, color:"#aaaaaa" }} placeholder="Target" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button className="btn" onClick={addEx} style={{ width:"100%", marginTop:6, padding:"8px", background:"none", border:"1px dashed #525252", borderRadius:8, color:"#aaaaaa", fontSize:8, letterSpacing:2 }}>
                + ADD EXERCISE
              </button>

              {/* Cardio */}
              <div style={{ ...card(), marginTop:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ ...label9 }}>CARDIO</span>
                  <button className="btn" onClick={addCardio} style={{ fontSize:8, color:"#22c55e", background:"none", letterSpacing:1 }}>+ ADD</button>
                </div>
                {(!live.cardio || live.cardio.length === 0) && <p style={{ fontSize:9, color:"#909090" }}>None logged.</p>}
                {(live.cardio||[]).map((c,ci) => (
                  <div key={ci} style={{ marginBottom:ci<live.cardio.length-1?8:0, paddingBottom:ci<live.cardio.length-1?8:0, borderBottom:ci<live.cardio.length-1?"1px solid #727272":"none" }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:5 }}>
                          {CARDIO_TYPES.map(t => (
                            <button key={t} className="btn" onClick={() => updCardio(ci,"type",t)}
                              style={{ padding:"2px 8px", borderRadius:20, fontSize:8, background:c.type===t?"#22c55e":"#111", color:c.type===t?"#000":"#888555", border:`1px solid ${c.type===t?"#22c55e":"#525252"}` }}>
                              {t}
                            </button>
                          ))}
                        </div>
                        <div style={{ display:"flex", gap:5 }}>
                          <input value={c.duration} onChange={e => updCardio(ci,"duration",e.target.value)} placeholder="Duration" style={{ flex:1 }} />
                          <input value={c.notes} onChange={e => updCardio(ci,"notes",e.target.value)} placeholder="Notes" style={{ flex:1 }} />
                        </div>
                      </div>
                      <button className="btn" onClick={() => rmCardio(ci)} style={{ fontSize:10, color:"#aaaaaa", background:"none", padding:"1px 5px", marginLeft:5 }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>

              <textarea value={live.notes||""} onChange={e => updateLive({ notes:e.target.value })}
                placeholder="Session notes — energy? pain? PRs?" rows={2}
                style={{ width:"100%", marginTop:6, color:"#999999", lineHeight:1.6, fontSize:10, resize:"none" }} />
            </div>

            {/* RIGHT — NUTRITION */}
            <div>
              {/* Spacer: WORKOUT label height + pills row height */}
              <div style={{ height: 55 }} />
              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:2, color:"#e0e0e0", display:"block", marginBottom:4 }}>NUTRITION</span>

              {/* Protein progress bar — mirrors sets bar */}
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:11 }}>
                <span style={{ fontSize:9, color:"#555", minWidth:32 }}>PROT</span>
                <div style={{ flex:1, height:2, background:"#222", borderRadius:1 }}>
                  <div style={{ height:"100%", background:totalProtein>=160?"#22c55e":tc, borderRadius:1, width:`${proteinPct}%`, transition:"width .3s" }} />
                </div>
                <span style={{ fontSize:9, color:"#666" }}>{totalProtein}/160g</span>
              </div>

              {/* Plates */}
              {todayN.plates.map((plate, pi) => (
                <div key={pi} style={{ ...card({ border:`1px solid ${PC[pi]}55` }), marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                    <div>
                      <span style={{ fontSize:10, color:PC[pi], letterSpacing:1 }}>{PL[pi]}</span>
                      <p style={{ fontSize:8, color:"#555", marginTop:2, lineHeight:1.4 }}>{PR[pi]}</p>
                    </div>
                    <button className="btn" onClick={() => addPlateItem(pi)} style={{ fontSize:8, color:PC[pi], background:"none", letterSpacing:1, marginLeft:8, flexShrink:0 }}>+ ADD</button>
                  </div>

                  {plate.items.length === 0 && <p style={{ fontSize:9, color:"#909090" }}>Empty.</p>}

                  {plate.items.map((item, ii) => (
                    <div key={ii} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:5, paddingBottom:5, borderBottom:ii<plate.items.length-1?"1px solid #727272":"none" }}>
                      <select value={item.source} onChange={e => updPlateItem(pi,ii,"source",e.target.value)} style={{ flex:2, fontSize:9 }}>
                        {PROTEIN_SOURCES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                      <input value={item.grams} onChange={e => updPlateItem(pi,ii,"grams",e.target.value)} placeholder="g" style={{ width:42, textAlign:"center", fontSize:9 }} />
                      <span style={{ fontSize:8, color:PC[pi], minWidth:26, textAlign:"right" }}>{item.protein}g</span>
                      <button className="btn" onClick={() => rmPlateItem(pi,ii)} style={{ fontSize:10, color:"#aaaaaa", background:"none", padding:"1px 3px" }}>✕</button>
                    </div>
                  ))}

                  {plate.items.length > 0 && (
                    <div style={{ display:"flex", justifyContent:"flex-end", marginTop:2 }}>
                      <span style={{ fontSize:9, color:PC[pi] }}>{plate.items.reduce((a,i) => a+(i.protein||0), 0)}g</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Water */}
              <div style={{ ...card(), marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ ...label9 }}>WATER</span>
                  <span style={{ fontSize:11, color:todayN.water>=4?"#22c55e":"#3b82f6" }}>
                    {todayN.water}L <span style={{ color:"#999999", fontSize:9 }}>/ 4L</span>
                  </span>
                </div>
                <div style={{ height:3, background:"#080808", borderRadius:2, marginBottom:8 }}>
                  <div style={{ height:"100%", background:todayN.water>=4?"#22c55e":"#3b82f6", borderRadius:2, width:`${Math.min((todayN.water/4)*100,100)}%`, transition:"width .3s" }} />
                </div>
                <div style={{ display:"flex", gap:5 }}>
                  {[0.25,0.5,0.75,1].map(v => (
                    <button key={v} className="btn" onClick={() => updateNutr({ water: Math.min(+(todayN.water+v).toFixed(2), 10) })}
                      style={{ flex:1, padding:"5px 0", borderRadius:5, background:"#111", color:"#3b82f6", fontSize:9, border:"1px solid #1a1a1a" }}>
                      +{v}L
                    </button>
                  ))}
                  <button className="btn" onClick={() => updateNutr({ water:0 })} style={{ padding:"5px 8px", borderRadius:5, background:"#111", color:"#999999", fontSize:9, border:"1px solid #1a1a1a" }}>↺</button>
                </div>
              </div>

              {/* Bodyweight */}
              <div style={{ ...card(), marginBottom:8 }}>
                <p style={{ ...label9, marginBottom:6 }}>BODYWEIGHT</p>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <input value={todayN.weight||""} onChange={e => updateNutr({ weight:e.target.value })} placeholder="e.g. 72.5" style={{ flex:1, fontSize:14, color:"#aaaaaa", textAlign:"center" }} />
                  <span style={{ fontSize:10, color:"#999999" }}>kg</span>
                </div>
              </div>

              <textarea value={todayN.notes||""} onChange={e => updateNutr({ notes:e.target.value })}
                placeholder="Nutrition notes — cravings? bloating? energy?" rows={2}
                style={{ width:"100%", color:"#999999", lineHeight:1.6, fontSize:10, resize:"none" }} />
            </div>
          </div>
        )}

        {/* ══ HISTORY ════════════════════════════════════════════ */}
        {activeTab === "history" && (
          <div style={{ paddingTop:16 }}>
            <p style={{ ...label9, marginBottom:14 }}>PAST SESSIONS — {history.length} logged</p>
            {history.length === 0 && <p style={{ fontSize:11, color:"#aaaaaa", marginTop:40, textAlign:"center", lineHeight:2 }}>No sessions logged yet.<br/>Finish a session to build history.</p>}
            {history.map((sess,i) => (
              <div key={sess.id} style={{ ...card(), marginBottom:8, padding:0, overflow:"hidden" }}>
                <div onClick={() => setExpandedHist(expandedHist===i?null:i)} style={{ padding:"12px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:12, color:"#c4c4c4" }}>{sess.title}</span>
                      <span style={{ fontSize:8, padding:"2px 6px", borderRadius:3, background:sess.tagColor+"1a", color:sess.tagColor }}>{sess.tag}</span>
                    </div>
                    <span style={{ fontSize:9, color:"#999999" }}>{fmtDate(sess.date)}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:9, color:"#222" }}>{sess.setsCompleted}/{sess.setsTotal}</span>
                    <span style={{ fontSize:10, color:"#222" }}>{expandedHist===i?"▲":"▼"}</span>
                  </div>
                </div>
                {expandedHist === i && (
                  <div style={{ padding:"0 14px 14px", borderTop:"1px solid #727272" }}>
                    {sess.exercises?.map((ex,ei) => (
                      <div key={ei} style={{ marginTop:10 }}>
                        <p style={{ fontSize:10, color:"#aaa", marginBottom:5 }}>{ex.name}</p>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                          {ex.sets.map((s,si) => (
                            <span key={si} style={{ fontSize:9, padding:"2px 8px", borderRadius:4, background:s.done?sess.tagColor+"1a":"#111", color:s.done?sess.tagColor:"#4a4a4a", border:`1px solid ${s.done?sess.tagColor+"33":"#424242"}` }}>
                              {s.reps} @ {s.weight}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {sess.cardio?.filter(c=>c.type).length > 0 && (
                      <div style={{ marginTop:10 }}>
                        <p style={{ fontSize:9, color:"#22c55e", marginBottom:4, letterSpacing:1 }}>CARDIO</p>
                        {sess.cardio.filter(c=>c.type).map((c,ci) => (
                          <p key={ci} style={{ fontSize:10, color:"#999999" }}>{c.type}{c.duration?" · "+c.duration:""}{c.notes?" · "+c.notes:""}</p>
                        ))}
                      </div>
                    )}
                    {sess.notes && <p style={{ fontSize:10, color:"#999999", marginTop:10, fontStyle:"italic" }}>{sess.notes}</p>}
                    <button className="btn" onClick={() => copyText(buildExport(sess))}
                      style={{ marginTop:12, fontSize:9, padding:"5px 14px", borderRadius:4, letterSpacing:1, background:"#111", color:"#aaaaaa", border:"1px dashed #1a1a1a" }}>
                      COPY FOR CLAUDE
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ══ TRENDS ═════════════════════════════════════════════ */}
        {activeTab === "trends" && (
          <div style={{ paddingTop:16 }}>
            <p style={{ ...label9, marginBottom:16 }}>KEY LIFT TRENDS</p>
            {KEY_LIFTS.map(lift => {
              const pts = getTrend(lift); if (!pts.length) return null;
              const max=Math.max(...pts.map(p=>p.w)), min=Math.min(...pts.map(p=>p.w)), range=max-min||1;
              const latest=pts[pts.length-1], prev=pts[pts.length-2], delta=prev?latest.w-prev.w:0;
              const W=300, H=44;
              return (
                <div key={lift} style={{ ...card(), marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:11, color:"#aaaaaa" }}>{lift}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:10, color:"#aaa" }}>{latest.w}kg</span>
                      {delta!==0 && <span style={{ fontSize:9, color:delta>0?"#22c55e":"#ef4444" }}>{delta>0?"▲":"▼"}{Math.abs(delta)}kg</span>}
                    </div>
                  </div>
                  {pts.length > 1 ? (
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:H, overflow:"visible" }}>
                      <polyline points={pts.map((p,i) => `${(i/(pts.length-1))*W},${H-4-((p.w-min)/range)*(H-10)}`).join(" ")} fill="none" stroke={tc} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      {pts.map((p,i) => <circle key={i} cx={(i/(pts.length-1))*W} cy={H-4-((p.w-min)/range)*(H-10)} r={i===pts.length-1?"3":"2"} fill={i===pts.length-1?tc:"#888555"} stroke={tc} strokeWidth="1" />)}
                    </svg>
                  ) : <p style={{ fontSize:9, color:"#aaaaaa" }}>Log more sessions to see trend.</p>}
                </div>
              );
            })}

            {/* Bodyweight trend */}
            {(() => {
              const wpts = Object.entries(nutrition).filter(([,v]) => v.weight && !isNaN(parseFloat(v.weight))).sort(([a],[b]) => a.localeCompare(b)).map(([,v]) => ({ w: parseFloat(v.weight) }));
              if (wpts.length < 2) return null;
              const max=Math.max(...wpts.map(p=>p.w)), min=Math.min(...wpts.map(p=>p.w)), range=max-min||1;
              const latest=wpts[wpts.length-1], prev=wpts[wpts.length-2], delta=prev?+(latest.w-prev.w).toFixed(1):0;
              const W=300, H=44;
              return (
                <div style={{ ...card(), marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:11, color:"#aaaaaa" }}>Bodyweight</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:10, color:"#aaa" }}>{latest.w}kg</span>
                      {delta!==0 && <span style={{ fontSize:9, color:delta<0?"#22c55e":"#ef4444" }}>{delta<0?"▼":"▲"}{Math.abs(delta)}kg</span>}
                    </div>
                  </div>
                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:H, overflow:"visible" }}>
                    <polyline points={wpts.map((p,i) => `${(i/(wpts.length-1))*W},${H-4-((p.w-min)/range)*(H-10)}`).join(" ")} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    {wpts.map((p,i) => <circle key={i} cx={(i/(wpts.length-1))*W} cy={H-4-((p.w-min)/range)*(H-10)} r={i===wpts.length-1?"3":"2"} fill={i===wpts.length-1?"#22c55e":"#888555"} stroke="#22c55e" strokeWidth="1" />)}
                  </svg>
                </div>
              );
            })()}

            {KEY_LIFTS.every(l => !getTrend(l).length) && (
              <p style={{ fontSize:11, color:"#aaaaaa", marginTop:40, textAlign:"center", lineHeight:2 }}>No data yet.<br/>Finish sessions to start tracking.</p>
            )}
          </div>
        )}

        {/* ══ INFO ═══════════════════════════════════════════════ */}
        {activeTab === "info" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, paddingTop:16, alignItems:"start" }}>
            <div>
              <p style={{ ...label9, marginBottom:10 }}>NUTRITION TARGETS</p>
              {[["Calories","~1900–2000 kcal","300-400 below maintenance"],["Protein","160g daily","3×200g protein + 1 shake"],["Carbs","Moderate","Time around training."],["Water","3–4L daily","Tighter skin. Better pump."],["Sodium","Consistent","Erratic salt = erratic retention"]].map(([l,v,d],i) => (
                <div key={i} style={{ ...card(), marginBottom:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:8, color:"#222", letterSpacing:1 }}>{l}</span>
                    <span style={{ fontSize:9, color:tc }}>{v}</span>
                  </div>
                  <p style={{ fontSize:9, color:"#999999", lineHeight:1.5 }}>{d}</p>
                </div>
              ))}
            </div>
            <div>
              <p style={{ ...label9, marginBottom:10 }}>PROGRESSION RULES</p>
              {["Add reps before adding weight","Hit top of rep range across all sets first","Maintaining strength in a deficit = winning","Stop compounds 1–2 reps shy of failure","Elbow pain = drop weight immediately"].map((r,i) => (
                <div key={i} style={{ display:"flex", gap:8, ...card(), marginBottom:6 }}>
                  <span style={{ fontSize:8, color:tc, minWidth:16 }}>0{i+1}</span>
                  <span style={{ fontSize:9, color:"#999999", lineHeight:1.6 }}>{r}</span>
                </div>
              ))}
              <p style={{ ...label9, margin:"14px 0 10px" }}>3-PLATE SYSTEM</p>
              {PL.map((p,i) => (
                <div key={i} style={{ display:"flex", gap:8, ...card({ border:`1px solid ${PC[i]}1a` }), marginBottom:6 }}>
                  <span style={{ fontSize:9, color:PC[i], minWidth:46 }}>{p}</span>
                  <span style={{ fontSize:9, color:"#999999", lineHeight:1.5 }}>{PR[i]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
