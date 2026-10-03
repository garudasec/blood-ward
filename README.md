# BloodWard

BloodWard is a full-stack blood donation and emergency response platform connecting donors and recipients. The platform supports blood-request creation, real-time notifications, location-aware donor matching, and blood-group compatibility logic. It provides a secure, role-based ecosystem to streamline emergency blood requests and donor management.

## Features

- **Donor and Recipient Authentication**: Secure registration and login flows with role-specific profile setups.
- **Role-Based Access Control (RBAC)**: Multi-tiered access policies separating Donor, Recipient, and Admin capabilities.
- **Donor Profile & Availability Management**: Donors can update profiles, geographic locations, and toggle real-time donation availability.
- **Blood-Group & Radius Search**: Location-aware search enabling recipients to filter active donors by blood type and distance radius.
- **Blood-Group Compatibility Matching**: Automated matching logic based on standard blood group compatibility rules.
- **Blood Request Lifecycle Management**: Recipients can create emergency blood requests and track status transitions.
- **Real-Time Notifications**: Instant emergency alerts pushed to online compatible donors via Socket.IO.
- **Location Privacy**: Distance calculations and location matching handle coordinates securely without exposing precise raw addresses.
- **Admin Dashboard**: Centralized management interface for tracking users, blood requests, and overall platform statistics.
- **Audit Logs**: Dedicated admin logging for auditing user actions and security events.
- **Dark/Light Theme**: Persistent theme switching support built into the user interface.
- **Security Protections**: Rate limiting, HTTP security headers, NoSQL query sanitization, and HttpOnly cookie-based JWT sessions.

## User Roles

- **Donor**: Manages personal profile and availability status, receives real-time emergency requests, and responds to compatible donation calls.
- **Recipient**: Searches for compatible blood donors by location and blood group, creates emergency blood requests, and tracks request fulfillment.
- **Admin**: Oversees system management, reviews donor and recipient profiles, manages active requests, and monitors security audit logs.

## Tech Stack

### Frontend
- **Framework & Build**: React, Vite
- **Routing**: React Router DOM
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Backend
- **Runtime & Framework**: Node.js, Express.js

### Database
- **Database & ODM**: MongoDB, Mongoose

### Real-Time Communication
- **WebSockets**: Socket.IO, Socket.IO Client

### Maps & Location
- **Mapping**: Leaflet, React-Leaflet, OpenStreetMap

### Authentication & Security
- **Authentication**: JSON Web Tokens (JWT) with HttpOnly cookies
- **Password Hashing**: bcryptjs
- **Security Middleware**: Helmet, express-rate-limit, express-mongo-sanitize, CORS

## Project Structure

```
blood-ward/
├── client/
│   ├── public/
│   └── src/
│       ├── assets/
│       ├── components/    # Admin, Donor, Recipient, Common, and Map components
│       ├── constants/     # Theme and location data
│       ├── context/       # Auth and Theme context providers
│       ├── layouts/       # Role-specific and public page layouts
│       ├── pages/         # Page components for all roles
│       ├── routes/        # Protected and role-based route guards
│       └── services/      # Axios API instances and Socket.IO connection handlers
└── server/
    └── src/
        ├── config/        # DB connection and admin bootstrap configuration
        ├── controllers/   # Auth, Donor, Blood Request, and Admin controllers
        ├── middleware/    # Auth, RBAC, Rate Limiting, Sanitization, Error handlers
        ├── models/        # User, BloodRequest, and AuditLog Mongoose schemas
        ├── routes/        # Express API endpoints
        ├── tests/         # Automated integration and unit test runners
        └── utils/         # Blood compatibility matrix, geocoding, and sanitizers
```

## Getting Started

### Prerequisites
- Node.js
- MongoDB instance (local or MongoDB Atlas)

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/blood-ward.git
   cd blood-ward
   ```

2. **Install backend dependencies**:
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**:
   ```bash
   cd ../client
   npm install
   ```

4. **Configure environment variables**:
   Create a `.env` file inside the `server/` directory using `server/.env.example` as a reference.

5. **Start the backend server**:
   ```bash
   cd server
   npm run dev
   ```

6. **Start the frontend development server**:
   ```bash
   cd client
   npm run dev
   ```

## Environment Variables

The backend relies on environment variables configured in `server/.env`. Use `server/.env.example` as a reference template to configure settings such as `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and initial admin bootstrap credentials.

## Testing

The backend includes automated test suites located in `server/src/tests/`. Run them from the `server/` directory using the following npm scripts:

- **Run all test suites**:
  ```bash
  npm test
  ```
- **Run RBAC authorization tests**:
  ```bash
  npm run test:rbac
  ```
- **Run full integration tests**:
  ```bash
  npm run test:integration
  ```
- **Run admin bootstrap tests**:
  ```bash
  npm run test:admin
  ```

## Security

BloodWard implements multiple layers of application security:

- **Password Hashing**: Passwords stored using `bcryptjs`.
- **JWT Authentication**: Issued via secure `HttpOnly` cookies.
- **Role-Based Access Control**: Strict middleware verifying user roles before serving protected endpoints.
- **HTTP Headers Security**: `Helmet` middleware enforcing secure HTTP headers.
- **Rate Limiting**: `express-rate-limit` protecting API endpoints against brute force attempts.
- **NoSQL Injection Defense**: `express-mongo-sanitize` stripping malicious operator keys from incoming requests.
- **Input Validation**: Dedicated sanitizers and validators filtering user input.
- **CORS Protection**: Restricted origin configuration for cross-origin requests.
- **Audit Logging**: Sensitive administrative actions and system events recorded in audit log records.
- **Privacy-Conscious Location Handling**: Distance computations performed on spatial data while preserving location privacy.

## Important Notes

- An active MongoDB connection is required for backend API routes to function.
- Admin account credentials can be bootstrapped on startup if configured via `.env` variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_BOOTSTRAP_RESET`).
- Real-time emergency notifications require the Socket.IO connection between client and server to be active.

## Final Project Note

BloodWard is a full-stack academic project implementation focused on connecting blood donors and recipients through secure request, matching, and real-time notification workflows.