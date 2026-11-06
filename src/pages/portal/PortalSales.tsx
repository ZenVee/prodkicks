import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import type { CommissionSale, Product, SalesAssignee } from '@/types';
import { commissionService } from '@/services/commissionService';
import { productService } from '@/services/productService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import Modal from '@/components/common/Modal';
import { formatPrice } from '@/utils/format';
import { mapSupabaseError } from '@/utils/errors';

function formatSoldAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function assigneeLabel(a: SalesAssignee): string {
  return a.fullName?.trim() || a.discordUsername?.trim() || a.id;
}

export default function PortalSales() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSiteSettings();
  const [sales, setSales] = useState<CommissionSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [editSale, setEditSale] = useState<CommissionSale | null>(null);
  const [deleteSale, setDeleteSale] = useState<CommissionSale | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [assignees, setAssignees] = useState<SalesAssignee[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedSoldBy, setSelectedSoldBy] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const currency = settings.currencySymbol;
  const pct = settings.commissionPercentage;
  const canCreate = hasPermission('sales.create');
  const canProcess = hasPermission('payroll.process');
  const canEdit = hasPermission('sales.edit');
  const canDelete = hasPermission('sales.delete');
  const showActions = canEdit || canDelete;

  const load = () => {
    setLoading(true);
    commissionService
      .listSales()
      .then(setSales)
      .catch((err) => showToast(mapSupabaseError(err).message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [showToast]);

  useEffect(() => {
    if (!newSaleOpen && !editSale) return;
    setLoadingProducts(true);
    productService
      .getAll()
      .then(setProducts)
      .catch((err) => showToast(mapSupabaseError(err).message, 'error'))
      .finally(() => setLoadingProducts(false));
  }, [newSaleOpen, editSale, showToast]);

  useEffect(() => {
    if (!editSale) return;
    setProductQuery('');
    setSelectedProductId(editSale.productId);
    setSelectedSoldBy(editSale.soldBy);
    commissionService
      .listAssignees()
      .then((nextAssignees) => {
        setAssignees(nextAssignees);
        if (!editSale.productId || !products.some((p) => p.id === editSale.productId)) {
          if (products.length > 0) setSelectedProductId(null);
        }
      })
      .catch((err) => showToast(mapSupabaseError(err).message, 'error'));
  }, [editSale, showToast, products]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, productQuery]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;
  const estimated = selectedProduct
    ? Number((selectedProduct.price * (pct / 100)).toFixed(2))
    : null;

  const openNewSale = () => {
    setProductQuery('');
    setSelectedProductId(null);
    setNewSaleOpen(true);
  };

  const handleLogSale = async () => {
    if (!selectedProductId || submitting) return;
    setSubmitting(true);
    try {
      const sale = await commissionService.logSale(selectedProductId);
      setSales((prev) => [sale, ...prev]);
      showToast(`Logged sale: ${sale.productName}`, 'success');
      setNewSaleOpen(false);
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editSale || !selectedProductId || !selectedSoldBy || saving) return;
    setSaving(true);
    try {
      const updated = await commissionService.updateSale(
        editSale.id,
        selectedProductId,
        selectedSoldBy
      );
      setSales((prev) => prev.map((sale) => (sale.id === updated.id ? updated : sale)));
      showToast('Sale updated', 'success');
      setEditSale(null);
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteSale || deleting) return;
    setDeleting(true);
    try {
      await commissionService.deleteSale(deleteSale.id);
      setSales((prev) => prev.filter((sale) => sale.id !== deleteSale.id));
      showToast('Sale deleted', 'success');
      setDeleteSale(null);
    } catch (err) {
      showToast(mapSupabaseError(err).message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const colSpan = showActions ? 7 : 6;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tighter text-bone mb-1">Sales</h1>
          <p className="text-sm text-bone-muted">Log sales and review commission payout status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <button
              type="button"
              onClick={openNewSale}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-lime text-ink text-xs font-medium tracking-wider uppercase hover:bg-lime-dark transition-colors"
            >
              <Plus size={14} />
              New Sale
            </button>
          )}
          {canProcess && (
            <Link
              to="/portal/payroll"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-white/10 text-bone text-xs font-medium tracking-wider uppercase hover:border-lime hover:text-lime transition-colors"
            >
              Process Payroll
            </Link>
          )}
        </div>
      </div>

      <div className="bg-ink-surface border border-white/5 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">When</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Seller</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Product</th>
              <th className="text-right text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Sale</th>
              <th className="text-right text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Commission</th>
              <th className="text-left text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">Status</th>
              {showActions && (
                <th className="text-right text-xs tracking-wider uppercase text-bone-muted font-medium px-4 py-3">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="text-center text-sm text-bone-muted py-12">
                  Loading...
                </td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="text-center text-sm text-bone-muted py-12">
                  No sales logged yet
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const unpaid = sale.payrollRunId == null;
                return (
                  <tr key={sale.id} className="border-b border-white/5">
                    <td className="px-4 py-3 text-xs text-bone-muted whitespace-nowrap">
                      {formatSoldAt(sale.soldAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-bone">{sale.soldByName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-bone">{sale.productName}</p>
                      {sale.productSku && (
                        <p className="text-[10px] font-mono text-bone-muted">{sale.productSku}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-bone text-right whitespace-nowrap">
                      {formatPrice(sale.salePrice, currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-bone text-right whitespace-nowrap">
                      {formatPrice(sale.commissionAmount, currency)}
                      <span className="text-bone-muted text-xs ml-1">({sale.commissionPercentage}%)</span>
                    </td>
                    <td className="px-4 py-3 text-xs tracking-wider uppercase">
                      {unpaid ? (
                        <span className="text-bone-muted">Unpaid</span>
                      ) : (
                        <span className="text-lime">Paid</span>
                      )}
                    </td>
                    {showActions && (
                      <td className="px-4 py-3 text-right">
                        {unpaid ? (
                          <div className="inline-flex items-center gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                title="Edit"
                                aria-label={`Edit sale ${sale.productName}`}
                                onClick={() => setEditSale(sale)}
                                className="p-1.5 text-bone-muted hover:text-lime transition-colors"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                title="Delete"
                                aria-label={`Delete sale ${sale.productName}`}
                                onClick={() => setDeleteSale(sale)}
                                className="p-1.5 text-bone-muted hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-bone-muted">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={newSaleOpen} onClose={() => !submitting && setNewSaleOpen(false)} title="What did you sell?">
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted" />
            <input
              type="search"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Search products..."
              className="portal-input pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto border border-white/5 divide-y divide-white/5">
            {loadingProducts ? (
              <p className="text-sm text-bone-muted p-4 text-center">Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm text-bone-muted p-4 text-center">No products found</p>
            ) : (
              filteredProducts.map((product) => {
                const active = product.id === selectedProductId;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProductId(product.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors ${
                      active ? 'bg-lime/10 text-lime' : 'hover:bg-ink-raised text-bone'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm truncate">{product.name}</p>
                        <p className="text-[10px] text-bone-muted font-mono">{product.sku}</p>
                      </div>
                      <span className="text-xs text-bone-muted shrink-0">
                        {formatPrice(product.price, currency)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {selectedProduct && (
            <p className="text-xs text-bone-muted">
              Commission estimate: {formatPrice(estimated ?? 0, currency)} ({pct}% of{' '}
              {formatPrice(selectedProduct.price, currency)})
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setNewSaleOpen(false)}
              disabled={submitting}
              className="px-4 py-2 text-xs tracking-wider uppercase text-bone-muted hover:text-bone transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogSale}
              disabled={!selectedProductId || submitting}
              className="px-4 py-2 text-xs tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors disabled:opacity-50"
            >
              {submitting ? 'Logging...' : 'Log Sale'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!editSale} onClose={() => !saving && setEditSale(null)} title="Edit Sale">
        <div className="space-y-4">
          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">
              Salesperson
            </label>
            <select
              value={selectedSoldBy}
              onChange={(e) => setSelectedSoldBy(e.target.value)}
              className="portal-input"
            >
              <option value="">Select salesperson</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {assigneeLabel(a)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs tracking-wider uppercase text-bone-muted mb-1.5">
              Product
            </label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted" />
              <input
                type="search"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Search products..."
                className="portal-input pl-9"
              />
            </div>
            <div className="max-h-48 overflow-y-auto border border-white/5 divide-y divide-white/5">
              {loadingProducts ? (
                <p className="text-sm text-bone-muted p-3 text-center">Loading products...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-sm text-bone-muted p-3 text-center">No products found</p>
              ) : (
                filteredProducts.map((product) => {
                  const active = product.id === selectedProductId;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProductId(product.id)}
                      className={`w-full text-left px-3 py-2.5 transition-colors ${
                        active ? 'bg-lime/10 text-lime' : 'hover:bg-ink-raised text-bone'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{product.name}</p>
                          <p className="text-[10px] text-bone-muted font-mono">{product.sku}</p>
                        </div>
                        <span className="text-xs text-bone-muted shrink-0">
                          {formatPrice(product.price, currency)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {selectedProduct && (
            <p className="text-xs text-bone-muted">
              Commission estimate: {formatPrice(estimated ?? 0, currency)} ({pct}% of{' '}
              {formatPrice(selectedProduct.price, currency)})
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditSale(null)}
              disabled={saving}
              className="px-4 py-2 text-xs tracking-wider uppercase text-bone-muted hover:text-bone transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={!selectedProductId || !selectedSoldBy || saving}
              className="px-4 py-2 text-xs tracking-wider uppercase bg-lime text-ink font-medium hover:bg-lime-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteSale}
        onClose={() => !deleting && setDeleteSale(null)}
        title="Delete Sale"
        onConfirm={handleConfirmDelete}
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
      >
        <p className="text-sm text-bone-muted">
          Delete unpaid sale of{' '}
          <span className="text-bone">{deleteSale?.productName}</span>
          {deleteSale?.soldByName ? (
            <>
              {' '}
              by <span className="text-bone">{deleteSale.soldByName}</span>
            </>
          ) : null}
          ? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
