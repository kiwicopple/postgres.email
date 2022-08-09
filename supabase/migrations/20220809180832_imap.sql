create schema if not exists imap;

CREATE TABLE imap.raw_imap_mailboxes (
	name text NULL,
	"attributes" jsonb NULL,
	"delimiter" text NULL,
	flags jsonb NULL,
	permanent_flags jsonb NULL,
	messages int8 NULL,
	recent int8 NULL,
	unseen int8 NULL,
	read_only bool NULL,
	"_ctx" jsonb NULL
);

CREATE TABLE imap.raw_imap_messages (
	"timestamp" timestamptz NULL,
	from_email text NULL,
	subject text NULL,
	message_id text NULL,
	to_addresses jsonb NULL,
	cc_addresses jsonb NULL,
	bcc_addresses jsonb NULL,
	seq_num int8 NULL,
	"size" int8 NULL,
	attachments jsonb NULL,
	body_html text NULL,
	body_text text NULL,
	embedded_files jsonb NULL,
	errors jsonb NULL,
	flags jsonb NULL,
	from_addresses jsonb NULL,
	headers jsonb NULL,
	in_reply_to jsonb NULL,
	mailbox text NULL,
	query text NULL,
	"_ctx" jsonb NULL
);