# ToDo WebApp

Una moderna applicazione web per la gestione di liste e attività, costruita con React, TypeScript e Tailwind CSS.

![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite)

## Funzionalità Principali

### Gestione Liste
- **Creazione e modifica liste** con colori personalizzati (blu, verde, giallo, rosso, viola)
- **Organizzazione per categorie** - raggruppa le liste in categorie personalizzate
- **Ordinamento flessibile** - per data di creazione, alfabetico o per completamento
- **Swipe actions** - scorri a sinistra per eliminare, a destra per modificare

### Gestione ToDo
- **Aggiungi ToDo** con titolo, quantità e unità di misura opzionali
- **Drag & Drop** - riordina le todo trascinandole
- **Toggle completamento** - segna le attività come completate
- **Modifica inline** - modifica rapidamente qualsiasi todo
- **Spostamento tra liste** - sposta una todo da una lista all'altra
- **Eliminazione multipla** - seleziona e elimina più todo contemporaneamente

### Ricerca Avanzata
- **Ricerca globale nella Homepage** - cerca per nome lista o nome todo
- **Ricerca locale nella lista** - filtra le todo all'interno di una lista
- **Risultati evidenziati** - le todo trovate vengono mostrate con badge colorati
- **Debounce ottimizzato** - ricerca fluida senza rallentamenti

### Condivisione e Collaborazione
- **Condividi liste** con altri utenti
- **Condividi categorie** intere
- **Permessi granulari** - scegli se l'utente può solo visualizzare o anche modificare
- **Badge collaboratori** - visualizza chi ha creato o modificato ogni todo

### Sistema Sociale
- **Ricerca utenti** - trova altri utenti della piattaforma
- **Richieste di amicizia** - invia e gestisci richieste
- **Lista amici** - visualizza e gestisci i tuoi contatti

### Notifiche
- **Notifiche push** via Firebase Cloud Messaging
- **Centro notifiche** integrato nell'app
- **Badge non letti** - conta delle notifiche da leggere

### UI/UX
- **Dark Mode** - tema chiaro/scuro con persistenza
- **Design Glassmorphism** - interfaccia moderna con effetti vetro
- **Responsive Design** - ottimizzato per mobile, tablet e desktop
- **PWA Ready** - installabile come app nativa
- **Animazioni fluide** - transizioni GSAP per un'esperienza premium
- **Bottom Navigation** - navigazione mobile intuitiva

## Tech Stack

| Categoria | Tecnologia |
|-----------|------------|
| Framework | React 19 |
| Linguaggio | TypeScript 5.7 |
| Build Tool | Vite 6.3 |
| Styling | Tailwind CSS 3.4 |
| Animazioni | GSAP 3.12 |
| Drag & Drop | dnd-kit |
| Routing | React Router 7.5 |
| Icone | Lucide React |
| Notifiche | Firebase |
| State | React Context API |

## Installazione

```bash
# Clona il repository
git clone https://github.com/bale231/todowebapp-frontend-reactts.git

# Entra nella directory
cd todowebapp-frontend-reactts

# Installa le dipendenze
npm install --legacy-peer-deps

# Avvia il server di sviluppo
npm run dev
```

## Scripts Disponibili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Avvia il server di sviluppo |
| `npm run build` | Crea la build di produzione |
| `npm run preview` | Anteprima della build di produzione |
| `npm run lint` | Esegue il linting del codice |

## Struttura del Progetto

```
src/
├── api/                 # Layer API per comunicazione backend
│   ├── auth.ts         # Autenticazione JWT
│   ├── todos.ts        # CRUD liste e todo (con caching)
│   ├── sharing.ts      # Condivisione liste/categorie
│   ├── friends.ts      # Gestione amicizie
│   └── notifications.ts # Notifiche
├── components/          # Componenti React riutilizzabili
│   ├── SearchBar.tsx   # Barra di ricerca animata
│   ├── SwipeableTodoItem.tsx
│   ├── SwipeableListItem.tsx
│   ├── BottomNav.tsx   # Navigazione mobile
│   └── ...
├── pages/               # Pagine dell'applicazione
│   ├── Home.tsx        # Homepage con liste
│   ├── ToDoListPage.tsx # Pagina singola lista
│   ├── Login.tsx
│   ├── Profile.tsx
│   └── ...
├── context/             # React Context per stato globale
│   ├── ThemeContext.tsx
│   └── NotificationContext.tsx
├── hooks/               # Custom React Hooks
├── utils/               # Utility functions
│   └── apiCache.ts     # Sistema di caching API
└── firebase/            # Configurazione Firebase
```

## Ottimizzazioni Performance

- **API Caching** - Cache intelligente con TTL per ridurre le chiamate al backend
- **Request Deduplication** - Richieste identiche condividono la stessa Promise
- **Debounced Search** - Ricerca ottimizzata con delay di 300ms
- **Code Splitting** - Lazy loading per ottimizzare il bundle size

## Backend API

L'applicazione si connette a un backend Django REST Framework ospitato su PythonAnywhere.

**Base URL:** `https://bale231.pythonanywhere.com/api`

## Autore

**bale231**

## License

MIT License
