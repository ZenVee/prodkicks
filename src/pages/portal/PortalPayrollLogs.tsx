import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PayrollLog } from '@/types';
import { commissionService } from '@/services/commissionService';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { formatPrice } from '@/utils/format';
import { mapSupabaseError } from '@/utils/errors';

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PortalPayrollLogs() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const { settings } = useSiteSettings();
  const currency = settings?.currencySymbol ?? '$';
  const canProcess = hasPermission('payroll.process');
  const canReverse = hasPermission('payroll.reverse');
  const [logs, setLogs] = useState<PayrollLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PayrollLog | null>(null);
  const [reversingId, setReversingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    commissionService
      .listPayrollLogs()
      .then(setLogs)
      .catch((err) => showToast(mapSupabaseError(err).message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleReverse = async (log: PayrollLog) => {
    if (!canReverse || log.reversedAt != null || reversingId) return;
    if (
      !window.confirm(
        'Reverse this payroll run? Linked sales return to unpaid and bonuses are removed.'
      )
    ) {
      return;
    }

    setReversingId(log.id);
    try {
      const updated = await commissionService.reversePayroll(log.id);
      setLogs((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setSelected((prev) => (prev?.id === updated.id ? updated : prev));
      showToast('Payroll reversed', 'success');
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setReversingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link to="/portal/sales" className="text-xs tracking-wider uppercase text-bone-muted hover:text-bone">
          ← Sales
        </Link>
        <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mt-3 mb-1">
          Payroll Logs
        </h1>
        <p className="text-sm text-bone-muted">
          Review past payroll runs, open a breakdown, or reverse a run.
        </p>
      </div>

      {selected && (
        <div className="mb-6 bg-ink-surface border border-white/5">
          <div className="px-5 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-bone">
                Breakdown · {formatWhen(selected.processedAt)}
              </h2>
              <p className="text-xs text-bone-muted mt-1">
                Processed by {selected.processedByName ?? 'Unknown'}
                {selected.reversedAt
                  ? ` · Reversed${selected.reversedByName ? ` by ${selected.reversedByName}` : ''}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canReverse && selected.reversedAt == null && (
                <button
                  type="button"
                  onClick={() => handleReverse(selected)}
                  disabled={reversingId === selected.id}
                  className="px-4 py-2 border border-white/10 text-xs tracking-wider uppercase text-bone hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  {reversingId === selected.id ? 'Reversing...' : 'Reverse'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 border border-white/10 text-xs tracking-wider uppercase text-bone-muted hover:text-bone transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          <div className="px-5 py-4 border-b border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] tracking-wider uppercase text-bone-muted mb-1">Sales</p>
              <p className="text-bone">{selected.snapshot.salesCount}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-wider uppercase text-bone-muted mb-1">Commission</p>
              <p className="text-bone">{formatPrice(selected.snapshot.commissionTotal, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-wider uppercase text-bone-muted mb-1">Bonuses</p>
              <p className="text-bone">{formatPrice(selected.snapshot.bonusTotal, currency)}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-wider uppercase text-bone-muted mb-1">Grand total</p>
              <p className="text-lime font-medium">{formatPrice(selected.snapshot.grandTotal, currency)}</p>
            </div>
          </div>

          {selected.snapshot.employees.length === 0 ? (
            <p className="px-5 py-6 text-sm text-bone-muted">No employee breakdown available for this run.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {selected.snapshot.employees.map((employee) => (
                <div key={employee.staffAccountId}>
                  <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-sm text-bone">{employee.staffName}</p>
                      <p className="text-xs text-bone-muted">
                        {employee.sales.length} sale{employee.sales.length === 1 ? '' : 's'}
                        {employee.bonusAmount > 0
                          ? ` · bonus ${formatPrice(employee.bonusAmount, currency)}`
                          : ''}
                        {employee.bonusNote ? ` · ${employee.bonusNote}` : ''}
                      </p>
                    </div>
                    <p className="text-sm text-lime whitespace-nowrap">
                      {formatPrice(employee.payout, currency)}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px]">
                      <thead>
                        <tr className="border-t border-white/5">
                          <th className="text-left text-[10px] tracking-wider uppercase text-bone-muted font-medium px-5 py-2">
                            When
                          </th>
                          <th className="text-left text-[10px] tracking-wider uppercase text-bone-muted font-medium px-5 py-2">
                            Product
                          </th>
                          <th className="text-right text-[10px] tracking-wider uppercase text-bone-muted font-medium px-5 py-2">
                            Sale
                          </th>
                          <th className="text-right text-[10px] tracking-wider uppercase text-bone-muted font-medium px-5 py-2">
                            Commission
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {employee.sales.map((sale) => (
                          <tr key={sale.id} className="border-t border-white/5">
                            <td className="px-5 py-2.5 text-xs text-bone-muted whitespace-nowrap">
                              {formatWhen(sale.soldAt)}
                            </td>
                            <td className="px-5 py-2.5">
                              <p className="text-sm text-bone">{sale.productName}</p>
                              {sale.gangBusinessName ? (
                                <p className="text-[10px] text-bone-muted mt-0.5">{sale.gangBusinessName}</p>
                              ) : null}
                            </td>
                            <td className="px-5 py-2.5 text-sm text-bone text-right">
                              {formatPrice(sale.salePrice, currency)}
                            </td>
                            <td className="px-5 py-2.5 text-sm text-bone text-right">
                              {formatPrice(sale.commissionAmount, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-bone-muted">Loading payroll logs...</p>
      ) : logs.length === 0 ? (
        <div className="bg-ink-surface border border-white/5 p-8 text-center">
          <p className="text-sm text-bone-muted">No payroll runs logged yet.</p>
          {canProcess && (
            <Link
              to="/portal/payroll"
              className="inline-block mt-4 text-xs tracking-wider uppercase text-lime hover:text-lime-dark"
            >
              Process Payroll
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-ink-surface border border-white/5 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">
                  When
                </th>
                <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">
                  Processed by
                </th>
                <th className="text-right text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">
                  Sales
                </th>
                <th className="text-right text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">
                  Total
                </th>
                <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">
                  Status
                </th>
                <th className="text-right text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const reversed = log.reversedAt != null;
                const isSelected = selected?.id === log.id;
                return (
                  <tr key={log.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-sm text-bone whitespace-nowrap">
                      {formatWhen(log.processedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-bone">
                      {log.processedByName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-bone text-right">
                      {log.snapshot.salesCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-bone text-right">
                      {formatPrice(log.snapshot.grandTotal, currency)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {reversed ? (
                        <span className="text-bone-muted">Reversed</span>
                      ) : (
                        <span className="text-lime">Processed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelected(isSelected ? null : log)}
                          className="text-xs tracking-wider uppercase text-bone-muted hover:text-lime transition-colors"
                        >
                          {isSelected ? 'Hide' : 'Breakdown'}
                        </button>
                        {canReverse && !reversed && (
                          <button
                            type="button"
                            onClick={() => handleReverse(log)}
                            disabled={reversingId === log.id}
                            className="text-xs tracking-wider uppercase text-bone-muted hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            {reversingId === log.id ? 'Reversing...' : 'Reverse'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
