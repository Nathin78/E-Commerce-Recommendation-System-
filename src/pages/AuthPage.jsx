import { Navigate, useLocation } from "react-router-dom";

export default function AuthPage() {
  const location = useLocation();
  const mode = new URLSearchParams(location.search).get("mode") === "register" ? "register" : "login";

  return <Navigate to={`/${mode}`} replace state={location.state} />;
}
