'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props =
    | { kind: 'finalize'; jobNumber: string; canAct: boolean }
    | { kind: 'payment'; invoiceId: string; balanceDue: number; canAct: boolean };

const inputClass = 'w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm';

export function InvoiceActions(props: Props) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function finalize() {
        if (props.kind !== 'finalize') return;
        setBusy(true);
        setError(null);
        const response = await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'finalize', jobNumber: props.jobNumber }),
        });
        const body = await response.json();
        setBusy(false);
        if (!response.ok) return setError(body.error ?? 'Unable to finalize invoice');
        router.refresh();
    }

    async function recordPayment(formData: FormData) {
        if (props.kind !== 'payment') return;
        setBusy(true);
        setError(null);
        const response = await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'record_payment',
                invoiceId: props.invoiceId,
                amount: Number(formData.get('amount')),
                method: formData.get('method'),
                receivedAt: formData.get('receivedAt'),
                reference: formData.get('reference'),
                notes: formData.get('notes'),
            }),
        });
        const body = await response.json();
        setBusy(false);
        if (!response.ok) return setError(body.error ?? 'Unable to record payment');
        setOpen(false);
        router.refresh();
    }

    if (!props.canAct) return <span className="text-[#64748b]">View only</span>;
    if (props.kind === 'finalize') {
        return <div><button type="button" disabled={busy} onClick={finalize} className="font-semibold text-[#0f766e] hover:underline disabled:opacity-50">{busy ? 'Finalizing…' : 'Finalize invoice'}</button>{error ? <p className="mt-1 max-w-48 text-xs text-[#b91c1c]">{error}</p> : null}</div>;
    }

    if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-md bg-[#0f766e] px-3 py-2 font-semibold text-white">Record payment</button>;

    return <form action={recordPayment} className="min-w-64 space-y-3 text-left">
        <div><label htmlFor={`amount-${props.invoiceId}`} className="mb-1 block font-medium">Amount</label><input id={`amount-${props.invoiceId}`} name="amount" type="number" min="0.01" max={props.balanceDue} step="0.01" defaultValue={props.balanceDue.toFixed(2)} required className={inputClass} /></div>
        <div><label htmlFor={`method-${props.invoiceId}`} className="mb-1 block font-medium">Payment method</label><select id={`method-${props.invoiceId}`} name="method" defaultValue="cash" className={inputClass}><option value="cash">Cash</option><option value="card_external">Card, external terminal</option><option value="check">Check</option><option value="bank_transfer">Bank transfer</option><option value="other">Other</option></select></div>
        <div><label htmlFor={`date-${props.invoiceId}`} className="mb-1 block font-medium">Received date</label><input id={`date-${props.invoiceId}`} name="receivedAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className={inputClass} /></div>
        <div><label htmlFor={`reference-${props.invoiceId}`} className="mb-1 block font-medium">Reference</label><input id={`reference-${props.invoiceId}`} name="reference" className={inputClass} /></div>
        <div><label htmlFor={`notes-${props.invoiceId}`} className="mb-1 block font-medium">Notes</label><textarea id={`notes-${props.invoiceId}`} name="notes" rows={2} className={inputClass} /></div>
        {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-md border border-[#cbd5e1] px-3 py-2 font-semibold">Cancel</button><button type="submit" disabled={busy} className="rounded-md bg-[#0f766e] px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Recording…' : 'Record'}</button></div>
    </form>;
}
