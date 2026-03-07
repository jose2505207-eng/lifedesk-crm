import { useState, useMemo, useEffect, useRef } from "react";
import {
  fetchLeads, createLead, updateLead, bulkCreateLeads,
  fetchFollowUps, createFollowUp, updateFollowUp, deleteFollowUp,
  logCall, supabase,
} from "./lib/supabase.js";

// ─── Normalize DB rows → UI shape ────────────────────────────────────────────
const normLead = r => ({ ...r, lastContact: r.last_contact });
const normFU   = r => ({ ...r, leadId: r.lead_id, date: r.due_date });

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  en: {
    appName: "LifeDesk",
    appSub: "Insurance CRM",
    nav: { dashboard:"Dashboard", leads:"Leads", pipeline:"Pipeline", followups:"Follow-ups", massText:"Mass Text", dialer:"Auto Dialer" },
    dash: {
      title:"Overview", totalLeads:"Total Leads", inPipeline:"In Pipeline",
      closed:"Closed", pending:"Pending Tasks", monthly:"Monthly Premium",
      pipelineByStatus:"Pipeline by Status", upcomingFollowups:"Upcoming Follow-ups",
      noFollowups:"No pending follow-ups.", done:"Done",
    },
    leads: {
      title:"Leads", newLead:"New Lead", importCsv:"Import CSV",
      search:"Search name, phone, city…", allStatuses:"All statuses",
      name:"Name", phone:"Phone", city:"City", product:"Product",
      status:"Status", lastContact:"Last Contact", noLeads:"No leads found.",
      addTitle:"New Lead", nameLbl:"Full Name *", phoneLbl:"Phone *",
      emailLbl:"Email", cityLbl:"City", ageLbl:"Age", statusLbl:"Status",
      productLbl:"Product", notesLbl:"Notes", cancel:"Cancel", save:"Save",
      detail: { back:"← Back", product:"Product", premium:"Mo. Premium",
        lastContact:"Last Contact", notes:"Notes", noNotes:"No notes yet.",
        updateNotes:"Update notes…", saveNote:"Save Note", saveInfo:"Save",
        changeStatus:"Change Status", followups:"Follow-ups", add:"+ Add", noFU:"No follow-ups.",
      },
      timeFilter:"Last contact", allTime:"All time", yesterday:"Yesterday",
      last3days:"3+ days ago", lastWeek:"1 week ago", lastMonth:"1 month ago",
    },
    pipeline: {
      title:"Pipeline", leadsIn:"leads in", moveToNext:"Move to next stage",
    },
    followups: {
      title:"Follow-ups", newBtn:"+ New", pending:"Pending", completed:"Completed",
      noPending:"All clear.", noCompleted:"None completed yet.",
      addTitle:"New Follow-up", leadLbl:"Lead", selectLead:"Select lead…",
      dateLbl:"Date", taskLbl:"Task / Note", cancel:"Cancel", save:"Save",
      edit:"Edit", delete:"Delete", editTitle:"Edit Follow-up", saveEdit:"Save changes",
      confirmDelete:"Delete this follow-up?",
    },
    massText: {
      title:"Mass Text", disclaimer:"Requires prior written consent (TCPA / California law).",
      filterLbl:"Filter recipients", allLeads:"All leads",
      msgLbl:"Message", msgHint:"Use {name} to personalize.",
      preview:"Preview", recipients:"Recipients",
      send:"Send to", contacts:"contact(s)",
      sent:"✓ Sent to", compliance:"TCPA Compliance:",
      complianceItems:["Prior written consent required","No texts 9pm–8am","Always include Reply STOP","Identify your name & agency"],
    },
    dialer: {
      title:"Auto Dialer", subtitle:"Call leads automatically using a local number matching their area code.",
      note:"Requires Twilio integration for live calls.",
      start:"▶ Start Dialer", stop:"⏹ Stop", config:"Configuration",
      concurrentCalls:"Concurrent Calls", filterLeads:"Filter Leads",
      allExcludeClosed:"All (excl. closed)", queued:"Queued",
      activeCalls:"Active", contactedToday:"Contacted today",
      localPresence:"Local Presence", localDesc:"Detects the lead's area code and assigns a matching Twilio number. Increases pick-up rate up to 4×.",
      activeSessions:"Active Calls", idle:"Configure and press Start Dialer",
      readyLeads:"leads ready to dial", preparing:"Preparing next call…",
      callLog:"Call History", noCalls:"No calls yet.",
      contacted:"Contacted", noAnswer:"No answer", dropped:"Dropped",
      ringing:"Ringing…", connected:"Connected", ended:"Ended",
      hangup:"Hang up", dialerActive:"DIALER ACTIVE",
      modeLabels:{ 1:"Power", 3:"Aggressive", 5:"Predictive" },
      modeDescs:{
        1:"One call at a time. Most controlled.",
        3:"3 lines. First to answer wins; others dropped.",
        5:"5 lines. Maximum speed and contact rate.",
      },
      twilio1:"Twilio Account", twilio1d:"Numbers per CA area code",
      twilio2:"Backend (Node/Python)", twilio2d:"Handles webhooks & conference",
      twilio3:"Twilio Conferences", twilio3d:"Drops other lines on answer",
    },
    csv: {
      title:"Import CSV", rows:"rows detected", colMapping:"Column Mapping (auto-detected)",
      noMap:"— Skip —", preview:"Preview", more:"more rows",
      warn:"Map at least Name and Phone to import.",
      cancel:"Cancel", import:"Import",
    },
    status: { "New Lead":"New Lead","Contacted":"Contacted","Quoted":"Quoted","Follow-Up":"Follow-Up","Closed Won":"Closed Won","Closed Lost":"Closed Lost" },
    products: ["Term Life","Whole Life","Universal Life","Final Expense","IUL","Group Life"],
  },
  es: {
    appName: "LifeDesk",
    appSub: "CRM Seguros",
    nav: { dashboard:"Inicio", leads:"Leads", pipeline:"Pipeline", followups:"Seguimientos", massText:"Texto Masivo", dialer:"Marcador Auto" },
    dash: {
      title:"Resumen", totalLeads:"Total Leads", inPipeline:"En Pipeline",
      closed:"Cerrados", pending:"Tareas Pendientes", monthly:"Prima Mensual",
      pipelineByStatus:"Pipeline por Status", upcomingFollowups:"Próximos Seguimientos",
      noFollowups:"Sin seguimientos pendientes.", done:"Listo",
    },
    leads: {
      title:"Leads", newLead:"Nuevo Lead", importCsv:"Importar CSV",
      search:"Buscar nombre, teléfono, ciudad…", allStatuses:"Todos los status",
      name:"Nombre", phone:"Teléfono", city:"Ciudad", product:"Producto",
      status:"Status", lastContact:"Último Contacto", noLeads:"Sin leads.",
      addTitle:"Nuevo Lead", nameLbl:"Nombre completo *", phoneLbl:"Teléfono *",
      emailLbl:"Email", cityLbl:"Ciudad", ageLbl:"Edad", statusLbl:"Status",
      productLbl:"Producto", notesLbl:"Notas", cancel:"Cancelar", save:"Guardar",
      detail: { back:"← Volver", product:"Producto", premium:"Prima/mes",
        lastContact:"Último contacto", notes:"Notas", noNotes:"Sin notas.",
        updateNotes:"Actualizar notas…", saveNote:"Guardar Nota", saveInfo:"Guardar",
        changeStatus:"Cambiar Status", followups:"Seguimientos", add:"+ Agregar", noFU:"Sin seguimientos.",
      },
      timeFilter:"Último contacto", allTime:"Todo", yesterday:"Ayer",
      last3days:"Más de 3 días", lastWeek:"1 semana", lastMonth:"1 mes",
    },
    pipeline: {
      title:"Pipeline", leadsIn:"leads en", moveToNext:"Mover a siguiente etapa",
    },
    followups: {
      title:"Seguimientos", newBtn:"+ Nuevo", pending:"Pendientes", completed:"Completados",
      noPending:"Todo al día.", noCompleted:"Ninguno completado.",
      addTitle:"Nuevo Seguimiento", leadLbl:"Lead", selectLead:"Seleccionar lead…",
      dateLbl:"Fecha", taskLbl:"Tarea / Nota", cancel:"Cancelar", save:"Guardar",
      edit:"Editar", delete:"Eliminar", editTitle:"Editar Seguimiento", saveEdit:"Guardar cambios",
      confirmDelete:"¿Eliminar este seguimiento?",
    },
    massText: {
      title:"Texto Masivo", disclaimer:"Requiere consentimiento escrito previo (TCPA / California).",
      filterLbl:"Filtrar destinatarios", allLeads:"Todos los leads",
      msgLbl:"Mensaje", msgHint:"Usa {nombre} para personalizar.",
      preview:"Vista previa", recipients:"Destinatarios",
      send:"Enviar a", contacts:"contacto(s)",
      sent:"✓ Enviado a", compliance:"Compliance TCPA + CA:",
      complianceItems:["Consentimiento escrito previo","No enviar 9pm–8am","Incluir 'Reply STOP'","Identificar tu nombre y agencia"],
    },
    dialer: {
      title:"Marcador Automático", subtitle:"Llama automáticamente usando un número local del mismo área del lead.",
      note:"Requiere integración Twilio para llamadas reales.",
      start:"▶ Iniciar", stop:"⏹ Detener", config:"Configuración",
      concurrentCalls:"Llamadas Simultáneas", filterLeads:"Filtrar Leads",
      allExcludeClosed:"Todos (excl. cerrados)", queued:"En cola",
      activeCalls:"Activas", contactedToday:"Contactados hoy",
      localPresence:"Presencia Local", localDesc:"Detecta el área code del lead y asigna un número Twilio de la misma zona. Aumenta el pick-up rate hasta 4×.",
      activeSessions:"Llamadas Activas", idle:"Configura y presiona Iniciar",
      readyLeads:"leads listos para marcar", preparing:"Preparando siguiente llamada…",
      callLog:"Historial de Llamadas", noCalls:"Sin llamadas.",
      contacted:"Contactado", noAnswer:"Sin respuesta", dropped:"Cortado",
      ringing:"Marcando…", connected:"Conectado", ended:"Terminado",
      hangup:"Colgar", dialerActive:"DIALER ACTIVO",
      modeLabels:{ 1:"Power", 3:"Agresivo", 5:"Predictivo" },
      modeDescs:{
        1:"Una llamada a la vez. Más controlado.",
        3:"3 líneas. Al contestar una, se cuelgan las otras.",
        5:"5 líneas. Máxima velocidad y tasa de contacto.",
      },
      twilio1:"Cuenta Twilio", twilio1d:"Números por área code de CA",
      twilio2:"Backend (Node/Python)", twilio2d:"Maneja webhooks y conferencias",
      twilio3:"Twilio Conferences", twilio3d:"Cuelga líneas restantes al contestar",
    },
    csv: {
      title:"Importar CSV", rows:"filas detectadas", colMapping:"Mapeo de Columnas (auto-detectado)",
      noMap:"— No mapear —", preview:"Vista previa", more:"filas más",
      warn:"Mapea al menos Nombre y Teléfono para importar.",
      cancel:"Cancelar", import:"Importar",
    },
    status: { "New Lead":"Nuevo Lead","Contacted":"Contactado","Quoted":"Cotizado","Follow-Up":"Seguimiento","Closed Won":"Cerrado ✓","Closed Lost":"Perdido" },
    products: ["Vida Término","Vida Entera","Vida Universal","Gasto Final","IUL","Vida Grupal"],
  },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES = ["New Lead","Contacted","Quoted","Follow-Up","Closed Won","Closed Lost"];

const STATUS_DOT = {
  "New Lead":    "#60a5fa",
  "Contacted":   "#34d399",
  "Quoted":      "#fbbf24",
  "Follow-Up":   "#c084fc",
  "Closed Won":  "#4ade80",
  "Closed Lost": "#f87171",
};

const CA_AREA = {
  "209":"Stockton","213":"Los Angeles","310":"LA West","323":"Hollywood",
  "408":"San Jose","415":"San Francisco","424":"South Bay","442":"Oceanside",
  "510":"Oakland","530":"Sacramento N","559":"Fresno","562":"Long Beach",
  "619":"San Diego","626":"Pasadena","628":"SF Peninsula","650":"Palo Alto",
  "661":"Bakersfield","669":"San Jose S","707":"Santa Rosa","714":"Anaheim",
  "747":"LA Valley","760":"Palm Springs","805":"Santa Barbara","818":"Burbank",
  "831":"Monterey","858":"San Diego N","909":"San Bernardino","916":"Sacramento",
  "925":"Contra Costa","949":"Irvine","951":"Riverside",
};

function getAreaCode(p) {
  const d = p.replace(/\D/g,"");
  if (d.length===11&&d[0]==="1") return d.slice(1,4);
  return d.length>=10?d.slice(0,3):null;
}
function localNumber(phone) {
  const ac = getAreaCode(phone);
  if (!ac||!CA_AREA[ac]) return { num:"+1 (800) 555-0100", city:"National" };
  return { num:`+1 (${ac}) 555-${String(Math.floor(1000+Math.random()*9000))}`, city:CA_AREA[ac] };
}

// ─── Sample data ──────────────────────────────────────────────────────────────
const INIT_LEADS = [
  { id:1, name:"Maria Garcia",  phone:"408-555-0101", email:"maria@email.com",   status:"New Lead",   product:"Term Life",    notes:"Referred by Carlos. Family of 4.", age:34, premium:0,   lastContact:"2026-02-28", city:"San Jose" },
  { id:2, name:"Robert Chen",   phone:"415-555-0192", email:"rchen@email.com",   status:"Quoted",     product:"Whole Life",   notes:"$500k policy. Non-smoker.",        age:42, premium:480, lastContact:"2026-03-01", city:"San Francisco" },
  { id:3, name:"Ana Lopez",     phone:"650-555-0143", email:"alopez@email.com",  status:"Follow-Up",  product:"Final Expense",notes:"Widow, 67. $15k policy.",          age:67, premium:89,  lastContact:"2026-03-02", city:"Redwood City" },
  { id:4, name:"James Miller",  phone:"510-555-0177", email:"jmiller@email.com", status:"Contacted",  product:"IUL",          notes:"Business owner. Tax-adv. growth.", age:48, premium:0,   lastContact:"2026-03-03", city:"Oakland" },
  { id:5, name:"Sofia Reyes",   phone:"707-555-0166", email:"sreyes@email.com",  status:"Closed Won", product:"Term Life",    notes:"20yr $250k. Signed 3/1.",          age:29, premium:220, lastContact:"2026-03-01", city:"Napa" },
  { id:6, name:"David Park",    phone:"916-555-0122", email:"dpark@email.com",   status:"New Lead",   product:"IUL",          notes:"Referred by Sofia.",               age:38, premium:0,   lastContact:"2026-03-03", city:"Sacramento" },
  { id:7, name:"Linda Ortega",  phone:"858-555-0133", email:"lortega@email.com", status:"New Lead",   product:"Final Expense",notes:"Facebook ad.",                     age:71, premium:0,   lastContact:"2026-03-02", city:"San Diego" },
  { id:8, name:"Kevin Tran",    phone:"714-555-0144", email:"ktran@email.com",   status:"New Lead",   product:"Term Life",    notes:"Young family, 2 kids.",            age:32, premium:0,   lastContact:"2026-03-01", city:"Anaheim" },
];

const INIT_FU = [
  { id:1, leadId:2, date:"2026-03-05", note:"Send final quote documents", done:false },
  { id:2, leadId:3, date:"2026-03-04", note:"Call to confirm interest",   done:false },
  { id:3, leadId:4, date:"2026-03-06", note:"Schedule IUL presentation",  done:false },
];

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:      "#0d0d0d",
    surface: "#161616",
    s2:      "#1f1f1f",
    s3:      "#272727",
    border:  "#2e2e2e",
    border2: "#3a3a3a",
    text:    "#f0f0f0",
    text2:   "#a0a0a0",
    text3:   "#5a5a5a",
    accent:  "#4ade80",
    accentBg:"#0f2d1a",
    accentBd:"#1a4a28",
    danger:  "#f87171",
    dangerBg:"#2d1010",
    warn:    "#fbbf24",
    warnBg:  "#2a1f05",
  },
  light: {
    bg:      "#f5f4f1",
    surface: "#ffffff",
    s2:      "#f0efec",
    s3:      "#e8e7e3",
    border:  "#e2e1dc",
    border2: "#d0cec8",
    text:    "#1a1a18",
    text2:   "#6b6a65",
    text3:   "#a8a7a0",
    accent:  "#16803c",
    accentBg:"#f0fdf4",
    accentBd:"#bbf7d0",
    danger:  "#dc2626",
    dangerBg:"#fff1f2",
    warn:    "#d97706",
    warnBg:  "#fffbeb",
  },
};

// ─── Shared styled helpers (inline, theme-aware) ──────────────────────────────
function useStyles(th) {
  return {
    card: { background:th.surface, border:`1px solid ${th.border}`, borderRadius:10 },
    inp: { background:th.s2, border:`1px solid ${th.border}`, color:th.text,
      borderRadius:7, padding:"8px 11px", fontSize:13, width:"100%",
      outline:"none", boxSizing:"border-box", fontFamily:"inherit" },
    btn: { background:th.accent, color: th.bg==="0d0d0d"||th.bg==="#0d0d0d"?"#0d0d0d":"#fff",
      border:"none", borderRadius:7, padding:"7px 16px", fontSize:13,
      fontWeight:600, cursor:"pointer", fontFamily:"inherit",
      letterSpacing:"-0.01em" },
    btnSm: { background:th.accent, color:"#fff",
      border:"none", borderRadius:6, padding:"5px 12px", fontSize:12,
      fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
    btnGhost: { background:"transparent", border:`1px solid ${th.border}`,
      color:th.text2, borderRadius:6, padding:"5px 11px", fontSize:12,
      fontWeight:500, cursor:"pointer", fontFamily:"inherit" },
    btnDanger: { background:th.dangerBg, border:`1px solid ${th.dangerBg}`,
      color:th.danger, borderRadius:7, padding:"7px 16px", fontSize:13,
      fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
    label: { fontSize:11, color:th.text3, fontWeight:600,
      letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5, display:"block" },
    divider: { borderTop:`1px solid ${th.border}`, margin:"16px 0" },
  };
}

// ─── StatusDot ────────────────────────────────────────────────────────────────
function StatusDot({ status, label, size=7 }) {
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>
      <span style={{ width:size, height:size, borderRadius:"50%",
        background:STATUS_DOT[status]||"#888", flexShrink:0, display:"inline-block" }} />
      {label && <span>{label}</span>}
    </span>
  );
}

// ─── CallCard ─────────────────────────────────────────────────────────────────
function CallCard({ call, onHangup, t, th, s }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(()=>{
    if (call.state!=="connected") return;
    const id=setInterval(()=>setElapsed(e=>e+1),1000);
    return()=>clearInterval(id);
  },[call.state]);
  const fmt=sec=>`${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
  const lp=localNumber(call.lead.phone);
  const stateColor={ ringing:th.warn, connected:th.accent, ended:th.text3, dropped:th.danger }[call.state];

  return (
    <div style={{ ...s.card, padding:"14px 16px", marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:14, color:th.text }}>{call.lead.name}</div>
          <div style={{ fontSize:12, color:th.text3, marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>{call.lead.phone}</div>
        </div>
        <span style={{ fontSize:12, color:stateColor, fontWeight:600 }}>
          {call.state==="ringing"&&<>● {t.dialer.ringing}</>}
          {call.state==="connected"&&<>● {t.dialer.connected} {fmt(elapsed)}</>}
          {call.state==="ended"&&t.dialer.ended}
          {call.state==="dropped"&&t.dialer.dropped}
        </span>
      </div>
      <div style={{ fontSize:11, color:th.text3, marginBottom:10 }}>
        <span style={{ color:th.accent, fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>{lp.num}</span>
        <span style={{ marginLeft:6, background:th.s3, padding:"1px 7px", borderRadius:20, fontSize:10 }}>{lp.city}</span>
      </div>
      {(call.state==="ringing"||call.state==="connected")&&(
        <button onClick={()=>onHangup(call.id)} style={{ ...s.btnGhost, color:th.danger, borderColor:th.dangerBg }}>
          {t.dialer.hangup}
        </button>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export default function CRM({ session }) {
  // ── Preferences ──
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState("es");
  const th = THEMES[dark?"dark":"light"];
  const t  = T[lang];
  const s  = useStyles(th);

  // ── Navigation ──
  const [view, setView] = useState("dashboard");
  const [selectedLead, setSelectedLead] = useState(null);

  // ── Data (Supabase) ──
  const [leads, setLeads]   = useState([]);
  const [fus,   setFus]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState("");

  // Load data from Supabase on mount
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [leadsData, fusData] = await Promise.all([fetchLeads(), fetchFollowUps()]);
        setLeads(leadsData.map(normLead));
        setFus(fusData.map(normFU));
      } catch (e) {
        console.error(e);
        setDbError("No se pudo conectar a Supabase. Verifica tu .env.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Leads UI ──
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterTime, setFilterTime]     = useState("All");
  const [search, setSearch]             = useState("");
  const [showAddLead, setShowAddLead]   = useState(false);
  const [editNote, setEditNote]         = useState("");
  const [editProduct, setEditProduct]   = useState("");
  const [editPremium, setEditPremium]   = useState(0);
  const [editLastContact, setEditLastContact] = useState("");
  const [newLead, setNewLead]           = useState({ name:"",phone:"",email:"",status:"New Lead",product:"Term Life",age:"",city:"",notes:"" });

  // ── Follow-ups UI ──
  const [showAddFU, setShowAddFU] = useState(false);
  const [newFU, setNewFU]         = useState({ leadId:"", date:"", note:"" });

  // ── Mass text ──
  const [mtFilter, setMtFilter] = useState("All");
  const [mtMsg, setMtMsg]       = useState("");
  const [mtSent, setMtSent]     = useState(false);

  // ── Dialer ──
  const [dMode, setDMode]         = useState(1);
  const [dFilter, setDFilter]     = useState("New Lead");
  const [dRunning, setDRunning]   = useState(false);
  const [dQueue, setDQueue]       = useState([]);
  const [dCalls, setDCalls]       = useState([]);
  const [dLog, setDLog]           = useState([]);
  const [connId, setConnId]       = useState(null);

  // ── CSV ──
  const [csvModal, setCsvModal]   = useState(false);
  const [csvData, setCsvData]     = useState(null);
  const [csvErr, setCsvErr]       = useState("");
  const [imported, setImported]   = useState(0);

  // ── Derived ──────────────────────────────────────────────────────────────
  const filtLeads = useMemo(()=>leads.filter(l=>{
    const ms = filterStatus==="All"||l.status===filterStatus;
    const mq = !search||l.name.toLowerCase().includes(search.toLowerCase())||l.phone.includes(search)||l.city.toLowerCase().includes(search.toLowerCase());
    let mt = true;
    if (filterTime!=="All" && l.lastContact) {
      const today = new Date(); today.setHours(0,0,0,0);
      const lc = new Date(l.lastContact+"T00:00:00");
      const diffDays = (today - lc) / 86400000;
      if (filterTime==="yesterday") mt = diffDays>=1 && diffDays<2;
      else if (filterTime==="3days")  mt = diffDays>=3;
      else if (filterTime==="1week")  mt = diffDays>=7;
      else if (filterTime==="1month") mt = diffDays>=30;
    }
    return ms&&mq&&mt;
  }),[leads,filterStatus,filterTime,search]);

  const mtLeads = useMemo(()=>mtFilter==="All"?leads:leads.filter(l=>l.status===mtFilter),[leads,mtFilter]);

  const dLeads = useMemo(()=>
    dFilter==="All"?leads.filter(l=>!["Closed Won","Closed Lost"].includes(l.status))
    :leads.filter(l=>l.status===dFilter),[leads,dFilter]);

  const stats = useMemo(()=>({
    total:leads.length,
    pipeline:leads.filter(l=>!["Closed Won","Closed Lost"].includes(l.status)).length,
    won:leads.filter(l=>l.status==="Closed Won").length,
    pendingFU:fus.filter(f=>!f.done).length,
    revenue:leads.filter(l=>l.status==="Closed Won").reduce((a,l)=>a+l.premium,0),
  }),[leads,fus]);

  // ── Dialer engine ─────────────────────────────────────────────────────────
  useEffect(()=>{
    if (!dRunning||dCalls.length>0) return;
    if (dQueue.length===0){ setDRunning(false); return; }
    const batch=dQueue.slice(0,dMode);
    const remaining=dQueue.slice(dMode);
    const calls=batch.map(lead=>({ id:`c${lead.id}-${Date.now()}`, lead, state:"ringing", startedAt:Date.now() }));
    setDCalls(calls);
    setDQueue(remaining);
    const delay=3000+Math.random()*9000;
    const answers=Math.random()>0.35;
    const aIdx=Math.floor(Math.random()*batch.length);
    const tid=setTimeout(()=>{
      setDCalls(prev=>{
        if (answers){
          const answerer=prev[aIdx]; if(!answerer) return prev;
          setConnId(answerer.id);
          setLeads(ls=>ls.map(l=>l.id===answerer.lead.id
            ?{...l,status:l.status==="New Lead"?"Contacted":l.status,lastContact:new Date().toISOString().slice(0,10)}
            :l));
          // Persist to Supabase
          updateLead(answerer.lead.id,{status:answerer.lead.status==="New Lead"?"Contacted":answerer.lead.status,last_contact:new Date().toISOString().slice(0,10)}).catch(console.error);
          return prev.map((c,i)=>i===aIdx?{...c,state:"connected"}:{...c,state:"dropped"});
        } else {
          prev.forEach(c=>setDLog(lg=>[...lg,{...c,state:"no-answer",endedAt:Date.now()}]));
          return prev.map(c=>({...c,state:"dropped"}));
        }
      });
      if (!answers) setTimeout(()=>setDCalls([]),1000);
    },delay);
    return()=>clearTimeout(tid);
  },[dRunning,dCalls.length]);

  useEffect(()=>{
    if (!connId) return;
    setDCalls(prev=>prev.map(c=>c.id!==connId&&c.state==="ringing"?{...c,state:"dropped"}:c));
  },[connId]);

  function startDialer(){
    if (dLeads.length===0) return;
    setDQueue([...dLeads]); setDCalls([]); setConnId(null); setDRunning(true);
  }
  function stopDialer(){
    setDRunning(false);
    setDCalls(prev=>prev.map(c=>c.state==="ringing"||c.state==="connected"?{...c,state:"dropped"}:c));
    setTimeout(()=>setDCalls([]),900);
  }
  function hangupCall(id){
    setDCalls(prev=>{
      const updated=prev.map(c=>c.id===id?{...c,state:"ended"}:c);
      updated.forEach(c=>{if(c.id===id)setDLog(lg=>[...lg,{...c,endedAt:Date.now()}])});
      return updated;
    });
    setConnId(null);
    setTimeout(()=>setDCalls([]),700);
  }

  // ── Lead helpers ──────────────────────────────────────────────────────────
  async function addLead(){
    if (!newLead.name||!newLead.phone) return;
    try {
      const created = await createLead(newLead);
      setLeads(p=>[normLead(created),...p]);
      setNewLead({name:"",phone:"",email:"",status:"New Lead",product:"Term Life",age:"",city:"",notes:""});
      setShowAddLead(false);
    } catch(e){ alert("Error guardando lead: "+e.message); }
  }
  async function setLeadStatus(id,status){
    setLeads(p=>p.map(l=>l.id===id?{...l,status}:l)); // optimistic
    if(selectedLead?.id===id) setSelectedLead(p=>({...p,status}));
    try { await updateLead(id,{status}); }
    catch(e){ console.error(e); }
  }
  async function saveNote(id){
    setLeads(p=>p.map(l=>l.id===id?{...l,notes:editNote}:l)); // optimistic
    setSelectedLead(p=>({...p,notes:editNote}));
    try { await updateLead(id,{notes:editNote}); }
    catch(e){ console.error(e); }
  }
  async function saveLeadInfo(id){
    const premium = parseFloat(editPremium);
    const premiumVal = isNaN(premium) ? 0 : premium;
    const lastContact = editLastContact;
    setLeads(p=>p.map(l=>l.id===id?{...l,product:editProduct,premium:premiumVal,lastContact}:l)); // optimistic
    setSelectedLead(p=>({...p,product:editProduct,premium:premiumVal,lastContact}));
    try { await updateLead(id,{product:editProduct,premium:premiumVal,last_contact:lastContact}); }
    catch(e){ console.error(e); }
  }
  function openLeadDetail(l){
    setSelectedLead(l);
    setEditNote(l.notes);
    setEditProduct(l.product||"");
    setEditPremium(l.premium||0);
    setEditLastContact(l.lastContact||"");
    setView("leadDetail");
  }

  // ── Follow-up helpers ─────────────────────────────────────────────────────
  async function addFU(){
    if (!newFU.leadId||!newFU.date||!newFU.note) return;
    try {
      const created = await createFollowUp({ leadId:newFU.leadId, date:newFU.date, note:newFU.note });
      setFus(p=>[...p, normFU(created)]);
      setNewFU({leadId:"",date:"",note:""});
      setShowAddFU(false);
    } catch(e){ alert("Error guardando seguimiento: "+e.message); }
  }
  async function toggleFU(id){
    const fu = fus.find(f=>f.id===id);
    if (!fu) return;
    setFus(p=>p.map(f=>f.id===id?{...f,done:!f.done}:f)); // optimistic
    try { await updateFollowUp(id,{done:!fu.done}); }
    catch(e){ console.error(e); }
  }
  async function updateFU(id, fields){
    setFus(p=>p.map(f=>f.id===id?{...f,...fields}:f)); // optimistic
    try { await updateFollowUp(id, fields); }
    catch(e){ console.error(e); }
  }
  async function deleteFU(id){
    setFus(p=>p.filter(f=>f.id!==id)); // optimistic
    try { await deleteFollowUp(id); }
    catch(e){ console.error(e); }
  }

  const [editingFU, setEditingFU] = useState(null); // { id, leadId, date, note }

  // ── CSV helpers ───────────────────────────────────────────────────────────
  function csvParse(line){
    const r=[]; let c=""; let q=false;
    for (const ch of line){ if(ch==='"')q=!q; else if(ch===','&&!q){r.push(c.trim());c="";}else c+=ch; }
    r.push(c.trim()); return r.map(x=>x.replace(/^"|"$/g,"").trim());
  }
  function csvAutoMap(hdrs){
    const h=hdrs.map(x=>x.toLowerCase());
    const f=kws=>{const i=h.findIndex(x=>kws.some(k=>x.includes(k)));return i>=0?hdrs[i]:"";};
    return{name:f(["name","nombre","full"]),phone:f(["phone","tel","movil","cel","numero"]),
      email:f(["email","correo"]),city:f(["city","ciudad"]),age:f(["age","edad"]),
      product:f(["product","producto"]),notes:f(["note","nota","comment"])};
  }
  function handleCsvFile(file){
    if (!file||!file.name.endsWith(".csv")){setCsvErr("Solo archivos .csv");return;}
    setCsvErr("");
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const lines=ev.target.result.split(/\r?\n/).filter(l=>l.trim());
        if (lines.length<2){setCsvErr("CSV vacío.");return;}
        const hdrs=csvParse(lines[0]);
        const rows=lines.slice(1).map(l=>csvParse(l)).filter(r=>r.some(c=>c));
        setCsvData({hdrs,rows:rows.slice(0,200),mapped:csvAutoMap(hdrs),total:rows.length});
        setCsvModal(true);
      }catch{setCsvErr("Error procesando CSV.");}
    };
    r.readAsText(file);
  }
  async function confirmCsv(){
    if (!csvData) return;
    const{hdrs,rows,mapped}=csvData;
    const idx=col=>col?hdrs.indexOf(col):-1;
    const imp=rows.map((cols,i)=>({
      name:  idx(mapped.name)>=0  ? cols[idx(mapped.name)]  : "?",
      phone: idx(mapped.phone)>=0 ? cols[idx(mapped.phone)] : "",
      email: idx(mapped.email)>=0 ? cols[idx(mapped.email)] : "",
      city:  idx(mapped.city)>=0  ? cols[idx(mapped.city)]  : "",
      age:   idx(mapped.age)>=0   ? cols[idx(mapped.age)]   : "",
      notes: idx(mapped.notes)>=0 ? cols[idx(mapped.notes)] : "",
      product:"Term Life",status:"New Lead",premium:0,
    })).filter(l=>l.name!=="?"&&l.phone);
    try {
      const created = await bulkCreateLeads(imp);
      setLeads(p=>[...p,...created.map(normLead)]);
      setImported(created.length);
      setCsvModal(false); setCsvData(null);
      setTimeout(()=>setImported(0),3500);
    } catch(e){ alert("Error importando CSV: "+e.message); }
  }

  // ── Products in current lang ──────────────────────────────────────────────
  const PRODUCTS = t.products;
  const EN_PRODUCTS = T.en.products;

  // ─── Render helpers ───────────────────────────────────────────────────────
  const NAVITEMS = [
    { id:"dashboard", icon:"⊞", label:t.nav.dashboard },
    { id:"leads",     icon:"⊹", label:t.nav.leads },
    { id:"pipeline",  icon:"⊳", label:t.nav.pipeline },
    { id:"followups", icon:"⊙", label:t.nav.followups },
    { id:"masstext",  icon:"⊠", label:t.nav.massText },
    { id:"dialer",    icon:"⊕", label:t.nav.dialer },
  ];

  const pendingFUDot = fus.filter(f=>!f.done).length;

  // ─── Section: Dashboard ───────────────────────────────────────────────────
  const SectionDashboard = (
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, color:th.text, marginBottom:24, letterSpacing:"-0.03em" }}>{t.dash.title}</h1>

      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:28 }}>
        {[
          [t.dash.totalLeads,   stats.total,   th.text],
          [t.dash.inPipeline,   stats.pipeline, "#60a5fa"],
          [t.dash.closed,       stats.won,      th.accent],
          [t.dash.pending,      stats.pendingFU,"#fbbf24"],
          [t.dash.monthly,      `$${stats.revenue}`, th.accent],
        ].map(([label,val,color])=>(
          <div key={label} style={{ ...s.card, padding:"16px 18px" }}>
            <div style={{ fontSize:24, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"-0.03em" }}>{val}</div>
            <div style={{ fontSize:11, color:th.text3, marginTop:5, fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>{t.dash.pipelineByStatus}</div>
        <div style={{ ...s.card, overflow:"hidden" }}>
          {STATUSES.map((st,i)=>{
            const count=leads.filter(l=>l.status===st).length;
            const pct=leads.length?count/leads.length:0;
            return (
              <div key={st} style={{ display:"flex", alignItems:"center", gap:14, padding:"11px 18px",
                borderBottom:i<STATUSES.length-1?`1px solid ${th.border}`:"none",
                cursor:"pointer" }}
                onClick={()=>{ setFilterStatus(st); setView("leads"); }}
                onMouseEnter={e=>e.currentTarget.style.background=th.s2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <StatusDot status={st} size={6} />
                <span style={{ fontSize:13, color:th.text2, flex:1, fontWeight:500 }}>{t.status[st]||st}</span>
                <div style={{ width:120, height:4, background:th.s3, borderRadius:2, overflow:"hidden" }}>
                  <div style={{ width:`${pct*100}%`, height:"100%", background:STATUS_DOT[st], borderRadius:2 }} />
                </div>
                <span style={{ fontSize:13, fontWeight:700, color:th.text, fontFamily:"'JetBrains Mono',monospace", width:20, textAlign:"right" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Follow-ups */}
      <div>
        <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>{t.dash.upcomingFollowups}</div>
        {fus.filter(f=>!f.done).slice(0,4).map(f=>{
          const lead=leads.find(l=>l.id===f.leadId);
          return (
            <div key={f.id} style={{ ...s.card, padding:"12px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ flex:1 }}>
                <span style={{ fontWeight:600, color:th.text, fontSize:13 }}>{lead?.name}</span>
                <span style={{ color:th.text3, fontSize:12, marginLeft:8, fontFamily:"'JetBrains Mono',monospace" }}>{f.date}</span>
                <div style={{ color:th.text2, fontSize:12, marginTop:3 }}>{f.note}</div>
              </div>
              <button onClick={()=>toggleFU(f.id)} style={{ ...s.btnGhost }}>{t.dash.done}</button>
            </div>
          );
        })}
        {fus.filter(f=>!f.done).length===0&&<div style={{ color:th.text3, fontSize:13 }}>{t.dash.noFollowups}</div>}
      </div>
    </div>
  );

  // ─── Section: Leads list ──────────────────────────────────────────────────
  const SectionLeads = (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:th.text, letterSpacing:"-0.03em" }}>{t.leads.title}</h1>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {imported>0&&<span style={{ fontSize:12, color:th.accent, fontWeight:600 }}>✓ +{imported}</span>}
          <label style={{ ...s.btnGhost, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5 }}>
            {t.leads.importCsv}
            <input type="file" accept=".csv" onChange={e=>{handleCsvFile(e.target.files[0]);e.target.value="";}} style={{ display:"none" }}/>
          </label>
          <button onClick={()=>setShowAddLead(true)} style={s.btn}>{t.leads.newLead}</button>
        </div>
      </div>

      {csvErr&&<div style={{ background:th.dangerBg, color:th.danger, borderRadius:7, padding:"8px 12px", marginBottom:12, fontSize:12 }}>{csvErr}</div>}

      <div style={{ display:"flex", gap:8, marginBottom:10 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.leads.search}
          style={{ ...s.inp, maxWidth:300, flex:1 }} />
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
          style={{ ...s.inp, maxWidth:180 }}>
          <option value="All">{t.leads.allStatuses}</option>
          {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
        </select>
      </div>

      {/* Time-based filter chips */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        <span style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginRight:4 }}>{t.leads.timeFilter}:</span>
        {[["All",t.leads.allTime],["yesterday",t.leads.yesterday],["3days",t.leads.last3days],["1week",t.leads.lastWeek],["1month",t.leads.lastMonth]].map(([val,label])=>(
          <button key={val} onClick={()=>setFilterTime(val)}
            style={{ background:filterTime===val?th.accent:"transparent",
              color:filterTime===val?(th.bg==="0d0d0d"||th.bg==="#0d0d0d"?"#0d0d0d":"#fff"):th.text2,
              border:`1px solid ${filterTime===val?th.accent:th.border}`,
              borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:500,
              cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ ...s.card, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${th.border}` }}>
              {[t.leads.name,t.leads.phone,t.leads.city,t.leads.product,t.leads.status,t.leads.lastContact].map(h=>(
                <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:10, fontWeight:700, color:th.text3, letterSpacing:"0.08em", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtLeads.map((l,i)=>(
              <tr key={l.id} style={{ borderBottom:i<filtLeads.length-1?`1px solid ${th.border}`:"none", cursor:"pointer" }}
                onClick={()=>openLeadDetail(l)}
                onMouseEnter={e=>e.currentTarget.style.background=th.s2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <td style={{ padding:"11px 16px" }}>
                  <div style={{ fontWeight:600, fontSize:13, color:th.text }}>{l.name}</div>
                  <div style={{ fontSize:11, color:th.text3 }}>{l.email}</div>
                </td>
                <td style={{ padding:"11px 16px", fontSize:12, color:th.text2, fontFamily:"'JetBrains Mono',monospace" }}>{l.phone}</td>
                <td style={{ padding:"11px 16px", fontSize:12, color:th.text2 }}>{l.city||"—"}</td>
                <td style={{ padding:"11px 16px", fontSize:12, color:th.text2 }}>{l.product}</td>
                <td style={{ padding:"11px 16px" }}>
                  <StatusDot status={l.status} label={<span style={{ fontSize:12, color:th.text2 }}>{t.status[l.status]||l.status}</span>} />
                </td>
                <td style={{ padding:"11px 16px", fontSize:12, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{l.lastContact}</td>
              </tr>
            ))}
            {filtLeads.length===0&&(
              <tr><td colSpan={6} style={{ padding:32, textAlign:"center", color:th.text3, fontSize:13 }}>{t.leads.noLeads}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Section: Lead Detail ─────────────────────────────────────────────────
  const SectionLeadDetail = selectedLead&&(
    <div>
      <button onClick={()=>{setSelectedLead(null);setView("leads");}} style={{ ...s.btnGhost, marginBottom:20 }}>{t.leads.detail.back}</button>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16 }}>
        <div>
          <div style={{ ...s.card, padding:22, marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <h2 style={{ fontSize:20, fontWeight:700, color:th.text, letterSpacing:"-0.03em", marginBottom:4 }}>{selectedLead.name}</h2>
                <div style={{ fontSize:13, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{selectedLead.phone} · {selectedLead.email}</div>
                <div style={{ fontSize:13, color:th.text3, marginTop:2 }}>{selectedLead.city}{selectedLead.age?` · ${selectedLead.age}y`:""}</div>
              </div>
              <StatusDot status={selectedLead.status} label={<span style={{ fontSize:13, color:th.text2, fontWeight:600 }}>{t.status[selectedLead.status]||selectedLead.status}</span>} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
              <div style={{ background:th.s2, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 }}>{t.leads.detail.product}</div>
                <select value={editProduct} onChange={e=>setEditProduct(e.target.value)}
                  style={{ ...s.inp, background:"transparent", border:"none", padding:"2px 0", fontSize:13, fontWeight:700, color:th.text }}>
                  {t.products.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ background:th.s2, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 }}>{t.leads.detail.premium}</div>
                <input type="number" min="0" step="1" value={editPremium} onChange={e=>setEditPremium(e.target.value===""?"":parseFloat(e.target.value)||0)}
                  style={{ ...s.inp, background:"transparent", border:"none", padding:"2px 0", fontSize:13, fontWeight:700, color:th.text, fontFamily:"'JetBrains Mono',monospace" }} />
              </div>
              <div style={{ background:th.s2, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 }}>{t.leads.detail.lastContact}</div>
                <input type="date" value={editLastContact} onChange={e=>setEditLastContact(e.target.value)}
                  style={{ ...s.inp, background:"transparent", border:"none", padding:"2px 0", fontSize:13, fontWeight:700, color:th.text, fontFamily:"'JetBrains Mono',monospace" }} />
              </div>
            </div>
            <button onClick={()=>saveLeadInfo(selectedLead.id)} style={s.btnSm}>{t.leads.detail.saveInfo}</button>
          </div>
          <div style={{ ...s.card, padding:22 }}>
            <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:10 }}>{t.leads.detail.notes}</div>
            <div style={{ fontSize:13, color:th.text2, marginBottom:14, minHeight:36, lineHeight:1.6 }}>{selectedLead.notes||t.leads.detail.noNotes}</div>
            <textarea value={editNote} onChange={e=>setEditNote(e.target.value)} rows={3}
              placeholder={t.leads.detail.updateNotes}
              style={{ ...s.inp, resize:"vertical", marginBottom:10 }} />
            <button onClick={()=>saveNote(selectedLead.id)} style={s.btnSm}>{t.leads.detail.saveNote}</button>
          </div>
        </div>
        <div>
          <div style={{ ...s.card, padding:18, marginBottom:14 }}>
            <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:14 }}>{t.leads.detail.changeStatus}</div>
            {STATUSES.map(st=>(
              <button key={st} onClick={()=>setLeadStatus(selectedLead.id,st)}
                style={{ display:"flex", alignItems:"center", gap:8, width:"100%", background:"transparent",
                  border:"none", padding:"8px 6px", cursor:"pointer", borderRadius:6,
                  background:selectedLead.status===st?th.s2:"transparent" }}
                onMouseEnter={e=>e.currentTarget.style.background=th.s2}
                onMouseLeave={e=>e.currentTarget.style.background=selectedLead.status===st?th.s2:"transparent"}>
                <StatusDot status={st} size={6} />
                <span style={{ fontSize:13, color:selectedLead.status===st?th.text:th.text2, fontWeight:selectedLead.status===st?600:400 }}>{t.status[st]||st}</span>
              </button>
            ))}
          </div>
          <div style={{ ...s.card, padding:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>{t.leads.detail.followups}</div>
              <button onClick={()=>{setNewFU({leadId:selectedLead.id,date:"",note:""});setShowAddFU(true);}} style={{ ...s.btnGhost, padding:"3px 9px", fontSize:11 }}>{t.leads.detail.add}</button>
            </div>
            {fus.filter(f=>f.leadId===selectedLead.id).map(f=>(
              <div key={f.id} style={{ paddingBottom:10, marginBottom:10, borderBottom:`1px solid ${th.border}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{f.date}</span>
                  <button onClick={()=>toggleFU(f.id)} style={{ background:"transparent", border:"none", cursor:"pointer", color:f.done?th.accent:th.text3, fontSize:14 }}>{f.done?"✓":"○"}</button>
                </div>
                <div style={{ fontSize:12, color:f.done?th.text3:th.text2, textDecoration:f.done?"line-through":"none", marginTop:3 }}>{f.note}</div>
              </div>
            ))}
            {fus.filter(f=>f.leadId===selectedLead.id).length===0&&<div style={{ fontSize:12, color:th.text3 }}>{t.leads.detail.noFU}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Section: Pipeline (Kanban) ───────────────────────────────────────────
  const SectionPipeline = (
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, color:th.text, marginBottom:20, letterSpacing:"-0.03em" }}>{t.pipeline.title}</h1>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, alignItems:"start" }}>
        {STATUSES.map(st=>{
          const stLeads=leads.filter(l=>l.status===st);
          return (
            <div key={st}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                <StatusDot status={st} size={6} />
                <span style={{ fontSize:11, color:th.text2, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{t.status[st]||st}</span>
                <span style={{ marginLeft:"auto", fontSize:12, fontWeight:700, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{stLeads.length}</span>
              </div>
              {stLeads.map(l=>(
                <div key={l.id} style={{ ...s.card, padding:"12px 12px", marginBottom:8, cursor:"pointer" }}
                  onClick={()=>openLeadDetail(l)}>                  <div style={{ fontWeight:600, fontSize:12, color:th.text, marginBottom:3 }}>{l.name}</div>
                  <div style={{ fontSize:11, color:th.text3, fontFamily:"'JetBrains Mono',monospace", marginBottom:5 }}>{l.phone}</div>
                  <div style={{ fontSize:10, color:th.text3, background:th.s2, display:"inline-block", padding:"2px 7px", borderRadius:20 }}>{l.product}</div>
                  {l.premium>0&&<div style={{ fontSize:11, color:th.accent, marginTop:5, fontFamily:"'JetBrains Mono',monospace" }}>${l.premium}/mo</div>}
                </div>
              ))}
              {stLeads.length===0&&<div style={{ ...s.card, padding:"14px 12px", textAlign:"center" }}>
                <span style={{ fontSize:11, color:th.text3 }}>—</span>
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─── Section: Follow-ups ──────────────────────────────────────────────────
  function FUEditForm({ f, onSave, onCancel }) {
    const [draft, setDraft] = useState({ leadId: f.leadId, date: f.date, note: f.note });
    return (
      <div style={{ padding:"16px 18px", borderTop:`1px solid ${th.border}` }}>
        <div style={{ fontSize:11, color:th.accent, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:14 }}>{t.followups.editTitle}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 160px", gap:10, marginBottom:10 }}>
          <div>
            <span style={s.label}>{t.followups.leadLbl}</span>
            <select value={draft.leadId} onChange={e=>setDraft(p=>({...p,leadId:parseInt(e.target.value)}))} style={s.inp}>
              {leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>{t.followups.dateLbl}</span>
            <input type="date" value={draft.date} onChange={e=>setDraft(p=>({...p,date:e.target.value}))} style={s.inp} />
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <span style={s.label}>{t.followups.taskLbl}</span>
          <textarea value={draft.note} onChange={e=>setDraft(p=>({...p,note:e.target.value}))} rows={3} style={{ ...s.inp, resize:"vertical" }} />
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={s.btnGhost}>{t.followups.cancel}</button>
          <button onClick={()=>onSave(draft)} style={s.btn}>{t.followups.saveEdit}</button>
        </div>
      </div>
    );
  }

  function FUCard({ f, dimmed }) {
    const lead = leads.find(l=>l.id===f.leadId);
    const isEditing = editingFU===f.id;
    return (
      <div style={{ ...s.card, marginBottom:8, overflow:"hidden", opacity: dimmed&&!isEditing ? 0.55 : 1 }}>
        {/* Row */}
        <div style={{ padding:"13px 16px", display:"flex", alignItems:"flex-start", gap:12 }}>
          <button onClick={()=>toggleFU(f.id)}
            style={{ width:18, height:18, borderRadius:"50%", flexShrink:0, marginTop:2, cursor:"pointer",
              border: f.done ? `1.5px solid ${th.accent}` : `1.5px solid ${th.border2}`,
              background: f.done ? th.accentBg : "transparent",
              color: th.accent, fontSize:11,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            {f.done?"✓":""}
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
              <span style={{ fontWeight:600, fontSize:13, color:th.text,
                textDecoration: f.done?"line-through":"none" }}>{lead?.name}</span>
              {lead&&<StatusDot status={lead.status}
                label={<span style={{ fontSize:11, color:th.text3 }}>{t.status[lead.status]||lead.status}</span>} />}
            </div>
            <div style={{ fontSize:13, color: f.done?th.text3:th.text2, lineHeight:1.5,
              textDecoration: f.done?"line-through":"none" }}>{f.note}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, flexShrink:0 }}>
            <div style={{ fontSize:12, fontWeight:600, fontFamily:"'JetBrains Mono',monospace",
              color: f.done ? th.text3 : th.warn }}>{f.date}</div>
            <div style={{ display:"flex", gap:6 }}>
              <button
                onClick={()=>setEditingFU(isEditing ? null : f.id)}
                style={{ ...s.btnGhost, padding:"3px 9px", fontSize:11,
                  color: isEditing ? th.accent : th.text2,
                  borderColor: isEditing ? th.accent : th.border }}>
                {isEditing ? t.followups.cancel : t.followups.edit}
              </button>
              <button onClick={()=>{ if(window.confirm(t.followups.confirmDelete)) deleteFU(f.id); }}
                style={{ ...s.btnGhost, padding:"3px 9px", fontSize:11, color:th.danger, borderColor:th.dangerBg }}>
                {t.followups.delete}
              </button>
            </div>
          </div>
        </div>
        {/* Inline edit form — expands below row */}
        {isEditing && (
          <FUEditForm
            f={f}
            onSave={(draft)=>{ updateFU(f.id, draft); setEditingFU(null); }}
            onCancel={()=>setEditingFU(null)}
          />
        )}
      </div>
    );
  }

  const SectionFollowUps = (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:700, color:th.text, letterSpacing:"-0.03em" }}>{t.followups.title}</h1>
        <button onClick={()=>setShowAddFU(true)} style={s.btn}>{t.followups.newBtn}</button>
      </div>

      <div style={{ fontSize:11, color:th.warn, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:12 }}>
        {t.followups.pending} ({fus.filter(f=>!f.done).length})
      </div>
      {fus.filter(f=>!f.done).map(f=><FUCard key={f.id} f={f} dimmed={false} />)}
      {fus.filter(f=>!f.done).length===0 && (
        <div style={{ color:th.text3, fontSize:13, marginBottom:24 }}>{t.followups.noPending}</div>
      )}

      <div style={{ fontSize:11, color:th.accent, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginTop:28, marginBottom:12 }}>
        {t.followups.completed} ({fus.filter(f=>f.done).length})
      </div>
      {fus.filter(f=>f.done).map(f=><FUCard key={f.id} f={f} dimmed={true} />)}
      {fus.filter(f=>f.done).length===0 && (
        <div style={{ color:th.text3, fontSize:12 }}>{t.followups.noCompleted}</div>
      )}
    </div>
  );

  // ─── Section: Mass Text ───────────────────────────────────────────────────
  const SectionMassText = (
    <div>
      <h1 style={{ fontSize:22, fontWeight:700, color:th.text, marginBottom:6, letterSpacing:"-0.03em" }}>{t.massText.title}</h1>
      <p style={{ color:th.text3, fontSize:12, marginBottom:24 }}>{t.massText.disclaimer}</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16 }}>
        <div style={{ ...s.card, padding:22 }}>
          <div style={{ marginBottom:16 }}>
            <span style={s.label}>{t.massText.filterLbl}</span>
            <select value={mtFilter} onChange={e=>setMtFilter(e.target.value)} style={{ ...s.inp, maxWidth:260 }}>
              <option value="All">{t.massText.allLeads} ({leads.length})</option>
              {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st} ({leads.filter(l=>l.status===st).length})</option>)}
            </select>
          </div>
          <div style={{ marginBottom:16 }}>
            <span style={s.label}>{t.massText.msgLbl} <span style={{ color:mtMsg.length>160?th.danger:th.text3, fontWeight:400 }}>({mtMsg.length}/160)</span></span>
            <textarea value={mtMsg} onChange={e=>setMtMsg(e.target.value)} rows={6} maxLength={320}
              style={{ ...s.inp, resize:"vertical" }} />
            <div style={{ fontSize:11, color:th.text3, marginTop:5 }}>{t.massText.msgHint}</div>
          </div>

          <div style={{ background:th.s2, borderRadius:8, padding:"12px 14px", marginBottom:18 }}>
            <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>{t.massText.compliance}</div>
            {t.massText.complianceItems.map((item,i)=>(
              <div key={i} style={{ fontSize:12, color:th.text2, marginBottom:4 }}>· {item}</div>
            ))}
          </div>

          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <button onClick={()=>{
              if (!mtMsg.trim()||mtLeads.length===0) return;
              setMtSent(true); setMtMsg("");
              setTimeout(()=>setMtSent(false),3500);
            }} disabled={!mtMsg.trim()||mtLeads.length===0}
              style={{ ...s.btn, opacity:mtMsg.trim()&&mtLeads.length>0?1:0.4, cursor:mtMsg.trim()&&mtLeads.length>0?"pointer":"not-allowed" }}>
              {t.massText.send} {mtLeads.length} {t.massText.contacts}
            </button>
            {mtSent&&<span style={{ color:th.accent, fontSize:13, fontWeight:600 }}>{t.massText.sent} {mtLeads.length}</span>}
          </div>
        </div>

        <div style={{ ...s.card, padding:18 }}>
          <div style={{ fontSize:11, fontWeight:600, color:th.text3, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:14 }}>{t.massText.recipients} ({mtLeads.length})</div>
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {mtLeads.map(l=>(
              <div key={l.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${th.border}` }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:th.s2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:th.accent, flexShrink:0 }}>{l.name.charAt(0)}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:th.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{l.name}</div>
                  <div style={{ fontSize:11, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{l.phone}</div>
                </div>
                <StatusDot status={l.status} size={6} />
              </div>
            ))}
          </div>
          {mtMsg&&mtLeads.length>0&&(
            <div style={{ marginTop:14, background:th.s2, borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:th.text3, marginBottom:6, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{t.massText.preview}</div>
              <div style={{ fontSize:12, color:th.text2, lineHeight:1.6 }}>{mtMsg.replace("{nombre}",mtLeads[0]?.name?.split(" ")[0]||"").replace("{name}",mtLeads[0]?.name?.split(" ")[0]||"")}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Section: Auto Dialer ─────────────────────────────────────────────────
  const SectionDialer = (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:th.text, letterSpacing:"-0.03em", marginBottom:4 }}>{t.dialer.title}</h1>
          <p style={{ color:th.text3, fontSize:12 }}>{t.dialer.subtitle} <span style={{ color:th.text3, opacity:0.6 }}>({t.dialer.note})</span></p>
        </div>
        {dRunning
          ? <button onClick={stopDialer} style={s.btnDanger}>{t.dialer.stop}</button>
          : <button onClick={startDialer} disabled={dLeads.length===0}
              style={{ ...s.btn, opacity:dLeads.length>0?1:0.4, cursor:dLeads.length>0?"pointer":"not-allowed" }}>
              {t.dialer.start}
            </button>
        }
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:16 }}>
        {/* Config */}
        <div>
          <div style={{ ...s.card, padding:20, marginBottom:14 }}>
            <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:16 }}>{t.dialer.config}</div>

            <div style={{ marginBottom:18 }}>
              <span style={s.label}>{t.dialer.concurrentCalls}</span>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                {[1,3,5].map(m=>(
                  <button key={m} onClick={()=>!dRunning&&setDMode(m)}
                    style={{ background:dMode===m?th.accent:"transparent",
                      border:`1px solid ${dMode===m?th.accent:th.border}`,
                      color:dMode===m?(dark?"#0d0d0d":"#fff"):th.text2,
                      borderRadius:7, padding:"10px 0", fontSize:16, fontWeight:800,
                      cursor:dRunning?"not-allowed":"pointer", opacity:dRunning?0.5:1, textAlign:"center" }}>
                    {m}×
                    <div style={{ fontSize:9, fontWeight:600, marginTop:2, opacity:0.7 }}>{t.dialer.modeLabels[m]}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize:11, color:th.text3, marginTop:8, lineHeight:1.5 }}>{t.dialer.modeDescs[dMode]}</div>
            </div>

            <div style={{ marginBottom:18 }}>
              <span style={s.label}>{t.dialer.filterLeads}</span>
              <select value={dFilter} onChange={e=>!dRunning&&setDFilter(e.target.value)}
                style={{ ...s.inp, opacity:dRunning?0.5:1 }} disabled={dRunning}>
                <option value="All">{t.dialer.allExcludeClosed}</option>
                {STATUSES.filter(s=>!["Closed Won","Closed Lost"].includes(s)).map(st=>(
                  <option key={st} value={st}>{t.status[st]||st} ({leads.filter(l=>l.status===st).length})</option>
                ))}
              </select>
            </div>

            {/* Stats */}
            <div style={{ background:th.s2, borderRadius:8, padding:"12px 14px" }}>
              {[[t.dialer.queued, dRunning?dQueue.length:dLeads.length, th.text],
                [t.dialer.activeCalls, dCalls.filter(c=>c.state==="ringing"||c.state==="connected").length, th.accent],
                [t.dialer.contactedToday, dLog.filter(c=>c.state==="ended").length, th.accent]].map(([label,val,color])=>(
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontSize:12, color:th.text2 }}>{label}</span>
                  <span style={{ fontSize:14, fontWeight:700, color, fontFamily:"'JetBrains Mono',monospace" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Local presence */}
          <div style={{ ...s.card, padding:20 }}>
            <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>{t.dialer.localPresence}</div>
            <p style={{ fontSize:11, color:th.text3, lineHeight:1.6, marginBottom:12 }}>{t.dialer.localDesc}</p>
            {[["408","San Jose"],["415","San Francisco"],["650","Palo Alto"],["510","Oakland"],["916","Sacramento"]].map(([ac,city])=>(
              <div key={ac} style={{ display:"flex", gap:8, alignItems:"center", fontSize:11, marginBottom:5 }}>
                <span style={{ color:th.accent, fontFamily:"'JetBrains Mono',monospace" }}>({ac})</span>
                <span style={{ color:th.text2, flex:1 }}>{city}</span>
                <span style={{ color:th.text3, fontSize:10 }}>→ Twilio</span>
              </div>
            ))}
            <div style={{ fontSize:10, color:th.text3, marginTop:6 }}>+25 area codes CA</div>
          </div>
        </div>

        {/* Live + log */}
        <div>
          <div style={{ ...s.card, padding:20, marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" }}>{t.dialer.activeSessions}</div>
              {dRunning&&(
                <span style={{ fontSize:11, color:th.accent, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:th.accent, display:"inline-block" }} />
                  {t.dialer.dialerActive}
                </span>
              )}
            </div>
            {dCalls.length===0&&!dRunning&&(
              <div style={{ textAlign:"center", padding:"28px 0", color:th.text3 }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📞</div>
                <div style={{ fontSize:13 }}>{t.dialer.idle}</div>
                <div style={{ fontSize:12, marginTop:4, color:th.text3 }}>{dLeads.length} {t.dialer.readyLeads}</div>
              </div>
            )}
            {dCalls.length===0&&dRunning&&(
              <div style={{ textAlign:"center", padding:"20px 0", color:th.text3 }}>
                <div style={{ fontSize:12 }}>{t.dialer.preparing}</div>
              </div>
            )}
            {dCalls.map(c=><CallCard key={c.id} call={c} onHangup={hangupCall} t={t} th={th} s={s} />)}
          </div>

          {/* Log */}
          <div style={{ ...s.card, padding:20 }}>
            <div style={{ fontSize:11, color:th.text3, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:14 }}>
              {t.dialer.callLog} ({dLog.length})
            </div>
            {dLog.length===0&&<div style={{ fontSize:12, color:th.text3 }}>{t.dialer.noCalls}</div>}
            <div style={{ maxHeight:260, overflowY:"auto" }}>
              {[...dLog].reverse().map((c,i)=>{
                const lp=localNumber(c.lead.phone);
                const dur=c.endedAt&&c.startedAt?Math.round((c.endedAt-c.startedAt)/1000):0;
                const fmt=sec=>`${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
                const stateColor={ ended:th.accent, "no-answer":th.text3, dropped:th.danger }[c.state];
                const stateLabel={ ended:t.dialer.contacted, "no-answer":t.dialer.noAnswer, dropped:t.dialer.dropped }[c.state];
                return (
                  <div key={i} style={{ display:"flex", gap:12, padding:"9px 0", borderBottom:`1px solid ${th.border}`, alignItems:"center" }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:th.s2, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:stateColor }}>
                      {c.state==="ended"?"✓":c.state==="no-answer"?"–":"✕"}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:th.text }}>{c.lead.name}</div>
                      <div style={{ fontSize:11, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{c.lead.phone}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:12, fontWeight:600, color:stateColor }}>{stateLabel}</div>
                      {c.state==="ended"&&<div style={{ fontSize:10, color:th.text3, fontFamily:"'JetBrains Mono',monospace" }}>{fmt(dur)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Twilio note */}
          <div style={{ marginTop:14, background:th.s2, borderRadius:8, padding:"12px 16px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[[t.dialer.twilio1,t.dialer.twilio1d],[t.dialer.twilio2,t.dialer.twilio2d],[t.dialer.twilio3,t.dialer.twilio3d]].map(([title,desc])=>(
                <div key={title}>
                  <div style={{ fontSize:11, fontWeight:700, color:th.accent, marginBottom:3 }}>{title}</div>
                  <div style={{ fontSize:11, color:th.text3 }}>{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Modal: Add Lead ──────────────────────────────────────────────────────
  const ModalAddLead = showAddLead&&(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
      <div style={{ ...s.card, padding:26, width:440, maxWidth:"94vw" }}>
        <h3 style={{ fontWeight:700, fontSize:16, marginBottom:20, color:th.text, letterSpacing:"-0.02em" }}>{t.leads.addTitle}</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[[t.leads.nameLbl,"name","text"],[t.leads.phoneLbl,"phone","tel"],[t.leads.emailLbl,"email","email"],[t.leads.cityLbl,"city","text"],[t.leads.ageLbl,"age","number"]].map(([label,field,type])=>(
            <div key={field}>
              <span style={s.label}>{label}</span>
              <input type={type} value={newLead[field]} onChange={e=>setNewLead(p=>({...p,[field]:e.target.value}))} style={s.inp} />
            </div>
          ))}
          <div>
            <span style={s.label}>{t.leads.statusLbl}</span>
            <select value={newLead.status} onChange={e=>setNewLead(p=>({...p,status:e.target.value}))} style={s.inp}>
              {STATUSES.map(st=><option key={st} value={st}>{t.status[st]||st}</option>)}
            </select>
          </div>
          <div>
            <span style={s.label}>{t.leads.productLbl}</span>
            <select value={newLead.product} onChange={e=>setNewLead(p=>({...p,product:e.target.value}))} style={s.inp}>
              {EN_PRODUCTS.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <span style={s.label}>{t.leads.notesLbl}</span>
          <textarea value={newLead.notes} onChange={e=>setNewLead(p=>({...p,notes:e.target.value}))} rows={3} style={{ ...s.inp, resize:"vertical" }} />
        </div>
        <div style={{ display:"flex", gap:8, marginTop:18, justifyContent:"flex-end" }}>
          <button onClick={()=>setShowAddLead(false)} style={s.btnGhost}>{t.leads.cancel}</button>
          <button onClick={addLead} style={s.btn}>{t.leads.save}</button>
        </div>
      </div>
    </div>
  );

  // ─── Modal: Add Follow-up ─────────────────────────────────────────────────
  const ModalAddFU = showAddFU&&(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:60, padding:16 }}>
      <div style={{ ...s.card, padding:26, width:400, maxWidth:"94vw" }}>
        <h3 style={{ fontWeight:700, fontSize:16, marginBottom:20, color:th.text, letterSpacing:"-0.02em" }}>{t.followups.addTitle}</h3>
        <div style={{ marginBottom:12 }}>
          <span style={s.label}>{t.followups.leadLbl}</span>
          <select value={newFU.leadId} onChange={e=>setNewFU(p=>({...p,leadId:e.target.value}))} style={s.inp}>
            <option value="">{t.followups.selectLead}</option>
            {leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:12 }}>
          <span style={s.label}>{t.followups.dateLbl}</span>
          <input type="date" value={newFU.date} onChange={e=>setNewFU(p=>({...p,date:e.target.value}))} style={s.inp} />
        </div>
        <div style={{ marginBottom:18 }}>
          <span style={s.label}>{t.followups.taskLbl}</span>
          <textarea value={newFU.note} onChange={e=>setNewFU(p=>({...p,note:e.target.value}))} rows={3} style={{ ...s.inp, resize:"vertical" }} />
        </div>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={()=>setShowAddFU(false)} style={s.btnGhost}>{t.followups.cancel}</button>
          <button onClick={addFU} style={s.btn}>{t.followups.save}</button>
        </div>
      </div>
    </div>
  );

  // ─── Modal: CSV import ────────────────────────────────────────────────────
  const ModalCSV = csvModal&&csvData&&(
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:70, padding:16 }}>
      <div style={{ ...s.card, padding:26, width:680, maxWidth:"96vw", maxHeight:"88vh", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <h3 style={{ fontWeight:700, fontSize:16, color:th.text, letterSpacing:"-0.02em" }}>{t.csv.title} — {csvData.total} {t.csv.rows}</h3>
          <button onClick={()=>{setCsvModal(false);setCsvData(null);}} style={{ background:"transparent", border:"none", color:th.text3, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ marginBottom:16 }}>
          <span style={s.label}>{t.csv.colMapping}</span>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {[["name",t.leads.nameLbl],["phone",t.leads.phoneLbl],["email",t.leads.emailLbl],["city",t.leads.cityLbl],["age",t.leads.ageLbl],["notes",t.leads.notesLbl]].map(([field,label])=>(
              <div key={field}>
                <div style={{ fontSize:10, color:th.text3, marginBottom:3, fontWeight:600 }}>{label}</div>
                <select value={csvData.mapped[field]||""} onChange={e=>setCsvData(p=>({...p,mapped:{...p.mapped,[field]:e.target.value}}))} style={{ ...s.inp, fontSize:11, padding:"5px 8px" }}>
                  <option value="">{t.csv.noMap}</option>
                  {csvData.hdrs.map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex:1, overflow:"auto", border:`1px solid ${th.border}`, borderRadius:8, marginBottom:14 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead style={{ position:"sticky", top:0, background:th.surface }}>
              <tr style={{ borderBottom:`1px solid ${th.border}` }}>
                <th style={{ padding:"7px 12px", color:th.text3, fontWeight:700, fontSize:10, textAlign:"left" }}>#</th>
                {csvData.hdrs.map(h=>(
                  <th key={h} style={{ padding:"7px 12px", textAlign:"left", color:Object.values(csvData.mapped).includes(h)?th.accent:th.text3, fontWeight:700, fontSize:10, whiteSpace:"nowrap" }}>
                    {h}{Object.values(csvData.mapped).includes(h)?" ✓":""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {csvData.rows.slice(0,8).map((row,i)=>(
                <tr key={i} style={{ borderBottom:`1px solid ${th.border}` }}>
                  <td style={{ padding:"6px 12px", color:th.text3 }}>{i+1}</td>
                  {csvData.hdrs.map((h,j)=>(
                    <td key={j} style={{ padding:"6px 12px", color:Object.values(csvData.mapped).includes(h)?th.text:th.text2, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{row[j]||"—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {csvData.rows.length>8&&<div style={{ padding:"7px 12px", color:th.text3, fontSize:11 }}>…{csvData.rows.length-8} {t.csv.more}</div>}
        </div>
        {(!csvData.mapped.name||!csvData.mapped.phone)&&(
          <div style={{ background:th.warnBg, color:th.warn, borderRadius:7, padding:"8px 12px", marginBottom:12, fontSize:12 }}>{t.csv.warn}</div>
        )}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={()=>{setCsvModal(false);setCsvData(null);}} style={s.btnGhost}>{t.csv.cancel}</button>
          <button onClick={confirmCsv} disabled={!csvData.mapped.name||!csvData.mapped.phone}
            style={{ ...s.btn, opacity:csvData.mapped.name&&csvData.mapped.phone?1:0.4, cursor:csvData.mapped.name&&csvData.mapped.phone?"pointer":"not-allowed" }}>
            {t.csv.import} {csvData.total}
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Layout ───────────────────────────────────────────────────────────────
  const activeView = view==="leadDetail"?"leads":view;

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:"100vh", background:th.bg, flexDirection:"column", gap:16 }}>
      <div style={{ width:32, height:32, borderRadius:"50%",
        border:`3px solid ${th.border}`, borderTopColor:th.accent,
        animation:"spin 0.8s linear infinite" }} />
      <div style={{ color:th.text3, fontSize:13 }}>Cargando datos…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:th.bg, color:th.text,
      fontFamily:"'Instrument Sans','Segoe UI',sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${th.border2}; border-radius:3px; }
        select option { background: ${th.surface}; color: ${th.text}; }
      `}</style>

      {dbError && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100,
          background:th.dangerBg, color:th.danger, padding:"10px 20px",
          fontSize:13, textAlign:"center", borderBottom:`1px solid ${th.danger}` }}>
          ⚠ {dbError}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside style={{ width:220, background:th.surface, borderRight:`1px solid ${th.border}`,
        display:"flex", flexDirection:"column", padding:"20px 0", position:"sticky", top:0, height:"100vh", flexShrink:0 }}>

        {/* Brand */}
        <div style={{ padding:"0 20px 20px", borderBottom:`1px solid ${th.border}` }}>
          <div style={{ fontWeight:700, fontSize:15, color:th.text, letterSpacing:"-0.03em" }}>{t.appName}</div>
          <div style={{ fontSize:11, color:th.text3, marginTop:2, letterSpacing:"0.02em" }}>{t.appSub}</div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"12px 10px" }}>
          {NAVITEMS.map(item=>{
            const active=activeView===item.id;
            const hasDot=item.id==="followups"&&pendingFUDot>0;
            const dialerOn=item.id==="dialer"&&dRunning;
            return (
              <button key={item.id}
                onClick={()=>{ setView(item.id); setSelectedLead(null); }}
                style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 10px",
                  background:active?th.s2:"transparent", border:"none", borderRadius:7,
                  color:active?th.text:dialerOn?th.accent:th.text2,
                  fontSize:13, fontWeight:active?600:400, cursor:"pointer",
                  marginBottom:2, textAlign:"left", position:"relative" }}>
                <span style={{ fontSize:14, opacity:0.7 }}>{item.icon}</span>
                {item.label}
                {hasDot&&<span style={{ marginLeft:"auto", background:th.warn, color:"#000", fontSize:10,
                  fontWeight:700, borderRadius:20, padding:"1px 7px", fontFamily:"'JetBrains Mono',monospace" }}>{pendingFUDot}</span>}
                {dialerOn&&<span style={{ marginLeft:"auto", width:7, height:7, borderRadius:"50%", background:th.accent }} />}
              </button>
            );
          })}
        </nav>

        {/* Bottom controls */}
        <div style={{ padding:"16px 14px", borderTop:`1px solid ${th.border}`, display:"flex", flexDirection:"column", gap:8 }}>
          {/* Theme toggle */}
          <button onClick={()=>setDark(d=>!d)}
            style={{ display:"flex", alignItems:"center", gap:8, background:th.s2, border:`1px solid ${th.border}`,
              borderRadius:7, padding:"7px 12px", cursor:"pointer", color:th.text2, fontSize:12, fontWeight:500 }}>
            <span>{dark?"☀":"🌙"}</span>
            <span>{dark?"Light mode":"Dark mode"}</span>
          </button>
          {/* Lang toggle */}
          <button onClick={()=>setLang(l=>l==="es"?"en":"es")}
            style={{ display:"flex", alignItems:"center", gap:8, background:th.s2, border:`1px solid ${th.border}`,
              borderRadius:7, padding:"7px 12px", cursor:"pointer", color:th.text2, fontSize:12, fontWeight:500 }}>
            <span>{lang==="es"?"🇺🇸":"🇲🇽"}</span>
            <span>{lang==="es"?"Switch to English":"Cambiar a Español"}</span>
          </button>
          {/* Logout */}
          {session && (
            <button onClick={()=>supabase.auth.signOut()}
              style={{ display:"flex", alignItems:"center", gap:8, background:"transparent", border:`1px solid ${th.border}`,
                borderRadius:7, padding:"7px 12px", cursor:"pointer", color:"#666", fontSize:12, fontWeight:500 }}>
              <span>↪</span>
              <span style={{ flex:1, textAlign:"left", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {session.user?.email}
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex:1, padding:"32px 36px", overflowY:"auto", minWidth:0 }}>
        {view==="dashboard"&&SectionDashboard}
        {(view==="leads"||view==="leadDetail")&&(view==="leadDetail"?SectionLeadDetail:SectionLeads)}
        {view==="pipeline"&&SectionPipeline}
        {view==="followups"&&SectionFollowUps}
        {view==="masstext"&&SectionMassText}
        {view==="dialer"&&SectionDialer}
      </main>

      {/* Modals */}
      {ModalAddLead}
      {ModalAddFU}
      {ModalCSV}
    </div>
  );
}
