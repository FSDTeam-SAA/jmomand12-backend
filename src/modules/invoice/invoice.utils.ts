import { ISettings } from '../settings/settings.interface';

export interface InvoiceChargeBreakdown {
  subtotal: number;
  buyerPremiumAmount: number;
  salesTaxAmount: number;
  taxableAmount: number;
  totalAmount: number;
  stateTaxRate: number;
  stateTaxState?: string;
  stateTaxLabel?: string;
}

const roundMoney = (amount: number) => Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;

export const calculateAuctionInvoiceCharges = (params: {
  winningBid: number;
  buyerPremiumEnabled?: boolean;
  buyerPremiumAmount?: number;
  settings?: Partial<ISettings> | null;
}): InvoiceChargeBreakdown => {
  const subtotal = roundMoney(params.winningBid);
  const buyerPremiumAmount = params.buyerPremiumEnabled
    ? roundMoney(params.buyerPremiumAmount ?? 0)
    : 0;
  const stateTaxRate = Number(params.settings?.stateTaxRate ?? 0);
  const taxableAmount = roundMoney(subtotal + buyerPremiumAmount);
  const salesTaxAmount = roundMoney(taxableAmount * (stateTaxRate / 100));
  const totalAmount = roundMoney(taxableAmount + salesTaxAmount);

  return {
    subtotal,
    buyerPremiumAmount,
    taxableAmount,
    salesTaxAmount,
    totalAmount,
    stateTaxRate,
    stateTaxState: params.settings?.stateTaxState,
    stateTaxLabel: params.settings?.stateTaxLabel,
  };
};
