import type {
  CommissionSale,
  PayrollBonusInput,
  SalesAssignee,
  UnpaidPayrollEmployee,
} from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';
import type { Database } from '@/types/database';

type SaleRow = Database['public']['Tables']['commission_sales']['Row'];

let mockSales: CommissionSale[] = [];
let mockAssignees: SalesAssignee[] = [
  { id: 'local', fullName: 'You', discordUsername: null },
];

function mapSale(
  row: SaleRow,
  nameById: Map<string, string | null> = new Map()
): CommissionSale {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    salePrice: Number(row.sale_price),
    commissionPercentage: Number(row.commission_percentage),
    commissionAmount: Number(row.commission_amount),
    soldBy: row.sold_by,
    soldByName: nameById.get(row.sold_by) ?? null,
    soldAt: row.sold_at,
    payrollRunId: row.payroll_run_id,
    paidAt: row.paid_at,
  };
}

async function resolveSellerNames(soldByIds: string[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(soldByIds.filter(Boolean))];
  const map = new Map<string, string | null>();
  if (unique.length === 0) return map;

  const { data, error } = await getSupabase()
    .from('staff_accounts')
    .select('id, full_name, discord_username')
    .in('id', unique);
  if (error) throw mapSupabaseError(error);

  for (const account of data ?? []) {
    const label = account.full_name?.trim() || account.discord_username?.trim() || null;
    map.set(account.id, label);
  }
  return map;
}

function groupUnpaid(sales: CommissionSale[]): UnpaidPayrollEmployee[] {
  const byStaff = new Map<string, UnpaidPayrollEmployee>();
  for (const sale of sales) {
    let group = byStaff.get(sale.soldBy);
    if (!group) {
      group = {
        staffAccountId: sale.soldBy,
        staffName: sale.soldByName,
        sales: [],
        commissionTotal: 0,
      };
      byStaff.set(sale.soldBy, group);
    }
    group.sales.push(sale);
    group.commissionTotal += sale.commissionAmount;
  }
  return [...byStaff.values()].sort((a, b) =>
    (a.staffName ?? a.staffAccountId).localeCompare(b.staffName ?? b.staffAccountId)
  );
}

export const commissionService = {
  async logSale(productId: string): Promise<CommissionSale> {
    if (!isSupabaseConfigured) {
      const sale: CommissionSale = {
        id: `mock-${Date.now()}`,
        productId,
        productName: 'Mock product',
        productSku: 'MOCK',
        salePrice: 100,
        commissionPercentage: 10,
        commissionAmount: 10,
        soldBy: 'local',
        soldByName: 'You',
        soldAt: new Date().toISOString(),
        payrollRunId: null,
        paidAt: null,
      };
      mockSales = [sale, ...mockSales];
      return sale;
    }

    const { data, error } = await getSupabase().rpc('log_commission_sale', {
      p_product_id: productId,
    });
    if (error) throw mapSupabaseError(error);
    const names = await resolveSellerNames([data.sold_by]);
    return mapSale(data, names);
  },

  async listSales(limit = 200): Promise<CommissionSale[]> {
    if (!isSupabaseConfigured) return [...mockSales];

    const { data, error } = await getSupabase()
      .from('commission_sales')
      .select('*')
      .order('sold_at', { ascending: false })
      .limit(limit);
    if (error) throw mapSupabaseError(error);

    const rows = data ?? [];
    const names = await resolveSellerNames(rows.map((row) => row.sold_by));
    return rows.map((row) => mapSale(row, names));
  },

  async listUnpaidGrouped(): Promise<UnpaidPayrollEmployee[]> {
    if (!isSupabaseConfigured) {
      return groupUnpaid(mockSales.filter((sale) => sale.payrollRunId == null));
    }

    const { data, error } = await getSupabase()
      .from('commission_sales')
      .select('*')
      .is('payroll_run_id', null)
      .order('sold_at', { ascending: true });
    if (error) throw mapSupabaseError(error);

    const rows = data ?? [];
    const names = await resolveSellerNames(rows.map((row) => row.sold_by));
    return groupUnpaid(rows.map((row) => mapSale(row, names)));
  },

  async processPayroll(bonuses: PayrollBonusInput[]): Promise<{ id: string }> {
    const payload = bonuses
      .filter((b) => b.amount > 0)
      .map((b) => ({
        staff_account_id: b.staffAccountId,
        amount: b.amount,
        note: b.note ?? '',
      }));

    if (!isSupabaseConfigured) {
      const runId = `run-${Date.now()}`;
      const now = new Date().toISOString();
      mockSales = mockSales.map((sale) =>
        sale.payrollRunId == null
          ? { ...sale, payrollRunId: runId, paidAt: now }
          : sale
      );
      return { id: runId };
    }

    const { data, error } = await getSupabase().rpc('process_payroll', {
      p_bonuses: payload,
    });
    if (error) throw mapSupabaseError(error);
    return { id: data.id };
  },

  async listAssignees(): Promise<SalesAssignee[]> {
    if (!isSupabaseConfigured) return [...mockAssignees];

    const { data, error } = await getSupabase().rpc('list_sales_assignees');
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      discordUsername: row.discord_username,
    }));
  },

  async updateSale(
    saleId: string,
    productId: string,
    soldBy: string
  ): Promise<CommissionSale> {
    if (!isSupabaseConfigured) {
      const assignee = mockAssignees.find((a) => a.id === soldBy);
      mockSales = mockSales.map((sale) =>
        sale.id === saleId && sale.payrollRunId == null
          ? {
              ...sale,
              productId,
              productName: sale.productName,
              soldBy,
              soldByName: assignee?.fullName ?? assignee?.discordUsername ?? null,
            }
          : sale
      );
      const updated = mockSales.find((sale) => sale.id === saleId);
      if (!updated) throw mapSupabaseError(new Error('Sale not found'));
      return updated;
    }

    const { data, error } = await getSupabase().rpc('update_commission_sale', {
      p_sale_id: saleId,
      p_product_id: productId,
      p_sold_by: soldBy,
    });
    if (error) throw mapSupabaseError(error);
    const names = await resolveSellerNames([data.sold_by]);
    return mapSale(data, names);
  },

  async deleteSale(saleId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      const target = mockSales.find((sale) => sale.id === saleId);
      if (!target) throw mapSupabaseError(new Error('Sale not found'));
      if (target.payrollRunId != null) {
        throw mapSupabaseError(new Error('Paid sales cannot be deleted'));
      }
      mockSales = mockSales.filter((sale) => sale.id !== saleId);
      return;
    }

    const { error } = await getSupabase().rpc('delete_commission_sale', {
      p_sale_id: saleId,
    });
    if (error) throw mapSupabaseError(error);
  },
};
