CREATE OR REPLACE FUNCTION public.get_support_analytics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_user_id UUID := auth.uid();
  v_result  JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  IF public.has_role(v_user_id, 'admin'::app_role) THEN
    SELECT jsonb_build_object(
      'total_tickets',
        (SELECT count(*) FROM public.support_tickets),
      'open_tickets',
        (SELECT count(*) FROM public.support_tickets WHERE status NOT IN ('Resolved', 'Closed')),
      'resolved_today',
        (SELECT count(*) FROM public.support_tickets WHERE resolved_at::date = CURRENT_DATE),
      'avg_resolution_hours',
        (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 1), 0)
           FROM public.support_tickets WHERE resolved_at IS NOT NULL),
      'critical_tickets',
        (SELECT count(*) FROM public.support_tickets WHERE priority = 'Critical' AND status NOT IN ('Resolved', 'Closed')),
      'by_category',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', category, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
           FROM (SELECT category, count(*) AS cnt FROM public.support_tickets GROUP BY category) c),
      'by_status',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', status, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
           FROM (SELECT status, count(*) AS cnt FROM public.support_tickets GROUP BY status) s),
      'by_priority',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', priority, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
           FROM (SELECT priority, count(*) AS cnt FROM public.support_tickets GROUP BY priority) p),
      'monthly_tickets',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('month', month, 'count', cnt) ORDER BY month), '[]'::jsonb)
           FROM (SELECT to_char(created_at, 'YYYY-MM') AS month, count(*) AS cnt
                 FROM public.support_tickets GROUP BY month ORDER BY month DESC LIMIT 12) m),
      'staff_performance',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'staff_id', assigned_staff_id,
             'total', total_cnt,
             'resolved', resolved_cnt) ORDER BY resolved_cnt DESC), '[]'::jsonb)
           FROM (
             SELECT assigned_staff_id,
                    count(*) AS total_cnt,
                    count(*) FILTER (WHERE status IN ('Resolved', 'Closed')) AS resolved_cnt
             FROM public.support_tickets
             WHERE assigned_staff_id IS NOT NULL
             GROUP BY assigned_staff_id
           ) sp)
    ) INTO v_result;
  ELSIF public.is_staff(v_user_id) THEN
    SELECT jsonb_build_object(
      'total_tickets',
        (SELECT count(*) FROM public.support_tickets WHERE assigned_staff_id = v_user_id),
      'open_tickets',
        (SELECT count(*) FROM public.support_tickets WHERE assigned_staff_id = v_user_id AND status NOT IN ('Resolved', 'Closed')),
      'resolved_today',
        (SELECT count(*) FROM public.support_tickets WHERE assigned_staff_id = v_user_id AND resolved_at::date = CURRENT_DATE),
      'avg_resolution_hours',
        (SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 1), 0)
           FROM public.support_tickets WHERE assigned_staff_id = v_user_id AND resolved_at IS NOT NULL),
      'critical_tickets',
        (SELECT count(*) FROM public.support_tickets WHERE assigned_staff_id = v_user_id AND priority = 'Critical' AND status NOT IN ('Resolved', 'Closed')),
      'by_status',
        (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', status, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
           FROM (SELECT status, count(*) AS cnt FROM public.support_tickets WHERE assigned_staff_id = v_user_id GROUP BY status) s)
    ) INTO v_result;
  ELSE
    RETURN jsonb_build_object('error', 'Not authorized.');
  END IF;

  RETURN v_result;
END;
$fn$;

