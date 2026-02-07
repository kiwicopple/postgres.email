-- Remove pgvector implementation

-- Drop the search function
drop function if exists search(vector(1536), float, int);

-- Drop the embedding column from messages table
alter table messages drop column if exists embedding;

-- Drop the vector extension
drop extension if exists vector;
