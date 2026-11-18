import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL, operatorLine } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Obchodní podmínky",
  description: "Obchodní podmínky služby podpalto.cz – srovnávač cen palivového dřeva, pelet, briket a uhlí: účet, tarify, profily prodejců, recenze a odpovědnost.",
  alternates: { canonical: "/obchodni-podminky" },
};

const mail = (
  <a href={`mailto:${LEGAL.email}`} className="underline">
    {LEGAL.email}
  </a>
);

export default function ObchodniPodminkyPage() {
  return (
    <LegalPage
      title="Obchodní podmínky"
      other={{ href: "/ochrana-osobnich-udaju", label: "Zásady ochrany osobních údajů" }}
      intro={
        <p>
          Tyto obchodní podmínky upravují používání webové služby {LEGAL.brand} (dále jen „služba“) a vztah mezi
          provozovatelem služby a jejími uživateli. Provozovatelem služby je {operatorLine()} (dále jen „provozovatel“),
          kontaktní e-mail {mail}.
        </p>
      }
      sections={[
        {
          id: "pojmy",
          title: "Pojmy",
          body: (
            <ul>
              <li>
                <strong>Uživatel</strong> – každý, kdo službu používá, s účtem i bez něj. Uživatel, který při používání
                služby nejedná v rámci své podnikatelské činnosti, je <strong>spotřebitel</strong>.
              </li>
              <li>
                <strong>Účet</strong> – uživatelský účet vytvořený registrací e-mailem a heslem.
              </li>
              <li>
                <strong>Prodejce</strong> – podnikatel prodávající tuhá paliva, jehož profil je ve službě zobrazen.
              </li>
              <li>
                <strong>Tarif</strong> – rozsah funkcí služby: bezplatný tarif Free a placené tarify Pro a Prodejce podle
                stránky <Link href="/plany" className="underline">Tarify</Link>.
              </li>
            </ul>
          ),
        },
        {
          id: "sluzba",
          title: "Popis služby",
          body: (
            <>
              <p>
                Služba srovnává ceny palivového dřeva, pelet, briket a uhlí od prodejců v České republice, odhaduje cenu
                dopravy a přepočítává ceny na cenu tepla. Ceny a další údaje o prodejcích pocházejí z veřejně dostupných
                zdrojů (zejména webových stránek a ceníků prodejců a veřejných rejstříků) nebo od samotných prodejců.
              </p>
              <p>
                Provozovatel <strong>není prodejcem paliva</strong> a není stranou kupní smlouvy mezi uživatelem a
                prodejcem. Odešle-li uživatel prostřednictvím služby poptávku, provozovatel ji předá zvolenému prodejci;
                smlouva o koupi paliva může vzniknout pouze mezi uživatelem a prodejcem a řídí se podmínkami prodejce.
              </p>
              <p>
                Ceny, výpočty dopravy a ceny tepla jsou orientační. Závazné jsou vždy cena a podmínky potvrzené
                prodejcem. Způsob sběru a přepočtu dat popisuje stránka{" "}
                <Link href="/metodika" className="underline">
                  Metodika a zdroje dat
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          id: "ucet",
          title: "Registrace a uživatelský účet",
          body: (
            <ul>
              <li>Část funkcí služby je dostupná jen s účtem. Registrace a tarif Free jsou zdarma.</li>
              <li>Uživatel je povinen uvádět pravdivé údaje a chránit své přihlašovací údaje před zneužitím.</li>
              <li>Účet je nepřenosný. Jedna osoba by měla používat jeden účet.</li>
              <li>
                Uživatel může účet kdykoli zrušit žádostí na {mail}. Provozovatel může účet zablokovat nebo zrušit, pokud
                uživatel podstatně porušuje tyto podmínky (např. zneužívá službu, vkládá protiprávní obsah nebo
                automatizovaně stahuje data).
              </li>
            </ul>
          ),
        },
        {
          id: "tarify",
          title: "Tarify a platby",
          body: (
            <>
              <p>
                Placené tarify (Pro, Prodejce) se sjednávají jako předplatné na dobu uvedenou u tarifu a cena se platí
                předem. Aktuální ceny a rozsah tarifů jsou uvedeny na stránce{" "}
                <Link href="/plany" className="underline">
                  Tarify
                </Link>{" "}
                a jsou konečné. Předplatné se automaticky obnovuje, dokud ho uživatel nezruší; zrušení nastává ke konci
                zaplaceného období.
              </p>
              <p>
                Platby zpracovává poskytovatel platebních služeb; provozovatel nemá přístup k údajům o platební kartě.
                Daňový doklad je uživateli zaslán e-mailem.
              </p>
            </>
          ),
        },
        {
          id: "odstoupeni",
          title: "Odstoupení od smlouvy spotřebitelem",
          body: (
            <>
              <p>
                Spotřebitel může od smlouvy o placeném tarifu odstoupit bez udání důvodu do 14 dnů od jejího uzavření,
                a to oznámením na {mail}.
              </p>
              <p>
                Požádá-li spotřebitel výslovně o zpřístupnění placených funkcí ještě před uplynutím této lhůty, zaplatí při
                odstoupení poměrnou část ceny za dobu, po kterou mu byly funkce zpřístupněny. Peníze provozovatel vrátí do
                14 dnů od odstoupení stejným způsobem, jakým byly přijaty.
              </p>
            </>
          ),
        },
        {
          id: "prodejci",
          title: "Profily prodejců a převzetí profilu",
          body: (
            <ul>
              <li>
                Profily prodejců vytváří provozovatel z veřejně dostupných údajů. Prodejce může kdykoli požádat o opravu
                nebo odstranění svých údajů na {mail}.
              </li>
              <li>
                Prodejce může požádat o převzetí svého profilu. Provozovatel před schválením ověří, že žadatel prodejce
                skutečně zastupuje, a může si vyžádat doplňující doklady. Převzetí může být podmíněno tarifem Prodejce.
              </li>
              <li>
                Po převzetí odpovídá prodejce za pravdivost a aktuálnost údajů, cen a fotografií, které do profilu sám
                vloží, a za to, že k nim má potřebná práva.
              </li>
            </ul>
          ),
        },
        {
          id: "obsah",
          title: "Recenze, články a další obsah uživatelů",
          body: (
            <>
              <p>
                Uživatel může hodnotit prodejce, psát recenze a navrhovat články na blog. Obsah musí být pravdivý, založený
                na vlastní zkušenosti a nesmí být urážlivý, klamavý, reklamní ani porušovat práva třetích osob.
              </p>
              <p>
                Provozovatel může obsah, který tyto podmínky porušuje, upravit nebo odstranit. Články na blogu před
                zveřejněním schvaluje redakce. Vložením obsahu uděluje uživatel provozovateli bezplatnou nevýhradní licenci
                k jeho zveřejnění ve službě po dobu jejího trvání.
              </p>
            </>
          ),
        },
        {
          id: "odpovednost",
          title: "Odpovědnost",
          body: (
            <ul>
              <li>
                Provozovatel dbá na správnost údajů, ale nezaručuje jejich úplnost a aktuálnost, protože se mohou u prodejců
                kdykoli změnit.
              </li>
              <li>Provozovatel neodpovídá za plnění, kvalitu ani dodání zboží prodejci.</li>
              <li>
                Provozovatel nezaručuje nepřetržitou dostupnost služby a může ji dočasně omezit kvůli údržbě nebo
                technickým potížím.
              </li>
              <li>Odpovědnost provozovatele vůči spotřebiteli nelze omezit nad rámec, který připouští zákon.</li>
            </ul>
          ),
        },
        {
          id: "prava",
          title: "Práva k obsahu služby",
          body: (
            <p>
              Služba, její vzhled, texty, výpočty a databáze jsou chráněny autorským právem a právem pořizovatele databáze.
              Bez souhlasu provozovatele je zakázáno je hromadně kopírovat nebo automatizovaně stahovat. Fotografie
              převzaté z volně licencovaných zdrojů jsou označeny jménem autora.
            </p>
          ),
        },
        {
          id: "reklamace",
          title: "Reklamace a stížnosti",
          body: (
            <p>
              Vady placených funkcí a stížnosti lze uplatnit na {mail}. Provozovatel reklamaci vyřídí bez zbytečného
              odkladu, nejpozději do 30 dnů, a o výsledku uživatele informuje e-mailem.
            </p>
          ),
        },
        {
          id: "spory",
          title: "Mimosoudní řešení sporů",
          body: (
            <p>
              Spotřebitel má právo na mimosoudní řešení sporu. Příslušným subjektem je Česká obchodní inspekce (
              <a href="https://adr.coi.cz" className="underline" target="_blank" rel="noreferrer">
                adr.coi.cz
              </a>
              ). Spotřebitel může využít také platformu pro řešení sporů online zřízenou Evropskou komisí.
            </p>
          ),
        },
        {
          id: "zaver",
          title: "Závěrečná ustanovení",
          body: (
            <>
              <p>
                Vztahy neupravené těmito podmínkami se řídí právním řádem České republiky, zejména občanským zákoníkem
                a zákonem o ochraně spotřebitele.
              </p>
              <p>
                Provozovatel může podmínky přiměřeně změnit. O podstatných změnách informuje registrované uživatele
                e-mailem nejméně 14 dní předem; uživatel, který se změnou nesouhlasí, může účet zrušit.
              </p>
              <p>Tyto podmínky jsou účinné od {LEGAL.effectiveFrom}.</p>
            </>
          ),
        },
      ]}
    />
  );
}
