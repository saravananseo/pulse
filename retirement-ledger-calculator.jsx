import React, { useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;

const COLORS = {
  paper: "#EFEAD9",
  paperCard: "#F8F4E7",
  rule: "#B9C3CC",
  margin: "#9C3B45",
  ink: "#20293A",
  inkSoft: "#5C6472",
  gold: "#8E6A2F",
  positive: "#2E6B4C",
  negative: "#9C3B45",
};

const DEFAULTS = {
  currentAge: 40,
  retirementAge: 56,
  planUntilAge: 85,
  annualIncome: 1200000,
  annualExpenses: 600000,
  startingCorpus: 6247508,
  growthPre: 10,
  growthPostStage1: 8,
  stage1EndAge: 66,
  growthPostStage2: 6,
  stage2EndAge: 80,
  growthPostStage3: 5,
  inflation: 6,
};

function postRetirementGrowth(age, inputs) {
  if (age < inputs.stage1EndAge) return inputs.growthPostStage1;
  if (age < inputs.stage2EndAge) return inputs.growthPostStage2;
  return inputs.growthPostStage3;
}

function formatINR(n) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.round(Math.abs(n));
  return sign + "\u20B9" + abs.toLocaleString("en-IN");
}

function compactINR(n) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return sign + "\u20B9" + (abs / 10000000).toFixed(2) + " Cr";
  if (abs >= 100000) return sign + "\u20B9" + (abs / 100000).toFixed(2) + " L";
  return formatINR(n);
}

function computeSchedule(inputs) {
  const {
    currentAge,
    retirementAge,
    planUntilAge,
    annualIncome,
    annualExpenses,
    startingCorpus,
    growthPre,
    inflation,
  } = inputs;

  const rows = [];
  let prevExpenses = annualExpenses;
  let prevCorpus = null;
  let depleted = false;
  let depletionAge = null;

  const endAge = Math.max(planUntilAge, currentAge);

  for (let age = currentAge; age <= endAge; age++) {
    const isFirstYear = age === currentAge;
    const isWorking = age < retirementAge;
    const growthRate = (isWorking ? growthPre : postRetirementGrowth(age, inputs)) / 100;

    let expenses, netFlow, corpusEnd, income;

    if (isFirstYear) {
      expenses = annualExpenses;
      income = isWorking ? annualIncome : 0;
      netFlow = startingCorpus;
      corpusEnd = startingCorpus * (1 + growthRate);
    } else {
      expenses = prevExpenses * (1 + inflation / 100);
      income = isWorking ? annualIncome : 0;
      if (isWorking) {
        netFlow = annualIncome - expenses;
        corpusEnd = (netFlow + prevCorpus) * (1 + growthRate);
      } else {
        netFlow = prevCorpus - expenses;
        corpusEnd = netFlow * (1 + growthRate);
      }
    }

    const rawCorpus = corpusEnd;
    if (!isWorking && rawCorpus <= 0 && !depleted) {
      depleted = true;
      depletionAge = age;
    }
    if (depleted) {
      corpusEnd = 0;
    }

    rows.push({
      age,
      isWorking,
      income,
      expenses,
      netFlow,
      growthRate: growthRate * 100,
      corpusEnd,
      rawCorpus,
      depleted,
    });

    prevExpenses = expenses;
    prevCorpus = corpusEnd;
  }

  return { rows, depletionAge };
}

const FIELD_GROUPS = [
  {
    title: "Working years",
    fields: [
      { key: "currentAge", label: "Current age", suffix: "yrs" },
      { key: "retirementAge", label: "Retirement age", suffix: "yrs" },
      { key: "annualIncome", label: "Annual income", suffix: "\u20B9" },
      { key: "annualExpenses", label: "Annual expenses (today)", suffix: "\u20B9" },
      { key: "startingCorpus", label: "Existing investment corpus", suffix: "\u20B9" },
      { key: "growthPre", label: "Growth rate, pre-retirement", suffix: "%" },
    ],
  },
  {
    title: "After retirement",
    fields: [
      { key: "planUntilAge", label: "Plan until age", suffix: "yrs" },
      { key: "growthPostStage1", label: "Growth %, early retirement", suffix: "%" },
      { key: "stage1EndAge", label: "\u21B3 step down to middle rate at age", suffix: "yrs" },
      { key: "growthPostStage2", label: "Growth %, middle retirement", suffix: "%" },
      { key: "stage2EndAge", label: "\u21B3 step down to late rate at age", suffix: "yrs" },
      { key: "growthPostStage3", label: "Growth %, late retirement", suffix: "%" },
      { key: "inflation", label: "Inflation (expense growth)", suffix: "%" },
    ],
  },
];

function LedgerInput({ field, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 2px",
        borderBottom: `1px solid ${COLORS.rule}`,
      }}
    >
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: COLORS.inkSoft,
          letterSpacing: "0.01em",
        }}
      >
        {field.label}
      </span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        {field.suffix === "\u20B9" && (
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 15,
              color: COLORS.ink,
            }}
          >
            {"\u20B9"}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          style={{
            width: field.suffix === "%" ? 64 : field.suffix === "yrs" ? 56 : 118,
            textAlign: "right",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 15,
            color: COLORS.ink,
            background: "transparent",
            border: "none",
            borderBottom: `1px dashed ${COLORS.gold}`,
            outline: "none",
            padding: "2px 2px",
          }}
        />
        {field.suffix !== "\u20B9" && (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: COLORS.inkSoft,
              minWidth: 20,
            }}
          >
            {field.suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function StampBadge({ ok, text, sub }) {
  const color = ok ? COLORS.positive : COLORS.negative;
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: `3px solid ${color}`,
        borderRadius: 6,
        padding: "14px 22px",
        transform: "rotate(-2deg)",
        color,
        background: "rgba(255,255,255,0.35)",
      }}
    >
      <span
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {text}
      </span>
      {sub && (
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            marginTop: 4,
            color: COLORS.inkSoft,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

export default function RetirementLedger() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [saveStatus, setSaveStatus] = useState("");
  const [loaded, setLoaded] = useState(false);

  const STORAGE_KEY = "retirement-ledger-inputs";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(STORAGE_KEY, false);
        if (!cancelled && result && result.value) {
          const parsed = JSON.parse(result.value);
          const merged = {};
          Object.keys(DEFAULTS).forEach((k) => {
            merged[k] = typeof parsed[k] === "number" && Number.isFinite(parsed[k]) ? parsed[k] : DEFAULTS[k];
          });
          setInputs(merged);
          setSaveStatus("Loaded your saved numbers");
        }
      } catch (e) {
        // no saved data yet, keep defaults
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!saveStatus) return;
    const t = setTimeout(() => setSaveStatus(""), 2500);
    return () => clearTimeout(t);
  }, [saveStatus]);

  const handleSave = async () => {
    try {
      const result = await window.storage.set(STORAGE_KEY, JSON.stringify(safeInputs), false);
      if (result) {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setSaveStatus("Saved at " + time);
      } else {
        setSaveStatus("Couldn't save right now.");
      }
    } catch (e) {
      setSaveStatus("Couldn't save right now.");
    }
  };

  const handleReset = async () => {
    setInputs(DEFAULTS);
    try {
      await window.storage.delete(STORAGE_KEY, false);
    } catch (e) {
      // ignore if nothing was saved
    }
    setSaveStatus("Reset to defaults");
  };

  const handleChange = (key, rawValue) => {
    const val = rawValue === "" ? "" : Number(rawValue);
    setInputs((prev) => ({ ...prev, [key]: val }));
  };

  const safeInputs = useMemo(() => {
    const clean = {};
    Object.keys(DEFAULTS).forEach((k) => {
      const v = inputs[k];
      clean[k] = v === "" || v === undefined || Number.isNaN(v) ? DEFAULTS[k] : v;
    });
    if (clean.retirementAge <= clean.currentAge) clean.retirementAge = clean.currentAge + 1;
    if (clean.stage1EndAge <= clean.retirementAge) clean.stage1EndAge = clean.retirementAge + 1;
    if (clean.stage2EndAge <= clean.stage1EndAge) clean.stage2EndAge = clean.stage1EndAge + 1;
    if (clean.planUntilAge < clean.retirementAge) clean.planUntilAge = clean.retirementAge;
    return clean;
  }, [inputs]);

  const { rows, depletionAge } = useMemo(() => computeSchedule(safeInputs), [safeInputs]);

  const retirementRow = rows.find((r) => r.age === safeInputs.retirementAge - 1);
  const corpusAtRetirement = retirementRow ? retirementRow.corpusEnd : safeInputs.startingCorpus;
  const finalRow = rows[rows.length - 1];
  const yearsInRetirement = safeInputs.planUntilAge - safeInputs.retirementAge + 1;
  const yearsCovered = depletionAge ? depletionAge - safeInputs.retirementAge : yearsInRetirement;

  const chartData = rows.map((r) => ({
    age: r.age,
    preCorpus: r.age <= safeInputs.retirementAge ? r.corpusEnd : null,
    postCorpus: r.age >= safeInputs.retirementAge ? r.corpusEnd : null,
  }));

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: COLORS.paper,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 30px, ${COLORS.rule}55 31px)`,
        minHeight: "100%",
        padding: "0 0 40px 0",
        position: "relative",
      }}
    >
      <style>{FONTS}</style>

      {/* margin rule */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 58,
          width: 2,
          background: COLORS.margin,
          opacity: 0.55,
        }}
      />

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "36px 24px 0 76px" }}>
        {/* header */}
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: COLORS.gold,
              marginBottom: 6,
            }}
          >
            A Running Account
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: "clamp(28px, 4vw, 40px)",
              color: COLORS.ink,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Retirement Ledger
          </h1>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              color: COLORS.inkSoft,
              marginTop: 8,
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            Enter your numbers below. Income stays flat until you retire; expenses
            climb every year with inflation, before and after. Once income stops,
            the corpus itself pays the bills.
          </p>
        </div>

        {/* inputs */}
        <div
          style={{
            background: COLORS.paperCard,
            border: `1px solid ${COLORS.rule}`,
            borderRadius: 4,
            padding: "18px 22px",
            marginBottom: 28,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 40px",
          }}
          className="ledger-input-grid"
        >
          {FIELD_GROUPS.map((group) => (
            <div key={group.title}>
              <div
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontSize: 15,
                  color: COLORS.gold,
                  marginBottom: 2,
                  marginTop: 8,
                }}
              >
                {group.title}
              </div>
              {group.fields.map((f) => (
                <LedgerInput
                  key={f.key}
                  field={f}
                  value={inputs[f.key]}
                  onChange={handleChange}
                />
              ))}
            </div>
          ))}
        </div>

        {/* save controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            margin: "20px 0 30px 0",
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: COLORS.positive,
              minHeight: 16,
            }}
          >
            {saveStatus}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleReset}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                borderRadius: 4,
                padding: "8px 16px",
                cursor: "pointer",
                border: `1px solid ${COLORS.gold}`,
                background: "transparent",
                color: COLORS.gold,
              }}
            >
              Reset to defaults
            </button>
            <button
              onClick={handleSave}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                fontSize: 13,
                borderRadius: 4,
                padding: "8px 16px",
                cursor: "pointer",
                border: `1px solid ${COLORS.gold}`,
                background: COLORS.gold,
                color: "#fff",
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* summary */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            alignItems: "center",
            marginBottom: 30,
          }}
        >
          <StampBadge
            ok={!depletionAge}
            text={
              depletionAge
                ? `Runs out at age ${depletionAge}`
                : `Lasts to age ${safeInputs.planUntilAge}`
            }
            sub={
              depletionAge
                ? `${yearsCovered} of ${yearsInRetirement} retirement years covered`
                : `Closing balance ${compactINR(finalRow ? finalRow.corpusEnd : 0)}`
            }
          />

          <div style={{ display: "flex", gap: 28 }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Corpus at retirement
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, color: COLORS.ink }}>
                {compactINR(corpusAtRetirement)}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Retirement span
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, color: COLORS.ink }}>
                {yearsInRetirement} yrs
              </div>
            </div>
          </div>
        </div>

        {/* chart */}
        <div
          style={{
            background: COLORS.paperCard,
            border: `1px solid ${COLORS.rule}`,
            borderRadius: 4,
            padding: "18px 12px 8px 4px",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: 15,
              color: COLORS.ink,
              margin: "0 0 8px 20px",
            }}
          >
            Balance, year by year
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="preFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="postFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.margin} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={COLORS.margin} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={COLORS.rule} strokeOpacity={0.5} vertical={false} />
              <XAxis
                dataKey="age"
                tick={{ fontFamily: "IBM Plex Mono", fontSize: 11, fill: COLORS.inkSoft }}
                axisLine={{ stroke: COLORS.rule }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => compactINR(v)}
                tick={{ fontFamily: "IBM Plex Mono", fontSize: 11, fill: COLORS.inkSoft }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                formatter={(value, name) => [formatINR(value), name === "preCorpus" ? "Working years" : "Retirement"]}
                labelFormatter={(age) => `Age ${age}`}
                contentStyle={{
                  fontFamily: "Inter",
                  fontSize: 12,
                  background: COLORS.paperCard,
                  border: `1px solid ${COLORS.rule}`,
                }}
              />
              <ReferenceLine
                x={safeInputs.retirementAge}
                stroke={COLORS.gold}
                strokeDasharray="4 3"
                label={{ value: "Retirement", position: "top", fontSize: 11, fill: COLORS.gold, fontFamily: "Inter" }}
              />
              <Area
                type="monotone"
                dataKey="preCorpus"
                stroke={COLORS.gold}
                strokeWidth={2}
                fill="url(#preFill)"
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="postCorpus"
                stroke={COLORS.margin}
                strokeWidth={2}
                fill="url(#postFill)"
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* table */}
        <div
          style={{
            background: COLORS.paperCard,
            border: `1px solid ${COLORS.rule}`,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: 15,
              color: COLORS.ink,
              padding: "16px 20px 10px 20px",
            }}
          >
            The full account
          </div>
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    position: "sticky",
                    top: 0,
                    background: COLORS.paperCard,
                    boxShadow: `0 1px 0 ${COLORS.rule}`,
                  }}
                >
                  {["Age", "Phase", "Income", "Expenses", "Savings / Withdrawal", "Growth %", "Year-end corpus"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: COLORS.inkSoft,
                        textAlign: i === 0 || i === 1 ? "left" : "right",
                        padding: "8px 14px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.age}
                    style={{
                      background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.02)",
                      borderTop: `1px solid ${COLORS.rule}55`,
                    }}
                  >
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: "7px 14px", color: COLORS.ink }}>
                      {r.age}
                    </td>
                    <td style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, padding: "7px 14px", color: COLORS.inkSoft }}>
                      {r.isWorking ? "Working" : "Retired"}
                    </td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: "7px 14px", textAlign: "right", color: COLORS.ink }}>
                      {r.income ? formatINR(r.income) : "\u2014"}
                    </td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: "7px 14px", textAlign: "right", color: COLORS.ink }}>
                      {formatINR(r.expenses)}
                    </td>
                    <td
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 13,
                        padding: "7px 14px",
                        textAlign: "right",
                        color: r.netFlow < 0 ? COLORS.negative : COLORS.ink,
                      }}
                    >
                      {formatINR(r.netFlow)}
                    </td>
                    <td style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: "7px 14px", textAlign: "right", color: COLORS.inkSoft }}>
                      {r.growthRate.toFixed(1)}%
                    </td>
                    <td
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 13,
                        padding: "7px 14px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: r.depleted ? COLORS.negative : COLORS.ink,
                      }}
                    >
                      {r.depleted ? "Depleted" : formatINR(r.corpusEnd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            color: COLORS.inkSoft,
            marginTop: 14,
            lineHeight: 1.5,
          }}
        >
          Assumes income stays flat until retirement, expenses grow with inflation
          every year including in retirement, and the corpus compounds at the
          pre- or post-retirement growth rate depending on the phase. A planning
          model, not financial advice.
        </p>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .ledger-input-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
