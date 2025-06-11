-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  read boolean DEFAULT false,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  phone text NOT NULL UNIQUE,
  name text,
  age integer,
  gender text,
  height double precision,
  weight double precision,
  goal text,
  activity_level text,
  dietary_restrictions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  plan_text text,
  last_context jsonb,
  paid boolean DEFAULT false,
  plan_url text,
  ai_enabled boolean DEFAULT true,
  last_message_at timestamp with time zone,
  experience text,
  available_days text,
  health_conditions text,
  exercise_preferences text,
  equipment text,
  motivation text,
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid,
  state text NOT NULL,
  last_interaction timestamp with time zone DEFAULT now(),
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.pending_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid,
  plan_content text NOT NULL,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pending_plans_pkey PRIMARY KEY (id),
  CONSTRAINT pending_plans_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  client_id uuid,
  type text NOT NULL,
  pdf_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT plans_pkey PRIMARY KEY (id),
  CONSTRAINT plans_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);