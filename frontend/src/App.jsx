import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import UserOnlyRoute from "./components/UserOnlyRoute";
import NonAdminRoute from "./components/NonAdminRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import SpacesPage from "./pages/SpacesPage";
import SpaceDetailPage from "./pages/SpaceDetailPage";
import BookingPage from "./pages/BookingPage";
import MapPage from "./pages/MapPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import AdminSpacesPage from "./pages/admin/AdminSpacesPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import AdminServicesPage from "./pages/admin/AdminServicesPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminSpaceTypesPage from "./pages/admin/AdminSpaceTypesPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/spaces" element={<SpacesPage />} />
        <Route path="/spaces/:id" element={<SpaceDetailPage />} />
        <Route
          path="/map"
          element={
            <NonAdminRoute>
              <MapPage />
            </NonAdminRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/booking/:spaceId"
          element={
            <ProtectedRoute>
              <UserOnlyRoute>
                <BookingPage />
              </UserOnlyRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <UserOnlyRoute>
                <MyBookingsPage />
              </UserOnlyRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <UserOnlyRoute>
                <ChatPage />
              </UserOnlyRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
<<<<<<< Updated upstream
=======
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <UserOnlyRoute>
                <FavoritesPage />
              </UserOnlyRoute>
            </ProtectedRoute>
          }
        />
>>>>>>> Stashed changes

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboardPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/spaces"
          element={
            <AdminRoute>
              <AdminSpacesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <AdminRoute>
              <AdminServicesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/space-types"
          element={
            <AdminRoute>
              <AdminSpaceTypesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <AdminRoute>
              <AdminBookingsPage />
            </AdminRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
