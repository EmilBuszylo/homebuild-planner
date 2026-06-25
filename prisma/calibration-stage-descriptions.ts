/** PL copy for construction stages — merged into seed from shared rate defs. */
export const calibrationStageDescriptions: Record<string, string> = {
  "sewage_connection": "Przyłącze ścieków do sieci gminnej, szamba lub oczyszczalni — roboty zewnętrzne, bez instalacji wewnętrznej (→ plumbing)",
  "water_connection": "Przyłącze wody zewnętrzne — wodociąg gminny lub studnia głębinowa; bez instalacji wewnętrznej (→ plumbing)",
  "foundations": "Wykopy, ławy/płyta fundamentowa, izolacja przeciwwilgociowa i termiczna",
  "walls": "Murowanie ścian nośnych i działowych, nadproża",
  "floor_slabs": "Stropy żelbetowe, wieńce, nadproża okienne i drzwiowe",
  "roof_structure": "Więźba dachowa, łacenie, folia wstępnego krycia",
  "roof_covering": "Dachówka lub blachodachówka, obróbki blacharskie, rynny",
  "windows_doors": "Wycena na sztuki: okna, drzwi zewnętrzne, drzwi tarasowe. Koszt bazowy = 0 (obliczany z modyfikatorów × ilości)",
  "electrical": "Prowadzenie przewodów, puszki, rozdzielnia — stan surowy",
  "plumbing": "Rury wodne i kanalizacyjne wewnątrz budynku, podejścia pod urządzenia — bez przyłącza do sieci zewnętrznej (→ S-05 utility-connections)",
  "heating": "Ogrzewanie podłogowe / rozprowadzenie i grzejniki przed wylewką; montaż źródła ciepła i kotłowni zwykle po wylewce (min. ok. 2 tyg. schnięcia)",
  "insulation": "Termoizolacja ścian zewnętrznych (styropian/wełna), ocieplenie poddasza",
  "facade": "Tynk elewacyjny, cokół, obróbki — często w jednym zleceniu z ociepleniem (ta sama ekipa)",
  "interior_plaster": "Tynki gipsowe lub cementowo-wapienne",
  "floor_screeds": "Wylewki cementowe lub anhydrytowe, wyrównanie posadzek",
  "flooring": "Panele, gres, deska — montaż z materiałem",
  "painting": "Gruntowanie i malowanie ścian i sufitów (2 warstwy)",
  "bathroom_fixtures": "Umywalki, WC, wanny/brodziki, baterie, armatura",
  "interior_doors": "Montaż drzwi wewnętrznych z ościeżnicami",
  "garage_gate": "Brama segmentowa z napędem (gdy garage_spots > 0)"
};
