// Trimmed Ravelry API shapes: only the fields this app reads.

export interface RavPhoto {
  small_url?: string;
  medium_url?: string;
  square_url?: string;
  small2_url?: string;
}

export interface RavYarnWeight {
  name: string;
  permalink?: string;
}

export interface RavPatternSummary {
  id: number;
  name: string;
  permalink: string;
  designer?: { name: string };
  first_photo?: RavPhoto | null;
  free?: boolean;
}

export interface RavPack {
  id: number;
  yarn_id?: number | null;
  yarn_name?: string | null;
  colorway?: string | null;
  quantity_description?: string | null;
  yarn?: { id: number; name: string; yarn_company_name?: string; permalink?: string } | null;
  yarn_weight?: RavYarnWeight | null;
}

export interface RavPattern extends RavPatternSummary {
  craft?: { name: string };
  pattern_categories?: { name: string; permalink: string; parent?: { permalink: string; parent?: { permalink: string } } }[];
  pattern_attributes?: { permalink: string }[];
  sizes_available?: string;
  yardage?: number | null;
  yardage_max?: number | null;
  yarn_weight?: RavYarnWeight | null;
  gauge?: number | null;
  row_gauge?: number | null;
  gauge_divisor?: number | null;
  gauge_pattern?: string | null;
  packs?: RavPack[];
  photos?: RavPhoto[];
}

export interface RavYarn {
  id: number;
  name: string;
  permalink?: string;
  yarn_company_name?: string;
  yarn_weight?: RavYarnWeight | null;
  yardage?: number | null;
  grams?: number | null;
  first_photo?: RavPhoto | null;
  /** Detail responses (yarns/{id}.json) return `photos` instead of `first_photo`. */
  photos?: RavPhoto[];
  rating_average?: number | null;
  rating_count?: number | null;
  discontinued?: boolean;
}
