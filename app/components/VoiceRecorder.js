import { useState, useRef, useEffect } from "react";

const VoiceRecorder = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startRecording = () => {
    if (!isSupported) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Basic configuration
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        console.log("🎤 Recording started");
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("🎤 Transcript:", transcript);
        onTranscript(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          alert("No speech detected. Please try again.");
        } else if (event.error === "not-allowed") {
          alert(
            "Microphone permission denied. Please allow microphone access."
          );
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        console.log("🎤 Recording ended");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Error starting voice recording");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
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

  if (!isSupported) {
    return (
      <button
        type="button"
        className="absolute right-10 top-1/2 -translate-y-1/2 p-0 bg-transparent border-none opacity-50 cursor-not-allowed"
        title="Voice recording not supported"
        disabled
      >
        <img src="mic-black.png" width={20} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`absolute right-10 top-1/2 -translate-y-1/2 p-0 bg-transparent border-none ${
        isRecording ? "text-red-500" : ""
      }`}
      title={isRecording ? "Stop recording" : "Start voice recording"}
      onClick={handleClick}
    >
      <img
        src={isRecording ? "mic-on.png" : "mic-black.png"}
        width={20}
        alt={isRecording ? "Recording" : "Record"}
      />
    </button>
  );
};

export default VoiceRecorder;
