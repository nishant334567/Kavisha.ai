"use client";
import { useEffect, useState, useRef } from "react";

export default function VoiceRecorder({
  onTranscript,
  onRecordingStateChange,
  disabled,
}) {
  const [isSupported, setIsSupported] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  useEffect(() => {
    const speechRecognition =
      window.speechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!speechRecognition);
  }, []);

  const startRecording = () => {
    if (!isSupported) {
      alert("Speech recognition not supported");
      return;
    }

    if (disabled) {
      return;
    }

    try {
      const speechRecognition =
        window.speechRecognition || window.webkitSpeechRecognition;
      const recognition = new speechRecognition();
      recognition.onstart = () => {
        setIsRecording(true);
        onRecordingStateChange?.(true);
      };
      recognition.onend = () => {
        setIsRecording(false);
        onRecordingStateChange?.(false);
      };
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        onTranscript(transcript);
      };
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      alert("Error starting the recording");
      setIsRecording(false);
      onRecordingStateChange?.(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    onRecordingStateChange?.(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };
  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getIcon = () => {
    if (isRecording) {
      return <img src="mic-on.png" width={20} alt="Recording..." />;
    } else {
      return <img src="mic-black.png" width={20} alt="Start recording" />;
    }
  };
  return (
    <>
      <div>
        <button
          onClick={() => handleClick()}
          disabled={disabled}
          className={`${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-110 transition-transform"}`}
          title={
            disabled
              ? "Please wait..."
              : isRecording
                ? "Stop recording"
                : "Start recording"
          }
        >
          {getIcon()}
        </button>
      </div>
    </>
  );
}
