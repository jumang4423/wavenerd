import { ref, set, onValue, off, push, onDisconnect, serverTimestamp } from 'firebase/database';
import { database } from './firebase';
import { EventEmittable } from './utils/EventEmittable';

interface CollaborationEvents {
  connectionStatusChange: { status: 'connected' | 'disconnected' | 'error' };
  codeChange: { deck: 'a' | 'b'; code: string; timestamp: number; userId: string };
  applyTriggered: { deck: 'a' | 'b'; userId: string; timestamp: number; immediate: boolean };
  userJoined: { userId: string; userName: string };
  userLeft: { userId: string };
}

interface RoomData {
  users: Record<string, { name: string; lastSeen: number }>;
  deckA: string;
  deckB: string;
  applyEvents: Record<string, { deck: 'a' | 'b'; userId: string; timestamp: number; immediate: boolean }>;
  lastModified: number;
  lastModifiedBy: string;
}

export class CollaborationManager extends EventEmittable<CollaborationEvents> {
  private roomId: string | null = null;
  private userId: string;
  private userName: string;
  private currentCodeA: string = '';
  private currentCodeB: string = '';
  private isHost: boolean = false;
  private roomRef: any = null;
  private deckARef: any = null;
  private deckBRef: any = null;
  private usersRef: any = null;
  private applyEventsRef: any = null;

  constructor() {
    super();
    // Generate a unique user ID
    this.userId = this.generateUserId();
    this.userName = `User_${this.userId.slice(0, 4)}`;
  }

  private generateUserId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part1}-${part2}`;
  }

  async hostRoom(initialCodeA: string = '', initialCodeB: string = ''): Promise<string> {
    try {
      this.roomId = this.generateRoomId();
      this.isHost = true;
      this.currentCodeA = initialCodeA;
      this.currentCodeB = initialCodeB;

      // Create room data
      const roomData: RoomData = {
        users: {
          [this.userId]: {
            name: this.userName,
            lastSeen: Date.now()
          }
        },
        deckA: initialCodeA,
        deckB: initialCodeB,
        applyEvents: {},
        lastModified: Date.now(),
        lastModifiedBy: this.userId
      };

      // Set up Firebase references
      this.roomRef = ref(database, `rooms/${this.roomId}`);
      this.deckARef = ref(database, `rooms/${this.roomId}/deckA`);
      this.deckBRef = ref(database, `rooms/${this.roomId}/deckB`);
      this.usersRef = ref(database, `rooms/${this.roomId}/users`);
      this.applyEventsRef = ref(database, `rooms/${this.roomId}/applyEvents`);

      // Create the room
      await set(this.roomRef, roomData);

      // Set up disconnect cleanup
      const userRef = ref(database, `rooms/${this.roomId}/users/${this.userId}`);
      onDisconnect(userRef).remove();

      // Listen for code changes
      this.setupCodeListeners();
      this.setupUsersListener();
      this.setupApplyEventsListener();

      this.__emit('connectionStatusChange', { status: 'connected' });
      return this.roomId;
    } catch (error) {
      console.error('Failed to host room:', error);
      this.__emit('connectionStatusChange', { status: 'error' });
      throw error;
    }
  }

  async joinRoom(roomId: string): Promise<void> {
    try {
      this.roomId = roomId;
      this.isHost = false;

      // Set up Firebase references
      this.roomRef = ref(database, `rooms/${this.roomId}`);
      this.deckARef = ref(database, `rooms/${this.roomId}/deckA`);
      this.deckBRef = ref(database, `rooms/${this.roomId}/deckB`);
      this.usersRef = ref(database, `rooms/${this.roomId}/users`);
      this.applyEventsRef = ref(database, `rooms/${this.roomId}/applyEvents`);

      // Add user to room
      const userRef = ref(database, `rooms/${this.roomId}/users/${this.userId}`);
      await set(userRef, {
        name: this.userName,
        lastSeen: Date.now()
      });

      // Set up disconnect cleanup
      onDisconnect(userRef).remove();

      // Listen for changes
      this.setupCodeListeners();
      this.setupUsersListener();
      this.setupApplyEventsListener();

      this.__emit('connectionStatusChange', { status: 'connected' });
      this.__emit('userJoined', { userId: this.userId, userName: this.userName });
    } catch (error) {
      console.error('Failed to join room:', error);
      this.__emit('connectionStatusChange', { status: 'error' });
      throw error;
    }
  }

  private setupCodeListeners(): void {
    if (!this.deckARef || !this.deckBRef) return;

    // Listen for Deck A changes
    onValue(this.deckARef, (snapshot) => {
      const code = snapshot.val();
      if (code !== null && code !== this.currentCodeA) {
        this.currentCodeA = code;
        this.__emit('codeChange', { 
          deck: 'a',
          code, 
          timestamp: Date.now(), 
          userId: 'remote'
        });
      }
    });

    // Listen for Deck B changes
    onValue(this.deckBRef, (snapshot) => {
      const code = snapshot.val();
      if (code !== null && code !== this.currentCodeB) {
        this.currentCodeB = code;
        this.__emit('codeChange', { 
          deck: 'b',
          code, 
          timestamp: Date.now(), 
          userId: 'remote'
        });
      }
    });
  }

  private setupUsersListener(): void {
    if (!this.usersRef) return;

    onValue(this.usersRef, (snapshot) => {
      const users = snapshot.val() || {};
      
      // Emit events for user changes
      Object.entries(users).forEach(([userId, userData]: [string, any]) => {
        if (userId !== this.userId) {
          this.__emit('userJoined', { userId, userName: userData.name });
        }
      });
    });
  }

  private setupApplyEventsListener(): void {
    if (!this.applyEventsRef) return;

    onValue(this.applyEventsRef, (snapshot) => {
      const events = snapshot.val() || {};
      
      // Find the latest apply event
      const eventEntries = Object.entries(events);
      if (eventEntries.length > 0) {
        // Sort by timestamp and get the most recent
        const latestEvent = eventEntries
          .map(([id, event]: [string, any]) => ({ id, ...event }))
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        
        // Only emit if it's from another user and recent (within last 2 seconds)
        const now = Date.now();
        if (latestEvent.userId !== this.userId && (now - latestEvent.timestamp) < 2000) {
          this.__emit('applyTriggered', {
            deck: latestEvent.deck,
            userId: latestEvent.userId,
            timestamp: latestEvent.timestamp,
            immediate: latestEvent.immediate || false
          });
        }
      }
    });
  }


  async updateCode(deck: 'a' | 'b', code: string): Promise<void> {
    if (!this.roomId || !this.deckARef || !this.deckBRef) {
      throw new Error('Not connected to a room');
    }

    const currentCode = deck === 'a' ? this.currentCodeA : this.currentCodeB;
    const deckRef = deck === 'a' ? this.deckARef : this.deckBRef;

    // Skip if code hasn't actually changed
    if (code === currentCode) {
      return;
    }

    try {
      // Update local tracking
      if (deck === 'a') {
        this.currentCodeA = code;
      } else {
        this.currentCodeB = code;
      }
      
      // Simpler update for better performance
      await set(deckRef, code);
      
      // Update user activity separately (less frequent)
      const userActivityRef = ref(database, `rooms/${this.roomId}/users/${this.userId}/lastSeen`);
      await set(userActivityRef, serverTimestamp());
    } catch (error) {
      console.error('Failed to update code:', error);
      throw error;
    }
  }

  async triggerApply(deck: 'a' | 'b', immediate: boolean = false): Promise<void> {
    if (!this.roomId || !this.applyEventsRef) {
      throw new Error('Not connected to a room');
    }

    try {
      // Create a unique apply event
      const eventId = `${this.userId}_${Date.now()}`;
      const applyEvent = {
        deck,
        userId: this.userId,
        timestamp: Date.now(),
        immediate
      };

      // Push the apply event to Firebase
      const eventRef = ref(database, `rooms/${this.roomId}/applyEvents/${eventId}`);
      await set(eventRef, applyEvent);
    } catch (error) {
      console.error('Failed to trigger apply:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.roomRef) {
      // Remove listeners
      off(this.deckARef);
      off(this.deckBRef);
      off(this.usersRef);
      off(this.applyEventsRef);
      
      // Remove user from room
      if (this.roomId) {
        const userRef = ref(database, `rooms/${this.roomId}/users/${this.userId}`);
        set(userRef, null);
      }
      
      this.roomRef = null;
      this.deckARef = null;
      this.deckBRef = null;
      this.usersRef = null;
      this.applyEventsRef = null;
    }
    
    this.roomId = null;
    this.isHost = false;
    this.__emit('connectionStatusChange', { status: 'disconnected' });
  }

  getCurrentCode(deck: 'a' | 'b'): string {
    return deck === 'a' ? this.currentCodeA : this.currentCodeB;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  getUserId(): string {
    return this.userId;
  }

  getUserName(): string {
    return this.userName;
  }

  setUserName(name: string): void {
    this.userName = name;
    
    // Update in Firebase if connected
    if (this.roomId) {
      const userRef = ref(database, `rooms/${this.roomId}/users/${this.userId}/name`);
      set(userRef, name);
    }
  }

  isConnected(): boolean {
    return this.roomId !== null;
  }

  isHosting(): boolean {
    return this.isHost;
  }
}

// Singleton instance
export const COLLABMAN = new CollaborationManager();