"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  { id: "physics", label: "Physics" },
  { id: "chemistry", label: "Chemistry" },
  { id: "math", label: "Math" },
  { id: "biology", label: "Biology" },
] as const;

const MOCK_RANGES = ["0–50", "50–100", "100–150", "150–200", "200–250", "250–300", "300+"];

type Form = {
  class: "class_11" | "class_12" | "dropper" | "";
  target_exam: string[];
  target_year: number;
  coaching_enrolled: boolean;
  coaching_name: string;
  strong_subjects: string[];
  weak_subjects: string[];
  mock_score_range: string;
  daily_study_hours: number;
  school_load: "light" | "medium" | "heavy" | "";
  previous_attempt_score: string;
  previous_mistakes: string;
  emotional_state: string;
  goals: string;
};

const initial: Form = {
  class: "",
  target_exam: [],
  target_year: new Date().getFullYear() + 1,
  coaching_enrolled: false,
  coaching_name: "",
  strong_subjects: [],
  weak_subjects: [],
  mock_score_range: "",
  daily_study_hours: 4,
  school_load: "",
  previous_attempt_score: "",
  previous_mistakes: "",
  emotional_state: "",
  goals: "",
};

const STORAGE_KEY = "preppilot.onboarding";

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<Form>(initial);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setForm({ ...initial, ...JSON.parse(raw) });
    } catch {}
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {}
  }, [form]);

  const isDropper = form.class === "dropper";
  const totalSteps = 5;

  const canContinue = (): boolean => {
    if (step === 0) return form.class !== "";
    if (step === 1) return form.target_exam.length > 0 && form.target_year > 0;
    if (step === 2) {
      const overlap = form.strong_subjects.filter((s) => form.weak_subjects.includes(s));
      return form.strong_subjects.length > 0 && form.weak_subjects.length > 0 && overlap.length === 0;
    }
    if (step === 3) {
      if (!form.mock_score_range) return false;
      if (!isDropper && !form.school_load) return false;
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload: Record<string, unknown> = {
      class: form.class,
      target_exam: form.target_exam,
      target_year: form.target_year,
      coaching: { enrolled: form.coaching_enrolled, name: form.coaching_name || undefined },
      strong_subjects: form.strong_subjects,
      weak_subjects: form.weak_subjects,
      mock_score_range: form.mock_score_range,
      daily_study_hours: form.daily_study_hours,
    };
    if (!isDropper && form.school_load) payload.school_load = form.school_load;
    if (isDropper && form.previous_attempt_score) {
      const n = Number.parseInt(form.previous_attempt_score, 10);
      if (!Number.isNaN(n)) payload.previous_attempt_score = n;
    }
    if (isDropper && form.previous_mistakes) payload.previous_mistakes = form.previous_mistakes;
    if (form.emotional_state) payload.emotional_state = form.emotional_state;
    if (form.goals) payload.goals = form.goals;

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? `Error ${res.status}`);
        setSubmitting(false);
        return;
      }
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      router.replace("/chat");
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  };

  const toggle = (arr: string[], v: string): string[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick onboarding</CardTitle>
        <CardDescription>Step {step + 1} of {totalSteps}</CardDescription>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
          <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 0 && (
          <div className="space-y-4">
            <Label>Where are you in your journey?</Label>
            <RadioGroup value={form.class} onValueChange={(v) => setForm((f) => ({ ...f, class: v as Form["class"] }))} className="grid gap-3">
              {[
                { id: "class_11", label: "Class 11", desc: "Just starting out, balancing school" },
                { id: "class_12", label: "Class 12", desc: "Boards + entrance, intense year" },
                { id: "dropper", label: "Dropper", desc: "Took a year off to retry" },
              ].map((opt) => (
                <label key={opt.id} className={cn("flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-accent", form.class === opt.id && "border-primary bg-accent")}>
                  <RadioGroupItem value={opt.id} className="mt-1" />
                  <div>
                    <div className="font-medium">{opt.label}</div>
                    <div className="text-sm text-muted-foreground">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Target exam(s)</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "jee_main", label: "JEE Main" },
                  { id: "jee_advanced", label: "JEE Advanced" },
                  { id: "neet", label: "NEET" },
                ].map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, target_exam: toggle(f.target_exam, e.id) }))}
                    className={cn("px-3 py-1.5 text-sm rounded-full border transition-colors", form.target_exam.includes(e.id) ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent")}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Target year</Label>
              <Input id="year" type="number" min={2024} max={2035} value={form.target_year} onChange={(e) => setForm((f) => ({ ...f, target_year: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Checkbox checked={form.coaching_enrolled} onCheckedChange={(v) => setForm((f) => ({ ...f, coaching_enrolled: v === true }))} />
                <span>I&apos;m enrolled in coaching</span>
              </Label>
              {form.coaching_enrolled && (
                <Input placeholder="Coaching name (Allen, FIITJEE, PW, etc.)" value={form.coaching_name} onChange={(e) => setForm((f) => ({ ...f, coaching_name: e.target.value }))} />
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Strong subjects</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => setForm((f) => ({ ...f, strong_subjects: toggle(f.strong_subjects, s.id) }))}
                    className={cn("px-3 py-1.5 text-sm rounded-full border", form.strong_subjects.includes(s.id) ? "bg-green-600 text-white border-green-600" : "bg-background hover:bg-accent")}
                  >{s.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Weak subjects</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => setForm((f) => ({ ...f, weak_subjects: toggle(f.weak_subjects, s.id) }))}
                    className={cn("px-3 py-1.5 text-sm rounded-full border", form.weak_subjects.includes(s.id) ? "bg-red-600 text-white border-red-600" : "bg-background hover:bg-accent")}
                  >{s.label}</button>
                ))}
              </div>
              {form.strong_subjects.some((s) => form.weak_subjects.includes(s)) && (
                <p className="text-xs text-destructive">A subject can&apos;t be both strong and weak.</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Daily study hours available: <span className="font-semibold">{form.daily_study_hours}h</span></Label>
              <Slider min={1} max={14} step={1} value={[form.daily_study_hours]} onValueChange={(v) => setForm((f) => ({ ...f, daily_study_hours: v[0] }))} />
            </div>
            <div className="space-y-2">
              <Label>Current mock score range</Label>
              <div className="flex flex-wrap gap-2">
                {MOCK_RANGES.map((r) => (
                  <button key={r} type="button"
                    onClick={() => setForm((f) => ({ ...f, mock_score_range: r }))}
                    className={cn("px-3 py-1.5 text-sm rounded-full border", form.mock_score_range === r ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent")}
                  >{r}</button>
                ))}
              </div>
            </div>
            {!isDropper && (
              <div className="space-y-2">
                <Label>School/college load</Label>
                <RadioGroup value={form.school_load} onValueChange={(v) => setForm((f) => ({ ...f, school_load: v as Form["school_load"] }))} className="flex gap-3">
                  {[
                    { id: "light", label: "Light" },
                    { id: "medium", label: "Medium" },
                    { id: "heavy", label: "Heavy" },
                  ].map((opt) => (
                    <label key={opt.id} className={cn("flex items-center gap-2 px-4 py-2 rounded-md border cursor-pointer", form.school_load === opt.id && "border-primary bg-accent")}>
                      <RadioGroupItem value={opt.id} />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}
            {isDropper && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="prev_score">Previous JEE attempt score (optional)</Label>
                  <Input id="prev_score" type="number" min={0} max={360} value={form.previous_attempt_score} onChange={(e) => setForm((f) => ({ ...f, previous_attempt_score: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prev_mistakes">What went wrong last year? (optional)</Label>
                  <Textarea id="prev_mistakes" rows={3} placeholder="Backlogs, weak revision, exam anxiety, poor question selection…" value={form.previous_mistakes} onChange={(e) => setForm((f) => ({ ...f, previous_mistakes: e.target.value }))} />
                </div>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="goals">Your goal in your own words (optional)</Label>
              <Textarea id="goals" rows={3} placeholder="e.g., Crack JEE Advanced with rank under 5000 while keeping boards above 90%" value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emo">How are you feeling about your prep right now? (optional)</Label>
              <Textarea id="emo" rows={2} placeholder="Stressed, hopeful, lost, confident — anything you want me to know" value={form.emotional_state} onChange={(e) => setForm((f) => ({ ...f, emotional_state: e.target.value }))} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < totalSteps - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue()}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Saving…" : "Finish & open chat"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
