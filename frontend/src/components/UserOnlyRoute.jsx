import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function UserOnlyRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}

export default UserOnlyRoute;
