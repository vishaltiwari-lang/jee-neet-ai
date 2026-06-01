"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

type Profile = {
  class: string;
  target_exam: string[];
  target_year: number;
  coaching: { enrolled: boolean; name?: string };
  strong_subjects: string[];
  weak_subjects: string[];
  mock_score_range: string;
  daily_study_hours: number;
  school_load: string | null;
  previous_attempt_score: number | null;
  previous_mistakes: string | null;
  emotional_state: string | null;
  goals: string | null;
};

const SUBJECTS = ["physics", "chemistry", "math", "biology"] as const;
const MOCK_RANGES = ["0–50", "50–100", "100–150", "150–200", "200–250", "250–300", "300+"];

export default function ProfileView({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Profile>(profile);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        daily_study_hours: draft.daily_study_hours,
        mock_score_range: draft.mock_score_range,
        strong_subjects: draft.strong_subjects,
        weak_subjects: draft.weak_subjects,
        goals: draft.goals,
        emotional_state: draft.emotional_state,
        previous_mistakes: draft.previous_mistakes,
        school_load: draft.school_load ?? undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      alert("Save failed");
    }
  };

  const retakeOnboarding = async () => {
    if (!confirm("Retake the onboarding flow?")) return;
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ __reset_onboarding: true }),
    });
    if (res.ok) router.replace("/onboarding");
  };

  const deleteAccount = async () => {
    if (!confirm("This wipes ALL your chats, plans, and profile. Continue?")) return;
    if (!confirm("Are you absolutely sure? This cannot be undone.")) return;
    alert("Use the Clerk user menu to delete your account. Your data is wiped automatically via webhook.");
  };

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Class" value={profile.class.replace("_", " ")} />
          <Row label="Target exam(s)" value={profile.target_exam.map((e) => e.replace("_", " ")).join(", ")} />
          <Row label="Target year" value={String(profile.target_year)} />
          <Row label="Coaching" value={profile.coaching.enrolled ? profile.coaching.name || "Yes" : "Self-study"} />
          <p className="text-xs text-muted-foreground pt-2">
            To change class/exam/coaching, retake the onboarding (bottom of page).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Editable</CardTitle>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => { setDraft(profile); setEditing(true); }}>Edit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!editing ? (
            <>
              <Row label="Strong subjects" value={profile.strong_subjects.join(", ") || "—"} />
              <Row label="Weak subjects" value={profile.weak_subjects.join(", ") || "—"} />
              <Row label="Mock score range" value={profile.mock_score_range} />
              <Row label="Daily hours" value={`${profile.daily_study_hours}h`} />
              {profile.school_load && <Row label="School load" value={profile.school_load} />}
              {profile.previous_mistakes && <Row label="Past mistakes" value={profile.previous_mistakes} />}
              {profile.goals && <Row label="Goals" value={profile.goals} />}
              {profile.emotional_state && <Row label="Current state" value={profile.emotional_state} />}
            </>
          ) : (
            <>
              <Field label="Strong subjects">
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <button key={s} type="button"
                      onClick={() => setDraft((d) => ({ ...d, strong_subjects: toggle(d.strong_subjects, s) }))}
                      className={`px-3 py-1 rounded-full border text-xs ${draft.strong_subjects.includes(s) ? "bg-green-600 text-white border-green-600" : "bg-background"}`}
                    >{s}</button>
                  ))}
                </div>
              </Field>
              <Field label="Weak subjects">
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <button key={s} type="button"
                      onClick={() => setDraft((d) => ({ ...d, weak_subjects: toggle(d.weak_subjects, s) }))}
                      className={`px-3 py-1 rounded-full border text-xs ${draft.weak_subjects.includes(s) ? "bg-red-600 text-white border-red-600" : "bg-background"}`}
                    >{s}</button>
                  ))}
                </div>
              </Field>
              <Field label="Mock score range">
                <div className="flex flex-wrap gap-2">
                  {MOCK_RANGES.map((r) => (
                    <button key={r} type="button"
                      onClick={() => setDraft((d) => ({ ...d, mock_score_range: r }))}
                      className={`px-3 py-1 rounded-full border text-xs ${draft.mock_score_range === r ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                    >{r}</button>
                  ))}
                </div>
              </Field>
              <Field label={`Daily hours: ${draft.daily_study_hours}h`}>
                <Slider min={1} max={14} step={1} value={[draft.daily_study_hours]} onValueChange={(v) => setDraft((d) => ({ ...d, daily_study_hours: v[0] }))} />
              </Field>
              <Field label="Goals">
                <Textarea rows={2} value={draft.goals ?? ""} onChange={(e) => setDraft((d) => ({ ...d, goals: e.target.value }))} />
              </Field>
              <Field label="Current state of mind">
                <Textarea rows={2} value={draft.emotional_state ?? ""} onChange={(e) => setDraft((d) => ({ ...d, emotional_state: e.target.value }))} />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Other</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={retakeOnboarding}>Retake onboarding</Button>
          <div className="pt-2 border-t mt-2">
            <p className="text-xs text-muted-foreground mb-2">Danger zone</p>
            <Button variant="destructive" size="sm" onClick={deleteAccount}>Delete my account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
