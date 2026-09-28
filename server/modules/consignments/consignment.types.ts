export type ConsignmentStatus =
  | "DRAFT"
  | "DISPATCHED"
  | "OPEN"
  | "SETTLING"
  | "SETTLED"
  | "CANCELED";

export interface ConsignmentItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  soldQuantity?: number;
  returnedQuantity?: number;
}

export interface ConsignmentEntity {
  id: string;
  organizationId: string;
  code: string;
  resellerId?: string;
  resellerName: string;
  resellerPhone?: string;
  status: ConsignmentStatus;
  commissionRate: number;
  totalPieces: number;
  totalValue: number;
  soldValue: number;
  resellerCommission: number;
  netStoreAmount: number;
  items: ConsignmentItem[];
  dispatchedAt: string;
  settlementDueAt: string;
  settledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
