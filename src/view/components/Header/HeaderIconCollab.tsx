import { useCallback } from 'react';
import { useAtom } from 'jotai';
import styled from 'styled-components';
import IconAccountMultiple from '~icons/mdi/account-multiple';
import { headerIconStyle } from './headerIconStyle';
import { collaborationStatusAtom, collaborationModalAtom, collaborationFriendNameAtom } from '../../stores/atoms/collaboration';

const StyledIcon = styled(IconAccountMultiple)`
  ${headerIconStyle}
`;

export function HeaderIconCollab() {
  const [status] = useAtom(collaborationStatusAtom);
  const [, setModalOpen] = useAtom(collaborationModalAtom);
  const [friendName] = useAtom(collaborationFriendNameAtom);

  const handleClick = useCallback(() => {
    setModalOpen(true);
  }, [setModalOpen]);

  const getOpacity = () => {
    switch (status) {
      case 'connected':
      case 'hosting':
        return 1.0;
      case 'connecting':
        return 0.7;
      case 'error':
        return 0.4;
      default:
        return 0.5;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'connected':
      case 'hosting':
        return '#4CAF50'; // Green
      case 'connecting':
        return '#FF9800'; // Orange
      case 'error':
        return '#F44336'; // Red
      default:
        return undefined; // Default theme color
    }
  };

  const getTooltip = () => {
    switch (status) {
      case 'connected':
        return `Connected to ${friendName || 'friend'}`;
      case 'hosting':
        return 'Hosting collaboration session';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection error - click to retry';
      default:
        return 'Start collaboration';
    }
  };

  return (
    <StyledIcon
      onClick={handleClick}
      style={{ 
        opacity: getOpacity(),
        color: getColor(),
      }}
      data-stalker={getTooltip()}
    />
  );
}