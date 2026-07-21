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
  created_at: string;
}
