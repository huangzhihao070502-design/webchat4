/* ------------------------------------------------------------------ */
/*  Auth Service — localStorage-based user management                 */
/* ------------------------------------------------------------------ */

interface StoredUser {
  password: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthData {
  users: Record<string, StoredUser>;
}

const AUTH_KEY = 'aperture_auth';

function getData(): AuthData {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // 首次使用：初始化内置 root 账号
  const data: AuthData = { users: {} };
  data.users['root'] = {
    password: 'root',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveData(data);
  return data;
}

function saveData(data: AuthData): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

/* ---------- public API ---------- */

export interface AuthResult {
  success: boolean;
  message: string;
  isUpdate?: boolean;
}

/** Register a new user. If email exists, password is updated. */
export function register(email: string, password: string): AuthResult {
  const data = getData();
  const now = new Date().toISOString();
  const existing = data.users[email];
  const isUpdate = !!existing;

  data.users[email] = {
    password,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
  };
  saveData(data);

  return {
    success: true,
    message: isUpdate ? '密码已更新，请用新密码登录' : '注册成功，请登录',
    isUpdate,
  };
}

/** Log in with email + password. */
export function login(email: string, password: string): AuthResult {
  const data = getData();
  const user = data.users[email];

  if (!user) {
    return { success: false, message: '账号不存在，请先注册' };
  }
  if (user.password !== password) {
    return { success: false, message: '密码错误' };
  }
  return { success: true, message: '登录成功' };
}

/** Check whether an email is already registered. */
export function isRegistered(email: string): boolean {
  const data = getData();
  return !!data.users[email];
}
