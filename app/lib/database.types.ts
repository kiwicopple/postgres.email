// @ts-ignore

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  imap: {
    Tables: {}
    Functions: {}
  }
  graphql: {
    Tables: {
      _type: {
        Row: {
          type_kind:
            | "SCALAR"
            | "OBJECT"
            | "INTERFACE"
            | "UNION"
            | "ENUM"
            | "INPUT_OBJECT"
            | "LIST"
            | "NON_NULL"
          meta_kind:
            | "__Schema"
            | "__Type"
            | "__TypeKind"
            | "__Field"
            | "__InputValue"
            | "__EnumValue"
            | "__Directive"
            | "__DirectiveLocation"
            | "ID"
            | "Float"
            | "String"
            | "Int"
            | "Boolean"
            | "Date"
            | "Time"
            | "Datetime"
            | "BigInt"
            | "UUID"
            | "JSON"
            | "OrderByDirection"
            | "PageInfo"
            | "Cursor"
            | "Query"
            | "Mutation"
            | "Interface"
            | "Node"
            | "Edge"
            | "Connection"
            | "OrderBy"
            | "FilterEntity"
            | "InsertNode"
            | "UpdateNode"
            | "InsertNodeResponse"
            | "UpdateNodeResponse"
            | "DeleteNodeResponse"
            | "FilterType"
            | "Enum"
          constant_name: string | null
          name: string
          entity: unknown | null
          graphql_type_id: number | null
          enum: unknown | null
          description: string | null
          id: number
          is_builtin: boolean
        }
        Insert: {
          type_kind:
            | "SCALAR"
            | "OBJECT"
            | "INTERFACE"
            | "UNION"
            | "ENUM"
            | "INPUT_OBJECT"
            | "LIST"
            | "NON_NULL"
          meta_kind:
            | "__Schema"
            | "__Type"
            | "__TypeKind"
            | "__Field"
            | "__InputValue"
            | "__EnumValue"
            | "__Directive"
            | "__DirectiveLocation"
            | "ID"
            | "Float"
            | "String"
            | "Int"
            | "Boolean"
            | "Date"
            | "Time"
            | "Datetime"
            | "BigInt"
            | "UUID"
            | "JSON"
            | "OrderByDirection"
            | "PageInfo"
            | "Cursor"
            | "Query"
            | "Mutation"
            | "Interface"
            | "Node"
            | "Edge"
            | "Connection"
            | "OrderBy"
            | "FilterEntity"
            | "InsertNode"
            | "UpdateNode"
            | "InsertNodeResponse"
            | "UpdateNodeResponse"
            | "DeleteNodeResponse"
            | "FilterType"
            | "Enum"
          constant_name?: string | null
          name: string
          entity?: unknown | null
          graphql_type_id?: number | null
          enum?: unknown | null
          description?: string | null
          id?: number
          is_builtin?: boolean
        }
        Update: {
          type_kind?:
            | "SCALAR"
            | "OBJECT"
            | "INTERFACE"
            | "UNION"
            | "ENUM"
            | "INPUT_OBJECT"
            | "LIST"
            | "NON_NULL"
          meta_kind?:
            | "__Schema"
            | "__Type"
            | "__TypeKind"
            | "__Field"
            | "__InputValue"
            | "__EnumValue"
            | "__Directive"
            | "__DirectiveLocation"
            | "ID"
            | "Float"
            | "String"
            | "Int"
            | "Boolean"
            | "Date"
            | "Time"
            | "Datetime"
            | "BigInt"
            | "UUID"
            | "JSON"
            | "OrderByDirection"
            | "PageInfo"
            | "Cursor"
            | "Query"
            | "Mutation"
            | "Interface"
            | "Node"
            | "Edge"
            | "Connection"
            | "OrderBy"
            | "FilterEntity"
            | "InsertNode"
            | "UpdateNode"
            | "InsertNodeResponse"
            | "UpdateNodeResponse"
            | "DeleteNodeResponse"
            | "FilterType"
            | "Enum"
          constant_name?: string | null
          name?: string
          entity?: unknown | null
          graphql_type_id?: number | null
          enum?: unknown | null
          description?: string | null
          id?: number
          is_builtin?: boolean
        }
      }
      _field: {
        Row: {
          parent_type_id: number | null
          type_id: number
          name: string
          constant_name: string | null
          parent_arg_field_id: number | null
          default_value: string | null
          entity: unknown | null
          column_name: string | null
          column_attribute_num: number | null
          column_type: unknown | null
          local_columns: string[] | null
          foreign_columns: string[] | null
          foreign_entity: unknown | null
          foreign_name_override: string | null
          func: unknown | null
          is_not_null: boolean
          is_array: boolean
          is_array_not_null: boolean | null
          description: string | null
          id: number
          meta_kind:
            | "Constant"
            | "Query.collection"
            | "Column"
            | "Relationship.toMany"
            | "Relationship.toOne"
            | "OrderBy.Column"
            | "Filter.Column"
            | "Function"
            | "Mutation.insert"
            | "Mutation.delete"
            | "Mutation.update"
            | "UpdateSetArg"
            | "ObjectsArg"
            | "AtMostArg"
            | "Query.heartbeat"
            | null
          is_arg: boolean | null
          is_hidden_from_schema: boolean | null
        }
        Insert: {
          parent_type_id?: number | null
          type_id: number
          name: string
          constant_name?: string | null
          parent_arg_field_id?: number | null
          default_value?: string | null
          entity?: unknown | null
          column_name?: string | null
          column_attribute_num?: number | null
          column_type?: unknown | null
          local_columns?: string[] | null
          foreign_columns?: string[] | null
          foreign_entity?: unknown | null
          foreign_name_override?: string | null
          func?: unknown | null
          is_not_null: boolean
          is_array: boolean
          is_array_not_null?: boolean | null
          description?: string | null
          id?: number
          meta_kind?:
            | "Constant"
            | "Query.collection"
            | "Column"
            | "Relationship.toMany"
            | "Relationship.toOne"
            | "OrderBy.Column"
            | "Filter.Column"
            | "Function"
            | "Mutation.insert"
            | "Mutation.delete"
            | "Mutation.update"
            | "UpdateSetArg"
            | "ObjectsArg"
            | "AtMostArg"
            | "Query.heartbeat"
            | null
          is_arg?: boolean | null
          is_hidden_from_schema?: boolean | null
        }
        Update: {
          parent_type_id?: number | null
          type_id?: number
          name?: string
          constant_name?: string | null
          parent_arg_field_id?: number | null
          default_value?: string | null
          entity?: unknown | null
          column_name?: string | null
          column_attribute_num?: number | null
          column_type?: unknown | null
          local_columns?: string[] | null
          foreign_columns?: string[] | null
          foreign_entity?: unknown | null
          foreign_name_override?: string | null
          func?: unknown | null
          is_not_null?: boolean
          is_array?: boolean
          is_array_not_null?: boolean | null
          description?: string | null
          id?: number
          meta_kind?:
            | "Constant"
            | "Query.collection"
            | "Column"
            | "Relationship.toMany"
            | "Relationship.toOne"
            | "OrderBy.Column"
            | "Filter.Column"
            | "Function"
            | "Mutation.insert"
            | "Mutation.delete"
            | "Mutation.update"
            | "UpdateSetArg"
            | "ObjectsArg"
            | "AtMostArg"
            | "Query.heartbeat"
            | null
          is_arg?: boolean | null
          is_hidden_from_schema?: boolean | null
        }
      }
    }
    Functions: {
      jsonb_coalesce: {
        Args: { val: Json; default_: Json }
        Returns: Json
      }
      jsonb_unnest_recursive_with_jsonpath: {
        Args: { obj: Json }
        Returns: Record<string, unknown>[]
      }
      slug: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      _first_agg: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      first: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      is_array: {
        Args: Record<string, unknown>
        Returns: boolean
      }
      is_composite: {
        Args: Record<string, unknown>
        Returns: boolean
      }
      primary_key_columns: {
        Args: { entity: unknown }
        Returns: string[]
      }
      primary_key_types: {
        Args: { entity: unknown }
        Returns: unknown[]
      }
      column_set_is_unique: {
        Args: Record<string, unknown>
        Returns: boolean
      }
      to_type_name: {
        Args: Record<string, unknown>
        Returns: string
      }
      to_function_name: {
        Args: Record<string, unknown>
        Returns: string
      }
      to_regclass: {
        Args: { schema_: string; name_: string }
        Returns: unknown
      }
      to_table_name: {
        Args: Record<string, unknown>
        Returns: string
      }
      to_camel_case: {
        Args: Record<string, unknown>
        Returns: string
      }
      alias_or_name_literal: {
        Args: { field: Json }
        Returns: string
      }
      ast_pass_fragments: {
        Args: { ast: Json; fragment_defs: unknown }
        Returns: Json
      }
      ast_pass_strip_loc: {
        Args: { body: Json }
        Returns: Json
      }
      is_literal: {
        Args: { field: Json }
        Returns: boolean
      }
      is_variable: {
        Args: { field: Json }
        Returns: boolean
      }
      name_literal: {
        Args: { ast: Json }
        Returns: string
      }
      parse: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      value_literal: {
        Args: { ast: Json }
        Returns: string
      }
      exception: {
        Args: { message: string }
        Returns: string
      }
      exception_required_argument: {
        Args: { arg_name: string }
        Returns: string
      }
      exception_unknown_field: {
        Args: { field_name: string; type_name: string }
        Returns: string
      }
      exception_unknown_field: {
        Args: { field_name: string }
        Returns: string
      }
      reverse: {
        Args: { column_orders: unknown }
        Returns: unknown[]
      }
      to_cursor_clause: {
        Args: { alias_name: string; column_orders: unknown }
        Returns: string
      }
      encode: {
        Args: Record<string, unknown>
        Returns: string
      }
      decode: {
        Args: Record<string, unknown>
        Returns: Json
      }
      cursor_where_clause: {
        Args: {
          block_name: string
          column_orders: unknown
          cursor_: string
          cursor_var_ix: number
          depth_: unknown
        }
        Returns: string
      }
      comment_directive: {
        Args: { comment_: string }
        Returns: Json
      }
      comment: {
        Args: Record<string, unknown>
        Returns: string
      }
      comment: {
        Args: Record<string, unknown>
        Returns: string
      }
      comment: {
        Args: Record<string, unknown>
        Returns: string
      }
      comment: {
        Args: Record<string, unknown>
        Returns: string
      }
      comment: {
        Args: Record<string, unknown>
        Returns: string
      }
      comment_directive_inflect_names: {
        Args: Record<string, unknown>
        Returns: boolean
      }
      comment_directive_name: {
        Args: Record<string, unknown>
        Returns: string
      }
      comment_directive_totalcount_enabled: {
        Args: Record<string, unknown>
        Returns: boolean
      }
      comment_directive_name: {
        Args: Record<string, unknown>
        Returns: string
      }
      comment_directive_name: {
        Args: Record<string, unknown>
        Returns: string
      }
      comment_directive_name: {
        Args: Record<string, unknown>
        Returns: string
      }
      inflect_type_default: {
        Args: Record<string, unknown>
        Returns: string
      }
      type_name: {
        Args: { rec: unknown }
        Returns: string
      }
      type_name: {
        Args: { type_id: number }
        Returns: string
      }
      type_name: {
        Args: Record<string, unknown>
        Returns: string
      }
      sql_type_to_graphql_type: {
        Args: Record<string, unknown>
        Returns: string
      }
      type_id: {
        Args: Record<string, unknown>
        Returns: number
      }
      rebuild_types: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      field_name_for_column: {
        Args: { entity: unknown; column_name: string }
        Returns: string
      }
      lowercase_first_letter: {
        Args: Record<string, unknown>
        Returns: string
      }
      field_name_for_to_many: {
        Args: { foreign_entity: unknown; foreign_name_override: string }
        Returns: string
      }
      field_name_for_query_collection: {
        Args: { entity: unknown }
        Returns: string
      }
      field_name_for_to_one: {
        Args: {
          foreign_entity: unknown
          foreign_name_override: string
          foreign_columns: unknown
        }
        Returns: string
      }
      field_name_for_function: {
        Args: { func: unknown }
        Returns: string
      }
      field_name: {
        Args: { rec: unknown }
        Returns: string
      }
      type_id: {
        Args: { type_name: string }
        Returns: number
      }
      type_id: {
        Args: Record<string, unknown>
        Returns: number
      }
      rebuild_fields: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      arg_index: {
        Args: { arg_name: string; variable_definitions: Json }
        Returns: number
      }
      get_arg_by_name: {
        Args: { name: string; arguments: Json }
        Returns: Json
      }
      arg_clause: {
        Args: {
          name: string
          arguments: Json
          variable_definitions: Json
          entity: unknown
          default_value: unknown
        }
        Returns: string
      }
      join_clause: {
        Args: {
          local_columns: unknown
          local_alias_name: string
          parent_columns: unknown
          parent_alias_name: string
        }
        Returns: string
      }
      primary_key_clause: {
        Args: { entity: unknown; alias_name: string }
        Returns: string
      }
      order_by_clause: {
        Args: { alias_name: string; column_orders: unknown }
        Returns: string
      }
      order_by_enum_to_clause: {
        Args: { order_by_enum_val: string }
        Returns: string
      }
      to_column_orders: {
        Args: { order_by_arg: Json; entity: unknown; variables: unknown }
        Returns: unknown[]
      }
      text_to_comparison_op: {
        Args: Record<string, unknown>
        Returns: "=" | "<" | "<=" | "<>" | ">=" | ">"
      }
      where_clause: {
        Args: {
          filter_arg: Json
          entity: unknown
          alias_name: string
          variables: unknown
          variable_definitions: unknown
        }
        Returns: string
      }
      build_connection_query: {
        Args: {
          ast: Json
          variable_definitions: unknown
          variables: unknown
          parent_type: unknown
          parent_block_name: unknown
        }
        Returns: string
      }
      build_delete: {
        Args: {
          ast: Json
          variable_definitions: unknown
          variables: unknown
          parent_type: unknown
          parent_block_name: unknown
        }
        Returns: string
      }
      build_heartbeat_query: {
        Args: { ast: Json }
        Returns: string
      }
      build_insert: {
        Args: {
          ast: Json
          variable_definitions: unknown
          variables: unknown
          parent_type: unknown
        }
        Returns: string
      }
      build_node_query: {
        Args: {
          ast: Json
          variable_definitions: unknown
          variables: unknown
          parent_type: unknown
          parent_block_name: unknown
        }
        Returns: string
      }
      build_update: {
        Args: {
          ast: Json
          variable_definitions: unknown
          variables: unknown
          parent_type: unknown
          parent_block_name: unknown
        }
        Returns: string
      }
      resolve_enumValues: {
        Args: { type_: string; ast: Json }
        Returns: Json
      }
      resolve_field: {
        Args: {
          field: string
          parent_type: string
          parent_arg_field_id: number
          ast: Json
        }
        Returns: Json
      }
      resolve___Schema: {
        Args: { ast: Json; variable_definitions: unknown }
        Returns: Json
      }
      resolve___Type: {
        Args: {
          type_: string
          ast: Json
          is_array_not_null: unknown
          is_array: unknown
          is_not_null: unknown
        }
        Returns: Json
      }
      cache_key: {
        Args: { role: unknown; ast: Json; variables: Json }
        Returns: string
      }
      cache_key_variable_component: {
        Args: { variables: unknown }
        Returns: string
      }
      prepared_statement_create_clause: {
        Args: {
          statement_name: string
          variable_definitions: Json
          query_: string
        }
        Returns: string
      }
      prepared_statement_execute_clause: {
        Args: {
          statement_name: string
          variable_definitions: Json
          variables: Json
        }
        Returns: string
      }
      prepared_statement_exists: {
        Args: { statement_name: string }
        Returns: boolean
      }
      argument_value_by_name: {
        Args: { name: string; ast: Json }
        Returns: string
      }
      resolve: {
        Args: Record<string, unknown>
        Returns: Json
      }
      variable_definitions_sort: {
        Args: { variable_definitions: Json }
        Returns: Json
      }
      rebuild_schema: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rebuild_on_ddl: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      rebuild_on_drop: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
  }
  public: {
    Tables: {
      raw_imap_mailboxes: {
        Row: {
          name: string | null
          attributes: Json | null
          delimiter: string | null
          flags: Json | null
          permanent_flags: Json | null
          messages: number | null
          recent: number | null
          unseen: number | null
          read_only: boolean | null
          _ctx: Json | null
        }
        Insert: {
          name?: string | null
          attributes?: Json | null
          delimiter?: string | null
          flags?: Json | null
          permanent_flags?: Json | null
          messages?: number | null
          recent?: number | null
          unseen?: number | null
          read_only?: boolean | null
          _ctx?: Json | null
        }
        Update: {
          name?: string | null
          attributes?: Json | null
          delimiter?: string | null
          flags?: Json | null
          permanent_flags?: Json | null
          messages?: number | null
          recent?: number | null
          unseen?: number | null
          read_only?: boolean | null
          _ctx?: Json | null
        }
      }
      raw_imap_messages: {
        Row: {
          timestamp: string | null
          from_email: string | null
          subject: string | null
          message_id: string | null
          to_addresses: Json | null
          cc_addresses: Json | null
          bcc_addresses: Json | null
          seq_num: number | null
          size: number | null
          attachments: Json | null
          body_html: string | null
          body_text: string | null
          embedded_files: Json | null
          errors: Json | null
          flags: Json | null
          from_addresses: Json | null
          headers: Json | null
          in_reply_to: Json | null
          mailbox: string | null
          query: string | null
          _ctx: Json | null
        }
        Insert: {
          timestamp?: string | null
          from_email?: string | null
          subject?: string | null
          message_id?: string | null
          to_addresses?: Json | null
          cc_addresses?: Json | null
          bcc_addresses?: Json | null
          seq_num?: number | null
          size?: number | null
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          embedded_files?: Json | null
          errors?: Json | null
          flags?: Json | null
          from_addresses?: Json | null
          headers?: Json | null
          in_reply_to?: Json | null
          mailbox?: string | null
          query?: string | null
          _ctx?: Json | null
        }
        Update: {
          timestamp?: string | null
          from_email?: string | null
          subject?: string | null
          message_id?: string | null
          to_addresses?: Json | null
          cc_addresses?: Json | null
          bcc_addresses?: Json | null
          seq_num?: number | null
          size?: number | null
          attachments?: Json | null
          body_html?: string | null
          body_text?: string | null
          embedded_files?: Json | null
          errors?: Json | null
          flags?: Json | null
          from_addresses?: Json | null
          headers?: Json | null
          in_reply_to?: Json | null
          mailbox?: string | null
          query?: string | null
          _ctx?: Json | null
        }
      }
      mailboxes: {
        Row: {
          id: string
          message_count: number | null
        }
        Insert: {
          id: string
          message_count?: number | null
        }
        Update: {
          id?: string
          message_count?: number | null
        }
      }
      messages: {
        Row: {
          id: string | null
          mailbox_id: string | null
          in_reply_to: string | null
          ts: string | null
          subject: string | null
          from_email: string | null
          to_addresses: Json | null
          cc_addresses: Json | null
          bcc_addresses: Json | null
          from_addresses: Json | null
          seq_num: number | null
          size: number | null
          attachments: Json | null
          body_text: string | null
          embedded_files: Json | null
          headers: Json | null
        }
        Insert: {
          id?: string | null
          mailbox_id?: string | null
          in_reply_to?: string | null
          ts?: string | null
          subject?: string | null
          from_email?: string | null
          to_addresses?: Json | null
          cc_addresses?: Json | null
          bcc_addresses?: Json | null
          from_addresses?: Json | null
          seq_num?: number | null
          size?: number | null
          attachments?: Json | null
          body_text?: string | null
          embedded_files?: Json | null
          headers?: Json | null
        }
        Update: {
          id?: string | null
          mailbox_id?: string | null
          in_reply_to?: string | null
          ts?: string | null
          subject?: string | null
          from_email?: string | null
          to_addresses?: Json | null
          cc_addresses?: Json | null
          bcc_addresses?: Json | null
          from_addresses?: Json | null
          seq_num?: number | null
          size?: number | null
          attachments?: Json | null
          body_text?: string | null
          embedded_files?: Json | null
          headers?: Json | null
        }
      }
    }
    Functions: {
      postgres_fdw_handler: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      postgres_fdw_validator: {
        Args: Record<string, unknown>
        Returns: undefined
      }
      postgres_fdw_get_connections: {
        Args: { OUT: unknown; OUT: unknown }
        Returns: Record<string, unknown>[]
      }
      postgres_fdw_disconnect: {
        Args: Record<string, unknown>
        Returns: boolean
      }
      postgres_fdw_disconnect_all: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
  }
  extensions: {
    Tables: {}
    Functions: {
      digest: {
        Args: Record<string, unknown>
        Returns: string
      }
      digest: {
        Args: Record<string, unknown>
        Returns: string
      }
      hmac: {
        Args: Record<string, unknown>
        Returns: string
      }
      hmac: {
        Args: Record<string, unknown>
        Returns: string
      }
      crypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      gen_salt: {
        Args: Record<string, unknown>
        Returns: string
      }
      gen_salt: {
        Args: Record<string, unknown>
        Returns: string
      }
      encrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      decrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      encrypt_iv: {
        Args: Record<string, unknown>
        Returns: string
      }
      decrypt_iv: {
        Args: Record<string, unknown>
        Returns: string
      }
      gen_random_bytes: {
        Args: Record<string, unknown>
        Returns: string
      }
      gen_random_uuid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      pgp_sym_encrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_sym_encrypt_bytea: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_sym_encrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_sym_encrypt_bytea: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_sym_decrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_sym_decrypt_bytea: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_sym_decrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_sym_decrypt_bytea: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_encrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_encrypt_bytea: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_encrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_encrypt_bytea: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_decrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_decrypt_bytea: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_decrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_decrypt_bytea: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_decrypt: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_pub_decrypt_bytea: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_key_id: {
        Args: Record<string, unknown>
        Returns: string
      }
      armor: {
        Args: Record<string, unknown>
        Returns: string
      }
      armor: {
        Args: Record<string, unknown>
        Returns: string
      }
      dearmor: {
        Args: Record<string, unknown>
        Returns: string
      }
      pgp_armor_headers: {
        Args: Record<string, unknown>
        Returns: Record<string, unknown>[]
      }
      url_encode: {
        Args: { data: string }
        Returns: string
      }
      url_decode: {
        Args: { data: string }
        Returns: string
      }
      algorithm_sign: {
        Args: { signables: string; secret: string; algorithm: string }
        Returns: string
      }
      sign: {
        Args: { payload: Json; secret: string; algorithm: unknown }
        Returns: string
      }
      verify: {
        Args: { token: string; secret: string; algorithm: unknown }
        Returns: Record<string, unknown>[]
      }
      try_cast_double: {
        Args: { inp: string }
        Returns: number
      }
      uuid_nil: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_dns: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_url: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_oid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_ns_x500: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v1: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v1mc: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v3: {
        Args: { namespace: string; name: string }
        Returns: string
      }
      uuid_generate_v4: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uuid_generate_v5: {
        Args: { namespace: string; name: string }
        Returns: string
      }
      grant_pg_cron_access: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      grant_pg_graphql_access: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      grant_pg_net_access: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      pgrst_ddl_watch: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      pgrst_drop_watch: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      set_graphql_placeholder: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          id: string
          name: string
          owner: string | null
          created_at: string | null
          updated_at: string | null
          public: boolean | null
        }
        Insert: {
          id: string
          name: string
          owner?: string | null
          created_at?: string | null
          updated_at?: string | null
          public?: boolean | null
        }
        Update: {
          id?: string
          name?: string
          owner?: string | null
          created_at?: string | null
          updated_at?: string | null
          public?: boolean | null
        }
      }
      migrations: {
        Row: {
          id: number
          name: string
          hash: string
          executed_at: string | null
        }
        Insert: {
          id: number
          name: string
          hash: string
          executed_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          hash?: string
          executed_at?: string | null
        }
      }
      objects: {
        Row: {
          bucket_id: string | null
          name: string | null
          owner: string | null
          metadata: Json | null
          id: string
          created_at: string | null
          updated_at: string | null
          last_accessed_at: string | null
          path_tokens: string[] | null
        }
        Insert: {
          bucket_id?: string | null
          name?: string | null
          owner?: string | null
          metadata?: Json | null
          id?: string
          created_at?: string | null
          updated_at?: string | null
          last_accessed_at?: string | null
          path_tokens?: string[] | null
        }
        Update: {
          bucket_id?: string | null
          name?: string | null
          owner?: string | null
          metadata?: Json | null
          id?: string
          created_at?: string | null
          updated_at?: string | null
          last_accessed_at?: string | null
          path_tokens?: string[] | null
        }
      }
    }
    Functions: {
      extension: {
        Args: { name: string }
        Returns: string
      }
      filename: {
        Args: { name: string }
        Returns: string
      }
      foldername: {
        Args: { name: string }
        Returns: string[]
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: Record<string, unknown>[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits: unknown
          levels: unknown
          offsets: unknown
        }
        Returns: Record<string, unknown>[]
      }
    }
  }
  realtime: {
    Tables: {
      schema_migrations: {
        Row: {
          version: number
          inserted_at: string | null
        }
        Insert: {
          version: number
          inserted_at?: string | null
        }
        Update: {
          version?: number
          inserted_at?: string | null
        }
      }
      subscription: {
        Row: {
          subscription_id: string
          entity: unknown
          claims: Json
          filters: unknown[]
          claims_role: unknown
          created_at: string
          id: number
        }
        Insert: {
          subscription_id: string
          entity: unknown
          claims: Json
          filters?: unknown[]
          claims_role?: unknown
          created_at?: string
          id?: never
        }
        Update: {
          subscription_id?: string
          entity?: unknown
          claims?: Json
          filters?: unknown[]
          claims_role?: unknown
          created_at?: string
          id?: never
        }
      }
    }
    Functions: {
      apply_rls: {
        Args: { wal: Json; max_record_bytes: unknown }
        Returns: unknown
      }
      build_prepared_statement_sql: {
        Args: {
          prepared_statement_name: string
          entity: unknown
          columns: unknown
        }
        Returns: string
      }
      cast: {
        Args: { val: string; type_: unknown }
        Returns: Json
      }
      check_equality_op: {
        Args: {
          op: "eq" | "neq" | "lt" | "lte" | "gt" | "gte"
          type_: unknown
          val_1: string
          val_2: string
        }
        Returns: boolean
      }
      is_visible_through_filters: {
        Args: { columns: unknown; filters: unknown }
        Returns: boolean
      }
      quote_wal2json: {
        Args: { entity: unknown }
        Returns: string
      }
      to_regrole: {
        Args: { role_name: string }
        Returns: unknown
      }
    }
  }
  graphql_public: {
    Tables: {}
    Functions: {
      graphql: {
        Args: Record<string, unknown>
        Returns: Json
      }
    }
  }
  auth: {
    Tables: {
      audit_log_entries: {
        Row: {
          instance_id: string | null
          id: string
          payload: Json | null
          created_at: string | null
        }
        Insert: {
          instance_id?: string | null
          id: string
          payload?: Json | null
          created_at?: string | null
        }
        Update: {
          instance_id?: string | null
          id?: string
          payload?: Json | null
          created_at?: string | null
        }
      }
      identities: {
        Row: {
          id: string
          user_id: string
          identity_data: Json
          provider: string
          last_sign_in_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          user_id: string
          identity_data: Json
          provider: string
          last_sign_in_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          identity_data?: Json
          provider?: string
          last_sign_in_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      instances: {
        Row: {
          id: string
          uuid: string | null
          raw_base_config: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          uuid?: string | null
          raw_base_config?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          uuid?: string | null
          raw_base_config?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      refresh_tokens: {
        Row: {
          instance_id: string | null
          token: string | null
          user_id: string | null
          revoked: boolean | null
          created_at: string | null
          updated_at: string | null
          parent: string | null
          id: number
        }
        Insert: {
          instance_id?: string | null
          token?: string | null
          user_id?: string | null
          revoked?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          parent?: string | null
          id?: number
        }
        Update: {
          instance_id?: string | null
          token?: string | null
          user_id?: string | null
          revoked?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          parent?: string | null
          id?: number
        }
      }
      schema_migrations: {
        Row: {
          version: string
        }
        Insert: {
          version: string
        }
        Update: {
          version?: string
        }
      }
      users: {
        Row: {
          instance_id: string | null
          id: string
          aud: string | null
          role: string | null
          email: string | null
          encrypted_password: string | null
          email_confirmed_at: string | null
          invited_at: string | null
          confirmation_token: string | null
          confirmation_sent_at: string | null
          recovery_token: string | null
          recovery_sent_at: string | null
          email_change_token_new: string | null
          email_change: string | null
          email_change_sent_at: string | null
          last_sign_in_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          is_super_admin: boolean | null
          created_at: string | null
          updated_at: string | null
          phone_confirmed_at: string | null
          phone_change_sent_at: string | null
          banned_until: string | null
          reauthentication_sent_at: string | null
          phone: string | null
          phone_change: string | null
          phone_change_token: string | null
          confirmed_at: string | null
          email_change_token_current: string | null
          email_change_confirm_status: number | null
          reauthentication_token: string | null
        }
        Insert: {
          instance_id?: string | null
          id: string
          aud?: string | null
          role?: string | null
          email?: string | null
          encrypted_password?: string | null
          email_confirmed_at?: string | null
          invited_at?: string | null
          confirmation_token?: string | null
          confirmation_sent_at?: string | null
          recovery_token?: string | null
          recovery_sent_at?: string | null
          email_change_token_new?: string | null
          email_change?: string | null
          email_change_sent_at?: string | null
          last_sign_in_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          is_super_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          phone_confirmed_at?: string | null
          phone_change_sent_at?: string | null
          banned_until?: string | null
          reauthentication_sent_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_token?: string | null
          confirmed_at?: string | null
          email_change_token_current?: string | null
          email_change_confirm_status?: number | null
          reauthentication_token?: string | null
        }
        Update: {
          instance_id?: string | null
          id?: string
          aud?: string | null
          role?: string | null
          email?: string | null
          encrypted_password?: string | null
          email_confirmed_at?: string | null
          invited_at?: string | null
          confirmation_token?: string | null
          confirmation_sent_at?: string | null
          recovery_token?: string | null
          recovery_sent_at?: string | null
          email_change_token_new?: string | null
          email_change?: string | null
          email_change_sent_at?: string | null
          last_sign_in_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          is_super_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          phone_confirmed_at?: string | null
          phone_change_sent_at?: string | null
          banned_until?: string | null
          reauthentication_sent_at?: string | null
          phone?: string | null
          phone_change?: string | null
          phone_change_token?: string | null
          confirmed_at?: string | null
          email_change_token_current?: string | null
          email_change_confirm_status?: number | null
          reauthentication_token?: string | null
        }
      }
    }
    Functions: {
      email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      uid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
  }
}
