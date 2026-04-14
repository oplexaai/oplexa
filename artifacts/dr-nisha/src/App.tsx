import { Switch, Route, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./lib/auth";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth">
        {user ? <Redirect to="/" /> : <AuthPage />}
      </Route>
      <Route path="/profile">
        {!user ? <Redirect to="/auth" /> : <ProfilePage />}
      </Route>
      <Route path="/">
        {!user ? <Redirect to="/auth" /> : <ChatPage />}
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
