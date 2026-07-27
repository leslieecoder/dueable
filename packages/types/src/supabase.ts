export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AssignmentStatusRow = "not_started" | "in_progress" | "completed";

export interface Database {
  public: {
    Enums: {
      assignment_status: AssignmentStatusRow;
    };
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          user_id: string;
          canvas_base_url: string;
          canvas_course_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          canvas_base_url?: string;
          canvas_course_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          canvas_base_url?: string;
          canvas_course_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          course_id: string;
          canvas_assignment_id: string;
          title: string;
          description: string;
          due_date: string;
          estimated_hours: number;
          points_possible: number | null;
          status: AssignmentStatusRow;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          canvas_assignment_id: string;
          title: string;
          description?: string;
          due_date: string;
          estimated_hours?: number;
          points_possible?: number | null;
          status?: AssignmentStatusRow;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          canvas_assignment_id?: string;
          title?: string;
          description?: string;
          due_date?: string;
          estimated_hours?: number;
          points_possible?: number | null;
          status?: AssignmentStatusRow;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          assignment_id: string;
          title: string;
          description: string;
          completed: boolean;
          estimated_minutes: number;
          order: number;
          source_plan_id: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          title: string;
          description?: string;
          completed?: boolean;
          estimated_minutes?: number;
          order?: number;
          source_plan_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          title?: string;
          description?: string;
          completed?: boolean;
          estimated_minutes?: number;
          order?: number;
          source_plan_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_source_plan_id_fkey";
            columns: ["source_plan_id"];
            isOneToOne: false;
            referencedRelation: "assignment_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      assignment_plans: {
        Row: {
          id: string;
          assignment_id: string;
          provider_used: string;
          plan_type: string;
          title: string;
          difficulty: string;
          estimated_hours: number;
          estimated_days: number;
          plan_snapshot: Json;
          generated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          provider_used: string;
          plan_type: string;
          title: string;
          difficulty: string;
          estimated_hours: number;
          estimated_days: number;
          plan_snapshot: Json;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          provider_used?: string;
          plan_type?: string;
          title?: string;
          difficulty?: string;
          estimated_hours?: number;
          estimated_days?: number;
          plan_snapshot?: Json;
          generated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assignment_plans_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type SupabaseTableRow<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Row"];

export type SupabaseTableInsert<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Insert"];

export type SupabaseTableUpdate<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Update"];