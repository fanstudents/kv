-- Close historical step rows left open after their parent run reached a terminal status.
update public.agent_run_steps as step
set
  status = case run.status
    when 'success' then 'done'
    when 'failed' then 'failed'
    when 'cancelled' then 'skipped'
  end,
  ended_at = coalesce(step.ended_at, run.ended_at, now())
from public.agent_runs as run
where step.run_id = run.id
  and step.status in ('running', 'waiting')
  and run.status in ('success', 'failed', 'cancelled');
