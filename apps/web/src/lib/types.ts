export type Locale = "en" | "bn";
export type LocalizedText = Partial<Record<Locale, string>> & { en: string };

export type Category = {
  slug: string;
  name: LocalizedText;
};

export type Game = {
  id?: string;
  slug: string;
  title: LocalizedText;
  shortDescription: LocalizedText;
  description: LocalizedText;
  instructions: Partial<Record<Locale, string>>;
  tags: string[];
  categoryId?: string;
  category?: LocalizedText;
  categorySlug?: string;
  entryPath: string;
  status?: "draft" | "published" | "unpublished" | "archived";
  publishedAt?: string | null;
  activeRevisionId?: string | null;
};

export type AdminIdentity = {
  id: string;
  email: string;
  displayName: string;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  requestId?: string;
};
