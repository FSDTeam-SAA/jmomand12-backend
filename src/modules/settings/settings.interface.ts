export interface ISettings {
  key: 'platform';
  pickupGraceDays: number;
  storageFeePerDay: number;
  forfeitureDays: number;
  pickupInstructions?: string;
  stateTaxRate: number;
  stateTaxState?: string;
  stateTaxLabel?: string;
}
