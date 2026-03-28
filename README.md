# Combien — Documentation technique complète

> **La référence des prix réels en Afrique**
> Application de comparaison de prix communautaire — Abidjan, Côte d'Ivoire

---

## 🚀 Démo live

**https://combien-app.vercel.app**

---

## 📋 Description du produit

**Combien** permet aux utilisateurs de :
- Voir les vrais prix des services et produits à Abidjan avant de payer
- Comparer par quartier (Yopougon, Cocody, Abobo, etc.)
- Contribuer en partageant les prix qu'ils ont payés
- Recevoir un score intelligent (Bon prix / Normal / Cher / Arnaque)
- Partager sur WhatsApp avec un message viral automatique

---

## ⚙️ Stack technique

| Technologie | Usage |
|-------------|-------|
| React 18 + Vite | Frontend |
| Firebase Firestore | Base de données temps réel |
| Vercel | Hébergement & déploiement |
| localStorage | Favoris persistants + anti-spam |

---

## 📁 Structure du projet

```
combien/
├── src/
│   ├── App.jsx          ← Application complète (tout-en-un)
│   ├── firebase.js      ← Configuration Firebase
│   └── main.jsx         ← Point d'entrée React
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

---

## 🔧 Installation & lancement

### 1. Prérequis
- Node.js 18+
- Un compte Firebase (gratuit)
- Un compte Vercel (gratuit)

### 2. Installation locale

```bash
git clone [votre-repo]
cd combien
npm install
npm run dev
```

### 3. Configuration Firebase

Dans `src/firebase.js`, remplacez la configuration :

```javascript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet",
  storageBucket: "votre-projet.firebasestorage.app",
  messagingSenderId: "VOTRE_ID",
  appId: "VOTRE_APP_ID"
};
```

### 4. Règles Firestore

Dans Firebase Console → Firestore → Rules :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /prices/{document} {
      allow read: if true;
      allow write: if request.resource.data.price is number
                   && request.resource.data.price > 0
                   && request.resource.data.price < 10000000
                   && request.resource.data.zone is string
                   && request.resource.data.service is string;
    }
  }
}
```

### 5. Déploiement Vercel

```bash
npx vercel
```

---

## 🎨 Personnalisation rapide (< 2 heures)

### Changer la ville

Dans `src/App.jsx`, modifiez :

```javascript
const ZONES = ["Votre_Zone_1", "Votre_Zone_2", ...];
```

### Changer les catégories

```javascript
const CATEGORIES = [
  {id:"votre_cat", emoji:"🏷️", label:"Votre Catégorie", 
   color:"#FF6B9D", keys:["mot_clé_1", "mot_clé_2"]},
  ...
];
```

### Changer les produits marché

```javascript
const MARCHE_PRODUITS = [
  {name:"Votre Produit", unit:"kg", emoji:"🥦"},
  ...
];
```

### Changer le lien de partage WhatsApp

Cherchez `combien-app.vercel.app` et remplacez par votre URL.

### Changer les couleurs

```javascript
const C = {
  green: "#VOTRE_COULEUR",  // couleur principale
  ...
};
```

---

## 🧠 Logique des scores

Le système de score utilise la **médiane** (plus robuste que la moyenne) :

| Score | Condition | Message |
|-------|-----------|---------|
| 🏷️ Bon prix | prix ≤ médiane × 0.85 | "Tu as payé moins cher que X% des gens !" |
| ✓ Normal | prix ≤ médiane × 1.10 | "Prix dans la normale" |
| ▲ Cher | prix ≤ médiane × 1.30 | "Tu as payé X% de plus" |
| ⚠ Arnaque | prix > médiane × 1.30 | "Tu as payé plus cher que X% des gens !" |

---

## 🔒 Sécurité & qualité des données

### Anti-spam (côté client)
- **Device ID** unique par navigateur (localStorage)
- **Rate limiting** : max 10 contributions par heure par device

### Validation (côté Firestore)
- Prix obligatoirement un nombre > 0
- Zone et service obligatoires
- Règles Firestore pour rejeter les données malformées

### Qualité des données
- Normalisation des noms (synonymes → terme principal)
- Détection automatique de catégorie
- Avatars stables (hash de l'ID du document)

---

## 💰 Modèle de monétisation

### Phase 1 — Commerçants (immédiat)
Les commerçants paient pour :
- Badge "✓ Prix fiable" dans les résultats
- Apparaître dans la section "Commerçants vérifiés"
- **Prix suggéré** : 5 000 – 20 000 FCFA/mois

### Phase 2 — Publicité locale
- Annonces ciblées par quartier dans les résultats
- **Prix suggéré** : 2 000 – 10 000 FCFA/semaine

### Phase 3 — Data
- Vente d'insights aux fintech, ONG, études de marché
- **Prix suggéré** : sur devis

### Phase 4 — API
- Accès programmatique aux données de prix
- **Prix suggéré** : abonnement mensuel

---

## 📊 Structure Firestore

### Collection : `prices`

```javascript
{
  service: "Tresse simple",        // nom normalisé
  name: "Tresse simple",           // alias
  zone: "Yopougon",                // quartier
  price: 3000,                     // prix en FCFA
  type: "service",                 // "service" ou "produit"
  unit: null,                      // unité pour les produits (kg, litre...)
  category: "coiffure",            // catégorie détectée
  deviceId: "abc123",              // pour anti-spam
  createdAt: Timestamp,            // horodatage serveur
}
```

---

## 🌍 Extension à d'autres villes

Pour dupliquer pour une autre ville :

1. Créer un nouveau projet Firebase
2. Modifier `ZONES` avec les quartiers de la nouvelle ville
3. Modifier le lien de démo dans le partage WhatsApp
4. Déployer sur Vercel avec un nouveau domaine

**Temps estimé : 2-4 heures**

---

## 📱 Compatibilité

- ✅ Android (Chrome, Firefox)
- ✅ iOS (Safari, Chrome)
- ✅ Desktop (tous navigateurs)
- ✅ PWA-ready (installable)

---

## 📞 Support

Pour toute question technique :
- Email : priscaakoua00@gmail.com
- Support inclus pendant 30 jours après achat

---

## 📄 Licence

Licence commerciale — usage exclusif de l'acheteur.
Droit de modification, personnalisation et exploitation commerciale inclus.

---

*Combien — Construit avec ❤️ pour l'Afrique*
