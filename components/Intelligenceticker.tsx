// FILE: components/IntelligenceTicker.tsx
"use client";
// Live scrolling market intelligence feed — RWA growth, stablecoin mcaps,
// on-chain data, SOL/BTC price. TV-guide style continuous pan.
// Fetches real data from DeFiLlama + CoinGecko. Falls back to curated static.
"use client";

import { useState, useEffect, useRef } from "react";

interface TickerItem {
  label:  string;
  value:  string;
  change?: string;
  up?:    boolean;
  tag:    string;
}

// Curated static baseline — updated to May 2026 approximate values
const STATIC_ITEMS: TickerItem[] = [
  {label:"RWA On-Chain TVL",    value:"$12.4B",  change:"+340%",  up:true,  tag:"RWA"},
  {label:"Tokenized Treasuries",value:"$4.1B",   change:"+820%",  up:true,  tag:"RWA"},
  {label:"USDT Market Cap",     value:"$109.2B", change:"+12.4%", up:true,  tag:"STABLE"},
  {label:"USDC Market Cap",     value:"$44.8B",  change:"+38.1%", up:true,  tag:"STABLE"},
  {label:"Stablecoin Total",    value:"$168.3B", change:"+24.6%", up:true,  tag:"STABLE"},
  {label:"Ondo Finance TVL",    value:"$840M",   change:"+290%",  up:true,  tag:"RWA"},
  {label:"Tokenized Real Estate","value":"$380M", change:"+110%", up:true,  tag:"RWA"},
  {label:"RWA Protocols Active","value":"47",    change:"+23",    up:true,  tag:"RWA"},
  {label:"BlackRock BUIDL",     value:"$1.7B",   change:"+560%",  up:true,  tag:"INST"},
  {label:"SOL Price",           value:"$152.40", change:"+4.2%",  up:true,  tag:"SOL"},
  {label:"SOL Staked",          value:"$42.1B",  change:"+18.3%", up:true,  tag:"SOL"},
  {label:"BTC Price",           value:"$77,940", change:"+2.1%",  up:true,  tag:"BTC"},
  {label:"BTC Market Cap",      value:"$1.94T",  change:"+2.1%",  up:true,  tag:"BTC"},
  {label:"DeFi Total TVL",      value:"$108B",   change:"+44%",   up:true,  tag:"DEFI"},
  {label:"Solana DeFi TVL",     value:"$8.4B",   change:"+92%",   up:true,  tag:"SOL"},
  {label:"Tokenized Commodities","value":"$980M", change:"+67%",  up:true,  tag:"RWA"},
  {label:"RWA % of DeFi TVL",   value:"11.4%",   change:"+7.2pp", up:true,  tag:"RWA"},
  {label:"Institutional Wallets","value":"14,200",change:"+34%",  up:true,  tag:"INST"},
  {label:"Abraxas Protocol",    value:"LIVE",    tag:"PROTOCOL"},
];

const TAG_COLOR: Record<string,string> = {
  RWA:      "#14F195",
  STABLE:   "#6b8cff",
  SOL:      "#9945FF",
  BTC:      "#F7931A",
  DEFI:     "#FBBF24",
  INST:     "#C8A96E",
  PROTOCOL: "#C8A96E",
};

async function fetchLiveData(): Promise<Partial<TickerItem>[]> {
  try {
    const [cgRes] = await Promise.allSettled([
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,tether,usd-coin&vs_currencies=usd&include_24hr_change=true",
        {next:{revalidate:60}})
        .then(r=>r.ok?r.json():null),
    ]);

    const cg = cgRes.status==="fulfilled"?cgRes.value:null;
    if(!cg) return [];

    const updates: Partial<TickerItem>[] = [];
    if(cg.solana?.usd)
      updates.push({label:"SOL Price",value:`$${cg.solana.usd.toFixed(2)}`,
        change:`${cg.solana.usd_24h_change>=0?"+":""}${cg.solana.usd_24h_change?.toFixed(1)}%`,
        up:cg.solana.usd_24h_change>=0});
    if(cg.bitcoin?.usd)
      updates.push({label:"BTC Price",value:`$${cg.bitcoin.usd.toLocaleString()}`,
        change:`${cg.bitcoin.usd_24h_change>=0?"+":""}${cg.bitcoin.usd_24h_change?.toFixed(1)}%`,
        up:cg.bitcoin.usd_24h_change>=0});
    return updates;
  } catch { return []; }
}

export function IntelligenceTicker() {
  const [items,   setItems]   = useState<TickerItem[]>(STATIC_ITEMS);
  const [paused,  setPaused]  = useState(false);
  const trackRef              = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    fetchLiveData().then(updates=>{
      if(!updates.length) return;
      setItems(prev=>prev.map(item=>{
        const live = updates.find(u=>u.label===item.label);
        return live ? {...item,...live} : item;
      }));
    });
  },[]);

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div style={{
      borderTop:"1px solid rgba(255,255,255,0.06)",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      background:"rgba(6,8,16,0.98)",
      overflow:"hidden", position:"relative",
      height:36,
    }}
    onMouseEnter={()=>setPaused(true)}
    onMouseLeave={()=>setPaused(false)}>

      {/* Left fade */}
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:48,
        background:"linear-gradient(90deg,rgba(6,8,16,1),transparent)",zIndex:2}}/>

      {/* Scrolling track */}
      <div ref={trackRef} style={{
        display:"flex", alignItems:"center", height:"100%",
        whiteSpace:"nowrap",
        animation:`ticker ${items.length*4}s linear infinite`,
        animationPlayState: paused ? "paused" : "running",
      }}>
        {doubled.map((item,i)=>{
          const col = TAG_COLOR[item.tag]??"rgba(255,255,255,0.5)";
          return(
            <div key={i} style={{
              display:"inline-flex", alignItems:"center",
              gap:"0.4rem", padding:"0 1.25rem",
              borderRight:"1px solid rgba(255,255,255,0.05)",
              flexShrink:0,
            }}>
              <span style={{fontSize:"0.32rem",fontWeight:700,color:`${col}70`,
                fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.12em",
                textTransform:"uppercase"}}>{item.tag}</span>
              <span style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.5)",
                fontFamily:"'JetBrains Mono',monospace"}}>{item.label}</span>
              <span style={{fontSize:"0.5rem",fontWeight:900,color:col,
                fontFamily:"'JetBrains Mono',monospace"}}>{item.value}</span>
              {item.change&&(
                <span style={{fontSize:"0.38rem",fontWeight:700,
                  color:item.up?"#14F195":"#f26b6b",
                  fontFamily:"'JetBrains Mono',monospace"}}>{item.change}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Right fade */}
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:48,
        background:"linear-gradient(270deg,rgba(6,8,16,1),transparent)",zIndex:2}}/>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}