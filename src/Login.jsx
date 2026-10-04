import { useState } from "react";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

 const goHome = () => {
  onLogin("User");
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
        <div className="logo-circle">
          🌊
        </div>

        <h1>Welcome back</h1>

        <p className="subtitle">
          Stay informed. Stay protected.
        </p>

        {/* Login Card */}
        <div className="login-card">

          <h2>Sign in</h2>

          {/* Email */}
          <label>Email</label>

          <div className="input-container">
            <span className="input-icon">✉</span>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <label>Password</label>

          <div className="input-container">
            <span className="input-icon">🔒</span>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Forgot password */}
          <button className="forgot-button">
            Forgot password?
          </button>

          {/* Sign In */}
          <button
            className="login-button"
            onClick={goHome}
          >
            <span>Sign In</span>
            <span className="arrow">→</span>
          </button>

          {/* Divider */}
          <div className="divider">
            <span></span>
            <p>or</p>
            <span></span>
          </div>

          {/* Guest */}
          <button
            className="guest-button"
            onClick={goHome}
          >
            <span>👤</span>
            Continue as Guest
          </button>

          {/* Signup */}
          <div className="signup-row">
            <span>Don't have an account?</span>

            <button
              className="signup-button"
              onClick={() => {
  alert("Account creation will be connected to the registration system.");
}}
            >
              Create one
            </button>
          </div>

        </div>

        <p className="security">
          🔒 Your information is securely protected
        </p>

      </div>

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Inter,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .login-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              #061826 0%,
              #0a3a52 50%,
              #087e8b 100%
            );
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
          border: 1px solid rgba(255,255,255,0.08);
        }

        .wave-one {
          width: 600px;
          height: 600px;
          right: -180px;
          top: -180px;
        }

        .wave-two {
          width: 850px;
          height: 850px;
          left: -350px;
          bottom: -400px;
        }

        .wave-three {
          width: 500px;
          height: 500px;
          left: -200px;
          top: -250px;
        }

        .login-content {
          width: 100%;
          max-width: 450px;
          position: relative;
          z-index: 2;
        }

        .logo-circle {
          width: 82px;
          height: 82px;
          margin: 0 auto 18px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: rgba(255,255,255,0.15);

          border: 1px solid rgba(255,255,255,0.18);

          box-shadow:
            0 15px 40px rgba(0,0,0,0.18);

          font-size: 42px;

          backdrop-filter: blur(10px);
        }

        .login-content h1 {
          margin: 0;

          text-align: center;

          color: white;

          font-size: 34px;

          font-weight: 800;

          letter-spacing: -0.7px;
        }

        .subtitle {
          margin: 8px 0 28px;

          text-align: center;

          color: rgba(255,255,255,0.75);

          font-size: 15px;
        }

        .login-card {
          background: rgba(255,255,255,0.98);

          border-radius: 28px;

          padding: 30px;

          box-shadow:
            0 25px 70px rgba(0,0,0,0.28);
        }

        .login-card h2 {
          margin: 0 0 22px;

          color: #102a43;

          font-size: 25px;

          font-weight: 800;
        }

        .login-card label {
          display: block;

          margin:
            15px 0 8px;

          color: #486581;

          font-size: 13px;

          font-weight: 700;
        }

        .input-container {
          height: 54px;

          display: flex;

          align-items: center;

          padding: 0 15px;

          border: 1px solid #d9e2ec;

          border-radius: 14px;

          background: white;

          transition:
            border-color 0.2s,
            box-shadow 0.2s;
        }

        .input-container:focus-within {
          border-color: #087e8b;

          box-shadow:
            0 0 0 3px rgba(8,126,139,0.12);
        }

        .input-icon {
          width: 25px;

          color: #718096;

          font-size: 18px;
        }

        .input-container input {
          width: 100%;

          height: 100%;

          border: none;

          outline: none;

          background: transparent;

          color: #102a43;

          font-size: 15px;
        }

        .input-container input::placeholder {
          color: #9aa6b2;
        }

        .forgot-button {
          display: block;

          margin:
            10px 0 0 auto;

          border: none;

          background: none;

          color: #087e8b;

          cursor: pointer;

          font-size: 13px;

          font-weight: 700;
        }

        .forgot-button:hover {
          text-decoration: underline;
        }

        .login-button {
          width: 100%;

          height: 55px;

          margin-top: 21px;

          border: none;

          border-radius: 15px;

          background:
            linear-gradient(
              135deg,
              #087e8b,
              #0a6075
            );

          color: white;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 12px;

          font-size: 16px;

          font-weight: 800;

          cursor: pointer;

          box-shadow:
            0 10px 25px rgba(8,126,139,0.25);

          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .login-button:hover {
          transform: translateY(-2px);

          box-shadow:
            0 14px 30px rgba(8,126,139,0.35);
        }

        .arrow {
          font-size: 21px;
        }

        .divider {
          display: flex;

          align-items: center;

          gap: 12px;

          margin: 22px 0;
        }

        .divider span {
          flex: 1;

          height: 1px;

          background: #e4e7eb;
        }

        .divider p {
          margin: 0;

          color: #829ab1;

          font-size: 13px;
        }

        .guest-button {
          width: 100%;

          height: 51px;

          border-radius: 14px;

          border: 1px solid #b8c8d4;

          background: white;

          color: #0a6075;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 9px;

          font-size: 14px;

          font-weight: 700;

          cursor: pointer;

          transition: background 0.2s;
        }

        .guest-button:hover {
          background: #f2fafb;
        }

        .signup-row {
          display: flex;

          justify-content: center;

          align-items: center;

          gap: 5px;

          margin-top: 22px;

          color: #829ab1;

          font-size: 13px;
        }

        .signup-button {
          border: none;

          background: none;

          color: #087e8b;

          font-weight: 800;

          cursor: pointer;

          font-size: 13px;
        }

        .signup-button:hover {
          text-decoration: underline;
        }

        .security {
          margin: 20px 0 0;

          text-align: center;

          color: rgba(255,255,255,0.68);

          font-size: 12px;
        }

        @media (max-width: 520px) {

          .login-page {
            padding: 20px 15px;
          }

          .login-card {
            padding: 24px 20px;
            border-radius: 23px;
          }

          .login-content h1 {
            font-size: 29px;
          }

          .logo-circle {
            width: 70px;
            height: 70px;
            font-size: 35px;
          }

        }

      `}</style>
    </div>
  );
}