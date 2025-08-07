"use client";
import { useEffect, useState, useRef } from "react";

export default function VoiceRecorder({
  onTranscript,
  onRecordingStateChange,
  disabled,
}) {
  const [isSupported, setIsSupported] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isRestartingRef = useRef(false);

  useEffect(() => {
    const speechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!speechRecognition);
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Send transcript to parent - live updates when recording, or when paused/stopped
  useEffect(() => {
    const combinedTranscript = finalTranscript + interimTranscript;
    if (onTranscript) {
      onTranscript(combinedTranscript);
    }
  }, [finalTranscript, interimTranscript, onTranscript]);

  const startRecording = () => {
    if (!isSupported) {
      alert("Speech recognition not supported");
      return;
    }

    if (disabled) return;

    try {
      const speechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new speechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        if (!isRestartingRef.current) {
          setIsRecording(true);
          setIsPaused(false);
          onRecordingStateChange?.(true);
        }
        isRestartingRef.current = false;
      };

      recognition.onend = () => {
        // Auto-restart if we're still supposed to be recording (not paused or stopped)
        if (isRecording && !isPaused && !isRestartingRef.current) {
          isRestartingRef.current = true;
          setTimeout(() => {
            if (recognitionRef.current && isRecording && !isPaused) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log("Recognition restart failed:", e);
              }
            }
          }, 100);
        }
      };

      recognition.onresult = (event) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript + " ";
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          setFinalTranscript((prev) => prev + final);
          setInterimTranscript("");
        } else {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          alert(
            "Microphone access denied. Please allow microphone access and try again."
          );
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Error starting the recording");
      setIsRecording(false);
      onRecordingStateChange?.(false);
    }
  };

  const pauseRecording = () => {
    setIsPaused(true);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const resumeRecording = () => {
    setIsPaused(false);
    // When resuming, we keep the existing finalTranscript and just continue adding to it
    startRecording();
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    onRecordingStateChange?.(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Clear all transcripts (called from parent)
  const clearTranscript = () => {
    setFinalTranscript("");
    setInterimTranscript("");
  };

  // Expose clear function to parent via callback
  useEffect(() => {
    // This allows parent to clear transcript after sending message
    window.clearVoiceTranscript = clearTranscript;
    return () => {
      delete window.clearVoiceTranscript;
    };
  }, []);

  const handleClick = () => {
    if (isRecording) {
      if (isPaused) {
        resumeRecording();
      } else {
        pauseRecording();
      }
    } else {
      // Start new recording - clear previous transcript
      setFinalTranscript("");
      setInterimTranscript("");
      setRecordingTime(0);
      startRecording();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getIcon = () => {
    if (isRecording && isPaused) {
      return (
        <img src="mic-closed.png" width={20} alt="Paused - Click to resume" />
      );
    } else if (isRecording) {
      return (
        <div className="relative">
          <img src="mic-on.png" width={20} alt="Recording - Click to pause" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      );
    } else {
      return <img src="mic-black.png" width={20} alt="Start recording" />;
    }
  };

  const getTitle = () => {
    if (disabled) return "Please wait...";
    if (isRecording && isPaused) return "Resume recording";
    if (isRecording) return "Pause recording";
    return "Start recording";
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`relative ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-110 transition-transform"}`}
        title={getTitle()}
      >
        {getIcon()}
      </button>

      {isRecording && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1 flex items-center gap-2 whitespace-nowrap z-10">
          <button
            type="button"
            onClick={stopRecording}
            className="text-red-600 hover:text-red-800 text-xs px-1 py-0.5 rounded hover:bg-red-50"
            title="Stop recording"
          >
            Stop
          </button>

          <span className="text-xs text-gray-600">
            {formatTime(recordingTime)}
          </span>
        </div>
      )}
    </div>
  );
}
