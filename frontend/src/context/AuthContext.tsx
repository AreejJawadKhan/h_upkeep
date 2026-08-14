import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { API_BASE, apiRequest } from '../lib/api';
import type {
  Area,
  Asset,
  Home,
  MessageResponse,
  RefreshResponse,
  TokenResponse,
  User,
} from '../lib/types';

const ACCESS_TOKEN_KEY = 'homerepair_access_token';

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type HomeInput = {
  name: string;
  address: string;
  property_type: string;
  year_built: number;
};

type AreaInput = {
  name: string;
  notes: string;
};

type AssetInput = {
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  installation_date: string;
  expected_lifespan: string;
  notes: string;
  area_id: string;
};

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  ready: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  completeGoogleLogin: (accessToken: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<MessageResponse>;
  resendVerification: (email: string) => Promise<MessageResponse>;
  requestPasswordReset: (email: string) => Promise<MessageResponse>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<MessageResponse>;
  createHome: (input: HomeInput) => Promise<Home>;
  updateHome: (homeId: number, input: Partial<HomeInput>) => Promise<Home>;
  deleteHome: (homeId: number) => Promise<void>;
  createArea: (homeId: number, input: AreaInput) => Promise<Area>;
  updateArea: (homeId: number, areaId: number, input: Partial<AreaInput>) => Promise<Area>;
  deleteArea: (homeId: number, areaId: number) => Promise<void>;
  createAsset: (homeId: number, input: AssetInput) => Promise<Asset>;
  updateAsset: (homeId: number, assetId: number, input: Partial<AssetInput>) => Promise<Asset>;
  deleteAsset: (homeId: number, assetId: number) => Promise<void>;
  googleLoginUrl: string;
  setAccessToken: (token: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeOptionalString(value: string) {
  return value.trim();
}

function storeToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(() =>
    sessionStorage.getItem(ACCESS_TOKEN_KEY),
  );
  const [ready, setReady] = useState(false);

  const googleLoginUrl = `${API_BASE}/auth/google/login`;

  async function hydrateWithToken(token: string) {
    const current = await apiRequest<User>('/auth/me', {}, token);
    setUser(current);
    setAccessTokenState(token);
    storeToken(token);
  }

  async function refreshSession() {
    try {
      const refreshed = await apiRequest<RefreshResponse>('/auth/refresh', { method: 'POST' });
      await hydrateWithToken(refreshed.access_token);
      return true;
    } catch {
      setUser(null);
      setAccessTokenState(null);
      storeToken(null);
      return false;
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const cached = sessionStorage.getItem(ACCESS_TOKEN_KEY);
        if (cached) {
          try {
            await hydrateWithToken(cached);
            if (alive) {
              setReady(true);
            }
            return;
          } catch {
            storeToken(null);
            setAccessTokenState(null);
          }
        }
        await refreshSession();
      } finally {
        if (alive) {
          setReady(true);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function login(input: LoginInput) {
    const response = await apiRequest<TokenResponse>('/auth/login', {
      method: 'POST',
      body: input,
    });
    await hydrateWithToken(response.access_token);
  }

  async function register(input: RegisterInput) {
    return apiRequest<User>('/auth/register', { method: 'POST', body: input });
  }

  async function logout() {
    try {
      await apiRequest<MessageResponse>('/auth/logout', { method: 'POST' }, accessToken);
    } finally {
      setUser(null);
      setAccessTokenState(null);
      storeToken(null);
    }
  }

  async function completeGoogleLogin(token: string) {
    await hydrateWithToken(token);
  }

  async function verifyEmail(token: string) {
    return apiRequest<MessageResponse>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  }

  async function resendVerification(email: string) {
    return apiRequest<MessageResponse>('/auth/resend-verification', {
      method: 'POST',
      body: { email: email.trim() },
    });
  }

  async function requestPasswordReset(email: string) {
    return apiRequest<MessageResponse>('/auth/password-reset/request', {
      method: 'POST',
      body: { email: email.trim() },
    });
  }

  async function confirmPasswordReset(token: string, newPassword: string) {
    return apiRequest<MessageResponse>('/auth/password-reset/confirm', {
      method: 'POST',
      body: { token, new_password: newPassword },
    });
  }

  async function createHome(input: HomeInput) {
    return apiRequest<Home>('/homes', {
      method: 'POST',
      body: {
        ...input,
        name: normalizeOptionalString(input.name),
        address: normalizeOptionalString(input.address),
        property_type: normalizeOptionalString(input.property_type),
      },
    }, accessToken);
  }

  async function updateHome(homeId: number, input: Partial<HomeInput>) {
    return apiRequest<Home>(`/homes/${homeId}`, {
      method: 'PATCH',
      body: input,
    }, accessToken);
  }

  async function deleteHome(homeId: number) {
    await apiRequest<void>(`/homes/${homeId}`, { method: 'DELETE' }, accessToken);
  }

  async function createArea(homeId: number, input: AreaInput) {
    return apiRequest<Area>(`/homes/${homeId}/areas`, {
      method: 'POST',
      body: {
        name: normalizeOptionalString(input.name),
        notes: input.notes.trim() || null,
      },
    }, accessToken);
  }

  async function updateArea(homeId: number, areaId: number, input: Partial<AreaInput>) {
    const body: Record<string, string | null> = {};
    if (input.name !== undefined) body.name = normalizeOptionalString(input.name);
    if (input.notes !== undefined) body.notes = input.notes.trim() || null;
    return apiRequest<Area>(`/homes/${homeId}/areas/${areaId}`, {
      method: 'PATCH',
      body,
    }, accessToken);
  }

  async function deleteArea(homeId: number, areaId: number) {
    await apiRequest<void>(`/homes/${homeId}/areas/${areaId}`, { method: 'DELETE' }, accessToken);
  }

  async function createAsset(homeId: number, input: AssetInput) {
    return apiRequest<Asset>(`/homes/${homeId}/assets`, {
      method: 'POST',
      body: {
        name: normalizeOptionalString(input.name),
        category: normalizeOptionalString(input.category),
        manufacturer: input.manufacturer.trim() || null,
        model: input.model.trim() || null,
        serial_number: input.serial_number.trim() || null,
        purchase_date: input.purchase_date || null,
        installation_date: input.installation_date || null,
        expected_lifespan:
          input.expected_lifespan.trim() === '' ? null : Number(input.expected_lifespan),
        notes: input.notes.trim() || null,
        area_id: input.area_id.trim() === '' ? null : Number(input.area_id),
      },
    }, accessToken);
  }

  async function updateAsset(homeId: number, assetId: number, input: Partial<AssetInput>) {
    const body: Record<string, string | number | null> = {};
    if (input.name !== undefined) body.name = normalizeOptionalString(input.name);
    if (input.category !== undefined) body.category = normalizeOptionalString(input.category);
    if (input.manufacturer !== undefined) body.manufacturer = input.manufacturer.trim() || null;
    if (input.model !== undefined) body.model = input.model.trim() || null;
    if (input.serial_number !== undefined) body.serial_number = input.serial_number.trim() || null;
    if (input.purchase_date !== undefined) body.purchase_date = input.purchase_date || null;
    if (input.installation_date !== undefined) body.installation_date = input.installation_date || null;
    if (input.expected_lifespan !== undefined) {
      body.expected_lifespan = input.expected_lifespan.trim() === '' ? null : Number(input.expected_lifespan);
    }
    if (input.notes !== undefined) body.notes = input.notes.trim() || null;
    if (input.area_id !== undefined) body.area_id = input.area_id.trim() === '' ? null : Number(input.area_id);
    return apiRequest<Asset>(`/homes/${homeId}/assets/${assetId}`, {
      method: 'PATCH',
      body,
    }, accessToken);
  }

  async function deleteAsset(homeId: number, assetId: number) {
    await apiRequest<void>(`/homes/${homeId}/assets/${assetId}`, { method: 'DELETE' }, accessToken);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      ready,
      login,
      register,
      logout,
      refreshSession,
      completeGoogleLogin,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      confirmPasswordReset,
      createHome,
      updateHome,
      deleteHome,
      createArea,
      updateArea,
      deleteArea,
      createAsset,
      updateAsset,
      deleteAsset,
      googleLoginUrl,
      setAccessToken: (token) => {
        setAccessTokenState(token);
        storeToken(token);
      },
    }),
    [accessToken, ready, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
