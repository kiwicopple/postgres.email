SET check_function_bodies = false;
CREATE FUNCTION public.messages_set_thread_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  parent_thread text;
BEGIN
  IF NEW.in_reply_to IS NULL THEN
    NEW.thread_id := NEW.id;
  ELSE
    SELECT thread_id INTO parent_thread
      FROM public.messages
     WHERE id = NEW.in_reply_to;
    NEW.thread_id := COALESCE(parent_thread, NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;
ALTER TABLE public.messages ADD COLUMN thread_id text;
CREATE INDEX messages_thread_id_ts_idx ON public.messages (thread_id, ts);
CREATE TRIGGER messages_set_thread_id_trg BEFORE INSERT OR UPDATE OF in_reply_to ON public.messages FOR EACH ROW EXECUTE FUNCTION public.messages_set_thread_id();
