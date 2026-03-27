import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
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

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/spaces" element={<SpacesPage />} />
        <Route path="/spaces/:id" element={<SpaceDetailPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/booking/:spaceId"
          element={
            <ProtectedRoute>
              <BookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
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
