"use client";

import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { apiRequest } from "@/lib/api";
import { useLocale } from "./locale-provider";

export function ContactForm() {
  const { t } = useLocale();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await apiRequest("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          message: form.get("message"),
        }),
      });
      formElement.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="contact-form" onSubmit={submit}>
      <label>
        {t("name")}
        <input name="name" autoComplete="name" maxLength={100} required placeholder={t("formNamePlaceholder")} />
      </label>
      <label>
        {t("email")}
        <input name="email" type="email" autoComplete="email" maxLength={254} required />
      </label>
      <label>
        {t("message")}
        <textarea name="message" rows={6} minLength={10} maxLength={4000} required placeholder={t("formMessagePlaceholder")} />
      </label>
      {status === "sent" && <p className="form-success" role="status">{t("contactSuccess")}</p>}
      {status === "error" && <p className="form-error" role="alert">{t("contactFailure")}</p>}
      <button className="button button-primary" type="submit" disabled={status === "sending"}>
        <Send size={16} aria-hidden="true" />
        <span>{status === "sending" ? t("sending") : t("sendMessage")}</span>
      </button>
    </form>
  );
}
