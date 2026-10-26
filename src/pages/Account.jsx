import { useState } from "react";
import { LogIn, Save, Trash2, UserPlus, UserRound } from "lucide-react";
import { api } from "../services/api";
import { ErrorBanner, PageHeader } from "../components/common";

const EMPTY_REGISTER = { name: "", email: "", password: "" };
const EMPTY_LOGIN = { email: "", password: "" };
const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function Account({ currentUser, onSignIn, onUserUpdated, onUserDeleted }) {
  const [profile, setProfile] = useState({
    full_name: currentUser.full_name,
    skill_level: currentUser.skill_level,
  });
  const [register, setRegister] = useState(EMPTY_REGISTER);
  const [login, setLogin] = useState(EMPTY_LOGIN);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event, action) {
    event.preventDefault();
    try {
      setError("");
      setNotice("");
      const user = action === "register" ? await api.register(register) : await api.login(login);
      setRegister(EMPTY_REGISTER);
      setLogin(EMPTY_LOGIN);
      setNotice(`Signed in as ${user.full_name}.`);
      onSignIn(user);
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      setError("");
      const user = await api.updateUser(currentUser.user_id, profile);
      setNotice("Profile saved.");
      onUserUpdated(user);
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      `Delete ${currentUser.full_name} and all of their attempts and recommendations?`
    );
    if (!confirmed) return;
    try {
      setError("");
      await api.deleteUser(currentUser.user_id);
      onUserDeleted(currentUser.user_id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={<><UserRound size={14} /> ACCOUNT</>}
        title="Sign up or sign in"
        subtitle="Passwords are hashed with scrypt; register_user() creates new students as Beginner."
      />
      <ErrorBanner message={error} onClose={() => setError("")} />
      {notice && <div className="notice-banner">{notice}</div>}

      <form className="panel glass-panel form-panel profile-panel" onSubmit={saveProfile}>
        <h2 className="panel-title">Profile: {currentUser.email}</h2>
        <div className="profile-fields">
          <label>
            Full name
            <input required maxLength={100} value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </label>
          <label>
            Skill level
            <select value={profile.skill_level ?? ""}
              onChange={(e) => setProfile({ ...profile, skill_level: e.target.value })}>
              {SKILL_LEVELS.map((level) => <option key={level}>{level}</option>)}
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">
            <Save size={16} /> Save profile
          </button>
          <button type="button" className="mini-button danger-button" onClick={deleteAccount}>
            <Trash2 size={13} /> Delete student
          </button>
        </div>
      </form>

      <section className="two-column even">
        <form className="panel glass-panel form-panel" onSubmit={(e) => submit(e, "register")}>
          <h2 className="panel-title">Create an account</h2>
          <label>
            Full name
            <input required maxLength={100} value={register.name}
              onChange={(e) => setRegister({ ...register, name: e.target.value })} />
          </label>
          <label>
            Email
            <input required type="email" maxLength={150} value={register.email}
              onChange={(e) => setRegister({ ...register, email: e.target.value })} />
          </label>
          <label>
            Password (at least 8 characters)
            <input required type="password" minLength={8} value={register.password}
              autoComplete="new-password"
              onChange={(e) => setRegister({ ...register, password: e.target.value })} />
          </label>
          <button type="submit" className="primary-button">
            <UserPlus size={16} /> Sign up
          </button>
        </form>

        <form className="panel glass-panel form-panel" onSubmit={(e) => submit(e, "login")}>
          <h2 className="panel-title">Sign in</h2>
          <label>
            Email
            <input required type="email" value={login.email}
              onChange={(e) => setLogin({ ...login, email: e.target.value })} />
          </label>
          <label>
            Password
            <input required type="password" value={login.password}
              autoComplete="current-password"
              onChange={(e) => setLogin({ ...login, password: e.target.value })} />
          </label>
          <button type="submit" className="primary-button">
            <LogIn size={16} /> Sign in
          </button>
          <p className="cell-note">
            The sample students use placeholder password hashes, so they can only be picked
            with the student switcher, not signed in to.
          </p>
        </form>
      </section>
    </>
  );
}
