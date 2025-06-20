import { useEffect, useState } from 'preact/hooks';
import styled from 'styled-components';

const OverlayContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-family: "VT323", monospace;
  color: #fff;
  text-shadow: 2px 2px 0 rgba(0,0,0,0.5);
`;

const PlayText = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  font-size: 48px;
  letter-spacing: 2px;
`;

const TimerText = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  font-size: 36px;
  letter-spacing: 1px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  
  .timestamp {
    font-size: 48px;
    margin-bottom: -8px;
  }
  
  .sp {
    font-size: 32px;
    opacity: 0.9;
  }
`;

interface VHSOverlayProps {
  isPlaying: boolean;
  videoDuration: number;
  currentTime: number;
}

export function VHSOverlay({ isPlaying, videoDuration, currentTime }: VHSOverlayProps) {
  const [timeDisplay, setTimeDisplay] = useState("-0:00:00");

  useEffect(() => {
    // Convert time to VHS display format
    const formatTime = (timeInSeconds: number) => {
      const hours = Math.floor(timeInSeconds / 3600);
      const minutes = Math.floor((timeInSeconds % 3600) / 60);
      const seconds = Math.floor(timeInSeconds % 60);
      
      return `-${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    setTimeDisplay(formatTime(videoDuration - currentTime));
  }, [currentTime, videoDuration]);

  return (
    <OverlayContainer>
      <PlayText>{isPlaying ? 'PLAY' : 'STOP'}</PlayText>
      <TimerText>
        <div className="timestamp">{timeDisplay}</div>
        <div className="sp">SP</div>
      </TimerText>
    </OverlayContainer>
  );
} 