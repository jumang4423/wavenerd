import { useEffect } from 'react';
import { useAtom } from 'jotai';
import { collaborationModalAtom } from '../atoms/collaboration';

export function useCollaborationUrlHandler() {
  const [, setModalOpen] = useAtom(collaborationModalAtom);

  useEffect(() => {
    // Check for room code in URL parameters on mount
    const urlParams = new URLSearchParams(window.location.search);
    const roomCode = urlParams.get('room');
    
    if (roomCode) {
      // Open collaboration modal if room code is present
      setModalOpen(true);
      
      // Remove room parameter from URL without refreshing
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('room');
      window.history.replaceState({}, '', newUrl.pathname + newUrl.search);
    }
  }, [setModalOpen]);
}