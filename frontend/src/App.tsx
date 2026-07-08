import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./components/AuthProvider";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { BecomeHostPage } from "./pages/BecomeHostPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { NewListingPage } from "./pages/NewListingPage";
import { SearchPage } from "./pages/SearchPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<LandingPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/become-a-host" element={<BecomeHostPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/listings/:listingId" element={<ListingDetailPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/listings/new" element={<NewListingPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
