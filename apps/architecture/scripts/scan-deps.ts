import type { ReturnType } from "./scan-apps";

interface DepNode {
  id: string;
  type: "app" | "package";
  name: string;
  runtime?: string;
  layer?: string;
}

interface DepEdge {
  from: string;
  to: string;
  type: "depends_on";
}

interface DepsData {
  nodes: DepNode[];
  edges: DepEdge[];
  orphans: string[];
  hubs: { id: string; consumers: number }[];
}

interface AppLike {
  slug: string;
  name: string;
  runtime: string;
  internalDeps: string[];
}

interface PkgLike {
  slug: string;
  name: string;
  layer: string;
  internalDeps: string[];
}

export function scanDeps(apps: AppLike[], packages: PkgLike[]): DepsData {
  const nodes: DepNode[] = [];
  const edges: DepEdge[] = [];
  const consumerCount = new Map<string, number>();

  // Add app nodes
  for (const app of apps) {
    nodes.push({ id: `app:${app.slug}`, type: "app", name: app.slug, runtime: app.runtime });
    for (const dep of app.internalDeps) {
      edges.push({ from: `app:${app.slug}`, to: `pkg:${dep}`, type: "depends_on" });
      consumerCount.set(dep, (consumerCount.get(dep) || 0) + 1);
    }
  }

  // Add package nodes
  for (const pkg of packages) {
    nodes.push({ id: `pkg:${pkg.slug}`, type: "package", name: pkg.slug, layer: pkg.layer });
    for (const dep of pkg.internalDeps) {
      edges.push({ from: `pkg:${pkg.slug}`, to: `pkg:${dep}`, type: "depends_on" });
      consumerCount.set(dep, (consumerCount.get(dep) || 0) + 1);
    }
  }

  // Find orphans (packages with 0 consumers)
  const orphans = packages
    .filter((p) => !consumerCount.has(p.slug))
    .map((p) => p.slug);

  // Find hubs (packages with 3+ consumers)
  const hubs = [...consumerCount.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([id, consumers]) => ({ id, consumers }));

  return { nodes, edges, orphans, hubs };
}
