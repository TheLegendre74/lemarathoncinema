-- Migration v27 : ajouter la policy SELECT manquante sur dance_scores
-- La migration v26 a supprimé "own" (qui couvrait SELECT) sans la recréer

CREATE POLICY "select_all" ON dance_scores FOR SELECT USING (true);
