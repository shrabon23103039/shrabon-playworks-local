"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { ContactForm } from "./contact-form";
import { useLocale } from "./locale-provider";
import { PageContainer, SiteShell } from "./site-shell";
import { EmptyState } from "./ui-primitives";

export function ContactPage() {
  const { t } = useLocale();
  return (
    <SiteShell>
      <PageContainer narrow>
        <div className="contact-layout">
          <div>
            <span className="section-eyebrow">{t("navContact")}</span>
            <h1 className="page-title">{t("contactTitle")}</h1>
            <p className="page-copy">{t("contactCopy")}</p>
          </div>
          <ContactForm />
        </div>
      </PageContainer>
    </SiteShell>
  );
}

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { t } = useLocale();
  const privacy = kind === "privacy";
  return (
    <SiteShell>
      <PageContainer narrow>
        <span className="section-eyebrow">{t(privacy ? "footerPrivacy" : "footerTerms")}</span>
        <h1 className="page-title">{t(privacy ? "privacyTitle" : "termsTitle")}</h1>
        <p className="legal-copy">{t(privacy ? "privacyCopy" : "termsCopy")}</p>
        {privacy && <p className="legal-note">{t("privacyPending")}</p>}
      </PageContainer>
    </SiteShell>
  );
}

export function NotFoundPage() {
  const { t } = useLocale();
  return (
    <SiteShell>
      <PageContainer narrow>
        <EmptyState
          icon={<Compass size={26} />}
          message={t("notFound")}
          action={(
            <Link className="button button-primary" href="/">
              {t("goHome")}
            </Link>
          )}
        />
      </PageContainer>
    </SiteShell>
  );
}
