import { useEffect, useState } from 'react';
import type { AuditLogEntry } from '@/types';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/useToast';
import { mapSupabaseError } from '@/utils/errors';
import { formatDate } from '@/utils/format';

export default function PortalAudit() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .listAuditLog()
      .then(setEntries)
      .catch((err) => showToast(mapSupabaseError(err).message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-1">Audit Log</h1>
      <p className="text-sm text-bone-muted mb-8">Sensitive staff and access actions.</p>

      <div className="bg-ink-surface border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">When</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Action</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Actor</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Target</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-sm text-bone-muted py-12">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-sm text-bone-muted py-12">No audit entries</td></tr>
            ) : entries.map((entry) => (
              <tr key={entry.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-xs text-bone-muted">{formatDate(entry.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-bone font-mono">{entry.action}</td>
                <td className="px-4 py-3 text-xs font-mono text-bone-muted">{entry.actorUserId?.slice(0, 8) ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-mono text-bone-muted">{entry.targetUserId?.slice(0, 8) ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-mono text-bone-muted max-w-xs truncate">
                  {JSON.stringify(entry.metadata)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
