import { useRef, useState } from 'preact/hooks'
import styled, { createGlobalStyle } from 'styled-components'
import { TrippyVideoCanvas } from './TrippyVideoCanvas'
import { VHSOverlay } from './VHSOverlay'
import { VideoProcessor } from './VideoProcessor'
import Slider from 'rc-slider'
import 'rc-slider/assets/index.css'

const GlobalStyle = createGlobalStyle`
  body {
    background: #000;
    color: #fff;
    overflow: hidden;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
`

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;
`

const VideoSection = styled.div`
  width: 95%;
  max-width: 1300px;
  aspect-ratio: 16/9;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`

const Controls = styled.div`
  width: 95%;
  max-width: 1300px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  
  label {
    font-size: 14px;
    opacity: 0.9;
  }
`

const FileInputWrapper = styled.div`
  margin-bottom: 20px;
  
  input {
    display: none;
  }
  
  label {
    padding: 10px 20px;
    background: #333;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
    margin-bottom: -20px;
    
    &:hover {
      background: #444;
    }
  }
`

const PlayPauseButton = styled.button`
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  color: white;
  cursor: pointer;
  z-index: 10;
  
  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`

const ButtonsContainer = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
`;

const ActionButton = styled.button`
  padding: 10px 20px;
  background: #333;
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
  
  &:hover {
    background: #444;
  }
  
  &.active {
    background: #555;
    box-shadow: inset 0 0 5px rgba(0,0,0,0.3);
  }
`;

const ProcessingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  z-index: 100;
`;

const defaultEffects = {
  waveIntensity: 0.02,
  waveFrequency: 40,
  colorShift: 0,
  speed: 2,
  glitchAmount: 0,
  scanlineIntensity: 0.1,
  staticAmount: 0.05,
  trackingNoiseAmount: 0.1,
  chromaticAberration: 0.002,
  verticalJitter: 0.001
};

export function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showVHSOverlay, setShowVHSOverlay] = useState(false)
  const [videoTime, setVideoTime] = useState({ current: 0, duration: 0 })
  const [effects, setEffects] = useState(defaultEffects)
  const [isProcessing, setIsProcessing] = useState(false)
  const [iFrameInterval, setIFrameInterval] = useState(12)
  const videoProcessor = useRef<VideoProcessor | null>(null)

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files[0]) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
      const url = URL.createObjectURL(target.files[0])
      setVideoUrl(url)
      setIsPlaying(true)
    }
  }

  const updateEffect = (name: keyof typeof effects, value: number) => {
    setEffects(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const resetEffects = () => {
    setEffects({
      waveIntensity: 0,
      waveFrequency: 0,
      colorShift: 0,
      speed: 0,
      glitchAmount: 0,
      scanlineIntensity: 0,
      staticAmount: 0,
      trackingNoiseAmount: 0,
      chromaticAberration: 0,
      verticalJitter: 0
    });
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    setVideoTime({ current: currentTime, duration });
  };

  const datamoshCurrentVideo = async () => {
    if (!videoUrl) return;
    
    setIsProcessing(true);
    setIsPlaying(false);
    
    try {
      if (!videoProcessor.current) {
        videoProcessor.current = new VideoProcessor();
      }

      // Fetch the current video as a blob
      const response = await fetch(videoUrl);
      const videoBlob = await response.blob();

      // Process the video
      const mosheddBlob = await videoProcessor.current.datamoshVideo(videoBlob, iFrameInterval);

      // Clean up old URL and create new one
      URL.revokeObjectURL(videoUrl);
      const newUrl = URL.createObjectURL(mosheddBlob);
      setVideoUrl(newUrl);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error during datamoshing:', error);
      alert('Failed to process video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <GlobalStyle />
      <AppContainer>
        <ButtonsContainer>
          <FileInputWrapper>
            <input
              type="file"
              id="videoInput"
              accept="video/*"
              onChange={handleFileChange}
            />
            <label htmlFor="videoInput">
              {videoUrl ? 'Change Video' : 'Select Video'}
            </label>
          </FileInputWrapper>
          <ActionButton onClick={resetEffects}>
            Reset Effects
          </ActionButton>
          <ActionButton 
            className={showVHSOverlay ? 'active' : ''} 
            onClick={() => setShowVHSOverlay(!showVHSOverlay)}
          >
            VHS Display
          </ActionButton>
          {videoUrl && (
            <ActionButton onClick={datamoshCurrentVideo}>
              Datamosh Video
            </ActionButton>
          )}
        </ButtonsContainer>

        <VideoSection>
          {videoUrl && (
            <>
              <TrippyVideoCanvas
                key={videoUrl}
                videoUrl={videoUrl}
                isPlaying={isPlaying}
                effects={effects}
                onTimeUpdate={handleTimeUpdate}
              />
              {showVHSOverlay && (
                <VHSOverlay
                  isPlaying={isPlaying}
                  currentTime={videoTime.current}
                  videoDuration={videoTime.duration}
                />
              )}
              {isProcessing && (
                <ProcessingOverlay>
                  Processing video... This may take a moment.
                </ProcessingOverlay>
              )}
              <PlayPauseButton onClick={togglePlayPause}>
                {isPlaying ? 'Pause' : 'Play'}
              </PlayPauseButton>
            </>
          )}
        </VideoSection>

        <Controls>
          <ControlGroup>
            <label>Wave Intensity</label>
            <Slider
              min={0}
              max={0.1}
              step={0.001}
              value={effects.waveIntensity}
              onChange={(v) => updateEffect('waveIntensity', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>
          
          <ControlGroup>
            <label>Wave Frequency</label>
            <Slider
              min={1}
              max={100}
              step={1}
              value={effects.waveFrequency}
              onChange={(v) => updateEffect('waveFrequency', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>
          
          <ControlGroup>
            <label>Color Shift</label>
            <Slider
              min={0}
              max={6.28}
              step={0.01}
              value={effects.colorShift}
              onChange={(v) => updateEffect('colorShift', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>
          
          <ControlGroup>
            <label>Speed</label>
            <Slider
              min={0.1}
              max={10}
              step={0.1}
              value={effects.speed}
              onChange={(v) => updateEffect('speed', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>
          
          <ControlGroup>
            <label>Glitch Amount</label>
            <Slider
              min={0}
              max={0.2}
              step={0.001}
              value={effects.glitchAmount}
              onChange={(v) => updateEffect('glitchAmount', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>

          <ControlGroup>
            <label>Scanline Intensity</label>
            <Slider
              min={0}
              max={0.5}
              step={0.01}
              value={effects.scanlineIntensity}
              onChange={(v) => updateEffect('scanlineIntensity', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>

          <ControlGroup>
            <label>Static Amount</label>
            <Slider
              min={0}
              max={0.2}
              step={0.01}
              value={effects.staticAmount}
              onChange={(v) => updateEffect('staticAmount', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>

          <ControlGroup>
            <label>Tracking Noise</label>
            <Slider
              min={0}
              max={0.5}
              step={0.01}
              value={effects.trackingNoiseAmount}
              onChange={(v) => updateEffect('trackingNoiseAmount', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>

          <ControlGroup>
            <label>Chromatic Aberration</label>
            <Slider
              min={0}
              max={0.01}
              step={0.0001}
              value={effects.chromaticAberration}
              onChange={(v) => updateEffect('chromaticAberration', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>

          <ControlGroup>
            <label>Vertical Jitter</label>
            <Slider
              min={0}
              max={0.005}
              step={0.0001}
              value={effects.verticalJitter}
              onChange={(v) => updateEffect('verticalJitter', Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>

          <ControlGroup>
            <label>I-Frame Interval (Datamosh Intensity)</label>
            <Slider
              min={2}
              max={30}
              step={1}
              value={iFrameInterval}
              onChange={(v) => setIFrameInterval(Array.isArray(v) ? v[0] : v)}
            />
          </ControlGroup>
        </Controls>
      </AppContainer>
    </>
  )
}
