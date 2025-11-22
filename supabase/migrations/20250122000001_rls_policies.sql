-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update only their own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Cases: Anyone can create, view all, but only assigned helpers can update
CREATE POLICY "Anyone can create cases"
  ON cases FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Cases are viewable by everyone"
  ON cases FOR SELECT
  USING (true);

CREATE POLICY "Assigned helpers and reporter can update cases"
  ON cases FOR UPDATE
  USING (
    auth.uid() = reporter_id OR
    EXISTS (
      SELECT 1 FROM case_assignments
      WHERE case_id = cases.id AND helper_id = auth.uid()
    )
  );

-- Messages: Only case participants can view and create messages
CREATE POLICY "Case participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = messages.case_id
      AND (
        c.reporter_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM case_assignments ca
          WHERE ca.case_id = c.id AND ca.helper_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Case participants can create messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (
        c.reporter_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM case_assignments ca
          WHERE ca.case_id = c.id AND ca.helper_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Status Updates: Only assigned helpers can create
CREATE POLICY "Assigned helpers can create status updates"
  ON status_updates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM case_assignments
      WHERE case_id = status_updates.case_id AND helper_id = auth.uid()
    )
  );

CREATE POLICY "Case participants can view status updates"
  ON status_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = status_updates.case_id
      AND (
        c.reporter_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM case_assignments ca
          WHERE ca.case_id = c.id AND ca.helper_id = auth.uid()
        )
      )
    )
  );

-- Case Assignments: Helpers can view their assignments, anyone can create
CREATE POLICY "Users can view case assignments"
  ON case_assignments FOR SELECT
  USING (
    helper_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_assignments.case_id
      AND cases.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can create case assignments"
  ON case_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Helpers can update their assignments"
  ON case_assignments FOR UPDATE
  USING (helper_id = auth.uid());

-- Service Areas: Helpers can manage their own service areas
CREATE POLICY "Anyone can view service areas"
  ON service_areas FOR SELECT
  USING (true);

CREATE POLICY "Helpers can create own service areas"
  ON service_areas FOR INSERT
  WITH CHECK (helper_id = auth.uid());

CREATE POLICY "Helpers can update own service areas"
  ON service_areas FOR UPDATE
  USING (helper_id = auth.uid());

CREATE POLICY "Helpers can delete own service areas"
  ON service_areas FOR DELETE
  USING (helper_id = auth.uid());

-- Verification Documents: Users can only access their own documents, admins can see all
CREATE POLICY "Users can view own verification documents"
  ON verification_documents FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );

CREATE POLICY "Users can upload own verification documents"
  ON verification_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update verification documents"
  ON verification_documents FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'admin')
  );
