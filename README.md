# Google Sheets + Drive Backend Setup

This guide explains how to set up a Node.js backend using Google Sheets as a database and Google Drive for file storage.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Setup](#1-google-cloud-setup)
   - [Create a Google Cloud Project](#create-a-google-cloud-project)
   - [Create Service Account](#create-service-account)
   - [Share Resources with Service Account](#share-resources-with-service-account)
3. [Prepare Google Sheet](#2-prepare-google-sheet)
   - [Sheet 1: "Todos"](#sheet-1-todos)
   - [Sheet 2: "Users"](#sheet-2-users)
4. [Node.js Server Setup](#3-nodejs-server-setup)
5. [Environment Configuration](#4-environment-configuration)
6. [Starting the Server](#5-starting-the-server)
7. [API Endpoints](#6-api-endpoints)
   - [Authentication Endpoints](#authentication-endpoints)
   - [Default Admin User](#default-admin-user)
   - [Todos](#todos)
8. [User Roles and Permissions](#7-user-roles-and-permissions)
   - [User Roles](#user-roles)
   - [Permission System](#permission-system)
9. [Testing with Postman](#8-testing-with-postman)
   - [Testing Steps](#testing-steps)
   - [Setting Variables in Postman](#setting-variables-in-postman)
10. [Important Notes](#9-important-notes)
    - [Security Considerations](#security-considerations)
    - [User Isolation](#user-isolation)
    - [File Management](#file-management)
    - [Error Handling](#error-handling)

---

## Prerequisites

- Node.js (v14+)
- Google account
- Basic knowledge of Google Sheets and Drive

## 1. Google Cloud Setup

### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Sheets API and Google Drive API:
   - Navigation Menu > APIs & Services > Library
   - Search for "Google Sheets API" and enable it
   - Search for "Google Drive API" and enable it

### Create Service Account

1. Navigation Menu > IAM & Admin > Service Accounts
2. Click "Create Service Account"
3. Fill in details and create
4. Under "Keys" tab, click "Add Key" > "Create new key" > JSON
5. Save the JSON file securely (this is your service account credentials rename it to something memorable it will be used later)

### Share Resources with Service Account

1. **Google Sheet**:
   - Create a new Google Sheet
   - Share it with your service account email as "Editor" (the service account email is located in the JSON file under the client_email field)
   - Note the Sheet ID from the URL (`https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`)

2. **Google Drive Folder**:
   - Create a new folder in Drive
   - Share it with your service account email as "Editor"
   - Note the Folder ID from the URL (`https://drive.google.com/drive/folders/[FOLDER_ID]`)

## 2. Prepare Google Sheet

Create two sheets in your Google Spreadsheet:

### Sheet 1: "Todos"
Create a sheet named "Todos" with these headers in the first row:
```
id, title, description, imageId, imageLink, createdAt, updatedAt, completed, userId
```

### Sheet 2: "Users"
Create a sheet named "Users" with these headers in the first row:
```
id, username, password, role, createdAt
```

Make sure there are no whitespaces in the headers.

## 3. Node.js Server Setup

1. Clone this repository
2. Install the required dependencies:

```bash
npm install express googleapis bcryptjs jsonwebtoken multer dotenv cors uuid
```

## 4. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# Google Sheets Configuration
SPREADSHEET_ID=your_sheet_id
DRIVE_FOLDER_ID=your_folder_id
GOOGLE_APPLICATION_CREDENTIALS=./path/to/your/service-account.json

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1h
```
You can generate a jwt secret here:
[https://jwtsecret.com/generate](https://jwtsecret.com/generate)

## 5. Starting the Server

```bash
node server.js
```

The server will automatically:
- Initialize Google APIs
- Create a default admin user (username: `admin`, password: `admin123`)

---

## 6. API Endpoints

## Authentication Endpoints

**POST** `/api/auth/register`

- Register a new user
- **Body:**
  ```json
  {
    "username": "newuser",
    "password": "password123"
  }
  ```
- **Success Response (201):**
  ```json
  {
    "id": "user-uuid",
    "username": "newuser",
    "role": "user"
  }
  ```
- **Error Responses:**
  - 400: Username already exists or validation error
  - 500: Server error

**POST** `/api/auth/login`

- Login existing user
- **Body:**
  ```json
  {
    "username": "newuser",
    "password": "password123"
  }
  ```
- **Success Response:**
  ```json
  {
    "token": "jwt.token.here",
    "user": {
      "id": "user-uuid",
      "username": "newuser",
      "role": "user"
    }
  }
  ```
- **Error Responses:**
  - 401: Invalid credentials
  - 400: Validation error

### Default Admin User
The system automatically creates an admin user on first startup:
- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `admin`

> **Important:** Change the admin password after first login for security.

### Todos

> **Note:** All todo endpoints require JWT token in `Authorization` header as:  
> `Authorization: Bearer <your_token>`

#### **GET** `/api/todos`
- List all todos (admin only - sees all todos from all users)
- **Success Response:**
  ```json
  [
    {
      "id": "todo-123",
      "title": "Task 1",
      "description": "Description",
      "imageId": "drive-file-id",
      "imageLink": "https://drive.google.com/uc?id=drive-file-id",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z",
      "completed": false,
      "userId": "user-456"
    }
  ]
  ```

#### **GET** `/api/todos/user`
- List todos for the current authenticated user only
- **Success Response:**
  ```json
  [
    {
      "id": "todo-123",
      "title": "My Task",
      "description": "My Description",
      "imageId": "drive-file-id",
      "imageLink": "https://drive.google.com/uc?id=drive-file-id",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z",
      "completed": false,
      "userId": "current-user-id"
    }
  ]
  ```

#### **POST** `/api/todos`
- Create new todo (automatically assigned to current user)
- **Headers:**
  - `Content-Type: multipart/form-data`
- **Body:**
  - Form-data fields:
    - `title` (string, required)
    - `description` (string, optional)
    - `completed` (boolean, optional, default false)
    - `image` (file, optional)
- **Success Response:**
  ```json
  {
    "id": "todo-123",
    "title": "Task 1",
    "description": "Description",
    "imageId": "drive-file-id",
    "imageLink": "https://drive.google.com/uc?id=drive-file-id",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z",
    "completed": false,
    "userId": "current-user-id"
  }
  ```

#### **GET** `/api/todos/:id`
- Get single todo by ID (users can only access their own todos)
- **Success Response:**
  ```json
  {
    "id": "todo-123",
    "title": "Task 1",
    "description": "Description",
    "imageId": "drive-file-id",
    "imageLink": "https://drive.google.com/uc?id=drive-file-id",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z",
    "completed": false,
    "userId": "current-user-id"
  }
  ```
- **Error Response (404):**
  ```json
  {
    "message": "Todo not found"
  }
  ```

#### **PUT** `/api/todos/:id`
- Update todo (users can only update their own todos)
- **Headers:**
  - `Content-Type: multipart/form-data`
- **Body:**
  - Form-data fields:
    - `title` (string, optional)
    - `description` (string, optional)
    - `completed` (boolean, optional)
    - `image` (file, optional - replaces existing image if any)
- **Success Response:**
  ```json
  {
    "id": "todo-123",
    "title": "Updated Task",
    "description": "Updated Description",
    "imageId": "new-drive-file-id",
    "imageLink": "https://drive.google.com/uc?id=new-drive-file-id",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-02T00:00:00Z",
    "completed": true,
    "userId": "current-user-id"
  }
  ```

#### **DELETE** `/api/todos/:id`
- Delete todo (users can only delete their own todos, also deletes associated image)
- **Success Response:**
  ```json
  {
    "id": "todo-123",
    "message": "Todo deleted successfully"
  }
  ```

---

## 7. User Roles and Permissions

### User Roles
- **admin**: Can view all todos from all users via `/api/todos`
- **user**: Can only access their own todos via `/api/todos/user`

### Permission System
- Users can only create, read, update, and delete their own todos
- Admins have full access to all todos
- Authentication is required for all todo operations

---

## 8. Testing with Postman

Import this collection into Postman:

```json
{
  "info": {
    "_postman_id": "a1b2c3d4-e5f6-7890",
    "name": "Todo API with Authentication",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register User",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n    \"username\": \"testuser\",\n    \"password\": \"password123\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/register",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","auth","register"]
        }
      }
    },
    {
      "name": "Login User",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n    \"username\": \"testuser\",\n    \"password\": \"password123\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","auth","login"]
        }
      }
    },
    {
      "name": "Login Admin",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n    \"username\": \"admin\",\n    \"password\": \"admin123\"\n}",
          "options": {
            "raw": {
              "language": "json"
            }
          }
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/login",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","auth","login"]
        }
      }
    },
    {
      "name": "Get User's Todos",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/todos/user",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","todos","user"]
        }
      }
    },
    {
      "name": "Get All Todos (Admin Only)",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{admin_token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/todos",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","todos"]
        }
      }
    },
    {
      "name": "Get Single Todo",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/todos/{{todo_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","todos","{{todo_id}}"]
        }
      }
    },
    {
      "name": "Create Todo (with image)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "title",
              "value": "Task with image",
              "type": "text"
            },
            {
              "key": "description",
              "value": "Description here",
              "type": "text"
            },
            {
              "key": "completed",
              "value": "false",
              "type": "text"
            },
            {
              "key": "image",
              "type": "file",
              "src": "/path/to/image.jpg"
            }
          ]
        },
        "url": {
          "raw": "http://localhost:3000/api/todos",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","todos"]
        }
      }
    },
    {
      "name": "Create Todo (without image)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "title",
              "value": "Simple task",
              "type": "text"
            },
            {
              "key": "description",
              "value": "Just a simple todo",
              "type": "text"
            },
            {
              "key": "completed",
              "value": "false",
              "type": "text"
            }
          ]
        },
        "url": {
          "raw": "http://localhost:3000/api/todos",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","todos"]
        }
      }
    },
    {
      "name": "Update Todo (with new image)",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "title",
              "value": "Updated Task",
              "type": "text"
            },
            {
              "key": "description",
              "value": "Updated description",
              "type": "text"
            },
            {
              "key": "completed",
              "value": "true",
              "type": "text"
            },
            {
              "key": "image",
              "type": "file",
              "src": "/path/to/new-image.jpg"
            }
          ]
        },
        "url": {
          "raw": "http://localhost:3000/api/todos/{{todo_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","todos","{{todo_id}}"]
        }
      }
    },
    {
      "name": "Delete Todo",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/todos/{{todo_id}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api","todos","{{todo_id}}"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "token",
      "value": "",
      "description": "User JWT token"
    },
    {
      "key": "admin_token",
      "value": "",
      "description": "Admin JWT token"
    },
    {
      "key": "todo_id",
      "value": "",
      "description": "Todo ID for testing"
    }
  ]
}
```

### Testing Steps 

1. **Register** a new user account
2. **Login** as the user to get your JWT token
3. **Login** as admin (username: `admin`, password: `admin123`) to get admin token
4. **Create** a new todo as the user (note the ID in the response)
5. **Get User's Todos** to see only your todos
6. **Get All Todos** as admin to see all todos from all users
7. **Get Single Todo** using the ID from step 4
8. **Update** the todo (try with/without new image)
9. **Delete** the todo when done

### Setting Variables in Postman
- After login, copy the JWT token from the response
- Set it as the `token` variable in your Postman environment
- For admin testing, set the admin token as `admin_token` variable
- Set `todo_id` variable with actual todo IDs from your responses

---

## 9. Important Notes

### Security Considerations
- Change the default admin password immediately after setup
- Use strong JWT secrets in production
- Consider implementing rate limiting for authentication endpoints
- Validate file uploads (size, type) in production

### User Isolation
- Each user can only access their own todos
- User IDs are automatically assigned from JWT tokens
- Admin users can view all todos for administrative purposes

### File Management
- Images are stored in Google Drive
- Old images are automatically deleted when replaced or when todos are deleted
- Image links are public (anyone with the link can view)

### Error Handling
- All endpoints return appropriate HTTP status codes
- Detailed error messages are provided for debugging
- Authentication failures return 401 status
- Authorization failures return 403 status
