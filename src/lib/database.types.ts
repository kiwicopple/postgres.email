export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      mailboxes: {
        Row: {
          id: string;
          message_count: number | null;
        };
        Insert: {
          id: string;
          message_count?: number | null;
        };
        Update: {
          id?: string;
          message_count?: number | null;
        };
      };
      messages: {
        Row: {
          id: string | null;
          mailbox_id: string | null;
          in_reply_to: string | null;
          ts: string | null;
          subject: string | null;
          from_email: string | null;
          to_addresses: Json | null;
          cc_addresses: Json | null;
          bcc_addresses: Json | null;
          from_addresses: Json | null;
          seq_num: number | null;
          size: number | null;
          attachments: Json | null;
          body_text: string | null;
          embedded_files: Json | null;
          headers: Json | null;
        };
        Insert: {
          id?: string | null;
          mailbox_id?: string | null;
          in_reply_to?: string | null;
          ts?: string | null;
          subject?: string | null;
          from_email?: string | null;
          to_addresses?: Json | null;
          cc_addresses?: Json | null;
          bcc_addresses?: Json | null;
          from_addresses?: Json | null;
          seq_num?: number | null;
          size?: number | null;
          attachments?: Json | null;
          body_text?: string | null;
          embedded_files?: Json | null;
          headers?: Json | null;
        };
        Update: {
          id?: string | null;
          mailbox_id?: string | null;
          in_reply_to?: string | null;
          ts?: string | null;
          subject?: string | null;
          from_email?: string | null;
          to_addresses?: Json | null;
          cc_addresses?: Json | null;
          bcc_addresses?: Json | null;
          from_addresses?: Json | null;
          seq_num?: number | null;
          size?: number | null;
          attachments?: Json | null;
          body_text?: string | null;
          embedded_files?: Json | null;
          headers?: Json | null;
        };
      };
      raw_imap_mailboxes: {
        Row: {
          name: string | null;
          attributes: Json | null;
          delimiter: string | null;
          flags: Json | null;
          permanent_flags: Json | null;
          messages: number | null;
          recent: number | null;
          unseen: number | null;
          read_only: boolean | null;
          _ctx: Json | null;
        };
        Insert: {
          name?: string | null;
          attributes?: Json | null;
          delimiter?: string | null;
          flags?: Json | null;
          permanent_flags?: Json | null;
          messages?: number | null;
          recent?: number | null;
          unseen?: number | null;
          read_only?: boolean | null;
          _ctx?: Json | null;
        };
        Update: {
          name?: string | null;
          attributes?: Json | null;
          delimiter?: string | null;
          flags?: Json | null;
          permanent_flags?: Json | null;
          messages?: number | null;
          recent?: number | null;
          unseen?: number | null;
          read_only?: boolean | null;
          _ctx?: Json | null;
        };
      };
      raw_imap_messages: {
        Row: {
          errors: Json | null;
          flags: Json | null;
          timestamp: string | null;
          from_email: string | null;
          subject: string | null;
          message_id: string | null;
          to_addresses: Json | null;
          cc_addresses: Json | null;
          bcc_addresses: Json | null;
          seq_num: number | null;
          size: number | null;
          attachments: Json | null;
          body_html: string | null;
          body_text: string | null;
          embedded_files: Json | null;
          from_addresses: Json | null;
          headers: Json | null;
          in_reply_to: Json | null;
          mailbox: string | null;
          query: string | null;
          _ctx: Json | null;
        };
        Insert: {
          errors?: Json | null;
          flags?: Json | null;
          timestamp?: string | null;
          from_email?: string | null;
          subject?: string | null;
          message_id?: string | null;
          to_addresses?: Json | null;
          cc_addresses?: Json | null;
          bcc_addresses?: Json | null;
          seq_num?: number | null;
          size?: number | null;
          attachments?: Json | null;
          body_html?: string | null;
          body_text?: string | null;
          embedded_files?: Json | null;
          from_addresses?: Json | null;
          headers?: Json | null;
          in_reply_to?: Json | null;
          mailbox?: string | null;
          query?: string | null;
          _ctx?: Json | null;
        };
        Update: {
          errors?: Json | null;
          flags?: Json | null;
          timestamp?: string | null;
          from_email?: string | null;
          subject?: string | null;
          message_id?: string | null;
          to_addresses?: Json | null;
          cc_addresses?: Json | null;
          bcc_addresses?: Json | null;
          seq_num?: number | null;
          size?: number | null;
          attachments?: Json | null;
          body_html?: string | null;
          body_text?: string | null;
          embedded_files?: Json | null;
          from_addresses?: Json | null;
          headers?: Json | null;
          in_reply_to?: Json | null;
          mailbox?: string | null;
          query?: string | null;
          _ctx?: Json | null;
        };
      };
    };
    Functions: {
      postgres_fdw_handler: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      postgres_fdw_validator: {
        Args: Record<string, unknown>;
        Returns: undefined;
      };
      postgres_fdw_get_connections: {
        Args: Record<string, unknown>;
        Returns: Record<string, unknown>[];
      };
      postgres_fdw_disconnect: {
        Args: Record<string, unknown>;
        Returns: boolean;
      };
      postgres_fdw_disconnect_all: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
  };
}
