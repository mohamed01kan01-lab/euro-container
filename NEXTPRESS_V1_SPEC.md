# NextPress V1 — Spécification Complète

> Boilerplate Next.js e-commerce opinionné, production-ready. Clone → `.env` → `npm run dev` → boutique fonctionnelle.

---

## Stack Technique

| Couche | Technologie |
|---|---|
| Framework | Next.js (App Router) |
| Auth | Better Auth |
| Base de données | PostgreSQL + Prisma |
| Stockage médias | Cloudinary |
| Paiement | Stripe + FeexPay |
| Email | Resend |
| Traduction | DeepL API |
| Multilingue | next-intl |
| UI | shadcn/ui (thème bleu) |
| Icônes | Tabler Icons |
| Animations | GSAP / @gsap/react |
| Typographie | Outfit (Google Fonts) |

---

## 1. Auth & Utilisateurs

- Authentification complète via Better Auth
- Rôles : `admin`, `éditeur`, `client`
- Gestion des sessions
- Réinitialisation de mot de passe (email via Resend)
- Inscription client depuis la boutique

---

## 2. Site Settings

Modèle `SiteSettings` unique en base de données, configurable depuis le dashboard.

- Nom du site, logo, favicon
- Description et slogan
- Email de contact, téléphone, adresse
- URLs réseaux sociaux
- Devise par défaut (XOF, EUR, USD…)
- Langue par défaut
- Mode maintenance (boolean)
- SEO global : title par défaut, meta description par défaut
- IDs tracking : GTM, GA4, Meta Pixel, TikTok Pixel
- Clés server-side : Meta CAPI access token, Google Enhanced Conversions
- Clés DeepL API
- Clés Cloudinary
- Clés Stripe et FeexPay

---

## 3. Dashboard Admin

### 3.1 Tableau de bord (Home)

- KPI cards : commandes du jour, revenus du jour, nouveaux clients, posts publiés
- Variation % vs hier sur chaque KPI
- Graphique revenus 7 derniers jours (LineChart)
- Tableau des 5 dernières commandes avec badges statut
- Top 5 produits les plus vendus avec thumbnails
- Notification admin à chaque nouvelle commande

### 3.2 Gestion des Posts

- Liste tabulaire : titre, catégorie, statut, auteur, date, actions
- Statuts : `Brouillon`, `En révision`, `Publié`
- Workflow éditorial : brouillon → révision → publié
- Historique et révisions de contenu (restauration possible)
- Filtres : statut, catégorie, auteur, date
- Éditeur de post :
  - Champ titre large
  - Éditeur rich text
  - Panneau droit : statut workflow, catégories, tags, image à la une
  - Score SEO en temps réel (barre rouge → orange → vert)
  - Traductions DeepL par langue (bouton par langue disponible)
  - Preview mode (prévisualisation du draft en conditions réelles)

### 3.3 Médiathèque

- Upload vers Cloudinary (drag & drop)
- Galerie grid 4 colonnes avec thumbnails
- Génération automatique de tailles via Cloudinary transformations :
  - `thumbnail` : 150×150px
  - `medium` : 600×600px
  - `large` : 1200×1200px
- Sidebar contextuelle au clic sur un média :
  - Preview, nom, taille, dimensions
  - URLs des 3 tailles générées avec bouton copier
- Filtres : type (image, vidéo), date

### 3.4 Gestion des Produits

- Liste tabulaire : thumbnail, nom, prix, stock, catégorie, statut, actions
- Badges stock : `En stock` (vert), `Stock faible` (orange), `Rupture` (rouge)
- Filtres : catégorie, statut, stock
- Éditeur de produit :
  - Nom, description (rich text), galerie images
  - Variantes (taille, couleur, etc.)
  - Prix, prix promo
  - Stock et inventaire
  - Poids (pour calcul livraison)
  - MPN (référence fabricant), GTIN/EAN (code barre)
  - Condition : `new`, `used`, `refurbished`
  - Catégorie Google produit (ID taxonomie Google)
  - Catégories & tags
  - Statut workflow
  - Score SEO en temps réel
  - Traductions DeepL (nom, description, catégories, tags)
  - Preview mode
- Produits liés / suggestions (4 à 8 produits similaires)
- Ratings & reviews par produit (modération admin)

### 3.5 Commandes

- Liste tabulaire : #commande, client, montant, statut paiement, statut livraison, date
- Badges paiement : `Payé` (vert), `En attente` (orange), `Échoué` (rouge)
- Page détail commande :
  - Infos client
  - Produits commandés avec prix unitaires
  - Timeline statut livraison
  - Actions : rembourser, marquer expédié, noter

### 3.6 Coupons & Codes Promo

- Création, édition, suppression de coupons
- Types : pourcentage, montant fixe, livraison gratuite
- Conditions : montant minimum, produits spécifiques, catégories spécifiques
- Dates de validité, limite d'utilisation

### 3.7 Catégories & Tags

- Catégories hiérarchiques (parent/enfant) pour posts et produits
- Slug URL automatique
- Meta SEO par catégorie (title, description)
- Tags pour posts et produits
- Traduction automatique via DeepL

### 3.8 Commentaires

- Liste de tous les commentaires (posts)
- Modération : approuver, rejeter, supprimer
- Filtres : statut (en attente, approuvé, rejeté)

### 3.9 Avis & Ratings Produits

- Note 1 à 5 étoiles
- Commentaire texte
- Modération admin (approuver, rejeter)
- Affichage moyen et distribution des notes

### 3.10 Pages Statiques

Gestion des pages générées automatiquement :
- **HomePage** — page d'accueil (structure de base)
- **Blog** — liste des posts
- **Boutique** — catalogue produits
- **Politique de retours** — générée automatiquement, éditable
- **Livraison** — générée automatiquement, éditable
- **CGV** — générée automatiquement, éditable

### 3.11 Utilisateurs & Rôles

- Table utilisateurs : avatar, nom, email, rôle, date inscription, statut
- Badges rôles : `Admin` (bleu), `Éditeur` (violet), `Client` (gris)
- Édition du rôle depuis le dashboard

### 3.12 Webhooks

- Configuration depuis le dashboard
- Champs : URL de destination, event déclencheur, secret key
- Events disponibles :
  - `order.created` — nouvelle commande
  - `order.paid` — paiement confirmé
  - `order.shipped` — commande expédiée
  - `post.published` — nouveau post publié
  - `product.low_stock` — stock faible
- Envoi automatique d'un POST JSON sécurisé à chaque event
- Log des envois (statut HTTP, date, payload)

### 3.13 Traductions

- Interface de traduction depuis le dashboard
- Traduction automatique via DeepL API pour :
  - Posts (titre, contenu, extrait)
  - Produits (nom, description)
  - Catégories (nom, description, slug)
  - Tags (nom)
- Langues gérées via next-intl
- Hreflang automatique sur toutes les pages

### 3.14 Mode Maintenance

- Activation/désactivation depuis Site Settings
- Page maintenance personnalisable (logo, message)
- Bypass pour les admins connectés

---

## 4. SEO

### 4.1 Balises Meta Dynamiques

- `<title>` : max 60 caractères, unique par page, mot-clé + nom du site
- `<meta description>` : max 160 caractères, unique par page
- Open Graph : `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- Twitter Card : `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Canonical URL automatique sur chaque page
- `robots: index, follow` sur produits et catégories
- `robots: noindex` sur panier, checkout, compte client, admin
- Hreflang par langue sur toutes les pages

### 4.2 Structured Data JSON-LD

- **Product** sur chaque page produit : prix, disponibilité, marque, images, avis, MPN, GTIN
- **BreadcrumbList** sur toutes les pages
- **Organization** sur la page d'accueil : nom, logo, contacts
- **WebSite** sur la page d'accueil (active la barre de recherche Google)
- **Article** sur chaque post de blog
- **FAQPage** si applicable

### 4.3 Sitemap XML

- Généré automatiquement à chaque ajout/modification de contenu
- Segmenté : posts, produits, catégories séparés
- URL : `/sitemap.xml`
- Accessible et soumissible à Google Search Console

### 4.4 Robots.txt

- Configurable depuis Site Settings
- Bloque par défaut : `/admin/`, `/api/`, `/checkout/`, `/cart/`, `/account/`
- Autorise : pages produits, catégories, feed, sitemap

### 4.5 URLs

- Statiques et permanentes dès le lancement
- Zéro paramètres dynamiques (`?id=`)
- Slugs auto-générés depuis le titre, modifiables
- Slugs en langue du marché cible (selon next-intl)

### 4.6 Score SEO en Temps Réel (Dashboard)

- Analyse du titre (longueur, mot-clé)
- Analyse de la meta description (longueur, mot-clé)
- Densité mot-clé dans le contenu
- Présence de l'image à la une
- Longueur du contenu
- Score visuel : barre de progression rouge → orange → vert
- Suggestions d'amélioration contextuelles

### 4.7 Vue SEO Globale

- Score moyen du site
- Posts sans meta description
- Produits sans structured data
- Liste des pages avec score individuel
- Suggestions d'amélioration prioritaires

---

## 5. Google Merchant Center

- Flux produits XML généré automatiquement
- URL du flux : `/feed/google-shopping.xml`
- Mise à jour du flux à chaque modification de produit et à chaque commande (mise à jour du stock)
- Champs obligatoires dans le flux :
  - `g:id` — identifiant unique produit
  - `g:title` — marque + modèle + caractéristique
  - `g:description` — min 100 caractères, sans HTML
  - `g:link` — URL HTTPS complète de la page produit
  - `g:image_link` — HTTPS, min 800×800px
  - `g:price` — format `89.99 EUR`, identique au prix du site
  - `g:availability` — `in stock` / `out of stock` selon stock
  - `g:brand` — nom exact de la marque
  - `g:condition` — `new` / `used` / `refurbished`
  - `g:mpn` — référence fabricant
  - `g:gtin` — code barre EAN (recommandé)
  - `g:google_product_category` — ID taxonomie Google
  - `g:product_type` — hiérarchie personnalisée
  - `g:shipping` — frais de port par pays
  - `g:additional_image_link` — images supplémentaires
  - `g:sale_price` — prix promo si applicable
- Alerte email (Resend) si flux généré est vide
- Log de chaque génération (date, nombre de produits, erreurs)

---

## 6. Paiement

### 6.1 Stripe
- Paiement carte internationale
- Webhooks Stripe pour confirmation commande
- Remboursement depuis le dashboard

### 6.2 FeexPay
- Paiement mobile money (Afrique)
- Webhooks FeexPay pour confirmation commande

---

## 7. Marketing & Tracking

### 7.1 Client-Side

- **Google Tag Manager** : installé sur toutes les pages (head + body noscript)
- **Google Analytics 4** : Enhanced Ecommerce
  - Events : `view_item`, `view_item_list`, `add_to_cart`, `begin_checkout`, `purchase`, `search`
- **Meta Pixel** : `PageView`, `ViewContent`, `AddToCart`, `Purchase`
- **TikTok Pixel** : events e-commerce équivalents

### 7.2 Server-Side (Prioritaire)

- **Meta Conversions API (CAPI)** : envoi des events côté serveur via API Graph
  - Dédupliqué avec le Pixel client-side via `event_id`
  - Données first-party : email hashé, téléphone hashé, IP
- **Google Enhanced Conversions** : envoi des données de conversion côté serveur
  - Email hashé SHA-256 envoyé à Google Ads pour meilleure attribution

### 7.3 A/B Testing

- Via Next.js Middleware
- Configuration depuis le dashboard : URL à tester, variantes, répartition du trafic
- Report des résultats dans le dashboard

### 7.4 Preview Mode

- Prévisualisation des drafts (posts, produits) en conditions réelles
- Accès par lien sécurisé depuis le dashboard

---

## 8. Emails Transactionnels (Resend)

- Confirmation de commande (client)
- Notification nouvelle commande (admin)
- Confirmation d'expédition (client)
- Réinitialisation de mot de passe
- Alerte stock faible (admin)
- Alerte flux Google Merchant Center vide (admin)

---

## 9. Multilingue (next-intl + DeepL)

- next-intl pour la gestion des routes et traductions UI
- Traduction automatique via DeepL API pour le contenu dynamique :
  - Posts, produits, catégories, tags
- Hreflang automatique sur toutes les pages
- Devise et formats localisés selon la langue active

---

## 10. Import / Export

- Export CSV des posts
- Export CSV des produits
- Export CSV des commandes
- Export XML des produits (format WordPress)
- Import depuis WordPress (posts, produits, médias, catégories)

---

## 11. Recherche Interne

- Recherche globale depuis le header du dashboard (posts, produits, commandes)
- Recherche publique sur la boutique (produits)
- Filtres produits : catégorie, prix, couleur, taille, disponibilité

---

## 12. Performance (Core Web Vitals)

- **LCP < 2.5s** : Next.js Image, preload hero image, Cloudinary CDN
- **CLS < 0.1** : dimensions images définies, pas de contenu qui saute
- **INP < 200ms** : JS minimal, pas de librairies inutiles
- **TTFB < 600ms** : ISR sur pages produits/blog, cache Next.js
- Images converties en WebP automatiquement via Cloudinary
- Lazy loading natif sur toutes les images hors viewport
- CSS et JS minifiés (Next.js build)
- Prefetching Next.js Link

---

## 13. Pages Publiques de Base

- **HomePage** : hero section, produits en vedette, posts récents
- **Blog** : liste paginée des posts avec filtres catégories
- **Boutique** : catalogue produits avec filtres, tri, pagination

> Le dev modifie ces pages dans `/app` selon la documentation fournie.

---

## 14. Design System

- **UI** : shadcn/ui, thème bleu (`--primary: #2563EB`)
- **Typographie** : Outfit (Google Fonts) — bold titres, medium labels, regular body
- **Icônes** : Tabler Icons (`@tabler/icons-react`)
- **Animations** : GSAP / `@gsap/react`
  - Stagger d'entrée des cards KPI
  - Transitions de pages : fade + translation Y
  - Collapse sidebar : width transition fluide
  - Hover sidebar items : translation X légère
  - Toasts : slide-in depuis bas droit
- **Couleurs** :
  - Primaire : `#2563EB`
  - Fond sidebar : `#0F172A`
  - Fond général : `#F8FAFC`
  - Succès : `#22C55E`
  - Alerte : `#F97316`
  - Erreur : `#EF4444`
- **Style** : flat, minimal, épuré — whitespace généreux, cards blanches border-radius 12px

---

## 15. Structure Projet (App Router)

```
/app
  /(public)
    /page.tsx              ← HomePage
    /blog/page.tsx
    /shop/page.tsx
    /product/[slug]/page.tsx
    /post/[slug]/page.tsx
  /(admin)
    /dashboard/page.tsx
    /posts/page.tsx
    /posts/[id]/page.tsx
    /media/page.tsx
    /products/page.tsx
    /products/[id]/page.tsx
    /orders/page.tsx
    /orders/[id]/page.tsx
    /coupons/page.tsx
    /comments/page.tsx
    /reviews/page.tsx
    /users/page.tsx
    /seo/page.tsx
    /analytics/page.tsx
    /tracking/page.tsx
    /ab-testing/page.tsx
    /webhooks/page.tsx
    /translations/page.tsx
    /settings/page.tsx
/feed
  /google-shopping.xml     ← Flux GMC
/sitemap.xml
/robots.txt
```

---

*NextPress V1 — Document interne — Digital Innovation*
