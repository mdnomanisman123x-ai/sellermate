"use client";
import { useState } from "react";
import { ErrorBox, Field } from "@/components/ui";
import { errMsg } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { isValidPhone, cleanPhone } from "@/lib/nums";
import type { Customer } from "@/lib/types";
import { useWorkspace } from "@/lib/workspace";

export default function CustomerForm({ existing, onSaved }: { existing?: Customer; onSaved: () => void }) {
  const { t } = useI18n();
  const { supabase, ws } = useWorkspace();
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [segment, setSegment] = useState<Customer["segment"]>(existing?.segment ?? "new");
  const [isLead, setIsLead] = useState(existing?.is_lead ?? false);
  const [followUp, setFollowUp] = useState(existing?.follow_up ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError(t("cust.errName"));
    if (phone.trim() && !isValidPhone(phone)) return setError(t("cust.errPhone"));
    setBusy(true);
    const row = {
      name: name.trim(),
      phone: cleanPhone(phone),
      address: address.trim(),
      note: note.trim(),
      segment,
      is_lead: isLead,
      follow_up: followUp || null,
    };
    const { error: err } = existing
      ? await supabase.from("customers").update(row).eq("id", existing.id)
      : await supabase.from("customers").insert({ ...row, workspace_id: ws.id });
    setBusy(false);
    if (err) return setError(errMsg(err, t));
    onSaved();
  }

  return (
    <form onSubmit={save} className="space-y-3" noValidate>
      <Field label={t("cust.name")} htmlFor="cn">
        <input id="cn" className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t("cust.phone")} htmlFor="cp">
        <input id="cp" className="input" inputMode="tel" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <Field label={t("cust.address")} htmlFor="ca">
        <input id="ca" className="input" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("cust.segment")} htmlFor="cs">
          <select id="cs" className="input" value={segment} onChange={(e) => setSegment(e.target.value as Customer["segment"])}>
            {(["new", "regular", "vip", "wholesale"] as const).map((s) => (
              <option key={s} value={s}>
                {t(`seg.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("cust.followUp")} htmlFor="cf">
          <input id="cf" className="input" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isLead} onChange={(e) => setIsLead(e.target.checked)} />
        {t("cust.isLead")}
      </label>
      <Field label={t("cust.note")} htmlFor="cno">
        <textarea id="cno" className="input min-h-[70px]" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ErrorBox message={error} />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? t("common.wait") : t("common.save")}
      </button>
    </form>
  );
}
