/* global React */
const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ---------- Suit + Card primitives ----------
const SUITS = {
  s: { glyph: "♠", color: "black", name: "黑桃", en: "Spades" },
  h: { glyph: "♥", color: "red",   name: "紅心", en: "Hearts" },
  d: { glyph: "♦", color: "red",   name: "方塊", en: "Diamonds" },
  c: { glyph: "♣", color: "black", name: "梅花", en: "Clubs" },
};
const RANKS = ["2","3","4","5","6","7","8","9","T","J","Q","K","A"];
const RANK_LABEL = { T: "10" };

function PlayingCard({ card, size = 64, faceDown = false, placeholder = false, label }) {
  // size may be a number (px) or any CSS length string (e.g. a clamp()/cqw
  // expression) so callers can make cards scale with their container.
  const style = { "--w": typeof size === "number" ? size + "px" : size };
  if (placeholder) {
    return <div className="pcard placeholder" style={style}>{label || "—"}</div>;
  }
  if (faceDown) return <div className="pcard back" style={style} />;
  if (!card) return <div className="pcard placeholder" style={style}>{label || "?"}</div>;
  const r = card[0], s = card[1];
  const suit = SUITS[s];
  const cls = "pcard" + (suit.color === "red" ? " red" : "");
  const rankLabel = RANK_LABEL[r] || r;
  return (
    <div className={cls} style={style}>
      <div className="corner tl"><span>{rankLabel}</span><span className="s">{suit.glyph}</span></div>
      <div className="pip">{suit.glyph}</div>
      <div className="corner br"><span>{rankLabel}</span><span className="s">{suit.glyph}</span></div>
    </div>
  );
}

function CardRow({ cards = [], size = 56, label }) {
  return (
    <div className="pcard-row">
      {cards.map((c, i) => <PlayingCard key={i} card={c} size={size} />)}
      {label && <span className="text-dim mono" style={{ marginLeft: 8, fontSize: 12 }}>{label}</span>}
    </div>
  );
}

// ---------- Chips ----------
const CHIP_DENOMS = [
  { v: 1,    label: "1",    mid: "#f5ecd7", edge: "#cdbf94" },
  { v: 5,    label: "5",    mid: "#d04848", edge: "#7a1f1f" },
  { v: 25,   label: "25",   mid: "#3a7d4f", edge: "#143820" },
  { v: 100,  label: "100",  mid: "#1a1a1f", edge: "#000" },
  { v: 500,  label: "500",  mid: "#7c3aed", edge: "#3b1474" },
  { v: 1000, label: "1K",   mid: "#e8c98a", edge: "#8a6d2b" },
];
function Chip({ value = 25, size = 36 }) {
  const denom = [...CHIP_DENOMS].reverse().find(d => value >= d.v) || CHIP_DENOMS[0];
  const style = {
    "--d": size + "px",
    "--c-mid": denom.mid,
    "--c-edge": denom.edge,
  };
  return <div className="chip" style={style}>{denom.label}</div>;
}
function ChipStack({ amount = 100, size = 30 }) {
  // pick up to 4 denoms summing visually
  let remaining = amount;
  const stack = [];
  for (const d of [...CHIP_DENOMS].reverse()) {
    while (remaining >= d.v && stack.length < 4) {
      stack.push(d.v);
      remaining -= d.v;
    }
    if (stack.length >= 4) break;
  }
  if (!stack.length) stack.push(1);
  return (
    <div className="chip-stack" title={amount}>
      {stack.map((v, i) => <Chip key={i} value={v} size={size} />)}
    </div>
  );
}

// ---------- Hand notation ----------
// "AKs" / "AKo" / "AA" -> readable
function handLabel(code) { return code; }

// ---------- Page header / section ----------
function PageHeader({ eyebrow, title, sub, right }) {
  return (
    <div className="page-header">
      <div>
        <div className="page-eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
function Section({ num, title, lede, children, id }) {
  return (
    <section className="section" id={id}>
      <div className="section-title">
        {num && <span className="num">{num}</span>}
        <h2>{title}</h2>
      </div>
      {lede && <div className="section-lede">{lede}</div>}
      {children}
    </section>
  );
}

// ---------- Stat ----------
function Stat({ label, value, sub, accent }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : null}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ---------- Pill ----------
function Pill({ tone = "", children, style }) {
  return <span className={"pill " + tone} style={style}>{children}</span>;
}

// ---------- Bar (used for equity / frequency) ----------
function Bar({ value = 0, max = 100, color, height = 6, label, style }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ width: "100%", ...style }}>
      {label && <div className="row between" style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-dim)", marginBottom: 4 }}>
        <span>{label}</span><span className="text-gold">{Math.round(pct)}%</span>
      </div>}
      <div style={{ width: "100%", height, background: "rgba(0,0,0,0.3)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: color || "var(--gold)", transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

// ---------- Tabs ----------
function Tabs({ tabs, value, onChange }) {
  return (
    <div className="row gap-4" style={{ borderBottom: "1px solid var(--line)", marginBottom: 18 }}>
      {tabs.map(t => (
        <button key={t.id}
          onClick={() => onChange(t.id)}
          className="btn btn-ghost btn-sm"
          style={{
            border: "none", borderRadius: 0,
            borderBottom: "2px solid " + (value === t.id ? "var(--gold)" : "transparent"),
            color: value === t.id ? "var(--cream)" : "var(--fg-dim)",
            padding: "10px 16px",
            background: "transparent",
          }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// expose globally
Object.assign(window, {
  React, useState, useEffect, useMemo, useRef, useCallback,
  SUITS, RANKS, RANK_LABEL,
  PlayingCard, CardRow, Chip, ChipStack,
  PageHeader, Section, Stat, Pill, Bar, Tabs,
  handLabel,
});
