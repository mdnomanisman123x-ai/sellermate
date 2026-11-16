"use client";
import { useState } from "react";
import { parseAmount, todayStr } from "@/lib/format";

interface Props {
  type: "order" | "payment";
  onSubmit: (v: { amount: number; note: string; date: string }) => void;
}

export default function TxnForm({ type, onSubmit }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [error, setError] = useState("");
  const isOrder = type === "order";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseAmount(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("সঠিক টাকার পরিমাণ লিখুন।");
      return;
    }
    onSubmit({ amount: n, note: note.trim(), date: date || todayStr() });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label" htmlFor="tf-amount">
          {isOrder ? "বিক্রির পরিমাণ (৳)" : "কত টাকা পেলেন (৳)"}
        </label>
        <input
          id="tf-amount"
          className="input text-2xl font-bold"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          autoFocus
          autoComplete="off"
        />
      </div>
      <div>
        <label className="label" htmlFor="tf-note">
          {isOrder ? "কী বিক্রি করলেন (ঐচ্ছিক)" : "নোট (ঐচ্ছিক)"}
        </label>
        <input
          id="tf-note"
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={isOrder ? "যেমন: গোল্ড প্লেটেড নেকলেস" : "যেমন: বিকাশে পেয়েছি"}
          autoComplete="off"
        />
      </div>
      <div>
        <label className="label" htmlFor="tf-date">
          তারিখ
        </label>
        <input
          id="tf-date"
          className="input"
          type="date"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      {error && (
        <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <button type="submit" className={`btn w-full ${isOrder ? "btn-primary" : "btn-gold"}`}>
        {isOrder ? "বিক্রি যোগ করুন" : "টাকা জমা করুন"}
      </button>
    </form>
  );
}
