# Short Story Backend API

A Node.js backend API that provides user authentication and content modification services.

## Features

- User authentication with phone number and verification code
- User status management (paid/unpaid status)
- Content modification API (translation and shortening)
- Database integration with Supabase

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
```

3. Create the database tables:
- Run the SQL commands in `schema.sql` in your Supabase SQL editor

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

- POST `/auth/login`
  - Body: `{ phone, verificationCode }`
  - Returns: JWT token and user info

- GET `/auth/status`
  - Headers: `Authorization: Bearer <token>`
  - Returns: User status

### Content Modification

- POST `/api/modify`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ content, translate, shorten }`
  - Returns: Modified content

## Development

The project uses:
- Express.js for the web server
- Postgres.js for database operations
- JWT for authentication
- Nodemon for development
