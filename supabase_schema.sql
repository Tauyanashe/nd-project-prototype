-- SUPABASE DATABASE SCHEMA SETUP
-- Paste this script into the Supabase SQL Editor to set up your tables, triggers, and Row Level Security.

-- 1. PROFILES TABLE (linked to Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    company_name TEXT,
    user_type TEXT DEFAULT 'customer' CHECK (user_type IN ('admin', 'supplier', 'customer')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. EQUIPMENT TABLE
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('Excavators', 'Dump Trucks', 'Drill Rigs', 'Generators', 'Compressors', 'Crushers', 'Other')) NOT NULL,
    description TEXT,
    daily_rate NUMERIC(10, 2) NOT NULL CHECK (daily_rate > 0),
    location TEXT CHECK (location IN ('Harare', 'Bulawayo', 'Gweru', 'Kwekwe', 'Mutare', 'Zvishavane', 'Kadoma', 'Masvingo', 'Hwange', 'Other')) NOT NULL,
    image_url TEXT,
    status TEXT DEFAULT 'pending_approval' CHECK (status IN ('available', 'rented', 'maintenance', 'pending_approval')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'cancelled')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT check_dates CHECK (end_date >= start_date)
);

-- 4. CHAT ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_chat UNIQUE (customer_id, supplier_id, equipment_id)
);

-- 5. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Equipment Policies
CREATE POLICY "Available/Approved equipment is viewable by everyone" ON public.equipment
    FOR SELECT USING (status != 'pending_approval' OR auth.uid() = supplier_id OR (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'
    )));

CREATE POLICY "Suppliers can insert their own equipment" ON public.equipment
    FOR INSERT WITH CHECK (auth.uid() = supplier_id);

CREATE POLICY "Suppliers can update their own equipment" ON public.equipment
    FOR UPDATE USING (auth.uid() = supplier_id OR (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'
    )));

CREATE POLICY "Suppliers can delete their own equipment" ON public.equipment
    FOR DELETE USING (auth.uid() = supplier_id OR (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'
    )));

-- Bookings Policies
CREATE POLICY "Users can view bookings they are involved in" ON public.bookings
    FOR SELECT USING (
        auth.uid() = customer_id 
        OR auth.uid() = (SELECT supplier_id FROM public.equipment WHERE id = equipment_id)
        OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'))
    );

CREATE POLICY "Customers can insert bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Involved parties can update bookings" ON public.bookings
    FOR UPDATE USING (
        auth.uid() = customer_id 
        OR auth.uid() = (SELECT supplier_id FROM public.equipment WHERE id = equipment_id)
        OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'))
    );

-- Chat Rooms Policies
CREATE POLICY "Users can view chats they participate in" ON public.chat_rooms
    FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = supplier_id);

CREATE POLICY "Users can insert chats they participate in" ON public.chat_rooms
    FOR INSERT WITH CHECK (auth.uid() = customer_id OR auth.uid() = supplier_id);

-- Messages Policies
CREATE POLICY "Users can view messages in their chat rooms" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms 
            WHERE id = chat_room_id AND (customer_id = auth.uid() || supplier_id = auth.uid())
        )
    );

CREATE POLICY "Users can send messages to their chat rooms" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.chat_rooms 
            WHERE id = chat_room_id AND (customer_id = auth.uid() OR supplier_id = auth.uid())
        )
    );

-- 7. AUTO-CREATE PROFILE ON REGISTER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Mining Operator'),
    COALESCE(new.raw_user_meta_data->>'user_type', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed some mock equipment for preview/admin if desired (Supabase Editor only)
-- Note: Replace supplier UUIDs with actual user IDs from your Auth table.

-- 8. RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_customer_equipment_rating UNIQUE (customer_id, equipment_id)
);

-- ENABLE ROW LEVEL SECURITY FOR RATINGS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- RATINGS POLICIES
CREATE POLICY "Ratings are viewable by everyone" ON public.ratings
    FOR SELECT USING (true);

CREATE POLICY "Customers can insert their own ratings" ON public.ratings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own ratings" ON public.ratings
    FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete their own ratings" ON public.ratings
    FOR DELETE USING (auth.uid() = customer_id);

