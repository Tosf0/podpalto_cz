import { account } from "./account";
import { blog } from "./blog";
import { calculator } from "./calculator";
import { ci } from "./ci";
import { common } from "./common";
import { home } from "./home";
import { layout } from "./layout";
import { map } from "./map";
import { sellers } from "./sellers";
import { trends } from "./trends";

/** Všechny slovníky aplikace. Klíč první úrovně = oblast (např. `t("home.search.placeholder")`). */
export const MESSAGES = {
  cs: {
    common: common.cs,
    layout: layout.cs,
    home: home.cs,
    map: map.cs,
    calculator: calculator.cs,
    sellers: sellers.cs,
    trends: trends.cs,
    ci: ci.cs,
    blog: blog.cs,
    account: account.cs,
  },
  de: {
    common: common.de,
    layout: layout.de,
    home: home.de,
    map: map.de,
    calculator: calculator.de,
    sellers: sellers.de,
    trends: trends.de,
    ci: ci.de,
    blog: blog.de,
    account: account.de,
  },
  en: {
    common: common.en,
    layout: layout.en,
    home: home.en,
    map: map.en,
    calculator: calculator.en,
    sellers: sellers.en,
    trends: trends.en,
    ci: ci.en,
    blog: blog.en,
    account: account.en,
  },
};

export type Messages = (typeof MESSAGES)["cs"];
