"use client";

const cells = Array.from({ length: 7 * 24 }, (_, index) => {
  const day = Math.floor(index / 24);
  const hour = index % 24;
  return Math.max(3, Math.round(15 + Math.sin(hour / 3) * 12 + day * 2 + (hour > 7 && hour < 18 ? 45 : 0)));
});

export function AccessHeatmap() {
  return <div className="overflow-x-auto"><div className="min-w-[620px]"><div className="mb-2 ml-12 flex justify-between text-[9px] text-foreground/35"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, row) => <div key={day} className="mb-1 flex items-center gap-1"><span className="w-10 text-[9px] text-foreground/35">{day}</span>{cells.slice(row * 24, row * 24 + 24).map((value, column) => <div key={`${day}-${column}`} title={`${day} ${column}:00 — ${value} events`} className="h-5 flex-1 rounded-[3px] transition hover:ring-1 hover:ring-primary" style={{ background: `hsl(var(--primary) / ${Math.min(.12 + value / 100, .9)})` }} />)}</div>)}</div></div>;
}

