contexte du projet :@AGENTS.md
mon but est que ce projet soit collaboratif. Je veux qu'un utilisateur soit forcément une personne sur le graph.
Une personne peut se connecter uniquement si quelqu'un l'a ajouté sur le graph.
Le site doit avoir deux mode : utilisateur (hébergé) visibilité et droits restreindre, admin (en local) ayant plus de droits et accès à tout le graphe.

Chaques noeds et chaques relations doivent avoir un identifiant unique de 6 chiffres
Donc le chargement du graph pour les utilisateur ne doit pas charger les noms, les types de relations et les groupes.
chaque utilisateur aura un degré de visibilisté du graphe selon sa contribution et ses partages
si pas connecté / inscrit, le graph ne comporte ni nom ni les types des relations (couleurs), ni les groupes.
une fois connecté les informations apairaissent celon son niveau de visibilité :
niveau 1, que le nom des noeds voisins, niveau 2 : acceder au type de relation existantes entre lui et ses voisins. niveau 3 : accéder au nom des voisins de ses voisins...
l'attribution des niveau se fera dans une autre fois
je veux utiliseur une base de donnée sql tierce, (pas de fichier)
les propositions ne sont accessibles que par la personne qui les a fait et par l'adminitrateur
a tu d'autres question ?
Peux tu m'indiquer de manière synthétique les étapes pour faire la page de connection
n'hésite pas à me poser des questions pour élaborer le plan d'excution
ne fait pas de documentation pour l'instant

# 2

Identification des personnes sur le graphe se fait par l'id. Je veux que les relations puisse se faire a partir des noms  
Création du compte : la personne s’inscrit en choisissant le nœud qui la représente
Base SQL tierce : liens "user ↔ node_id 6 chiffres" et niveau de visibilité
pas de préférence pour la base de donnée tant qu'il y a un option gratuite
Page de connexion : une seule page au plus simple
Admin en local
as tu d'autres questions ?

# 3

Inscription et unicité du nœud : Premier inscrit = le nœud est "réservé" (un seul compte par nœud)
Choix du nœud à l’inscription : recherche par nom temporaire
Contenu de la base SQL : password_hash, person_node_id (6 chiffres), visibility_level, created_at
Relations "par nom" : oui je veux faire garder l'existant et faire un mapping
est ce que tu as d'autres questions ?
