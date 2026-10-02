import { useEffect, useState } from 'react';
import type { AuditLogEntry } from '@/types';
import { authService } from '@/services/authService';
import { useToast } from '@/hooks/useToast';
import { mapSupabaseError } from '@/utils/errors';
import { formatDate } from '@/utils/format';

function formatMetaValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (Array.isArray(value)) {
    const parts = value.map((item) => formatMetaValue(item)).filter((item): item is string => item != null);
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return null;
}

function formatAuditMetadata(metadata: Record<string, unknown>): string[] {
  const lines: string[] = [];
  const skip = new Set<string>(['id']);

  if (typeof metadata.from === 'string' && typeof metadata.to === 'string') {
    lines.push(`${metadata.from} → ${metadata.to}`);
    skip.add('from');
    skip.add('to');
  }

  if (typeof metadata.permission === 'string' && typeof metadata.enabled === 'boolean') {
    const role = typeof metadata.role === 'string' ? ` for ${metadata.role}` : '';
    lines.push(`${metadata.enabled ? 'Enabled' : 'Disabled'} ${metadata.permission}${role}`);
    skip.add('permission');
    skip.add('enabled');
    skip.add('role');
  }

  if (Array.isArray(metadata.changed)) {
    const fields = metadata.changed
      .filter((field): field is string => typeof field === 'string' && field.length > 0)
      .map((field) => field.replace(/_/g, ' '));
    if (fields.length > 0) lines.push(`Changed ${fields.join(', ')}`);
    skip.add('changed');
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (skip.has(key)) continue;
    const formatted = formatMetaValue(value);
    if (!formatted) continue;
    lines.push(`${key.replace(/_/g, ' ')}: ${formatted}`);
  }

  return lines;
}

function auditTarget(entry: AuditLogEntry): string {
  if (entry.targetName) return entry.targetName;
  if (entry.targetUserId) return '—';
  const label = entry.metadata.label;
  const id = entry.metadata.id;
  if (typeof label === 'string' && label.length > 0) return label;
  if (typeof id === 'string' && id.length > 0) return id;
  return '—';
}

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
      <p className="text-sm text-bone-muted mb-8">Staff, access, and content actions.</p>

      <div className="bg-ink-surface border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">When</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Action</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Actor</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Target</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center text-sm text-bone-muted py-12">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-sm text-bone-muted py-12">No audit entries</td></tr>
            ) : entries.map((entry) => {
              const details = formatAuditMetadata(entry.metadata);
              return (
              <tr key={entry.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-xs text-bone-muted">{formatDate(entry.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-bone font-mono">{entry.action}</td>
                <td className="px-4 py-3 text-sm text-bone">{entry.actorName ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-mono text-bone-muted">{auditTarget(entry)}</td>
                <td className="px-4 py-3 text-xs text-bone-muted max-w-xs">
                  {details.length === 0 ? (
                    '—'
                  ) : (
                    <div className="space-y-0.5">
                      {details.map((line, index) => (
                        <p key={`${entry.id}-${index}`} className="break-words">{line}</p>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
