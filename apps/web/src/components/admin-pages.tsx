"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Eye,
  EyeOff,
  History,
  LayoutDashboard,
  List,
  LogOut,
  Maximize2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { adminMutationHeaders, apiRequest } from "@/lib/api";
import { formatDisplayDate } from "@/lib/localization";
import type { AdminIdentity, Category, Game, Locale } from "@/lib/types";
import { useLocale } from "./locale-provider";
import { LanguageSwitcher } from "./site-shell";
import { ConfirmDialog, EmptyState } from "./ui-primitives";

type AdminSession = { admin: AdminIdentity };
type AdminGamesResponse = { games: AdminGame[] };
type AdminCategory = Category & { id: string };
type CategoryResponse = { categories: AdminCategory[] };
type AdminGame = Game & {
  id: string;
  status: "draft" | "published" | "unpublished" | "archived";
  categoryId: string;
  categorySlug: string;
  categoryName?: Record<Locale, string>;
  updatedAt: string;
  validatedAt: string | null;
};
type FormValues = {
  slug: string;
  title: Record<Locale, string>;
  shortDescription: Record<Locale, string>;
  description: Record<Locale, string>;
  instructions: Record<Locale, string>;
  tags: string;
  categoryId: string;
  entryPath: string;
};

const emptyForm: FormValues = {
  slug: "",
  title: { en: "", bn: "" },
  shortDescription: { en: "", bn: "" },
  description: { en: "", bn: "" },
  instructions: { en: "", bn: "" },
  tags: "",
  categoryId: "",
  entryPath: "/games/meteor-dash/index.html",
};

function formFromGame(game: AdminGame): FormValues {
  return {
    slug: game.slug,
    title: { en: game.title?.en ?? "", bn: game.title?.bn ?? "" },
    shortDescription: { en: game.shortDescription?.en ?? "", bn: game.shortDescription?.bn ?? "" },
    description: { en: game.description?.en ?? "", bn: game.description?.bn ?? "" },
    instructions: { en: game.instructions?.en ?? "", bn: game.instructions?.bn ?? "" },
    tags: Array.isArray(game.tags) ? game.tags.join(", ") : "",
    categoryId: game.categoryId,
    entryPath: game.entryPath,
  };
}

function toPayload(form: FormValues) {
  const optionalLocale = (value: string) => (value.trim() ? value.trim() : undefined);
  return {
    slug: form.slug.trim(),
    title: { en: form.title.en.trim(), bn: optionalLocale(form.title.bn) },
    shortDescription: { en: form.shortDescription.en.trim(), bn: optionalLocale(form.shortDescription.bn) },
    description: { en: form.description.en.trim(), bn: optionalLocale(form.description.bn) },
    instructions: { en: optionalLocale(form.instructions.en), bn: optionalLocale(form.instructions.bn) },
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    categoryId: form.categoryId,
    entryPath: form.entryPath,
  };
}

function AdminChrome({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState(false);

  async function signOut() {
    setError(false);
    try {
      await apiRequest("/admin/session", {
        method: "DELETE",
        headers: adminMutationHeaders(),
      });
      router.replace("/admin/login");
    } catch {
      setError(true);
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Link className="brand" href="/admin">
              <span className="brand-mark"><ShieldCheck size={18} aria-hidden="true" /></span>
              <span className="brand-copy">
                <strong>{t("brand")}</strong>
                <small>{t("adminTitle")}</small>
              </span>
            </Link>
            <nav className="admin-nav" aria-label={t("adminTitle")}>
              <Link aria-current={pathname === "/admin" ? "page" : undefined} href="/admin">
                <LayoutDashboard size={15} aria-hidden="true" />
                <span>{t("adminOverview")}</span>
              </Link>
              <Link
                aria-current={pathname === "/admin/games" ? "page" : undefined}
                href="/admin/games"
              >
                <List size={15} aria-hidden="true" />
                <span>{t("adminGames")}</span>
              </Link>
              <Link
                aria-current={pathname === "/admin/games/new" ? "page" : undefined}
                href="/admin/games/new"
              >
                <Plus size={15} aria-hidden="true" />
                <span>{t("createGame")}</span>
              </Link>
            </nav>
          </div>

          <div className="header-actions">
            <Link className="button button-ghost button-sm admin-portal-link" href="/">
              <span>{t("backToPortal")}</span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <LanguageSwitcher />
            <button className="button button-secondary button-sm" type="button" onClick={signOut}>
              <LogOut size={14} aria-hidden="true" />
              <span>{t("signOut")}</span>
            </button>
          </div>
        </div>
        <nav className="admin-nav-mobile" aria-label={t("adminTitle")}>
          <Link aria-current={pathname === "/admin" ? "page" : undefined} href="/admin">
            <LayoutDashboard size={14} aria-hidden="true" />
            <span>{t("adminOverview")}</span>
          </Link>
          <Link aria-current={pathname === "/admin/games" ? "page" : undefined} href="/admin/games">
            <List size={14} aria-hidden="true" />
            <span>{t("adminGames")}</span>
          </Link>
          <Link aria-current={pathname === "/admin/games/new" ? "page" : undefined} href="/admin/games/new">
            <Plus size={14} aria-hidden="true" />
            <span>{t("createGame")}</span>
          </Link>
          <Link href="/">
            <ArrowUpRight size={14} aria-hidden="true" />
            <span>{t("backToPortal")}</span>
          </Link>
        </nav>
      </header>
      <main className="admin-page">
        {error && <p className="form-error" role="alert" style={{ marginBottom: 16 }}>{t("operationFailure")}</p>}
        {children}
      </main>
    </div>
  );
}

function AdminGuard({ children }: { children: (identity: AdminIdentity) => ReactNode }) {
  const router = useRouter();
  const { t } = useLocale();
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<AdminSession>("/admin/session")
      .then((response) => {
        if (active) setIdentity(response.admin);
      })
      .catch(() => {
        if (active) {
          setError(true);
          router.replace("/admin/login");
        }
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (!identity) {
    return (
      <main className="admin-page">
        <EmptyState role={error ? "alert" : "status"} message={error ? t("unauthorized") : t("loading")} />
      </main>
    );
  }
  return <AdminChrome>{children(identity)}</AdminChrome>;
}

export function AdminLoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    try {
      await apiRequest<AdminSession>("/admin/session", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace("/admin");
    } catch {
      setStatus("error");
    } finally {
      setPassword("");
    }
  }

  return (
    <main className="admin-page narrow-admin">
      <div className="admin-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark"><ShieldCheck size={18} aria-hidden="true" /></span>
          <span className="brand-copy">
            <strong>{t("brand")}</strong>
            <small>{t("backToPortal")}</small>
          </span>
        </Link>
        <LanguageSwitcher />
      </div>
      <section className="admin-card">
        <h1 className="admin-heading" style={{ fontSize: 28 }}>{t("loginTitle")}</h1>
        <p>{t("loginCopy")}</p>
        <form className="contact-form" onSubmit={submit}>
          <label>
            {t("email")}
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
            />
          </label>
          <label>
            {t("password")}
            <div className="password-field-wrap">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                maxLength={256}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </label>
          {status === "error" && <p className="form-error" role="alert">{t("loginFailure")}</p>}
          <button className="button button-primary" type="submit" disabled={status === "loading"}>
            {status === "loading" ? t("signingIn") : t("signIn")}
          </button>
        </form>
      </section>
    </main>
  );
}

export function AdminDashboardPage() {
  return <AdminGuard>{(identity) => <AdminDashboardContent identity={identity} />}</AdminGuard>;
}

function AdminDashboardContent({ identity }: { identity: AdminIdentity }) {
  const { locale, t } = useLocale();
  const [games, setGames] = useState<AdminGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<AdminGamesResponse>("/admin/games")
      .then(({ games: rows }) => {
        if (active) setGames(rows);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      total: games.length,
      published: games.filter((game) => game.status === "published").length,
      draft: games.filter((game) => game.status === "draft").length,
      unpublished: games.filter((game) => game.status === "unpublished").length,
    }),
    [games],
  );

  return (
    <>
      <div className="admin-toolbar">
        <div>
          <h1 className="admin-heading">{t("adminTitle")}</h1>
          <p className="admin-subtitle" style={{ marginBottom: 0 }}>
            {t("adminWelcome")}: <strong>{identity.displayName}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="button button-secondary" href="/admin/games">
            <List size={15} aria-hidden="true" />
            <span>{t("adminGames")}</span>
          </Link>
          <Link className="button button-primary" href="/admin/games/new">
            <Plus size={15} aria-hidden="true" />
            <span>{t("createGame")}</span>
          </Link>
        </div>
      </div>

      {error && <p className="form-error" role="alert" style={{ marginBottom: 16 }}>{t("adminError")}</p>}

      <div className="admin-grid" style={{ marginTop: 20 }}>
        <div className="admin-stat">
          <span>{t("adminGames")}</span>
          <strong>{loading ? "—" : counts.total}</strong>
        </div>
        <div className="admin-stat">
          <span>{t("published")}</span>
          <strong>{loading ? "—" : counts.published}</strong>
        </div>
        <div className="admin-stat">
          <span>{t("adminDrafts")}</span>
          <strong>{loading ? "—" : counts.draft}</strong>
        </div>
        <div className="admin-stat">
          <span>{t("adminUnpublished")}</span>
          <strong>{loading ? "—" : counts.unpublished}</strong>
        </div>
      </div>

      <section className="section-block" style={{ marginTop: 32 }}>
        <div className="admin-toolbar">
          <div>
            <h2 style={{ margin: 0 }}>{t("manageGames")}</h2>
            <p className="admin-subtitle" style={{ margin: "4px 0 0" }}>{t("adminDashboardSubtitle")}</p>
          </div>
          <Link className="text-link" href="/admin/games">
            <span>{t("seeAll")}</span>
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("titleLabel")}</th>
                <th>{t("categoryLabel")}</th>
                <th>{t("status")}</th>
                <th>{t("updated")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {games.slice(0, 6).map((game) => (
                <tr key={game.id}>
                  <td>
                    {game.title?.[locale] ?? game.title?.en ?? game.slug}
                    <span className="admin-slug-sub">{game.slug}</span>
                  </td>
                  <td>{game.categoryName?.[locale] ?? game.categoryName?.en ?? game.categorySlug}</td>
                  <td><span className={`status-pill ${game.status}`}>{t(game.status)}</span></td>
                  <td>{formatDisplayDate(game.updatedAt, locale)}</td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/admin/games/${game.id}/edit`}>{t("edit")}</Link>
                      <Link href={`/admin/games/${game.id}/preview`}>{t("preview")}</Link>
                      <Link href={`/admin/games/${game.id}/revisions`}>{t("revisions")}</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !games.length && (
                <tr>
                  <td colSpan={5}>{t("emptyGames")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function AdminGamesPage() {
  return <AdminGuard>{() => <AdminGamesContent />}</AdminGuard>;
}

function AdminGamesContent() {
  const { locale, t } = useLocale();
  const [games, setGames] = useState<AdminGame[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<AdminGamesResponse>("/admin/games")
      .then(({ games: rows }) => {
        if (active) setGames(rows);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return games.filter((game) => {
      if (statusFilter !== "all" && game.status !== statusFilter) return false;
      if (!q) return true;
      const enTitle = (game.title?.en ?? "").toLowerCase();
      const bnTitle = (game.title?.bn ?? "").toLowerCase();
      return game.slug.toLowerCase().includes(q) || enTitle.includes(q) || bnTitle.includes(q);
    });
  }, [games, search, statusFilter]);

  return (
    <>
      <div className="admin-toolbar">
        <div>
          <h1 className="admin-heading">{t("adminGames")}</h1>
          <p className="admin-subtitle" style={{ marginBottom: 0 }}>{t("adminDashboardSubtitle")}</p>
        </div>
        <Link className="button button-primary" href="/admin/games/new">
          <Plus size={16} aria-hidden="true" />
          <span>{t("createGame")}</span>
        </Link>
      </div>

      <div className="admin-filters">
        <input
          className="admin-filter-input"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("adminSearchPlaceholder")}
          aria-label={t("adminSearchPlaceholder")}
        />
        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label={t("status")}
        >
          <option value="all">{t("allStatuses")}</option>
          <option value="published">{t("published")}</option>
          <option value="draft">{t("draft")}</option>
          <option value="unpublished">{t("unpublished")}</option>
          <option value="archived">{t("archived")}</option>
        </select>
      </div>

      {loading ? (
        <EmptyState role="status" message={t("loading")} />
      ) : error ? (
        <p className="form-error" role="alert">{t("adminError")}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("titleLabel")}</th>
                <th>{t("categoryLabel")}</th>
                <th>{t("status")}</th>
                <th>{t("updated")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((game) => (
                <tr key={game.id}>
                  <td>
                    {game.title?.[locale] ?? game.title?.en ?? game.slug}
                    <span className="admin-slug-sub">{game.slug}</span>
                  </td>
                  <td>{game.categoryName?.[locale] ?? game.categoryName?.en ?? game.categorySlug}</td>
                  <td><span className={`status-pill ${game.status}`}>{t(game.status)}</span></td>
                  <td>{formatDisplayDate(game.updatedAt, locale)}</td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/admin/games/${game.id}/edit`}>{t("edit")}</Link>
                      <Link href={`/admin/games/${game.id}/preview`}>{t("preview")}</Link>
                      <Link href={`/admin/games/${game.id}/revisions`}>{t("revisions")}</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5}>{t("emptyGames")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function GameEditorPage({ gameId }: { gameId?: string }) {
  return <AdminGuard>{() => <GameEditorContent gameId={gameId} />}</AdminGuard>;
}

function GameEditorContent({ gameId }: { gameId?: string }) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const isNew = !gameId;
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [status, setStatus] = useState<AdminGame["status"]>("draft");
  const [validated, setValidated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const categoriesRequest = apiRequest<CategoryResponse>("/admin/categories");
    const gameRequest = gameId
      ? apiRequest<AdminGamesResponse>("/admin/games")
      : Promise.resolve({ games: [] });
    Promise.all([categoriesRequest, gameRequest])
      .then(([categoryResult, gameResult]) => {
        if (!active) return;
        setCategories(categoryResult.categories);
        if (gameId) {
          const foundRaw = gameResult.games.find((game) => game.id === gameId);
          if (!foundRaw) throw new Error("Game does not exist");
          setForm(formFromGame(foundRaw));
          setStatus(foundRaw.status);
          setValidated(Boolean(foundRaw.validatedAt));
        } else if (categoryResult.categories[0]) {
          setForm((current) => ({ ...current, categoryId: current.categoryId || categoryResult.categories[0]!.id }));
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gameId]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setValidated(false);
  }

  function setLocalized(
    field: "title" | "shortDescription" | "description" | "instructions",
    language: Locale,
    value: string,
  ) {
    setForm((current) => ({ ...current, [field]: { ...current[field], [language]: value } }));
    setValidated(false);
  }

  async function save(navigateAfterSave = true): Promise<string | undefined> {
    setBusy(true);
    setFeedback("");
    setError(false);
    try {
      const result = await apiRequest<{ id: string } | { updated: true }>(
        isNew ? "/admin/games" : `/admin/games/${gameId}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: adminMutationHeaders(),
          body: JSON.stringify(toPayload(form)),
        },
      );
      const id = "id" in result ? result.id : gameId;
      setFeedback(t("saveSuccess"));
      setValidated(false);
      if (isNew && id && navigateAfterSave) {
        router.replace(`/admin/games/${id}/edit`);
        return id;
      }
      return id;
    } catch {
      setError(true);
      setFeedback(t("operationFailure"));
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  async function saveAndValidate() {
    const id = await save(false);
    if (!id) return;
    setBusy(true);
    try {
      await apiRequest(`/admin/games/${id}/validate`, { method: "POST", headers: adminMutationHeaders() });
      setValidated(true);
      setFeedback(t("validated"));
      if (isNew) router.replace(`/admin/games/${id}/edit`);
    } catch {
      setError(true);
      setFeedback(t("operationFailure"));
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!gameId || !validated) return;
    setBusy(true);
    setError(false);
    try {
      await apiRequest(`/admin/games/${gameId}/publish`, { method: "POST", headers: adminMutationHeaders() });
      setStatus("published");
      setValidated(false);
      setFeedback(t("publishSuccess"));
    } catch {
      setError(true);
      setFeedback(t("operationFailure"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmUnpublish() {
    if (!gameId) return;
    setBusy(true);
    setError(false);
    try {
      await apiRequest(`/admin/games/${gameId}/unpublish`, { method: "POST", headers: adminMutationHeaders() });
      setStatus("unpublished");
      setFeedback(t("unpublishSuccess"));
      setConfirmUnpublishOpen(false);
    } catch {
      setError(true);
      setFeedback(t("operationFailure"));
    } finally {
      setBusy(false);
    }
  }

  async function uploadPackage(file: File | undefined) {
    if (!file || !gameId) return;
    setBusy(true);
    setError(false);
    setFeedback("");
    try {
      const headers = new Headers(adminMutationHeaders());
      headers.set("Content-Type", "application/zip");
      const result = await apiRequest<{ entryPath: string }>(`/admin/games/${gameId}/assets`, {
        method: "POST",
        headers,
        body: file,
      });
      setField("entryPath", result.entryPath);
      setFeedback(t("uploadSuccess"));
    } catch {
      setError(true);
      setFeedback(t("operationFailure"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link className="breadcrumbs" href="/admin/games">
        <ArrowLeft size={15} aria-hidden="true" />
        <span>{t("adminGames")}</span>
      </Link>

      <div className="admin-toolbar">
        <div>
          <h1 className="admin-heading">{isNew ? t("createGame") : t("editGame")}</h1>
          <p className="admin-subtitle" style={{ marginBottom: 0 }}>
            {t("status")}: <span className={`status-pill ${status}`}>{t(status)}</span>
          </p>
        </div>
        {gameId && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="button button-secondary button-sm" href={`/admin/games/${gameId}/preview`}>
              <Eye size={14} aria-hidden="true" />
              <span>{t("preview")}</span>
            </Link>
            <Link className="button button-secondary button-sm" href={`/admin/games/${gameId}/revisions`}>
              <History size={14} aria-hidden="true" />
              <span>{t("revisions")}</span>
            </Link>
          </div>
        )}
      </div>

      <div className="workflow-bar" aria-label={t("workflowTitle")}>
        <span className={`workflow-step ${gameId ? "done" : "active"}`}>{t("stepSave")}</span>
        <span className={`workflow-step ${validated ? "done" : gameId ? "active" : ""}`}>{t("stepValidate")}</span>
        <span className={`workflow-step ${gameId ? "active" : ""}`}>{t("stepPreview")}</span>
        <span className={`workflow-step ${status === "published" ? "done" : validated ? "active" : ""}`}>{t("stepPublish")}</span>
      </div>

      {loading ? (
        <EmptyState role="status" message={t("loading")} />
      ) : error && isNew ? (
        <p className="form-error" role="alert">{t("adminError")}</p>
      ) : (
        <form className="admin-card editor-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="editor-grid">
            <label>
              {t("slugLabel")}
              <input
                value={form.slug}
                onChange={(event) => setField("slug", event.target.value)}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                maxLength={64}
              />
            </label>
            <label>
              {t("categoryLabel")}
              <select
                value={form.categoryId}
                onChange={(event) => setField("categoryId", event.target.value)}
                required
              >
                <option value="">{t("chooseCategory")}</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.slug}>
                    {category.name[locale] ?? category.name.en}
                  </option>
                ))}
              </select>
            </label>

            <LocalizedField
              label={t("titleLabel")}
              value={form.title}
              onChange={(language, value) => setLocalized("title", language, value)}
            />
            <LocalizedField
              label={t("shortLabel")}
              value={form.shortDescription}
              onChange={(language, value) => setLocalized("shortDescription", language, value)}
            />
            <LocalizedField
              className="span-two"
              label={t("descriptionLabel")}
              value={form.description}
              onChange={(language, value) => setLocalized("description", language, value)}
              multiline
            />
            <LocalizedField
              className="span-two"
              label={t("instructionsLabel")}
              value={form.instructions}
              onChange={(language, value) => setLocalized("instructions", language, value)}
              multiline
            />

            <label>
              {t("tagsLabel")}
              <input value={form.tags} onChange={(event) => setField("tags", event.target.value)} maxLength={300} />
            </label>
            <label>
              {t("buildLabel")}
              <select value={form.entryPath} onChange={(event) => setField("entryPath", event.target.value)}>
                {!["/games/meteor-dash/index.html", "/games/orbit-memory/index.html"].includes(form.entryPath) && (
                  <option value={form.entryPath}>{t("uploadedBuild")}</option>
                )}
                <option value="/games/meteor-dash/index.html">Meteor Dash</option>
                <option value="/games/orbit-memory/index.html">Orbit Memory</option>
              </select>
            </label>
            <label className="span-two">
              {t("uploadBuild")}
              <input
                type="file"
                accept=".zip,application/zip"
                disabled={!gameId || busy}
                aria-describedby="upload-help"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  void uploadPackage(file);
                }}
              />
              <small id="upload-help" className="editor-help">{t("uploadHelp")}</small>
            </label>
          </div>

          {!validated && gameId && (
            <p className="editor-help" style={{ margin: 0 }}>{t("publishRequiresValidation")}</p>
          )}
          <p className={`admin-feedback${error ? " error" : ""}`} role={error ? "alert" : "status"}>
            {feedback}
          </p>

          <div className="editor-actions">
            <button className="button button-secondary" type="submit" disabled={busy}>
              {busy ? t("saving") : t("saveDraft")}
            </button>
            <button className="button button-secondary" type="button" onClick={() => void saveAndValidate()} disabled={busy}>
              {t("validate")}
            </button>
            <button
              className="button button-primary"
              type="button"
              onClick={() => void publish()}
              disabled={busy || !gameId || !validated}
            >
              <Check size={15} aria-hidden="true" />
              <span>{t("publish")}</span>
            </button>
            {status === "published" && (
              <button
                className="button button-danger"
                type="button"
                onClick={() => setConfirmUnpublishOpen(true)}
                disabled={busy}
              >
                {t("unpublish")}
              </button>
            )}
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmUnpublishOpen}
        title={t("unpublish")}
        message={t("confirmUnpublish")}
        confirmLabel={t("unpublish")}
        cancelLabel={t("cancel")}
        busy={busy}
        danger
        onConfirm={() => void confirmUnpublish()}
        onCancel={() => setConfirmUnpublishOpen(false)}
      />
    </>
  );
}

function LocalizedField({
  label,
  value,
  onChange,
  multiline = false,
  className = "",
}: {
  label: string;
  value: Record<Locale, string>;
  onChange: (locale: Locale, value: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  const { t } = useLocale();
  const Field = multiline ? "textarea" : "input";
  return (
    <fieldset className={`localized-field ${className}`}>
      <legend>{label}</legend>
      <label>
        English
        <Field
          value={value.en}
          onChange={(event) => onChange("en", event.target.value)}
          required={label !== t("instructionsLabel")}
          maxLength={multiline ? 4000 : 240}
        />
      </label>
      <label lang="bn">
        বাংলা
        <Field
          value={value.bn}
          onChange={(event) => onChange("bn", event.target.value)}
          maxLength={multiline ? 4000 : 240}
        />
      </label>
    </fieldset>
  );
}

export function AdminPreviewPage({ gameId }: { gameId: string }) {
  return <AdminGuard>{() => <AdminPreviewContent gameId={gameId} />}</AdminGuard>;
}

function AdminPreviewContent({ gameId }: { gameId: string }) {
  const { locale, t } = useLocale();
  const [game, setGame] = useState<Game | null>(null);
  const [previewToken, setPreviewToken] = useState<string>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest<{ game: Game; previewToken?: string }>(`/admin/games/${gameId}/preview`)
      .then(({ game: draft, previewToken: token }) => {
        if (active) {
          setGame(draft);
          setPreviewToken(token);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [gameId]);

  const packageId = /^\/packages\/([0-9a-f-]{36})\/index\.html$/i.exec(game?.entryPath ?? "")?.[1];
  const entryPath = game
    ? packageId
      ? previewToken
        ? `/preview/${packageId}/${encodeURIComponent(previewToken)}/index.html`
        : undefined
      : game.entryPath
    : undefined;

  return (
    <>
      <Link className="breadcrumbs" href={`/admin/games/${gameId}/edit`}>
        <ArrowLeft size={15} aria-hidden="true" />
        <span>{t("editGame")}</span>
      </Link>
      <div className="admin-toolbar">
        <div>
          <h1 className="admin-heading">{t("preview")}</h1>
          {game && (
            <p className="admin-subtitle" style={{ marginBottom: 0 }}>
              {game.title?.[locale] ?? game.title?.en} · <span className="status-pill draft">{t("draft")}</span>
            </p>
          )}
        </div>
      </div>

      {error && <p className="form-error" role="alert">{t("adminError")}</p>}
      {game && !entryPath && <p className="form-error" role="alert">{t("adminError")}</p>}
      {game && entryPath && (
        <div className="player-wrap">
          <div className="player-stage">
            <iframe
              className="game-frame"
              src={`${process.env.NEXT_PUBLIC_GAME_ORIGIN ?? "http://localhost:4002"}${entryPath}?lang=${locale}`}
              title={game.title?.[locale] ?? game.title?.en ?? "Private game preview"}
              sandbox="allow-scripts"
              allow="fullscreen"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="player-toolbar">
            <div className="player-toolbar-title">
              <span className="player-live-dot active" aria-hidden="true" />
              <strong>{game.title?.[locale] ?? game.title?.en}</strong>
            </div>
            <div className="player-toolbar-actions">
              <span className="status-pill draft">
                <Maximize2 size={12} aria-hidden="true" />
                <span>{t("preview")}</span>
              </span>
            </div>
          </div>
          <p className="player-safety">{t("playerSafety")}</p>
        </div>
      )}
    </>
  );
}

export function RevisionsPage({ gameId }: { gameId: string }) {
  return <AdminGuard>{() => <RevisionsContent gameId={gameId} />}</AdminGuard>;
}

function RevisionsContent({ gameId }: { gameId: string }) {
  const { locale, t } = useLocale();
  const [revisions, setRevisions] = useState<
    Array<{ id: string; revision_number: number; created_at: string; content_hash: string }>
  >([]);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRevisionId, setConfirmRevisionId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    apiRequest<{ revisions: typeof revisions }>(`/admin/games/${gameId}/revisions`)
      .then(({ revisions: rows }) => {
        if (active) setRevisions(rows);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [gameId, reload]);

  async function confirmRollback() {
    if (!confirmRevisionId) return;
    setBusyId(confirmRevisionId);
    setFeedback("");
    setError(false);
    try {
      await apiRequest(`/admin/games/${gameId}/rollback`, {
        method: "POST",
        headers: adminMutationHeaders(),
        body: JSON.stringify({ revisionId: confirmRevisionId }),
      });
      setFeedback(t("publishSuccess"));
      setConfirmRevisionId(null);
      setReload((value) => value + 1);
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Link className="breadcrumbs" href={`/admin/games/${gameId}/edit`}>
        <ArrowLeft size={15} aria-hidden="true" />
        <span>{t("editGame")}</span>
      </Link>
      <h1 className="admin-heading">{t("revisions")}</h1>
      {error && <p className="form-error" role="alert">{t("adminError")}</p>}
      <div className="admin-card">
        {revisions.map((revision) => (
          <div className="revision-row" key={revision.id}>
            <div>
              <strong>#{revision.revision_number}</strong>
              <small>
                {formatDisplayDate(revision.created_at, locale)} · {revision.content_hash.slice(0, 12)}
              </small>
            </div>
            <button
              className="button button-secondary button-sm"
              type="button"
              onClick={() => setConfirmRevisionId(revision.id)}
              disabled={Boolean(busyId)}
            >
              {busyId === revision.id ? t("saving") : t("rollback")}
            </button>
          </div>
        ))}
        {!revisions.length && <p>{t("noRevisions")}</p>}
        <p className="admin-feedback" role="status">{feedback}</p>
      </div>

      <ConfirmDialog
        open={Boolean(confirmRevisionId)}
        title={t("revisions")}
        message={t("confirmRollback")}
        confirmLabel={t("rollback")}
        cancelLabel={t("cancel")}
        busy={Boolean(busyId)}
        onConfirm={() => void confirmRollback()}
        onCancel={() => setConfirmRevisionId(null)}
      />
    </>
  );
}
