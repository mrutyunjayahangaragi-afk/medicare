import { createClient } from "@/lib/supabase/client";
import type { EmergencyContact } from "@/types/database";

export async function fetchEmergencyContacts(): Promise<EmergencyContact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[contacts] fetch error:", error.code);
    return [];
  }
  return (data ?? []) as EmergencyContact[];
}

export async function createEmergencyContact(
  contact: Omit<EmergencyContact, "id" | "user_id" | "created_at" | "updated_at">
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "You must be authenticated to add contacts" };
  }

  // If setting as primary, first remove primary status from existing contacts
  if (contact.is_primary) {
    await supabase
      .from("emergency_contacts")
      .update({ is_primary: false })
      .eq("user_id", user.id);
  }

  const { error } = await supabase
    .from("emergency_contacts")
    .insert({
      ...contact,
      user_id: user.id,
    });

  if (error) {
    console.error("[contacts] create error:", error.code);
    if (error.code === "23505") {
      return { error: "A contact with this phone number already exists" };
    }
    return { error: "Failed to add contact. Please try again." };
  }
  return { error: null };
}

export async function updateEmergencyContact(
  id: string,
  contact: Partial<Omit<EmergencyContact, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "You must be authenticated to update contacts" };
  }

  // If setting as primary, use the RPC function for atomic operation
  if (contact.is_primary) {
    const { error: rpcError } = await supabase.rpc("set_primary_emergency_contact", {
      p_contact_id: id,
    });
    
    if (rpcError) {
      console.error("[contacts] set primary error:", rpcError.code);
      return { error: "Failed to set primary contact. Please try again." };
    }
    
    // Update other fields
    const { error: updateError } = await supabase
      .from("emergency_contacts")
      .update({
        ...contact,
        is_primary: true, // Keep it true since we already set it
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[contacts] update error:", updateError.code);
      return { error: "Failed to update contact. Please try again." };
    }
  } else {
    const { error } = await supabase
      .from("emergency_contacts")
      .update(contact)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[contacts] update error:", error.code);
      if (error.code === "23505") {
        return { error: "A contact with this phone number already exists" };
      }
      return { error: "Failed to update contact. Please try again." };
    }
  }

  return { error: null };
}

export async function deleteEmergencyContact(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "You must be authenticated to delete contacts" };
  }

  const { error } = await supabase
    .from("emergency_contacts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[contacts] delete error:", error.code);
    return { error: "Failed to delete contact. Please try again." };
  }
  return { error: null };
}

export async function setPrimaryEmergencyContact(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  
  const { error } = await supabase.rpc("set_primary_emergency_contact", {
    p_contact_id: id,
  });

  if (error) {
    console.error("[contacts] set primary error:", error.code);
    return { error: "Failed to set primary contact. Please try again." };
  }
  return { error: null };
}
