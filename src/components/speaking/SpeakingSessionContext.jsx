import { createContext, useContext } from "react";

export const SpeakingSessionContext = createContext({
  liveStream: null,
  isRecording: false,
});

export function useSpeakingSessionContext() {
  return useContext(SpeakingSessionContext);
}
