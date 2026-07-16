# Zim Rigs — Zimbabwe Mining Equipment Hiring Portal

Zim Rigs is a modern React + Vite single-page application built for hiring heavy mining equipment across Zimbabwe. It features custom dashboards for three roles: Admins, Suppliers (to list and manage fleets), and Customers (to query and request machinery rentals).

## Features

- **Dynamic Landing Page**: Real-time showcase of available fleet items, user reviews/testimonials, and dynamic platform stats fetched directly from Supabase (with elegant fallback placeholders if empty).
- **Role-Based Workspaces**: Custom dashboard panels for Customers, Suppliers, and Admins.
- **In-App Live Chat**: Real-time negotiation workspace between suppliers and customers.
- **Mock Database Fallback**: Built-in mock client that saves data in LocalStorage if environment variables are not supplied.

---

## 🛠️ Local Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory by copying the example template:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your Supabase project API credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   *Note: If these variables are not set or are left empty, the application will fallback automatically to the local mock database for testing.*

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Lint and Code Checks**
   ```bash
   npm run lint
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

---

## 🗄️ Database Setup (Supabase)

To prepare the production database, follow these steps:

1. Create a new project in your **Supabase Dashboard**.
2. Navigate to the **SQL Editor** in the sidebar.
3. Open `supabase_schema.sql` from the root of this project, copy its contents, and paste them into the SQL editor.
4. Run the script. This will set up:
   - All necessary database tables (`profiles`, `equipment`, `bookings`, `chat_rooms`, `messages`, `ratings`).
   - Row Level Security (RLS) policies for secure operations.
   - An automated database trigger (`on_auth_user_created`) to automatically populate user profiles when a new account registers.

---

## 🚀 Deployment on Render

This project is a single-page frontend application. You can deploy it on Render as a **Static Site** in one of two ways:

### Option A: Using Render Blueprints (Recommended)
1. Commit the project to your GitHub/GitLab account.
2. In your Render Dashboard, click **New** -> **Blueprint**.
3. Select this repository. Render will automatically detect `render.yaml` and configure the service.
4. Fill in the required environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) when prompted, then deploy.

### Option B: Manual Static Site Setup
1. In your Render Dashboard, click **New** -> **Static Site**.
2. Connect your GitHub/GitLab repository.
3. Configure the static site settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Under **Advanced**, click **Add Environment Variable** and add the following:
   - `VITE_SUPABASE_URL`: (Your Supabase URL)
   - `VITE_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
5. Click **Create Static Site**. Render will build and host your site.
