import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { UnpaidPayrollEmployee } from '@/types';
import { commissionService } from '@/services/commissionService';
import { useToast } from '@/hooks/useToast';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { formatPrice } from '@/utils/format';
import { mapSupabaseError } from '@/utils/errors';

type BonusDraft = { amount: string; note: string };

function formatSoldAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PortalPayroll() {
  const { showToast } = useToast();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<UnpaidPayrollEmployee[]>([]);
  const [bonuses, setBonuses] = useState<Record<string, BonusDraft>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const currency = settings?.currencySymbol ?? '$';

  useEffect(() => {
    commissionService
      .listUnpaidGrouped()
      .then((groups) => {
        setEmployees(groups);
        const next: Record<string, BonusDraft> = {};
        for (const group of groups) {
          next[group.staffAccountId] = { amount: '', note: '' };
        }
        setBonuses(next);
      })
      .catch((err) => showToast(mapSupabaseError(err).message, 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const commissionTotal = useMemo(
    () => employees.reduce((sum, e) => sum + e.commissionTotal, 0),
    [employees]
  );

  const bonusTotal = useMemo(
    () =>
      employees.reduce((sum, e) => {
        const raw = bonuses[e.staffAccountId]?.amount ?? '';
        const n = Number(raw);
        return sum + (Number.isFinite(n) && n > 0 ? n : 0);
      }, 0),
    [employees, bonuses]
  );

  const updateBonus = (staffId: string, field: keyof BonusDraft, value: string) => {
    setBonuses((prev) => ({
      ...prev,
      [staffId]: { ...prev[staffId], [field]: value },
    }));
  };

  const handleProcess = async () => {
    if (processing || employees.length === 0) return;
    setProcessing(true);
    try {
      const payload = employees
        .map((e) => {
          const draft = bonuses[e.staffAccountId];
          const amount = Number(draft?.amount ?? 0);
          if (!Number.isFinite(amount) || amount <= 0) return null;
          return {
            staffAccountId: e.staffAccountId,
            amount,
            note: draft?.note?.trim() || undefined,
          };
        })
        .filter((b): b is NonNullable<typeof b> => b != null);

      await commissionService.processPayroll(payload);
      showToast('Payroll processed', 'success');
      navigate('/portal/sales');
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link to="/portal/sales" className="text-xs tracking-wider uppercase text-bone-muted hover:text-bone">
          ← Sales
        </Link>
        <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mt-3 mb-1">
          Process Payroll
        </h1>
        <p className="text-sm text-bone-muted">
          Confirm unpaid sales since the last payroll run, optionally add bonuses, then process.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-bone-muted">Loading unpaid sales...</p>
      ) : employees.length === 0 ? (
        <div className="bg-ink-surface border border-white/5 p-8 text-center">
          <p className="text-sm text-bone-muted">No unpaid sales to process.</p>
          <Link
            to="/portal/sales"
            className="inline-block mt-4 text-xs tracking-wider uppercase text-lime hover:text-lime-dark"
          >
            Back to Sales
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {employees.map((employee) => {
            const draft = bonuses[employee.staffAccountId] ?? { amount: '', note: '' };
            const bonusAmount = Number(draft.amount);
            const payout =
              employee.commissionTotal +
              (Number.isFinite(bonusAmount) && bonusAmount > 0 ? bonusAmount : 0);

            return (
              <div key={employee.staffAccountId} className="bg-ink-surface border border-white/5">
                <div className="px-5 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-medium text-bone">
                      {employee.staffName ?? 'Unknown staff'}
                    </h2>
                    <p className="text-xs text-bone-muted">
                      {employee.sales.length} unpaid sale{employee.sales.length === 1 ? '' : 's'} · commission{' '}
                      {formatPrice(employee.commissionTotal, currency)}
                    </p>
                  </div>
                  <p className="text-sm text-lime">
                    Payout {formatPrice(payout, currency)}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-white/5">
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
                        <tr key={sale.id} className="border-b border-white/5 last:border-0">
                          <td className="px-5 py-2.5 text-xs text-bone-muted whitespace-nowrap">
                            {formatSoldAt(sale.soldAt)}
                          </td>
                          <td className="px-5 py-2.5 text-sm text-bone">{sale.productName}</td>
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

                <div className="px-5 py-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">
                      Bonus amount
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.amount}
                      onChange={(e) => updateBonus(employee.staffAccountId, 'amount', e.target.value)}
                      placeholder="0"
                      className="portal-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">
                      Bonus note
                    </label>
                    <input
                      type="text"
                      value={draft.note}
                      onChange={(e) => updateBonus(employee.staffAccountId, 'note', e.target.value)}
                      placeholder="Optional"
                      className="portal-input"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="bg-ink-surface border border-white/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-bone-muted space-y-1">
              <p>
                Commission total:{' '}
                <span className="text-bone">{formatPrice(commissionTotal, currency)}</span>
              </p>
              <p>
                Bonuses:{' '}
                <span className="text-bone">{formatPrice(bonusTotal, currency)}</span>
              </p>
              <p>
                Grand total:{' '}
                <span className="text-lime font-medium">
                  {formatPrice(commissionTotal + bonusTotal, currency)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleProcess}
              disabled={processing}
              className="px-6 py-3 bg-lime text-ink text-sm font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Process Payroll'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
