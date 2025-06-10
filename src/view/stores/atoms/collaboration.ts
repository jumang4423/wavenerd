import { atom } from 'jotai';

export type CollaborationStatus = 'solo' | 'connecting' | 'connected' | 'hosting' | 'error';

export interface CollaborationState {
  status: CollaborationStatus;
  roomCode: string | null;
  friendName: string | null;
  latency: number | null;
  isModalOpen: boolean;
}

export const collaborationAtom = atom<CollaborationState>({
  status: 'solo',
  roomCode: null,
  friendName: null,
  latency: null,
  isModalOpen: false,
});

// Helper atoms for easier access
export const collaborationStatusAtom = atom(
  (get) => get(collaborationAtom).status,
  (get, set, status: CollaborationStatus) => {
    set(collaborationAtom, { ...get(collaborationAtom), status });
  }
);

export const collaborationModalAtom = atom(
  (get) => get(collaborationAtom).isModalOpen,
  (get, set, isOpen: boolean) => {
    set(collaborationAtom, { ...get(collaborationAtom), isModalOpen: isOpen });
  }
);

export const collaborationRoomCodeAtom = atom(
  (get) => get(collaborationAtom).roomCode,
  (get, set, roomCode: string | null) => {
    set(collaborationAtom, { ...get(collaborationAtom), roomCode });
  }
);

export const collaborationFriendNameAtom = atom(
  (get) => get(collaborationAtom).friendName,
  (get, set, friendName: string | null) => {
    set(collaborationAtom, { ...get(collaborationAtom), friendName });
  }
);

