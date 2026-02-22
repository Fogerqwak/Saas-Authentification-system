import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./TwoFactor.module.css";

export default function TwoFactorVerify() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setError("Missing token");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed");
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1>Two-factor verification</h1>
        <p className={styles.sub}>Enter the code from your authenticator app.</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Verify
          </button>
        </form>
      </div>
    </div>
  );
}
