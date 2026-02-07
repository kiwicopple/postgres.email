-- Remove pgvector search function, embedding column, and vector extension

drop function if exists search(vector(1536), float, int);

alter table messages drop column if exists embedding;

drop extension if exists vector;
