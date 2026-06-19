export type ProductCondition = 'new' | 'open_box' | 'like_new' | 'used' | 'damaged' | 'for_parts';

export interface IProduct {
  title: string;
  description: string;
  category: string;
  condition: ProductCondition;
  inventoryStatus: 'available' | 'unavailable';
  images: {
    public_id: string;
    url: string;
  }[];
  totalReview: number;
  averageReview: number;
}
