"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { WorkflowActionType } from '@/lib/workspaces/workflow-actions';

export function WorkspaceActionPanel({
    actionType,
    label,
    summary,
}: {
    actionType: WorkflowActionType;
    label: string;
    summary: string;
}) {
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    return (
        <section className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-4">
            <h2 className="text-sm font-semibold">Workflow Action</h2>
            <p className="mt-1 text-xs text-[#475569]">{summary}</p>
            <div className="mt-3 flex items-center gap-3">
                <button
                    type="button"
                    onClick={async () => {
                        setFeedback(null);
                        setError(null);
                        setIsPending(true);

                        try {
                            const response = await fetch('/api/workflow-actions', {
                                method: 'POST',
                                headers: {
                                    'content-type': 'application/json',
                                },
                                body: JSON.stringify({ actionType }),
                            });

                            const payload = await response.json();

                            if (!response.ok) {
                                setError(payload?.error ?? 'Workflow action failed.');
                                return;
                            }

                            setFeedback(payload?.message ?? 'Workflow action applied.');
                            router.refresh();
                        } catch {
                            setError('Workflow action failed. Please retry.');
                        } finally {
                            setIsPending(false);
                        }
                    }}
                    className="inline-flex items-center justify-center rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isPending}
                >
                    {isPending ? 'Applying...' : label}
                </button>
                {feedback ? <p className="text-xs text-[#166534]">{feedback}</p> : null}
                {error ? <p className="text-xs text-[#b91c1c]">{error}</p> : null}
            </div>
        </section>
    );
}
