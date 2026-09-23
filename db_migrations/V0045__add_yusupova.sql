INSERT INTO staff (full_name, login, password_hash, role, group_name, pages, is_active)
VALUES ('Марина Юсупова', 'yusupova', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'employee', 'Сотрудники', ARRAY['cabinet'], TRUE);

INSERT INTO staff_plans (staff_id, daily_plan_rub, valid_from)
SELECT s.id, v.plan, v.vf FROM staff s JOIN (VALUES
 ('Марина Юсупова', 1300, DATE '2026-04-01'),
 ('Марина Юсупова', 1450, DATE '2026-06-01')
) AS v(fio, plan, vf) ON s.full_name = v.fio;