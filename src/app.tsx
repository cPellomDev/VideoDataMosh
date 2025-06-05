import { useRef, useState } from 'preact/hooks'
import styled, { createGlobalStyle } from 'styled-components'
import { TrippyVideoCanvas } from './TrippyVideoCanvas'
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
  width: 85%;
  max-width: 1200px;
  aspect-ratio: 16/9;
  background: #111;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
`

const Controls = styled.div`
  width: 85%;
  max-width: 1200px;
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
  gap: 10px;
  
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

export function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [effects, setEffects] = useState({
    waveIntensity: 0.02,
    waveFrequency: 40,
    colorShift: 0,
    speed: 2,
    glitchAmount: 0
  })

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

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <>
      <GlobalStyle />
      <AppContainer>
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

        <VideoSection>
          {videoUrl && (
            <>
              <TrippyVideoCanvas
                key={videoUrl}
                videoUrl={videoUrl}
                isPlaying={isPlaying}
                effects={effects}
              />
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
        </Controls>
      </AppContainer>
    </>
  )
}
