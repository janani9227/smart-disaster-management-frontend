import { useState } from "react";

export default function LoginScreen({ onLogin }) {
  const API_BASE_URL = import.meta.env.DEV
    ? "http://127.0.0.1:5001"
    : (import.meta.env.VITE_API_BASE_URL || "https://smart-disaster-management-zd17.onrender.com");

  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "verify"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleSignIn = async (e) => {
    if (e) e.preventDefault();
    resetMessages();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.requires_verification) {
          setDevCode(data.dev_code || "");
          setError("Your email is not verified yet. A verification code has been issued.");
          setMode("verify");
          return;
        }
        throw new Error(data.error || "Login failed. Please check credentials.");
      }

      if (data.token) {
        localStorage.setItem("sdm_auth_token", data.token);
        localStorage.setItem("sdm_user", JSON.stringify(data.user));
      }
      onLogin(data.user || { name: email.split("@")[0], email, role: "User" });
    } catch (err) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    if (e) e.preventDefault();
    resetMessages();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || email.split("@")[0],
          email: email.trim(),
          password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setDevCode(data.dev_code || "");
      setSuccess("Account created! Enter the 6-digit verification code below.");
      setMode("verify");
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    resetMessages();
    const cleanCode = verificationCode.trim();
    if (!cleanCode) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: cleanCode }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Verification failed. Invalid or expired code.");
      }

      if (data.token) {
        localStorage.setItem("sdm_auth_token", data.token);
        localStorage.setItem("sdm_user", JSON.stringify(data.user));
      }
      onLogin(data.user || { name: email.split("@")[0], email, role: "User" });
    } catch (err) {
      setError(err.message || "Failed to verify code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    resetMessages();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not resend code.");
      }
      setDevCode(data.dev_code || "");
      setSuccess("A fresh verification code has been generated!");
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  const useDevCode = () => {
    if (devCode) {
      setVerificationCode(devCode);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="wave wave-one"></div>
        <div className="wave wave-two"></div>
        <div className="wave wave-three"></div>
      </div>

      <div className="login-content">
        {/* Logo */}
        <div className="logo-circle">🌊</div>

        <h1>Smart Disaster Management</h1>
        <p className="subtitle">Real-Time Climate Analytics & Emergency Response</p>

        {/* Card */}
        <div className="login-card">
          {/* Mode Switch Tabs */}
          {mode !== "verify" && (
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${mode === "signin" ? "active" : ""}`}
                onClick={() => {
                  setMode("signin");
                  resetMessages();
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab ${mode === "signup" ? "active" : ""}`}
                onClick={() => {
                  setMode("signup");
                  resetMessages();
                }}
              >
                Create Account
              </button>
            </div>
          )}

          {error && <div className="alert-box error-alert">{error}</div>}
          {success && <div className="alert-box success-alert">{success}</div>}

          {/* SIGN IN FORM */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn}>
              <h2>Sign In</h2>

              <label>Email Address</label>
              <div className="input-container">
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <label>Password</label>
              <div className="input-container">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                <span>{loading ? "Signing in..." : "Sign In"}</span>
                <span className="arrow">→</span>
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp}>
              <h2>Create Account</h2>

              <label>Full Name</label>
              <div className="input-container">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <label>Email Address</label>
              <div className="input-container">
                <span className="input-icon">✉</span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <label>Password (Min. 6 chars)</label>
              <div className="input-container">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <label>Confirm Password</label>
              <div className="input-container">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                <span>{loading ? "Creating Account..." : "Create Account & Verify"}</span>
                <span className="arrow">→</span>
              </button>
            </form>
          )}

          {/* VERIFY EMAIL FORM */}
          {mode === "verify" && (
            <form onSubmit={handleVerify}>
              <h2>Verify Your Email</h2>
              <p className="verify-instructions">
                A 6-digit verification code has been sent to <strong>{email}</strong>.
              </p>

              {devCode && (
                <div className="dev-code-banner">
                  <div className="dev-code-label">🔑 Security Code Generated:</div>
                  <div className="dev-code-value">{devCode}</div>
                  <button type="button" className="dev-code-fill" onClick={useDevCode}>
                    Auto-Fill Code ⚡
                  </button>
                </div>
              )}

              <label>Enter 6-Digit Code</label>
              <div className="input-container code-input-container">
                <span className="input-icon">🔢</span>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className="code-input"
                  value={verificationCode}
                  required
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                <span>{loading ? "Verifying..." : "Verify & Access App"}</span>
                <span className="arrow">✓</span>
              </button>

              <div className="verify-actions">
                <button
                  type="button"
                  className="resend-btn"
                  onClick={handleResendCode}
                  disabled={loading}
                >
                  Resend Code
                </button>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => {
                    setMode("signin");
                    resetMessages();
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="divider">
            <span></span>
            <p>secure access</p>
            <span></span>
          </div>

          {/* Quick Demo Access */}
          <button
            type="button"
            className="guest-button"
            onClick={() => {
              onLogin({ name: "Demo Responder", email: "emergency@disaster-gov.org", role: "User" });
            }}
          >
            <span>🛡️</span>
            Instant Demo Access
          </button>
        </div>

        <p className="security">🔒 Official Multi-Hazard Data from USGS, Open-Meteo & NASA EONET</p>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .login-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #051923 0%, #003554 40%, #006494 80%, #0582ca 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 30px 20px;
        }

        .login-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .wave {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .wave-one {
          width: 700px;
          height: 700px;
          right: -200px;
          top: -200px;
        }

        .wave-two {
          width: 950px;
          height: 950px;
          left: -400px;
          bottom: -450px;
        }

        .wave-three {
          width: 550px;
          height: 550px;
          left: -220px;
          top: -280px;
        }

        .login-content {
          width: 100%;
          max-width: 480px;
          position: relative;
          z-index: 2;
        }

        .logo-circle {
          width: 76px;
          height: 76px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.25);
          font-size: 38px;
          backdrop-filter: blur(12px);
        }

        .login-content h1 {
          margin: 0;
          text-align: center;
          color: white;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .subtitle {
          margin: 6px 0 24px;
          text-align: center;
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.98);
          border-radius: 24px;
          padding: 28px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.35);
        }

        .auth-tabs {
          display: flex;
          background: #eef2f6;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 20px;
        }

        .auth-tab {
          flex: 1;
          padding: 10px;
          border: none;
          background: transparent;
          font-weight: 700;
          font-size: 14px;
          color: #627d98;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .auth-tab.active {
          background: white;
          color: #006494;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }

        .login-card h2 {
          margin: 0 0 16px;
          color: #102a43;
          font-size: 22px;
          font-weight: 800;
        }

        .verify-instructions {
          font-size: 13px;
          color: #486581;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .alert-box {
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .error-alert {
          background: #ffe3e3;
          color: #c92a2a;
          border: 1px solid #ffa8a8;
        }

        .success-alert {
          background: #ebfbee;
          color: #2b8a3e;
          border: 1px solid #b2f2bb;
        }

        .dev-code-banner {
          background: linear-gradient(135deg, #e3fafc, #c5f6fa);
          border: 1px solid #99e9f2;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          text-align: center;
        }

        .dev-code-label {
          font-size: 12px;
          font-weight: 700;
          color: #0b7285;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .dev-code-value {
          font-family: monospace;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 4px;
          color: #0c8599;
        }

        .dev-code-fill {
          background: #1098ad;
          color: white;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .dev-code-fill:hover {
          background: #0c8599;
        }

        .login-card label {
          display: block;
          margin: 12px 0 6px;
          color: #486581;
          font-size: 13px;
          font-weight: 700;
        }

        .input-container {
          height: 48px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          border: 1.5px solid #d9e2ec;
          border-radius: 12px;
          background: white;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-container:focus-within {
          border-color: #006494;
          box-shadow: 0 0 0 3px rgba(0, 100, 148, 0.15);
        }

        .code-input-container {
          height: 54px;
        }

        .code-input {
          font-size: 20px !important;
          letter-spacing: 6px;
          text-align: center;
          font-weight: 800;
        }

        .input-icon {
          width: 26px;
          color: #718096;
          font-size: 16px;
        }

        .input-container input {
          width: 100%;
          height: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #102a43;
          font-size: 14px;
        }

        .input-container input::placeholder {
          color: #9aa6b2;
        }

        .login-button {
          width: 100%;
          height: 50px;
          margin-top: 20px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #006494, #003554);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(0, 100, 148, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(0, 100, 148, 0.4);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .arrow {
          font-size: 18px;
        }

        .verify-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
        }

        .resend-btn, .back-btn {
          border: none;
          background: none;
          color: #006494;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 6px;
        }

        .resend-btn:hover, .back-btn:hover {
          text-decoration: underline;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0 16px;
        }

        .divider span {
          flex: 1;
          height: 1px;
          background: #e4e7eb;
        }

        .divider p {
          margin: 0;
          color: #829ab1;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .guest-button {
          width: 100%;
          height: 46px;
          border-radius: 12px;
          border: 1.5px solid #bcccdc;
          background: #f8fafc;
          color: #102a43;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }

        .guest-button:hover {
          background: #eef2f6;
        }

        .security {
          margin: 18px 0 0;
          text-align: center;
          color: rgba(255, 255, 255, 0.75);
          font-size: 12px;
        }

        @media (max-width: 520px) {
          .login-page {
            padding: 20px 14px;
          }
          .login-card {
            padding: 22px 18px;
            border-radius: 20px;
          }
          .login-content h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
