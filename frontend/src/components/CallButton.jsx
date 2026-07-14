import { HeadphonesIcon, VideoIcon } from "lucide-react";

function CallButton({ handleVideoCall, handleAudioCall, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleAudioCall}
        className="btn btn-info btn-sm text-white"
        aria-label="Start audio call"
        title="Audio call"
      >
        <HeadphonesIcon className="size-5" />
      </button>
      <button
        type="button"
        onClick={handleVideoCall}
        className="btn btn-success btn-sm text-white"
        aria-label="Start video call"
        title="Video call"
      >
        <VideoIcon className="size-5" />
      </button>
    </div>
  );
}

export default CallButton;