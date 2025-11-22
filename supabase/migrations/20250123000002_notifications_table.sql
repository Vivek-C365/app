-- Notifications table for push notification tracking
-- Stores notification records that can be picked up by mobile apps

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification content
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'status_update_reminder',
    'case_assignment',
    'new_message',
    'case_update',
    'escalation_alert',
    'case_reassignment',
    'verification_update'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Additional data as JSONB
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  
  -- Push notification tracking
  push_token TEXT,
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  push_error TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  CONSTRAINT non_empty_title CHECK (LENGTH(title) > 0),
  CONSTRAINT non_empty_body CHECK (LENGTH(body) > 0)
);

-- Indexes for performance
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $
BEGIN
  UPDATE notifications
  SET 
    is_read = true,
    read_at = NOW()
  WHERE id = p_notification_id;
END;
$ LANGUAGE plpgsql;

-- Function to mark all user notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS void AS $
BEGIN
  UPDATE notifications
  SET 
    is_read = true,
    read_at = NOW()
  WHERE user_id = p_user_id AND is_read = false;
END;
$ LANGUAGE plpgsql;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS void AS $
BEGIN
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$ LANGUAGE plpgsql;

-- Schedule cleanup job to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-expired-notifications',
  '0 2 * * *', -- Daily at 2 AM
  $
  SELECT cleanup_expired_notifications();
  $
);

-- Row Level Security policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Only system can insert notifications (via Edge Functions with service role)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, UPDATE, DELETE ON notifications TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE notifications IS 
'Stores notification records for push notifications, in-app notifications, and notification history';

COMMENT ON FUNCTION mark_notification_read(UUID) IS 
'Marks a specific notification as read';

COMMENT ON FUNCTION mark_all_notifications_read(UUID) IS 
'Marks all notifications for a user as read';

COMMENT ON FUNCTION cleanup_expired_notifications() IS 
'Removes expired notifications. Runs daily at 2 AM via pg_cron';
