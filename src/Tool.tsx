// Safeplate: restaurants publish a proper allergen grid; diners filter the menu by what they cannot eat.
import { useState } from "react";
import { useStored, uid } from "./lib/store";
import { useShared } from "./lib/useShared";
import { Section, ShareBox } from "./ui/kit";

const T = "safeplate";
// The 14 allergens restaurants must declare under EU rules, plus common extras.
const ALLERGENS = ["Gluten", "Crustaceans", "Eggs", "Fish", "Peanuts", "Soy", "Milk", "Tree nuts", "Celery", "Mustard", "Sesame", "Sulphites", "Lupin", "Molluscs"];
type Level = 0 | 1 | 2; // 0 none, 1 may contain traces, 2 contains
type Dish = { id: string; name: string; section: string; price: string; a: Record<string, Level>; vegan: boolean; veg: boolean };
type Menu = { name: string; note: string; dishes: Dish[]; updated: string };
const d = (name: string, section: string, price: string, contains: string[], traces: string[] = [], veg = false, vegan = false): Dish => ({ id: uid(), name, section, price, veg, vegan, a: Object.fromEntries([...contains.map(x => [x, 2]), ...traces.map(x => [x, 1])]) });
const SAMPLE: Menu = { name: "Dar Zitouna", note: "Our kitchen handles all 14 allergens. Tell staff about severe allergies before ordering.", updated: new Date().toISOString().slice(0, 10), dishes: [
  d("Brik à l'oeuf", "Starters", "6", ["Gluten", "Eggs"], ["Fish"]), d("Mechouia salad", "Starters", "9", [], ["Fish"], true, true), d("Lablabi", "Starters", "7", ["Gluten"], [], true, true),
  d("Couscous with lamb", "Mains", "32", ["Gluten", "Celery"]), d("Grilled sea bream", "Mains", "38", ["Fish"], ["Molluscs"]), d("Seafood pasta", "Mains", "36", ["Gluten", "Crustaceans", "Molluscs", "Milk"]),
  d("Vegetable tajine", "Mains", "24", ["Eggs", "Milk"], [], true), d("Makroudh", "Desserts", "8", ["Gluten"], ["Tree nuts", "Sesame"], true, true), d("Assida zgougou", "Desserts", "12", ["Milk", "Tree nuts"], ["Gluten"], true),
] };

function Filter({ menu }: { menu: Menu }) {
  const [avoid, setAvoid] = useState<string[]>([]);
  const [strict, setStrict] = useState(true);
  const [diet, setDiet] = useState<"" | "veg" | "vegan">("");
  const ok = (x: Dish) => avoid.every(a => (x.a[a] ?? 0) === 0 || (!strict && x.a[a] === 1)) && (!diet || x[diet]);
  const sections = [...new Set(menu.dishes.map(x => x.section))];
  return (
    <div className="stack">
      <section className="panel"><p className="eyebrow">Allergy-friendly menu</p><h2 style={{ fontSize: 36, margin: "6px 0" }}>{menu.name}</h2><p className="note">{menu.note} Updated {menu.updated}.</p></section>
      <Section title="I can't eat">
        <div className="sp-chips">{ALLERGENS.map(a => <button key={a} className="sp-chip" aria-pressed={avoid.includes(a)} onClick={() => setAvoid(avoid.includes(a) ? avoid.filter(x => x !== a) : [...avoid, a])}>{a}</button>)}</div>
        <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
          <label className="check"><input type="checkbox" checked={strict} onChange={e => setStrict(e.target.checked)} />Also hide dishes that may contain traces</label>
          <div className="seg-mini"><button aria-pressed={!diet} onClick={() => setDiet("")}>Any</button><button aria-pressed={diet === "veg"} onClick={() => setDiet("veg")}>Vegetarian</button><button aria-pressed={diet === "vegan"} onClick={() => setDiet("vegan")}>Vegan</button></div>
        </div>
      </Section>
      {sections.map(s => (
        <Section key={s} title={s}>
          {menu.dishes.filter(x => x.section === s).map(x => { const good = ok(x); const has = Object.entries(x.a).filter(([, v]) => v).map(([k, v]) => `${k}${v === 1 ? " (traces)" : ""}`); return (
            <div key={x.id} className="sp-dish" style={{ opacity: good ? 1 : 0.4 }}>
              <div style={{ flex: 1 }}><strong>{x.name}</strong> {x.vegan ? <span className="pill good">Vegan</span> : x.veg ? <span className="pill good">Vegetarian</span> : null}<p className="note">{has.length ? `Contains: ${has.join(", ")}` : "None of the 14 allergens"}</p></div>
              <span>{x.price}</span>{!good && <span className="pill bad">Not for you</span>}
            </div>); })}
        </Section>
      ))}
      <p className="note">Allergen information comes from the restaurant. Always confirm with staff if your allergy is severe.</p>
    </div>
  );
}

export default function Safeplate() {
  const shared = useShared<Menu>();
  const [menu, setMenu] = useStored<Menu>(T, "menu", SAMPLE);
  const [preview, setPreview] = useState(false);
  const [newDish, setNewDish] = useState({ name: "", section: "Mains", price: "" });
  const css = <style>{`.sp-chips{display:flex;flex-wrap:wrap;gap:8px}.sp-chip{border:2px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:8px 14px;font-weight:600;cursor:pointer}.sp-chip[aria-pressed="true"]{background:var(--bad);border-color:var(--bad);color:#fff}
  .sp-dish{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}.sp-grid th{writing-mode:vertical-rl;transform:rotate(180deg);height:110px;text-align:left;white-space:nowrap}
  .sp-cell{width:30px;height:30px;border-radius:6px;border:1px solid var(--line);cursor:pointer;font-weight:800;font-size:12px}.sp-cell.l2{background:var(--bad);color:#fff;border-color:var(--bad)}.sp-cell.l1{background:color-mix(in srgb,var(--warn) 30%,transparent);color:var(--warn)}`}</style>;
  if (shared.loading) return <p className="empty-note">Loading menu…</p>;
  if (shared.data) return <>{css}<Filter menu={shared.data} /></>;

  const set = (p: Partial<Menu>) => setMenu({ ...menu, ...p, updated: new Date().toISOString().slice(0, 10) });
  const cycle = (id: string, a: string) => set({ dishes: menu.dishes.map(x => x.id === id ? { ...x, a: { ...x.a, [a]: (((x.a[a] ?? 0) + 1) % 3) as Level } } : x) });
  return (
    <div className="stack">{css}
      <Section title="Restaurant">
        <div className="row"><label className="field"><span>Name</span><input id="sp-n" className="input" value={menu.name} onChange={e => set({ name: e.target.value })} /></label><label className="field" style={{ flexGrow: 3 }}><span>Note for guests</span><input id="sp-note" className="input" value={menu.note} onChange={e => set({ note: e.target.value })} /></label></div>
      </Section>
      <Section title="Allergen grid" aside={<span className="note">Tap a cell: empty, T = may contain traces, C = contains</span>}>
        <div className="table-wrap"><table className="t sp-grid"><thead><tr><th style={{ writingMode: "horizontal-tb", transform: "none", height: "auto" }}>Dish</th>{ALLERGENS.map(a => <th key={a}>{a}</th>)}<th>Veg</th><th>Vegan</th><th /></tr></thead>
          <tbody>{menu.dishes.map(x => (
            <tr key={x.id}><td style={{ minWidth: 160 }}><strong>{x.name}</strong><br /><span className="note">{x.section} · {x.price}</span></td>
              {ALLERGENS.map(a => { const l = x.a[a] ?? 0; return <td key={a}><button className={"sp-cell l" + l} aria-label={`${x.name}: ${a} ${["none", "traces", "contains"][l]}`} onClick={() => cycle(x.id, a)}>{l === 2 ? "C" : l === 1 ? "T" : ""}</button></td>; })}
              <td><input type="checkbox" aria-label="Vegetarian" checked={x.veg} onChange={e => set({ dishes: menu.dishes.map(y => y.id === x.id ? { ...y, veg: e.target.checked } : y) })} /></td>
              <td><input type="checkbox" aria-label="Vegan" checked={x.vegan} onChange={e => set({ dishes: menu.dishes.map(y => y.id === x.id ? { ...y, vegan: e.target.checked, veg: e.target.checked || y.veg } : y) })} /></td>
              <td><button className="btn ghost small danger" onClick={() => set({ dishes: menu.dishes.filter(y => y.id !== x.id) })}>×</button></td></tr>
          ))}</tbody></table></div>
        <form className="row" style={{ marginTop: 12 }} onSubmit={e => { e.preventDefault(); if (!newDish.name.trim()) return; set({ dishes: [...menu.dishes, { id: uid(), ...newDish, name: newDish.name.trim(), a: {}, veg: false, vegan: false }] }); setNewDish({ ...newDish, name: "", price: "" }); }}>
          <input className="input" style={{ flex: 2 }} aria-label="Dish" placeholder="Dish" value={newDish.name} onChange={e => setNewDish({ ...newDish, name: e.target.value })} /><input className="input" style={{ flex: 1 }} aria-label="Section" value={newDish.section} onChange={e => setNewDish({ ...newDish, section: e.target.value })} /><input className="input" style={{ flex: 1 }} aria-label="Price" placeholder="Price" value={newDish.price} onChange={e => setNewDish({ ...newDish, price: e.target.value })} /><button className="btn small" type="submit">Add dish</button>
        </form>
      </Section>
      <div className="grid2">
        <Section title="Put it on the table"><ShareBox slug={T} data={menu} label="Copy menu link" message={`${menu.name} allergy menu:`} /><p className="note" style={{ marginTop: 8 }}>Print the QR code on table cards or the door. Make a new link after changing a dish.</p></Section>
        <Section title="Guest view" aside={<button className="btn small" onClick={() => setPreview(!preview)}>{preview ? "Hide" : "Preview"}</button>}>{preview ? <Filter menu={menu} /> : <p className="note">See exactly what guests see when they scan.</p>}</Section>
      </div>
    </div>
  );
}
