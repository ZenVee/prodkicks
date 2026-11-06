export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type AccountStatus = 'pending' | 'approved' | 'declined' | 'disabled';

export type Database = {
  public: {
    Tables: {
      staff_roles: {
        Row: {
          id: string;
          key: string;
          label: string;
          is_system: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          label: string;
          is_system?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          label?: string;
          is_system?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff_accounts: {
        Row: {
          id: string;
          discord_id: string | null;
          discord_username: string | null;
          discord_avatar_url: string | null;
          full_name: string | null;
          state_id: string | null;
          status: AccountStatus | null;
          role_id: string | null;
          profile_completed_at: string | null;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
          position?: string | null;
          bio?: string;
          photo_url?: string | null;
          show_on_website?: boolean;
          display_order?: number;
        };
        Insert: {
          id: string;
          discord_id?: string | null;
          discord_username?: string | null;
          discord_avatar_url?: string | null;
          full_name?: string | null;
          state_id?: string | null;
          status?: AccountStatus | null;
          role_id?: string | null;
          profile_completed_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          discord_id?: string | null;
          discord_username?: string | null;
          discord_avatar_url?: string | null;
          full_name?: string | null;
          state_id?: string | null;
          status?: AccountStatus | null;
          role_id?: string | null;
          profile_completed_at?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          key: string;
          category: string;
          label: string;
          sort_order: number;
        };
        Insert: {
          key: string;
          category: string;
          label: string;
          sort_order?: number;
        };
        Update: {
          key?: string;
          category?: string;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_key: string;
        };
        Insert: {
          role_id: string;
          permission_key: string;
        };
        Update: {
          role_id?: string;
          permission_key?: string;
        };
        Relationships: [];
      };
      staff_audit_log: {
        Row: {
          id: string;
          actor_user_id: string | null;
          target_user_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          target_user_id?: string | null;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          target_user_id?: string | null;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sku: string;
          category: string;
          price: number;
          currency: string;
          color: string;
          description: string;
          status: string;
          availability: string;
          labels: string[];
          collection_id: string | null;
          variants: Json;
          images: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          sku: string;
          category: string;
          price?: number;
          currency?: string;
          color?: string;
          description?: string;
          status?: string;
          availability?: string;
          labels?: string[];
          collection_id?: string | null;
          variants?: Json;
          images?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          sku?: string;
          category?: string;
          price?: number;
          currency?: string;
          color?: string;
          description?: string;
          status?: string;
          availability?: string;
          labels?: string[];
          collection_id?: string | null;
          variants?: Json;
          images?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          campaign_image: string;
          campaign_headline: string;
          campaign_subtitle: string;
          display_order: number;
          product_ids: string[];
          archived: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          slug: string;
          description?: string;
          campaign_image?: string;
          campaign_headline?: string;
          campaign_subtitle?: string;
          display_order?: number;
          product_ids?: string[];
          archived?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string;
          campaign_image?: string;
          campaign_headline?: string;
          campaign_subtitle?: string;
          display_order?: number;
          product_ids?: string[];
          archived?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      drops: {
        Row: {
          id: string;
          name: string;
          drop_number: number;
          collection_id: string | null;
          release_date: string;
          release_time: string;
          campaign_headline: string;
          campaign_subtitle: string;
          campaign_description: string;
          hero_image: string;
          hero_label: string;
          show_countdown: boolean;
          featured_on_homepage: boolean;
          status: string;
          season: string;
        };
        Insert: {
          id: string;
          name: string;
          drop_number: number;
          collection_id?: string | null;
          release_date: string;
          release_time?: string;
          campaign_headline?: string;
          campaign_subtitle?: string;
          campaign_description?: string;
          hero_image?: string;
          hero_label?: string;
          show_countdown?: boolean;
          featured_on_homepage?: boolean;
          status?: string;
          season?: string;
        };
        Update: {
          id?: string;
          name?: string;
          drop_number?: number;
          collection_id?: string | null;
          release_date?: string;
          release_time?: string;
          campaign_headline?: string;
          campaign_subtitle?: string;
          campaign_description?: string;
          hero_image?: string;
          hero_label?: string;
          show_countdown?: boolean;
          featured_on_homepage?: boolean;
          status?: string;
          season?: string;
        };
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string;
          cover_image: string;
          body: Json;
          status: string;
          featured_on_homepage: boolean;
          author_id: string | null;
          author_name: string;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title?: string;
          slug: string;
          excerpt?: string;
          cover_image?: string;
          body?: Json;
          status?: string;
          featured_on_homepage?: boolean;
          author_id?: string | null;
          author_name?: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          excerpt?: string;
          cover_image?: string;
          body?: Json;
          status?: string;
          featured_on_homepage?: boolean;
          author_id?: string | null;
          author_name?: string;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          id: string;
          name: string;
          position: string;
          role: string;
          bio: string;
          photo: string;
          show_on_website: boolean;
          display_order: number;
        };
        Insert: {
          id: string;
          name: string;
          position?: string;
          role?: string;
          bio?: string;
          photo?: string;
          show_on_website?: boolean;
          display_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          position?: string;
          role?: string;
          bio?: string;
          photo?: string;
          show_on_website?: boolean;
          display_order?: number;
        };
        Relationships: [];
      };
      homepage_content: {
        Row: {
          id: string;
          sections: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sections?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sections?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: string;
          company_name: string;
          tagline: string;
          established_year: string;
          currency_symbol: string;
          footer_text: string;
          seo_title: string;
          seo_description: string;
          commission_percentage: number;
          product_categories: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name?: string;
          tagline?: string;
          established_year?: string;
          currency_symbol?: string;
          footer_text?: string;
          seo_title?: string;
          seo_description?: string;
          commission_percentage?: number;
          product_categories?: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          tagline?: string;
          established_year?: string;
          currency_symbol?: string;
          footer_text?: string;
          seo_title?: string;
          seo_description?: string;
          commission_percentage?: number;
          product_categories?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      payroll_runs: {
        Row: {
          id: string;
          processed_by: string;
          processed_at: string;
        };
        Insert: {
          id?: string;
          processed_by: string;
          processed_at?: string;
        };
        Update: {
          id?: string;
          processed_by?: string;
          processed_at?: string;
        };
        Relationships: [];
      };
      commission_sales: {
        Row: {
          id: string;
          product_id: string | null;
          product_name: string;
          product_sku: string;
          sale_price: number;
          commission_percentage: number;
          commission_amount: number;
          sold_by: string;
          sold_at: string;
          payroll_run_id: string | null;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          product_name: string;
          product_sku?: string;
          sale_price: number;
          commission_percentage: number;
          commission_amount: number;
          sold_by: string;
          sold_at?: string;
          payroll_run_id?: string | null;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          product_name?: string;
          product_sku?: string;
          sale_price?: number;
          commission_percentage?: number;
          commission_amount?: number;
          sold_by?: string;
          sold_at?: string;
          payroll_run_id?: string | null;
          paid_at?: string | null;
        };
        Relationships: [];
      };
      payroll_bonuses: {
        Row: {
          id: string;
          payroll_run_id: string;
          staff_account_id: string;
          amount: number;
          note: string;
        };
        Insert: {
          id?: string;
          payroll_run_id: string;
          staff_account_id: string;
          amount: number;
          note?: string;
        };
        Update: {
          id?: string;
          payroll_run_id?: string;
          staff_account_id?: string;
          amount?: number;
          note?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_permission: {
        Args: { requested_permission: string };
        Returns: boolean;
      };
      log_commission_sale: {
        Args: { p_product_id: string };
        Returns: Database['public']['Tables']['commission_sales']['Row'];
      };
      process_payroll: {
        Args: { p_bonuses?: Json };
        Returns: Database['public']['Tables']['payroll_runs']['Row'];
      };
      list_sales_assignees: {
        Args: Record<string, never>;
        Returns: { id: string; full_name: string | null; discord_username: string | null }[];
      };
      update_commission_sale: {
        Args: { p_sale_id: string; p_product_id: string; p_sold_by: string };
        Returns: Database['public']['Tables']['commission_sales']['Row'];
      };
      delete_commission_sale: {
        Args: { p_sale_id: string };
        Returns: undefined;
      };
      submit_staff_profile: {
        Args: { full_name: string; state_id: string };
        Returns: Database['public']['Tables']['staff_accounts']['Row'];
      };
      approve_staff_account: {
        Args: { target_user_id: string; assigned_role_id: string };
        Returns: Database['public']['Tables']['staff_accounts']['Row'];
      };
      decline_staff_account: {
        Args: { target_user_id: string };
        Returns: Database['public']['Tables']['staff_accounts']['Row'];
      };
      disable_staff_account: {
        Args: { target_user_id: string };
        Returns: Database['public']['Tables']['staff_accounts']['Row'];
      };
      enable_staff_account: {
        Args: { target_user_id: string };
        Returns: Database['public']['Tables']['staff_accounts']['Row'];
      };
      change_staff_role: {
        Args: { target_user_id: string; new_role_id: string };
        Returns: Database['public']['Tables']['staff_accounts']['Row'];
      };
      set_role_permission: {
        Args: {
          target_role_id: string;
          permission_key: string;
          enabled: boolean;
        };
        Returns: undefined;
      };
      create_staff_role: {
        Args: { role_key: string; role_label: string };
        Returns: Database['public']['Tables']['staff_roles']['Row'];
      };
      update_staff_role: {
        Args: { target_role_id: string; role_label?: string | null; role_sort_order?: number | null };
        Returns: Database['public']['Tables']['staff_roles']['Row'];
      };
      delete_staff_role: {
        Args: { target_role_id: string };
        Returns: undefined;
      };
      record_staff_session: {
        Args: { event: string };
        Returns: undefined;
      };
      current_staff_role_key: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      current_staff_role: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['staff_roles']['Row'] | null;
      };
      current_staff_role_info: {
        Args: Record<string, never>;
        Returns: { id: string; key: string; label: string; is_system: boolean } | null;
      };
    };
    Enums: {
      account_status: AccountStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
