import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Layout.module.css";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          SaaS Auth
        </Link>
        <nav className={styles.nav}>
          <Link to="/">Dashboard</Link>
          {user?.permissions?.includes("users:read") && (
            <Link to="/users">Users</Link>
          )}
          {user?.roleNames?.includes("admin") && (
            <Link to="/admin">Admin</Link>
          )}
          <Link to="/2fa/setup">2FA</Link>
          <div className={styles.user}>
            <span className={styles.userName}>
              {user?.name || user?.email}
              {user?.roleNames?.length ? (
                <span className={styles.badge}>{user.roleNames.join(", ")}</span>
              ) : null}
            </span>
            <button type="button" onClick={handleLogout} className={styles.logout}>
              Log out
            </button>
          </div>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
