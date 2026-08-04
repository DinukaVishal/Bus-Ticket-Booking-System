import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UserPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  bookingNotifications: boolean;
  promotionalNotifications: boolean;
  language: string;
}

interface PreferencesRow {
  id: string;
  user_id: string;
  email_notifications: boolean;
  booking_notifications: boolean;
  promotional_notifications: boolean;
  language: string;
}

interface UseUserPreferencesResult {
  preferences: UserPreferences | null;
  isLoading: boolean;
  isSaving: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  id: '',
  userId: '',
  emailNotifications: true,
  bookingNotifications: true,
  promotionalNotifications: false,
  language: 'en',
};

export function useUserPreferences(userId: string | undefined): UseUserPreferencesResult {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no row exists yet, fall back to defaults (the DB trigger should
        // normally create one on signup).
        if (error.code === 'PGRST116') {
          setPreferences({ ...DEFAULT_PREFERENCES, userId });
        } else {
          console.error('Error loading preferences:', error);
        }
        return;
      }

      const row = data as PreferencesRow;
      setPreferences({
        id: row.id,
        userId: row.user_id,
        emailNotifications: row.email_notifications,
        bookingNotifications: row.booking_notifications,
        promotionalNotifications: row.promotional_notifications,
        language: row.language || 'en',
      });
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>): Promise<boolean> => {
      if (!userId) return false;
      setIsSaving(true);
      try {
        const updateData: Record<string, unknown> = {};
        if (updates.emailNotifications !== undefined) {
          updateData.email_notifications = updates.emailNotifications;
        }
        if (updates.bookingNotifications !== undefined) {
          updateData.booking_notifications = updates.bookingNotifications;
        }
        if (updates.promotionalNotifications !== undefined) {
          updateData.promotional_notifications = updates.promotionalNotifications;
        }
        if (updates.language !== undefined) {
          updateData.language = updates.language;
        }

        const { error } = await supabase
          .from('user_preferences')
          .update(updateData)
          .eq('user_id', userId);

        if (error) {
          toast({
            title: 'Error',
            description: error.message || 'Failed to update preferences.',
            variant: 'destructive',
          });
          return false;
        }

        // Optimistically update local state
        setPreferences((prev) => (prev ? { ...prev, ...updates } : prev));
        return true;
      } catch (err: any) {
        toast({
          title: 'Error',
          description: err?.message || 'Failed to update preferences.',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreferences,
  };
}
