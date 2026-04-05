import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function NonAdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (isAuthenticated && isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}

export default NonAdminRoute;
