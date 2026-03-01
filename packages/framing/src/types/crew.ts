export interface FrmCrew {
  id: string
  organization_id: string | null
  name: string
  lead_id: string | null
  specialty: string[]
  phone: string | null
  email: string | null
  wsib_number: string | null
  wsib_expires: string | null
  status: string
  created_at: string
}

export interface FrmCrewWorker {
  id: string
  organization_id: string | null
  crew_id: string
  worker_id: string
  role: string
  employment_type: string
  joined_at: string
  left_at: string | null
}
