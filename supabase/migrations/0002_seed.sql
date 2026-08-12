-- Éloquence — jeu de données initial (thèmes + 6 scénarios de conversation)

insert into themes (id, titre, description) values
  ('11111111-1111-1111-1111-111111111111', 'Travail & carrière', 'Entretiens, négociations, prises de parole professionnelles'),
  ('22222222-2222-2222-2222-222222222222', 'Vie quotidienne', 'Désaccords, situations sociales, imprévus du quotidien'),
  ('33333333-3333-3333-3333-333333333333', 'Prise de parole publique', 'Discours, présentations, cérémonies')
on conflict (id) do nothing;

insert into scenarios (id, theme_id, titre, role_ia, sujet, criteres_evalues, niveau_min) values
  (
    'a1111111-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Entretien d''embauche',
    'un recruteur exigeant mais juste, qui évalue un candidat pour un poste à responsabilités',
    'Entretien pour un poste de responsable de projet',
    '["clarte", "structure_argumentaire", "confiance", "gestion_du_stress"]',
    1
  ),
  (
    'a1111111-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Négociation salariale',
    'un manager qui doit défendre son budget et pousse à la négociation',
    'Demande d''augmentation après une année de forte performance',
    '["argumentation", "assertivite", "ecoute", "gestion_du_desaccord"]',
    1
  ),
  (
    'a2222222-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    'Désaccord avec un proche',
    'un ami proche qui n''est pas d''accord et défend fermement son point de vue',
    'Désaccord sur un projet de voyage commun',
    '["clarte", "empathie", "gestion_du_desaccord", "controle_emotionnel"]',
    1
  ),
  (
    'a2222222-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'Réclamation service client',
    'un agent du service client qui applique strictement la procédure',
    'Contestation d''une facturation erronée',
    '["clarte", "assertivite", "patience", "structure_argumentaire"]',
    1
  ),
  (
    'a3333333-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'Discours de cérémonie',
    'un public de cérémonie (mariage, remise de diplôme) attentif et bienveillant',
    'Discours pour un événement familial ou amical important',
    '["structure_argumentaire", "emotion", "fluidite", "impact"]',
    1
  ),
  (
    'a3333333-0000-0000-0000-000000000002',
    '33333333-3333-3333-3333-333333333333',
    'Présentation publique',
    'un auditoire professionnel exigeant qui pose des questions pointues',
    'Présentation d''un projet devant un comité de direction',
    '["clarte", "structure_argumentaire", "gestion_du_stress", "impact"]',
    2
  )
on conflict (id) do nothing;
