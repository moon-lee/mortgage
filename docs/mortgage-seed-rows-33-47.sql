-- Mortgage seed: Tax Brackets_2025_2026.xlsx / Mortgage sheet
-- Loan: A1:C9 (C1/C2/C3/C4/C7). Rates: E1:F8 (effective_to chained day-before-next).
-- Repayments: rows 33-47 cols A-L. Offsets: rows 33-47 cols M-T (keys from row 13).
-- Generated 2026-09-12. FY labels assume core.financialYear.start = 07-01.
-- Snapshots are point-in-time: rows 37 (2025-08-01) and 38 (2025-08-29) share
-- calendar month 2025-08 and both are kept. Uniqueness is the exact entry_date;
-- derived reads lean on the latest date.
BEGIN TRANSACTION;

-- 1. mortgage_loans (singleton setup + targets; P&I C8 and extra C9 are derived, not stored)
INSERT INTO mortgage_loans (property_value, deposit_amount, loan_amount, term_years, set_payment, target_amount_offset, target_amount_subtotal, notes) VALUES (687500, 45000, 642500, 30, 4200, 100000, 100000, NULL);

-- 2. mortgage_rate_history (8 rows; rate as decimal; last row open-ended)
INSERT INTO mortgage_rate_history (effective_from, effective_to, rate, notes) VALUES ('2023-10-18', '2023-11-16', 0.0594, NULL);
INSERT INTO mortgage_rate_history (effective_from, effective_to, rate, notes) VALUES ('2023-11-17', '2025-03-16', 0.0619, NULL);
INSERT INTO mortgage_rate_history (effective_from, effective_to, rate, notes) VALUES ('2025-03-17', '2025-05-29', 0.0594, NULL);
INSERT INTO mortgage_rate_history (effective_from, effective_to, rate, notes) VALUES ('2025-05-30', '2025-08-24', 0.0569, NULL);
INSERT INTO mortgage_rate_history (effective_from, effective_to, rate, notes) VALUES ('2025-08-25', '2026-02-12', 0.0544, NULL);
INSERT INTO mortgage_rate_history (effective_from, effective_to, rate, notes) VALUES ('2026-02-13', '2026-03-26', 0.0569, NULL);
INSERT INTO mortgage_rate_history (effective_from, effective_to, rate, notes) VALUES ('2026-03-27', '2026-05-04', 0.0594, NULL);
INSERT INTO mortgage_rate_history (effective_from, effective_to, rate, notes) VALUES ('2026-05-05', NULL, 0.0619, NULL);

-- 3. mortgage_accounts (lookup, 8 rows)
INSERT INTO mortgage_accounts (account_key, label, sort_order, is_active) VALUES ('0390', 'Offset', 1, 1);
INSERT INTO mortgage_accounts (account_key, label, sort_order, is_active) VALUES ('3564', 'My Trans', 2, 1);
INSERT INTO mortgage_accounts (account_key, label, sort_order, is_active) VALUES ('5272', 'Emergency', 3, 1);
INSERT INTO mortgage_accounts (account_key, label, sort_order, is_active) VALUES ('3545', 'Car', 4, 1);
INSERT INTO mortgage_accounts (account_key, label, sort_order, is_active) VALUES ('9722', 'Emergency 2', 5, 1);
INSERT INTO mortgage_accounts (account_key, label, sort_order, is_active) VALUES ('8107', 'Solar', 6, 1);
INSERT INTO mortgage_accounts (account_key, label, sort_order, is_active) VALUES ('4323', 'Investment', 7, 1);
INSERT INTO mortgage_accounts (account_key, label, sort_order, is_active) VALUES ('0743', 'My Childs', 8, 1);

-- 4. mortgage_repayments (15 rows; id/created_at/updated_at auto-managed)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-03-01', '2024-2025', 631055.78, 626381.77, 28035.67, 1302.25, 1169.32, 976.68, 2922.68, 3899.36, 8, 3907.36, 192.64); -- sheet row 33 (SubTotal=8743 Total=47979.9)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-04-30', '2024-2025', 629964.46, 625097.81, 30843.71, 1542.31, 1283.96, 1091.32, 2808.04, 3899.36, 8, 3907.36, 192.64); -- sheet row 34 (SubTotal=9870 Total=50555.37)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-05-30', '2024-2025', 628825.54, 623766.25, 33604.15, 1823.71, 1331.56, 1138.92, 2760.44, 3899.36, 8, 3907.36, 192.64); -- sheet row 35 (SubTotal=17800 Total=60435.8)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-06-30', '2024-2025', 627631.29, 622379.36, 36309.26, 2133.91, 1386.89, 1194.25, 2705.11, 3899.36, 8, 3907.36, 192.64); -- sheet row 36 (SubTotal=17850 Total=62365.8)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-08-01', '2025-2026', 626415.86, 620971.29, 2683.93, 314.19, 1408.07, 1215.43, 2683.93, 3899.36, 8, 3907.36, 192.64); -- sheet row 37 (SubTotal=19000 Total=66541.7)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-08-29', '2025-2026', 624975.37, 619338.16, 5142.8, 626.29, 1633.13, 1440.49, 2458.87, 3899.36, 8, 3907.36, 192.64); -- sheet row 38 (SubTotal=22400 Total=70229.82)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-09-30', '2025-2026', 623650.95, 617721.1, 7717.74, 1007.5, 1617.06, 1324.42, 2574.94, 3899.36, 8, 3907.36, 292.64); -- sheet row 39 (SubTotal=25734.71 Total=74499.83)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-10-31', '2025-2026', 622224.3, 616001.81, 10190.45, 1367.08, 1719.29, 1426.65, 2472.71, 3899.36, 8, 3907.36, 292.64); -- sheet row 40 (SubTotal=27771.19 Total=78318.32)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-11-28', '2025-2026', 620538.61, 614023.48, 12404.12, 1717.19, 1978.33, 1685.69, 2213.67, 3899.36, 8, 3907.36, 292.64); -- sheet row 41 (SubTotal=29297.18 Total=80728.19)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2025-12-31', '2025-2026', 619223.19, 612415.42, 14988.06, 2143.22, 1608.06, 1315.42, 2583.94, 3899.36, 8, 3907.36, 292.64); -- sheet row 42 (SubTotal=31331.29 Total=85782.3)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2026-01-30', '2025-2026', 617660.89, 610560.48, 17325.12, 2535.01, 1854.94, 1562.3, 2337.06, 3899.36, 8, 3907.36, 292.64); -- sheet row 43 (SubTotal=30518.66 Total=85846.64)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2026-02-27', '2025-2026', 615987.4, 608594.35, 19550.99, 2908.45, 1966.13, 1673.49, 2225.87, 3899.36, 8, 3907.36, 292.64); -- sheet row 44 (SubTotal=32510.88 Total=86729.65)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2026-03-30', '2025-2026', 614679.53, 606993.84, 22142.48, 3359.66, 1600.51, 1307.87, 2591.49, 3899.36, 8, 3907.36, 292.64); -- sheet row 45 (SubTotal=34629.57 Total=90368.34)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2026-04-30', '2025-2026', 613296.58, 605318.25, 24658.89, 3810.77, 1675.59, 1382.95, 2516.41, 3899.36, 8, 3907.36, 292.64); -- sheet row 46 (SubTotal=35600.64 Total=88484.68)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2026-05-29', '2025-2026', 611869.27, 603598.3, 27130.94, 4229.25, 1719.95, 1427.31, 2472.05, 3899.36, 8, 3907.36, 292.64); -- sheet row 47 (SubTotal=38087.62 Total=90593.69)

-- 5. mortgage_offset_balances (120 rows, ids resolved by subselect)
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-03-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 39236.9);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-03-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-03-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 8743);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-03-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-03-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-03-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-03-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-03-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 40685.37);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 8870);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1000);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-05-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 42635.8);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-05-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-05-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 10390);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-05-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1200);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-05-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 4000);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-05-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 2210);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-05-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-05-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 44515.8);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 9400);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1450);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 4500);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 2500);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 47541.7);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 9600);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1650);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 4900);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 2700);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 150);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-01'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 47829.82);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 9800);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1850);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 5300);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 2900);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 650);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-08-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 1900);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-09-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 48765.12);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-09-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 244.71);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-09-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 12410);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-09-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 920);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-09-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 6160);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-09-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 3150);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-09-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 500);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-09-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 2350);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-10-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 50547.13);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-10-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 271.19);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-10-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 13310);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-10-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1040);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-10-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 6600);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-10-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 3350);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-10-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 700);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-10-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 2500);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-11-28'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 51431.01);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-11-28'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 397.18);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-11-28'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 14300);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-11-28'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1200);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-11-28'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 6350);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-11-28'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 3550);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-11-28'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 900);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-11-28'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 2600);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-12-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 54451.01);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-12-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 291.29);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-12-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 15450);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-12-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1440);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-12-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 6850);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-12-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 3800);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-12-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 1150);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2025-12-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 2350);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-01-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 55327.98);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-01-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 78.66);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-01-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 16050);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-01-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1540);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-01-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 7300);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-01-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 4000);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-01-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 1150);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-01-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 400);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-02-27'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 54218.77);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-02-27'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 140.88);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-02-27'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 24350);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-02-27'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1620);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-02-27'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 200);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-02-27'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 4200);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-02-27'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 1350);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-02-27'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 650);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-03-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 55738.77);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-03-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 311.57);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-03-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 25600);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-03-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1720);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-03-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 400);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-03-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 4450);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-03-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 1200);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-03-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 948);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 52884.04);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 250.64);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 26600);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1800);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 0);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 4650);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 1100);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-04-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 1200);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-05-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 52506.07);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-05-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 257.62);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-05-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 27600);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-05-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1880);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-05-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 1000);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-05-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 4850);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-05-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 1300);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-05-29'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 1200);

-- 6. Jun–Aug 2026 top-up (user-supplied, verified against sheet formulas 2026-09-12)
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2026-06-30', '2025-2026', 610731.73, 602168.12, 29892.76, 4732.38, 1430.18, 1137.54, 2761.82, 3899.36, 8, 3907.36, 292.64); -- SubTotal=38521.56 Total=92747.63
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2026-07-31', '2026-2027', 609482.76, 600626.51, 2650.39, 488.06, 1541.61, 1248.97, 2650.39, 3899.36, 8, 3907.36, 292.64); -- SubTotal=40386.33 Total=97058.82
INSERT INTO mortgage_repayments (entry_date, finance_year, scheduled_balance, actual_balance, fy_interest, offset_saving_fy, actual_repayment, scheduled_payment, interest_charged, base_amount, fee, total_paid, extra_paid)
VALUES ('2026-08-31', '2026-2027', 608196.03, 599047.14, 5259.02, 1027.1, 1579.37, 1286.73, 2608.63, 3895.36, 12, 3907.36, 292.64); -- SubTotal=42760.77 Total=98759.17
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 54226.07);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 241.56);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 28850);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 1980);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 1000);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 5100);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 150);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-06-30'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 1200);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-07-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 56672.49);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-07-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 576.33);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-07-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 29850);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-07-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 2060);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-07-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 1040);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-07-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 5300);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-07-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 350);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-07-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 1210);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-08-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '0390'), 55998.4);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-08-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '3564'), 689.77);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-08-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '5272'), 31100);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-08-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '3545'), 2160);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-08-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '9722'), 1248);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-08-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '8107'), 5550);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-08-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '4323'), 753);
INSERT INTO mortgage_offset_balances (repayment_id, account_id, balance) VALUES ((SELECT id FROM mortgage_repayments WHERE entry_date = '2026-08-31'), (SELECT id FROM mortgage_accounts WHERE account_key = '0743'), 1260);

COMMIT;
