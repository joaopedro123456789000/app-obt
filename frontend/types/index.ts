export interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  points: number;
  level: number;
  total_kg_collected: number;
  total_co2_saved: number;
  role: string;
  city?: string;
  state?: string;
  created_at: string;
}

export interface CollectionPoint {
  point_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  types_accepted: string[];
  capacity_percentage: number;
  is_school: boolean;
  school_id?: string;
  contact?: string;
  hours?: string;
  distance_km?: number;
  created_at: string;
}

export interface Delivery {
  delivery_id: string;
  user_id: string;
  point_id: string;
  waste_type: string;
  weight_kg: number;
  photo_base64?: string;
  points_earned: number;
  co2_saved_kg: number;
  confidence: number;
  created_at: string;
}

export interface NewsArticle {
  article_id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  image_url?: string;
  published_at: string;
  category: string;
  state?: string;
}

export interface RankingEntry {
  user_id: string;
  user_name: string;
  user_picture?: string;
  points: number;
  total_kg: number;
  level: number;
  rank: number;
}

export interface Challenge {
  challenge_id: string;
  title: string;
  description: string;
  goal: number;
  reward_points: number;
  start_date: string;
  end_date: string;
  active: boolean;
}
