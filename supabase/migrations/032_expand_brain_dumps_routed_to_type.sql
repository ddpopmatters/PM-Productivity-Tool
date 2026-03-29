-- Expand routed_to_type check constraint to include all routing destinations
-- The original constraint only allowed: workstream_task, parking_lot, archive
-- The expanded Brain Dump Inbox now routes to: project, task, workstream,
-- workstream_task, todo, whiteboard, parking_lot, archive

ALTER TABLE brain_dumps
  DROP CONSTRAINT IF EXISTS brain_dumps_routed_to_type_check,
  ADD CONSTRAINT brain_dumps_routed_to_type_check
    CHECK (routed_to_type IN (
      'project', 'task', 'workstream', 'workstream_task',
      'todo', 'whiteboard', 'parking_lot', 'archive'
    ));
