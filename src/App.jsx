import { useState, useEffect } from "react";

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
  {id:1, name:"Salon Joëlle Beauty",  zone:"Cocody",   rating:4.8, reviews:124, price:"2 500 – 5 000",  emoji:"💇‍♀️"},
  {id:2, name:"Garage Kouassi Pro",   zone:"Yopougon", rating:4.6, reviews:89,  price:"5 000 – 15 000", emoji:"🔧"},
  {id:3, name:"Maquis Chez Martine",  zone:"Adjamé",   rating:4.9, reviews:203, price:"800 – 2 000",    emoji:"🍽️"},
  {id:4, name:"Transport Express CI", zone:"Plateau",  rating:4.5, reviews:67,  price:"1 000 – 3 000",  emoji:"🚕"},
];

const HISTORY = {
  "Tresse simple":          [{w:"S-4",p:2500},{w:"S-3",p:2700},{w:"S-2",p:2800},{w:"S-1",p:3000},{w:"Auj.",p:3000}],
  "Taxi Cocody → Plateau":  [{w:"S-4",p:1200},{w:"S-3",p:1300},{w:"S-2",p:1500},{w:"S-1",p:1500},{w:"Auj.",p:1500}],
  "Vidange voiture":        [{w:"S-4",p:7000},{w:"S-3",p:7500},{w:"S-2",p:8000},{w:"S-1",p:8000},{w:"Auj.",p:8000}],
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

const SEED = [
  {id:1,  service:"Tresse simple",          category:"coiffure",  zone:"Yopougon", price:3000,  time:"Aujourd'hui · 10h12", avatar:"👩🏾"},
  {id:2,  service:"Tresse simple",          category:"coiffure",  zone:"Yopougon", price:2500,  time:"Hier · 15h30",        avatar:"👩🏽"},
  {id:3,  service:"Tresse simple",          category:"coiffure",  zone:"Yopougon", price:4500,  time:"Il y a 2 jours",      avatar:"👨🏿"},
  {id:4,  service:"Tresse simple",          category:"coiffure",  zone:"Cocody",   price:5000,  time:"Hier · 09h00",        avatar:"👩🏾"},
  {id:5,  service:"Taxi Cocody → Plateau",  category:"transport", zone:"Cocody",   price:1500,  time:"Aujourd'hui · 08h45", avatar:"👨🏽"},
  {id:6,  service:"Taxi Cocody → Plateau",  category:"transport", zone:"Cocody",   price:2500,  time:"Hier · 17h00",        avatar:"👩🏿"},
  {id:7,  service:"Taxi Yopougon → Plateau",category:"transport", zone:"Yopougon", price:2500,  time:"Aujourd'hui · 07h30", avatar:"👨🏾"},
  {id:8,  service:"Vidange voiture",        category:"mecanique", zone:"Abobo",    price:8000,  time:"Il y a 3 jours",      avatar:"👨🏿"},
  {id:9,  service:"Vidange voiture",        category:"mecanique", zone:"Yopougon", price:12000, time:"Il y a 4 jours",      avatar:"👨🏽"},
  {id:10, service:"Attiéké poisson",        category:"maquis",    zone:"Adjamé",   price:1000,  time:"Aujourd'hui · 12h00", avatar:"👩🏾"},
  {id:11, service:"Attiéké poisson",        category:"maquis",    zone:"Yopougon", price:800,   time:"Hier · 13h00",        avatar:"👩🏽"},
  {id:12, service:"Consultation médecin",   category:"sante",     zone:"Cocody",   price:10000, time:"Il y a 2 jours",      avatar:"👨🏾"},
  {id:13, service:"Coupe homme",            category:"coiffure",  zone:"Marcory",  price:1000,  time:"Aujourd'hui · 09h00", avatar:"👨🏿"},
  {id:14, service:"Coupe homme",            category:"coiffure",  zone:"Abobo",    price:500,   time:"Hier",                avatar:"👨🏽"},
  {id:15, service:"Réparation pneu",        category:"mecanique", zone:"Adjamé",   price:2000,  time:"Aujourd'hui · 11h00", avatar:"👨🏾"},
];

const SUGGESTIONS = ["Tresse","Taxi","Vidange","Coupe homme","Attiéké","Pharmacie","Loyer","Mécanicien"];
const AVATARS = ["👩🏾","👨🏿","👩🏽","👨🏾"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;
const fmt = p => p.toLocaleString("fr-CI");
const calcJ = (price, prices) => {
  const a = avg(prices);
  if(!a) return "normal";
  if(price <= a*1.15) return "normal";
  if(price <= a*1.40) return "élevé";
  return "abusif";
};

function JBadge({j}){
  const M = {
    normal:{bg:"#1A2E1A",bo:"#2E4A2E",col:C.green, icon:"✓",label:"Juste"},
    élevé: {bg:"#2E2A1A",bo:"#4A3E2E",col:C.yellow,icon:"▲",label:"Élevé"},
    abusif:{bg:"#2E1A1A",bo:"#4A2E2E",col:C.red,   icon:"⚠",label:"Abusif"},
  };
  const s = M[j]||M.normal;
  return <span style={{background:s.bg,border:`1px solid ${s.bo}`,borderRadius:99,padding:"2px 8px",fontSize:10,color:s.col,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}}>{s.icon} {s.label}</span>;
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function BackBar({title,onBack,right}){
  return <div style={{display:"flex",alignItems:"center",gap:12,padding:"48px 20px 12px"}}>
    <div onClick={onBack} style={{width:36,height:36,background:"#1A1A1A",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16,flexShrink:0}}>←</div>
    <span style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,flex:1}}>{title}</span>
    {right}
  </div>;
}

function Pill({children,active,onClick}){
  return <div onClick={onClick} style={{background:active?"#1E2E25":"#141414",border:`1px solid ${active?C.green:"#252525"}`,borderRadius:99,padding:"6px 14px",fontSize:12,color:active?C.green:"#666",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>{children}</div>;
}

function GreenBtn({children,onClick,disabled}){
  return <div onClick={disabled?null:onClick} style={{background:C.green,color:"#000",fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,padding:"15px 20px",borderRadius:16,textAlign:"center",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.4:1,boxShadow:`0 8px 24px ${C.greenGlow}`}}>{children}</div>;
}

function PriceCard({item,allPrices,onPress,onFav,isFav}){
  const j = calcJ(item.price, allPrices);
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

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({data,favorites,onSearch,onCardClick,onToggleFav}){
  const [cat,setCat]=useState(null);
  const [q,setQ]=useState("");
  const favSvcs=favorites.map(f=>f.service);
  const displayed=data.filter(d=>!cat||d.category===cat).slice(0,6);
  const allP=data.map(d=>d.price);

  return <div>
    {/* Header */}
    <div style={{background:"linear-gradient(160deg,#001A0D 0%,#0A0A0A 65%)",padding:"48px 20px 24px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,letterSpacing:"-0.5px",display:"flex",alignItems:"center",gap:6}}>
          Combien<div style={{width:8,height:8,background:C.green,borderRadius:"50%",marginBottom:6}}></div>
        </div>
        <div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:99,padding:"4px 12px",fontSize:11,color:C.green,fontWeight:600}}>🔥 3 024 prix aujourd'hui</div>
      </div>
      <div style={{fontSize:13,color:"#666",marginBottom:20,lineHeight:1.5}}><strong style={{color:C.white}}>Tu sais avant de payer.</strong> Les vrais prix à Abidjan.</div>
      <form onSubmit={e=>{e.preventDefault();if(q.trim())onSearch(q.trim());}}>
        <div style={{background:"#1A1A1A",border:"1.5px solid #2A2A2A",borderRadius:16,padding:"13px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <span>🔍</span>
          <input style={{background:"transparent",border:"none",outline:"none",color:C.white,fontSize:15,fontFamily:"'DM Sans',sans-serif",flex:1}} placeholder="tresse, taxi, vidange…" value={q} onChange={e=>setQ(e.target.value)}/>
          {q&&<span onClick={()=>setQ("")} style={{cursor:"pointer",color:C.muted,fontSize:14}}>✕</span>}
        </div>
      </form>
    </div>

    {/* Suggestions */}
    <div style={{display:"flex",gap:8,padding:"14px 20px 0",overflowX:"auto",scrollbarWidth:"none"}}>
      {SUGGESTIONS.map(s=><Pill key={s} onClick={()=>onSearch(s)}>{s}</Pill>)}
    </div>

    {/* Catégories */}
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"18px 20px 10px"}}>Catégories</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,padding:"0 20px"}}>
      {CATEGORIES.map(c=><div key={c.id} onClick={()=>setCat(cat===c.id?null:c.id)} style={{background:cat===c.id?"#1A1A1A":"#141414",border:`1px solid ${cat===c.id?c.color:"#1E1E1E"}`,borderRadius:14,padding:"12px 4px",textAlign:"center",cursor:"pointer",transition:"all 0.15s"}}>
        <span style={{fontSize:20,display:"block",marginBottom:4}}>{c.emoji}</span>
        <span style={{fontSize:9,color:cat===c.id?c.color:"#666",fontWeight:600}}>{c.label}</span>
      </div>)}
    </div>

    {/* Liste tendances */}
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"18px 20px 10px"}}>{cat?"Résultats":"Tendances du jour"}</div>
    <div style={{padding:"0 20px"}}>
      {displayed.map((item,i)=><PriceCard key={i} item={item} allPrices={allP} onPress={()=>onCardClick(item.service)} onFav={onToggleFav} isFav={favSvcs.includes(item.service)}/>)}
    </div>

    {/* Commerçants vérifiés */}
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

// ─── RESULTS ──────────────────────────────────────────────────────────────────
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
  const scoreGlobal=calcJ(average,prices);

  if(!results.length) return <div>
    <BackBar title={query} onBack={onBack}/>
    <div style={{textAlign:"center",padding:"60px 20px",color:C.muted}}>
      <div style={{fontSize:40,marginBottom:12}}>🔍</div>
      <div style={{fontSize:15,marginBottom:8}}>Aucun prix encore</div>
      <div style={{fontSize:13,marginBottom:24}}>Sois le premier à partager !</div>
      <div style={{padding:"0 40px"}}><GreenBtn onClick={onAdd}>➕ Ajouter ce prix</GreenBtn></div>
    </div>
  </div>;

  return <div>
    <BackBar title={query} onBack={onBack} right={
      <span onClick={()=>onToggleFav({service:query,zone:"",price:average})} style={{fontSize:22,cursor:"pointer",opacity:isFav?1:0.3}}>{isFav?"❤️":"🤍"}</span>
    }/>

    {/* Hero */}
    <div style={{margin:"0 20px 16px",background:`linear-gradient(135deg,${C.green},${C.greenDark})`,borderRadius:24,padding:24,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,background:"rgba(255,255,255,0.07)",borderRadius:"50%"}}></div>
      <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"rgba(255,255,255,0.7)",marginBottom:4}}>Prix moyen</div>
      <div style={{fontFamily:"'Space Mono',monospace",fontSize:44,fontWeight:700,color:"#fff",lineHeight:1}}>{fmt(average)}</div>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:16}}>FCFA · {results.length} contribution{results.length>1?"s":""}</div>
      <div style={{display:"flex",gap:20}}>
        {[["Min",fmt(minP)],["Max",fmt(maxP)],["Score",scoreGlobal==="normal"?"✓ Juste":scoreGlobal==="élevé"?"▲ Élevé":"⚠ Abusif"]].map(([l,v])=><div key={l}>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.6)"}}>{l}</div>
          <div style={{fontFamily:"'Space Mono',monospace",fontSize:13,color:"#fff",fontWeight:700}}>{v}</div>
        </div>)}
      </div>
    </div>

    {/* Tabs */}
    <div style={{display:"flex",gap:8,padding:"0 20px 16px"}}>
      {["prix","historique","par zone"].map(t=><Pill key={t} active={tab===t} onClick={()=>setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</Pill>)}
    </div>

    {tab==="prix"&&<>
      <div style={{padding:"0 20px 12px"}}>
        <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600,marginBottom:10}}>Répartition des prix</div>
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
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",padding:"4px 20px 10px"}}>Prix récents</div>
      <div style={{padding:"0 20px"}}>
        {results.map(r=><div key={r.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:20}}>{r.avatar}</span>
            <div><div style={{fontSize:13,fontWeight:500}}>{r.zone}</div><div style={{fontSize:10,color:C.muted}}>{r.time}</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <JBadge j={calcJ(r.price,prices)}/>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:13,fontWeight:700,color:C.green}}>{fmt(r.price)}</span>
          </div>
        </div>)}
      </div>
    </>}

    {tab==="historique"&&<div style={{padding:"0 20px"}}>
      <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600,marginBottom:16}}>Évolution du prix</div>
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
          <div style={{display:"flex",gap:6}}>
            {histData.map((h,i)=><div key={i} style={{flex:1,textAlign:"center",fontSize:8,color:C.muted}}>{h.w}</div>)}
          </div>
        </div>
        <div style={{marginTop:12,background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>📈</span>
          <span style={{fontSize:13,color:C.green}}>Prix stable depuis 2 semaines</span>
        </div>
      </>:<div style={{textAlign:"center",color:C.muted,padding:"40px 0",fontSize:14}}>Historique en cours…</div>}
    </div>}

    {tab==="par zone"&&<div style={{padding:"0 20px"}}>
      <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600,marginBottom:12}}>Prix par quartier</div>
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

// ─── MAP ──────────────────────────────────────────────────────────────────────
function MapScreen({onCardClick}){
  const [sel,setSel]=useState(null);
  return <div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,padding:"48px 20px 4px"}}>🗺️ Carte des prix</div>
    <div style={{fontSize:13,color:C.muted,padding:"0 20px 12px"}}>Touche une zone pour explorer</div>
    <div style={{margin:"0 20px",background:C.card,border:`1px solid ${C.border}`,borderRadius:20,overflow:"hidden",position:"relative",height:290}}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,#0D1A0D,#0A120A)"}}>
        <svg width="100%" height="100%" style={{opacity:0.12}}>
          <defs><pattern id="g" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0L0 0 0 28" fill="none" stroke="#00C170" strokeWidth="0.5"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>
      </div>
      {HEATMAP.map(h=><div key={h.zone} onClick={()=>setSel(sel?.zone===h.zone?null:h)} style={{position:"absolute",top:`${h.top}%`,left:`${h.left}%`,transform:"translate(-50%,-50%)",cursor:"pointer",zIndex:2}}>
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
        <span style={{fontSize:13}}>{s}</span>
        <span style={{fontSize:12,color:C.green}}>Voir →</span>
      </div>)}
    </div>}

    <div style={{padding:"16px 20px 0"}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,letterSpacing:"0.15em",textTransform:"uppercase",color:"#444",marginBottom:12}}>Activité par zone</div>
      {[...HEATMAP].sort((a,b)=>b.count-a.count).map(h=><div key={h.zone} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
        <span style={{fontSize:13,width:95,flexShrink:0}}>📍 {h.zone}</span>
        <div style={{flex:1,height:5,background:"#1E1E1E",borderRadius:99}}><div style={{height:"100%",width:`${h.intensity*100}%`,background:C.green,borderRadius:99}}></div></div>
        <span style={{fontSize:11,color:C.muted,width:40,textAlign:"right"}}>{h.count.toLocaleString()}</span>
      </div>)}
    </div>
    <div style={{height:20}}></div>
  </div>;
}

// ─── ADD ──────────────────────────────────────────────────────────────────────
function AddScreen({onBack,onSubmit,prefill}){
  const [service,setService]=useState(prefill||"");
  const [zone,setZone]=useState("Yopougon");
  const [price,setPrice]=useState("");
  const can=service.trim()&&price&&parseInt(price)>0;

  return <div>
    <div style={{padding:"48px 20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div onClick={onBack} style={{width:36,height:36,background:"#1A1A1A",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:16}}>←</div>
      </div>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,lineHeight:1.2,marginBottom:6}}>Tu as payé<br/><span style={{color:C.green}}>combien ?</span></div>
      <div style={{fontSize:13,color:"#666"}}>3 secondes. Tu aides tout le monde.</div>
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
      <GreenBtn onClick={()=>can&&onSubmit({service,zone,price:parseInt(price)})} disabled={!can}>✓ Partager ce prix</GreenBtn>
      <div style={{textAlign:"center",fontSize:11,color:"#333",marginTop:12,lineHeight:1.6}}>Anonyme · Gratuit · Tu aides les gens de ton quartier</div>
    </div>
    <div style={{height:40}}></div>
  </div>;
}

// ─── CONFIRM ──────────────────────────────────────────────────────────────────
function ConfirmScreen({submitted,onHome}){
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px",textAlign:"center",minHeight:"100vh"}}>
    <div style={{background:"#1A2E1A",border:"1px solid #2E4A2E",borderRadius:99,padding:"4px 14px",fontSize:11,color:C.green,fontWeight:600,marginBottom:28,display:"inline-flex",alignItems:"center",gap:6}}>🔥 3 025 contributions aujourd'hui</div>
    <div style={{width:90,height:90,background:`linear-gradient(135deg,${C.green},${C.greenDark})`,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,marginBottom:28,boxShadow:`0 16px 48px ${C.greenGlow}`}}>✓</div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,lineHeight:1.2,marginBottom:12}}>Merci<br/><span style={{color:C.green}}>vraiment.</span></div>
    {submitted&&<div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:8}}>
      Tu viens de partager <strong style={{color:C.white}}>{submitted.service}</strong> à <strong style={{color:C.white}}>{submitted.price.toLocaleString("fr-CI")} FCFA</strong> à {submitted.zone}.
    </div>}
    <div style={{fontSize:14,color:C.muted,lineHeight:1.7,marginBottom:36,maxWidth:260}}>Quelqu'un dans ton quartier va éviter de se faire arnaquer grâce à toi.</div>
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

// ─── FAVORIS ──────────────────────────────────────────────────────────────────
function FavoritesScreen({favorites,onCardClick,onToggleFav,data}){
  const allP=data.map(d=>d.price);
  return <div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,padding:"48px 20px 16px"}}>❤️ Mes favoris</div>
    <div style={{padding:"0 20px"}}>
      {!favorites.length?<div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
        <div style={{fontSize:40,marginBottom:12}}>🤍</div>
        <div style={{fontSize:15,marginBottom:6}}>Aucun favori encore</div>
        <div style={{fontSize:13}}>Appuie sur 🤍 pour sauvegarder</div>
      </div>:favorites.map((f,i)=><PriceCard key={i} item={f} allPrices={allP} onPress={()=>onCardClick(f.service)} onFav={onToggleFav} isFav={true}/>)}
    </div>
  </div>;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const FONT_URL="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Syne:wght@700;800&family=Space+Mono:wght@400;700&display=swap";

export default function App(){
  const [tab,setTab]=useState("home");
  const [screen,setScreen]=useState("home");
  const [query,setQuery]=useState("");
  const [submitted,setSubmitted]=useState(null);
  const [data,setData]=useState(SEED);
  const [favorites,setFavorites]=useState([]);
  const [prefill,setPrefill]=useState("");

  useEffect(()=>{
    const l=document.createElement("link");
    l.href=FONT_URL;l.rel="stylesheet";document.head.appendChild(l);
    document.body.style.margin="0";
    document.body.style.background=C.black;
  },[]);

  const goResults=q=>{setQuery(q);setScreen("results");};
  const goAdd=pf=>{setPrefill(pf||"");setScreen("add");};
  const goHome=()=>{setScreen("home");setTab("home");};

  const handleAdd=entry=>{
    const related=data.filter(d=>d.service.toLowerCase()===entry.service.toLowerCase()).map(d=>d.price);
    setData(prev=>[{id:Date.now(),...entry,category:"autre",time:"À l'instant",avatar:AVATARS[Math.floor(Math.random()*4)],justesse:calcJ(entry.price,[...related,entry.price])},...prev]);
    setSubmitted(entry);
    setScreen("confirm");
  };

  const toggleFav=item=>setFavorites(prev=>prev.some(f=>f.service===item.service)?prev.filter(f=>f.service!==item.service):[...prev,item]);

  const NAV=[{id:"home",icon:"🏠",label:"Accueil"},{id:"map",icon:"🗺️",label:"Carte"},{id:"add",icon:"➕",label:"Ajouter"},{id:"fav",icon:"❤️",label:"Favoris"}];

  const renderScreen=()=>{
    if(screen==="results") return <ResultsScreen query={query} data={data} onBack={()=>{setScreen("home");}} onAdd={()=>goAdd(query)} favorites={favorites} onToggleFav={toggleFav}/>;
    if(screen==="add")     return <AddScreen onBack={()=>setScreen(query?"results":"home")} onSubmit={handleAdd} prefill={prefill}/>;
    if(screen==="confirm") return <ConfirmScreen submitted={submitted} onHome={goHome}/>;
    if(tab==="map")        return <MapScreen onCardClick={goResults}/>;
    if(tab==="fav")        return <FavoritesScreen favorites={favorites} data={data} onCardClick={goResults} onToggleFav={toggleFav}/>;
    return <HomeScreen data={data} favorites={favorites} onSearch={goResults} onCardClick={goResults} onToggleFav={toggleFav}/>;
  };

  const isHomeTab=screen==="home"||screen==="confirm";

  return <div style={{background:C.black,minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",color:C.white,maxWidth:430,margin:"0 auto",position:"relative",paddingBottom:80}}>
    {renderScreen()}
    {screen!=="confirm"&&<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#0D0D0D",borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100}}>
      {NAV.map(item=>{
        const active=isHomeTab&&tab===item.id;
        return <div key={item.id} onClick={()=>{item.id==="add"?goAdd():( setTab(item.id),setScreen("home"));}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 0 14px",cursor:"pointer"}}>
          <span style={{fontSize:20}}>{item.icon}</span>
          <span style={{fontSize:9,letterSpacing:"0.05em",color:active?C.green:"#444",fontWeight:active?600:400}}>{item.label}</span>
        </div>;
      })}
    </div>}
  </div>;
}
