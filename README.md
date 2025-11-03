# E-Commerce Web App - Next.js + Supabase

A minimal e-commerce web application built with Next.js 14 and Supabase. Features product display, order placement, and event logging for data analysis.

## Features

- 📦 Product listing with real-time stock updates
- 🛒 Simple "Buy Now" functionality
- 📊 Event logging system (orders, stock updates)
- 💾 Supabase backend for data persistence
- 🎨 Clean, responsive UI with gradient design
- 📝 Logs exportable to IBM Data Prep Kit

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Supabase account** - [Sign up free](https://supabase.com/)

## Project Structure

```
ecommerce-nextjs-supabase/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── orders/
│   │   │       └── route.ts          # Order processing API
│   │   ├── globals.css               # Global styles
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Homepage (product listing)
│   │   └── page.module.css           # Homepage styles
│   ├── lib/
│   │   └── supabase.ts               # Supabase client
│   └── types/
│       └── database.ts               # TypeScript types
├── .env.local                        # Environment variables (create this)
├── .env.local.example                # Example env file
├── next.config.js                    # Next.js configuration
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── supabase-setup.sql                # Database setup SQL
└── supabase-optional.sql             # Optional queries
```

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and sign in
2. Click **"New Project"**
3. Fill in your project details:
   - **Name**: Choose a project name (e.g., "ecommerce-app")
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
4. Click **"Create new project"** (this takes 1-2 minutes)

### Step 2: Set Up Database Tables

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the `supabase-setup.sql` file in this project
4. Copy all the SQL code and paste it into the Supabase SQL Editor
5. Click **"Run"** to execute the SQL
6. Verify success by going to **Table Editor** - you should see three tables:
   - `products` (with 6 sample products)
   - `orders`
   - `logs`

### Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, click **Settings** (gear icon in sidebar)
2. Click **API** in the settings menu
3. You'll need two values:
   - **Project URL** (under "Project URL")
   - **anon public key** (under "Project API keys")
4. Keep this page open - you'll need these values next

### Step 4: Configure Environment Variables

1. In the project root folder, create a file named `.env.local`
2. Copy the contents from `.env.local.example`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```
3. Replace the placeholder values with your actual Supabase credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
   ```

### Step 5: Install Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

This will install all required packages:
- Next.js 14
- React 18
- Supabase JavaScript client
- TypeScript

### Step 6: Run the Application

Start the development server:

```bash
npm run dev
```

You should see:
```
> next dev
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Ready in X.Xs
```

### Step 7: Test the Application

1. Open your browser to [http://localhost:3000](http://localhost:3000)
2. You should see the E-Commerce Store homepage with 6 products
3. Try clicking **"Buy Now"** on any product
4. You should get a success message and see the stock count decrease

### Step 8: Verify Database Updates

1. Go back to your Supabase dashboard
2. Click **Table Editor**
3. View the **orders** table - you should see your order
4. View the **logs** table - you should see events like:
   - `order_placed`
   - `stock_updated`
5. View the **products** table - stock should be reduced

## How It Works

### Product Display
- Homepage fetches all products from Supabase `products` table
- Shows product name, price, and current stock
- Buy button is disabled if stock is 0

### Order Processing
When you click "Buy Now":
1. Frontend sends POST request to `/api/orders`
2. API verifies product exists and has sufficient stock
3. Creates new order record in `orders` table
4. Logs "order_placed" event to `logs` table
5. Reduces product stock by 1
6. Logs "stock_updated" event to `logs` table
7. Returns success response

### Event Logging
Every significant action is logged to the `logs` table with:
- **event_name**: Type of event (e.g., "order_placed", "stock_updated")
- **message**: Detailed description
- **created_at**: Timestamp (automatically set)

## Exporting Logs for Data Analysis

### Method 1: Direct SQL Query

1. Go to Supabase dashboard → **SQL Editor**
2. Run this query:
   ```sql
   SELECT 
       id,
       event_name,
       message,
       TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as timestamp
   FROM logs
   ORDER BY created_at DESC;
   ```
3. Click **"Export to CSV"** button

### Method 2: Table Editor Export

1. Go to **Table Editor** → **logs** table
2. Click the **Export** button (top right)
3. Choose **CSV** format
4. Download the file

### Method 3: Using Supabase API

You can also fetch logs programmatically:

```typescript
const { data, error } = await supabase
  .from('logs')
  .select('*')
  .order('created_at', { ascending: false });
```

## Project Customization

### Adding More Products

Option 1 - Using SQL:
```sql
INSERT INTO products (name, price, stock) VALUES
    ('New Product', 99.99, 50);
```

Option 2 - Using Supabase Table Editor:
1. Go to **Table Editor** → **products**
2. Click **"Insert"** → **"Insert row"**
3. Fill in the fields and save

### Modifying Product Stock

```sql
UPDATE products 
SET stock = 100 
WHERE id = 1;
```

### Viewing Order History

```sql
SELECT 
    o.*,
    p.name as current_product_name
FROM orders o
LEFT JOIN products p ON o.product_id = p.id
ORDER BY o.created_at DESC;
```

### Event Analytics

```sql
-- Count events by type
SELECT event_name, COUNT(*) as count
FROM logs
GROUP BY event_name
ORDER BY count DESC;

-- Events in the last 24 hours
SELECT *
FROM logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

## Troubleshooting

### "Failed to load products"
- ✅ Check `.env.local` has correct Supabase credentials
- ✅ Verify database tables were created (run `supabase-setup.sql`)
- ✅ Check Supabase project is active in dashboard

### "Cannot find module" errors
- ✅ Run `npm install` to install dependencies
- ✅ Delete `node_modules` folder and run `npm install` again

### Orders not being created
- ✅ Check browser console for errors (F12 → Console tab)
- ✅ Verify product has stock available
- ✅ Check Supabase dashboard → Logs for error messages

### TypeScript errors
- ✅ These are normal before running `npm install`
- ✅ Restart VS Code after installing dependencies
- ✅ TypeScript errors don't prevent the app from running

## Building for Production

When ready to deploy:

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Deployment Options

### Vercel (Recommended)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard
5. Deploy!

### Other Options
- Netlify
- AWS Amplify
- Railway
- Render

Make sure to add your environment variables in the deployment platform's settings.

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Supabase** - Backend-as-a-Service (PostgreSQL database)
- **React 18** - UI library
- **CSS Modules** - Scoped styling

## API Endpoints

### POST /api/orders

Creates a new order and updates stock.

**Request Body:**
```json
{
  "product_id": 1,
  "product_name": "Wireless Headphones",
  "price": 79.99,
  "quantity": 1
}
```

**Response (Success):**
```json
{
  "success": true,
  "order": {
    "id": 1,
    "product_id": 1,
    "product_name": "Wireless Headphones",
    "price": 79.99,
    "quantity": 1,
    "total_amount": 79.99,
    "created_at": "2025-11-02T12:00:00Z"
  },
  "message": "Order placed successfully"
}
```

**Response (Error):**
```json
{
  "error": "Insufficient stock"
}
```

## Database Schema

### products
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| name | VARCHAR(255) | Product name |
| price | DECIMAL(10,2) | Product price |
| stock | INTEGER | Available quantity |
| created_at | TIMESTAMP | Creation timestamp |

### orders
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| product_id | BIGINT | Foreign key to products |
| product_name | VARCHAR(255) | Product name snapshot |
| price | DECIMAL(10,2) | Price at time of order |
| quantity | INTEGER | Quantity ordered |
| total_amount | DECIMAL(10,2) | Total price |
| created_at | TIMESTAMP | Order timestamp |

### logs
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| event_name | VARCHAR(100) | Event type |
| message | TEXT | Event description |
| created_at | TIMESTAMP | Event timestamp |

## License

This project is open source and available for educational purposes.

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review Supabase documentation at [supabase.com/docs](https://supabase.com/docs)
3. Review Next.js documentation at [nextjs.org/docs](https://nextjs.org/docs)

---

**Happy coding! 🚀**
