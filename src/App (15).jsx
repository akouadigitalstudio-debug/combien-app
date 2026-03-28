import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, onSnapshot,
  query as query_fb, orderBy, serverTimestamp, where, getDocs
} from "firebase/firestore";

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  green:"#00C170",greenDark:"#009955",greenGlow:"rgba(0,193,112,0.35)",
  black:"#0A0A0A",card:"#141414",border:"#1E1E1E",
  muted:"#555",white:"#FAFAFA",yellow:"#FFD600",red:"#FF4444",blue:"#00D4FF",
};
const FONT_URL="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Syne:wght@700;800&family=Space+Mono:wght@400;700&display=swap";

// ─── DATA ─────────────────────────────────────────────────────────────────────
const ZONES=["Yopougon","Cocody","Abobo","Plateau","Adjamé","Marcory","Treichville","Koumassi","Riviera"];

const SYNONYMES={
  "taxi":["taxi","transport","déplacement","moto","woro","gbaka"],
  "tresse":["tresse","coiffure","natte","perruque","cheveux","coupe"],
  "vidange":["vidange","mécanique","garage","pneu","réparation voiture"],
  "attiéké":["attiéké","maquis","restaurant","garba","alloco","riz sauce"],
  "tomate":["tomate","légume","marché"],
  "consultation":["consultation","médecin","docteur","santé","pharmacie"],
};

const CATEGORIES=[
  {id:"coiffure",  emoji:"💇‍♀️",label:"Coiffure",   color:"#FF6B9D",keys:["tresse","coupe","coiffure","natte","perruque","cheveux"]},
  {id:"transport", emoji:"🚕",  label:"Transport",  color:"#FFB800",keys:["taxi","transport","moto","bus","gbaka","woro","déplacement"]},
  {id:"mecanique", emoji:"🔧",  label:"Mécanique",  color:"#4ECDC4",keys:["vidange","mécanique","pneu","réparation","garage"]},
  {id:"maquis",    emoji:"🍽️", label:"Maquis",     color:"#FF6348",keys:["attiéké","maquis","restaurant","garba","alloco","poulet","riz"]},
  {id:"sante",     emoji:"💊",  label:"Santé",      color:"#A29BFE",keys:["consultation","médecin","pharmacie","médicament","clinique"]},
  {id:"loyer",     emoji:"🏠",  label:"Loyer",      color:"#74B9FF",keys:["loyer","chambre","appartement","maison","studio"]},
  {id:"marche",    emoji:"🛒",  label:"Marché",     color:"#55EFC4",keys:["tomate","oignon","riz","farine","huile","banane","igname","gombo","poisson"]},
  {id:"electricite",emoji:"⚡", label:"Électricité",color:"#FDCB6E",keys:["électricien","courant","câble","installation","groupe"]},
];

const MARCHE_PRODUITS=[
  {name:"Tomate",unit:"kg",emoji:"🍅"},{name:"Oignon",unit:"kg",emoji:"🧅"},
  {name:"Riz",unit:"kg",emoji:"🍚"},{name:"Poulet",unit:"kg",emoji:"🍗"},
  {name:"Attiéké",unit:"portion",emoji:"🍽️"},{name:"Banane",unit:"régime",emoji:"🍌"},
  {name:"Huile",unit:"litre",emoji:"🫙"},{name:"Igname",unit:"kg",emoji:"🥔"},
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const avg=arr=>arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0;
const fmt=p=>p.toLocaleString("fr-CI");
const median=arr=>{if(!arr.length)return 0;const s=[...arr].sort((a,b)=>a-b);const m=Math.floor(s.length/2);return s.length%2?s[m]:Math.round((s[m-1]+s[m])/2);};

// Device ID stable (anti-spam léger)
const getDeviceId=()=>{
  let id=localStorage.getItem("combien_device");
  if(!id){id=Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("combien_device",id);}
  return id;
};

// Avatar stable par hash
const stableAvatar=(id="")=>{
  const avs=["👩🏾","👨🏿","👩🏽","👨🏾","👩🏿","👨🏽","👧🏾","👦🏿"];
  let h=0;for(let i=0;i<id.length;i++)h=((h<<5)-h)+id.charCodeAt(i);
  return avs[Math.abs(h)%avs.length];
};

// Détection catégorie par synonymes
const detectCategory=(name="")=>{
  const lower=name.toLowerCase();
  for(const cat of CATEGORIES){
    if(cat.keys.some(k=>lower.includes(k)))return cat.id;
  }
  return "autre";
};

// Normaliser nom (synonymes → terme principal)
const normalizeService=(name="")=>{
  const lower=name.toLowerCase().trim();
  for(const[main,syns]of Object.entries(SYNONYMES)){
    if(syns.some(s=>lower.includes(s)))return main.charAt(0).toUpperCase()+main.slice(1);
  }
  return name.trim().charAt(0).toUpperCase()+name.trim().slice(1);
};

// Score avancé avec médiane
const calcScore=(price,prices)=>{
  if(!prices.length)return{label:"Normal",color:C.green,icon:"✓",pct:0,rank:50,message:"",shock:""};
  const med=median(prices);
  const a=avg(prices);
  const ref=prices.length>=5?med:a;
  const pct=Math.round(((price-ref)/ref)*100);
  const sorted=[...prices].sort((a,b)=>a-b);
  const rank=Math.round((sorted.filter(p=>p<=price).length/sorted.length)*100);
  const cheaper=100-rank;

  if(price<=ref*0.85)return{label:"Bon prix",color:C.blue,icon:"🏷️",pct,rank,
    message:`👍 Tu as payé moins cher que ${cheaper}% des gens !`,
    shock:`🔥 Je viens de trouver ${name} à seulement ${fmt(price)} FCFA ! ${cheaper}% des gens paient plus cher 💪`};
  if(price<=ref*1.10)return{label:"Normal",color:C.green,icon:"✓",pct,rank,
    message:`✅ Prix dans la normale pour cette zone.`,
    shock:`J'ai payé ${fmt(price)} FCFA — c'est le prix juste à Abidjan.`};
  if(price<=ref*1.30)return{label:"Cher",color:C.yellow,icon:"▲",pct,rank,
    message:`💸 Tu as payé ${pct}% de plus que la moyenne. Attention !`,
    shock:`J'ai payé ${fmt(price)} FCFA 😬 +${pct}% par rapport à la moyenne. Ne vous faites pas avoir !`};
  return{label:"Arnaque",color:C.red,icon:"⚠",pct,rank,
    message:`😳 Tu as payé plus cher que ${rank}% des gens de cette zone !`,
    shock:`ALERTE 🚨 J'ai payé ${fmt(price)} FCFA pour ça. Plus cher que ${rank}% des gens à Abidjan ! Vérifiez les vrais prix 👇`};
};

function formatTime(date){
  const now=new Date();const diff=Math.floor((now-date)/1000);
  if(diff<60)return"À l'instant";
  if(diff<3600)return`Il y a ${Math.floor(diff/60)} min`;
  if(diff<86400)return`Aujourd'hui · ${date.getHours()}h${String(date.getMinutes()).padStart(2,"0")}`;
  return"Hier";
}

// Favoris: clé = service+zone pour être précis
const favKey=(item)=>`${item.service||item.name}__${item.zone||""}`;
const loadFavs=()=>{try{return JSON.parse(localStorage.getItem("combien_favs")||"[]");}catch{return[];}};
const saveFavs=(f)=>{try{localStorage.setItem("combien_favs",JSON.stringify(f));}catch{}};

// Anti-spam: max 10 contributions par device par heure
const checkRateLimit=()=>{
  const key="combien_rl";
  const now=Date.now();
  const data=JSON.parse(localStorage.getItem(key)||'{"count":0,"reset":0}');
  if(now>data.reset){localStorage.setItem(key,JSON.stringify({count:1,reset:now+3600000}));return true;}
  if(data.count>=10)return false;
  localStorage.setItem(key,JSON.stringify({...data,count:data.count+1}));
  return true;
};

// ─── COMPOSANTS ───────────────────────────────────────────────────────────────
function ScoreBadge({score}){
  return<span style={{background:`${score.color}18`,border:`1px solid ${score.color}44`,borderRadius:6,padding:"2px 8px",fontSize:10,color:score.color,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}}>{score.icon} {score.label}</span>;
}

function EmotionalMsg({score}){
  if(!score?.message)return null;
  return<div style={{background:`${score.color}10`,border:`1px solid ${score.color}30`,borderRadius:10,padding:"10px 14px",fontSize:13,color:score.color,fontWeight:500,lineHeight:1.5}}>{score.message}</div>;
}

function Pill({children,active,onClick}){
  return<div onClick={onClick} style={{background:active?"#1E2E25":"#141414",border:`1px solid ${active?C.green:"#252525"}`,borderRadius:99,padding:"6px 14px",fontSize:12,color:active?C.green:"#666",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>{children}</div>;
}

function GreenBtn({children,onClick,disabled}){
  return<div onClick={disabled?null:onClick} style={{background:C.green,color:"#000",fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,padding:"15px 20px",borderRadius:16,textAlign:"center",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,boxShadow:`0 8px 24px ${C.greenGlow}`}}>{children}</div>;
}

function BackBtn({onClick}){
  return<div onClick={onClick} style={{width:36,height:36,background:"#1A1A1A",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,flexShrink:0}}>←</div>;
}

function PriceCard({item,allPrices,onPress,onFav,isFav}){
  const score=useMemo(()=>calcScore(item.price,allPrices),[item.price,allPrices]);
  return<div onClick={onPress} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,cursor:"pointer"}}>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:14,fontWeight:500}}>{item.service||item.name}</span>
        {item.unit&&<span style={{fontSize:10,color:C.muted,background:"#1E1E1E",borderRadius:4,padding:"1px 6px"}}>/{item.unit}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        <span style={{fontSize:11,color:C.muted}}>📍 {item.zone}</span>
        <ScoreBadge score={score}/>
        {score.pct!==0&&<span style={{fontSize:10,color:score.pct>0?C.red:C.blue,fontWeight:600}}>{score.pct>0?`+${score.pct}%`:`${score.pct}%`}</span>}
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,color:C.green}}>{fmt(item.price)}</span>
      {onFav&&<span onClick={e=>{e.stopPropagation();onFav(item);}} style={{fontSize:18,cursor:"pointer",opacity:isFav?1:0.3,transition:"opacity 0.15s"}}>{isFav?"❤️":"🤍"}</span>}
    </div>
  </div>;
}

// Search avec autocomplete amélioré
function SearchBox({data,onSearch}){
  const [q,setQ]=useState("");
  const [show,setShow]=useState(false);
  const ref=useRef(null);

  const suggestions=useMemo(()=>{
    if(q.length<2)return[];
    const lower=q.toLowerCase();
    // Cherche dans noms + synonymes
    const allTerms=new Set();
    data.forEach(d=>{const n=d.service||d.name||"";if(n)allTerms.add(n);});
    Object.entries(SYNONYMES).forEach(([main,syns])=>{
      if(syns.some(s=>s.includes(lower)||lower.includes(s)))allTerms.add(main.charAt(0).toUpperCase()+main.slice(1));
    });
    return[...allTerms].filter(n=>n.toLowerCase().includes(lower)).slice(0,6);
  },[q,data]);

  useEffect(()=>{
    const handler=e=>{if(ref.current&&!ref.current.contains(e.target))setShow(false);};
    document.addEventListener("mousedown",handler);return()=>document.removeEventListener("mousedown",handler);
  },[]);

  const select=useCallback(s=>{setQ(s);setShow(false);onSearch(s);},[onSearch]);

  return<div ref={ref} style={{position:"relative"}}>
    <form onSubmit={e=>{e.preventDefault();if(q.trim()){onSearch(normalizeService(q.trim()));setShow(false);}}}>
      <div style={{background:"#1A1A1A",border:"1.5px solid #2A2A2A",borderRadius:16,padding:"13px 16px",display:"flex",alignItems:"center",gap:10}}>
        <span>🔍</span>
        <input style={{background:"transparent",border:"none",outline:"none",color:C.white,fontSize:15,fontFamily:"'DM Sans',sans-serif",flex:1}} placeholder="tresse, taxi, tomate, riz…" value={q} onChange={e=>{setQ(e.target.value);setShow(true);}} onFocus={()=>setShow(true)}/>
        {q&&<span onClick={()=>{setQ("");setShow(false);}} style={{cursor:"pointer",color:C.muted,fontSize:14}}>✕</span>}
      </div>
    </form>
    {show&&suggestions.length>0&&<div style={{position:"absolute",top:"110%",left:0,right:0,background:"#1A1A1A",border:`1px solid ${C.border}`,borderRadius:12,zIndex:200,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
      {suggestions.map(s=><div key={s} onClick={()=>select(s)} style={{padding:"12px 16px",fontSize:14,color:C.white,cursor:"pointer",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:12,color:C.muted}}>🔍</span>{s}
      </div>)}
    </div>}
  </div>;
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({data,loading,favorites,onSearch,onCardClick,onToggleFav}){
  const [mode,setMode]=useState("services");
  const favKeys=useMemo(()=>new Set(favorites.map(f=>favKey(f))),[favorites]);
  const allP=useMemo(()=>data.map(d=>d.price),[data]);

  const topTrends=useMemo(()=>{
    const count={};
    data.forEach(d=>{const n=d.service||d.name||"";if(n)count[n]=(count[n]||0)+1;});
    return Object.entries(count).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([n])=>n);
  },[data]);

  const displayed=useMemo(()=>
    data.filter(d=>mode==="marche"?d.type==="produit":d.type!=="produit").slice(0,8)
  ,[data,mode]);

  const zoneStats=useMemo(()=>{
    const bz={};
    data.forEach(d=>{if(!bz[d.zone])bz[d.zone]=[];bz[d.zone].push(d.price);});
    return Object.entries(bz).map(([z,p])=>({zone:z,avg:avg(p),count:p.length})).sort((a,b)=>a.avg-b.avg);
  },[data]);

  const cheapest=zoneStats[0];
  const priciest=zoneStats[zoneStats.length-1];

  return<div>
    <div style={{background:"linear-gradient(160deg,#001A0D 0%,#0A0A0A 65%)",padding:"48px 20px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,letterSpacing:"-0.5px",display:"flex",alignItems:"center",gap:6}}>
          Combien<div style={{width:8,height:8,background:C.green,borderRadius:"50%",marginBottom:6}}></div>
        </div>
        <div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:99,padding:"4px 12px",fontSize:11,color:C.green,fontWeight:600}}>🔥 {data.length} prix réels</div>
      </div>
      <div style={{fontSize:13,color:"#666",marginBottom:16,lineHeight:1.5}}><strong style={{color:C.white}}>Tu sais avant de payer.</strong> Les vrais prix à Abidjan.</div>
      <SearchBox data={data} onSearch={onSearch}/>
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <div onClick={()=>setMode("services")} style={{flex:1,background:mode==="services"?C.green:"#1A1A1A",color:mode==="services"?"#000":C.muted,borderRadius:10,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>🛠️ Services</div>
        <div onClick={()=>setMode("marche")} style={{flex:1,background:mode==="marche"?C.green:"#1A1A1A",color:mode==="marche"?"#000":C.muted,borderRadius:10,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>🛒 Marché</div>
      </div>
    </div>

    {zoneStats.length>1&&<div style={{display:"flex",gap:8,padding:"14px 20px 0"}}>
      <div style={{flex:1,background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:12,padding:"10px 12px"}}>
        <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Zone moins chère</div>
        <div style={{fontSize:13,fontWeight:700,color:C.green}}>📍 {cheapest?.zone}</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:C.green}}>{cheapest?fmt(cheapest.avg):"--"} moy.</div>
      </div>
      <div style={{flex:1,background:"#2E1A1A",border:"1px solid #4A2E2E",borderRadius:12,padding:"10px 12px"}}>
        <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Zone plus chère</div>
        <div style={{fontSize:13,fontWeight:700,color:C.red}}>📍 {priciest?.zone}</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:C.red}}>{priciest?fmt(priciest.avg):"--"} moy.</div>
      </div>
    </div>}

    {topTrends.length>0&&<>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"16px 20px 8px"}}>🔥 Les plus consultés</div>
      <div style={{display:"flex",gap:8,padding:"0 20px",overflowX:"auto",scrollbarWidth:"none",paddingBottom:4}}>
        {topTrends.map(s=><Pill key={s} onClick={()=>onSearch(s)}>{s}</Pill>)}
      </div>
    </>}

    <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"16px 20px 10px"}}>Catégories</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,padding:"0 20px"}}>
      {CATEGORIES.filter(c=>mode==="marche"?c.id==="marche":c.id!=="marche").map(c=>(
        <div key={c.id} onClick={()=>onSearch(c.keys[0])} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 4px",textAlign:"center",cursor:"pointer",transition:"all 0.15s"}}>
          <span style={{fontSize:20,display:"block",marginBottom:4}}>{c.emoji}</span>
          <span style={{fontSize:9,color:"#666",fontWeight:600}}>{c.label}</span>
        </div>
      ))}
    </div>

    {mode==="marche"&&<>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"16px 20px 10px"}}>Produits populaires</div>
      <div style={{display:"flex",gap:8,padding:"0 20px",overflowX:"auto",scrollbarWidth:"none",paddingBottom:8}}>
        {MARCHE_PRODUITS.map(p=>(
          <div key={p.name} onClick={()=>onSearch(p.name)} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",flexShrink:0,textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:22,marginBottom:4}}>{p.emoji}</div>
            <div style={{fontSize:11,fontWeight:600}}>{p.name}</div>
            <div style={{fontSize:9,color:C.muted}}>/{p.unit}</div>
          </div>
        ))}
      </div>
    </>}

    <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"16px 20px 10px"}}>
      {loading?"Chargement…":"Prix récents"}
    </div>
    <div style={{padding:"0 20px"}}>
      {loading?<div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
        <div style={{fontSize:24,marginBottom:8}}>⏳</div>
        <div style={{fontSize:13}}>Connexion en cours…</div>
      </div>:displayed.length===0?<div style={{textAlign:"center",padding:"40px 0",color:C.muted,fontSize:13}}>
        Aucun prix encore — sois le premier !
      </div>:displayed.map((item,i)=>(
        <PriceCard key={item.id||i} item={item} allPrices={allP}
          onPress={()=>onCardClick(item.service||item.name)}
          onFav={onToggleFav} isFav={favKeys.has(favKey(item))}/>
      ))}
    </div>

    <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"16px 20px 10px"}}>⭐ Commerçants vérifiés</div>
    <div style={{display:"flex",gap:12,padding:"0 20px 20px",overflowX:"auto",scrollbarWidth:"none"}}>
      {[{id:1,name:"Salon Joëlle Beauty",zone:"Cocody",rating:4.8,reviews:124,price:"2 500 – 5 000",emoji:"💇‍♀️"},
        {id:2,name:"Garage Kouassi Pro",zone:"Yopougon",rating:4.6,reviews:89,price:"5 000 – 15 000",emoji:"🔧"},
        {id:3,name:"Maquis Chez Martine",zone:"Adjamé",rating:4.9,reviews:203,price:"800 – 2 000",emoji:"🍽️"},
        {id:4,name:"Transport Express CI",zone:"Plateau",rating:4.5,reviews:67,price:"1 000 – 3 000",emoji:"🚕"}
      ].map(b=>(
        <div key={b.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14,minWidth:175,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:22}}>{b.emoji}</span>
            <div><div style={{fontSize:12,fontWeight:600,lineHeight:1.3}}>{b.name}</div><div style={{fontSize:10,color:C.muted}}>📍 {b.zone}</div></div>
          </div>
          <div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:99,padding:"2px 8px",fontSize:10,color:C.green,fontWeight:700,display:"inline-block",marginBottom:6}}>✓ Prix fiable</div>
          <div style={{fontSize:11,color:"#888"}}>⭐ {b.rating} · {b.reviews} avis</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:C.green,marginTop:4}}>{b.price} FCFA</div>
        </div>
      ))}
    </div>
  </div>;
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────
function ResultsScreen({query,data,onBack,onAdd,favorites,onToggleFav}){
  const [tab,setTab]=useState("prix");
  const results=useMemo(()=>data.filter(d=>(d.service||d.name||"").toLowerCase().includes(query.toLowerCase())),[data,query]);
  const prices=useMemo(()=>results.map(r=>r.price),[results]);
  const avgP=avg(prices);
  const minP=prices.length?Math.min(...prices):0;
  const maxP=prices.length?Math.max(...prices):0;
  const isFav=favorites.some(f=>(f.service||f.name)===query);
  const scoreG=calcScore(avgP,prices);
  const buckets=useMemo(()=>{const b={};prices.forEach(p=>{const bk=Math.round(p/500)*500;b[bk]=(b[bk]||0)+1;});return b;},[prices]);
  const maxCnt=Math.max(...Object.values(buckets),1);
  const byZone=useMemo(()=>{
    const bz={};results.forEach(r=>{if(!bz[r.zone])bz[r.zone]=[];bz[r.zone].push(r.price);});
    return Object.entries(bz).map(([z,p])=>({zone:z,avg:avg(p),count:p.length})).sort((a,b)=>a.avg-b.avg);
  },[results]);

  if(!results.length)return<div>
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"48px 20px 16px"}}><BackBtn onClick={onBack}/><span style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800}}>{query}</span></div>
    <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>🔍</div>
      <div style={{fontSize:15,marginBottom:8,color:C.white}}>Aucun prix encore</div>
      <div style={{fontSize:13,marginBottom:24}}>Sois le premier à partager !</div>
      <div style={{padding:"0 40px"}}><GreenBtn onClick={onAdd}>➕ Ajouter ce prix</GreenBtn></div>
    </div>
  </div>;

  return<div>
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"48px 20px 12px"}}>
      <BackBtn onClick={onBack}/>
      <span style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,flex:1}}>{query}</span>
      <span onClick={()=>onToggleFav({service:query,zone:"",price:avgP})} style={{fontSize:22,cursor:"pointer",opacity:isFav?1:0.3}}>{isFav?"❤️":"🤍"}</span>
    </div>

    <div style={{margin:"0 20px 12px",background:`linear-gradient(135deg,${C.green},${C.greenDark})`,borderRadius:24,padding:24,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,background:"rgba(255,255,255,0.07)",borderRadius:"50%"}}></div>
      <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",marginBottom:4}}>Prix moyen · {results.length} contribution{results.length>1?"s":""}</div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:44,fontWeight:700,color:"#fff",lineHeight:1}}>{fmt(avgP)}</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:16}}>FCFA</div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
        {[["Min",fmt(minP)],["Max",fmt(maxP)],["Médiane",fmt(median(prices))]].map(([l,v])=>
          <div key={l}><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>{l}</div><div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:"#fff",fontWeight:700}}>{v}</div></div>
        )}
      </div>
    </div>

    {byZone.length>1&&<div style={{display:"flex",gap:8,padding:"0 20px 12px"}}>
      <div style={{flex:1,background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:12,padding:"10px 12px"}}>
        <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Moins cher</div>
        <div style={{fontSize:13,fontWeight:700,color:C.green}}>📍 {byZone[0].zone}</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:C.green}}>{fmt(byZone[0].avg)} FCFA</div>
      </div>
      <div style={{flex:1,background:"#2E1A1A",border:"1px solid #4A2E2E",borderRadius:12,padding:"10px 12px"}}>
        <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:2}}>Plus cher</div>
        <div style={{fontSize:13,fontWeight:700,color:C.red}}>📍 {byZone[byZone.length-1].zone}</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:C.red}}>{fmt(byZone[byZone.length-1].avg)} FCFA</div>
      </div>
    </div>}

    <div style={{display:"flex",gap:8,padding:"0 20px 16px"}}>
      {["prix","par zone"].map(t=><Pill key={t} active={tab===t} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</Pill>)}
    </div>

    {tab==="prix"&&<>
      <div style={{padding:"0 20px 12px"}}>
        <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600,marginBottom:10}}>Répartition des prix</div>
        {Object.entries(buckets).sort((a,b)=>+a[0]-+b[0]).map(([b,cnt])=>{
          const col=+b<=avgP*0.95?C.green:+b>=avgP*1.3?C.red:C.yellow;
          return<div key={b} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:10,color:C.muted,width:54,textAlign:"right",flexShrink:0}}>{parseInt(b).toLocaleString()}</span>
            <div style={{flex:1,height:6,background:"#1E1E1E",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(cnt/maxCnt)*100}%`,background:col,borderRadius:99}}></div>
            </div>
            <span style={{fontSize:10,color:"#444",width:16}}>{cnt}</span>
          </div>;
        })}
      </div>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"4px 20px 10px"}}>Contributions récentes</div>
      <div style={{padding:"0 20px"}}>
        {results.map(r=>{
          const sc=calcScore(r.price,prices);
          return<div key={r.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>{r.avatar}</span>
              <div><div style={{fontSize:13,fontWeight:500}}>{r.zone}</div><div style={{fontSize:10,color:C.muted}}>{r.time||"Récemment"}</div></div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
              <ScoreBadge score={sc}/>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {sc.pct!==0&&<span style={{fontSize:10,color:sc.pct>0?C.red:C.blue,fontWeight:600}}>{sc.pct>0?`+${sc.pct}%`:`${sc.pct}%`}</span>}
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:C.green}}>{fmt(r.price)}</span>
              </div>
            </div>
          </div>;
        })}
      </div>
    </>}

    {tab==="par zone"&&<div style={{padding:"0 20px"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16}}>
        {byZone.map(({zone,avg:a,count},i)=>{
          const pct=Math.min(Math.round((a/(maxP||1))*100),100);
          const isMin=i===0;const isMax=i===byZone.length-1;
          return<div key={zone} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13}}>📍 {zone}</span>
                {isMin&&<span style={{fontSize:9,background:"#1A2E1A",color:C.green,borderRadius:4,padding:"1px 5px",fontWeight:700}}>MIN</span>}
                {isMax&&<span style={{fontSize:9,background:"#2E1A1A",color:C.red,borderRadius:4,padding:"1px 5px",fontWeight:700}}>MAX</span>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:isMin?C.green:isMax?C.red:C.white}}>{fmt(a)} FCFA</div>
                <div style={{fontSize:9,color:C.muted}}>{count} prix</div>
              </div>
            </div>
            <div style={{height:4,background:"#1E1E1E",borderRadius:99}}>
              <div style={{height:"100%",width:`${pct}%`,background:isMin?C.green:isMax?C.red:C.yellow,borderRadius:99}}></div>
            </div>
          </div>;
        })}
      </div>
    </div>}
    <div style={{height:100}}></div>
    <div onClick={onAdd} style={{position:"fixed",bottom:80,right:20,background:C.green,color:"#000",fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,padding:"12px 20px",borderRadius:99,display:"flex",alignItems:"center",gap:6,boxShadow:`0 8px 24px ${C.greenGlow}`,cursor:"pointer",zIndex:50}}>➕ Ajouter mon prix</div>
  </div>;
}

// ─── MAP ──────────────────────────────────────────────────────────────────────
function MapScreen({onCardClick,data}){
  const [sel,setSel]=useState(null);
  const POSITIONS={"Yopougon":{top:58,left:14},"Cocody":{top:30,left:68},"Abobo":{top:14,left:32},"Adjamé":{top:40,left:40},"Plateau":{top:48,left:52},"Marcory":{top:66,left:62},"Treichville":{top:62,left:54},"Koumassi":{top:72,left:72},"Riviera":{top:25,left:80}};
  const maxCount=useMemo(()=>Math.max(...ZONES.map(z=>data.filter(d=>d.zone===z).length),1),[data]);
  const zoneData=useMemo(()=>ZONES.map(zone=>{
    const zd=data.filter(d=>d.zone===zone);
    return{...POSITIONS[zone],zone,count:zd.length,avgP:avg(zd.map(d=>d.price)),intensity:zd.length/maxCount,active:zd.length>0};
  }),[data,maxCount]);

  return<div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,padding:"48px 20px 4px"}}>🗺️ Carte des prix</div>
    <div style={{fontSize:13,color:C.muted,padding:"0 20px 12px"}}>Données réelles · Touche une zone</div>
    <div style={{margin:"0 20px",background:"linear-gradient(135deg,#0D1A0D,#0A120A)",border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",position:"relative",height:290}}>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.12}}>
        <defs><pattern id="g" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0L0 0 0 28" fill="none" stroke="#00C170" strokeWidth="0.5"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
      </svg>
      {zoneData.map(h=>(
        <div key={h.zone} onClick={()=>setSel(sel?.zone===h.zone?null:h)} style={{position:"absolute",top:`${h.top}%`,left:`${h.left}%`,transform:"translate(-50%,-50%)",cursor:"pointer",zIndex:2}}>
          {h.active&&<div style={{position:"absolute",width:Math.max(54*h.intensity,20),height:Math.max(54*h.intensity,20),background:C.green,borderRadius:"50%",opacity:h.intensity*0.25,top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}></div>}
          <div style={{position:"relative",width:32,height:32,background:sel?.zone===h.zone?"#fff":h.active?C.green:"#2A2A2A",border:`2px solid ${h.active?C.green:"#444"}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:sel?.zone===h.zone?C.green:h.active?"#000":"#555",boxShadow:h.active?`0 4px 14px ${C.greenGlow}`:"none",transition:"all 0.2s"}}>
            {h.count>999?"1k+":h.count}
          </div>
        </div>
      ))}
    </div>
    {sel&&<div style={{margin:"12px 20px 0",background:sel.active?"#1A2E1A":"#1A1A1A",border:`1px solid ${sel.active?"#2E4A2E":C.border}`,borderRadius:16,padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800}}>📍 {sel.zone}</div>
        <div style={{fontSize:12,color:sel.active?C.green:C.muted}}>{sel.count} prix</div>
      </div>
      {sel.active?<>
        <div style={{fontSize:13,color:C.muted,marginBottom:12}}>Prix moyen : <strong style={{color:C.green}}>{fmt(sel.avgP)} FCFA</strong></div>
        {data.filter(d=>d.zone===sel.zone).slice(0,3).map(d=>(
          <div key={d.id} onClick={()=>onCardClick(d.service||d.name)} style={{background:"rgba(0,193,112,0.08)",borderRadius:10,padding:"8px 12px",marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13}}>{d.service||d.name}</span>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:C.green}}>{fmt(d.price)}</span>
          </div>
        ))}
      </>:<div style={{fontSize:13,color:C.muted}}>Aucun prix encore. Sois le premier !</div>}
    </div>}
    <div style={{padding:"16px 20px 0"}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",marginBottom:12}}>Activité par zone</div>
      {[...zoneData].sort((a,b)=>b.count-a.count).map(h=>(
        <div key={h.zone} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <span style={{fontSize:13,width:95,flexShrink:0,color:h.active?C.white:C.muted}}>📍 {h.zone}</span>
          <div style={{flex:1,height:5,background:"#1E1E1E",borderRadius:99}}><div style={{height:"100%",width:`${h.intensity*100}%`,background:h.active?C.green:"#2A2A2A",borderRadius:99}}></div></div>
          <span style={{fontSize:11,color:h.active?C.muted:"#333",width:40,textAlign:"right"}}>{h.count||"—"}</span>
        </div>
      ))}
    </div>
    <div style={{height:20}}></div>
  </div>;
}

// ─── ADD ──────────────────────────────────────────────────────────────────────
function AddScreen({onBack,onSubmit,prefill,saving,data}){
  const [mode,setMode]=useState("service");
  const [service,setService]=useState(prefill||"");
  const [zone,setZone]=useState("Yopougon");
  const [price,setPrice]=useState("");
  const [unit,setUnit]=useState("kg");
  const can=service.trim()&&price&&parseInt(price)>0&&!saving;
  const relatedPrices=useMemo(()=>data.filter(d=>(d.service||d.name||"").toLowerCase()===service.toLowerCase()).map(d=>d.price),[data,service]);
  const currentAvg=avg(relatedPrices);
  const previewScore=can&&currentAvg>0?calcScore(parseInt(price),relatedPrices):null;

  return<div>
    <div style={{padding:"48px 20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><BackBtn onClick={onBack}/></div>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,lineHeight:1.2,marginBottom:6}}>Tu as payé<br/><span style={{color:C.green}}>combien ?</span></div>
      <div style={{fontSize:13,color:"#666"}}>3 secondes. Sauvegardé en temps réel.</div>
    </div>
    <div style={{padding:"0 20px"}}>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <div onClick={()=>setMode("service")} style={{flex:1,background:mode==="service"?C.green:"#1A1A1A",color:mode==="service"?"#000":C.muted,borderRadius:10,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,cursor:"pointer"}}>🛠️ Service</div>
        <div onClick={()=>setMode("produit")} style={{flex:1,background:mode==="produit"?C.green:"#1A1A1A",color:mode==="produit"?"#000":C.muted,borderRadius:10,padding:"8px",textAlign:"center",fontSize:12,fontWeight:700,cursor:"pointer"}}>🛒 Marché</div>
      </div>
      <label style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:8,display:"block"}}>{mode==="produit"?"Quel produit ?":"C'était quoi ?"}</label>
      {mode==="produit"?(
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
          {MARCHE_PRODUITS.map(p=>(
            <div key={p.name} onClick={()=>{setService(p.name);setUnit(p.unit);}} style={{background:service===p.name?"#1E2E25":"#141414",border:`1px solid ${service===p.name?C.green:"#252525"}`,borderRadius:10,padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <span>{p.emoji}</span><span style={{fontSize:12,color:service===p.name?C.green:"#888"}}>{p.name}</span>
            </div>
          ))}
        </div>
      ):(
        <input value={service} onChange={e=>setService(e.target.value)} placeholder="ex: tresse, vidange, taxi…" style={{width:"100%",background:C.card,border:"1.5px solid #2A2A2A",borderRadius:14,padding:"14px 16px",color:C.white,fontFamily:"'DM Sans',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:20}}/>
      )}
      <label style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:8,display:"block"}}>Où ?</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
        {ZONES.map(z=>(
          <div key={z} onClick={()=>setZone(z)} style={{background:zone===z?"#1E2E25":"#141414",border:`1px solid ${zone===z?C.green:"#252525"}`,borderRadius:99,padding:"6px 14px",fontSize:12,color:zone===z?C.green:"#666",cursor:"pointer"}}>{z}</div>
        ))}
      </div>
      <label style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:8,display:"block"}}>Combien tu as payé ?</label>
      <div style={{position:"relative",marginBottom:12}}>
        <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="3000" type="number" min="1" style={{width:"100%",background:C.card,border:`1.5px solid ${C.green}`,borderRadius:14,padding:"14px 70px 14px 16px",color:C.green,fontFamily:"'Space Mono',monospace",fontSize:24,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
        <span style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:12,color:C.muted}}>FCFA</span>
      </div>
      {previewScore&&<div style={{marginBottom:20}}>
        <EmotionalMsg score={previewScore}/>
        {currentAvg>0&&<div style={{fontSize:12,color:C.muted,marginTop:6,padding:"0 4px"}}>Moyenne : <strong style={{color:C.white}}>{fmt(currentAvg)} FCFA</strong></div>}
      </div>}
      {can&&!previewScore&&<div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:10,padding:"8px 12px",marginBottom:20,fontSize:12,color:C.green}}>✓ {parseInt(price).toLocaleString("fr-CI")} FCFA · {zone}</div>}
      <GreenBtn onClick={()=>can&&onSubmit({service:normalizeService(service),zone,price:parseInt(price),type:mode,unit:mode==="produit"?unit:null,category:detectCategory(service)})} disabled={!can}>
        {saving?"⏳ Enregistrement…":"✓ Partager ce prix"}
      </GreenBtn>
      <div style={{textAlign:"center",fontSize:11,color:"#333",marginTop:12,lineHeight:1.6}}>Anonyme · Gratuit · Sauvegardé en temps réel</div>
    </div>
    <div style={{height:40}}></div>
  </div>;
}

// ─── CONFIRM VIRAL ────────────────────────────────────────────────────────────
function ConfirmScreen({submitted,onHome,totalCount,data}){
  const allPrices=useMemo(()=>data.filter(d=>(d.service||d.name)===submitted?.service).map(d=>d.price),[data,submitted]);
  const moy=avg(allPrices);
  const score=submitted&&moy?calcScore(submitted.price,allPrices):null;

  const viralMsg=useMemo(()=>{
    if(!submitted)return"";
    const base=`👉 https://combien-app.vercel.app`;
    if(!score||!moy)return`J'ai ajouté un prix sur Combien — compare les vrais prix à Abidjan ! ${base}`;
    return`${score.shock||"J'ai partagé un prix sur Combien."}\n\nVérifie les vrais prix à Abidjan 👇\n${base}`;
  },[submitted,score,moy]);

  const shareWA=()=>window.open(`https://wa.me/?text=${encodeURIComponent(viralMsg)}`,"_blank");
  const copyMsg=()=>{navigator.clipboard.writeText(viralMsg).then(()=>alert("Message copié !"));};

  const rankMsg=useMemo(()=>{
    if(!score||allPrices.length<3)return null;
    if(score.rank<=25)return`🏆 Tu fais partie des ${score.rank}% qui paient le moins cher !`;
    if(score.rank>=75)return`⚠️ ${100-score.rank}% des gens paient moins que toi dans cette zone.`;
    return`📊 Tu es dans la moyenne — ${score.rank}% des gens paient autant ou moins.`;
  },[score,allPrices]);

  return<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px",textAlign:"center",minHeight:"100vh"}}>
    <div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:99,padding:"4px 14px",fontSize:11,color:C.green,fontWeight:600,marginBottom:28,display:"inline-flex",alignItems:"center",gap:6}}>
      🔥 Tu aides {totalCount>1?`${totalCount} personnes`:"la communauté"} à ne pas se faire arnaquer
    </div>
    <div style={{width:90,height:90,background:`linear-gradient(135deg,${C.green},${C.greenDark})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,marginBottom:28,boxShadow:`0 16px 48px ${C.greenGlow}`}}>✓</div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,lineHeight:1.2,marginBottom:16}}>Merci<br/><span style={{color:C.green}}>vraiment.</span></div>

    {score&&<div style={{marginBottom:12,width:"100%"}}><EmotionalMsg score={score}/></div>}
    {rankMsg&&<div style={{fontSize:13,color:C.white,fontWeight:600,marginBottom:16,background:C.card,borderRadius:12,padding:"10px 16px",width:"100%"}}>{rankMsg}</div>}

    {submitted&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,marginBottom:20,width:"100%",textAlign:"left"}}>
      <div style={{fontSize:11,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.08em"}}>Ton message WhatsApp :</div>
      <div style={{fontSize:12,color:C.white,lineHeight:1.7,fontStyle:"italic",color:C.muted}}>{viralMsg.split("\n").map((l,i)=><div key={i}>{l}</div>)}</div>
    </div>}

    <div style={{width:"100%"}}>
      <div onClick={shareWA} style={{background:"#1A2E1A",border:"1.5px solid #2E4A2E",borderRadius:14,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",marginBottom:10}}>
        <span style={{fontSize:18}}>💬</span><span style={{fontSize:14,fontWeight:600,color:"#25D366"}}>Partager sur WhatsApp</span>
      </div>
      <div onClick={copyMsg} style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",marginBottom:16}}>
        <span style={{fontSize:18}}>🔗</span><span style={{fontSize:14,fontWeight:500}}>Copier le message</span>
      </div>
      <div onClick={onHome} style={{fontSize:12,color:"#333",cursor:"pointer",textDecoration:"underline"}}>Revenir à l'accueil</div>
    </div>
  </div>;
}

// ─── FAVORIS ──────────────────────────────────────────────────────────────────
function FavoritesScreen({favorites,onCardClick,onToggleFav,data}){
  const allP=useMemo(()=>data.map(d=>d.price),[data]);
  return<div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,padding:"48px 20px 16px"}}>❤️ Mes favoris</div>
    <div style={{padding:"0 20px"}}>
      {!favorites.length?<div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
        <div style={{fontSize:40,marginBottom:12}}>🤍</div>
        <div style={{fontSize:15,marginBottom:6,color:C.white}}>Aucun favori encore</div>
        <div style={{fontSize:13}}>Appuie sur 🤍 pour sauvegarder</div>
      </div>:favorites.map((f,i)=>(
        <PriceCard key={i} item={f} allPrices={allP} onPress={()=>onCardClick(f.service||f.name)} onFav={onToggleFav} isFav={true}/>
      ))}
    </div>
  </div>;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("home");
  const [screen,setScreen]=useState("home");
  const [query,setQuery]=useState("");
  const [submitted,setSubmitted]=useState(null);
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [favorites,setFavorites]=useState(loadFavs);
  const [prefill,setPrefill]=useState("");

  useEffect(()=>{
    const q=query_fb(collection(db,"prices"),orderBy("createdAt","desc"));
    const unsub=onSnapshot(q,(snapshot)=>{
      const docs=snapshot.docs.map(doc=>({
        id:doc.id,...doc.data(),
        time:doc.data().createdAt?.toDate?formatTime(doc.data().createdAt.toDate()):"Récemment",
        avatar:stableAvatar(doc.id),
      }));
      setData(docs);setLoading(false);
    });
    return()=>unsub();
  },[]);

  useEffect(()=>{
    const l=document.createElement("link");l.href=FONT_URL;l.rel="stylesheet";document.head.appendChild(l);
    document.body.style.margin="0";document.body.style.background=C.black;
  },[]);

  useEffect(()=>{saveFavs(favorites);},[favorites]);

  const goResults=useCallback(q=>{setQuery(q);setScreen("results");},[]);
  const goAdd=useCallback(pf=>{setPrefill(pf||"");setScreen("add");},[]);
  const goHome=useCallback(()=>{setScreen("home");setTab("home");},[]);

  const handleAdd=useCallback(async(entry)=>{
    if(!checkRateLimit()){alert("Tu as partagé trop de prix récemment. Réessaie dans 1h.");return;}
    setSaving(true);
    try{
      await addDoc(collection(db,"prices"),{
        service:entry.service,name:entry.service,
        zone:entry.zone,price:entry.price,
        type:entry.type||"service",unit:entry.unit||null,
        category:entry.category||detectCategory(entry.service),
        deviceId:getDeviceId(),
        createdAt:serverTimestamp(),
      });
      setSubmitted(entry);setScreen("confirm");
    }catch(err){alert("Erreur de connexion.");console.error(err);}
    finally{setSaving(false);}
  },[]);

  const toggleFav=useCallback(item=>{
    const key=favKey(item);
    setFavorites(prev=>prev.some(f=>favKey(f)===key)?prev.filter(f=>favKey(f)!==key):[...prev,item]);
  },[]);

  const NAV=[{id:"home",icon:"🏠",label:"Accueil"},{id:"map",icon:"🗺️",label:"Carte"},{id:"add",icon:"➕",label:"Ajouter"},{id:"fav",icon:"❤️",label:"Favoris"}];
  const isHome=screen==="home"||screen==="confirm";

  const renderScreen=()=>{
    if(screen==="results")return<ResultsScreen query={query} data={data} onBack={()=>setScreen("home")} onAdd={()=>goAdd(query)} favorites={favorites} onToggleFav={toggleFav}/>;
    if(screen==="add")return<AddScreen onBack={()=>setScreen(query?"results":"home")} onSubmit={handleAdd} prefill={prefill} saving={saving} data={data}/>;
    if(screen==="confirm")return<ConfirmScreen submitted={submitted} onHome={goHome} totalCount={data.length} data={data}/>;
    if(tab==="map")return<MapScreen onCardClick={goResults} data={data}/>;
    if(tab==="fav")return<FavoritesScreen favorites={favorites} data={data} onCardClick={goResults} onToggleFav={toggleFav}/>;
    return<HomeScreen data={data} loading={loading} favorites={favorites} onSearch={goResults} onCardClick={goResults} onToggleFav={toggleFav}/>;
  };

  return<div style={{background:C.black,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:C.white,maxWidth:430,margin:"0 auto",position:"relative",paddingBottom:80}}>
    {renderScreen()}
    {screen!=="confirm"&&<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#0D0D0D",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
      {NAV.map(item=>{
        const active=isHome&&tab===item.id;
        return<div key={item.id} onClick={()=>{item.id==="add"?goAdd():(setTab(item.id),setScreen("home"));}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 0 14px",cursor:"pointer"}}>
          <span style={{fontSize:20}}>{item.icon}</span>
          <span style={{fontSize:9,letterSpacing:"0.05em",color:active?C.green:"#444",fontWeight:active?600:400}}>{item.label}</span>
        </div>;
      })}
    </div>}
  </div>;
}
