"use client";
import { useState } from "react";
import { isValidPhone, todayStr } from "@/lib/format";

export interface CustomerValues {
  name: string;
  phone: string;
  address: string;
  note: string;
  followUp: string;
}

interface Props {
  initial?: CustomerValues;
  submitLabel: string;
  onSubmit: (v: CustomerValues) => void;
}

export default function CustomerForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [followUp, setFollowUp] = useState(initial?.followUp ?? "");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("গ্রাহকের নাম লিখুন।");
      return;
    }
    if (phone.trim() && !isValidPhone(phone)) {
      setError("ফোন নম্বরটি সঠিক নয়। যেমন: 01712345678");
      return;
    }
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim(),
      followUp,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label" htmlFor="cf-name">
          নাম *
        </label>
        <input
          id="cf-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="যেমন: রিনা বেগম"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="label" htmlFor="cf-phone">
          মোবাইল নম্বর
        </label>
        <input
          id="cf-phone"
          className="input"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="label" htmlFor="cf-addr">
          ঠিকানা
        </label>
        <input
          id="cf-addr"
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="এলাকা / জেলা"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="label" htmlFor="cf-note">
          নোট
        </label>
        <textarea
          id="cf-note"
          className="input min-h-[72px]"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="যেমন: গোল্ড কালার পছন্দ করেন"
        />
      </div>
      <div>
        <label className="label" htmlFor="cf-fu">
          ফলো-আপের তারিখ (ঐচ্ছিক)
        </label>
        <input
          id="cf-fu"
          className="input"
          type="date"
          min={todayStr()}
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
        />
      </div>
      {error && (
        <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <button type="submit" className="btn btn-primary w-full">
        {submitLabel}
      </button>
    </form>
  );
}
