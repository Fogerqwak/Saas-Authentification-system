import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import styles from "./Dashboard.module.css";

const API = "/api";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<{ message?: string; roles?: string[]; permissions?: string[] } | null>(null);

  useEffect(() => {
    fetch(`${API}/dashboard`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className={styles.dashboard}>
      <h1>Dashboard</h1>
      <p className={styles.welcome}>
        {data?.message ?? "Loading…"}
      </p>
      <div className={styles.section}>
        <h2>Your profile</h2>
        <ul className={styles.list}>
          <li><strong>Email</strong> {user?.email}</li>
          <li><strong>Name</strong> {user?.name ?? "—"}</li>
          <li><strong>2FA</strong> {user?.twoFactorEnabled ? "Enabled" : "Disabled"}</li>
          <li><strong>Roles</strong> {user?.roleNames?.join(", ") ?? "—"}</li>
          <li><strong>Permissions</strong> {user?.permissions?.join(", ") ?? "—"}</li>
        </ul>
      </div>
      <div className={styles.section}>
        <h2>Role-based access</h2>
        <p className={styles.muted}>
          You can access routes based on your role and permissions. Try the links in the header.
        </p>
      </div>
    </div>
  );
}
