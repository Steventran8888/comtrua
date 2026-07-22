export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface DishCategory {
  id: number;
  name: string;
  sort_order: number;
}

export interface Dish {
  id: number;
  category_id: number;
  name: string;
  price: number;
  note: string | null;
  sort_order: number;
}

export interface OrderItem {
  id: string;
  user_id: string;
  user_name: string;
  order_date: string;
  dish_id: number | null;
  dish_name: string;
  price: number;
  created_at: string;
}

export interface Voucher {
  id: string;
  user_id: string;
  user_name: string;
  voucher_date: string;
  image_url: string;
  denomination: number;
  created_at: string;
}

export interface VoucherSharePin {
  voucher_date: string;
  pin: string;
  created_at: string;
}

export interface LuckyDraw {
  draw_date: string;
  winner_ids: string[];
  winner_names: string[];
  created_at: string;
}

export interface SharedVoucher {
  id: string;
  user_name: string;
  image_url: string;
  denomination: number;
  created_at: string;
}
