import { useEffect, useContext, useCallback } from 'react';
import { useAtom } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { COLLABMAN } from '../../../CollaborationManager';
import { 
  collaborationStatusAtom, 
  collaborationRoomCodeAtom, 
  collaborationFriendNameAtom
} from '../atoms/collaboration';
import { 
  deckACodeAtom, 
  deckBCodeAtom, 
  deckAHasEditAtom, 
  deckBHasEditAtom,
  deckACompileTimeAtom,
  deckBCompileTimeAtom 
} from '../atoms/deck';
import { StuffContext } from '../../StuffContext';
import { deckCodeStorage } from '../../../deckCodeStorage';

export function useCollaborationSubscribers() {
  const { deckA, deckB } = useContext(StuffContext)!;
  const [, setStatus] = useAtom(collaborationStatusAtom);
  const [, setRoomCode] = useAtom(collaborationRoomCodeAtom);
  const [, setFriendName] = useAtom(collaborationFriendNameAtom);
  const [deckACode, setDeckACode] = useAtom(deckACodeAtom);
  const [deckBCode, setDeckBCode] = useAtom(deckBCodeAtom);

  // Create proper apply handlers that mirror the Deck component's handleApply
  const handleRemoteApplyA = useAtomCallback(useCallback(async (get, set, immediate: boolean = false) => {
    const code = get(deckACodeAtom);
    if (!code) return;

    // Compile if needed
    if (deckA.cueStatus === 'none') {
      const compileBegin = performance.now();
      await deckA.compile(code);
      const compileTime = performance.now() - compileBegin;

      deckCodeStorage.set('a', code);
      set(deckAHasEditAtom, false);
      set(deckACompileTimeAtom, compileTime);
    }

    // Apply the compiled shader
    if (immediate) {
      deckA.applyCueImmediately();
    } else {
      deckA.applyCue();
    }
  }, [deckA]));

  const handleRemoteApplyB = useAtomCallback(useCallback(async (get, set, immediate: boolean = false) => {
    const code = get(deckBCodeAtom);
    if (!code) return;

    // Compile if needed
    if (deckB.cueStatus === 'none') {
      const compileBegin = performance.now();
      await deckB.compile(code);
      const compileTime = performance.now() - compileBegin;

      deckCodeStorage.set('b', code);
      set(deckBHasEditAtom, false);
      set(deckBCompileTimeAtom, compileTime);
    }

    // Apply the compiled shader
    if (immediate) {
      deckB.applyCueImmediately();
    } else {
      deckB.applyCue();
    }
  }, [deckB]));

  useEffect(() => {
    // Listen for connection status changes
    const handleConnectionStatusChange = ({ status }: { status: 'connected' | 'disconnected' | 'error' }) => {
      if (status === 'connected') {
        setStatus(COLLABMAN.isHosting() ? 'hosting' : 'connected');
        setRoomCode(COLLABMAN.getRoomId());
      } else if (status === 'disconnected') {
        setStatus('solo');
        setRoomCode(null);
        setFriendName(null);
      } else {
        setStatus('error');
      }
    };

    // Listen for code changes from remote users
    const handleCodeChange = ({ deck, code, userId }: { deck: 'a' | 'b'; code: string; timestamp: number; userId: string }) => {
      if (userId !== COLLABMAN.getUserId()) {
        // Only update if the code is different to avoid loops
        if (deck === 'a' && code !== deckACode) {
          setDeckACode(code);
        } else if (deck === 'b' && code !== deckBCode) {
          setDeckBCode(code);
        }
      }
    };

    // Listen for user join events
    const handleUserJoined = ({ userId, userName }: { userId: string; userName: string }) => {
      if (userId !== COLLABMAN.getUserId()) {
        setFriendName(userName);
      }
    };

    // Listen for user leave events
    const handleUserLeft = ({ userId }: { userId: string }) => {
      if (userId !== COLLABMAN.getUserId()) {
        setFriendName(null);
      }
    };

    // Listen for apply events from remote users
    const handleApplyTriggered = ({ deck, userId, immediate }: { deck: 'a' | 'b'; userId: string; timestamp: number; immediate: boolean }) => {
      if (userId !== COLLABMAN.getUserId()) {
        // Add a small delay to ensure code sync has completed
        setTimeout(() => {
          // Trigger proper apply that matches the Deck component's flow
          if (deck === 'a') {
            handleRemoteApplyA(immediate).catch(console.error);
          } else if (deck === 'b') {
            handleRemoteApplyB(immediate).catch(console.error);
          }
        }, 100); // Small delay to ensure code sync completes first
      }
    };


    // Subscribe to collaboration events
    COLLABMAN.on('connectionStatusChange', handleConnectionStatusChange);
    COLLABMAN.on('codeChange', handleCodeChange);
    COLLABMAN.on('applyTriggered', handleApplyTriggered);
    COLLABMAN.on('userJoined', handleUserJoined);
    COLLABMAN.on('userLeft', handleUserLeft);

    return () => {
      // Cleanup event listeners
      COLLABMAN.off('connectionStatusChange', handleConnectionStatusChange);
      COLLABMAN.off('codeChange', handleCodeChange);
      COLLABMAN.off('applyTriggered', handleApplyTriggered);
      COLLABMAN.off('userJoined', handleUserJoined);
      COLLABMAN.off('userLeft', handleUserLeft);
    };
  }, [setStatus, setRoomCode, setFriendName, deckACode, deckBCode, setDeckACode, setDeckBCode, deckA, deckB, handleRemoteApplyA, handleRemoteApplyB]);

  // Send local Deck A code changes to remote users
  useEffect(() => {
    if (COLLABMAN.isConnected() && deckACode !== COLLABMAN.getCurrentCode('a')) {
      // Reduced debounce for more responsive collaboration
      const timeoutId = setTimeout(() => {
        COLLABMAN.updateCode('a', deckACode).catch(console.error);
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [deckACode]);

  // Send local Deck B code changes to remote users
  useEffect(() => {
    if (COLLABMAN.isConnected() && deckBCode !== COLLABMAN.getCurrentCode('b')) {
      // Reduced debounce for more responsive collaboration
      const timeoutId = setTimeout(() => {
        COLLABMAN.updateCode('b', deckBCode).catch(console.error);
      }, 150);

      return () => clearTimeout(timeoutId);
    }
  }, [deckBCode]);
}