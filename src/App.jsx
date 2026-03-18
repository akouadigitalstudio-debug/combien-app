import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query as query_fb,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const C = {
  green: "#00C170", greenDark: "#009955", greenGlow: "rgba(0,193,112,0.35)",
  black: "#0A0A0A", card: "#141414", border: "#1E1E1E",
  muted: "#555", white: "#FAFAFA", yellow: "#FFD600", red: "#FF4444",
};

const ZONES = ["Yopougon","Cocody","Abobo","Plateau","Adjamé","Marcory","Treichville","Koumassi","Riviera"];

const CATEGORIES = [
  {id:"coiffure",  emoji:"💇‍♀️", label:"Coiffure",    color:"#FF6B9D"},
  {id:"transport", emoji:"🚕",   label:"Transport",   color:"#FFB800"},
  {id:"mecanique", emoji:"🔧",   label:"Mécanique",   color:"#4ECDC4"},
  {id:"maquis",    emoji:"🍽️",  label:"Maquis",      color:"#FF6348"},
  {id:"sante",     emoji:"💊",   label:"Santé",       color:"#A29BFE"},
  {id:"loyer",     emoji:"🏠",   label:"Loyer",       color:"#74B9FF"},
  {id:"marche",    emoji:"🛒",   label:"Marché",      color:"#55EFC4"},
  {id:"electricite",emoji:"⚡",  label:"Électricité", color:"#FDCB6E"},
];

const BUSINESSES = [
  {id:1,name:"Salon Joëlle Beauty",  zone:"Cocody",   rating:4.8,reviews:124,price:"2 500 – 5 000",  emoji:"💇‍♀️"},
  {id:2,name:"Garage Kouassi Pro",   zone:"Yopougon", rating:4.6,reviews:89, price:"5 000 – 15 000", emoji:"🔧"},
  {id:3,name:"Maquis Chez Martine",  zone:"Adjamé",   rating:4.9,reviews:203,price:"800 – 2 000",    emoji:"🍽️"},
  {id:4,name:"Transport Express CI", zone:"Plateau",  rating:4.5,reviews:67, price:"1 000 – 3 000",  emoji:"🚕"},
];

const HISTORY = {
  "Tresse simple":         [{w:"S-4",p:2500},{w:"S-3",p:2700},{w:"S-2",p:2800},{w:"S-1",p:3000},{w:"Auj.",p:3000}],
  "Taxi Cocody → Plateau": [{w:"S-4",p:1200},{w:"S-3",p:1300},{w:"S-2",p:1500},{w:"S-1",p:1500},{w:"Auj.",p:1500}],
  "Vidange voiture":       [{w:"S-4",p:7000},{w:"S-3",p:7500},{w:"S-2",p:8000},{w:"S-1",p:8000},{w:"Auj.",p:8000}],
};

const HEATMAP = [
  {zone:"Yopougon",   top:58,left:14,intensity:0.9,count:1240},
  {zone:"Cocody",     top:30,left:68,intensity:0.7,count:890},
  {zone:"Abobo",      top:14,left:32,intensity:0.6,count:650},
  {zone:"Adjamé",     top:40,left:40,intensity:0.8,count:980},
  {zone:"Plateau",    top:48,left:52,intensity:0.5,count:430},
  {zone:"Marcory",    top:66,left:62,intensity:0.4,count:320},
  {zone:"Treichville",top:62,left:54,intensity:0.6,count:510},
  {zone:"Koumassi",   top:72,left:72,intensity:0.3,count:280},
];

const SUGGESTIONS = ["Tresse","Taxi","Vidange","Coupe homme","Attiéké","Pharmacie","Loyer","Mécanicien"];
const AVATARS = ["👩🏾","👨🏿","👩🏽","👨🏾"];

const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
const fmt = p => p.toLocaleString("fr-CI");
const calcJ = (price, prices) => {
  const a = avg(prices);
  if(!a) return "normal";
  if(price <= a*1.15) return "normal";
  if(price <= a*1.40) return "élevé";
  return "abusif";
};

function formatTime(date){
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if(diff < 60) return "À l'instant";
  if(diff < 3600) return `Il y a ${Math.floor(diff/60)} min`;
  if(diff < 86400) return `Aujourd'hui · ${date.getHours()}h${String(date.getMinutes()).padStart(2,"0")}`;
  return "Hier";
}

function JBadge({j}){
  const M = {
    normal:{bg:"rgba(0,193,112,0.1)",bo:"rgba(0,193,112,0.3)",col:C.green, icon:"✓",l:"Juste"},
    élevé: {bg:"rgba(255,211,42,0.1)",bo:"rgba(255,211,42,0.3)",col:C.yellow,icon:"▲",l:"Élevé"},
    abusif:{bg:"rgba(255,68,68,0.1)", bo:"rgba(255,68,68,0.3)", col:C.red,  icon:"⚠",l:"Abusif"},
  };
  const s=M[j]||M.normal;
  return <span style={{background:s.bg,border:`1px solid ${s.bo}`,borderRadius:6,padding:"2px 8px",fontSize:10,color:s.col,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}}>{s.icon} {s.l}</span>;
}

function Pill({children,active,onClick}){
  return <div onClick={onClick} style={{background:active?"#1E2E25":"#141414",border:`1px solid ${active?C.green:"#252525"}`,borderRadius:99,padding:"6px 14px",fontSize:12,color:active?C.green:"#666",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{children}</div>;
}

function GreenBtn({children,onClick,disabled}){
  return <div onClick={disabled?null:onClick} style={{background:C.green,color:"#000",fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,padding:"15px 20px",borderRadius:16,textAlign:"center",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,boxShadow:`0 8px 24px ${C.greenGlow}`}}>{children}</div>;
}

function BackBtn({onClick}){
  return <div onClick={onClick} style={{width:36,height:36,background:"#1A1A1A",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,flexShrink:0}}>←</div>;
}

function PriceCard({item,allPrices,onPress,onFav,isFav}){
  const j=calcJ(item.price,allPrices);
  return <div onClick={onPress} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,cursor:"pointer"}}>
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      <span style={{fontSize:14,fontWeight:500}}>{item.service}</span>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:11,color:C.muted}}>📍 {item.zone}</span>
        <JBadge j={j}/>
      </div>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,color:C.green}}>{fmt(item.price)}</span>
      {onFav&&<span onClick={e=>{e.stopPropagation();onFav(item);}} style={{fontSize:18,cursor:"pointer",opacity:isFav?1:0.3}}>{isFav?"❤️":"🤍"}</span>}
    </div>
  </div>;
}

function HomeScreen({data,loading,favorites,onSearch,onCardClick,onToggleFav}){
  const [cat,setCat]=useState(null);
  const [q,setQ]=useState("");
  const favSvcs=favorites.map(f=>f.service);
  const displayed=data.filter(d=>!cat||d.category===cat).slice(0,8);
  const allP=data.map(d=>d.price);

  return <div>
    <div style={{background:"linear-gradient(160deg,#001A0D 0%,#0A0A0A 65%)",padding:"48px 20px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,letterSpacing:"-0.5px",display:"flex",alignItems:"center",gap:6}}>
          Combien<div style={{width:8,height:8,background:C.green,borderRadius:"50%",marginBottom:6}}></div>
        </div>
        <div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:99,padding:"4px 12px",fontSize:11,color:C.green,fontWeight:600}}>
          🔥 {data.length} prix réels
        </div>
      </div>
      <div style={{fontSize:13,color:"#666",marginBottom:20,lineHeight:1.5}}><strong style={{color:C.white}}>Tu sais avant de payer.</strong> Les vrais prix à Abidjan.</div>
      <form onSubmit={e=>{e.preventDefault();if(q.trim())onSearch(q.trim());}}>
        <div style={{background:"#1A1A1A",border:"1.5px solid #2A2A2A",borderRadius:16,padding:"13px 16px",display:"flex",alignItems:"center",gap:10}}>
          <span>🔍</span>
          <input style={{background:"transparent",border:"none",outline:"none",color:C.white,fontSize:15,fontFamily:"'DM Sans',sans-serif",flex:1}} placeholder="tresse, taxi, vidange…" value={q} onChange={e=>setQ(e.target.value)}/>
          {q&&<span onClick={()=>setQ("")} style={{cursor:"pointer",color:C.muted,fontSize:14}}>✕</span>}
        </div>
      </form>
    </div>

    <div style={{display:"flex",gap:8,padding:"14px 20px 0",overflowX:"auto",scrollbarWidth:"none"}}>
      {SUGGESTIONS.map(s=><Pill key={s} onClick={()=>onSearch(s)}>{s}</Pill>)}
    </div>

    <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"18px 20px 10px"}}>Catégories</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,padding:"0 20px"}}>
      {CATEGORIES.map(c=><div key={c.id} onClick={()=>setCat(cat===c.id?null:c.id)} style={{background:cat===c.id?"#1A1A1A":"#141414",border:`1px solid ${cat===c.id?c.color:"#1E1E1E"}`,borderRadius:14,padding:"12px 4px",textAlign:"center",cursor:"pointer"}}>
        <span style={{fontSize:20,display:"block",marginBottom:4}}>{c.emoji}</span>
        <span style={{fontSize:9,color:cat===c.id?c.color:"#666",fontWeight:600}}>{c.label}</span>
      </div>)}
    </div>

    <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"18px 20px 10px"}}>
      {loading?"Chargement…":cat?"Résultats":"Prix récents"}
    </div>
    <div style={{padding:"0 20px"}}>
      {loading?<div style={{textAlign:"center",padding:"40px 0",color:C.muted}}>
        <div style={{fontSize:24,marginBottom:8}}>⏳</div>
        <div style={{fontSize:13}}>Connexion à la base de données…</div>
      </div>:displayed.length===0?<div style={{textAlign:"center",padding:"40px 0",color:C.muted,fontSize:13}}>
        Aucun prix encore — sois le premier !
      </div>:displayed.map((item,i)=><PriceCard key={item.id||i} item={item} allPrices={allP} onPress={()=>onCardClick(item.service)} onFav={onToggleFav} isFav={favSvcs.includes(item.service)}/>)}
    </div>

    <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"18px 20px 10px"}}>⭐ Commerçants vérifiés</div>
    <div style={{display:"flex",gap:12,padding:"0 20px 20px",overflowX:"auto",scrollbarWidth:"none"}}>
      {BUSINESSES.map(b=><div key={b.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:14,minWidth:175,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:22}}>{b.emoji}</span>
          <div><div style={{fontSize:12,fontWeight:600,lineHeight:1.3}}>{b.name}</div><div style={{fontSize:10,color:C.muted}}>📍 {b.zone}</div></div>
        </div>
        <div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:99,padding:"2px 8px",fontSize:10,color:C.green,fontWeight:700,display:"inline-block",marginBottom:6}}>✓ Prix fiable</div>
        <div style={{fontSize:11,color:"#888"}}>⭐ {b.rating} · {b.reviews} avis</div>
        <div style={{fontFamily:"'Space Mono',monospace",fontSize:11,color:C.green,marginTop:4}}>{b.price} FCFA</div>
      </div>)}
    </div>
  </div>;
}

function ResultsScreen({query,data,onBack,onAdd,favorites,onToggleFav}){
  const [tab,setTab]=useState("prix");
  const results=data.filter(d=>d.service.toLowerCase().includes(query.toLowerCase()));
  const prices=results.map(r=>r.price);
  const average=avg(prices);
  const minP=prices.length?Math.min(...prices):0;
  const maxP=prices.length?Math.max(...prices):0;
  const isFav=favorites.some(f=>f.service===query);
  const histData=HISTORY[results[0]?.service]||null;
  const histMax=histData?Math.max(...histData.map(h=>h.p)):1;
  const buckets={};
  prices.forEach(p=>{const b=Math.round(p/500)*500;buckets[b]=(buckets[b]||0)+1;});
  const maxCnt=Math.max(...Object.values(buckets),1);
  const byZone=results.reduce((acc,r)=>{if(!acc[r.zone])acc[r.zone]=[];acc[r.zone].push(r.price);return acc;},{});
  const scoreG=calcJ(average,prices);

  if(!results.length) return <div>
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"48px 20px 16px"}}>
      <BackBtn onClick={onBack}/>
      <span style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800}}>{query}</span>
    </div>
    <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>🔍</div>
      <div style={{fontSize:15,marginBottom:8,color:C.white}}>Aucun prix encore</div>
      <div style={{fontSize:13,marginBottom:24}}>Sois le premier à partager !</div>
      <div style={{padding:"0 40px"}}><GreenBtn onClick={onAdd}>➕ Ajouter ce prix</GreenBtn></div>
    </div>
  </div>;

  return <div>
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"48px 20px 12px"}}>
      <BackBtn onClick={onBack}/>
      <span style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,flex:1}}>{query}</span>
      <span onClick={()=>onToggleFav({service:query,zone:"",price:average})} style={{fontSize:22,cursor:"pointer",opacity:isFav?1:0.3}}>{isFav?"❤️":"🤍"}</span>
    </div>

    <div style={{margin:"0 20px 16px",background:`linear-gradient(135deg,${C.green},${C.greenDark})`,borderRadius:24,padding:24,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,background:"rgba(255,255,255,0.07)",borderRadius:"50%"}}></div>
      <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",marginBottom:4}}>Prix moyen · {results.length} contribution{results.length>1?"s":""}</div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:44,fontWeight:700,color:"#fff",lineHeight:1}}>{fmt(average)}</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:16}}>FCFA</div>
      <div style={{display:"flex",gap:20}}>
        {[["Min",fmt(minP)],["Max",fmt(maxP)],["Score",scoreG==="normal"?"✓ Juste":scoreG==="élevé"?"▲ Élevé":"⚠ Abusif"]].map(([l,v])=>
          <div key={l}><div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>{l}</div><div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"#fff",fontWeight:700}}>{v}</div></div>
        )}
      </div>
    </div>

    <div style={{display:"flex",gap:8,padding:"0 20px 16px"}}>
      {["prix","historique","par zone"].map(t=><Pill key={t} active={tab===t} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</Pill>)}
    </div>

    {tab==="prix"&&<>
      <div style={{padding:"0 20px 12px"}}>
        <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600,marginBottom:10}}>Répartition</div>
        {Object.entries(buckets).sort((a,b)=>+a[0]-+b[0]).map(([b,cnt])=>{
          const col=+b<=average*0.95?C.green:+b>=average*1.3?C.red:C.yellow;
          return <div key={b} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
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
        {results.map(r=><div key={r.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{r.avatar||"👤"}</span>
            <div><div style={{fontSize:13,fontWeight:500}}>{r.zone}</div><div style={{fontSize:10,color:C.muted}}>{r.time||"Récemment"}</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <JBadge j={calcJ(r.price,prices)}/>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:C.green}}>{fmt(r.price)}</span>
          </div>
        </div>)}
      </div>
    </>}

    {tab==="historique"&&<div style={{padding:"0 20px"}}>
      {histData?<>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:120,marginBottom:12}}>
            {histData.map((h,i)=>{
              const isL=i===histData.length-1;
              const ht=Math.round((h.p/histMax)*100);
              return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <span style={{fontSize:8,color:isL?C.green:C.muted,fontWeight:isL?700:400}}>{fmt(h.p)}</span>
                <div style={{width:"100%",height:`${ht}%`,background:isL?C.green:"#252525",borderRadius:"6px 6px 0 0",minHeight:4}}></div>
              </div>;
            })}
          </div>
          <div style={{display:"flex",gap:6}}>{histData.map((h,i)=><div key={i} style={{flex:1,textAlign:"center",fontSize:8,color:C.muted}}>{h.w}</div>)}</div>
        </div>
        <div style={{marginTop:10,background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span>📈</span><span style={{fontSize:13,color:C.green}}>Prix stable depuis 2 semaines</span>
        </div>
      </>:<div style={{textAlign:"center",color:C.muted,padding:"40px 0"}}>Historique en constitution…</div>}
    </div>}

    {tab==="par zone"&&<div style={{padding:"0 20px"}}>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16}}>
        {Object.entries(byZone).map(([zone,zp])=>{
          const a=avg(zp);
          const pct=Math.min(Math.round((a/(maxP||1))*100),100);
          return <div key={zone} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:13}}>📍 {zone}</span>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:12,color:C.green}}>{fmt(a)} FCFA</span>
            </div>
            <div style={{height:4,background:"#1E1E1E",borderRadius:99}}>
              <div style={{height:"100%",width:`${pct}%`,background:C.green,borderRadius:99}}></div>
            </div>
          </div>;
        })}
      </div>
    </div>}

    <div style={{height:100}}></div>
    <div onClick={onAdd} style={{position:"fixed",bottom:80,right:20,background:C.green,color:"#000",fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,padding:"12px 20px",borderRadius:99,display:"flex",alignItems:"center",gap:6,boxShadow:`0 8px 24px ${C.greenGlow}`,cursor:"pointer",zIndex:50}}>➕ Ajouter mon prix</div>
  </div>;
}

function MapScreen({onCardClick,data}){
  const [sel,setSel]=useState(null);
  const liveHM=HEATMAP.map(h=>({...h,count:h.count+data.filter(d=>d.zone===h.zone).length}));
  return <div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,padding:"48px 20px 4px"}}>🗺️ Carte des prix</div>
    <div style={{fontSize:13,color:C.muted,padding:"0 20px 12px"}}>Touche une zone pour explorer</div>
    <div style={{margin:"0 20px",background:"linear-gradient(135deg,#0D1A0D,#0A120A)",border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",position:"relative",height:290}}>
      <div style={{position:"absolute",inset:0}}>
        <svg width="100%" height="100%" style={{opacity:0.12}}>
          <defs><pattern id="g" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0L0 0 0 28" fill="none" stroke="#00C170" strokeWidth="0.5"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>
      </div>
      {liveHM.map(h=><div key={h.zone} onClick={()=>setSel(sel?.zone===h.zone?null:h)} style={{position:"absolute",top:`${h.top}%`,left:`${h.left}%`,transform:"translate(-50%,-50%)",cursor:"pointer",zIndex:2}}>
        <div style={{position:"absolute",width:54*h.intensity,height:54*h.intensity,background:C.green,borderRadius:"50%",opacity:h.intensity*0.2,top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}></div>
        <div style={{position:"relative",width:32,height:32,background:sel?.zone===h.zone?"#fff":C.green,border:`2px solid ${C.green}`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:sel?.zone===h.zone?C.green:"#000",boxShadow:`0 4px 14px ${C.greenGlow}`,transition:"all 0.2s"}}>
          {h.count>999?"1k+":h.count}
        </div>
      </div>)}
    </div>
    {sel&&<div style={{margin:"12px 20px 0",background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:16,padding:16}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,marginBottom:6}}>📍 {sel.zone}</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:12}}>{sel.count.toLocaleString()} contributions</div>
      {["Tresse simple","Taxi Cocody → Plateau","Vidange voiture"].map(s=><div key={s} onClick={()=>onCardClick(s)} style={{background:"rgba(0,193,112,0.08)",borderRadius:10,padding:"8px 12px",marginBottom:6,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13}}>{s}</span><span style={{fontSize:12,color:C.green}}>Voir →</span>
      </div>)}
    </div>}
    <div style={{padding:"16px 20px 0"}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",marginBottom:12}}>Activité par zone</div>
      {[...liveHM].sort((a,b)=>b.count-a.count).map(h=><div key={h.zone} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
        <span style={{fontSize:13,width:95,flexShrink:0}}>📍 {h.zone}</span>
        <div style={{flex:1,height:5,background:"#1E1E1E",borderRadius:99}}><div style={{height:"100%",width:`${h.intensity*100}%`,background:C.green,borderRadius:99}}></div></div>
        <span style={{fontSize:11,color:C.muted,width:40,textAlign:"right"}}>{h.count.toLocaleString()}</span>
      </div>)}
    </div>
    <div style={{height:20}}></div>
  </div>;
}

function AddScreen({onBack,onSubmit,prefill,saving}){
  const [service,setService]=useState(prefill||"");
  const [zone,setZone]=useState("Yopougon");
  const [price,setPrice]=useState("");
  const can=service.trim()&&price&&parseInt(price)>0&&!saving;
  return <div>
    <div style={{padding:"48px 20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><BackBtn onClick={onBack}/></div>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,lineHeight:1.2,marginBottom:6}}>Tu as payé<br/><span style={{color:C.green}}>combien ?</span></div>
      <div style={{fontSize:13,color:"#666"}}>3 secondes. Sauvegardé en temps réel.</div>
    </div>
    <div style={{padding:"0 20px"}}>
      <label style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:8,display:"block"}}>C'était quoi ?</label>
      <input value={service} onChange={e=>setService(e.target.value)} placeholder="ex: tresse, vidange, taxi…" style={{width:"100%",background:C.card,border:"1.5px solid #2A2A2A",borderRadius:14,padding:"14px 16px",color:C.white,fontFamily:"'DM Sans',sans-serif",fontSize:15,outline:"none",boxSizing:"border-box",marginBottom:20}}/>
      <label style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:8,display:"block"}}>Où ?</label>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
        {ZONES.map(z=><Pill key={z} active={zone===z} onClick={()=>setZone(z)}>{z}</Pill>)}
      </div>
      <label style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:C.muted,marginBottom:8,display:"block"}}>Combien tu as payé ?</label>
      <div style={{position:"relative",marginBottom:12}}>
        <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="3000" type="number" min="1" style={{width:"100%",background:C.card,border:`1.5px solid ${C.green}`,borderRadius:14,padding:"14px 70px 14px 16px",color:C.green,fontFamily:"'Space Mono',monospace",fontSize:24,fontWeight:700,outline:"none",boxSizing:"border-box"}}/>
        <span style={{position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",fontSize:12,color:C.muted}}>FCFA</span>
      </div>
      {can&&<div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:10,padding:"8px 12px",marginBottom:20,fontSize:12,color:C.green}}>✓ {parseInt(price).toLocaleString("fr-CI")} FCFA · {zone}</div>}
      <GreenBtn onClick={()=>can&&onSubmit({service,zone,price:parseInt(price)})} disabled={!can}>
        {saving?"⏳ Enregistrement…":"✓ Partager ce prix"}
      </GreenBtn>
      <div style={{textAlign:"center",fontSize:11,color:"#333",marginTop:12,lineHeight:1.6}}>Anonyme · Gratuit · Sauvegardé en temps réel</div>
    </div>
    <div style={{height:40}}></div>
  </div>;
}

function ConfirmScreen({submitted,onHome,totalCount}){
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px",textAlign:"center",minHeight:"100vh"}}>
    <div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:99,padding:"4px 14px",fontSize:11,color:C.green,fontWeight:600,marginBottom:28,display:"inline-flex",alignItems:"center",gap:6}}>🔥 {totalCount} contributions au total</div>
    <div style={{width:90,height:90,background:`linear-gradient(135deg,${C.green},${C.greenDark})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,marginBottom:28,boxShadow:`0 16px 48px ${C.greenGlow}`}}>✓</div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,lineHeight:1.2,marginBottom:12}}>Merci<br/><span style={{color:C.green}}>vraiment.</span></div>
    {submitted&&<div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:8}}>
      <strong style={{color:C.white}}>{submitted.service}</strong> · <strong style={{color:C.white}}>{submitted.price.toLocaleString("fr-CI")} FCFA</strong> · {submitted.zone}
    </div>}
    <div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:36,maxWidth:260}}>Prix sauvegardé pour de vrai. Merci de contribuer à la transparence des prix.</div>
    <div style={{width:"100%"}}>
      <div style={{background:"#1A2E1A",border:"1.5px solid #2E4A2E",borderRadius:14,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",marginBottom:10}}>
        <span style={{fontSize:18}}>💬</span><span style={{fontSize:14,fontWeight:500,color:"#25D366"}}>Partager sur WhatsApp</span>
      </div>
      <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",marginBottom:16}}>
        <span style={{fontSize:18}}>🔗</span><span style={{fontSize:14,fontWeight:500}}>Copier le lien</span>
      </div>
      <div onClick={onHome} style={{fontSize:12,color:"#333",cursor:"pointer",textDecoration:"underline"}}>Revenir à l'accueil</div>
    </div>
  </div>;
}

function FavoritesScreen({favorites,onCardClick,onToggleFav,data}){
  const allP=data.map(d=>d.price);
  return <div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,padding:"48px 20px 16px"}}>❤️ Mes favoris</div>
    <div style={{padding:"0 20px"}}>
      {!favorites.length?<div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
        <div style={{fontSize:40,marginBottom:12}}>🤍</div>
        <div style={{fontSize:15,marginBottom:6,color:C.white}}>Aucun favori encore</div>
        <div style={{fontSize:13}}>Appuie sur 🤍 pour sauvegarder</div>
      </div>:favorites.map((f,i)=><PriceCard key={i} item={f} allPrices={allP} onPress={()=>onCardClick(f.service)} onFav={onToggleFav} isFav={true}/>)}
    </div>
  </div>;
}

const FONT_URL="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Syne:wght@700;800&family=Space+Mono:wght@400;700&display=swap";

export default function App(){
  const [tab,setTab]=useState("home");
  const [screen,setScreen]=useState("home");
  const [query,setQuery]=useState("");
  const [submitted,setSubmitted]=useState(null);
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [favorites,setFavorites]=useState([]);
  const [prefill,setPrefill]=useState("");

  useEffect(()=>{
    const q=query_fb(collection(db,"prices"),orderBy("createdAt","desc"));
    const unsub=onSnapshot(q,(snapshot)=>{
      const docs=snapshot.docs.map(doc=>({
        id:doc.id,
        ...doc.data(),
        time:doc.data().createdAt?.toDate?formatTime(doc.data().createdAt.toDate()):"Récemment",
        avatar:AVATARS[Math.floor(Math.random()*AVATARS.length)],
      }));
      setData(docs);
      setLoading(false);
    });
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    const l=document.createElement("link");
    l.href=FONT_URL;l.rel="stylesheet";document.head.appendChild(l);
    document.body.style.margin="0";
    document.body.style.background=C.black;
  },[]);

  const goResults=q=>{setQuery(q);setScreen("results");};
  const goAdd=pf=>{setPrefill(pf||"");setScreen("add");};
  const goHome=()=>{setScreen("home");setTab("home");};

  const handleAdd=async(entry)=>{
    setSaving(true);
    try{
      await addDoc(collection(db,"prices"),{
        service:entry.service,
        zone:entry.zone,
        price:entry.price,
        createdAt:serverTimestamp(),
      });
      setSubmitted(entry);
      setScreen("confirm");
    }catch(err){
      alert("Erreur de connexion. Vérifie ta connexion internet.");
      console.error(err);
    }finally{
      setSaving(false);
    }
  };

  const toggleFav=item=>setFavorites(prev=>prev.some(f=>f.service===item.service)?prev.filter(f=>f.service!==item.service):[...prev,item]);

  const NAV=[{id:"home",icon:"🏠",label:"Accueil"},{id:"map",icon:"🗺️",label:"Carte"},{id:"add",icon:"➕",label:"Ajouter"},{id:"fav",icon:"❤️",label:"Favoris"}];
  const isHome=screen==="home"||screen==="confirm";

  const renderScreen=()=>{
    if(screen==="results") return <ResultsScreen query={query} data={data} onBack={()=>setScreen("home")} onAdd={()=>goAdd(query)} favorites={favorites} onToggleFav={toggleFav}/>;
    if(screen==="add")     return <AddScreen onBack={()=>setScreen(query?"results":"home")} onSubmit={handleAdd} prefill={prefill} saving={saving}/>;
    if(screen==="confirm") return <ConfirmScreen submitted={submitted} onHome={goHome} totalCount={data.length}/>;
    if(tab==="map")        return <MapScreen onCardClick={goResults} data={data}/>;
    if(tab==="fav")        return <FavoritesScreen favorites={favorites} data={data} onCardClick={goResults} onToggleFav={toggleFav}/>;
    return <HomeScreen data={data} loading={loading} favorites={favorites} onSearch={goResults} onCardClick={goResults} onToggleFav={toggleFav}/>;
  };

  return <div style={{background:C.black,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:C.white,maxWidth:430,margin:"0 auto",position:"relative",paddingBottom:80}}>
    {renderScreen()}
    {screen!=="confirm"&&<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#0D0D0D",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
      {NAV.map(item=>{
        const active=isHome&&tab===item.id;
        return <div key={item.id} onClick={()=>{item.id==="add"?goAdd():(setTab(item.id),setScreen("home"));}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 0 14px",cursor:"pointer"}}>
          <span style={{fontSize:20}}>{item.icon}</span>
          <span style={{fontSize:9,letterSpacing:"0.05em",color:active?C.green:"#444",fontWeight:active?600:400}}>{item.label}</span>
        </div>;
      })}
    </div>}
  </div>;
}
