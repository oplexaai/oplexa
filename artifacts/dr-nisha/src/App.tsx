import { Switch, Route, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./lib/auth";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";
import WelcomePage from "./pages/WelcomePage";
import AdminPage from "./pages/AdminPage";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#000" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/welcome">
        {user ? <Redirect to="/" /> : <WelcomePage />}
      </Route>
      <Route path="/auth">
        {user ? <Redirect to="/" /> : <AuthPage />}
      </Route>
      <Route path="/profile">
        {!user ? <Redirect to="/welcome" /> : <ProfilePage />}
      </Route>
      <Route path="/admin">
        {!user ? <Redirect to="/welcome" /> : !user.isAdmin ? <Redirect to="/" /> : <AdminPage />}
      </Route>
      <Route path="/">
        {!user ? <WelcomePage /> : <ChatPage />}
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
