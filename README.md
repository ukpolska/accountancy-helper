# Accountancy Helper

**PL** — Program dla Windows do miesięcznych rozliczeń jednoosobowej działalności gospodarczej (JDG): składki ZUS, składka zdrowotna, zaliczka na podatek dochodowy oraz księga przychodów i rozchodów (KPIR) w Excelu. Wczytuje faktury z PDF, zdjęć i skanów (OCR), pliki XML z KSeF, archiwa ZIP i całe foldery.

**EN** — A Windows program for the monthly paperwork of a Polish sole proprietorship (JDG): ZUS contributions, the health contribution, the income-tax advance, and a KPIR ledger in Excel. It reads invoices from PDF, photos and scans (OCR), KSeF XML files, ZIP archives and whole folders.

> **Ważne / Important:** wyniki są orientacyjne – przed złożeniem deklaracji należy je sprawdzić (zwłaszcza pierwszy miesiąc). / The figures are indicative – check them before filing, especially the first month.

---

## Instalacja (PL)

1. Wejdź w zakładkę **Releases** (po prawej stronie tej strony) i pobierz plik **`Accountancy Helper Setup …exe`**.
2. Przeglądarka może napisać, że plik jest „rzadko pobierany” lub niebezpieczny – program jest nowy i nie ma jeszcze podpisu cyfrowego, więc to normalne. W Edge: kliknij **trzy kropki (…)** przy pobranym pliku → **Zachowaj** → **Pokaż więcej** → **Zachowaj mimo to**.
3. Uruchom pobrany plik. Jeśli pojawi się niebieskie okno **„System Windows ochronił ten komputer”**: kliknij **Więcej informacji**, a potem **Uruchom mimo to**.
4. Dalej klikaj **Dalej**. Na pulpicie pojawi się skrót.

## Installation (EN)

1. Open the **Releases** section (right-hand side of this page) and download **`Accountancy Helper Setup ….exe`**.
2. Your browser may say the file is "not commonly downloaded" or unsafe – the program is new and not yet digitally signed, so this is expected. In Edge: click the **three dots (…)** next to the file → **Keep** → **Show more** → **Keep anyway**.
3. Run the file. If the blue window **"Windows protected your PC"** appears, click **More info**, then **Run anyway**.
4. Keep clicking **Next**. A shortcut appears on the desktop.

---

**PL** — Przed pierwszym użyciem przeczytaj instrukcję ([`Instrukcja-Manual.pdf`](Instrukcja-Manual.pdf)); po instalacji otwierasz ją też przyciskiem na ekranie „Zanim zaczniesz”. Klucz do wyszukiwania firm po NIP jest nieobowiązkowy i bezpłatny – każdy użytkownik zdobywa własny (opis w instrukcji, punkt 8); program nie zawiera żadnego klucza.

**EN** — Please read the manual ([`Instrukcja-Manual.pdf`](Instrukcja-Manual.pdf)) before first use; after installing, the "Before you start" screen also has a button that opens it. The key for company lookup by NIP is optional and free – every user gets their own (explained in section 8 of the manual); the program contains no key.

## Gdzie są dane / Where the data is

`Dokumenty\Accountancy Helper` — `dane.json` (dane), `Kopie zapasowe` (codzienne kopie z 60 dni), `dziennik.jsonl` (dziennik działań). Dane zapisują się automatycznie, a po ponownym uruchomieniu program wraca do ostatniego stanu. / `Documents\Accountancy Helper` — your data, daily backups of the last 60 days, and the activity log. Data is saved automatically and the program opens where you left off.

## Co potrafi / What it does

- ZUS (pełny, preferencyjny, Mały ZUS Plus, ulga na start), składka zdrowotna (od dochodu z poprzedniego miesiąca), podatek: skala, liniowy, ryczałt / full, preferential, Mały ZUS Plus, start-up relief; health contribution from the previous month's income; tax scale, linear, lump sum
- Faktury: PDF, zdjęcia i skany (OCR), KSeF XML, ZIP, foldery; rozpoznanie faktur sprzedaży i kosztowych po NIP / invoices from PDF, photos and scans (OCR), KSeF XML, ZIP, folders; sales and cost invoices recognised by NIP
- Księga KPIR (Excel), historia miesięcy, kopie zapasowe, dziennik działań / KPIR ledger (Excel), month history, backups, activity log
- Polski i angielski interfejs, samouczek / Polish and English interface, guided tour
- Wiele firm w jednym programie (osobne profile z oddzielnymi danymi) / Several companies in one program (separate profiles with separate data)
- VAT: czynny podatnik (netto, udział odliczanego VAT, rozliczenie miesięczne lub kwartalne), zwolnienie z art. 43 i art. 113 (z ostrzeżeniem o limicie) / VAT: registered (net, deductible share, monthly or quarterly), exemption under art. 43 and art. 113 (with a limit warning)
- Rozliczenie roczne: PIT, VAT i roczne rozliczenie składki zdrowotnej (orientacyjnie) / Yearly figures: PIT, VAT and the annual health-contribution settlement (indicative)

Instrukcja / Manual: [`Instrukcja-Manual.pdf`](Instrukcja-Manual.pdf)

## Plany / Roadmap

- Rozliczenie roczne (PIT za rok i roczne rozliczenie składki zdrowotnej) – dodane w wersji 1.1.0 jako zestawienie orientacyjne, do sprawdzenia z księgową; samo zeznanie (PIT-36 / PIT-36L / PIT-28) i wysyłka do urzędu nie są w programie / Yearly figures (PIT for the year and the annual health-contribution settlement) – added in 1.1.0 as an indicative summary, to be checked with an accountant; the PIT return form itself and e-filing are not in the program
- Deklaracje i pliki VAT (JPK_V7), VAT-UE i szczególne przypadki VAT (odwrotne obciążenie, samochody 75%/20%) / VAT returns and files (JPK_V7), EU VAT and special VAT cases (reverse charge, the 75%/20% car rules)
- Kolejne języki: ukraiński, hiszpański, niemiecki, czeski / More languages: Ukrainian, Spanish, German, Czech
- Opcjonalne hasło do programu / An optional program password
- Aktualizacje zasad rocznych z tego repozytorium (za zgodą użytkownika) / Yearly rule updates from this repository (with the user's approval)
- Obsługa pracowników i listy płac – odłożone, obecnie niepotrzebne / Employees and payroll – on hold, not needed for now

## Dla programistów / For developers

```bash
npm install
npm start          # uruchomienie / run
npm run dist       # instalator w dist/ / installer in dist/
npx electron docs/makepdf.js   # instrukcja PDF / the manual PDF
```

Opcjonalne wyszukiwanie firm po NIP (CEIDG, GUS) wymaga własnego klucza w `app/lookup-keys.json` lub w Ustawieniach. / Optional company lookup by NIP (CEIDG, GUS) needs your own key in `app/lookup-keys.json` or in Settings. **Nie publikuj kluczy / Never commit keys.**
