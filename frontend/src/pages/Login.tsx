import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

const API = "/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending2FA, setPending2FA] = useState<{ token: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const { login, user, verify2FA } = useAuth();
  const navigate = useNavigate();

  if (user && !pending2FA) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await login(email, password);
      if (result.requiresTwoFactor && result.token) {
        setPending2FA({ token: result.token });
        return;
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!pending2FA?.token) return;
    try {
      await verify2FA(twoFactorCode, pending2FA.token);
      setPending2FA(null);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    }
  };

  if (pending2FA) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1>Two-factor authentication</h1>
          <p className={styles.sub}>Enter the code from your authenticator app</p>
          <form onSubmit={handle2FA} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={styles.input}
              autoFocus
            />
            <button type="submit" className={styles.button}>
              Verify
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1>Sign in</h1>
        <p className={styles.sub}>
          Don’t have an account? <Link to="/register">Sign up</Link>
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />
          <button type="submit" className={styles.button}>
            Sign in
          </button>
        </form>
        <div className={styles.oauth}>
          <span className={styles.oauthLabel}>Or continue with</span>
          <div className={styles.oauthButtons}>
            <a href={`${API}/auth/google`} className={styles.oauthBtn}>
              Google
            </a>
            <a href={`${API}/auth/github`} className={styles.oauthBtn}>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
