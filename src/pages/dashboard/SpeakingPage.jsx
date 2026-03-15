import { Outlet } from "react-router-dom";
import ComingSoonPage from "./ComingSoonPage";

export default function SpeakingPage() {
  return  <ComingSoonPage
  type="speaking"
  title="Speaking Library"
  description="Boost your band score with our extensive library of speaking tests."
  headerAction="/speaking/library"
  headerActionText="Practice Now"
  />;
}
