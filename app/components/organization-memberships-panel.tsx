"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";

function formatClerkRole(role: string | null | undefined): string {
    if (!role) {
        return "Member";
    }

    if (!role.startsWith("org:")) {
        return role;
    }

    return role.slice(4)
        .split("_")
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" ");
}

export function OrganizationMembershipsPanel() {
    const router = useRouter();
    const { organization } = useOrganization();
    const { isLoaded, setActive, userMemberships } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });
    const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);
    const [switchError, setSwitchError] = useState<string | null>(null);

    if (!isLoaded) {
        return (
            <div className="mt-4 rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-3 text-xs text-[#64748b]">
                Loading organizations...
            </div>
        );
    }

    const memberships = userMemberships.data ?? [];

    if (memberships.length === 0) {
        return (
            <div className="mt-4 rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-3 text-xs text-[#64748b]">
                No organizations found for this user.
            </div>
        );
    }

    return (
        <section className="mt-4 space-y-2 rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                Organizations and Roles
            </h2>
            <ul className="space-y-2">
                {memberships.map((membership) => {
                    const orgId = membership.organization.id;
                    const isActive = organization?.id === orgId;
                    const isPending = pendingOrgId === orgId;

                    return (
                        <li key={orgId} className="rounded border border-[#e2e8f0] bg-white p-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-[#0f172a]">
                                        {membership.organization.name}
                                    </p>
                                    <p className="truncate text-[11px] text-[#64748b]">
                                        {formatClerkRole(membership.role)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="rounded border border-[#cbd5e1] px-2 py-1 text-[11px] font-medium text-[#334155] hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={isActive || isPending}
                                    onClick={async () => {
                                        setSwitchError(null);
                                        setPendingOrgId(orgId);
                                        try {
                                            await setActive({ organization: orgId });
                                            router.refresh();
                                        } catch {
                                            setSwitchError("Unable to switch organization. Please try again.");
                                        } finally {
                                            setPendingOrgId(null);
                                        }
                                    }}
                                >
                                    {isActive ? "Active" : isPending ? "Switching..." : "Set active"}
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
            {switchError ? (
                <p className="text-[11px] text-[#b91c1c]">{switchError}</p>
            ) : null}
        </section>
    );
}
