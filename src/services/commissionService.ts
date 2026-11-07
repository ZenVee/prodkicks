import type {
  CommissionSale,
  PayrollBonusInput,
  PayrollLog,
  PayrollLogEmployee,
  PayrollLogSale,
  PayrollLogSnapshot,
  SalesAssignee,
  UnpaidPayrollEmployee,
} from '@/types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { mapSupabaseError } from '@/utils/errors';
import type { Database, Json } from '@/types/database';

type SaleRow = Database['public']['Tables']['commission_sales']['Row'];
type PayrollRunRow = Database['public']['Tables']['payroll_runs']['Row'];

let mockSales: CommissionSale[] = [];
let mockPayrollLogs: PayrollLog[] = [];
let mockAssignees: SalesAssignee[] = [
  { id: 'local', fullName: 'You', discordUsername: null },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function mapSnapshotSale(raw: unknown): PayrollLogSale | null {
  const row = asRecord(raw);
  if (!row) return null;
  return {
    id: asString(row.id),
    productName: asString(row.product_name ?? row.productName),
    productSku: asString(row.product_sku ?? row.productSku),
    salePrice: asNumber(row.sale_price ?? row.salePrice),
    commissionPercentage: asNumber(row.commission_percentage ?? row.commissionPercentage),
    commissionAmount: asNumber(row.commission_amount ?? row.commissionAmount),
    soldAt: asString(row.sold_at ?? row.soldAt),
  };
}

function mapSnapshotEmployee(raw: unknown): PayrollLogEmployee | null {
  const row = asRecord(raw);
  if (!row) return null;
  const salesRaw = Array.isArray(row.sales) ? row.sales : [];
  return {
    staffAccountId: asString(row.staff_account_id ?? row.staffAccountId),
    staffName: asString(row.staff_name ?? row.staffName, 'Unknown staff'),
    commissionTotal: asNumber(row.commission_total ?? row.commissionTotal),
    bonusAmount: asNumber(row.bonus_amount ?? row.bonusAmount),
    bonusNote: asString(row.bonus_note ?? row.bonusNote),
    payout: asNumber(row.payout),
    sales: salesRaw.map(mapSnapshotSale).filter((sale): sale is PayrollLogSale => sale != null),
  };
}

function mapSnapshot(raw: Json | null | undefined): PayrollLogSnapshot {
  const row = asRecord(raw) ?? {};
  const employeesRaw = Array.isArray(row.employees) ? row.employees : [];
  return {
    salesCount: asNumber(row.sales_count ?? row.salesCount),
    commissionTotal: asNumber(row.commission_total ?? row.commissionTotal),
    bonusTotal: asNumber(row.bonus_total ?? row.bonusTotal),
    grandTotal: asNumber(row.grand_total ?? row.grandTotal),
    employees: employeesRaw
      .map(mapSnapshotEmployee)
      .filter((employee): employee is PayrollLogEmployee => employee != null),
  };
}

function mapPayrollLog(
  row: PayrollRunRow,
  nameById: Map<string, string | null> = new Map()
): PayrollLog {
  return {
    id: row.id,
    processedBy: row.processed_by,
    processedByName: nameById.get(row.processed_by) ?? null,
    processedAt: row.processed_at,
    reversedAt: row.reversed_at,
    reversedBy: row.reversed_by,
    reversedByName: row.reversed_by ? nameById.get(row.reversed_by) ?? null : null,
    snapshot: mapSnapshot(row.snapshot),
  };
}

function buildMockSnapshot(
  sales: CommissionSale[],
  bonuses: PayrollBonusInput[]
): PayrollLogSnapshot {
  const bonusByStaff = new Map(bonuses.map((b) => [b.staffAccountId, b]));
  const byStaff = new Map<string, PayrollLogEmployee>();

  for (const sale of sales) {
    let employee = byStaff.get(sale.soldBy);
    if (!employee) {
      const bonus = bonusByStaff.get(sale.soldBy);
      employee = {
        staffAccountId: sale.soldBy,
        staffName: sale.soldByName ?? 'Unknown staff',
        commissionTotal: 0,
        bonusAmount: bonus?.amount ?? 0,
        bonusNote: bonus?.note ?? '',
        payout: 0,
        sales: [],
      };
      byStaff.set(sale.soldBy, employee);
    }
    employee.sales.push({
      id: sale.id,
      productName: sale.productName,
      productSku: sale.productSku,
      salePrice: sale.salePrice,
      commissionPercentage: sale.commissionPercentage,
      commissionAmount: sale.commissionAmount,
      soldAt: sale.soldAt,
    });
    employee.commissionTotal += sale.commissionAmount;
  }

  const employees = [...byStaff.values()].map((employee) => ({
    ...employee,
    payout: employee.commissionTotal + employee.bonusAmount,
  }));
  const commissionTotal = employees.reduce((sum, e) => sum + e.commissionTotal, 0);
  const bonusTotal = employees.reduce((sum, e) => sum + e.bonusAmount, 0);

  return {
    salesCount: sales.length,
    commissionTotal,
    bonusTotal,
    grandTotal: commissionTotal + bonusTotal,
    employees,
  };
}

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
      const unpaid = mockSales.filter((sale) => sale.payrollRunId == null);
      const snapshot = buildMockSnapshot(unpaid, bonuses.filter((b) => b.amount > 0));
      mockSales = mockSales.map((sale) =>
        sale.payrollRunId == null
          ? { ...sale, payrollRunId: runId, paidAt: now }
          : sale
      );
      mockPayrollLogs = [
        {
          id: runId,
          processedBy: 'local',
          processedByName: 'You',
          processedAt: now,
          reversedAt: null,
          reversedBy: null,
          reversedByName: null,
          snapshot,
        },
        ...mockPayrollLogs,
      ];
      return { id: runId };
    }

    const { data, error } = await getSupabase().rpc('process_payroll', {
      p_bonuses: payload,
    });
    if (error) throw mapSupabaseError(error);
    return { id: data.id };
  },

  async listPayrollLogs(limit = 100): Promise<PayrollLog[]> {
    if (!isSupabaseConfigured) return [...mockPayrollLogs];

    const { data, error } = await getSupabase()
      .from('payroll_runs')
      .select('*')
      .order('processed_at', { ascending: false })
      .limit(limit);
    if (error) throw mapSupabaseError(error);

    const rows = data ?? [];
    const nameIds = rows.flatMap((row) =>
      [row.processed_by, row.reversed_by].filter((id): id is string => id != null)
    );
    const names = await resolveSellerNames(nameIds);
    return rows.map((row) => mapPayrollLog(row, names));
  },

  async reversePayroll(runId: string): Promise<PayrollLog> {
    if (!isSupabaseConfigured) {
      const target = mockPayrollLogs.find((log) => log.id === runId);
      if (!target) throw mapSupabaseError(new Error('Payroll run not found'));
      if (target.reversedAt != null) {
        throw mapSupabaseError(new Error('Payroll run already reversed'));
      }
      const now = new Date().toISOString();
      mockSales = mockSales.map((sale) =>
        sale.payrollRunId === runId
          ? { ...sale, payrollRunId: null, paidAt: null }
          : sale
      );
      const updated: PayrollLog = {
        ...target,
        reversedAt: now,
        reversedBy: 'local',
        reversedByName: 'You',
      };
      mockPayrollLogs = mockPayrollLogs.map((log) => (log.id === runId ? updated : log));
      return updated;
    }

    const { data, error } = await getSupabase().rpc('reverse_payroll', {
      p_run_id: runId,
    });
    if (error) throw mapSupabaseError(error);
    const names = await resolveSellerNames(
      [data.processed_by, data.reversed_by].filter((id): id is string => id != null)
    );
    return mapPayrollLog(data, names);
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
