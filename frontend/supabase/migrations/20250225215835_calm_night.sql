/*
  # Create participants and check-ins tables

  1. New Tables
    - `participants`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `category` (text)
      - `partner_name` (text, nullable)
      - `team_name` (text, nullable)
      - `created_at` (timestamp)
    - `check_ins`
      - `id` (uuid, primary key)
      - `participant_id` (uuid, references participants)
      - `checked_in_at` (timestamp)
      - `checked_in_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to:
      - Read all participants
      - Create check-ins
      - Read all check-ins
*/

CREATE TABLE participants (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text,
  category text NOT NULL,
  partner_name text,
  team_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id) NOT NULL,
  checked_in_at timestamptz DEFAULT now(),
  checked_in_by uuid REFERENCES auth.users(id) NOT NULL
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants are viewable by authenticated users"
  ON participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Check-ins can be created by authenticated users"
  ON check_ins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = checked_in_by);

CREATE POLICY "Check-ins are viewable by authenticated users"
  ON check_ins
  FOR SELECT
  TO authenticated
  USING (true);