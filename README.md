# <img src="frontend/public/eduverse-icon.svg" alt="EduVerse Logo" width="64" style="vertical-align:middle"/> EduVerse

> **Welcome to EduVerse** 🌍✨  
> Odkrywaj edukację w 3D i gamifikowanej przestrzeni interaktywnej – wszystko w jednym miejscu.

---

## 🚀 Explore & Learn

### 🎯 Co oferuje EduVerse?

| Feature                       | Opis                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| 🗺 **3D Map Exploration**      | Interaktywna mapa szkół i edukacyjnych przystanków w pełnej przestrzeni 3D |
| 📅 **Calendar & Tasks**       | Harmonogram wydarzeń, zadań i przypomnień w intuicyjnym widoku             |
| 🏫 **School Management**      | Administrowanie szkołami i EduStopami, dodawanie treści edukacyjnych       |
| 👤 **User System**            | Profile, rankingi, śledzenie postępów i osiągnięć                          |
| 💬 **Comments & Discussions** | Wymiana opinii i dyskusje przy materiałach edukacyjnych                    |

---

## 🎨 UI/UX Design

EduVerse to **immersyjne doświadczenie nauki w 3D**.  
Nasze UI zostało zaprojektowane tak, aby było **intuicyjne, nowoczesne i responsywne**:

### 🔹 Key Components

- **Dashboard** – centrum z szybkim podglądem zadań i kalendarza
- **3D Map Scene** – wizualizacja szkół i EduStopów w przestrzeni 3D (Three.js + MapLibre GL)
- **School Modal** – szczegółowe informacje o szkołach, komentarze, oceny
- **Calendar Timeline** – wizualny harmonogram wydarzeń
- **Navigation Bar** – prosty dostęp do profilu i wszystkich funkcji

### ✨ Experience Highlights

- **Responsywność 360°** – Desktop, tablet, mobile (Tailwind CSS)
- **Animacje jak w grze** – Framer Motion dla płynnych przejść
- **Grywalizacja** – rankingi, progres i osiągnięcia
- **Intuicyjne workflowy** – logowanie, eksploracja i interakcja w 3 kliknięciach

---

## 🎨 Design Principles

- **Immersive Learning** – 3D = nauka, którą zapamiętasz
- **User-Centric** – szybka nawigacja i jasne informacje
- **Performance-First** – szybkie ładowanie i płynne renderowanie
- **Inclusive & Cross-Device** – działa wszędzie, wygląda świetnie na każdym ekranie

---

## ⚡ Getting Started

1. **Zainstaluj zależności:**

   - Backend: `cd backend && npm install`
   - Frontend: `cd frontend && npm install`

2. **Uruchom bazy danych:**

   - W katalogu `backend/`: `docker-compose up -d` (uruchamia MongoDB i Redis)

3. **Uruchom aplikację:**

   - Backend: `cd backend && npm run start:dev`
   - Frontend: `cd frontend && npm run dev`

> [!NOTE]
> Dostępny jest tryb developera. Aby go włączyć, należy zmienić wartość właściwości „developer” w LocalStorage z false na true. W tym trybie można przetestować ustawienie niestandardowej lokalizacji i daty oraz umieścić nowe Edustopy.

---

## 🛠 Tech Stack

| Layer    | Technologies                                                 |
| -------- | ------------------------------------------------------------ |
| Backend  | Nest.js, TypeScript, JWT                                     |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Three.js, MapLibre GL |
| Database | MongoDB (dane), Redis (cache & sesje)                        |

---

> **Dive in, explore, learn, repeat.**  
> EduVerse – interaktywna edukacja w 3D.
