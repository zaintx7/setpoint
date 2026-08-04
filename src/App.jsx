import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Home, PenLine, PlusCircle, CalendarDays, Flame, TrendingUp, Trash2, ChevronLeft, ChevronRight, Minus, Plus, X, Dumbbell, ClipboardList, Search } from "lucide-react";

const STORAGE_KEY = "setpoint:data";
const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["S","M","T","W","T","F","S"];

const MUSCLE_GROUPS = [
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "shoulders", label: "Shoulders" },
  { id: "biceps", label: "Biceps" },
  { id: "triceps", label: "Triceps" },
  { id: "legs", label: "Legs" },
  { id: "core", label: "Core" },
  { id: "other", label: "Other" },
];
const muscleLabel = (id) => MUSCLE_GROUPS.find((m) => m.id === id)?.label ?? "Other";

function Stepper({ label, value, onChange, step, min = 0 }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef(null);

  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(value + step);

  const startEdit = () => {
    setDraft(String(value));
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    const n = parseFloat(draft);
    onChange(Number.isFinite(n) ? Math.max(min, n) : value);
    setEditing(false);
  };

  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <div className="stepper-controls">
        <button type="button" className="stepper-btn" onClick={dec} aria-label={`Decrease ${label}`}><Minus size={20} strokeWidth={2.5} /></button>
        {editing ? (
          <input
            ref={inputRef}
            className="stepper-input"
            type="tel"
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
          />
        ) : (
          <button type="button" className="stepper-value" onClick={startEdit} aria-label={`Type ${label} value`}>{value}</button>
        )}
        <button type="button" className="stepper-btn" onClick={inc} aria-label={`Increase ${label}`}><Plus size={20} strokeWidth={2.5} /></button>
      </div>
    </div>
  );
}

function PlanTab({ workouts, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState(MUSCLE_GROUPS[0].id);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, muscle);
    setName("");
  };

  const grouped = useMemo(() => {
    const map = {};
    workouts.forEach((w) => {
      const key = w.muscle || "other";
      if (!map[key]) map[key] = [];
      map[key].push(w);
    });
    return MUSCLE_GROUPS.filter((g) => map[g.id]?.length).map((g) => ({ group: g, items: map[g.id] }));
  }, [workouts]);

  return (
    <div className="tab-panel">
      <form className="plan-form" onSubmit={submit}>
        <input
          className="plan-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bench press"
        />
        <button type="submit" className="btn btn-primary plan-add-btn"><PlusCircle size={18} strokeWidth={2.3} /> Add</button>
      </form>

      <div className="muscle-chips">
        {MUSCLE_GROUPS.map((g) => (
          <button
            type="button"
            key={g.id}
            className={`muscle-chip ${muscle === g.id ? "muscle-chip-active" : ""}`}
            onClick={() => setMuscle(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      {workouts.length === 0 ? (
        <div className="empty">
          <Dumbbell size={28} strokeWidth={1.6} className="empty-icon" />
          <p className="empty-copy">Type your workouts ahead of time, tag the muscle group, and they'll show up sorted at the gym — no typing needed once you're there.</p>
        </div>
      ) : (
        <div className="plan-groups">
          {grouped.map(({ group, items }) => (
            <div className="plan-group" key={group.id}>
              <div className="plan-group-title">{group.label}</div>
              <div className="plan-list">
                {items.map((w) => (
                  <div className="plan-row" key={w.id}>
                    <span className="plan-row-name">{w.name}</span>
                    <button className="plan-row-remove" onClick={() => onRemove(w.id)} aria-label={`Remove ${w.name}`}><Trash2 size={17} strokeWidth={2} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogTab({ workouts, logs, onLog }) {
  const [workoutId, setWorkoutId] = useState(workouts[0]?.id ?? "");
  const [pickerOpen, setPickerOpen] = useState(!workoutId);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!workoutId && workouts.length > 0) setWorkoutId(workouts[0].id);
  }, [workouts, workoutId]);

  const lastForWorkout = useMemo(() => {
    const entries = logs.filter((l) => l.workoutId === workoutId).sort((a, b) => (a.date < b.date ? 1 : -1));
    return entries[0] || null;
  }, [logs, workoutId]);

  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(45);

  useEffect(() => {
    if (lastForWorkout) {
      setSets(lastForWorkout.sets);
      setReps(lastForWorkout.reps);
      setWeight(lastForWorkout.weight);
    } else {
      setSets(3);
      setReps(10);
      setWeight(45);
    }
  }, [workoutId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedWorkout = workouts.find((w) => w.id === workoutId);

  const filteredGrouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? workouts.filter((w) => w.name.toLowerCase().includes(q)) : workouts;
    const map = {};
    list.forEach((w) => {
      const key = w.muscle || "other";
      if (!map[key]) map[key] = [];
      map[key].push(w);
    });
    return MUSCLE_GROUPS.filter((g) => map[g.id]?.length).map((g) => ({ group: g, items: map[g.id] }));
  }, [workouts, query]);

  const pickWorkout = (id) => {
    setWorkoutId(id);
    setPickerOpen(false);
    setQuery("");
  };

  const handleLog = () => {
    if (!workoutId) return;
    onLog({ id: uid(), workoutId, workoutName: selectedWorkout?.name ?? "", date: todayISO(), sets, reps, weight });
  };

  const recent = useMemo(
    () => logs.filter((l) => l.workoutId === workoutId).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    [logs, workoutId]
  );

  if (workouts.length === 0) {
    return (
      <div className="tab-panel">
        <div className="empty">
          <ClipboardList size={28} strokeWidth={1.6} className="empty-icon" />
          <p className="empty-copy">No workouts planned yet. Go to the Plan tab and add a few before your session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      {pickerOpen ? (
        <div className="picker">
          <div className="picker-search-wrap">
            <Search size={17} strokeWidth={2.2} className="picker-search-icon" />
            <input
              autoFocus
              className="picker-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your workouts"
            />
          </div>
          <div className="picker-list">
            {filteredGrouped.length === 0 ? (
              <p className="muted picker-empty">No matches.</p>
            ) : (
              filteredGrouped.map(({ group, items }) => (
                <div className="picker-group" key={group.id}>
                  <div className="picker-group-title">{group.label}</div>
                  {items.map((w) => (
                    <button key={w.id} className="picker-item" onClick={() => pickWorkout(w.id)}>
                      {w.name}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
          {workoutId && (
            <button className="btn picker-cancel" onClick={() => { setPickerOpen(false); setQuery(""); }}>Cancel</button>
          )}
        </div>
      ) : (
        <button className="workout-select" onClick={() => setPickerOpen(true)}>
          <span>{selectedWorkout?.name}</span>
          <Search size={17} strokeWidth={2.2} />
        </button>
      )}

      {!pickerOpen && (
        <>
          <div className="steppers">
            <Stepper label="Sets" value={sets} onChange={setSets} step={1} min={1} />
            <Stepper label="Reps" value={reps} onChange={setReps} step={1} min={1} />
            <Stepper label="Weight" value={weight} onChange={setWeight} step={5} min={0} />
          </div>

          <button className="btn btn-primary log-btn" onClick={handleLog}><PlusCircle size={19} strokeWidth={2.2} /> Log set</button>

          {recent.length > 0 && (
            <div className="recent">
              <div className="recent-title">Recent</div>
              {recent.map((l) => (
                <div className="recent-row" key={l.id}>
                  <span className="recent-date">{fmtDate(l.date)}</span>
                  <span className="recent-detail">{l.sets} × {l.reps} @ {l.weight}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function computeStreak(logs) {
  const days = new Set(logs.map((l) => l.date));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const key = (d) => d.toISOString().slice(0, 10);
  if (!days.has(key(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(key(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function last7Days() {
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const day = new Date(d);
    day.setDate(d.getDate() - i);
    out.push(day.toISOString().slice(0, 10));
  }
  return out;
}

function BodyFigure({ view, active }) {
  const isBack = view === "back";
  const on = (key) => !!active[key];
  const regionFill = (key) => (on(key) ? "var(--sp-teal)" : "var(--sp-muscle)");
  const regionOpacity = (key) => (on(key) ? 0.9 : 1);

  return (
    <svg viewBox="0 0 140 262" className="body-figure-svg">
      {/* base silhouette */}
      <g fill="var(--sp-body-base)" stroke="var(--sp-grid)" strokeWidth="1.5">
        <ellipse cx="70" cy="20" rx="14" ry="16" />
        <rect x="63" y="34" width="14" height="10" rx="3" />
        <path d="M40,50 C40,42 50,40 70,40 C90,40 100,42 100,50 L96,122 C94,137 84,148 70,150 C56,148 46,137 44,122 Z" />
        <polyline points="40,52 27,96 23,146" fill="none" strokeWidth="17" strokeLinecap="round" />
        <polyline points="100,52 113,96 117,146" fill="none" strokeWidth="17" strokeLinecap="round" />
        <circle cx="23" cy="150" r="7.5" />
        <circle cx="117" cy="150" r="7.5" />
        <polyline points="58,150 55,207 57,250" fill="none" strokeWidth="21" strokeLinecap="round" />
        <polyline points="82,150 85,207 83,250" fill="none" strokeWidth="21" strokeLinecap="round" />
        <ellipse cx="57" cy="256" rx="8" ry="5" />
        <ellipse cx="83" cy="256" rx="8" ry="5" />
      </g>

      {/* shoulders (front: front delt, back: rear delt) */}
      <circle cx="40" cy="53" r="11" fill={regionFill("shoulders")} opacity={regionOpacity("shoulders")} />
      <circle cx="100" cy="53" r="11" fill={regionFill("shoulders")} opacity={regionOpacity("shoulders")} />

      {!isBack ? (
        <>
          {/* chest */}
          <path d="M46,52 C46,46 56,44 70,44 C84,44 94,46 94,52 L91,72 C80,78 60,78 49,72 Z" fill={regionFill("chest")} opacity={regionOpacity("chest")} />
          {/* biceps */}
          <ellipse cx="31" cy="76" rx="8" ry="15" transform="rotate(-8 31 76)" fill={regionFill("biceps")} opacity={regionOpacity("biceps")} />
          <ellipse cx="109" cy="76" rx="8" ry="15" transform="rotate(8 109 76)" fill={regionFill("biceps")} opacity={regionOpacity("biceps")} />
          {/* core */}
          <g>
            <rect x="58" y="80" width="24" height="40" rx="7" fill={regionFill("core")} opacity={regionOpacity("core")} />
            <line x1="70" y1="86" x2="70" y2="114" stroke="var(--sp-bg)" strokeWidth="1.2" />
            <line x1="60" y1="92" x2="80" y2="92" stroke="var(--sp-bg)" strokeWidth="1.2" />
            <line x1="60" y1="102" x2="80" y2="102" stroke="var(--sp-bg)" strokeWidth="1.2" />
            <line x1="60" y1="112" x2="80" y2="112" stroke="var(--sp-bg)" strokeWidth="1.2" />
          </g>
          {/* quads */}
          <ellipse cx="58" cy="178" rx="12" ry="28" fill={regionFill("legs")} opacity={regionOpacity("legs")} />
          <ellipse cx="82" cy="178" rx="12" ry="28" fill={regionFill("legs")} opacity={regionOpacity("legs")} />
        </>
      ) : (
        <>
          {/* back (traps + lats) */}
          <g>
            <path d="M45,50 L95,50 L89,108 C80,116 60,116 51,108 Z" fill={regionFill("back")} opacity={regionOpacity("back")} />
            <line x1="70" y1="52" x2="70" y2="95" stroke="var(--sp-bg)" strokeWidth="1.2" />
          </g>
          {/* triceps */}
          <ellipse cx="31" cy="78" rx="8" ry="15" transform="rotate(-8 31 78)" fill={regionFill("triceps")} opacity={regionOpacity("triceps")} />
          <ellipse cx="109" cy="78" rx="8" ry="15" transform="rotate(8 109 78)" fill={regionFill("triceps")} opacity={regionOpacity("triceps")} />
          {/* glutes (core bucket) */}
          <ellipse cx="70" cy="130" rx="22" ry="15" fill={regionFill("core")} opacity={regionOpacity("core")} />
          {/* hamstrings */}
          <ellipse cx="58" cy="175" rx="12" ry="24" fill={regionFill("legs")} opacity={regionOpacity("legs")} />
          <ellipse cx="82" cy="175" rx="12" ry="24" fill={regionFill("legs")} opacity={regionOpacity("legs")} />
        </>
      )}
    </svg>
  );
}

function BodyDiagram({ active }) {
  const on = (key) => !!active[key];
  return (
    <div className="body-diagram-wrap">
      <div className="body-figures">
        <div className="body-figure">
          <BodyFigure view="front" active={active} />
          <span className="body-figure-label">Front</span>
        </div>
        <div className="body-figure">
          <BodyFigure view="back" active={active} />
          <span className="body-figure-label">Back</span>
        </div>
      </div>
      <div className="body-diagram-legend">
        {[
          { key: "chest", label: "Chest" },
          { key: "back", label: "Back" },
          { key: "shoulders", label: "Shoulders" },
          { key: "biceps", label: "Biceps" },
          { key: "triceps", label: "Triceps" },
          { key: "core", label: "Core" },
          { key: "legs", label: "Legs" },
        ].map((item) => (
          <span key={item.key} className={`body-legend-chip ${on(item.key) ? "body-legend-chip-active" : ""}`}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function HomeTab({ workouts, logs, onGoPlan, onGoLog }) {
  const streak = useMemo(() => computeStreak(logs), [logs]);
  const days = last7Days();
  const daySet = useMemo(() => new Set(logs.map((l) => l.date)), [logs]);
  const todayKey = todayISO();

  const weekCount = useMemo(() => new Set(logs.filter((l) => days.includes(l.date)).map((l) => l.date)).size, [logs]);
  const totalSessions = useMemo(() => new Set(logs.map((l) => l.date)).size, [logs]);

  const favoriteLift = useMemo(() => {
    if (logs.length === 0) return null;
    const counts = {};
    logs.forEach((l) => { counts[l.workoutName] = (counts[l.workoutName] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [logs]);

  const recent = useMemo(
    () => logs.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4),
    [logs]
  );

  const bodyActive = useMemo(() => {
    const muscleById = {};
    workouts.forEach((w) => { muscleById[w.id] = w.muscle || "other"; });
    const active = {};
    logs.forEach((l) => {
      if (!days.includes(l.date)) return;
      const m = muscleById[l.workoutId];
      if (m && m !== "other") active[m] = true;
    });
    return active;
  }, [workouts, logs, days]);

  const DOW_SHORT = ["S","M","T","W","T","F","S"];

  return (
    <div className="tab-panel">
      <div className="streak-card">
        <Flame size={30} strokeWidth={2} className="streak-flame" />
        <div>
          <div className="streak-number">{streak}</div>
          <div className="streak-label">day streak</div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-value">{weekCount}<span className="stat-card-unit">/7</span></div>
          <div className="stat-card-label">days this week</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{totalSessions}</div>
          <div className="stat-card-label">total sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{workouts.length}</div>
          <div className="stat-card-label">lifts planned</div>
        </div>
      </div>

      <div className="week-strip">
        {days.map((d) => {
          const dow = new Date(d + "T00:00:00").getDay();
          const filled = daySet.has(d);
          const isToday = d === todayKey;
          return (
            <div className="week-day" key={d}>
              <span className="week-day-dow">{DOW_SHORT[dow]}</span>
              <span className={`week-day-dot ${filled ? "week-day-dot-filled" : ""} ${isToday ? "week-day-dot-today" : ""}`} />
            </div>
          );
        })}
      </div>

      <div className="section-title"><Dumbbell size={14} strokeWidth={2.2} /> Hit this week</div>
      <div className="panel body-panel">
        <BodyDiagram active={bodyActive} />
      </div>

      <div className="section-title"><CalendarDays size={14} strokeWidth={2.2} /> This month</div>
      <MiniCalendar logs={logs} />

      {favoriteLift && (
        <div className="favorite-row">
          <span className="favorite-label"><TrendingUp size={14} strokeWidth={2.2} /> Most trained</span>
          <span className="favorite-value">{favoriteLift}</span>
        </div>
      )}

      {recent.length > 0 ? (
        <div className="recent">
          <div className="recent-title">Recent activity</div>
          {recent.map((l) => (
            <div className="recent-row" key={l.id}>
              <span className="recent-detail">{l.workoutName}</span>
              <span className="recent-date">{fmtDate(l.date)} · {l.sets}×{l.reps} @ {l.weight}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">
          <Dumbbell size={28} strokeWidth={1.6} className="empty-icon" />
          <p className="empty-copy">Nothing logged yet. Plan a lift, then log your first session.</p>
          <div className="empty-actions">
            <button className="btn" onClick={onGoPlan}><PenLine size={16} strokeWidth={2.2} /> Plan a workout</button>
            <button className="btn btn-primary" onClick={onGoLog}><PlusCircle size={16} strokeWidth={2.2} /> Log a session</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniCalendar({ logs }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const logsByDate = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      if (!map[l.date]) map[l.date] = [];
      map[l.date].push(l);
    });
    return map;
  }, [logs]);

  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const changeMonth = (delta) => {
    setSelectedDate(null);
    setCursor((c) => {
      let month = c.month + delta;
      let year = c.year;
      if (month < 0) { month = 11; year -= 1; }
      if (month > 11) { month = 0; year += 1; }
      return { year, month };
    });
  };

  const dateKey = (d) => `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const todayKey = todayISO();
  const selectedEntries = selectedDate ? logsByDate[selectedDate] || [] : [];

  return (
    <div className="panel cal-panel">
      <div className="cal-header">
        <button className="cal-nav" onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={20} strokeWidth={2.3} /></button>
        <span className="cal-title">{MONTH_NAMES[cursor.month]} {cursor.year}</span>
        <button className="cal-nav" onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={20} strokeWidth={2.3} /></button>
      </div>
      <div className="cal-dow">
        {DOW.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} className="cal-cell cal-cell-empty" />;
          const key = dateKey(d);
          const hasLogs = !!logsByDate[key];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          return (
            <button
              key={i}
              className={`cal-cell ${isToday ? "cal-cell-today" : ""} ${isSelected ? "cal-cell-selected" : ""}`}
              onClick={() => setSelectedDate(key === selectedDate ? null : key)}
            >
              {d}
              {hasLogs && <span className="cal-dot" />}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="cal-detail">
          <div className="cal-detail-title">{fmtDate(selectedDate)}</div>
          {selectedEntries.length === 0 ? (
            <p className="muted">Nothing logged this day.</p>
          ) : (
            selectedEntries.map((l) => (
              <div className="cal-detail-row" key={l.id}>
                <span className="cal-detail-name">{l.workoutName}</span>
                <span className="cal-detail-stats">{l.sets} × {l.reps} @ {l.weight}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [workouts, setWorkouts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState("home");
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setWorkouts(parsed.workouts || []);
          setLogs(parsed.logs || []);
          setTab((parsed.workouts || []).length === 0 ? "plan" : "home");
        } else {
          setTab("plan");
        }
      } catch (err) {
        setTab("plan");
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (nextWorkouts, nextLogs) => {
    try {
      const result = await window.storage.set(STORAGE_KEY, JSON.stringify({ workouts: nextWorkouts, logs: nextLogs }), false);
      setSaveError(!result);
    } catch (err) {
      setSaveError(true);
    }
  }, []);

  const addWorkout = (name, muscle) => {
    const next = [...workouts, { id: uid(), name, muscle }];
    setWorkouts(next);
    persist(next, logs);
  };

  const removeWorkout = (id) => {
    const next = workouts.filter((w) => w.id !== id);
    setWorkouts(next);
    persist(next, logs);
  };

  const addLog = (entry) => {
    const next = [...logs, entry];
    setLogs(next);
    persist(workouts, next);
  };

  if (!loaded) {
    return <div className="sp-app"><div className="loading">Loading…</div><Styles /></div>;
  }

  return (
    <div className="sp-app">
      {saveError && <div className="save-warning">Couldn't save — your changes may not persist.</div>}

      <div className="page-body">
        {tab === "home" && <HomeTab workouts={workouts} logs={logs} onGoPlan={() => setTab("plan")} onGoLog={() => setTab("log")} />}
        {tab === "plan" && <PlanTab workouts={workouts} onAdd={addWorkout} onRemove={removeWorkout} />}
        {tab === "log" && <LogTab workouts={workouts} logs={logs} onLog={addLog} />}
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === "home" ? "tab-btn-active" : ""}`} onClick={() => setTab("home")}>
          <Home size={20} strokeWidth={2.2} />
          <span>Home</span>
        </button>
        <button className={`tab-btn ${tab === "plan" ? "tab-btn-active" : ""}`} onClick={() => setTab("plan")}>
          <PenLine size={20} strokeWidth={2.2} />
          <span>Plan</span>
        </button>
        <button className={`tab-btn ${tab === "log" ? "tab-btn-active" : ""}`} onClick={() => setTab("log")}>
          <PlusCircle size={20} strokeWidth={2.2} />
          <span>Log</span>
        </button>
      </div>

      <Styles />
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap');

      .sp-app {
        --sp-bg: #14161a;
        --sp-panel: #1c2024;
        --sp-panel-alt: #23282e;
        --sp-text: #e7e4dc;
        --sp-text-dim: #8b8f96;
        --sp-amber: #f2a93b;
        --sp-teal: #47c9b0;
        --sp-red: #e2574c;
        --sp-grid: #2c3136;
        --sp-body-base: #1e2227;
        --sp-muscle: #333a42;
        font-family: 'Inter', sans-serif;
        background: var(--sp-bg);
        color: var(--sp-text);
        padding: 16px;
        padding-top: max(28px, env(safe-area-inset-top) + 14px);
        padding-bottom: max(16px, env(safe-area-inset-bottom));
        width: 100%;
        min-height: 100vh;
        margin: 0 auto;
        box-sizing: border-box;
      }
      .sp-app * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      .loading { padding: 40px; text-align: center; color: var(--sp-text-dim); font-family: 'JetBrains Mono', monospace; }
      .save-warning { background: rgba(226,87,76,0.12); border: 1px solid var(--sp-red); color: var(--sp-red); font-size: 12px; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; }

      .page-body { padding-bottom: 8px; }

      .tabs { display: flex; gap: 4px; margin-top: 14px; background: var(--sp-panel); border-radius: 12px; padding: 6px; position: sticky; bottom: 8px; border: 1px solid var(--sp-grid); }
      .tab-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; color: var(--sp-text-dim); font-family: 'Inter', sans-serif; font-weight: 500; font-size: 11px; padding: 8px 0; border-radius: 8px; cursor: pointer; min-height: 48px; }
      .tab-btn-active { background: var(--sp-panel-alt); color: var(--sp-amber); }

      .tab-panel { display: flex; flex-direction: column; gap: 12px; }

      .streak-card { display: flex; align-items: center; gap: 14px; background: linear-gradient(0deg, var(--sp-panel), var(--sp-panel)); border: 1px solid var(--sp-grid); border-radius: 12px; padding: 16px 18px; }
      .streak-flame { color: var(--sp-amber); flex-shrink: 0; }
      .streak-number { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 30px; line-height: 1; color: var(--sp-amber); }
      .streak-label { font-size: 12px; color: var(--sp-text-dim); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }

      .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .stat-card { background: var(--sp-panel); border: 1px solid var(--sp-grid); border-radius: 10px; padding: 12px 8px; text-align: center; }
      .stat-card-value { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 18px; color: var(--sp-text); }
      .stat-card-unit { font-size: 12px; color: var(--sp-text-dim); }
      .stat-card-label { font-size: 10px; color: var(--sp-text-dim); text-transform: uppercase; letter-spacing: 0.03em; margin-top: 4px; line-height: 1.3; }

      .week-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; background: var(--sp-panel); border: 1px solid var(--sp-grid); border-radius: 10px; padding: 12px 8px; }
      .week-day { display: flex; flex-direction: column; align-items: center; gap: 6px; }
      .week-day-dow { font-size: 10px; color: var(--sp-text-dim); }
      .week-day-dot { width: 18px; height: 18px; border-radius: 50%; background: var(--sp-panel-alt); border: 1px solid var(--sp-grid); }
      .week-day-dot-filled { background: var(--sp-teal); border-color: var(--sp-teal); }
      .week-day-dot-today { border-color: var(--sp-amber); border-width: 2px; }

      .favorite-row { display: flex; justify-content: space-between; align-items: center; background: var(--sp-panel); border: 1px solid var(--sp-grid); border-radius: 10px; padding: 12px 14px; }
      .favorite-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--sp-text-dim); text-transform: uppercase; letter-spacing: 0.03em; }
      .favorite-value { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px; color: var(--sp-teal); }

      .empty-actions { display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
      .empty-icon { color: var(--sp-text-dim); margin-bottom: 10px; }

      .plan-form { display: flex; gap: 8px; }
      .plan-input { flex: 1; background: var(--sp-panel); border: 1px solid var(--sp-grid); color: var(--sp-text); padding: 12px; border-radius: 8px; font-size: 16px; min-height: 46px; }
      .plan-input:focus { outline: none; border-color: var(--sp-amber); }
      .plan-add-btn { flex-shrink: 0; padding: 0 18px; }

      .plan-list { display: flex; flex-direction: column; gap: 6px; }
      .plan-row { display: flex; align-items: center; justify-content: space-between; background: var(--sp-panel); border: 1px solid var(--sp-grid); border-radius: 8px; padding: 12px 14px; }
      .plan-row-name { font-size: 15px; }
      .plan-row-remove { background: none; border: none; color: var(--sp-text-dim); cursor: pointer; min-width: 34px; min-height: 34px; display: flex; align-items: center; justify-content: center; }
      .plan-row-remove:hover { color: var(--sp-red); }

      .muscle-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .muscle-chip { background: var(--sp-panel); border: 1px solid var(--sp-grid); color: var(--sp-text-dim); padding: 8px 13px; border-radius: 999px; font-size: 12px; cursor: pointer; min-height: 36px; }
      .muscle-chip-active { background: var(--sp-amber); border-color: var(--sp-amber); color: #1a1305; font-weight: 600; }

      .plan-groups { display: flex; flex-direction: column; gap: 16px; }
      .plan-group-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sp-text-dim); margin-bottom: 6px; }

      .picker-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
      .picker-group-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sp-text-dim); margin-top: 4px; }

      .workout-select { width: 100%; background: var(--sp-panel); border: 1px solid var(--sp-grid); color: var(--sp-text); padding: 14px; border-radius: 10px; font-size: 17px; font-family: 'Space Grotesk', sans-serif; font-weight: 600; min-height: 52px; appearance: none; -webkit-appearance: none; }
      .workout-select:focus { outline: none; border-color: var(--sp-amber); }

      .steppers { display: flex; flex-direction: column; gap: 10px; }
      .stepper { display: flex; align-items: center; justify-content: space-between; background: var(--sp-panel); border: 1px solid var(--sp-grid); border-radius: 10px; padding: 10px 14px; }
      .stepper-label { font-size: 14px; color: var(--sp-text-dim); text-transform: uppercase; letter-spacing: 0.04em; }
      .stepper-controls { display: flex; align-items: center; gap: 14px; }
      .stepper-btn { width: 44px; height: 44px; border-radius: 10px; background: var(--sp-panel-alt); border: 1px solid var(--sp-grid); color: var(--sp-text); cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .stepper-btn:active { background: var(--sp-amber); color: #1a1305; border-color: var(--sp-amber); }
      .stepper-value { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 22px; min-width: 44px; text-align: center; background: none; border: none; color: var(--sp-text); cursor: pointer; padding: 4px; border-radius: 6px; }
      .stepper-value:hover { background: var(--sp-panel-alt); }
      .stepper-input { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 22px; width: 64px; text-align: center; background: var(--sp-panel-alt); border: 1px solid var(--sp-amber); color: var(--sp-text); border-radius: 6px; padding: 4px 2px; }
      .stepper-input:focus { outline: none; }

      .btn { background: var(--sp-panel-alt); border: 1px solid var(--sp-grid); color: var(--sp-text); padding: 12px 16px; border-radius: 10px; font-size: 15px; cursor: pointer; font-family: 'Inter', sans-serif; min-height: 46px; display: flex; align-items: center; justify-content: center; gap: 7px; }
      .btn-primary { background: var(--sp-amber); border-color: var(--sp-amber); color: #1a1305; font-weight: 700; }
      .btn-primary:active { opacity: 0.85; }
      .log-btn { width: 100%; font-family: 'Space Grotesk', sans-serif; font-size: 16px; }

      .recent { margin-top: 4px; }
      .recent-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--sp-text-dim); margin-bottom: 8px; }
      .recent-row { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--sp-grid); font-size: 13px; }
      .recent-row:first-child { border-top: none; }
      .recent-date { color: var(--sp-text-dim); font-family: 'JetBrains Mono', monospace; }
      .recent-detail { font-family: 'JetBrains Mono', monospace; }

      .empty { text-align: center; padding: 32px 16px; border: 1px dashed var(--sp-grid); border-radius: 10px; }
      .empty-copy { color: var(--sp-text-dim); font-size: 13px; max-width: 300px; margin: 0 auto; line-height: 1.5; }
      .muted { color: var(--sp-text-dim); font-size: 13px; }

      .cal-header { display: flex; align-items: center; justify-content: space-between; }
      .cal-nav { background: var(--sp-panel); border: 1px solid var(--sp-grid); color: var(--sp-text); width: 40px; height: 40px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .cal-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 16px; }
      .cal-dow { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; color: var(--sp-text-dim); margin-top: 10px; }
      .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-top: 6px; }
      .cal-cell { position: relative; aspect-ratio: 1; background: var(--sp-panel); border: 1px solid var(--sp-grid); border-radius: 8px; color: var(--sp-text); font-family: 'JetBrains Mono', monospace; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      .cal-cell-empty { background: none; border: none; cursor: default; }
      .cal-cell-today { border-color: var(--sp-amber); }
      .cal-cell-selected { background: var(--sp-panel-alt); border-color: var(--sp-teal); }
      .cal-dot { position: absolute; bottom: 5px; width: 5px; height: 5px; border-radius: 50%; background: var(--sp-teal); }
      .cal-detail { margin-top: 10px; background: var(--sp-panel); border: 1px solid var(--sp-grid); border-radius: 10px; padding: 12px 14px; }
      .cal-detail-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14px; margin-bottom: 8px; }
      .cal-detail-row { display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid var(--sp-grid); font-size: 13px; }
      .cal-detail-row:first-child { border-top: none; }
      .cal-detail-name { font-weight: 500; }
      .cal-detail-stats { font-family: 'JetBrains Mono', monospace; color: var(--sp-text-dim); }

      .section-title { display: flex; align-items: center; gap: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sp-text-dim); margin: 4px 0 -2px; }
      .cal-panel { padding: 14px; }

      .workout-select { width: 100%; display: flex; align-items: center; justify-content: space-between; background: var(--sp-panel); border: 1px solid var(--sp-grid); color: var(--sp-text); padding: 14px 16px; border-radius: 10px; font-size: 17px; font-family: 'Space Grotesk', sans-serif; font-weight: 600; min-height: 52px; cursor: pointer; }
      .workout-select:hover { border-color: var(--sp-text-dim); }

      .picker { display: flex; flex-direction: column; gap: 8px; }
      .picker-search-wrap { position: relative; display: flex; align-items: center; }
      .picker-search-icon { position: absolute; left: 14px; color: var(--sp-text-dim); pointer-events: none; }
      .picker-search { width: 100%; background: var(--sp-panel); border: 1px solid var(--sp-grid); color: var(--sp-text); padding: 12px 14px 12px 40px; border-radius: 10px; font-size: 16px; min-height: 48px; }
      .picker-search:focus { outline: none; border-color: var(--sp-amber); }
      .picker-list { display: flex; flex-direction: column; gap: 6px; max-height: 40vh; overflow-y: auto; }
      .picker-item { text-align: left; background: var(--sp-panel); border: 1px solid var(--sp-grid); color: var(--sp-text); padding: 13px 14px; border-radius: 8px; font-size: 15px; cursor: pointer; min-height: 44px; }
      .picker-item:hover { border-color: var(--sp-amber); }
      .picker-empty { padding: 12px 2px; }
      .picker-cancel { align-self: stretch; }

      @media (min-width: 560px) {
        .sp-app { max-width: 480px; min-height: auto; border-radius: 14px; margin: 24px auto; box-shadow: 0 0 0 1px var(--sp-grid); }
      }

      .body-panel { display: flex; justify-content: center; }
      .body-diagram-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%; }
      .body-figures { display: flex; gap: 18px; justify-content: center; }
      .body-figure { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .body-figure-svg { width: 108px; height: auto; }
      .body-figure-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--sp-text-dim); }
      .body-diagram-legend { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
      .body-legend-chip { font-size: 11px; padding: 5px 10px; border-radius: 999px; background: var(--sp-panel-alt); border: 1px solid var(--sp-grid); color: var(--sp-text-dim); }
      .body-legend-chip-active { background: rgba(71,201,176,0.15); border-color: var(--sp-teal); color: var(--sp-teal); font-weight: 600; }
    `}</style>
  );
}
