-- Checks for migration 11, run after 25-tests-10.sql in the same database.
TRUNCATE t.results;

\set B '''b0000000-0000-0000-0000-000000000002'''

SELECT t.assert('loads trade goods',
  public.load_catalogue($json${"book":"trade","items":[
    {"id":"trade/trade-11-glowmoss","book":"trade","page":300,"section":"Trade","kind":"trade_good","name":"Glowmoss","tl":null,"cost":1234,"kg":null,
     "trade":{"d66":"11","availability":"Garden","tons":"3D x 2","purchase_dm":"Garden +1","sale_dm":"Poor +4","examples":"Invented"},"columns":{}}
  ]}$json$::jsonb) = 1);
SELECT t.assert('…with their base price per ton',
  (SELECT cost = 1234 AND kind = 'trade_good' FROM public.catalogue_items WHERE id = 'trade/trade-11-glowmoss'));
SELECT t.assert('still rejects unknown kinds',
  t.raises('SELECT public.load_catalogue(''{"book":"bad","items":[{"id":"bad/x","kind":"starship","name":"X"}]}'')'));
SELECT t.check('members read trade goods', :B,
  'SELECT 1 FROM public.catalogue_items WHERE kind = ''trade_good''', 'rows=1');

SELECT n, CASE WHEN pass THEN 'PASS' ELSE 'FAIL' END AS result, label, detail FROM t.results ORDER BY n;
