/**
 * Tellnest — Supabase PostgreSQL Database Type Definitions
 * Auto-generated schema contract matching migrations 01-08.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AccountStatus = 'active' | 'suspended' | 'banned' | 'deactivated'
export type WorkStatus = 'ongoing' | 'completed' | 'on_hiatus' | 'cancelled'
export type WorkVisibility = 'draft' | 'private' | 'unlisted' | 'public'
export type PublicationStatus = 'draft' | 'published' | 'archived'
export type ContentRating = 'general' | 'teen' | 'mature'
export type ChapterStatus = 'draft' | 'published' | 'archived'
export type CommentStatus = 'visible' | 'hidden' | 'removed' | 'pending_review'
export type NotificationType =
  | 'new_follower'
  | 'new_chapter'
  | 'comment'
  | 'comment_reply'
  | 'work_update'
  | 'moderation'
  | 'system'
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'sexual_content'
  | 'copyright'
  | 'plagiarism'
  | 'illegal_content'
  | 'impersonation'
  | 'misinformation'
  | 'other'
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed'
export type ModerationActionType =
  | 'warning'
  | 'hide'
  | 'remove'
  | 'restrict'
  | 'suspend'
  | 'restore'
  | 'ban'
  | 'mark_safe'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          clerk_user_id: string
          username: string
          display_name: string
          bio: string | null
          avatar_path: string | null
          website_url: string | null
          location: string | null
          is_public: boolean
          is_verified: boolean
          verified_at: string | null
          account_status: AccountStatus
          pronouns: string | null
          gender: string | null
          onboarding_completed: boolean
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_user_id: string
          username: string
          display_name: string
          bio?: string | null
          avatar_path?: string | null
          website_url?: string | null
          location?: string | null
          is_public?: boolean
          is_verified?: boolean
          verified_at?: string | null
          account_status?: AccountStatus
          pronouns?: string | null
          gender?: string | null
          onboarding_completed?: boolean
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_user_id?: string
          username?: string
          display_name?: string
          bio?: string | null
          avatar_path?: string | null
          website_url?: string | null
          location?: string | null
          is_public?: boolean
          is_verified?: boolean
          verified_at?: string | null
          account_status?: AccountStatus
          pronouns?: string | null
          gender?: string | null
          onboarding_completed?: boolean
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preferred_language: string
          theme: string
          reading_mode: string
          font_size: number
          line_height: number
          adult_content_enabled: boolean
          email_notifications_enabled: boolean
          push_notifications_enabled: boolean
          comment_notifications_enabled: boolean
          follow_notifications_enabled: boolean
          new_chapter_notifications_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_language?: string
          theme?: string
          reading_mode?: string
          font_size?: number
          line_height?: number
          adult_content_enabled?: boolean
          email_notifications_enabled?: boolean
          push_notifications_enabled?: boolean
          comment_notifications_enabled?: boolean
          follow_notifications_enabled?: boolean
          new_chapter_notifications_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preferred_language?: string
          theme?: string
          reading_mode?: string
          font_size?: number
          line_height?: number
          adult_content_enabled?: boolean
          email_notifications_enabled?: boolean
          push_notifications_enabled?: boolean
          comment_notifications_enabled?: boolean
          follow_notifications_enabled?: boolean
          new_chapter_notifications_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profile_links: {
        Row: {
          id: string
          profile_id: string
          platform: string
          url: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          platform: string
          url: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          platform?: string
          url?: string
          display_order?: number
          created_at?: string
        }
      }
      user_blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
      }
      user_mutes: {
        Row: {
          id: string
          muter_id: string
          muted_id: string
          created_at: string
        }
        Insert: {
          id?: string
          muter_id: string
          muted_id: string
          created_at?: string
        }
        Update: {
          id?: string
          muter_id?: string
          muted_id?: string
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          display_order: number
          accent_letter?: string | null
          is_active: boolean
          is_indexable: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          display_order?: number
          accent_letter?: string | null
          is_active?: boolean
          is_indexable?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          display_order?: number
          accent_letter?: string | null
          is_active?: boolean
          is_indexable?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      genres: {
        Row: {
          id: string
          name: string
          slug: string
          genre_group?: string | null
          description: string | null
          display_order: number
          is_active: boolean
          is_indexable: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          genre_group?: string | null
          description?: string | null
          display_order?: number
          is_active?: boolean
          is_indexable?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          genre_group?: string | null
          description?: string | null
          display_order?: number
          is_active?: boolean
          is_indexable?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
      content_warnings: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      works: {
        Row: {
          id: string
          author_id: string
          title: string
          slug: string
          description: string | null
          cover_image_path: string | null
          language: string
          category_id: string | null
          status: WorkStatus
          visibility: WorkVisibility
          publication_status: PublicationStatus
          is_indexable: boolean
          content_rating: ContentRating
          content_warning_required: boolean
          content_warning_text: string | null
          reading_time_minutes: number | null
          word_count: number
          chapter_count: number
          view_count: number
          like_count: number
          save_count: number
          comment_count: number
          published_at: string | null
          last_published_at: string | null
          last_activity_at: string
          last_activity_type: string
          last_activity_detail: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          title: string
          slug: string
          description?: string | null
          cover_image_path?: string | null
          language?: string
          category_id?: string | null
          status?: WorkStatus
          visibility?: WorkVisibility
          publication_status?: PublicationStatus
          is_indexable?: boolean
          content_rating?: ContentRating
          content_warning_required?: boolean
          content_warning_text?: string | null
          reading_time_minutes?: number | null
          word_count?: number
          chapter_count?: number
          view_count?: number
          like_count?: number
          save_count?: number
          comment_count?: number
          published_at?: string | null
          last_published_at?: string | null
          last_activity_at?: string
          last_activity_type?: string
          last_activity_detail?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          title?: string
          slug?: string
          description?: string | null
          cover_image_path?: string | null
          language?: string
          category_id?: string | null
          status?: WorkStatus
          visibility?: WorkVisibility
          publication_status?: PublicationStatus
          is_indexable?: boolean
          content_rating?: ContentRating
          content_warning_required?: boolean
          content_warning_text?: string | null
          reading_time_minutes?: number | null
          last_activity_at?: string
          last_activity_type?: string
          last_activity_detail?: Json
          word_count?: number
          chapter_count?: number
          view_count?: number
          like_count?: number
          save_count?: number
          comment_count?: number
          published_at?: string | null
          last_published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      acts: {
        Row: {
          id: string
          work_id: string
          act_number: number
          title: string
          slug: string
          description: string | null
          status: PublicationStatus
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_id: string
          act_number: number
          title: string
          slug: string
          description?: string | null
          status?: PublicationStatus
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          act_number?: number
          title?: string
          slug?: string
          description?: string | null
          status?: PublicationStatus
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      chapters: {
        Row: {
          id: string
          work_id: string
          act_id: string | null
          chapter_number: number
          title: string
          slug: string
          content: string
          excerpt: string | null
          word_count: number
          reading_time_minutes: number
          status: ChapterStatus
          is_indexable: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_id: string
          act_id?: string | null
          chapter_number: number
          title: string
          slug: string
          content?: string
          excerpt?: string | null
          word_count?: number
          reading_time_minutes?: number
          status?: ChapterStatus
          is_indexable?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_id?: string
          act_id?: string | null
          chapter_number?: number
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          word_count?: number
          reading_time_minutes?: number
          status?: ChapterStatus
          is_indexable?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      work_genres: {
        Row: {
          work_id: string
          genre_id: string
          created_at: string
        }
        Insert: {
          work_id: string
          genre_id: string
          created_at?: string
        }
        Update: {
          work_id?: string
          genre_id?: string
          created_at?: string
        }
      }
      work_tags: {
        Row: {
          work_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          work_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          work_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      work_content_warnings: {
        Row: {
          work_id: string
          content_warning_id: string
          created_at: string
        }
        Insert: {
          work_id: string
          content_warning_id: string
          created_at?: string
        }
        Update: {
          work_id?: string
          content_warning_id?: string
          created_at?: string
        }
      }
      library_items: {
        Row: {
          id: string
          user_id: string
          work_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_id?: string
          created_at?: string
        }
      }
      reading_progress: {
        Row: {
          id: string
          user_id: string
          work_id: string
          chapter_id: string | null
          progress_percent: number
          position: string | null
          last_read_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_id: string
          chapter_id?: string | null
          progress_percent?: number
          position?: string | null
          last_read_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_id?: string
          chapter_id?: string | null
          progress_percent?: number
          position?: string | null
          last_read_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      reading_history: {
        Row: {
          id: string
          user_id: string
          work_id: string
          chapter_id: string | null
          started_at: string
          completed_at: string | null
          last_read_at: string
          duration_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_id: string
          chapter_id?: string | null
          started_at?: string
          completed_at?: string | null
          last_read_at?: string
          duration_seconds?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_id?: string
          chapter_id?: string | null
          started_at?: string
          completed_at?: string | null
          last_read_at?: string
          duration_seconds?: number
          created_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      work_follows: {
        Row: {
          id: string
          user_id: string
          work_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_id?: string
          created_at?: string
        }
      }
      work_likes: {
        Row: {
          id: string
          user_id: string
          work_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_id?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          user_id: string | null
          work_id: string
          chapter_id: string | null
          parent_comment_id: string | null
          content: string
          status: CommentStatus
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          work_id: string
          chapter_id?: string | null
          parent_comment_id?: string | null
          content: string
          status?: CommentStatus
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          work_id?: string
          chapter_id?: string | null
          parent_comment_id?: string | null
          content?: string
          status?: CommentStatus
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      comment_reactions: {
        Row: {
          id: string
          comment_id: string
          user_id: string
          reaction_type: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          user_id: string
          reaction_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          user_id?: string
          reaction_type?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          actor_id: string | null
          work_id: string | null
          chapter_id: string | null
          comment_id: string | null
          metadata: Json | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          actor_id?: string | null
          work_id?: string | null
          chapter_id?: string | null
          comment_id?: string | null
          metadata?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          actor_id?: string | null
          work_id?: string | null
          chapter_id?: string | null
          comment_id?: string | null
          metadata?: Json | null
          read_at?: string | null
          created_at?: string
        }
      }
      moderation_reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: string
          target_id: string
          reason: ReportReason
          description: string | null
          status: ReportStatus
          reviewed_by: string | null
          reviewed_at: string | null
          resolution: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: string
          target_id: string
          reason: ReportReason
          description?: string | null
          status?: ReportStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          resolution?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          target_type?: string
          target_id?: string
          reason?: ReportReason
          description?: string | null
          status?: ReportStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          resolution?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      moderation_actions: {
        Row: {
          id: string
          moderator_id: string
          target_type: string
          target_id: string
          action_type: ModerationActionType
          reason: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          moderator_id: string
          target_type: string
          target_id: string
          action_type: ModerationActionType
          reason: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          moderator_id?: string
          target_type?: string
          target_id?: string
          action_type?: ModerationActionType
          reason?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          action: string
          entity_type: string
          entity_id: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          action: string
          entity_type: string
          entity_id: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string
          metadata?: Json | null
          created_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          work_id: string | null
          chapter_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          work_id?: string | null
          chapter_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          work_id?: string | null
          chapter_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_clerk_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      current_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
    }
    Enums: {
      account_status: AccountStatus
      work_status: WorkStatus
      work_visibility: WorkVisibility
      publication_status: PublicationStatus
      content_rating: ContentRating
      chapter_status: ChapterStatus
      comment_status: CommentStatus
      notification_type: NotificationType
      report_reason: ReportReason
      report_status: ReportStatus
      moderation_action_type: ModerationActionType
    }
  }
}
