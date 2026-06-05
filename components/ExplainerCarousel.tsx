"use client";
import React, { useState, useEffect } from "react";


const slides = [
  {
    id: 1,
    label: "01 · WHAT IS ABRAXAS",
    visual: <div className="text-[110px] text-emerald-400 tracking-[-10px] font-light">✧</div>,
    title: "ABRAXAS",
    subtitle: "WHERE ASSETS BECOME COLLATERAL",
  },
  {
    id: 2,
    label: "02 · THE PROBLEM",
    title: <>You own a valuable thing.<br />You need cash.</>,
    body: <>You own a $1M+ asset.<br />You don’t want to sell it.<br />You want liquidity without losing ownership.<br /><span className="text-emerald-400">Traditional finance and crypto both failed at this — until Abraxas.</span></>,
  },
  {
    id: 3,
    label: "03 · THE SOLUTION",
    title: <>Abraxas turns real assets<br />into on-chain collateral.</>,
    body: "10-stage institutional verification. Wyoming LLC formation. Real yield. Real ownership. Real liquidity on Solana.",
  },
];


export default function ExplainerCarousel() {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);


  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setIndex(i => (i + 1) % slides.length), 7000);
    return () => clearTimeout(t);
  }, [index, auto]);


  const go = (i: number) => { setIndex(i); setAuto(false); setTimeout(() => setAuto(true), 12000); };


  const s = slides[index];
  return (
    <div className="relative w-full max-w-[1180px] mx-auto rounded-3xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
      <div className="grid lg:grid-cols-5 min-h-[560px]">
        <div className="lg:col-span-3 flex items-center justify-center p-12 bg-black/40">
          <div className="text-center">{s.visual}<div className="text-7xl font-semibold tracking-[-3px] mt-4">{s.title}</div><div className="text-emerald-400/70 text-sm tracking-[3px] mt-1">{s.subtitle}</div></div>
        </div>
        <div className="lg:col-span-2 p-10 lg:p-12 border-l border-white/10 flex flex-col">
          <div className="text-[10px] text-white/50 font-mono tracking-[3px] mb-4">{s.label}</div>
          <div className="text-5xl font-semibold tracking-[-1.5px] leading-none">{s.title}</div>
          <div className="mt-6 text-lg text-zinc-300">{s.body}</div>


          <div className="mt-auto pt-8 flex items-center justify-between border-t border-white/10">
            <div className="flex gap-1.5">{slides.map((_, i) => <button key={i} onClick={() => go(i)} className={`h-[3px] rounded-full transition-all ${index===i ? "w-8 bg-white" : "w-4 bg-white/30"}`} />)}</div>
            <div className="flex gap-2">
              <button onClick={() => go((index-1+slides.length)%slides.length)} className="w-9 h-9 rounded-full border border-white/20 hover:bg-white/5">←</button>
              <button onClick={() => go((index+1)%slides.length)} className="w-9 h-9 rounded-full border border-white/20 hover:bg-white/5">→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
