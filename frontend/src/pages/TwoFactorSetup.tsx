import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./TwoFactor.module.css";

const API = "/api";

export default function TwoFactorSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.twoFactorEnabled) {
      fetch(`${API}/auth/2fa/setup`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.qrCode) setQrCode(data.qrCode);
          else setError(data.error || "Failed to load setup");
        })
        .catch(() => setError("Request failed"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user?.twoFactorEnabled]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API}/auth/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Verification failed");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    }
  };

  if (user?.twoFactorEnabled) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1>2FA already enabled</h1>
          <p>Two-factor authentication is active on your account.</p>
          <button type="button" onClick={() => navigate("/")} className={styles.button}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1>Enable two-factor authentication</h1>
        <p className={styles.sub}>
          Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter a code to verify.
        </p>
        {qrCode && (
          <div className={styles.qrWrap}>
            <img src={qrCode} alt="QR code" className={styles.qr} />
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}
        <form onSubmit={handleVerify} className={styles.form}>
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
            Verify and enable
          </button>
        </form>
      </div>
    </div>
  );
}
