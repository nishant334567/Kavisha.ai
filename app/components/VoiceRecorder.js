"use client";
import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

const VoiceTranscriptModel = (
  { transcript, handler, onRecordingStateChange, onSubmit },
  ref
) => {
  const [recordingStatus, setRecordingstatus] = useState("none");
  const recognitionRef = useRef(null);
  const finalRef = useRef("");
  const endIntentRef = useRef(null);
  const isActiveRef = useRef(false);

  useEffect(() => {
    onRecordingStateChange?.(recordingStatus);
  }, [recordingStatus, onRecordingStateChange]);

  useImperativeHandle(ref, () => ({
    clearVoice: () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {}
      handler("");
      finalRef.current = "";
      setRecordingstatus("none");
      isActiveRef.current = false;
      recognitionRef.current = null;
      endIntentRef.current = null;
    },
  }));

  const ensureRecognition = () => {
    if (recognitionRef.current) return recognitionRef.current;
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (e) => {
      let interimResults = "";
      let finalResults = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalResults += result[0].transcript + " ";
        } else {
          interimResults += result[0].transcript;
        }
      }
      finalRef.current += finalResults;
      if (isActiveRef.current) {
        handler(finalRef.current + interimResults);
      }
    };

    recognition.onstart = () => {
      isActiveRef.current = true;
      setRecordingstatus("on");
    };

    recognition.onend = () => {
      isActiveRef.current = false;
      const intent = endIntentRef.current;
      if (intent === "pause") {
        setRecordingstatus("pause");
      } else if (intent === "stop") {
        if (!finalRef.current.trim()) {
          handler("");
          setRecordingstatus("none");
        } else {
          setRecordingstatus("stop");
        }
      } else if (intent === "clear") {
        handler("");
        finalRef.current = "";
        setRecordingstatus("none");
      } else {
        setRecordingstatus("pause");
      }
      endIntentRef.current = null;
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const startRecording = () => {
    if (recordingStatus === "none") {
      finalRef.current = "";
      handler("");
    }
    const recognition = ensureRecognition();
    try {
      recognition.start();
    } catch {}
  };

  const pauseRecording = () => {
    if (!recognitionRef.current || !isActiveRef.current) return;
    endIntentRef.current = "pause";
    try {
      recognitionRef.current.stop();
    } catch {
      recognitionRef.current.abort?.();
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current || !isActiveRef.current) return;
    endIntentRef.current = "stop";
    try {
      recognitionRef.current.stop();
    } catch {
      recognitionRef.current.abort?.();
    }
  };

  const resumeRecording = () => {
    if (finalRef.current) {
      handler(finalRef.current);
    }
    startRecording();
  };

  const clearRecording = () => {
    endIntentRef.current = "clear";
    if (recognitionRef.current && isActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        recognitionRef.current.abort?.();
      }
    }
    handler("");
    finalRef.current = "";
    setRecordingstatus("none");
    isActiveRef.current = false;
  };

  const submitFromRecorder = () => {
    const text = finalRef.current.trim();
    if (!text) return;
    onSubmit?.(text);
    handler("");
    finalRef.current = "";
    setRecordingstatus("none");
    isActiveRef.current = false;
    try {
      recognitionRef.current?.abort?.();
    } catch {}
    recognitionRef.current = null;
  };

  const handleMicClick = () => {
    if (recordingStatus === "none") startRecording();
  };

  return (
    <>
      {recordingStatus === "on" && (
        <div>
          <button type="button" onClick={pauseRecording}>
            <img src="pause.png" width={20} />
          </button>
          <button type="button" onClick={stopRecording}>
            <img src="stop.png" width={20} />
          </button>
        </div>
      )}

      {recordingStatus === "pause" && (
        <div className="flex gap-2">
          <button type="button" onClick={resumeRecording}>
            <img src="play.png" width={20} />
          </button>
          {transcript && (
            <button type="button" onClick={clearRecording}>
              <img src="bin.png" height={20} width={20} />
            </button>
          )}
          {transcript && (
            <button type="button" onClick={submitFromRecorder}>
              <img src="message.png" height={20} width={20} />
            </button>
          )}
        </div>
      )}

      {recordingStatus === "stop" && (
        <div className="gap-2">
          {transcript && (
            <button type="button" onClick={clearRecording}>
              <img src="bin.png" height={20} width={20} />
            </button>
          )}
          {transcript && (
            <button type="button" onClick={submitFromRecorder}>
              <img src="message.png" height={20} width={20} />
            </button>
          )}
        </div>
      )}

      {recordingStatus === "none" && (
        <button type="button" onClick={handleMicClick}>
          <img src="mic-closed.png" width={20} />
        </button>
      )}
    </>
  );
};

export default forwardRef(VoiceTranscriptModel);
