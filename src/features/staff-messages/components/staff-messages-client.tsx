"use client";

import { StaffCalendarKeyForm } from "@/features/staff-calendar/components/staff-calendar-key-form";
import { Link } from "@/i18n/navigation";
import type { MessageLogEntry } from "@/lib/guest-messages/log";
import { renderTemplate, type MessageValues } from "@/lib/guest-messages/render";
import type { GuestMessagesSettings, MessageTemplate } from "@/lib/guest-messages/settings";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const DEFAULT_KEY = "relief-demo-2026";
const SESSION_STORAGE_KEY = "demo-dashboard-key";
const inputClass = "h-9 w-full rounded-lg border border-border bg-background px-2 text-sm";

const SAMPLE: MessageValues = {
  firstName: "Ada",
  lastName: "Okafor",
  checkIn: "2026-12-18",
  checkOut: "2026-12-21",
  nights: "3",
  roomType: "Executive Room",
  roomNumbers: "201",
  manageLink: "https://www.reliefhotelsandsuites.com/booking/manage?id=…",
  reviewLink: "https://maps.google.com/…",
  hotelName: "Relief Hotels & Suites",
  hotelPhone: "+234 912 478 4058",
};

type Loaded = {
  settings: GuestMessagesSettings;
  log: MessageLogEntry[];
  placeholders: string[];
  scheduled: boolean;
};

export function StaffMessagesClient() {
  const t = useTranslations("staffMessages");
  const searchParams = useSearchParams();
  const [key, setKey] = useState<string | null>(null);
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(
      searchParams.get("key") ??
        (typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_STORAGE_KEY) : null) ??
        DEFAULT_KEY,
    );
  }, [searchParams]);

  const q = key ? `?key=${encodeURIComponent(key)}` : "";

  const load = useCallback(async () => {
    if (key === null) return;
    setLoading(true);
    const res = await fetch(`/api/staff/settings/messages${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      setError(res.status === 401 ? "Invalid dashboard key." : res.status === 403 ? "Your role cannot do this." : body?.error ?? t("loadError"));
      return;
    }
    setError(null);
    setData(body as Loaded);
  }, [key, q, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(next: GuestMessagesSettings): Promise<string | null> {
    const res = await fetch(`/api/staff/settings/messages${q}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return `${body?.error ?? t("saveError")}${body?.issues ? `: ${body.issues.join("; ")}` : ""}`;
    setData((prev) => (prev ? { ...prev, settings: body.settings } : prev));
    setSaved(true);
    return null;
  }

  async function sendTest(template: MessageTemplate, to: string): Promise<string> {
    const res = await fetch(`/api/staff/settings/messages/test${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template, to }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return body?.error ?? t("testFailed");
    return t(`testStatus.${body.status}`);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
      <Link
        href={{ pathname: "/staff", query: key ? { key } : undefined }}
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-teal"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("backToPortal")}
      </Link>
      <p className="text-sm uppercase tracking-[0.22em] text-teal">{t("eyebrow")}</p>
      <h1 className="font-serif text-3xl font-medium sm:text-4xl">{t("title")}</h1>
      <p className="mt-2 mb-8 text-muted">{t("subtitle")}</p>
      {key !== null && (
        <StaffCalendarKeyForm
          key={key}
          initialKey={key}
          loading={loading}
          onSubmit={(next) => {
            window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
            setKey(next);
          }}
          placeholder={t("keyPlaceholder")}
          submitLabel={t("unlock")}
        />
      )}
      {error ? <p className="mb-6 text-sm text-red-600">{error}</p> : null}
      {data && !data.scheduled ? (
        <p className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          {t("notScheduled")}
        </p>
      ) : null}
      {data ? (
        <>
          <TemplatesForm
            key={JSON.stringify(data.settings)}
            initial={data.settings}
            placeholders={data.placeholders}
            saved={saved}
            onEdit={() => setSaved(false)}
            onSave={save}
            onTest={sendTest}
          />
          <section className="mt-10" aria-labelledby="sent-log">
            <h2 id="sent-log" className="mb-3 font-serif text-xl font-medium">{t("logTitle")}</h2>
            {data.log.length === 0 ? (
              <p className="text-sm text-muted">{t("logEmpty")}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-muted">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 font-medium">{t("logWhen")}</th>
                      <th className="px-3 py-2 font-medium">{t("logTemplate")}</th>
                      <th className="px-3 py-2 font-medium">{t("logTo")}</th>
                      <th className="px-3 py-2 font-medium">{t("logStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.log.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 tabular-nums">{entry.createdAt.slice(0, 16).replace("T", " ")}</td>
                        <td className="px-3 py-2">{data.settings.templates.find((tpl) => tpl.id === entry.templateId)?.name ?? entry.templateId}</td>
                        <td className="px-3 py-2">{entry.recipient}</td>
                        <td className="px-3 py-2">{t(`status.${entry.status}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function TemplatesForm({
  initial,
  placeholders,
  saved,
  onEdit,
  onSave,
  onTest,
}: {
  initial: GuestMessagesSettings;
  placeholders: string[];
  saved: boolean;
  onEdit: () => void;
  onSave: (s: GuestMessagesSettings) => Promise<string | null>;
  onTest: (template: MessageTemplate, to: string) => Promise<string>;
}) {
  const t = useTranslations("staffMessages");
  const [templates, setTemplates] = useState(initial.templates);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(index: number, change: Partial<MessageTemplate>) {
    setTemplates((prev) => prev.map((tpl, i) => (i === index ? { ...tpl, ...change } : tpl)));
    setStatus(null);
    onEdit();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(await onSave({ templates }));
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="text-xs text-muted">
        {t("placeholdersHint")} {placeholders.map((p) => `{${p}}`).join(" ")}
      </p>
      {templates.map((tpl, index) => (
        <TemplateCard
          key={tpl.id}
          template={tpl}
          onChange={(change) => update(index, change)}
          onRemove={() => {
            setTemplates((prev) => prev.filter((_, i) => i !== index));
            onEdit();
          }}
          onTest={onTest}
        />
      ))}
      <button
        type="button"
        onClick={() => {
          setTemplates((prev) => [
            ...prev,
            {
              id: `message-${Date.now()}`,
              name: t("newName"),
              channel: "email",
              base: "check_in",
              timing: "before",
              days: 1,
              subject: t("newSubject"),
              body: t("newBody"),
              active: false,
            },
          ]);
          onEdit();
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:border-teal"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {t("add")}
      </button>
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <button type="submit" disabled={saving} className="h-10 rounded-lg bg-teal px-5 text-sm font-medium text-gray-950 disabled:opacity-60">
          {saving ? t("saving") : t("save")}
        </button>
        {status ? (
          <span className="text-sm text-red-600">{status}</span>
        ) : saved ? (
          <span className="text-sm text-teal-dark" role="status">{t("saved")}</span>
        ) : null}
      </div>
    </form>
  );
}

function TemplateCard({
  template,
  onChange,
  onRemove,
  onTest,
}: {
  template: MessageTemplate;
  onChange: (change: Partial<MessageTemplate>) => void;
  onRemove: () => void;
  onTest: (template: MessageTemplate, to: string) => Promise<string>;
}) {
  const t = useTranslations("staffMessages");
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const id = template.id;

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card/50 p-5" aria-label={template.name}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id={`name-${id}`}
          aria-label={t("name")}
          value={template.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 font-medium"
        />
        <label className="flex items-center gap-2 text-sm">
          <input id={`active-${id}`} type="checkbox" className="h-4 w-4 accent-teal" checked={template.active} onChange={(e) => onChange({ active: e.target.checked })} />
          {t("active")}
        </label>
        <button type="button" onClick={onRemove} aria-label={t("remove")} className="rounded p-1.5 text-muted hover:text-red-600">
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select id={`channel-${id}`} aria-label={t("channel")} value={template.channel} onChange={(e) => onChange({ channel: e.target.value as MessageTemplate["channel"] })} className="h-9 rounded-lg border border-border bg-background px-2">
          <option value="email">{t("email")}</option>
          <option value="sms">{t("sms")}</option>
          <option value="whatsapp">{t("whatsapp")}</option>
        </select>
        <input id={`days-${id}`} aria-label={t("days")} type="number" min={0} max={60} value={template.days} onChange={(e) => onChange({ days: Math.max(0, Math.min(60, Number(e.target.value) || 0)) })} className="h-9 w-16 rounded-lg border border-border bg-background px-2" />
        <span>{t("daysWord")}</span>
        <select id={`timing-${id}`} aria-label={t("timing")} value={template.timing} onChange={(e) => onChange({ timing: e.target.value as MessageTemplate["timing"] })} className="h-9 rounded-lg border border-border bg-background px-2">
          <option value="before">{t("before")}</option>
          <option value="after">{t("after")}</option>
        </select>
        <select id={`base-${id}`} aria-label={t("base")} value={template.base} onChange={(e) => onChange({ base: e.target.value as MessageTemplate["base"] })} className="h-9 rounded-lg border border-border bg-background px-2">
          <option value="check_in">{t("checkIn")}</option>
          <option value="check_out">{t("checkOut")}</option>
          <option value="booking">{t("booking")}</option>
        </select>
      </div>
      {template.channel === "email" ? (
        <input id={`subject-${id}`} aria-label={t("subject")} placeholder={t("subject")} value={template.subject} onChange={(e) => onChange({ subject: e.target.value })} className={inputClass} />
      ) : (
        <p className="text-xs text-muted">{template.channel === "whatsapp" ? t("whatsappHint") : t("smsHint")}</p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <textarea id={`body-${id}`} aria-label={t("body")} rows={9} value={template.body} onChange={(e) => onChange({ body: e.target.value })} className="w-full rounded-lg border border-border bg-background p-2 text-sm" />
        <div className="min-w-0 rounded-lg border border-dashed border-border p-3 text-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">{t("preview")}</p>
          {template.channel === "email" ? <p className="mb-2 font-medium">{renderTemplate(template.subject, SAMPLE)}</p> : null}
          <p className="whitespace-pre-line break-words">{renderTemplate(template.body, SAMPLE)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`test-to-${id}`}
          aria-label={t("testTo")}
          placeholder={template.channel === "email" ? t("testEmail") : t("testPhone")}
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-2 text-sm sm:max-w-xs"
        />
        <button
          type="button"
          disabled={testing || testTo.trim().length < 5}
          onClick={async () => {
            setTesting(true);
            setTestResult(await onTest(template, testTo.trim()));
            setTesting(false);
          }}
          className="h-9 rounded-lg border border-border px-3 text-sm hover:border-teal disabled:opacity-50"
        >
          {testing ? t("sending") : t("sendTest")}
        </button>
        {testResult ? <span className="text-xs text-muted">{testResult}</span> : null}
      </div>
    </section>
  );
}
