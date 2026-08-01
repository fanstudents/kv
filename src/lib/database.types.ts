export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_artifacts: {
        Row: {
          agent_slug: string
          approved_at: string | null
          approved_by: string | null
          content: string | null
          created_at: string
          id: string
          kind: string
          meta: Json
          run_id: string | null
          title: string
          uri: string | null
          version: number
        }
        Insert: {
          agent_slug: string
          approved_at?: string | null
          approved_by?: string | null
          content?: string | null
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          run_id?: string | null
          title: string
          uri?: string | null
          version?: number
        }
        Update: {
          agent_slug?: string
          approved_at?: string | null
          approved_by?: string | null
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          run_id?: string | null
          title?: string
          uri?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_artifacts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_goals: {
        Row: {
          agent_slug: string
          cadence: string
          created_at: string
          due_date: string
          id: string
          metric_id: string
          note: string | null
          start_date: string
          start_value: number
          target: number
          updated_at: string
        }
        Insert: {
          agent_slug: string
          cadence?: string
          created_at?: string
          due_date: string
          id: string
          metric_id: string
          note?: string | null
          start_date: string
          start_value?: number
          target: number
          updated_at?: string
        }
        Update: {
          agent_slug?: string
          cadence?: string
          created_at?: string
          due_date?: string
          id?: string
          metric_id?: string
          note?: string | null
          start_date?: string
          start_value?: number
          target?: number
          updated_at?: string
        }
        Relationships: []
      }
      agent_live_task: {
        Row: {
          agent_slug: string
          caption: string | null
          image: string | null
          image_version: number
          status: string
          step: number
          updated_at: string
        }
        Insert: {
          agent_slug: string
          caption?: string | null
          image?: string | null
          image_version?: number
          status?: string
          step?: number
          updated_at?: string
        }
        Update: {
          agent_slug?: string
          caption?: string | null
          image?: string | null
          image_version?: number
          status?: string
          step?: number
          updated_at?: string
        }
        Relationships: []
      }
      agent_memory: {
        Row: {
          agent_slug: string | null
          confidence: number
          content: string
          created_at: string
          embedding_json: Json | null
          expires_at: string | null
          id: string
          kind: string
          last_used_at: string | null
          level: number
          scope: string
          source_run_id: string | null
          use_count: number
        }
        Insert: {
          agent_slug?: string | null
          confidence?: number
          content: string
          created_at?: string
          embedding_json?: Json | null
          expires_at?: string | null
          id?: string
          kind?: string
          last_used_at?: string | null
          level?: number
          scope?: string
          source_run_id?: string | null
          use_count?: number
        }
        Update: {
          agent_slug?: string | null
          confidence?: number
          content?: string
          created_at?: string
          embedding_json?: Json | null
          expires_at?: string | null
          id?: string
          kind?: string
          last_used_at?: string | null
          level?: number
          scope?: string
          source_run_id?: string | null
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_run_steps: {
        Row: {
          cost_usd: number
          duration_ms: number | null
          ended_at: string | null
          id: string
          input_summary: string | null
          node_id: string
          output_summary: string | null
          run_id: string
          seq: number
          started_at: string
          status: string
          tokens: number
        }
        Insert: {
          cost_usd?: number
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          input_summary?: string | null
          node_id: string
          output_summary?: string | null
          run_id: string
          seq?: number
          started_at?: string
          status?: string
          tokens?: number
        }
        Update: {
          cost_usd?: number
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          input_summary?: string | null
          node_id?: string
          output_summary?: string | null
          run_id?: string
          seq?: number
          started_at?: string
          status?: string
          tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_slug: string
          cost_usd: number
          ended_at: string | null
          error_detail: string | null
          error_kind: string | null
          goal_id: string | null
          id: string
          meta: Json
          next_retry_at: string | null
          parent_run_id: string | null
          retry_count: number
          started_at: string
          status: string
          summary: string | null
          total_tokens: number
          trigger: string
          trigger_ref: string | null
        }
        Insert: {
          agent_slug: string
          cost_usd?: number
          ended_at?: string | null
          error_detail?: string | null
          error_kind?: string | null
          goal_id?: string | null
          id?: string
          meta?: Json
          next_retry_at?: string | null
          parent_run_id?: string | null
          retry_count?: number
          started_at?: string
          status?: string
          summary?: string | null
          total_tokens?: number
          trigger?: string
          trigger_ref?: string | null
        }
        Update: {
          agent_slug?: string
          cost_usd?: number
          ended_at?: string | null
          error_detail?: string | null
          error_kind?: string | null
          goal_id?: string | null
          id?: string
          meta?: Json
          next_retry_at?: string | null
          parent_run_id?: string | null
          retry_count?: number
          started_at?: string
          status?: string
          summary?: string | null
          total_tokens?: number
          trigger?: string
          trigger_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          attempts: number
          claimed_at: string | null
          created_at: string
          due_at: string | null
          from_agent: string | null
          handled_run_id: string | null
          id: string
          last_error: string | null
          payload: Json
          source_run_id: string | null
          state: string
          title: string
          to_agent: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          due_at?: string | null
          from_agent?: string | null
          handled_run_id?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          source_run_id?: string | null
          state?: string
          title: string
          to_agent: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          due_at?: string | null
          from_agent?: string | null
          handled_run_id?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          source_run_id?: string | null
          state?: string
          title?: string
          to_agent?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_handled_run_id_fkey"
            columns: ["handled_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          agent_slug: string | null
          completion_tokens: number
          cost_usd: number
          created_at: string
          id: string
          model: string
          operation: string
          prompt_tokens: number
          run_id: string | null
          total_tokens: number
        }
        Insert: {
          agent_slug?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          id?: string
          model: string
          operation: string
          prompt_tokens?: number
          run_id?: string | null
          total_tokens?: number
        }
        Update: {
          agent_slug?: string | null
          completion_tokens?: number
          cost_usd?: number
          created_at?: string
          id?: string
          model?: string
          operation?: string
          prompt_tokens?: number
          run_id?: string | null
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_logs: {
        Row: {
          channel_filter: string | null
          created_at: string
          failed_count: number
          id: string
          message_style: string
          message_text: string
          recipient_count: number
          success_count: number
          tag_filter: string | null
        }
        Insert: {
          channel_filter?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          message_style?: string
          message_text: string
          recipient_count?: number
          success_count?: number
          tag_filter?: string | null
        }
        Update: {
          channel_filter?: string | null
          created_at?: string
          failed_count?: number
          id?: string
          message_style?: string
          message_text?: string
          recipient_count?: number
          success_count?: number
          tag_filter?: string | null
        }
        Relationships: []
      }
      checklist_status: {
        Row: {
          done: boolean
          item_id: string
          updated_at: string
        }
        Insert: {
          done?: boolean
          item_id: string
          updated_at?: string
        }
        Update: {
          done?: boolean
          item_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_profiles: {
        Row: {
          company: string | null
          company_summary: string | null
          confidence: number
          contact_id: string | null
          created_at: string
          error_detail: string | null
          highlights: Json
          id: string
          invite_id: string | null
          links: Json
          person_name: string
          person_summary: string | null
          run_id: string | null
          sources: Json
          status: string
          talking_points: Json
          updated_at: string
        }
        Insert: {
          company?: string | null
          company_summary?: string | null
          confidence?: number
          contact_id?: string | null
          created_at?: string
          error_detail?: string | null
          highlights?: Json
          id?: string
          invite_id?: string | null
          links?: Json
          person_name: string
          person_summary?: string | null
          run_id?: string | null
          sources?: Json
          status?: string
          talking_points?: Json
          updated_at?: string
        }
        Update: {
          company?: string | null
          company_summary?: string | null
          confidence?: number
          contact_id?: string | null
          created_at?: string
          error_detail?: string | null
          highlights?: Json
          id?: string
          invite_id?: string | null
          links?: Json
          person_name?: string
          person_summary?: string | null
          run_id?: string | null
          sources?: Json
          status?: string
          talking_points?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_profiles_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          line_user_id: string | null
          name: string
          phone: string | null
          source: string
          tags: string[]
          title: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          line_user_id?: string | null
          name: string
          phone?: string | null
          source?: string
          tags?: string[]
          title?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          line_user_id?: string | null
          name?: string
          phone?: string | null
          source?: string
          tags?: string[]
          title?: string | null
        }
        Relationships: []
      }
      kb_chunks: {
        Row: {
          chunk_index: number
          content: string
          doc_id: string
          embedding: string | null
          embedding_json: Json | null
          id: string
          level: number
          source_page: number | null
          title: string | null
          token_estimate: number | null
          updated_at: string
        }
        Insert: {
          chunk_index?: number
          content: string
          doc_id: string
          embedding?: string | null
          embedding_json?: Json | null
          id?: string
          level?: number
          source_page?: number | null
          title?: string | null
          token_estimate?: number | null
          updated_at?: string
        }
        Update: {
          chunk_index?: number
          content?: string
          doc_id?: string
          embedding?: string | null
          embedding_json?: Json | null
          id?: string
          level?: number
          source_page?: number | null
          title?: string | null
          token_estimate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      kb_citations: {
        Row: {
          agent_slug: string | null
          doc_id: string
          id: string
          question: string | null
          run_id: string | null
          used_at: string
        }
        Insert: {
          agent_slug?: string | null
          doc_id: string
          id?: string
          question?: string | null
          run_id?: string | null
          used_at?: string
        }
        Update: {
          agent_slug?: string | null
          doc_id?: string
          id?: string
          question?: string | null
          run_id?: string | null
          used_at?: string
        }
        Relationships: []
      }
      kb_sources: {
        Row: {
          byte_size: number | null
          char_count: number | null
          checksum: string
          content_hash: string | null
          created_at: string
          error_detail: string | null
          extracted_text: string | null
          filename: string
          id: string
          last_checked_at: string | null
          meta: Json
          mime_type: string | null
          page_count: number | null
          source_type: string
          status: string
          updated_at: string
          uploaded_by: string | null
          url: string | null
        }
        Insert: {
          byte_size?: number | null
          char_count?: number | null
          checksum: string
          content_hash?: string | null
          created_at?: string
          error_detail?: string | null
          extracted_text?: string | null
          filename: string
          id?: string
          last_checked_at?: string | null
          meta?: Json
          mime_type?: string | null
          page_count?: number | null
          source_type?: string
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
        }
        Update: {
          byte_size?: number | null
          char_count?: number | null
          checksum?: string
          content_hash?: string | null
          created_at?: string
          error_detail?: string | null
          extracted_text?: string | null
          filename?: string
          id?: string
          last_checked_at?: string | null
          meta?: Json
          mime_type?: string | null
          page_count?: number | null
          source_type?: string
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          url?: string | null
        }
        Relationships: []
      }
      knowledge_access: {
        Row: {
          agent_slug: string
          max_level: number
          updated_at: string
        }
        Insert: {
          agent_slug: string
          max_level: number
          updated_at?: string
        }
        Update: {
          agent_slug?: string
          max_level?: number
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          builtin: boolean
          category: string
          content: string | null
          created_at: string
          id: string
          kind: string
          level: number
          meta: Json
          owner: string | null
          review_at: string | null
          source_doc_id: string | null
          source_page: number | null
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          builtin?: boolean
          category: string
          content?: string | null
          created_at?: string
          id: string
          kind?: string
          level: number
          meta?: Json
          owner?: string | null
          review_at?: string | null
          source_doc_id?: string | null
          source_page?: number | null
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          builtin?: boolean
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          level?: number
          meta?: Json
          owner?: string | null
          review_at?: string | null
          source_doc_id?: string | null
          source_page?: number | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      line_agent_activity: {
        Row: {
          agent_slug: string | null
          id: string
          occurred_at: string
          status: string
          summary: string
        }
        Insert: {
          agent_slug?: string | null
          id?: string
          occurred_at?: string
          status: string
          summary: string
        }
        Update: {
          agent_slug?: string | null
          id?: string
          occurred_at?: string
          status?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_agent_activity_agent_slug_fkey"
            columns: ["agent_slug"]
            isOneToOne: false
            referencedRelation: "line_agents"
            referencedColumns: ["slug"]
          },
        ]
      }
      line_agents: {
        Row: {
          enabled: boolean
          name: string
          settings: Json
          slug: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          name: string
          settings?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          name?: string
          settings?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      line_conversation_locks: {
        Row: {
          context: Json
          created_at: string
          expires_at: string
          line_user_id: string
          owner_agent_slug: string
        }
        Insert: {
          context?: Json
          created_at?: string
          expires_at: string
          line_user_id: string
          owner_agent_slug: string
        }
        Update: {
          context?: Json
          created_at?: string
          expires_at?: string
          line_user_id?: string
          owner_agent_slug?: string
        }
        Relationships: []
      }
      line_subscribers: {
        Row: {
          channel: string
          display_name: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          line_user_id: string
          note: string | null
          picture_url: string | null
          tags: string[]
        }
        Insert: {
          channel?: string
          display_name?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          line_user_id: string
          note?: string | null
          picture_url?: string | null
          tags?: string[]
        }
        Update: {
          channel?: string
          display_name?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          line_user_id?: string
          note?: string | null
          picture_url?: string | null
          tags?: string[]
        }
        Relationships: []
      }
      line_support_conversations: {
        Row: {
          id: string
          line_user_id: string
          occurred_at: string
          role: string
          text: string
        }
        Insert: {
          id?: string
          line_user_id: string
          occurred_at?: string
          role: string
          text: string
        }
        Update: {
          id?: string
          line_user_id?: string
          occurred_at?: string
          role?: string
          text?: string
        }
        Relationships: []
      }
      meeting_turns: {
        Row: {
          agent_slug: string | null
          content: string
          created_at: string
          id: string
          meeting_id: string
          role: string
          speaker: string | null
          turn_index: number
        }
        Insert: {
          agent_slug?: string | null
          content: string
          created_at?: string
          id?: string
          meeting_id: string
          role: string
          speaker?: string | null
          turn_index?: number
        }
        Update: {
          agent_slug?: string | null
          content?: string
          created_at?: string
          id?: string
          meeting_id?: string
          role?: string
          speaker?: string | null
          turn_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "meeting_turns_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          recording_path: string | null
          started_at: string
          summary: string | null
          title: string | null
          transcript: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recording_path?: string | null
          started_at?: string
          summary?: string | null
          title?: string | null
          transcript?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          recording_path?: string | null
          started_at?: string
          summary?: string | null
          title?: string | null
          transcript?: string | null
        }
        Relationships: []
      }
      metric_snapshots: {
        Row: {
          captured_at: string
          captured_on: string | null
          id: number
          meta: Json
          metric_id: string
          source: string | null
          value: number
        }
        Insert: {
          captured_at?: string
          captured_on?: string | null
          id?: number
          meta?: Json
          metric_id: string
          source?: string | null
          value: number
        }
        Update: {
          captured_at?: string
          captured_on?: string | null
          id?: number
          meta?: Json
          metric_id?: string
          source?: string | null
          value?: number
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          status: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      pending_invites: {
        Row: {
          body: string
          calendar_event_id: string | null
          chosen_slot: string | null
          contact_id: string | null
          created_at: string
          id: string
          line_user_id: string
          location: string | null
          resolved_at: string | null
          slot1: string
          slot1_end: string | null
          slot1_start: string | null
          slot2: string
          slot2_end: string | null
          slot2_start: string | null
          status: string
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          calendar_event_id?: string | null
          chosen_slot?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          line_user_id: string
          location?: string | null
          resolved_at?: string | null
          slot1: string
          slot1_end?: string | null
          slot1_start?: string | null
          slot2: string
          slot2_end?: string | null
          slot2_start?: string | null
          status?: string
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          calendar_event_id?: string | null
          chosen_slot?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          line_user_id?: string
          location?: string | null
          resolved_at?: string | null
          slot1?: string
          slot1_end?: string | null
          slot1_start?: string | null
          slot2?: string
          slot2_end?: string | null
          slot2_start?: string | null
          status?: string
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teachify_orders: {
        Row: {
          amount: number | null
          coupon_code: string | null
          created_at: string
          currency: string
          id: string
          is_refund: boolean
          item_names: string[]
          order_id: string
          paid_at: string | null
          source: string
          trade_no: string | null
          user_email: string | null
          user_name: string | null
        }
        Insert: {
          amount?: number | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_refund?: boolean
          item_names?: string[]
          order_id: string
          paid_at?: string | null
          source?: string
          trade_no?: string | null
          user_email?: string | null
          user_name?: string | null
        }
        Update: {
          amount?: number | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_refund?: boolean
          item_names?: string[]
          order_id?: string
          paid_at?: string | null
          source?: string
          trade_no?: string | null
          user_email?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          email: string
          email_verified: boolean | null
          full_name: string | null
          id: string
          important_moment: string
          partner_id: string | null
          personalization_data: Json | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          important_moment: string
          partner_id?: string | null
          personalization_data?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          important_moment?: string
          partner_id?: string | null
          personalization_data?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_offers: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          line_user_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          line_user_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          line_user_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_offers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_run_cost: {
        Args: { p_cost: number; p_run_id: string; p_tokens: number }
        Returns: undefined
      }
      claim_agent_tasks: {
        Args: { p_agent: string; p_limit?: number }
        Returns: {
          attempts: number
          claimed_at: string | null
          created_at: string
          due_at: string | null
          from_agent: string | null
          handled_run_id: string | null
          id: string
          last_error: string | null
          payload: Json
          source_run_id: string | null
          state: string
          title: string
          to_agent: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "agent_tasks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      match_kb_chunks: {
        Args: {
          match_count?: number
          max_level: number
          query_embedding: string
        }
        Returns: {
          content: string
          doc_id: string
          id: string
          level: number
          similarity: number
          source_page: number
          title: string
        }[]
      }
      requeue_stale_agent_tasks: {
        Args: { p_minutes?: number }
        Returns: number
      }
    }
    Enums: {
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "user"],
    },
  },
} as const

