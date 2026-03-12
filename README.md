# Makerspace Visitor Log

A robust visitor management system for makerspaces, featuring RFID scanning, event registration, and real-time access logs.

## Deployment on Vercel

This project is optimized for deployment on [Vercel](https://vercel.com).

### Steps to Deploy

1. **Export to GitHub**: Use the "Export to GitHub" feature in AI Studio.
2. **Import to Vercel**:
   - Log in to Vercel.
   - Click **Add New > Project**.
   - Import your GitHub repository.
3. **Configure Framework**: Vercel should automatically detect **Vite**.
4. **Deploy**: Click **Deploy**.

### Handling 404 Errors on Refresh

The `vercel.json` file is included in this repository to handle Single Page Application (SPA) routing. This ensures that refreshing the page on routes like `/scan` or `/visitors` works correctly.

## Features

- **RFID Scanning**: Real-time entry/exit logging.
- **Event Management**: Create and track specific events.
- **Visitor Database**: Manage registered users and their RFID tags.
- **Access Logs**: Detailed history of all entries.
- **Firebase Integration**: Direct cloud connection for real-time data.

## Configuration

Ensure your `src/firebase.ts` is updated with your Firebase project credentials.
