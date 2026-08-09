'use client'

import { getSuperadminTenantProductLines } from '@/lib/superadmin-tenant-product-lines'

export function SuperadminProductLineBadges({
  tenantSlug,
  enabledModulesRaw,
  postTrialModulesConfirmed,
  subscription,
}: {
  tenantSlug: string
  enabledModulesRaw: unknown
  postTrialModulesConfirmed?: boolean | null
  subscription: {
    status?: string | null
    trial_ends_at?: string | null
    plan?: string | null
  } | null
}) {
  const lines = getSuperadminTenantProductLines({
    tenantSlug,
    enabledModulesRaw,
    postTrialModulesConfirmed,
    subscription,
  })

  return (
    <div className="flex flex-col gap-1.5 min-w-[7.5rem]">
      {lines.map((line) => (
        <span
          key={line.key}
          title={line.hint ? `${line.label}: ${line.hint}` : line.label}
          className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${
            line.on
              ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
              : 'bg-slate-700/80 text-slate-500 ring-1 ring-slate-600'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${line.on ? 'bg-emerald-400' : 'bg-slate-500'}`}
            aria-hidden
          />
          {line.label}
        </span>
      ))}
    </div>
  )
}
