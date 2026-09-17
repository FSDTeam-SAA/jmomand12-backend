import { ISettings } from '../settings/settings.interface';

export const AUCTION_FEE_RATES = {
  BUYER_PREMIUM_RATE: 15, // 15%
  VIRGINIA_SALES_TAX_RATE: 5.5, // 5.5%
  CREDIT_CARD_FEE_RATE: 3.3, // 3.3%
  DEFAULT_STATE: 'VA',
  DEFAULT_TAX_LABEL: 'Virginia Sales Tax',
};

export interface InvoiceChargeBreakdown {
  subtotal: number;
  buyerPremiumRate: number;
  buyerPremiumAmount: number;
  taxableAmount: number;
  stateTaxRate: number;
  stateTaxState: string;
  stateTaxLabel: string;
  salesTaxAmount: number;
  creditCardFeeRate: number;
  creditCardFeeAmount: number;
  totalAmount: number;
}

export const roundMoney = (amount: number) =>
  Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;

export const calculateAuctionInvoiceCharges = (params: {
  winningBid: number;
  buyerPremiumEnabled?: boolean;
  buyerPremiumRate?: number;
  buyerPremiumAmount?: number;
  stateTaxRate?: number;
  creditCardFeeRate?: number;
  settings?: Partial<ISettings> | null;
}): InvoiceChargeBreakdown => {
  const subtotal = roundMoney(params.winningBid);

  // Buyer Premium: default 15% on winning bid (mandatory for auction winning bid invoices)
  const buyerPremiumRate =
    params.buyerPremiumRate ?? AUCTION_FEE_RATES.BUYER_PREMIUM_RATE;
  const buyerPremiumAmount =
    params.buyerPremiumAmount != null &&
    params.buyerPremiumAmount > 0 &&
    params.buyerPremiumRate == null
      ? roundMoney(params.buyerPremiumAmount)
      : roundMoney(subtotal * (buyerPremiumRate / 100));

  // Virginia Sales Tax: default 5.5% on taxable amount (winningBid + buyerPremium)
  const stateTaxRate =
    params.stateTaxRate ??
    (params.settings?.stateTaxRate && Number(params.settings.stateTaxRate) > 0
      ? Number(params.settings.stateTaxRate)
      : AUCTION_FEE_RATES.VIRGINIA_SALES_TAX_RATE);
  const stateTaxState =
    params.settings?.stateTaxState || AUCTION_FEE_RATES.DEFAULT_STATE;
  const stateTaxLabel =
    params.settings?.stateTaxLabel || AUCTION_FEE_RATES.DEFAULT_TAX_LABEL;

  const taxableAmount = roundMoney(subtotal + buyerPremiumAmount);
  const salesTaxAmount = roundMoney(taxableAmount * (stateTaxRate / 100));

  // Credit Card Processing Fee: default 3.3% on gross transaction (taxable + salesTax)
  const creditCardFeeRate =
    params.creditCardFeeRate ?? AUCTION_FEE_RATES.CREDIT_CARD_FEE_RATE;
  const creditCardBase = roundMoney(taxableAmount + salesTaxAmount);
  const creditCardFeeAmount = roundMoney(
    creditCardBase * (creditCardFeeRate / 100),
  );

  // Final Total
  const totalAmount = roundMoney(creditCardBase + creditCardFeeAmount);

  return {
    subtotal,
    buyerPremiumRate,
    buyerPremiumAmount,
    taxableAmount,
    stateTaxRate,
    stateTaxState,
    stateTaxLabel,
    salesTaxAmount,
    creditCardFeeRate,
    creditCardFeeAmount,
    totalAmount,
  };
};
