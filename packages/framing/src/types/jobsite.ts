export interface FrmJobsite {
  id: string
  organization_id: string | null
  name: string
  builder_name: string
  address: string | null
  city: string
  svg_data: string | null
  original_plan_url: string | null
  total_lots: number
  completed_lots: number
  start_date: string | null
  expected_end_date: string | null
  status: string
  foreman_id: string | null
  lumberyard_notes: string | null
  created_at: string
  updated_at: string
}
