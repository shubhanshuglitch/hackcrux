# ER-Triage System

## Overview
This repository contains a full-stack application for emergency room triage, featuring real-time voice intelligence, patient management, analytics, and resource allocation. The project is split into two main folders:
- `er-triage-backend`: Spring Boot backend
- `er-triage-frontend`: React/Vite frontend

## Features

### Backend (Spring Boot)
- **Patient Management**: CRUD operations for patients, including recycle bin for deleted patients.
- **Voice Intelligence**: Integration with HuggingFace for medical keyword extraction and categorization.
- **Resource Allocation**: Manage rooms and zones for resource tracking.
- **User Authentication**: JWT-based authentication and Spring Security configuration.
- **Analytics**: Endpoints for ER analytics and reporting.
- **MongoDB Integration**: Uses MongoDB for data storage (local or Atlas).
- **CORS & Security**: Configured for secure API access and CORS handling.

### Frontend (React/Vite)
- **Voice Input**: Supports Indian languages (Hindi, English) and US English. Uses Web Speech API for real-time transcription.
- **Medical Keyword Highlighting**: Categorizes and highlights medical terms in patient info.
- **Patient Cards & Kanban Board**: Visual patient management with drag-and-drop task assignment.
- **Resource Allocation UI**: Manage rooms/zones visually.
- **Dark/Light Mode**: Theme toggle for improved accessibility.
- **Verification Box**: Shows extracted medical keywords for review.
- **Login & User Management**: Secure login, user CRUD, and role management.
- **Responsive Design**: Works across devices.

## Setup Instructions

### Prerequisites
- Node.js (for frontend)
- Java & Maven (for backend)
- MongoDB (local or Atlas)

### Backend
1. Navigate to `er-triage-backend`.
2. Configure `.env` and `application.properties` for MongoDB, JWT, and AI provider.
3. Run: `mvn spring-boot:run`

### Frontend
1. Navigate to `er-triage-frontend`.
2. Install dependencies: `npm install`
3. Run: `npm run dev`

## Environment Variables
- `.env` files required for backend and frontend (see sample in repo).
- Configure MongoDB URI, JWT secret, and AI provider keys.

## Folder Structure
- `er-triage-backend/src/main/java/com/ertriage/` — Backend source
- `er-triage-frontend/src/` — Frontend source

## Contributing
- Fork the repo, create a branch, submit PRs.
- Please follow code style and add tests where possible.

## License
MIT License

## Contact
For support or questions, open an issue or contact the maintainers.
