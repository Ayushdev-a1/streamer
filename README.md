# MV-Live: Movie Watching Platform

MV-Live is a collaborative movie watching platform that allows users to create rooms, share movies, and watch together with synchronized playback.

## Live Demo

- Frontend: [https://mv-live.netlify.app](https://mv-live.netlify.app)
- Backend: [https://mv-live-backend.vercel.app](https://mv-live-backend.vercel.app)

## Features

- User authentication with Google
- Create and join rooms
- Upload and stream movies
- Real-time chat
- Video/audio communication with WebRTC
- Synchronized playback control
- Movie favorites and watch history
- User profiles

## Tech Stack

- **Frontend**: React, Socket.io-client, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io, MongoDB
- **Authentication**: Google OAuth
- **Deployment**: Vercel (backend), Netlify (frontend)

## Deployment Instructions

### Backend Deployment (Vercel)

1. Fork or clone the backend repository: [https://github.com/Ayushdev-a1/MV-Live-Backend-.git](https://github.com/Ayushdev-a1/MV-Live-Backend-.git)

2. Set up environment variables in Vercel:
   - PORT: 5000
   - NODE_ENV: production
   - MONGO_URI: Your MongoDB connection string
   - JWT_SECRET: Your JWT secret key
   - GOOGLE_CLIENT_ID: Your Google OAuth client ID
   - GOOGLE_CLIENT_SECRET: Your Google OAuth client secret
   - CLIENT_URL: https://mv-live.netlify.app
   - ORIGIN: https://mv-live.netlify.app
   - CORS_ORIGIN: https://mv-live.netlify.app

3. Deploy to Vercel:
   ```
   vercel
   ```

### Frontend Deployment (Netlify)

1. Fork or clone the frontend repository: [https://github.com/Ayushdev-a1/MV-Live-Frontend-.git](https://github.com/Ayushdev-a1/MV-Live-Frontend-.git)

2. Set up environment variable in Netlify:
   - VITE_API_ADDRESS: https://mv-live-backend.vercel.app

3. Deploy to Netlify:
   ```
   netlify deploy
   ```

## Local Development

### Backend Setup

1. Clone the repository:
   ```
   git clone https://github.com/Ayushdev-a1/MV-Live-Backend-.git
   ```

2. Install dependencies:
   ```
   cd MV-Live-Backend-
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   MONGO_URI=mongodb://localhost:27017/movie-stream
   JWT_SECRET=your_jwt_secret_key_here
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   CLIENT_URL=http://localhost:5173
   ORIGIN=http://localhost:5173
   ```

4. Start the development server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Clone the repository:
   ```
   git clone https://github.com/Ayushdev-a1/MV-Live-Frontend-.git
   ```

2. Install dependencies:
   ```
   cd MV-Live-Frontend-
   npm install
   ```

3. Create a `.env` file in the root directory with:
   ```
   VITE_API_ADDRESS=http://localhost:5000
   ```

4. Start the development server:
   ```
   npm run dev
   ```

## CORS and Authentication Notes

- The application uses both JWT token and Google ID for authentication
- Cross-origin requests require proper CORS configuration
- Cookies use SameSite=None and Secure attributes for cross-domain authentication

## Contributors

- [Ayushdev-a1](https://github.com/Ayushdev-a1) 
