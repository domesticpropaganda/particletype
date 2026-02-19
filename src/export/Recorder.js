export class Recorder {
  constructor(renderer, particleSystem, animationEngine) {
    this.renderer = renderer;
    this.particleSystem = particleSystem;
    this.animationEngine = animationEngine;
    this.isRecording = false;
    this.recordedFrames = [];
    this.mediaRecorder = null;
    this.recordedBlobs = [];

    this.options = {
      format: 'webm', // 'webm' or 'frames'
      fps: 60,
      quality: 0.95,
      duration: null // null = use animation duration
    };
  }

  async startRecording(options = {}) {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    this.options = { ...this.options, ...options };
    this.isRecording = true;
    this.recordedFrames = [];
    this.recordedBlobs = [];

    if (this.options.format === 'webm') {
      await this.startWebMRecording();
    } else if (this.options.format === 'frames') {
      await this.startFrameRecording();
    }
  }

  async startWebMRecording() {
    const canvas = this.renderer.renderer.domElement;

    // Create media stream from canvas
    const stream = canvas.captureStream(this.options.fps);

    // Setup MediaRecorder
    const options = {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000 // 8 Mbps
    };

    // Fallback to vp8 if vp9 not supported
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'video/webm;codecs=vp8';
    }

    this.mediaRecorder = new MediaRecorder(stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedBlobs.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.saveWebMVideo();
      this.isRecording = false;
    };

    // Start recording
    this.mediaRecorder.start(100); // Collect data every 100ms

    // Play animation
    this.animationEngine.stop();
    this.animationEngine.play();

    // Stop recording after animation duration
    const duration = this.options.duration || this.animationEngine.getDuration();
    setTimeout(() => {
      this.stopRecording();
    }, duration * 1000);
  }

  async startFrameRecording() {
    const canvas = this.renderer.renderer.domElement;
    const duration = this.options.duration || this.animationEngine.getDuration();
    const fps = this.options.fps;
    const totalFrames = Math.ceil(duration * fps);
    const frameDuration = 1 / fps;

    // Reset animation
    this.animationEngine.stop();

    // Capture frames
    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame * frameDuration;

      // Seek to time
      this.animationEngine.seek(time);

      // Force render
      this.particleSystem.update();
      this.renderer.render();

      // Capture frame
      const dataURL = canvas.toDataURL('image/png', this.options.quality);
      this.recordedFrames.push({
        frame,
        time,
        dataURL
      });

      // Progress callback
      if (this.onProgress) {
        this.onProgress(frame + 1, totalFrames);
      }

      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Save frames
    this.saveFrameSequence();
    this.isRecording = false;
  }

  stopRecording() {
    if (!this.isRecording) return;

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    } else {
      this.isRecording = false;
    }
  }

  saveWebMVideo() {
    const blob = new Blob(this.recordedBlobs, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `3dtype-animation-${Date.now()}.webm`;
    link.click();

    URL.revokeObjectURL(url);
    this.recordedBlobs = [];
  }

  saveFrameSequence() {
    // Create zip would require JSZip library
    // For now, download frames individually
    // In a production app, you'd bundle them into a zip

    if (this.recordedFrames.length === 0) return;

    // For demo purposes, download first and last frame
    // In production, you'd want to zip all frames
    const framesToDownload = [
      this.recordedFrames[0],
      this.recordedFrames[Math.floor(this.recordedFrames.length / 2)],
      this.recordedFrames[this.recordedFrames.length - 1]
    ];

    framesToDownload.forEach((frame, i) => {
      const link = document.createElement('a');
      link.href = frame.dataURL;
      link.download = `3dtype-frame-${String(frame.frame).padStart(4, '0')}.png`;

      // Delay downloads slightly to avoid browser blocking
      setTimeout(() => {
        link.click();
      }, i * 200);
    });

    alert(`Captured ${this.recordedFrames.length} frames. Downloading sample frames (first, middle, last).\nNote: Full frame sequence export would require JSZip library.`);

    this.recordedFrames = [];
  }

  captureScreenshot() {
    const canvas = this.renderer.renderer.domElement;
    const dataURL = canvas.toDataURL('image/png', 1.0);

    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `3dtype-screenshot-${Date.now()}.png`;
    link.click();
  }

  getIsRecording() {
    return this.isRecording;
  }
}
