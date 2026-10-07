//profile page UI


import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Eye, MapPin, Link2, Pencil, Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { genres, stories } from "@/lib/stories";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Tidewrite" },
      { name: "description", content: "Manage your Tidewrite profile, followers, writings, reading and writing settings and interests." },
      { property: "og:title", content: "Your profile — Tidewrite" },
      { property: "og:description", content: "Your stories, followers and reading preferences in one place." },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  name: string; handle: string; bio: string; location: string; website: string; pronouns: string;
  showFollowers: boolean; showReadingList: boolean; allowMessages: boolean;
  reading: { theme: "Light" | "Sepia" | "Dark"; fontSize: number; lineSpacing: "Compact" | "Comfortable" | "Airy"; font: "Sans" | "Serif"; autoNext: boolean; hideMature: boolean };
  writing: { autosave: boolean; focusMode: boolean; dailyGoal: number; showWordCount: boolean; defaultAudience: string };
  personal: { email: string; language: string; timezone: string; emailNotifs: boolean; commentNotifs: boolean; followNotifs: boolean };
  interests: string[];
};

const initial: Profile = {
  name: "Ava Marlow", handle: "avamarlow", bio: "Writing quiet stories about loud feelings. Tea, rain and lighthouses.",
  location: "Lisbon, Portugal", website: "avamarlow.com", pronouns: "she/her",
  showFollowers: true, showReadingList: true, allowMessages: false,
  reading: { theme: "Light", fontSize: 18, lineSpacing: "Comfortable", font: "Serif", autoNext: true, hideMature: false },
  writing: { autosave: true, focusMode: false, dailyGoal: 500, showWordCount: true, defaultAudience: "Everyone" },
  personal: { email: "ava@example.com", language: "English", timezone: "GMT+1 (Lisbon)", emailNotifs: true, commentNotifs: true, followNotifs: false },
  interests: ["Fantasy", "Romance", "Mystery"],
};

const KEY = "tidewrite-profile";
const stats = { followers: "12.4K", following: "318", writings: 3, reads: "4.2M" };
const myWorks = stories.slice(0, 3);
const tabs = ["Public profile", "Reading", "Writing", "Personal", "Interests"] as const;

function ProfilePage() {
  const [p, setP] = useState<Profile>(initial);
  const [draft, setDraft] = useState<Profile>(initial);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Public profile");
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) { const v = { ...initial, ...JSON.parse(s) }; setP(v); setDraft(v); } } catch { /* ignore */ }
  }, []);

  const dirty = JSON.stringify(p) !== JSON.stringify(draft);
  const save = () => { setP(draft); localStorage.setItem(KEY, JSON.stringify(draft)); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const sub = <K extends "reading" | "writing" | "personal">(k: K, v: Partial<Profile[K]>) => setDraft((d) => ({ ...d, [k]: { ...d[k], ...v } }));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <section className="overflow-hidden rounded-3xl border border-border">
          <div className="h-36 bg-hero border-b border-border" />
          <div className="px-6 pb-8 md:px-10">
            <div className="-mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <Avatar name={p.name} size="lg" />
              <div className="flex gap-2">
                <button onClick={() => setTab("Public profile")} className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted">
                  <Pencil className="size-4" />Edit profile
                </button>
                <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  <Eye className="size-4" />View public profile
                </button>
              </div>
            </div>
            <h1 className="mt-4 text-3xl font-bold">{p.name}</h1>
            <p className="text-muted-foreground">@{p.handle}{p.pronouns && ` · ${p.pronouns}`}</p>
            <p className="mt-3 max-w-xl leading-relaxed">{p.bio}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {p.location && <span className="flex items-center gap-1"><MapPin className="size-4" />{p.location}</span>}
              {p.website && <span className="flex items-center gap-1"><Link2 className="size-4" />{p.website}</span>}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([[stats.followers, "Followers"], [stats.following, "Following"], [String(stats.writings), "Writings"], [stats.reads, "Total reads"]] as [string, string][]).map(([n, l]) => (
                <div key={l} className="rounded-2xl border border-border bg-card px-4 py-3"><Stat n={n} l={l} /></div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold">Your writings</h2>
            <Link to="/write" className="text-sm font-semibold underline-offset-4 hover:underline">+ New story</Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3">
            {myWorks.map((s) => (
              <Link key={s.id} to="/story/$id" params={{ id: s.id }} className="group overflow-hidden rounded-2xl border border-border transition hover:-translate-y-0.5 hover:shadow-lg">
                <img src={s.cover} alt="" loading="lazy" style={{ filter: "grayscale(1)" }} className="aspect-[3/2] w-full object-cover" />
                <div className="p-4">
                  <p className="truncate font-display font-bold">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.genre} · {s.chapters.length} parts · {s.reads} reads</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-border pt-10 md:grid-cols-[200px_1fr]">
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-semibold ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{t}</button>
            ))}
          </nav>

          <div className="space-y-6">
            {tab === "Public profile" && (<>
              <Group title="Public profile" desc="This is what other readers see.">
                <Text label="Display name" value={draft.name} onChange={(v) => set("name", v)} />
                <Text label="Username" value={draft.handle} onChange={(v) => set("handle", v.replace(/\s/g, ""))} />
                <Text label="Pronouns" value={draft.pronouns} onChange={(v) => set("pronouns", v)} />
                <Field label="Bio"><textarea rows={3} maxLength={200} value={draft.bio} onChange={(e) => set("bio", e.target.value)} className={input} /></Field>
                <Text label="Location" value={draft.location} onChange={(v) => set("location", v)} />
                <Text label="Website" value={draft.website} onChange={(v) => set("website", v)} />
              </Group>
              <Group title="Visibility">
                <Toggle label="Show followers count" checked={draft.showFollowers} onChange={(v) => set("showFollowers", v)} />
                <Toggle label="Show my reading list" checked={draft.showReadingList} onChange={(v) => set("showReadingList", v)} />
                <Toggle label="Allow direct messages" checked={draft.allowMessages} onChange={(v) => set("allowMessages", v)} />
              </Group>
            </>)}

            {tab === "Reading" && (
              <Group title="Reading environment" desc="How stories look when you read.">
                <Choice label="Theme" options={["Light", "Sepia", "Dark"]} value={draft.reading.theme} onChange={(v) => sub("reading", { theme: v as Profile["reading"]["theme"] })} />
                <Choice label="Font" options={["Sans", "Serif"]} value={draft.reading.font} onChange={(v) => sub("reading", { font: v as "Sans" | "Serif" })} />
                <Field label={`Text size · ${draft.reading.fontSize}px`}>
                  <input type="range" min={14} max={26} value={draft.reading.fontSize} onChange={(e) => sub("reading", { fontSize: +e.target.value })} className="w-full accent-primary" />
                </Field>
                <Choice label="Line spacing" options={["Compact", "Comfortable", "Airy"]} value={draft.reading.lineSpacing} onChange={(v) => sub("reading", { lineSpacing: v as Profile["reading"]["lineSpacing"] })} />
                <div className="rounded-xl border border-border bg-card p-4" style={{ fontSize: draft.reading.fontSize, lineHeight: { Compact: 1.5, Comfortable: 1.8, Airy: 2.1 }[draft.reading.lineSpacing], fontFamily: draft.reading.font === "Serif" ? "Georgia, serif" : undefined }}>
                  The wind came off the water in long, cold breaths, carrying the smell of salt.
                </div>
                <Toggle label="Go to the next part automatically" checked={draft.reading.autoNext} onChange={(v) => sub("reading", { autoNext: v })} />
                <Toggle label="Hide mature stories" checked={draft.reading.hideMature} onChange={(v) => sub("reading", { hideMature: v })} />
              </Group>
            )}

            {tab === "Writing" && (
              <Group title="Writing environment" desc="Your setup in the writing studio.">
                <Toggle label="Autosave drafts" checked={draft.writing.autosave} onChange={(v) => sub("writing", { autosave: v })} />
                <Toggle label="Focus mode (hide distractions)" checked={draft.writing.focusMode} onChange={(v) => sub("writing", { focusMode: v })} />
                <Toggle label="Show word count" checked={draft.writing.showWordCount} onChange={(v) => sub("writing", { showWordCount: v })} />
                <Field label="Daily word goal">
                  <input type="number" min={0} step={50} value={draft.writing.dailyGoal} onChange={(e) => sub("writing", { dailyGoal: Math.max(0, +e.target.value) })} className={input} />
                </Field>
                <Choice label="Default audience" options={["Everyone", "Teen (13+)", "Mature (18+)"]} value={draft.writing.defaultAudience} onChange={(v) => sub("writing", { defaultAudience: v })} />
              </Group>
            )}

            {tab === "Personal" && (<>
              <Group title="Personal details" desc="Private — only you can see this.">
                <Text label="Email" value={draft.personal.email} onChange={(v) => sub("personal", { email: v })} />
                <Field label="Language">
                  <select value={draft.personal.language} onChange={(e) => sub("personal", { language: e.target.value })} className={input}>
                    {["English", "Español", "Français", "Deutsch", "Português", "हिन्दी"].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </Field>
                <Text label="Time zone" value={draft.personal.timezone} onChange={(v) => sub("personal", { timezone: v })} />
              </Group>
              <Group title="Notifications">
                <Toggle label="Email updates" checked={draft.personal.emailNotifs} onChange={(v) => sub("personal", { emailNotifs: v })} />
                <Toggle label="Comments on my stories" checked={draft.personal.commentNotifs} onChange={(v) => sub("personal", { commentNotifs: v })} />
                <Toggle label="New followers" checked={draft.personal.followNotifs} onChange={(v) => sub("personal", { followNotifs: v })} />
              </Group>
            </>)}

            {tab === "Interests" && (
              <Group title="Interests" desc="Pick what you love — we'll use it to suggest stories.">
                <div className="flex flex-wrap gap-2">
                  {[...genres, "Slow burn", "Found family", "Dragons", "Detective", "Coming-of-age", "Short reads"].map((g) => {
                    const on = draft.interests.includes(g);
                    return (
                      <button key={g} onClick={() => set("interests", on ? draft.interests.filter((x) => x !== g) : [...draft.interests, g])}
                        className={`flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                        {on && <Check className="size-3.5" />}{g}
                      </button>
                    );
                  })}
                </div>
              </Group>
            )}

            <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-full border border-border bg-background/95 p-2 pl-5 backdrop-blur">
              <span className="mr-auto text-sm text-muted-foreground">{saved ? "Saved" : dirty ? "You have unsaved changes" : "All changes saved"}</span>
              <button disabled={!dirty} onClick={() => setDraft(p)} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40">Discard</button>
              <button disabled={!dirty} onClick={save} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40">Save changes</button>
            </div>
          </div>
        </section>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0">
          <div className="h-24 rounded-t-lg bg-muted" />
          <div className="-mt-12 px-6 pb-6">
            <Avatar name={p.name} size="lg" />
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-bold">{p.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">@{p.handle}{p.pronouns && ` · ${p.pronouns}`}</p>
              </div>
              <button className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground">Follow</button>
            </div>
            <DialogDescription className="mt-3 text-foreground">{p.bio}</DialogDescription>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {p.location && <span className="flex items-center gap-1"><MapPin className="size-4" />{p.location}</span>}
              {p.website && <span className="flex items-center gap-1"><Link2 className="size-4" />{p.website}</span>}
            </div>
            <div className="mt-5 flex gap-6 border-y border-border py-4">
              {p.showFollowers && <><Stat n={stats.followers} l="Followers" /><Stat n={stats.following} l="Following" /></>}
              <Stat n={String(stats.writings)} l="Writings" /><Stat n={stats.reads} l="Reads" />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Stories</p>
            <ul className="mt-3 space-y-2">
              {myWorks.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <img src={s.cover} alt="" style={{ filter: "grayscale(1)" }} className="h-12 w-8 rounded object-cover" />
                  <span className="text-sm font-semibold">{s.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{s.reads} reads</span>
                </li>
              ))}
            </ul>
            {p.interests.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {p.interests.map((i) => <span key={i} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{i}</span>)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const input = "w-full rounded-xl border border-input bg-card px-4 py-2.5 outline-none focus:border-primary";

function Avatar({ name, size }: { name: string; size: "lg" }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <div className={`${size === "lg" ? "size-24 text-3xl" : ""} flex shrink-0 items-center justify-center rounded-full border-4 border-background bg-primary font-display font-bold text-primary-foreground`}>{initials || <Pencil />}</div>;
}
function Stat({ n, l }: { n: string; l: string }) {
  return <div><p className="font-display text-xl font-bold">{n}</p><p className="text-xs text-muted-foreground">{l}</p></div>;
}
function Group({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border p-6">
      <h3 className="text-lg font-bold">{title}</h3>
      {desc && <p className="text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>;
}
function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <Field label={label}><input value={value} onChange={(e) => onChange(e.target.value)} className={input} /></Field>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-sm font-medium">{label}</span><Switch checked={checked} onCheckedChange={onChange} aria-label={label} /></div>;
}
function Choice({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      <div className="inline-flex flex-wrap rounded-full bg-muted p-1">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${o === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}
