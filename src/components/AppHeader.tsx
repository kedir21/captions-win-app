import { Link } from "@tanstack/react-router";

export function AppHeader() {
  const cls = "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground";
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-ethiopic text-lg font-bold text-primary-foreground">ሀ</span>
          <span className="font-display text-base font-bold tracking-tight"><span className="hidden sm:inline">Amharic </span>Caption Studio</span>
        </Link>
        <nav className="flex gap-1">
          <Link to="/" className={cls} activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>Studio</Link>
          <Link to="/help" className={cls} activeProps={{ className: "text-foreground" }}>Help</Link>
        </nav>
      </div>
    </header>
  );
}
