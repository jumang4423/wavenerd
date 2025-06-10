import styled from "styled-components";
import { useSetAtom, useAtomValue } from "jotai";
import { useCallback, useState, useEffect, useRef } from "react";
import {
  settingsCategoryAtom,
  settingsIsOpeningAtom,
} from "../../stores/atoms/settings";
import { deckBPMAtom, deckBeatsAtom } from "../../stores/atoms/deck";
import { BeatManager } from "@0b5vr/wavenerd-deck";

const coolestFunctions = [
  "Wavenerd", // 0
  "forest", // 1
  "-shotgun-",
  "--cyclic--",
  "cheapnoise",
  "boxMuller",
  "ladderLPF",
  "t2sSwing",
  "s2tSwing",
  "--seq16--",
  "--quant--",
  "---p2f---",
  "---cis---",
  "-rotate2D-",
  "-orthBas-",
  "--hash3u--",
  "--hash3f--",
  "---tmod---",
  "---tri---",
  "linearstep",
  "--clip--",
  "-saturate-",
  "---lofi---",
  "---u2b---",
  "---b2u---",
  "--repeat--",
  "--SWING--",
  "---LN2---",
  "----PI----",
  "---TAU---",
  "-boxMuller-",
  "--tmod--",
  "-t2sSwing-",
  "-s2tSwing-",
  "--seq16--",
  "--quant--",
  "---p2f---",
  "-ladderLPF-",
  "-shotgun-",
  "-orthBas-",
];

const Logo = styled.div`
  font:
    700 24px "Inter",
    sans-serif;
  line-height: 1;
  cursor: pointer;
  color: white;
  width: 140px;
  justify-content: center;
  align-items: center;
  display: flex;

  @keyframes rainbow {
    0% {
      background-position: 0% 50%;
    }
    100% {
      background-position: 135% 50%;
    }
  }

  &:hover {
    opacity: 0.8;
  }
`;

export function HeaderLogo() {
  const setSettingsOpening = useSetAtom(settingsIsOpeningAtom);
  const setSettingsCategory = useSetAtom(settingsCategoryAtom);
  const [currentFunctionIndex, setCurrentFunctionIndex] = useState(0);
  const { beat, bar, sixteenBar } = useAtomValue(deckBeatsAtom);
  const bpm = useAtomValue(deckBPMAtom);
  const prevBeatRef = useRef(0);

  const detectPulse = useCallback(
    (beat: number, prevBeat: number) => {
      const delta = beat - prevBeat;
      const beatSeconds = BeatManager.CalcBeatSeconds(bpm);
      const beatThreshold = beatSeconds * 0.5;
      const barSeconds = BeatManager.CalcBarSeconds(bpm);
      const beatCount = 1 + Math.floor((4.0 * bar) / barSeconds);
      const sixteenBarSeconds = BeatManager.CalcSixteenBarSeconds(bpm);
      const barCount = 1 + Math.floor((16.0 * sixteenBar) / sixteenBarSeconds);

      return {
        isPulse: delta < -beatThreshold,
        beatCount,
        barCount,
        isHead: (barCount - 1) % 4 === 0,
      };
    },
    [bpm, bar, sixteenBar]
  );

  useEffect(() => {
    const prevBeat = prevBeatRef.current;
    const { isPulse, beatCount, barCount, isHead } = detectPulse(
      beat,
      prevBeat
    );

    if (isPulse) {
      const newRandomIndex =
        2 + Math.floor(Math.random() * (coolestFunctions.length - 2));
      if (isHead) {
        setCurrentFunctionIndex(1);
      } else {
        setCurrentFunctionIndex(beatCount % 2 === 0 ? newRandomIndex : 0);
      }
    }

    prevBeatRef.current = beat;
  }, [beat, detectPulse]);

  const handleClick = useCallback(() => {
    setSettingsOpening(true);
    setSettingsCategory("about");
  }, [setSettingsOpening, setSettingsCategory]);

  return (
    <Logo onClick={handleClick}>
      {currentFunctionIndex === 1 ? (
        <img
          src="/forest.jpg"
          alt="Wavenerd"
          style={{ width: "140px", height: "40px" }}
          loading="lazy"
        />
      ) : (
        coolestFunctions[currentFunctionIndex]
      )}
    </Logo>
  );
}
