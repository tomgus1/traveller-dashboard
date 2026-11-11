-- Checks for migration 10, run after 24-tests-09.sql in the same database.
-- Alice and Bob are campaign members, Mallory belongs to no campaign.
TRUNCATE t.results;

-- Whether a statement fails, run as the database owner (its effects are
-- rolled back either way).
CREATE OR REPLACE FUNCTION t.raises(q TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE q;
  EXCEPTION WHEN OTHERS THEN
    RETURN TRUE;
  END;
  RAISE EXCEPTION 'no error' USING ERRCODE = 'P0001';
EXCEPTION WHEN SQLSTATE 'P0001' THEN
  RETURN FALSE;
END;
$$;

\set A '''a0000000-0000-0000-0000-000000000001'''
\set B '''b0000000-0000-0000-0000-000000000002'''
\set M '''d0000000-0000-0000-0000-000000000004'''

-- Loading (as the database owner, as in the SQL editor).
SELECT t.assert('loads a book',
  public.load_catalogue($json${"book":"test","title":"Test","items":[
    {"id":"test/autopistol-tl5","book":"test","page":125,"section":"Weapons","kind":"weapon","name":"Autopistol","tl":5,"cost":200,"kg":1.0,
     "weapon":{"range":"10","damage":"3D-3","magazine":15,"magazine_cost":10,"traits":[]},"columns":{}},
    {"id":"test/mesh-tl6","book":"test","page":99,"section":"Armour","kind":"armour","name":"Mesh","tl":6,"cost":150,"kg":2.0,
     "armour":{"protection":"+2","rad":null,"required_skill":""},"columns":{}},
    {"id":"test/old-tl1","book":"test","page":1,"section":"Gear","kind":"gear","name":"Old","tl":1,"cost":null,"kg":null,"columns":{}}
  ]}$json$::jsonb) = 3);
SELECT t.assert('…with columns filled from the item',
  (SELECT name = 'Autopistol' AND kind = 'weapon' AND tl = 5 AND cost = 200 AND page = 125
          AND item->'weapon'->>'damage' = '3D-3'
   FROM public.catalogue_items WHERE id = 'test/autopistol-tl5'));

-- (Each check reads in its own statement, after the load's.)
SELECT t.assert('reloading a book',
  public.load_catalogue($json${"book":"test","items":[
    {"id":"test/autopistol-tl5","page":125,"kind":"weapon","name":"Autopistol","tl":5,"cost":250,"columns":{}},
    {"id":"test/mesh-tl6","page":99,"kind":"armour","name":"Mesh","tl":6,"cost":150,"columns":{}}
  ]}$json$::jsonb) = 2);
SELECT t.assert('…updates its items',
  (SELECT cost = 250 FROM public.catalogue_items WHERE id = 'test/autopistol-tl5'));
SELECT t.assert('…and drops what it no longer has',
  NOT EXISTS (SELECT 1 FROM public.catalogue_items WHERE id = 'test/old-tl1'));

SELECT public.load_catalogue('{"book":"other","items":[{"id":"other/x","kind":"gear","name":"X","columns":{}}]}'::jsonb);
SELECT public.load_catalogue('{"book":"test","items":[{"id":"test/mesh-tl6","kind":"armour","name":"Mesh","columns":{}}]}'::jsonb);
SELECT t.assert('other books are left alone',
  EXISTS (SELECT 1 FROM public.catalogue_items WHERE id = 'other/x')
  AND (SELECT count(*) = 1 FROM public.catalogue_items WHERE book = 'test'));

SELECT t.assert('rejects what is not a catalogue',
  t.raises('SELECT public.load_catalogue(''{"items":[]}'')'));
SELECT t.assert('rejects unknown kinds',
  t.raises('SELECT public.load_catalogue(''{"book":"bad","items":[{"id":"bad/x","kind":"starship","name":"X"}]}'')'));
SELECT t.assert('a good load is not an error',
  NOT t.raises('SELECT public.load_catalogue(''{"book":"empty","items":[]}'')'));

-- Reading.
SELECT t.check('member reads the catalogue', :B, 'SELECT 1 FROM public.catalogue_items', 'rows=2');
SELECT t.check('referee reads it too', :A, 'SELECT 1 FROM public.catalogue_items WHERE kind = ''armour''', 'rows=1');
SELECT t.check('someone in no campaign reads nothing', :M, 'SELECT 1 FROM public.catalogue_items', 'rows=0');
SELECT t.check('anon cannot read', NULL, 'SELECT 1 FROM public.catalogue_items', 'error');

-- Nobody writes through the API.
SELECT t.check('members cannot load', :A,
  'SELECT public.load_catalogue(''{"book":"x","items":[]}'')', 'error');
SELECT t.check('members cannot insert', :B,
  'INSERT INTO public.catalogue_items (id, book, kind, name, item) VALUES (''x'', ''x'', ''gear'', ''X'', ''{}'') RETURNING 1', 'error');
SELECT t.check('members cannot edit', :B,
  'UPDATE public.catalogue_items SET cost = 1 RETURNING 1', 'error');
SELECT t.check('members cannot delete', :A,
  'DELETE FROM public.catalogue_items RETURNING 1', 'error');

SELECT n, CASE WHEN pass THEN 'PASS' ELSE 'FAIL' END AS result, label, detail FROM t.results ORDER BY n;
