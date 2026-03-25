import { VideoIcon } from "lucide-react";

function CallButton({ handleVideoCall, className = "" }) {
  return (
    <button
      type="button"
      onClick={handleVideoCall}
      className={`btn btn-success btn-sm text-white ${className}`}
      aria-label="Start video call"
      title="Video call"
    >
      <VideoIcon className="size-6" />
    </button>
  );
}

export default CallButton;