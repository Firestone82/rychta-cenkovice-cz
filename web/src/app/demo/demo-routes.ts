import { adminRoutes } from './demo-admin';
import { DemoSession, authRoutes } from './demo-auth';
import { loadDemoData } from './demo-data';
import { publicRoutes } from './demo-public';
import { type DemoRequest, DemoStore, notFound } from './demo-store';

/** Method, path pattern (its groups are the parameters) and the answer. */
export type DemoRoute = [
  method: string,
  path: RegExp,
  answer: (req: DemoRequest, params: string[]) => unknown,
];

/** The fake API of the showcase: every endpoint the website and the administration call. */
export class DemoBackend {
  private readonly routes: DemoRoute[];

  private constructor(store: DemoStore) {
    const auth = new DemoSession(store);
    this.routes = [...publicRoutes(store), ...authRoutes(auth), ...adminRoutes(store, auth)];
  }

  static async create(): Promise<DemoBackend> {
    return new DemoBackend(new DemoStore(await loadDemoData()));
  }

  /** The answer body; throws a DemoFailure for an error status. */
  answer(req: DemoRequest): unknown {
    for (const [method, path, answer] of this.routes) {
      const match = method === req.method ? path.exec(req.path) : null;
      if (match) return structuredClone(answer(req, match.slice(1)));
    }
    throw notFound();
  }
}
