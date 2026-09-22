export type FraudOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  mobile: string;
  courierName: string | null;
  trackingId: string | null;
  itemsText: string;
  quantity: number;
  grandTotal: number;
  paymentStatus: string;
  status: string;
  courierStatus: string;
  rejectReason: string | null;
  returnReason: string | null;
  adminNotes: string | null;
};

export type CourierRow = {
  courierName: string;
  totalOrders: number;
  delivered: number;
  rejected: number;
  returned: number;
  cancelled: number;
  pending: number;
  totalValue: number;
  deliveredValue: number;
  rejectedValue: number;
  returnedValue: number;
  successRate: number | null;
  rejectionRate: number;
  returnRate: number;
  riskStatus: string;
  lastOrderDate: string | null;
};

const DELIVERED = new Set(["delivered"]);
const REJECTED = new Set(["rejected"]);
const RETURNED = new Set(["returned"]);
const CANCELLED = new Set(["cancelled", "expired"]);
const COURIER_DELIVERED = new Set(["delivered", "partially_delivered"]);

export function calcRisk(
  orders: FraudOrder[],
  thresholds: { low: number; medium: number; rejectHigh: number }
): {
  total: number;
  delivered: number;
  rejected: number;
  returned: number;
  cancelled: number;
  pending: number;
  confirmed: number;
  totalValue: number;
  deliveredValue: number;
  rejectedValue: number;
  returnedValue: number;
  successRate: number | null;
  rejectionRate: number;
  returnRate: number;
  riskLevel: string;
  reasons: string[];
} {
  const total = orders.length;
  let delivered = 0,
    rejected = 0,
    returned = 0,
    cancelled = 0,
    pending = 0,
    confirmed = 0;
  let totalValue = 0,
    deliveredValue = 0,
    rejectedValue = 0,
    returnedValue = 0;
  for (const o of orders) {
    totalValue += Number(o.grandTotal || 0);
    if (DELIVERED.has(o.status)) {
      delivered++;
      deliveredValue += Number(o.grandTotal || 0);
    } else if (REJECTED.has(o.status) || o.courierStatus === "rejected") {
      rejected++;
      rejectedValue += Number(o.grandTotal || 0);
    } else if (RETURNED.has(o.status) || o.courierStatus === "returned") {
      returned++;
      returnedValue += Number(o.grandTotal || 0);
    } else if (CANCELLED.has(o.status)) {
      cancelled++;
    } else if (["confirmed", "processing", "ready_to_ship", "shipped"].includes(o.status)) {
      confirmed++;
      pending++;
    } else {
      pending++;
    }
  }
  const eligible = delivered + rejected + returned;
  const successRate = eligible === 0 ? null : (delivered / eligible) * 100;
  const rejectionRate = total === 0 ? 0 : (rejected / total) * 100;
  const returnRate = total === 0 ? 0 : (returned / total) * 100;

  let riskLevel = "LOW";
  const reasons: string[] = [];
  if (total === 0 || successRate === null) {
    riskLevel = "UNKNOWN";
    reasons.push("Not enough data — no eligible (delivered/rejected/returned) orders yet.");
  } else if (
    (rejected + returned >= 5 && successRate < 50) ||
    (rejected >= 4 && returned >= 2) ||
    rejectionRate > 60
  ) {
    riskLevel = "CRITICAL";
    reasons.push("Very high rejection/return pattern detected.");
  } else if (successRate < thresholds.medium || rejectionRate > thresholds.rejectHigh || returnRate > thresholds.rejectHigh) {
    riskLevel = "HIGH";
    reasons.push(
      `Success rate ${successRate.toFixed(1)}% is below ${thresholds.medium}% or rejection/return above ${thresholds.rejectHigh}%.`
    );
  } else if (successRate < thresholds.low) {
    riskLevel = "MEDIUM";
    reasons.push(`Success rate ${successRate.toFixed(1)}% is between ${thresholds.medium}% and ${thresholds.low}%.`);
  } else {
    riskLevel = "LOW";
    reasons.push(`Success rate ${successRate.toFixed(1)}% meets the ${thresholds.low}%+ healthy threshold.`);
  }
  void COURIER_DELIVERED;
  return {
    total,
    delivered,
    rejected,
    returned,
    cancelled,
    pending,
    confirmed,
    totalValue,
    deliveredValue,
    rejectedValue,
    returnedValue,
    successRate,
    rejectionRate,
    returnRate,
    riskLevel,
    reasons,
  };
}

export function courierWiseReport(orders: FraudOrder[]): CourierRow[] {
  const map = new Map<string, FraudOrder[]>();
  for (const o of orders) {
    const key = o.courierName || "No Courier / Pending";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(o);
  }
  const rows: CourierRow[] = [];
  for (const [courierName, list] of map) {
    const r = calcRisk(list, { low: 80, medium: 50, rejectHigh: 40 });
    const eligible = r.delivered + r.rejected + r.returned;
    rows.push({
      courierName,
      totalOrders: r.total,
      delivered: r.delivered,
      rejected: r.rejected,
      returned: r.returned,
      cancelled: r.cancelled,
      pending: r.pending,
      totalValue: r.totalValue,
      deliveredValue: r.deliveredValue,
      rejectedValue: r.rejectedValue,
      returnedValue: r.returnedValue,
      successRate: r.successRate,
      rejectionRate: r.rejectionRate,
      returnRate: r.returnRate,
      riskStatus: r.riskLevel,
      lastOrderDate: list
        .map((x) => x.createdAt)
        .sort()
        .reverse()[0] ?? null,
    });
    void eligible;
  }
  return rows.sort((a, b) => b.totalOrders - a.totalOrders);
}
