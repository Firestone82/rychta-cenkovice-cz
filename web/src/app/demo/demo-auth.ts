import type { Account, Session, User } from '@models/api.model';
import type { DemoRoute } from './demo-routes';
import { DemoFailure, type DemoStore } from './demo-store';

const SESSION_KEY = 'rc-demo-user';

/** Who is signed in to the fake administration; kept for the tab, so a reload stays signed in. */
export class DemoSession {
  /** Fallback when the browser refuses session storage. */
  private memory: Account | null = null;

  constructor(private readonly store: DemoStore) {}

  user(): Account | null {
    let id = 0;
    try {
      id = Number(sessionStorage.getItem(SESSION_KEY)) || 0;
    } catch {
      /* storage blocked: signed out after every reload */
    }
    return this.store.data.users.find((u) => u.id === id) ?? this.memory;
  }

  /** Any password works; an unknown e-mail signs in as the first administrator. */
  signIn(email: string): Account {
    const users = this.store.data.users;
    const user =
      users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ??
      users.find((u) => u.role === 'admin') ??
      users[0];
    this.remember(user);
    return user;
  }

  signOut(): void {
    this.remember(null);
  }

  /** The signed-in user, or 401 like the API without a valid token. */
  require(): Account {
    const user = this.user();
    if (!user) throw new DemoFailure(401, 'unauthorized');
    return user;
  }

  private remember(user: Account | null): void {
    this.memory = user;
    try {
      if (user) sessionStorage.setItem(SESSION_KEY, String(user.id));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* see user() */
    }
  }
}

const session = ({ id, email, name, role }: User): Session => ({
  access_token: 'demo',
  token_type: 'Bearer',
  expires_in: 3600,
  user: { id, email, name, role },
});

export function authRoutes(auth: DemoSession): DemoRoute[] {
  return [
    [
      'POST',
      /^\/auth\/login$/,
      (req) => {
        const { email, password } = req.body as { email: string; password: string };
        if (!email || !password) throw new DemoFailure(401, 'invalid_credentials');
        return session(auth.signIn(email));
      },
    ],
    ['POST', /^\/auth\/refresh$/, () => session(auth.require())],
    ['POST', /^\/auth\/logout$/, () => (auth.signOut(), null)],
    ['GET', /^\/auth\/me$/, () => auth.require()],
    ['POST', /^\/auth\/change-password$/, () => session(auth.require())],
  ];
}
