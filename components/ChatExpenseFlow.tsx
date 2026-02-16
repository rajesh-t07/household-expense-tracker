'use client';

import { useEffect, useMemo, useState } from 'react';
import { categories } from '@/lib/validators';

type Msg = { role: 'assistant' | 'user'; text: string };

type Step = 'month' | 'mode' | 'merchant' | 'category' | 'amount' | 'tax' | 'confirm';

type Draft = {
  date: string;
  mode: 'simple' | 'itemized';
  merchant?: string;
  category?: string;
  simpleTotal?: number;
  taxTotal?: number;
  items?: { name: string; quantity: number; unitPrice: number }[];
};

function promptFor(step: Step, mode: Draft['mode']) {
  if (step === 'month') return 'Which date is this expense for? (YYYY-MM-DD)';
  if (step === 'mode') return 'Would you like simple total or itemized entries?';
  if (step === 'merchant') return 'Who is the merchant?';
  if (step === 'category') return 'Select a category.';
  if (step === 'amount') return mode === 'itemized' ? 'Enter items as name,qty,price separated by ;' : 'What is the subtotal amount (before tax)?';
  if (step === 'tax') return 'Tax amount?';
  return 'Ready to save this expense?';
}

export function ChatExpenseFlow({ householdId }: { householdId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [step, setStep] = useState<Step>('month');
  const [draft, setDraft] = useState<Draft>({ date: new Date().toISOString().slice(0, 10), mode: 'simple' });
  const [input, setInput] = useState('');

  useEffect(() => {
    const local = localStorage.getItem(`chat:${householdId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setMessages(parsed.messages || []);
        setStep(parsed.step || 'month');
        setDraft(parsed.draft || { date: new Date().toISOString().slice(0, 10), mode: 'simple' });
      } catch {
        localStorage.removeItem(`chat:${householdId}`);
      }
    }

    fetch(`/api/households/${householdId}/chat`)
      .then((r) => r.json())
      .then((state) => {
        if (Array.isArray(state.messages)) {
          setMessages(state.messages);
          setStep(state.step || 'month');
          setDraft(state.draft || { date: new Date().toISOString().slice(0, 10), mode: 'simple' });
        }
      });
  }, [householdId]);

  useEffect(() => {
    if (!messages.length) return;
    fetch(`/api/households/${householdId}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step, draft, messages })
    });
    localStorage.setItem(`chat:${householdId}`, JSON.stringify({ step, draft, messages }));
  }, [draft, householdId, messages, step]);

  const prompt = useMemo(() => promptFor(step, draft.mode), [step, draft.mode]);

  const append = (role: Msg['role'], text: string) => setMessages((m) => [...m, { role, text }]);

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    append('user', trimmed);

    let nextStep: Step = step;
    let nextMode = draft.mode;

    if (step === 'month') {
      setDraft((d) => ({ ...d, date: trimmed }));
      nextStep = 'mode';
      setStep(nextStep);
    } else if (step === 'mode') {
      nextMode = trimmed.toLowerCase().includes('item') ? 'itemized' : 'simple';
      setDraft((d) => ({ ...d, mode: nextMode }));
      nextStep = 'merchant';
      setStep(nextStep);
    } else if (step === 'merchant') {
      setDraft((d) => ({ ...d, merchant: trimmed }));
      nextStep = 'category';
      setStep(nextStep);
    } else if (step === 'category') {
      setDraft((d) => ({ ...d, category: trimmed }));
      nextStep = 'amount';
      setStep(nextStep);
    } else if (step === 'amount') {
      if (draft.mode === 'itemized') {
        const items = trimmed
          .split(';')
          .map((raw) => {
            const [name, qty, price] = raw.split(',');
            return {
              name: (name || '').trim(),
              quantity: Number(qty),
              unitPrice: Number(price)
            };
          })
          .filter((item) => item.name && Number.isFinite(item.quantity) && item.quantity >= 1 && Number.isFinite(item.unitPrice) && item.unitPrice >= 0);
        setDraft((d) => ({ ...d, items }));
      } else {
        setDraft((d) => ({ ...d, simpleTotal: Number(trimmed) }));
      }
      nextStep = 'tax';
      setStep(nextStep);
    } else if (step === 'tax') {
      setDraft((d) => ({ ...d, taxTotal: Number(trimmed) }));
      nextStep = 'confirm';
      setStep(nextStep);
    } else if (step === 'confirm') {
      if (trimmed.toLowerCase().startsWith('y')) {
        const response = await fetch(`/api/households/${householdId}/expenses`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(draft)
        });

        if (response.ok) {
          append('assistant', 'Saved ✅');
          setDraft({ date: new Date().toISOString().slice(0, 10), mode: 'simple' });
          nextStep = 'month';
          nextMode = 'simple';
          setStep(nextStep);
        } else {
          append('assistant', 'Could not save expense. Please review your answers and try again.');
        }
      } else {
        append('assistant', 'Okay, let’s restart this entry.');
        setDraft({ date: new Date().toISOString().slice(0, 10), mode: 'simple' });
        nextStep = 'month';
        nextMode = 'simple';
        setStep(nextStep);
      }
    }

    append('assistant', promptFor(nextStep, nextMode));
  };

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 h-80 space-y-3 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={`${msg.role}-${idx}`} className={msg.role === 'assistant' ? 'text-left' : 'text-right'}>
            <span className={`inline-block rounded-xl px-3 py-2 ${msg.role === 'assistant' ? 'bg-slate-200' : 'bg-blue-600 text-white'}`}>
              {msg.text}
            </span>
          </div>
        ))}
        <p className="text-sm text-slate-500">{prompt}</p>
      </div>
      {step === 'category' ? (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button key={cat} type="button" className="rounded border px-3 py-1 text-sm" onClick={() => handleSubmit(cat)}>
              {cat}
            </button>
          ))}
        </div>
      ) : step === 'mode' ? (
        <div className="flex gap-2">
          <button type="button" className="rounded bg-slate-900 px-3 py-1 text-white" onClick={() => handleSubmit('simple')}>
            Simple total
          </button>
          <button type="button" className="rounded bg-slate-900 px-3 py-1 text-white" onClick={() => handleSubmit('itemized')}>
            Itemized
          </button>
        </div>
      ) : step === 'confirm' ? (
        <div className="flex gap-2">
          <button type="button" className="rounded bg-green-700 px-3 py-1 text-white" onClick={() => handleSubmit('yes')}>
            Yes, save
          </button>
          <button type="button" className="rounded border px-3 py-1" onClick={() => handleSubmit('no')}>
            No
          </button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
            setInput('');
          }}
        >
          <input className="w-full rounded border px-3 py-2" value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">
            Send
          </button>
        </form>
      )}
    </div>
  );
}
