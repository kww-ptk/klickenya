'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PropertyEnquiryFormProps {
  propertyId: string;
  propertyTitle: string;
  agentName?: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const inputClasses =
  'w-full px-3.5 py-3 border-[1.5px] border-border rounded-[10px] text-[14px] text-text bg-white outline-none focus:border-purple2 transition-colors';

function PropertyEnquiryForm({ propertyId, propertyTitle, agentName }: PropertyEnquiryFormProps) {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    message: `Hi${agentName ? ` ${agentName}` : ''}, I'm interested in "${propertyTitle}". Please send me more details.`,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/real-estate/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, propertyId }),
      });

      if (!res.ok) throw new Error('Failed to send enquiry');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <div className="size-12 rounded-full bg-green/15 flex items-center justify-center mx-auto mb-3">
          <span className="text-[20px]">✓</span>
        </div>
        <h4 className="text-[16px] font-bold text-text mb-1">Enquiry sent!</h4>
        <p className="text-[13px] text-text2 leading-[1.5]">
          {agentName ? `${agentName} will` : 'The agent will'} get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Your name"
        className={inputClasses}
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email address"
        className={inputClasses}
        value={form.email}
        onChange={(e) => update('email', e.target.value)}
        required
      />
      <input
        type="tel"
        placeholder="Phone number"
        className={inputClasses}
        value={form.phone}
        onChange={(e) => update('phone', e.target.value)}
      />
      <textarea
        placeholder="Your message"
        rows={4}
        className={cn(inputClasses, 'resize-none')}
        value={form.message}
        onChange={(e) => update('message', e.target.value)}
        required
      />

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3.5 rounded-[16px] bg-purple2 text-white text-[14.5px] font-bold shadow-[0_4px_14px_rgba(139,77,171,0.35)] hover:bg-[#9B5ABF] hover:-translate-y-0.5 transition-all disabled:opacity-50"
      >
        {status === 'loading' ? 'Sending...' : 'Send enquiry'}
      </button>

      {status === 'error' && (
        <p className="text-[12px] text-red-500 text-center">
          Something went wrong. Please try again.
        </p>
      )}

      <p className="text-[11.5px] text-text3 text-center leading-[1.5]">
        You won&apos;t be charged. The agent will contact you directly.
      </p>
    </form>
  );
}

export { PropertyEnquiryForm };
export type { PropertyEnquiryFormProps };
