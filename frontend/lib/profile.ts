import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpsert = Database["public"]["Tables"]["profiles"]["Insert"];

type EditableProfileFields = {
  full_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | "prefer_not_to_say" | null;
  address?: string | null;
  blood_group?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Unknown" | null;
  allergies?: string | null;
  medical_conditions?: string | null;
  current_medications?: string | null;
  medical_notes?: string | null;
};

/** Fetch the current user's profile. Returns null if the row does not exist. */
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle(); // safe: returns null instead of throwing when row is missing

  if (error) {
    console.error("[profile] fetch error:", error.code);
    return null;
  }
  return data as ProfileRow | null;
}

/** Update editable profile fields for a normal user. */
export async function updateProfile(
  updates: EditableProfileFields
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication expired" };
  }

  const payload: ProfileUpsert = {
    id: user.id,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error("[profile] update error:", error.code);
    return { error: "Unable to update your profile. Please try again." };
  }
  return { error: null };
}

/** Upload avatar to the authenticated user's folder and persist the URL safely. */
export async function uploadAvatar(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { url: null, error: "Authentication expired" };
  }

  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = mimeToExt[file.type];
  if (!ext) {
    return { url: null, error: "Only JPG, PNG, and WEBP images are allowed." };
  }

  if (file.size > 3 * 1024 * 1024) {
    return { url: null, error: "Image must be smaller than 3 MB." };
  }

  const timestamp = Date.now();
  const path = `${user.id}/avatar-${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-avatars")
    .upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[profile] avatar upload error:", uploadError.message);
    return { url: null, error: "Avatar upload failed. Please try again." };
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("profile-avatars")
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signedUrlError || !signedUrlData) {
    console.error("[profile] signed url error:", signedUrlError?.message);
    return { url: null, error: "Avatar upload failed. Please try again." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        avatar_url: signedUrlData.signedUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (updateError) {
    console.error("[profile] avatar_url save error:", updateError.code);
    return { url: signedUrlData.signedUrl, error: "Unable to update your profile. Please try again." };
  }

  return { url: signedUrlData.signedUrl, error: null };
}
