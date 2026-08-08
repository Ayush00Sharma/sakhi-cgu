REVOKE EXECUTE ON FUNCTION public.purge_old_location_history() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_location_history() TO postgres, service_role;