import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

export class VideoProcessor {
  private ffmpeg: FFmpeg;
  private initialized: boolean = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  async init() {
    if (!this.initialized) {
      await this.ffmpeg.load();
      this.initialized = true;
    }
  }

  async datamoshVideo(inputVideoBlob: Blob, iFrameInterval: number = 12): Promise<Blob> {
    await this.init();

    // Convert input blob to Uint8Array
    const inputData = await fetchFile(inputVideoBlob);
    
    // Write input file
    await this.ffmpeg.writeFile('input.mp4', inputData);

    // First pass: Convert to raw h264 with controlled I-frame interval
    await this.ffmpeg.exec([
      '-i', 'input.mp4',
      '-c:v', 'libx264',
      '-g', iFrameInterval.toString(), // GOP size (I-frame interval)
      '-keyint_min', iFrameInterval.toString(),
      '-force_key_frames', 'expr:gte(t,n_forced*2)', // Force keyframes every 2 seconds
      '-bf', '0', // Disable B-frames
      '-x264opts', 'scenecut=-1', // Disable scene detection
      '-preset', 'veryslow',
      '-f', 'h264',
      'raw.h264'
    ]);

    // Second pass: Corrupt I-frames by removing them
    const rawData = await this.ffmpeg.readFile('raw.h264');
    if (!(rawData instanceof Uint8Array)) {
      throw new Error('Failed to read raw video data');
    }

    // Find and corrupt I-frames (simplified approach)
    const corruptedData = this.corruptIFrames(rawData);
    await this.ffmpeg.writeFile('corrupted.h264', corruptedData);

    // Final pass: Wrap back into MP4 container
    await this.ffmpeg.exec([
      '-i', 'corrupted.h264',
      '-c:v', 'copy',
      '-movflags', '+faststart',
      'output.mp4'
    ]);

    // Read the final output
    const outputData = await this.ffmpeg.readFile('output.mp4');
    if (!(outputData instanceof Uint8Array)) {
      throw new Error('Failed to read output video');
    }

    // Clean up
    await this.ffmpeg.deleteFile('input.mp4');
    await this.ffmpeg.deleteFile('raw.h264');
    await this.ffmpeg.deleteFile('corrupted.h264');
    await this.ffmpeg.deleteFile('output.mp4');

    return new Blob([outputData], { type: 'video/mp4' });
  }

  private corruptIFrames(data: Uint8Array): Uint8Array {
    // This is a simplified approach to corrupting I-frames
    // In reality, we'd need to properly parse the H.264 NAL units
    const nalStartCode = new Uint8Array([0x00, 0x00, 0x00, 0x01]);
    const iFrameIdentifier = 0x65; // NAL unit type for IDR (I) frames

    let output = new Uint8Array(data.length);
    let outputPos = 0;
    let inIFrame = false;

    for (let i = 0; i < data.length - 4; i++) {
      // Look for NAL start code
      if (data[i] === 0x00 && 
          data[i + 1] === 0x00 && 
          data[i + 2] === 0x00 && 
          data[i + 3] === 0x01) {
        
        // Check NAL unit type
        const nalType = data[i + 4] & 0x1F;
        
        if (nalType === iFrameIdentifier) {
          // Skip this I-frame
          inIFrame = true;
          i += 4; // Skip the start code
          continue;
        } else {
          inIFrame = false;
        }
      }

      if (!inIFrame) {
        output[outputPos++] = data[i];
      }
    }

    // Copy remaining bytes
    while (outputPos < data.length) {
      output[outputPos] = data[outputPos];
      outputPos++;
    }

    return output.slice(0, outputPos);
  }
} 