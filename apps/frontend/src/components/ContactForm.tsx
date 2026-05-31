"use client";

import { useState } from "react";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-stack-sm py-stack-lg text-center">
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: "40px", fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        <p className="font-headline-md text-headline-md text-on-surface">
          Poruka poslata!
        </p>
        <p className="font-body-md text-body-md text-secondary">
          Odgovorićemo vam uskoro.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-stack-md">
      <div className="flex flex-col gap-unit">
        <label
          className="font-label-md text-label-md text-on-surface-variant"
          htmlFor="contact-name"
        >
          Ime i Prezime
        </label>
        <input
          id="contact-name"
          type="text"
          placeholder="Vaše ime"
          className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex flex-col gap-unit">
        <label
          className="font-label-md text-label-md text-on-surface-variant"
          htmlFor="contact-email"
        >
          Email adresa
        </label>
        <input
          id="contact-email"
          type="email"
          required
          placeholder="vas@email.com"
          className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex flex-col gap-unit">
        <label
          className="font-label-md text-label-md text-on-surface-variant"
          htmlFor="contact-subject"
        >
          Naslov poruke
        </label>
        <input
          id="contact-subject"
          type="text"
          placeholder="Tema"
          className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="flex flex-col gap-unit">
        <label
          className="font-label-md text-label-md text-on-surface-variant"
          htmlFor="contact-message"
        >
          Poruka
        </label>
        <textarea
          id="contact-message"
          placeholder="Kako možemo da pomognemo?"
          className="w-full bg-surface-bright border border-outline-variant rounded px-3 py-2 font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[120px]"
        />
      </div>
      <button
        type="submit"
        className="font-label-md text-label-md text-on-primary-container bg-primary-container px-6 py-3 rounded-DEFAULT transition-colors hover:opacity-90 shadow-sm mt-stack-sm self-start"
      >
        Pošalji poruku
      </button>
    </form>
  );
}
