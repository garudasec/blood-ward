# BloodWard

BloodWard is a full-stack blood donation and emergency response platform connecting donors and recipients. The application facilitates real-time emergency requests, location-aware donor matching, and medical compatibility verification to assist during critical blood search scenarios.

## Features

- Donor and recipient registration/login
- Role-based access control
- Donor profile and availability management
- Blood donor search by blood group and location/radius
- Blood compatibility-based matching
- Blood request creation and lifecycle tracking
- Emergency/real-time notifications using Socket.IO
- Location-aware donor matching with privacy-conscious location handling
- Admin dashboard, user/request management, and audit logs
- Dark/light theme
- Security measures such as password hashing, JWT authentication with HttpOnly cookies, validation, rate limiting, Helmet, and protected routes

## Tech Stack

### Frontend
- React
- Vite
- React Router
- Tailwind CSS
- Axios
- Socket.IO Client
- Leaflet / OpenStreetMap

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT
- bcrypt

## User Roles

- Donor — manages profile/availability and responds to compatible blood requests.
- Recipient — searches for donors and creates/tracks blood requests.
- Admin — manages users, requests, and audit activity.

## Project Structure

```
client/   → React frontend
server/   → Node.js/Express backend
```

## Getting Started

1. Clone the repository.
2. Install dependencies in client and server.
3. Configure environment variables using the provided `.env.example` files.
4. Start the backend and frontend.

## Note

BloodWard is an academic/student full-stack project focused on demonstrating a functional blood donation platform with security, role-based workflows, location-aware matching, and real-time communication.