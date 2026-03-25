import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const css = `
  .fullscreen-wrapper {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: #000;
  }

  .exit-btn {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 100000;
    background: rgba(17, 24, 39, 0.8);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
`;

export default function ShadowingPlayer() {
  const navigate = useNavigate();
  const { videoId: videoIdFromRoute } = useParams();
  const [videoId] = useState(videoIdFromRoute || "yVPYHNslNyc");

  return (
    <>
      <style>{css}</style>
      <div className="fullscreen-wrapper">
        <button className="exit-btn" type="button" onClick={() => navigate(-1)}>
          Exit
        </button>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&fs=1&autohide=1`}
          allow="autoplay; fullscreen"
          allowFullScreen
          title="Full Screen Shadowing"
        />
      </div>
    </>
  );
}