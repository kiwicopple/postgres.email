# `postgres.email`


## About

A website to display all Postgres emails.

## Background

This is a small POC to transform the Postgres [mailing lists](https://www.postgresql.org/list/) more readable.

As a comparison:

- ["COPY TO (FREEZE)?" on postgres.email](https://postgres.email/lists/pgsql-hackers/%3C20220802.133046.1941977979333284049.horikyota.ntt@gmail.com%3E)
- ["COPY TO (FREEZE)?" on postgres list](https://www.postgresql.org/message-id/20220802.133046.1941977979333284049.horikyota.ntt%40gmail.com)

The idea of postgres.email is to make all responses threaded, like the comments on HN or Reddit.

This uses an imap Foreign Data Wrapper to ingest the messages into a Postgres database. For the POC, only ingested 1000 messages, and it doesn't display attachments.


The technologies used are:

- Gmail to receive the email
- Steampipe for the FDW: https://hub.steampipe.io/plugins/turbot/imap
- Supabase for the Postgres database / APIs: https://supabase.com
- Remix for the frontend: https://remix.run/

Given the size of the mailing lists, I doubt the current approach will scale much further than the POC, so I'll need to re-think the architecture. 
I'll probably keep the emails in gmail and and leverage the FDW for older messages.

Some things I'd like to do next:

- explore alternative architectures
- show attachments
- add a REST API 
- add search - the size of the mailing lists might make this difficult
- allow readers to toggle on a "markdown" view. Often authors use markdown syntax in their emails 
- add a light mode

## Development

To run your Remix app locally, make sure your project's local dependencies are installed:

```sh
npm install
```

Afterwards, start the Remix development server like so:

```sh
supabase start
npm run dev
```

Open up [http://localhost:3000](http://localhost:3000) and you should be ready to go!

