import UploadForm from "@/components/UploadForm";
import { ContactForm } from "@/components/ContactForm";
import { NavBar } from "@/components/NavBar";

// ── Gallery images from design ────────────────────────────
const galleryItems = [
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCaXpWByUNxgb4uJtPff8IKhz3q8baSP8EUGL-E9TdGdCL1O-onlFHYlVCnyhV-3KvXTPdPth6AA4CQo4j5Gfd50U9apkZ_CBYvadlTL5QDU9KcNC9NlUpGcvvmLMVhnz-kx87yAaxyv9wSuJYnjRrsTddkBtmp-ONCuHSC8GP2Uz4KxCmKnEedPOHW5yzesoFn_kE5ti_wSaic5xI9lP9rS7EXluM6c9Vj_j9IOGzrlLGeQjM78fTfFUYFuSRJKd92iyQqq_iM55M",
    alt: "3D printed geometric vase",
    category: "Dekor",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCVhhMziPbPgie8xRNzUkjncFwUmzM7nRBT-xKT4YasUPJFtTwRpDkwjcmC105mZRr8uVGG5WWK90rg5P4-RZSmIvb3ehzqLMXPQqj-GSdQutoQYk7Z_ewMLiuv_BZHSrKnKEWEGKPSWNrrELFWe6UxSII1wU62NFwnhZhF2XlI5Y0f82S2h3G7wOhjUeo2nlv1Nld3reF8ntoYyxPtOxDgk9s-dmIAE41ZTdTMnfkIDxpRGQ4-myRB0W3DVIzLdGKhNuYKzXKwW6o",
    alt: "Cyberpunk mask 3D print",
    category: "Cosplay",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDFEpkpofHj0dQGuD4SIVwDNB4fTVx4O4KLAVIH8hjVirNOV2fQcPlSyYmEZGs8EEecEy75QKq_m_N8JZWOO6kECebfBBKk5-rMK3Esse7Dobtpq4oya0aJ-4HB8MeRYfEAyaj2umaoPVUzIkeK6xAaI6GDiY5ajIINF0pUqdBxmR7kZwrnkI2_O9POBnJf6SonIDmmtbCqKpsbaJrveEjKDX6ALcz09ll2c-RP-QNe2mqvSFs7As7lRuvB3C1CA56iWJMVF_VdAn8",
    alt: "Mechanical drone parts",
    category: "Industrija",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAwbZdUypsntu78oK8X3_di9HKQ1ca5T98Ztbmf8M-5MqbNYk8QezFbJz8LaVNY-ZUJRM3ogQrNxMKL37PwJVxYHVbonNqLjGGiSxBpxHmy0tZCIus-ybPCKgbqsMBA0w1lTruUDhYxDQL3Tfe0M2wJdGabeplgTSCB6e-_AuSwY-EiA8H7CjAjuQ0UAMBRqAM5LG2P65LMT1HLzCH79yNKtPr_OJHxuiU6TMzj3GtGDDry-gdfaEiq4IEg82HX541yEdMTZr2fTog",
    alt: "Medical anatomical model",
    category: "Medicina",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuADCiWNAoq87XjE3I09KTpIgbhDwPJbMINdaziSl7OQXD_WB0D8GQbaK7Zzi7I12GEA5c78kv7CaEWK-GCADirawLzOzCTsaLULHkvadfqeYFTweQm9Vm066VxO0YrW25rV5d70RYjHc6Cxl0DyT_zLIWWBOAdQD2z-rdlPfCC3DrBMqcZfl0qx8JCCaxeWT3NHgcyzyHTlS7sg8mWFKAkFut1z5MQHelSveRm7CptQROQF0idONnqA7K35pXsmKeimxvFRMHbOnbY",
    alt: "Topographical map print",
    category: "Dekor",
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCBjUIW3ICJ9nYQR92j4YXfo5czx3uF_b3K9aX_jB9PatBmVTGkzYJFkT4K46ZoFSAyPVWnILixerlLGzb7tf0OnsMSmFixx0yEV_beTAw2pK6C7F_LWeubnvCPPLKurwyYfrnHUU37u71wrGir3JHIhYO6Y-8WpKuLfQf07jiA-LMpdcxwQEMgDiLwLI77tKibAYgfQ1cXBz-X9pSj9t2J6-_4QuNaOmavEQ4usjd36LgNOQVoSe2MXR1kek9izmpN1MBftlR65AU",
    alt: "Miniature tabletop figures",
    category: "Cosplay",
  },
];

const faqItems = [
  {
    q: "Koje materijale koristite?",
    a: "Koristimo širok spektar materijala uključujući PLA, PETG, ABS, kao i specijalizovane smole (resin) za modele visokih detalja.",
  },
  {
    q: "Koliko traje izrada?",
    a: "Vreme izrade zavisi od veličine i kompleksnosti modela. Prosečno vreme za manje modele je 1-3 dana, dok veći projekti mogu potrajati duže.",
  },
  {
    q: "Koje formate fajlova podržavate?",
    a: "Prihvatamo .STL i .OBJ formate. Ukoliko imate drugi format, kontaktirajte nas pre slanja.",
  },
  {
    q: "Da li radite obradu modela nakon štampe?",
    a: "Da, nudimo usluge osnovne obrade (uklanjanje nosača, brušenje) po dogovoru.",
  },
  {
    q: "Kako se vrši dostava?",
    a: "Dostavu vršimo kurirskim službama na teritoriji cele Srbije. Moguće je i lično preuzimanje.",
  },
];

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface">
      <NavBar />

      {/* ── MAIN ─────────────────────────────────────────── */}
      <main className="flex-grow flex flex-col gap-section-gap py-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">

        {/* ── HERO ─────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-center">
          <div className="flex flex-col gap-stack-lg">
            <div>
              <h1 className="font-display-lg text-display-lg text-on-surface mb-stack-md">
                Šta štampamo?<br />
                <span className="text-primary">Vaše ideje</span> u stvarnost.
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">
                Cosplay rekviziti, dekor, prototipovi — štampamo za tebe.
                Pošalji 3D model i dobij okvirnu cenu za minut.
              </p>
            </div>
            <div className="flex gap-stack-md flex-wrap">
              <a
                href="#kalkulator"
                className="font-label-md text-label-md font-semibold text-white bg-primary-container px-6 py-3 rounded-DEFAULT transition-colors hover:opacity-90 shadow-sm flex items-center gap-2"
              >
                Izračunaj cenu
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>calculate</span>
              </a>
              <a
                href="#galerija"
                className="font-label-md text-label-md text-primary bg-surface-container-lowest border border-primary px-6 py-3 rounded-DEFAULT transition-colors hover:bg-surface-container-low shadow-sm flex items-center gap-2"
              >
                Pogledaj radove
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>photo_library</span>
              </a>
            </div>
          </div>

          {/* Hero image grid */}
          <div className="grid grid-cols-2 gap-unit h-full rounded-lg overflow-hidden border border-outline-variant/30">
            <div className="col-span-2 h-48 md:h-64 bg-surface-container relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuChSZD4I7mZ-iVYuLaBO-QoiwpECoAC8JFhrJUmtzzFvjRXmKu6dNO9GvDWs7kGc8dfSL8k7UhkQM4CPw52ZSb7YqL0GSnF9oCGxN9nl7Ou1MuL_dSvZ2ZMP7npEDpmHcpFKivxOHtpnFM0ZjFvwi5zYJggjrvlS31E4ZrX0LkS6w1XasedvEHBPeAF0075QapmxOElK1TmeqVjMdXrwnvMXreDF0m6_EXIBEDVnunfQriukmtglE5EvMKnM1e7Gx-DFbJacqx31fc"
                alt="3D printed architectural model"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-1 rounded font-label-sm text-label-sm text-on-surface border border-outline-variant/50">
                Arhitektura
              </div>
            </div>
            <div className="h-32 md:h-48 bg-surface-container relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAy_esqzwDI25jJbEAI8l1KRQQ-UAPEha4v7dsQ4bJ_EKjS_oU2EBFFteqC5FsnV24WG9xu0395WQccaunpKGXzmUEm-ssItPORJPs0DybrsBAaQ8gt5j9712SY5ILobImo7r4BKbsgjZN3gQi7EIlP9D_ksyqrrFWCCTc2tlnd_W0920o-L294HM-6S85z0jjLxJFHDUBscivXO5guK2-9LHBw0HhCc0SYwVt56OyH4yUIeMuls69MQ_XFwps9U0K1-8bnt-hhryw"
                alt="Industrial 3D printed prototype gear"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-1 rounded font-label-sm text-label-sm text-on-surface border border-outline-variant/50">
                Prototipovi
              </div>
            </div>
            <div className="h-32 md:h-48 bg-surface-container relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7wEalUcwSHklHkU0GgTNj01zIEiUfMwCu5pwz0CGng2DF9hfyJl2rUFLL-LHKaf_-62hQ9Ko9Dcrj49cg21XmQpq1BwuiTZ3NY3VBKMltgrF-jrpHJmlPLSWZDLtd3-_iv1JRFWdyZbiBqVJbSySHN2ZO_ryUkr-zEZXg44Iw0rR7Nri3BY7Pe6--WW1hfVDzJHHxfvIvZ4DGqyJMJLaD1oYICZlJPWcU54RbRFq-SwZXClK--MkgO4LU2EJHUYUC_qnvy9DGUxU"
                alt="3D printed jewelry resin"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-1 rounded font-label-sm text-label-sm text-on-surface border border-outline-variant/50">
                Nakit
              </div>
            </div>
          </div>
        </section>

        {/* ── SERVICES ─────────────────────────────────── */}
        <section id="Modeli" className="flex flex-col gap-stack-lg">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">
              Usluge 3D štampe
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Specijalizovani smo za razne oblasti primene.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-stack-md">
            {[
              { icon: "sports_martial_arts", label: "Cosplay" },
              { icon: "chair", label: "Dekor" },
              { icon: "precision_manufacturing", label: "Prototipovi" },
              { icon: "architecture", label: "Arhitektura" },
              { icon: "diamond", label: "Nakit" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center p-stack-md bg-surface-container-lowest rounded-lg border border-outline-variant text-center gap-stack-sm"
              >
                <span className="material-symbols-outlined text-4xl text-primary">
                  {icon}
                </span>
                <span className="font-label-md text-label-md text-on-surface">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── GALLERY ──────────────────────────────────── */}
        <section id="galerija" className="flex flex-col gap-stack-lg">
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-stack-md">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">
                Galerija radova
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Pregled nekih od naših nedavnih projekata izrađenih sa visokom
                preciznošću.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {["Sve", "Cosplay", "Dekor", "Industrija"].map((filter) => (
                <button
                  key={filter}
                  className={`font-label-sm text-label-sm text-on-surface px-3 py-1 rounded-full border border-outline-variant transition-colors ${
                    filter === "Sve"
                      ? "bg-surface-variant"
                      : "bg-surface-container-lowest hover:bg-surface-container-low"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-gutter">
            {galleryItems.map((item) => (
              <div
                key={item.src}
                className="aspect-square rounded-lg border border-outline-variant overflow-hidden bg-surface-container relative group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-surface/0 group-hover:bg-surface/10 transition-colors" />
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING TABLE ─────────────────────────────── */}
        <section id="Cenovnik" className="flex flex-col gap-stack-lg">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">
              Cenovnik
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Transparentne cene bazirane na potrošnji materijala i vremenu
              izrade.
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container-lowest">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="font-label-md text-label-md text-on-surface-variant py-3 px-4">
                    Materijal
                  </th>
                  <th className="font-label-md text-label-md text-on-surface-variant py-3 px-4">
                    Karakteristike
                  </th>
                  <th className="font-label-md text-label-md text-on-surface-variant py-3 px-4 text-right">
                    Cena po gramu (RSD)
                  </th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface">
                {[
                  { mat: "PLA", desc: "Standardni detalji, biorazgradiv", price: "15.00" },
                  { mat: "PETG", desc: "Visoka izdržljivost, otporan na vlagu", price: "20.00" },
                  { mat: "ABS", desc: "Otporan na temperaturu i udarce", price: "22.00" },
                  { mat: "Standard Resin", desc: "Izuzetno visoka rezolucija detalja", price: "45.00" },
                ].map(({ mat, desc, price }, i, arr) => (
                  <tr
                    key={mat}
                    className={`${i < arr.length - 1 ? "border-b border-outline-variant/50" : ""} hover:bg-surface-bright transition-colors`}
                  >
                    <td className="py-3 px-4 font-label-md text-label-md">{mat}</td>
                    <td className="py-3 px-4 text-on-surface-variant">{desc}</td>
                    <td className="py-3 px-4 text-right">{price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CALCULATOR ───────────────────────────────── */}
        <section id="kalkulator" className="flex flex-col gap-stack-lg">
          <div className="mb-stack-sm">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">
              Kalkulator cene
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Proverite troškove i pripremite svoj model za proizvodnju.
            </p>
          </div>
          <UploadForm />
        </section>

        {/* ── FAQ ──────────────────────────────────────── */}
        <section id="Podrška" className="flex flex-col gap-stack-lg">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">
              Česta pitanja
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Sve što treba da znate o procesu 3D štampe.
            </p>
          </div>
          <div className="flex flex-col gap-stack-sm">
            {faqItems.map(({ q, a }) => (
              <details
                key={q}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg group"
              >
                <summary className="font-headline-md text-headline-md text-on-surface p-stack-md cursor-pointer flex justify-between items-center list-none [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="material-symbols-outlined group-open:rotate-180 transition-transform">
                    expand_more
                  </span>
                </summary>
                <div className="p-stack-md pt-0">
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    {a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CONTACT ──────────────────────────────────── */}
        <section id="kontakt" className="flex flex-col gap-stack-lg max-w-2xl mx-auto w-full bg-surface-container-lowest p-margin-mobile md:p-margin-desktop rounded-lg border border-outline-variant">
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-stack-sm">
              Kontaktirajte nas
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Imate specifičan zahtev ili pitanje? Pošaljite nam poruku.
            </p>
          </div>
          <ContactForm />
        </section>
      </main>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="bg-surface-container-low border-t border-outline-variant mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-stack-lg max-w-container-max mx-auto gap-gutter">
          <div className="font-label-md text-label-md font-bold text-primary mb-stack-md md:mb-0">
            © {new Date().getFullYear()} printuj.me. Precizna izrada za moderne kreatore.
          </div>
          <nav className="flex flex-wrap justify-center gap-stack-md">
            {["Politika privatnosti", "Uslovi korišćenja", "Kontaktirajte nas"].map(
              (link) => (
                <a
                  key={link}
                  href="#"
                  className="font-label-md text-label-md text-secondary hover:text-primary hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary-container rounded"
                >
                  {link}
                </a>
              )
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}

