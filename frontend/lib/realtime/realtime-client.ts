/**
 * lib/realtime/realtime-client.ts
 * Shared realtime client wrapper with channel registry and reference counting.
 *
 * Responsibilities:
 *   - Reuse the existing Supabase browser client.
 *   - Allow multiple consumers to share the same channel topic subscription.
 *   - Implement reference counting: unsubscribe/remove only when count reaches 0.
 *   - Clear all active channels on confirmed sign-out.
 */

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChannelRegistration {
  channel: RealtimeChannel;
  refCount: number;
}

class RealtimeChannelManager {
  private registry: Map<string, ChannelRegistration> = new Map();
  private supabase = createClient();

  /**
   * Get or create a subscription channel for a specific topic.
   * Increments the reference count.
   */
  public getOrCreateChannel(
    topic: string,
    setupChannel: (channel: RealtimeChannel) => void
  ): RealtimeChannel {
    const existing = this.registry.get(topic);
    if (existing) {
      existing.refCount += 1;
      return existing.channel;
    }

    // Create new channel
    const channel = this.supabase.channel(topic);
    setupChannel(channel);

    this.registry.set(topic, {
      channel,
      refCount: 1,
    });

    return channel;
  }

  /**
   * Decrements reference count.
   * Removes/unsubscribes channel from Supabase client if reference count reaches 0.
   */
  public releaseChannel(topic: string): void {
    const registration = this.registry.get(topic);
    if (!registration) return;

    registration.refCount -= 1;

    if (registration.refCount <= 0) {
      this.supabase.removeChannel(registration.channel);
      this.registry.delete(topic);
      if (process.env.NODE_ENV === "development") {
        console.log(`[RealtimeManager] Removed channel for topic: ${topic}`);
      }
    }
  }

  /**
   * Remove all active channels from registry and Supabase client on sign-out.
   */
  public removeAllUserChannels(): void {
    for (const [topic, reg] of this.registry.entries()) {
      this.supabase.removeChannel(reg.channel);
      if (process.env.NODE_ENV === "development") {
        console.log(`[RealtimeManager] Cleaned up user channel: ${topic}`);
      }
    }
    this.registry.clear();
  }
}

// Global registry instance
export const realtimeChannelManager = new RealtimeChannelManager();
