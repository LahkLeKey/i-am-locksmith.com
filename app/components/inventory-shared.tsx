import type { ReactNode } from 'react';

export const INVENTORY_SERVICE_LINE_OPTIONS = ['automotive', 'mobile', 'shop'] as const;

type InventoryActionCardProps = {
    title: string;
    description?: string;
    children: ReactNode;
};

type ServiceLineBadgeRowProps = {
    lines: readonly string[];
    className?: string;
};

export function InventoryActionCard({ title, description, children }: InventoryActionCardProps) {
    return (
        <div className="space-y-2 rounded border border-[#e2e8f0] bg-white p-3">
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#475569]">{title}</p>
                {description ? <p className="mt-1 text-xs text-[#64748b]">{description}</p> : null}
            </div>
            {children}
        </div>
    );
}

export function ServiceLineBadgeRow({ lines, className }: ServiceLineBadgeRowProps) {
    return (
        <div className={className ?? 'flex flex-wrap gap-2'}>
            {lines.map((line, index) => (
                <span key={`${line}-${index}`} className="rounded-full bg-[#f8fafc] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#475569]">
                    {line}
                </span>
            ))}
        </div>
    );
}
