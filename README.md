# Stream+

To read complete documentation visit [Documentions Page](https://pranavnathe.com/portfolio/stream).

Stream+ is a social video streaming platform built with the MERN stack (MongoDB, Express.js, React, and Node.js). It offers features similar to YouTube, allowing users to:

* Upload and edit videos
* Create and manage channels
* Like and subscribe to other channels
* Create playlists

**Key Features:**

* User-friendly and responsive React frontend with Tailwind CSS for clean styling
* Efficient video browsing and interaction with REST API calls via Axios
* Secure backend with authentication, password hashing, and additional security measures
* Streamlined database interaction using Mongoose (ODM)
* Cloudinary integration for efficient image and video storage and management
* Modular code structure for easy maintenance and scalability
* Deployment on Vercel for optimal performance

**Getting Started**

1. **Prerequisites:** Ensure you have Node.js and npm (or yarn) installed on your system.
2. **Clone the Repository:**

   ```bash
   git clone https://github.com/pranavnathe/stream.git
    ```
3. **Install Dependencies:**
    ```bash
    cd stream
    npm install (or yarn install)
    ```
4. **Configure Environment Variables:**
Create a file named .env in the frontend directory and add the following line, replacing APIENDPOINT with the actual URL of your backend API:

    ```javascript
    VITE_API_BASE_URL=https://example.com/api
    ```
5. **Run the Development Server:**
    ```bash
    npm run dev
    ```

## Contributing

Thank you for considering contributing to this project! Contributions are welcome from everyone. Please take a moment to review the following guidelines:

1. Fork the repository and clone it locally.
2. Create a new branch for your contribution: `git checkout -b feature/my-feature`.
3. Make your changes and commit them: `git commit -am 'Add some feature'`.
4. Push your branch to GitHub: `git push origin feature/my-feature`.
5. Submit a pull request.
6. Be responsive to feedback and be ready to make changes if necessary.

Thank you for your interest in contributing!

## Disclaimer

This project is for educational purposes only. Please be responsible and respectful when using it.

***
# Backend

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/pranavnathe/stream_server.git
    ```
2. **Install Dependencies:**
    ```bash
    cd stream_server
    npm install (or yarn install)
    ```
3. **Configure Environment Variables:**
Create a file named .env in the backend directory and add the following lines, replacing the placeholders with your own values:

    ```javascript
    PORT= (Your desired port number)
    DEVELOPMENT=true  // false if in production
    CORS_ORIGIN= (Allowed origin for CORS requests)
    FRONTEND_DOMAIN=(ex. localhost:3000)
    MONGODB_URI= (Your MongoDB connection URI)
    ACCESS_TOKEN_SECRET= (A secret string for generating access tokens)
    ACCESS_TOKEN_EXPIRY= (Expiration time for access tokens in seconds)
    REFRESH_TOKEN_SECRET= (A secret string for generating refresh tokens)
    REFRESH_TOKEN_EXPIRY= (Expiration time for refresh tokens in seconds)
    CLOUDINARY_CLOUD_NAME= (Your Cloudinary cloud name)
    CLOUDINARY_API_KEY= (Your Cloudinary API key)
    CLOUDINARY_API_SECRET= (Your Cloudinary API secret)
    ```
4. **Run the Development Server:**
    ```bash
    npm run dev
    ```

**Explanation:**

- **Main README.md:** This file provides a high-level overview of Stream+, its key features, getting started instructions, contribution guidelines and a disclaimer.
- **Separate .env Files:** These files are essential for storing sensitive environment variables required by both the frontend (API endpoint URL) and the backend (database connection, authentication secrets, Cloudinary credentials).
- **Code Formatting:** The Markdown syntax is used for proper formatting in the README.md, ensuring readability and clarity.

**Additional Notes:**

- Replace `APIENDPOINT` with the actual URL of your backend API.
- Fill in the placeholders in the backend `.env` file with your specific