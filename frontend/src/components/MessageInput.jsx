import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageInput as StreamMessageInput,
  MessageInputFlat,
  useChannelActionContext,
  useMessageComposer,
  useMessageInputContext,
} from "stream-chat-react";
import { MicIcon, MicOffIcon } from "lucide-react";
import toast from "react-hot-toast";
import { captionImageMessage, postGroqPrompt } from "../lib/api";

const messageHasCodeFence = (text) => {
  if (typeof text !== "string") return false;
  return text.includes("```");
};

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const SpeechToTextButton = () => {
  const { textareaRef } = useMessageInputContext("SpeechToTextButton");
  const messageComposer = useMessageComposer();
  const { textComposer } = messageComposer;
  const recognitionRef = useRef(null);
  const baseTextRef = useRef("");
  const finalTranscriptRef = useRef("");

  const [isListening, setIsListening] = useState(false);

  const isSupported = useMemo(() => Boolean(getSpeechRecognition()), []);

  const setComposerText = (nextText) => {
    // Stream uses an internal text composer store; update it directly.
    const selectionEnd = nextText.length;
    textComposer.handleChange({
      text: nextText,
      selection: { start: selectionEnd, end: selectionEnd },
    });
  };

  const stop = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    setIsListening(false);
  };

  const start = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }

    const el = textareaRef?.current;
    if (!el) {
      toast.error("Message input is not ready");
      return;
    }

    baseTextRef.current = el.value || "";
    finalTranscriptRef.current = "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      let finalChunk = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const res = event.results[i];
        const transcript = res[0]?.transcript || "";
        if (res.isFinal) finalChunk += transcript;
        else interim += transcript;
      }

      if (finalChunk) {
        finalTranscriptRef.current = `${finalTranscriptRef.current}${finalChunk}`;
      }

      const composed = `${baseTextRef.current}${finalTranscriptRef.current}${interim}`;
      setComposerText(composed);
    };

    recognition.onerror = (e) => {
      // common: 'no-speech', 'audio-capture', 'not-allowed'
      console.error("Speech recognition error", e);
      toast.error("Microphone / speech recognition error");
      stop();
    };

    recognition.onend = () => {
      // Persist the final transcript in the composer when recognition ends.
      const composed = `${baseTextRef.current}${finalTranscriptRef.current}`;
      setComposerText(composed);
      textareaRef.current?.focus?.();
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.error("Failed to start recognition", e);
      toast.error("Could not start microphone");
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isSupported) return null;

  return (
    <button
      type="button"
      className={`btn btn-ghost btn-sm ${isListening ? "text-error" : ""}`}
      onClick={() => (isListening ? stop() : start())}
      aria-label={isListening ? "Stop microphone" : "Start microphone"}
      title={isListening ? "Stop" : "Speak"}
    >
      {isListening ? <MicOffIcon className="size-4" /> : <MicIcon className="size-4" />}
    </button>
  );
};

const InputWithMic = (props) => {
  return (
    <div className="relative">
      <MessageInputFlat {...props} />
      {/* Place mic away from Stream's send button (right side) */}
      <div className="absolute right-20 bottom-2 z-10">
        <SpeechToTextButton />
      </div>
    </div>
  );
};

const MessageInput = ({ enableImageCaptioning = true, ...props }) => {
  const { sendMessage } = useChannelActionContext("MessageInput");

  const handleAfterSend = async (sent, message) => {
    try {
      if (!enableImageCaptioning) return;

      const hasImage = Array.isArray(message?.attachments)
        ? message.attachments.some((a) => a?.type === "image" || Boolean(a?.image_url) || Boolean(a?.thumb_url))
        : false;
      if (!hasImage) return;

      const messageId = sent?.message?.id || sent?.id;
      if (!messageId) return;

      await captionImageMessage({ messageId });
    } catch (error) {
      console.error("Image captioning failed", error);
    }
  };

  const overrideSubmitHandler = async (params) => {
    const { message } = params;
    const text = (message?.text || "").trim();
    const commandMatch = text.match(/^\/(groq|gemini)(\s|$)/i);
    const command = commandMatch?.[1]?.toLowerCase() || null;
    const isAiCommand = Boolean(command);

    const isCode = messageHasCodeFence(params.message?.text);
    const extraFields = isCode ? { isCode: true } : {};

    if (!isAiCommand) {
      const sent = await sendMessage({
        localMessage: params.localMessage ? { ...params.localMessage, ...extraFields } : params.localMessage,
        message: { ...params.message, ...extraFields },
        options: params.sendOptions,
      });
      await handleAfterSend(sent, params.message);
      return;
    }

    const prompt = text.replace(/^\/(groq|gemini)(\s|$)/i, "").trim();
    if (!prompt) return;

    // Stream treats leading '/' as a slash-command. If unknown, it marks the message as unsent.
    // To avoid that, send the prompt text without the '/groq' prefix.
    const isCodeAi = messageHasCodeFence(prompt);
    const extraAiFields = isCodeAi ? { isCode: true } : {};

    const sent = await sendMessage({
      localMessage: params.localMessage ? { ...params.localMessage, text: prompt, ...extraAiFields } : params.localMessage,
      message: { ...params.message, text: prompt, ...extraAiFields },
      options: params.sendOptions,
    });

    await handleAfterSend(sent, { ...params.message, text: prompt });

    try {
      await postGroqPrompt({ cid: params.cid, prompt });
    } catch (error) {
      console.error("Groq request failed", error);
      toast.error("Groq request failed");
    }
  };

  return <StreamMessageInput {...props} Input={InputWithMic} overrideSubmitHandler={overrideSubmitHandler} />;
};

export default MessageInput;
