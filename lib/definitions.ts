/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
  "/": {
    get: {
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/mailboxes": {
    get: {
      parameters: {
        query: {
          id?: parameters["rowFilter.mailboxes.id"];
          message_count?: parameters["rowFilter.mailboxes.message_count"];
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["mailboxes"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** mailboxes */
          mailboxes?: definitions["mailboxes"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        query: {
          id?: parameters["rowFilter.mailboxes.id"];
          message_count?: parameters["rowFilter.mailboxes.message_count"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        query: {
          id?: parameters["rowFilter.mailboxes.id"];
          message_count?: parameters["rowFilter.mailboxes.message_count"];
        };
        body: {
          /** mailboxes */
          mailboxes?: definitions["mailboxes"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/messages": {
    get: {
      parameters: {
        query: {
          id?: parameters["rowFilter.messages.id"];
          mailbox_id?: parameters["rowFilter.messages.mailbox_id"];
          in_reply_to?: parameters["rowFilter.messages.in_reply_to"];
          ts?: parameters["rowFilter.messages.ts"];
          subject?: parameters["rowFilter.messages.subject"];
          from_email?: parameters["rowFilter.messages.from_email"];
          to_addresses?: parameters["rowFilter.messages.to_addresses"];
          cc_addresses?: parameters["rowFilter.messages.cc_addresses"];
          bcc_addresses?: parameters["rowFilter.messages.bcc_addresses"];
          from_addresses?: parameters["rowFilter.messages.from_addresses"];
          seq_num?: parameters["rowFilter.messages.seq_num"];
          size?: parameters["rowFilter.messages.size"];
          attachments?: parameters["rowFilter.messages.attachments"];
          body_text?: parameters["rowFilter.messages.body_text"];
          embedded_files?: parameters["rowFilter.messages.embedded_files"];
          headers?: parameters["rowFilter.messages.headers"];
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["messages"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** messages */
          messages?: definitions["messages"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        query: {
          id?: parameters["rowFilter.messages.id"];
          mailbox_id?: parameters["rowFilter.messages.mailbox_id"];
          in_reply_to?: parameters["rowFilter.messages.in_reply_to"];
          ts?: parameters["rowFilter.messages.ts"];
          subject?: parameters["rowFilter.messages.subject"];
          from_email?: parameters["rowFilter.messages.from_email"];
          to_addresses?: parameters["rowFilter.messages.to_addresses"];
          cc_addresses?: parameters["rowFilter.messages.cc_addresses"];
          bcc_addresses?: parameters["rowFilter.messages.bcc_addresses"];
          from_addresses?: parameters["rowFilter.messages.from_addresses"];
          seq_num?: parameters["rowFilter.messages.seq_num"];
          size?: parameters["rowFilter.messages.size"];
          attachments?: parameters["rowFilter.messages.attachments"];
          body_text?: parameters["rowFilter.messages.body_text"];
          embedded_files?: parameters["rowFilter.messages.embedded_files"];
          headers?: parameters["rowFilter.messages.headers"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        query: {
          id?: parameters["rowFilter.messages.id"];
          mailbox_id?: parameters["rowFilter.messages.mailbox_id"];
          in_reply_to?: parameters["rowFilter.messages.in_reply_to"];
          ts?: parameters["rowFilter.messages.ts"];
          subject?: parameters["rowFilter.messages.subject"];
          from_email?: parameters["rowFilter.messages.from_email"];
          to_addresses?: parameters["rowFilter.messages.to_addresses"];
          cc_addresses?: parameters["rowFilter.messages.cc_addresses"];
          bcc_addresses?: parameters["rowFilter.messages.bcc_addresses"];
          from_addresses?: parameters["rowFilter.messages.from_addresses"];
          seq_num?: parameters["rowFilter.messages.seq_num"];
          size?: parameters["rowFilter.messages.size"];
          attachments?: parameters["rowFilter.messages.attachments"];
          body_text?: parameters["rowFilter.messages.body_text"];
          embedded_files?: parameters["rowFilter.messages.embedded_files"];
          headers?: parameters["rowFilter.messages.headers"];
        };
        body: {
          /** messages */
          messages?: definitions["messages"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/raw_imap_mailboxes": {
    get: {
      parameters: {
        query: {
          name?: parameters["rowFilter.raw_imap_mailboxes.name"];
          attributes?: parameters["rowFilter.raw_imap_mailboxes.attributes"];
          delimiter?: parameters["rowFilter.raw_imap_mailboxes.delimiter"];
          flags?: parameters["rowFilter.raw_imap_mailboxes.flags"];
          permanent_flags?: parameters["rowFilter.raw_imap_mailboxes.permanent_flags"];
          messages?: parameters["rowFilter.raw_imap_mailboxes.messages"];
          recent?: parameters["rowFilter.raw_imap_mailboxes.recent"];
          unseen?: parameters["rowFilter.raw_imap_mailboxes.unseen"];
          read_only?: parameters["rowFilter.raw_imap_mailboxes.read_only"];
          _ctx?: parameters["rowFilter.raw_imap_mailboxes._ctx"];
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["raw_imap_mailboxes"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** raw_imap_mailboxes */
          raw_imap_mailboxes?: definitions["raw_imap_mailboxes"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        query: {
          name?: parameters["rowFilter.raw_imap_mailboxes.name"];
          attributes?: parameters["rowFilter.raw_imap_mailboxes.attributes"];
          delimiter?: parameters["rowFilter.raw_imap_mailboxes.delimiter"];
          flags?: parameters["rowFilter.raw_imap_mailboxes.flags"];
          permanent_flags?: parameters["rowFilter.raw_imap_mailboxes.permanent_flags"];
          messages?: parameters["rowFilter.raw_imap_mailboxes.messages"];
          recent?: parameters["rowFilter.raw_imap_mailboxes.recent"];
          unseen?: parameters["rowFilter.raw_imap_mailboxes.unseen"];
          read_only?: parameters["rowFilter.raw_imap_mailboxes.read_only"];
          _ctx?: parameters["rowFilter.raw_imap_mailboxes._ctx"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        query: {
          name?: parameters["rowFilter.raw_imap_mailboxes.name"];
          attributes?: parameters["rowFilter.raw_imap_mailboxes.attributes"];
          delimiter?: parameters["rowFilter.raw_imap_mailboxes.delimiter"];
          flags?: parameters["rowFilter.raw_imap_mailboxes.flags"];
          permanent_flags?: parameters["rowFilter.raw_imap_mailboxes.permanent_flags"];
          messages?: parameters["rowFilter.raw_imap_mailboxes.messages"];
          recent?: parameters["rowFilter.raw_imap_mailboxes.recent"];
          unseen?: parameters["rowFilter.raw_imap_mailboxes.unseen"];
          read_only?: parameters["rowFilter.raw_imap_mailboxes.read_only"];
          _ctx?: parameters["rowFilter.raw_imap_mailboxes._ctx"];
        };
        body: {
          /** raw_imap_mailboxes */
          raw_imap_mailboxes?: definitions["raw_imap_mailboxes"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/raw_imap_messages": {
    get: {
      parameters: {
        query: {
          timestamp?: parameters["rowFilter.raw_imap_messages.timestamp"];
          from_email?: parameters["rowFilter.raw_imap_messages.from_email"];
          subject?: parameters["rowFilter.raw_imap_messages.subject"];
          message_id?: parameters["rowFilter.raw_imap_messages.message_id"];
          to_addresses?: parameters["rowFilter.raw_imap_messages.to_addresses"];
          cc_addresses?: parameters["rowFilter.raw_imap_messages.cc_addresses"];
          bcc_addresses?: parameters["rowFilter.raw_imap_messages.bcc_addresses"];
          seq_num?: parameters["rowFilter.raw_imap_messages.seq_num"];
          size?: parameters["rowFilter.raw_imap_messages.size"];
          attachments?: parameters["rowFilter.raw_imap_messages.attachments"];
          body_html?: parameters["rowFilter.raw_imap_messages.body_html"];
          body_text?: parameters["rowFilter.raw_imap_messages.body_text"];
          embedded_files?: parameters["rowFilter.raw_imap_messages.embedded_files"];
          errors?: parameters["rowFilter.raw_imap_messages.errors"];
          flags?: parameters["rowFilter.raw_imap_messages.flags"];
          from_addresses?: parameters["rowFilter.raw_imap_messages.from_addresses"];
          headers?: parameters["rowFilter.raw_imap_messages.headers"];
          in_reply_to?: parameters["rowFilter.raw_imap_messages.in_reply_to"];
          mailbox?: parameters["rowFilter.raw_imap_messages.mailbox"];
          query?: parameters["rowFilter.raw_imap_messages.query"];
          _ctx?: parameters["rowFilter.raw_imap_messages._ctx"];
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["raw_imap_messages"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
    post: {
      parameters: {
        body: {
          /** raw_imap_messages */
          raw_imap_messages?: definitions["raw_imap_messages"];
        };
        query: {
          /** Filtering Columns */
          select?: parameters["select"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** Created */
        201: unknown;
      };
    };
    delete: {
      parameters: {
        query: {
          timestamp?: parameters["rowFilter.raw_imap_messages.timestamp"];
          from_email?: parameters["rowFilter.raw_imap_messages.from_email"];
          subject?: parameters["rowFilter.raw_imap_messages.subject"];
          message_id?: parameters["rowFilter.raw_imap_messages.message_id"];
          to_addresses?: parameters["rowFilter.raw_imap_messages.to_addresses"];
          cc_addresses?: parameters["rowFilter.raw_imap_messages.cc_addresses"];
          bcc_addresses?: parameters["rowFilter.raw_imap_messages.bcc_addresses"];
          seq_num?: parameters["rowFilter.raw_imap_messages.seq_num"];
          size?: parameters["rowFilter.raw_imap_messages.size"];
          attachments?: parameters["rowFilter.raw_imap_messages.attachments"];
          body_html?: parameters["rowFilter.raw_imap_messages.body_html"];
          body_text?: parameters["rowFilter.raw_imap_messages.body_text"];
          embedded_files?: parameters["rowFilter.raw_imap_messages.embedded_files"];
          errors?: parameters["rowFilter.raw_imap_messages.errors"];
          flags?: parameters["rowFilter.raw_imap_messages.flags"];
          from_addresses?: parameters["rowFilter.raw_imap_messages.from_addresses"];
          headers?: parameters["rowFilter.raw_imap_messages.headers"];
          in_reply_to?: parameters["rowFilter.raw_imap_messages.in_reply_to"];
          mailbox?: parameters["rowFilter.raw_imap_messages.mailbox"];
          query?: parameters["rowFilter.raw_imap_messages.query"];
          _ctx?: parameters["rowFilter.raw_imap_messages._ctx"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
    patch: {
      parameters: {
        query: {
          timestamp?: parameters["rowFilter.raw_imap_messages.timestamp"];
          from_email?: parameters["rowFilter.raw_imap_messages.from_email"];
          subject?: parameters["rowFilter.raw_imap_messages.subject"];
          message_id?: parameters["rowFilter.raw_imap_messages.message_id"];
          to_addresses?: parameters["rowFilter.raw_imap_messages.to_addresses"];
          cc_addresses?: parameters["rowFilter.raw_imap_messages.cc_addresses"];
          bcc_addresses?: parameters["rowFilter.raw_imap_messages.bcc_addresses"];
          seq_num?: parameters["rowFilter.raw_imap_messages.seq_num"];
          size?: parameters["rowFilter.raw_imap_messages.size"];
          attachments?: parameters["rowFilter.raw_imap_messages.attachments"];
          body_html?: parameters["rowFilter.raw_imap_messages.body_html"];
          body_text?: parameters["rowFilter.raw_imap_messages.body_text"];
          embedded_files?: parameters["rowFilter.raw_imap_messages.embedded_files"];
          errors?: parameters["rowFilter.raw_imap_messages.errors"];
          flags?: parameters["rowFilter.raw_imap_messages.flags"];
          from_addresses?: parameters["rowFilter.raw_imap_messages.from_addresses"];
          headers?: parameters["rowFilter.raw_imap_messages.headers"];
          in_reply_to?: parameters["rowFilter.raw_imap_messages.in_reply_to"];
          mailbox?: parameters["rowFilter.raw_imap_messages.mailbox"];
          query?: parameters["rowFilter.raw_imap_messages.query"];
          _ctx?: parameters["rowFilter.raw_imap_messages._ctx"];
        };
        body: {
          /** raw_imap_messages */
          raw_imap_messages?: definitions["raw_imap_messages"];
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferReturn"];
        };
      };
      responses: {
        /** No Content */
        204: never;
      };
    };
  };
  "/threads": {
    get: {
      parameters: {
        query: {
          id?: parameters["rowFilter.threads.id"];
          thread_id?: parameters["rowFilter.threads.thread_id"];
          mailbox_id?: parameters["rowFilter.threads.mailbox_id"];
          in_reply_to?: parameters["rowFilter.threads.in_reply_to"];
          ts?: parameters["rowFilter.threads.ts"];
          subject?: parameters["rowFilter.threads.subject"];
          from_email?: parameters["rowFilter.threads.from_email"];
          to_addresses?: parameters["rowFilter.threads.to_addresses"];
          cc_addresses?: parameters["rowFilter.threads.cc_addresses"];
          bcc_addresses?: parameters["rowFilter.threads.bcc_addresses"];
          from_addresses?: parameters["rowFilter.threads.from_addresses"];
          seq_num?: parameters["rowFilter.threads.seq_num"];
          size?: parameters["rowFilter.threads.size"];
          attachments?: parameters["rowFilter.threads.attachments"];
          body_text?: parameters["rowFilter.threads.body_text"];
          embedded_files?: parameters["rowFilter.threads.embedded_files"];
          headers?: parameters["rowFilter.threads.headers"];
          /** Filtering Columns */
          select?: parameters["select"];
          /** Ordering */
          order?: parameters["order"];
          /** Limiting and Pagination */
          offset?: parameters["offset"];
          /** Limiting and Pagination */
          limit?: parameters["limit"];
        };
        header: {
          /** Limiting and Pagination */
          Range?: parameters["range"];
          /** Limiting and Pagination */
          "Range-Unit"?: parameters["rangeUnit"];
          /** Preference */
          Prefer?: parameters["preferCount"];
        };
      };
      responses: {
        /** OK */
        200: {
          schema: definitions["threads"][];
        };
        /** Partial Content */
        206: unknown;
      };
    };
  };
  "/rpc/postgres_fdw_get_connections": {
    post: {
      parameters: {
        body: {
          args: { [key: string]: unknown };
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferParams"];
        };
      };
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/rpc/postgres_fdw_disconnect_all": {
    post: {
      parameters: {
        body: {
          args: { [key: string]: unknown };
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferParams"];
        };
      };
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/rpc/postgres_fdw_disconnect": {
    post: {
      parameters: {
        body: {
          args: {
            /** Format: text */
            "": string;
          };
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferParams"];
        };
      };
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
  "/rpc/postgres_fdw_handler": {
    post: {
      parameters: {
        body: {
          args: { [key: string]: unknown };
        };
        header: {
          /** Preference */
          Prefer?: parameters["preferParams"];
        };
      };
      responses: {
        /** OK */
        200: unknown;
      };
    };
  };
}

export interface definitions {
  mailboxes: {
    /**
     * Format: text
     * @description Note:
     * This is a Primary Key.<pk/>
     */
    id: string;
    /** Format: integer */
    message_count?: number;
  };
  messages: {
    /** Format: text */
    id?: string;
    /**
     * Format: text
     * @description Note:
     * This is a Foreign Key to `mailboxes.id`.<fk table='mailboxes' column='id'/>
     */
    mailbox_id?: string;
    /** Format: text */
    in_reply_to?: string;
    /** Format: timestamp with time zone */
    ts?: string;
    /** Format: text */
    subject?: string;
    /** Format: text */
    from_email?: string;
    /** Format: jsonb */
    to_addresses?: string;
    /** Format: jsonb */
    cc_addresses?: string;
    /** Format: jsonb */
    bcc_addresses?: string;
    /** Format: jsonb */
    from_addresses?: string;
    /** Format: integer */
    seq_num?: number;
    /** Format: bigint */
    size?: number;
    /** Format: jsonb */
    attachments?: string;
    /** Format: text */
    body_text?: string;
    /** Format: jsonb */
    embedded_files?: string;
    /** Format: jsonb */
    headers?: string;
  };
  raw_imap_mailboxes: {
    /** Format: text */
    name?: string;
    /** Format: jsonb */
    attributes?: string;
    /** Format: text */
    delimiter?: string;
    /** Format: jsonb */
    flags?: string;
    /** Format: jsonb */
    permanent_flags?: string;
    /** Format: bigint */
    messages?: number;
    /** Format: bigint */
    recent?: number;
    /** Format: bigint */
    unseen?: number;
    /** Format: boolean */
    read_only?: boolean;
    /** Format: jsonb */
    _ctx?: string;
  };
  raw_imap_messages: {
    /** Format: timestamp with time zone */
    timestamp?: string;
    /** Format: text */
    from_email?: string;
    /** Format: text */
    subject?: string;
    /** Format: text */
    message_id?: string;
    /** Format: jsonb */
    to_addresses?: string;
    /** Format: jsonb */
    cc_addresses?: string;
    /** Format: jsonb */
    bcc_addresses?: string;
    /** Format: bigint */
    seq_num?: number;
    /** Format: bigint */
    size?: number;
    /** Format: jsonb */
    attachments?: string;
    /** Format: text */
    body_html?: string;
    /** Format: text */
    body_text?: string;
    /** Format: jsonb */
    embedded_files?: string;
    /** Format: jsonb */
    errors?: string;
    /** Format: jsonb */
    flags?: string;
    /** Format: jsonb */
    from_addresses?: string;
    /** Format: jsonb */
    headers?: string;
    /** Format: jsonb */
    in_reply_to?: string;
    /** Format: text */
    mailbox?: string;
    /** Format: text */
    query?: string;
    /** Format: jsonb */
    _ctx?: string;
  };
  threads: {
    /** Format: text */
    id?: string;
    /** Format: text */
    thread_id?: string;
    /** Format: text */
    mailbox_id?: string;
    /** Format: text */
    in_reply_to?: string;
    /** Format: timestamp with time zone */
    ts?: string;
    /** Format: text */
    subject?: string;
    /** Format: text */
    from_email?: string;
    /** Format: jsonb */
    to_addresses?: string;
    /** Format: jsonb */
    cc_addresses?: string;
    /** Format: jsonb */
    bcc_addresses?: string;
    /** Format: jsonb */
    from_addresses?: string;
    /** Format: integer */
    seq_num?: number;
    /** Format: bigint */
    size?: number;
    /** Format: jsonb */
    attachments?: string;
    /** Format: text */
    body_text?: string;
    /** Format: jsonb */
    embedded_files?: string;
    /** Format: jsonb */
    headers?: string;
  };
}

export interface parameters {
  /**
   * @description Preference
   * @enum {string}
   */
  preferParams: "params=single-object";
  /**
   * @description Preference
   * @enum {string}
   */
  preferReturn: "return=representation" | "return=minimal" | "return=none";
  /**
   * @description Preference
   * @enum {string}
   */
  preferCount: "count=none";
  /** @description Filtering Columns */
  select: string;
  /** @description On Conflict */
  on_conflict: string;
  /** @description Ordering */
  order: string;
  /** @description Limiting and Pagination */
  range: string;
  /**
   * @description Limiting and Pagination
   * @default items
   */
  rangeUnit: string;
  /** @description Limiting and Pagination */
  offset: string;
  /** @description Limiting and Pagination */
  limit: string;
  /** @description mailboxes */
  "body.mailboxes": definitions["mailboxes"];
  /** Format: text */
  "rowFilter.mailboxes.id": string;
  /** Format: integer */
  "rowFilter.mailboxes.message_count": string;
  /** @description messages */
  "body.messages": definitions["messages"];
  /** Format: text */
  "rowFilter.messages.id": string;
  /** Format: text */
  "rowFilter.messages.mailbox_id": string;
  /** Format: text */
  "rowFilter.messages.in_reply_to": string;
  /** Format: timestamp with time zone */
  "rowFilter.messages.ts": string;
  /** Format: text */
  "rowFilter.messages.subject": string;
  /** Format: text */
  "rowFilter.messages.from_email": string;
  /** Format: jsonb */
  "rowFilter.messages.to_addresses": string;
  /** Format: jsonb */
  "rowFilter.messages.cc_addresses": string;
  /** Format: jsonb */
  "rowFilter.messages.bcc_addresses": string;
  /** Format: jsonb */
  "rowFilter.messages.from_addresses": string;
  /** Format: integer */
  "rowFilter.messages.seq_num": string;
  /** Format: bigint */
  "rowFilter.messages.size": string;
  /** Format: jsonb */
  "rowFilter.messages.attachments": string;
  /** Format: text */
  "rowFilter.messages.body_text": string;
  /** Format: jsonb */
  "rowFilter.messages.embedded_files": string;
  /** Format: jsonb */
  "rowFilter.messages.headers": string;
  /** @description raw_imap_mailboxes */
  "body.raw_imap_mailboxes": definitions["raw_imap_mailboxes"];
  /** Format: text */
  "rowFilter.raw_imap_mailboxes.name": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_mailboxes.attributes": string;
  /** Format: text */
  "rowFilter.raw_imap_mailboxes.delimiter": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_mailboxes.flags": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_mailboxes.permanent_flags": string;
  /** Format: bigint */
  "rowFilter.raw_imap_mailboxes.messages": string;
  /** Format: bigint */
  "rowFilter.raw_imap_mailboxes.recent": string;
  /** Format: bigint */
  "rowFilter.raw_imap_mailboxes.unseen": string;
  /** Format: boolean */
  "rowFilter.raw_imap_mailboxes.read_only": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_mailboxes._ctx": string;
  /** @description raw_imap_messages */
  "body.raw_imap_messages": definitions["raw_imap_messages"];
  /** Format: timestamp with time zone */
  "rowFilter.raw_imap_messages.timestamp": string;
  /** Format: text */
  "rowFilter.raw_imap_messages.from_email": string;
  /** Format: text */
  "rowFilter.raw_imap_messages.subject": string;
  /** Format: text */
  "rowFilter.raw_imap_messages.message_id": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.to_addresses": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.cc_addresses": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.bcc_addresses": string;
  /** Format: bigint */
  "rowFilter.raw_imap_messages.seq_num": string;
  /** Format: bigint */
  "rowFilter.raw_imap_messages.size": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.attachments": string;
  /** Format: text */
  "rowFilter.raw_imap_messages.body_html": string;
  /** Format: text */
  "rowFilter.raw_imap_messages.body_text": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.embedded_files": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.errors": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.flags": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.from_addresses": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.headers": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages.in_reply_to": string;
  /** Format: text */
  "rowFilter.raw_imap_messages.mailbox": string;
  /** Format: text */
  "rowFilter.raw_imap_messages.query": string;
  /** Format: jsonb */
  "rowFilter.raw_imap_messages._ctx": string;
  /** @description threads */
  "body.threads": definitions["threads"];
  /** Format: text */
  "rowFilter.threads.id": string;
  /** Format: text */
  "rowFilter.threads.thread_id": string;
  /** Format: text */
  "rowFilter.threads.mailbox_id": string;
  /** Format: text */
  "rowFilter.threads.in_reply_to": string;
  /** Format: timestamp with time zone */
  "rowFilter.threads.ts": string;
  /** Format: text */
  "rowFilter.threads.subject": string;
  /** Format: text */
  "rowFilter.threads.from_email": string;
  /** Format: jsonb */
  "rowFilter.threads.to_addresses": string;
  /** Format: jsonb */
  "rowFilter.threads.cc_addresses": string;
  /** Format: jsonb */
  "rowFilter.threads.bcc_addresses": string;
  /** Format: jsonb */
  "rowFilter.threads.from_addresses": string;
  /** Format: integer */
  "rowFilter.threads.seq_num": string;
  /** Format: bigint */
  "rowFilter.threads.size": string;
  /** Format: jsonb */
  "rowFilter.threads.attachments": string;
  /** Format: text */
  "rowFilter.threads.body_text": string;
  /** Format: jsonb */
  "rowFilter.threads.embedded_files": string;
  /** Format: jsonb */
  "rowFilter.threads.headers": string;
}

export interface operations {}

export interface external {}