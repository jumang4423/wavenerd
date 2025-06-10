import { useState, useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import styled from "styled-components";
import { Modal } from "./Modal";
import { ThemeVars } from "../themes/ThemeVars";
import { COLLABMAN } from "../../CollaborationManager";
import {
  collaborationModalAtom,
  collaborationStatusAtom,
  collaborationRoomCodeAtom,
} from "../stores/atoms/collaboration";
import { deckACodeAtom, deckBCodeAtom } from "../stores/atoms/deck";
import { SettingsItemBase } from "./Settings/SettingsItemBase";
import { SettingsItemButton } from "./Settings/SettingsItemButton";
import SimpleBar from "simplebar-react";

// == styles =======================================================================================
const Content = styled(SimpleBar)`
  display: flex;
  flex-direction: column;
  height: 480px;
`;

const VR = styled.div`
  background: ${ThemeVars.gray};
`;

const Root = styled.div`
  display: grid;
  width: 720px;
  grid-template-columns: 120px 1px 1fr;
  gap: 8px;
`;

const SideMenu = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MenuItem = styled.button<{ active: boolean }>`
  background: ${(props) => (props.active ? ThemeVars.accent : "transparent")};
  color: ${(props) => (props.active ? ThemeVars.white : ThemeVars.modalFg)};
  border: none;
  padding: 8px 12px;
  text-align: left;
  cursor: pointer;
  font-size: 12px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: ${(props) =>
      props.active ? ThemeVars.accent : ThemeVars.back3};
  }
`;

const RoomCodeDisplay = styled.div`
  background: ${ThemeVars.back1};
  border: 1px solid ${ThemeVars.gray};
  border-radius: 4px;
  padding: 4px;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  color: ${ThemeVars.accent};
  letter-spacing: 1px;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  background: ${ThemeVars.inputBack};
  border: 1px solid ${ThemeVars.gray};
  border-radius: 4px;
  padding: 4px 8px;
  color: ${ThemeVars.inputFore};
  font:
    12px "Roboto Mono",
    monospace;
  width: 120px;

  &:focus {
    outline: none;
    border-color: ${ThemeVars.accent};
  }
`;

const StatusIndicator = styled.div<{
  status: "solo" | "hosting" | "connected" | "connecting" | "error";
}>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  background: ${(props) => {
    switch (props.status) {
      case "hosting":
      case "connected":
        return "#4CAF50";
      case "connecting":
        return "#FF9800";
      case "error":
        return "#F44336";
      default:
        return ThemeVars.gray;
    }
  }};
`;

const InfoSection = styled.div`
  background: ${ThemeVars.back3};
  border-radius: 4px;
  padding: 12px;
  margin: 16px 0;
  font-size: 12px;
  line-height: 1.4;
  color: ${ThemeVars.foresub};
`;

const InfoTitle = styled.div`
  color: ${ThemeVars.accent};
  font-weight: bold;
  margin-bottom: 8px;
`;

const CopyButton = styled.button`
  background: ${ThemeVars.modalFg};
  color: ${ThemeVars.modalBg};
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font:
    12px "Inter",
    sans-serif;
  cursor: pointer;
`;

// == component ====================================================================================
export function CollaborationModal() {
  const [isOpen, setIsOpen] = useAtom(collaborationModalAtom);
  const [status, setStatus] = useAtom(collaborationStatusAtom);
  const [roomCode, setRoomCode] = useAtom(collaborationRoomCodeAtom);
  const [deckACode] = useAtom(deckACodeAtom);
  const [deckBCode] = useAtom(deckBCodeAtom);

  const [activeTab, setActiveTab] = useState<"host" | "join">("host");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [hostingRoomCode, setHostingRoomCode] = useState<string | null>(null);
  const [connectedUsers, setConnectedUsers] = useState(0);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  // Reset hosting room code when status changes to solo
  useEffect(() => {
    if (status === "solo") {
      setHostingRoomCode(null);
      setConnectedUsers(0);
    }
  }, [status]);

  // Listen for collaboration events to track user count
  useEffect(() => {
    const handleUserJoined = () => {
      setConnectedUsers((prev) => prev + 1);
    };

    const handleUserLeft = () => {
      setConnectedUsers((prev) => Math.max(0, prev - 1));
    };

    const handleConnectionStatusChange = ({
      status,
    }: {
      status: "connected" | "disconnected" | "error";
    }) => {
      if (status === "connected") {
        setConnectedUsers(1); // You + 1 friend
      } else if (status === "disconnected") {
        setConnectedUsers(0);
      }
    };

    COLLABMAN.on("userJoined", handleUserJoined);
    COLLABMAN.on("userLeft", handleUserLeft);
    COLLABMAN.on("connectionStatusChange", handleConnectionStatusChange);

    return () => {
      COLLABMAN.off("userJoined", handleUserJoined);
      COLLABMAN.off("userLeft", handleUserLeft);
      COLLABMAN.off("connectionStatusChange", handleConnectionStatusChange);
    };
  }, []);

  const handleCopyRoomCode = useCallback(() => {
    if (hostingRoomCode) {
      navigator.clipboard.writeText(hostingRoomCode);
    }
  }, [hostingRoomCode]);

  const handleStartHosting = useCallback(async () => {
    try {
      setStatus("hosting");
      const roomCode = await COLLABMAN.hostRoom(deckACode, deckBCode);
      setRoomCode(roomCode);
      setHostingRoomCode(roomCode);
      // Don't close modal - let user see the room code and connection status
    } catch (error) {
      console.error("Failed to start hosting:", error);
      setStatus("error");
    }
  }, [setStatus, setRoomCode, deckACode, deckBCode]);

  const handleJoinRoom = useCallback(async () => {
    if (joinRoomCode) {
      try {
        setStatus("connecting");
        await COLLABMAN.joinRoom(joinRoomCode);
        setRoomCode(joinRoomCode);
        setIsOpen(false);
      } catch (error) {
        console.error("Failed to join room:", error);
        setStatus("error");
      }
    }
  }, [joinRoomCode, setStatus, setRoomCode, setIsOpen]);

  if (!isOpen) return null;

  return (
    <Modal onClose={handleClose}>
      <Root>
        <SideMenu>
          <MenuItem
            active={activeTab === "host"}
            onClick={() => setActiveTab("host")}
          >
            Host Session
          </MenuItem>
          <MenuItem
            active={activeTab === "join"}
            onClick={() => setActiveTab("join")}
          >
            Join Session
          </MenuItem>
        </SideMenu>

        <VR />

        <Content>
          <InfoSection>
            <InfoTitle>Real-time Collaboration</InfoTitle>
            <div>
              • <strong>Deck A & B code</strong> - Real-time editing (150ms
              sync)
              <br />• <strong>Compilation</strong> - Auto-compile when friend
              compiles
              <br />• <strong>Apply/Run</strong> - Auto-apply when friend
              applies (Ctrl+R)
              <br />• <strong>Live sync</strong> - See changes as your friend
              types
            </div>
          </InfoSection>

          {activeTab === "host" && (
            <>
              <SettingsItemBase name="Room Code">
                <RoomCodeDisplay>
                  {hostingRoomCode || 'Click "Start Hosting" to generate'}
                  {hostingRoomCode && (
                    <CopyButton onClick={handleCopyRoomCode}>Copy</CopyButton>
                  )}
                </RoomCodeDisplay>
              </SettingsItemBase>

              <SettingsItemBase name="Status">
                <StatusIndicator status={status}>
                  {status === "hosting"
                    ? "Hosting Active"
                    : status === "connected"
                    ? "Connected"
                    : status === "solo"
                    ? "Solo Mode"
                    : status}
                </StatusIndicator>
              </SettingsItemBase>

              <SettingsItemBase name="Connected">
                <div style={{ fontSize: "12px", color: ThemeVars.modalFg }}>
                  {connectedUsers} friend{connectedUsers !== 1 ? "s" : ""}
                  {status === "hosting" &&
                    connectedUsers === 0 &&
                    " (waiting...)"}
                </div>
              </SettingsItemBase>

              <SettingsItemButton
                name="Action"
                label={
                  status === "hosting" ? "Hosting Active" : "Start Hosting"
                }
                onClick={handleStartHosting}
              />
            </>
          )}

          {activeTab === "join" && (
            <>
              <SettingsItemBase name="Room Code">
                <Input
                  type="text"
                  placeholder="ABCD-1234"
                  value={joinRoomCode}
                  onChange={(e) =>
                    setJoinRoomCode(e.target.value.toUpperCase())
                  }
                  maxLength={9}
                />
              </SettingsItemBase>

              <SettingsItemBase name="Status">
                <StatusIndicator status={status}>
                  {status === "connecting"
                    ? "Connecting..."
                    : status === "connected"
                    ? "Connected"
                    : status === "solo"
                    ? "Ready to Join"
                    : status}
                </StatusIndicator>
              </SettingsItemBase>

              {status === "connected" && (
                <SettingsItemBase name="Result">
                  <div style={{ fontSize: "12px", color: "#4CAF50" }}>
                    Successfully joined! Collaborating in real-time
                  </div>
                </SettingsItemBase>
              )}

              <SettingsItemButton
                name="Action"
                label={
                  status === "connecting"
                    ? "Connecting..."
                    : status === "connected"
                    ? "Connected"
                    : "Join Room"
                }
                onClick={handleJoinRoom}
              />
            </>
          )}
        </Content>
      </Root>
    </Modal>
  );
}
