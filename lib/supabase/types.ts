export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type RaceState =
  | 'IDLE'
  | 'READY'
  | 'LIGHTS_1'
  | 'LIGHTS_2'
  | 'LIGHTS_3'
  | 'LIGHTS_4'
  | 'LIGHTS_5'
  | 'LIGHTS_OUT'
  | 'VOTING'
  | 'VOTING_CLOSED'
  | 'RESULT_REVEAL'
  | 'LAP_COMPLETE'
  | 'FINAL_RESULTS'
  | 'PODIUM'
  | 'CHEQUERED_FLAG'

export type RaceFlag = 'GREEN' | 'YELLOW' | 'RED' | 'CHEQUERED' | 'NONE'

export type EventStatus = 'DRAFT' | 'READY' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
export type CategoryStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED'

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          name: string
          year: number
          description: string | null
          status: EventStatus
          current_category_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      category_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          default_lap_count: number
          default_voting_duration_seconds: number
          scoring_config: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['category_templates']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['category_templates']['Insert']>
      }
      category_template_candidates: {
        Row: {
          id: string
          template_id: string
          name: string
          display_order: number
        }
        Insert: Omit<Database['public']['Tables']['category_template_candidates']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['category_template_candidates']['Insert']>
      }
      event_categories: {
        Row: {
          id: string
          event_id: string
          template_id: string | null
          name: string
          description: string | null
          icon: string | null
          lap_count: number
          voting_duration_seconds: number
          scoring_config: Json
          display_order: number
          status: CategoryStatus
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['event_categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['event_categories']['Insert']>
      }
      event_category_candidates: {
        Row: {
          id: string
          event_category_id: string
          name: string
          display_order: number
        }
        Insert: Omit<Database['public']['Tables']['event_category_candidates']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['event_category_candidates']['Insert']>
      }
      laps: {
        Row: {
          id: string
          event_category_id: string
          lap_number: number
          status: 'PENDING' | 'ACTIVE' | 'VOTING' | 'CLOSED' | 'COMPLETED'
          started_at: string | null
          voting_opened_at: string | null
          voting_closed_at: string | null
          voting_ends_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['laps']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['laps']['Insert']>
      }
      votes: {
        Row: {
          id: string
          lap_id: string
          event_category_id: string
          candidate_id: string
          voter_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['votes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['votes']['Insert']>
      }
      lap_results: {
        Row: {
          id: string
          lap_id: string
          event_category_id: string
          candidate_id: string
          vote_count: number
          position: number
          points_earned: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['lap_results']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['lap_results']['Insert']>
      }
      championship_points: {
        Row: {
          id: string
          event_id: string
          event_category_id: string
          candidate_id: string
          total_points: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['championship_points']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['championship_points']['Insert']>
      }
      race_sessions: {
        Row: {
          id: string
          event_id: string
          event_category_id: string
          state: RaceState
          flag: RaceFlag
          current_lap_number: number
          voting_ends_at: string | null
          started_at: string | null
          updated_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['race_sessions']['Row'], 'id' | 'updated_at' | 'created_at'>
        Update: Partial<Database['public']['Tables']['race_sessions']['Insert']>
      }
      race_events: {
        Row: {
          id: string
          session_id: string
          event_type: string
          payload: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['race_events']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience types
export type Event = Database['public']['Tables']['events']['Row']
export type CategoryTemplate = Database['public']['Tables']['category_templates']['Row']
export type CategoryTemplateCandidate = Database['public']['Tables']['category_template_candidates']['Row']
export type EventCategory = Database['public']['Tables']['event_categories']['Row']
export type EventCategoryCandidate = Database['public']['Tables']['event_category_candidates']['Row']
export type Lap = Database['public']['Tables']['laps']['Row']
export type Vote = Database['public']['Tables']['votes']['Row']
export type LapResult = Database['public']['Tables']['lap_results']['Row']
export type ChampionshipPoint = Database['public']['Tables']['championship_points']['Row']
export type RaceSession = Database['public']['Tables']['race_sessions']['Row']
export type RaceEvent = Database['public']['Tables']['race_events']['Row']

// Enriched types
export type EventCategoryWithCandidates = EventCategory & {
  candidates: EventCategoryCandidate[]
}

export type RaceSessionWithDetails = RaceSession & {
  category: EventCategoryWithCandidates
}

export type LapResultWithCandidate = LapResult & {
  candidate: EventCategoryCandidate
}

export const DEFAULT_SCORING: Record<number, number> = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
}
