import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL, operatorLine } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Zásady ochrany osobních údajů",
  description: "Jak podpalto.cz zpracovává osobní údaje uživatelů a prodejců, na jakém základě, jak dlouho a jaká máte práva.",
  alternates: { canonical: "/ochrana-osobnich-udaju" },
};

const mail = (
  <a href={`mailto:${LEGAL.email}`} className="underline">
    {LEGAL.email}
  </a>
);

export default function OchranaOsobnichUdajuPage() {
  return (
    <LegalPage
      title="Zásady ochrany osobních údajů"
      other={{ href: "/obchodni-podminky", label: "Obchodní podmínky" }}
      intro={
        <p>
          Tyto zásady vysvětlují, jak služba {LEGAL.brand} zpracovává osobní údaje v souladu s nařízením (EU) 2016/679
          (GDPR) a zákonem č. 110/2019 Sb. Správcem osobních údajů je {operatorLine()} (dále jen „správce“). Ve věcech
          osobních údajů nás kontaktujte na {mail}.
        </p>
      }
      sections={[
        {
          id: "udaje",
          title: "Jaké údaje zpracováváme",
          body: (
            <ul>
              <li>
                <strong>Účet:</strong> e-mail, jméno, případně telefon, heslo (ukládá se jen v zašifrované podobě), tarif a
                role.
              </li>
              <li>
                <strong>Nastavení:</strong> jazyk, měna, motiv, zvolená poloha (adresa nebo PSČ, které sami zadáte) a
                prodejci vybraní k porovnání.
              </li>
              <li>
                <strong>Poptávky u prodejců:</strong> jméno, telefon, e-mail, adresa doručení, množství a poznámka.
              </li>
              <li>
                <strong>Obsah, který vložíte:</strong> hodnocení a recenze prodejců, články na blog včetně fotografií.
              </li>
              <li>
                <strong>Převzetí profilu prodejce:</strong> jméno, role ve firmě, kontakt, IČO a podklady k ověření.
              </li>
              <li>
                <strong>Platby:</strong> údaje o předplatném a dokladech; údaje o platební kartě zpracovává jen poskytovatel
                platebních služeb.
              </li>
              <li>
                <strong>Technické údaje:</strong> IP adresa, typ prohlížeče a záznamy o přihlášení, nezbytné pro chod a
                zabezpečení služby.
              </li>
            </ul>
          ),
        },
        {
          id: "ucely",
          title: "Proč údaje zpracováváme a na jakém základě",
          body: (
            <ul>
              <li>
                <strong>Plnění smlouvy</strong> (čl. 6 odst. 1 písm. b GDPR) – vedení účtu, poskytování funkcí podle tarifu,
                předání poptávky prodejci, vyřízení žádosti o převzetí profilu.
              </li>
              <li>
                <strong>Právní povinnost</strong> (písm. c) – účetnictví a daňové doklady u placených tarifů.
              </li>
              <li>
                <strong>Oprávněný zájem</strong> (písm. f) – zabezpečení služby, prevence zneužití, moderace obsahu,
                zobrazování veřejných údajů o prodejcích a zlepšování služby.
              </li>
              <li>
                <strong>Souhlas</strong> (písm. a) – pokud o něj výslovně požádáme (např. pro zasílání novinek); souhlas
                můžete kdykoli odvolat.
              </li>
            </ul>
          ),
        },
        {
          id: "prodejci",
          title: "Údaje o prodejcích",
          body: (
            <>
              <p>
                O prodejcích zveřejňujeme údaje, které sami veřejně uvádějí na svých webových stránkách nebo které jsou
                ve veřejných rejstřících (např. ARES): název, IČO, adresu provozovny, kontakty, ceník a podmínky dopravy.
                U prodejců, kteří jsou fyzickými osobami – podnikateli, mohou tyto údaje být osobními údaji.
              </p>
              <p>
                Zpracováváme je na základě oprávněného zájmu na poskytování srovnání cen veřejnosti. Prodejce může vznést
                námitku, požádat o opravu nebo odstranění údajů na {mail}; vyhovíme bez zbytečného odkladu.
              </p>
            </>
          ),
        },
        {
          id: "prijemci",
          title: "Komu údaje předáváme",
          body: (
            <>
              <p>Údaje zpracovávají tito dodavatelé (zpracovatelé) jen v rozsahu nutném pro jejich službu:</p>
              <ul>
                <li>Supabase – databáze, přihlášení a úložiště souborů,</li>
                <li>Vercel – provoz webu (hosting),</li>
                <li>poskytovatel e-mailových služeb – odesílání e-mailů k účtu,</li>
                <li>poskytovatel platebních služeb – platby placených tarifů,</li>
                <li>
                  služby mapových podkladů a vyhledávání adres (OpenStreetMap, Photon) – dostávají text adresy, kterou
                  zadáte do vyhledávání na mapě.
                </li>
              </ul>
              <p>
                Poptávku předáme prodejci, kterému ji posíláte. Některé dodavatele mají sídlo mimo Evropskou unii; předání
                údajů je v takovém případě chráněno standardními smluvními doložkami Evropské komise nebo rozhodnutím
                o odpovídající ochraně. Údaje neprodáváme.
              </p>
            </>
          ),
        },
        {
          id: "doba",
          title: "Jak dlouho údaje uchováváme",
          body: (
            <ul>
              <li>Údaje účtu a nastavení – po dobu existence účtu.</li>
              <li>Poptávky – 3 roky od odeslání kvůli případným sporům.</li>
              <li>Recenze a články – dokud je nesmažete nebo dokud účet nezrušíte (zveřejněné články mohou zůstat podepsané).</li>
              <li>Účetní a daňové doklady – 10 let podle zákona.</li>
              <li>Technické záznamy – nejvýše 12 měsíců.</li>
            </ul>
          ),
        },
        {
          id: "cookies",
          title: "Cookies a úložiště v prohlížeči",
          body: (
            <p>
              Používáme jen nezbytné cookies pro přihlášení a zabezpečení a úložiště prohlížeče (localStorage) pro vaše
              nastavení, jako je jazyk, měna, motiv nebo rozepsaný článek. Nepoužíváme reklamní ani analytické cookies
              třetích stran, proto nevyžadujeme souhlas s cookies. Pokud bychom je v budoucnu zavedli, vyžádáme si váš
              souhlas předem.
            </p>
          ),
        },
        {
          id: "prava",
          title: "Vaše práva",
          body: (
            <>
              <p>Máte právo:</p>
              <ul>
                <li>na přístup ke svým údajům a jejich kopii,</li>
                <li>na opravu nepřesných údajů,</li>
                <li>na výmaz („být zapomenut“), pokud údaje už nepotřebujeme,</li>
                <li>na omezení zpracování,</li>
                <li>na přenositelnost údajů,</li>
                <li>vznést námitku proti zpracování na základě oprávněného zájmu,</li>
                <li>odvolat souhlas, pokud je zpracování na souhlasu založeno.</li>
              </ul>
              <p>
                Žádosti posílejte na {mail}; vyřídíme je do jednoho měsíce. Máte také právo podat stížnost u Úřadu pro
                ochranu osobních údajů (
                <a href="https://uoou.gov.cz" className="underline" target="_blank" rel="noreferrer">
                  uoou.gov.cz
                </a>
                ).
              </p>
            </>
          ),
        },
        {
          id: "zabezpeceni",
          title: "Zabezpečení",
          body: (
            <p>
              Přístup k údajům je omezen oprávněními v databázi, komunikace je šifrovaná (HTTPS), hesla se ukládají jen
              v zašifrované podobě a hesla, která unikla při známých únicích dat, odmítáme.
            </p>
          ),
        },
        {
          id: "zmeny",
          title: "Změny zásad",
          body: (
            <p>
              Zásady můžeme aktualizovat. O podstatných změnách informujeme registrované uživatele e-mailem. Tyto zásady
              jsou účinné od {LEGAL.effectiveFrom}.
            </p>
          ),
        },
      ]}
    />
  );
}
