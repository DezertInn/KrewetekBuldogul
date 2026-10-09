# Scenariusze testów manualnych Milestone 3

Przygotowano 2026-10-10 dla wersji z trzema etapami sali bokserskiej, siedmioma ulepszeniami, lokalnym zapisem prób i ciężkim zamachem kolumny. Dokument opisuje kroki i oczekiwane wyniki; **scenariusze nie mają jeszcze wyników wykonania manualnego**. Wcześniejsze wyniki automatyczne są w [raporcie walidacji M3](MILESTONE_3_VALIDATION.md).

Punktem odniesienia jest implementacja [`5145178`](https://github.com/DezertInn/KrewetekBuldogul/commit/514517841dab72f85e6b2007ac2c147c28b84f84) na `Dev`. Reguły i wartości prototypu opisuje [GDD](GAME_DESIGN_TEMPLATE.md#65-authorized-milestone-3-short-run-override). Dalsze zmiany samej dokumentacji nie zmieniają tej wersji gry.

## Przygotowanie

1. Uruchom aktualny build według [README](../README.md#run-locally). Podgląd produkcyjny używa `http://127.0.0.1:4173/`, serwer deweloperski `http://127.0.0.1:5173/`.
2. Wykonuj podstawowe testy w desktopowym Chrome i Edge na Windows. Zapisz wersję przeglądarki, adres gry, commit buildu, rozmiar obszaru strony, skalowanie oraz urządzenie wejściowe. Testy na Vercel wykonuj po potwierdzeniu, że wdrożenie zawiera tę implementację; sam wcześniejszy działający deployment nie potwierdza wersji M3.
3. Zacznij od domyślnego sterowania i jednej karty. Do przypadków ingerujących w zapis użyj osobnego profilu testowego przeglądarki. Zapis gry i ustawienia należą do konkretnej przeglądarki oraz adresu: zmiana hosta, portu lub przejście na Vercel oznacza inne dane.
4. Domyślne akcje: WASD — ruch, kursor — celowanie, LPM — atak, Spacja — dash, R — przeładowanie Grot, Esc — pauza/powrót, Enter — potwierdzenie, F2 — ustawienia w menu (podczas walki najpierw Esc). Po remapowaniu używaj aktualnych podpowiedzi.
5. **Odświeżaj przez ikonę przeglądarki. F5 w menu gry domyślnie restartuje rundę.** Zwolnij przyciski przed wznowieniem, wyborem nagrody i przełączaniem trybu.

Priorytety: **P0** — podstawowy przebieg i ochrona postępu; **P1** — ważna regresja, czytelność i obsługa; **P2** — pomiary lub techniczne sytuacje awaryjne. Dostępność fizycznych padów i wylosowanych ulepszeń zapisuj jako warunek wykonania, bez zastępowania testu symulacją.

Na pierwszy przebieg wykonaj **M3-01, M3-04 każdą bronią, M3-07, M3-10, M3-11, M3-21 i M3-24**. Potem przejdź pozostałe przypadki oraz ulepszenia. Nie traktuj zaliczenia krótkiego przebiegu jako zaliczenia całej listy.

## Uruchomienie i podstawowa walka

### M3-01 Uruchomienie i wybór trybu · P0

1. Otwórz adres gry w Chrome, następnie powtórz w Edge.
2. Sprawdź dostępność **Boxing gloves**, **Grot rifle**, **Monument pillar** oraz **Dummy practice**, **Boxer encounter**, **Gym run · M3**.
3. Zmieniaj wybór broni i trybu, otwórz **Controls and settings**, zamknij ustawienia i rozpocznij trening.

**Oczekiwane:** scena, postać i HUD wczytują się; wybór oraz podpowiedzi odpowiadają broni; przyciski działają bez przeładowania strony. Brak dźwięku jest oczekiwany w tym prototypie. Brak trybu M3 na wdrożeniu wymaga najpierw sprawdzenia wersji buildu.

### M3-02 Regresja trzech broni na manekinie · P1

Warunek: świeży **Dummy practice** dla każdej broni, bez ulepszeń.

1. Rękawicami przytrzymaj LPM w zasięgu manekina; obserwuj serię uderzeń i ruch podczas ataku.
2. Grot: oddaj kilka strzałów, naciśnij R; po przeładowaniu opróżnij magazynek, nadal trzymając atak. Powtórz strzelanie zza solidnej przeszkody.
3. Kolumną wykonaj trzy oddzielne, trafiające zamachy. Pomiędzy nimi poczekaj na gotowość.

**Oczekiwane:** rękawice wykonują szybką serię, Grot ma 20 nabojów i ręczne/automatyczne przeładowanie, osłona blokuje strzał. R nie restartuje gry. Trzy trafienia kolumną w świeżego manekina dają **540 damage / 3 hits**. Chybienia nie zwiększają liczników. Zmiana broni odbywa się po powrocie do przygotowania.

### M3-03 Bokserzy, kolizje i dash · P1

1. Uruchom **Boxer encounter**. Obserwuj przygotowanie boksera do ciosu i jego odsłonięcie po ataku.
2. Daj się raz trafić, potem uniknij kolejnego ciosu dashem. Spróbuj natychmiast ponowić dash.
3. Poruszaj się i dashuj w stronę ścian oraz przeszkód. Pokonaj trzech bokserów.

**Oczekiwane:** cios ma czytelne przygotowanie, trafienie zmniejsza zdrowie, dash ma krótki okres ochrony i cooldown. Postać pozostaje w sali, nie przechodzi przez solidne przeszkody. Pokonani bokserzy nie atakują; po trzecim pojawia się wynik pojedynczego starcia, bez nagrody M3.

## Pełna próba i jej zakończenie

### M3-04 Trzy etapy każdą bronią · P0

Wykonaj osobno dla rękawic, Grot i kolumny.

1. Wybierz broń, **Gym run · M3**, następnie **Begin gym run**.
2. Pokonaj wszystkich bokserów w **Warm-up formation**. Wybierz jedną nagrodę.
3. Ukończ **Wide formation**, wybierz jedną nagrodę i ukończ **Final formation**.
4. Sprawdź końcowy wynik i listę ulepszeń.

**Oczekiwane:** dokładnie trzy starcia po trzech bokserów, dwa ekrany wyboru nagrody, jedna broń przez cały run. HUD przechodzi przez Stage 1/3, 2/3 i 3/3. Wynik zawiera `victory`, Stage 3/3, trzy ukończone etapy, właściwą broń, dwa wybrane ulepszenia i aktywny czas. Po trzecim etapie nie ma kolejnej oferty ani czwartego etapu.

### M3-05 Oferta i pojedynczy wybór nagrody · P0

1. Na pierwszej nagrodzie zapisz trzy nazwy w kolejności; przeczytaj źródła i opisy.
2. Przejdź między kartami myszą oraz klawiaturą. Wybierz jedną; przytrzymaj chwilę potwierdzenie.
3. Na drugiej nagrodzie sprawdź propozycje; wybierz jedną i sprawdź HUD następnego etapu.

**Oczekiwane:** każda oferta zawiera trzy różne ulepszenia z puli siedmiu. Druga oferta wyklucza już posiadane ulepszenie. Jeden wybór dodaje dokładnie jeden efekt i rozpoczyna dokładnie jeden etap; przytrzymanie potwierdzenia nie pomija kolejnego wyboru i nie uruchamia ataku.

### M3-06 Przenoszenie zdrowia, amunicji i efektów · P0

Warunek: run z Grot; do porównania podstawowego nie wybieraj **Controlled Shield**.

1. W pierwszym etapie otrzymaj obrażenia i zakończ go z częściowym magazynkiem. Zwolnij atak, zanim wybierzesz nagrodę.
2. Na nagrodzie zapisz zdrowie i liczbę nabojów. Poczekaj kilka sekund.
3. Wybierz ulepszenie i od razu zapauzuj drugi etap, zanim oddasz strzał lub otrzymasz cios.
4. Powtórz między drugim a trzecim etapem; sprawdź listę efektów.

**Oczekiwane:** nagroda ani wejście do etapu nie odnawiają zdrowia/magazynka. Ulepszenia pozostają aktywne. Menu nie zużywa czasu walki ani czasu efektów. Pozostały cooldown ataku/dashu może przejść do kolejnego etapu, więc krótka blokada ataku po wejściu jest poprawna. Dokładne timery można porównać metodą z końca dokumentu.

### M3-07 Porażka po zdobyciu ulepszenia · P0

1. Ukończ pierwszy etap i wybierz nagrodę.
2. W drugim etapie pozwól bokserom obniżyć zdrowie do zera.
3. Sprawdź **Down, not out.** i podsumowanie. Odśwież stronę ikoną przeglądarki.
4. Rozpocznij nowy run.

**Oczekiwane:** walka kończy się raz, bez dalszych ciosów i nagrody. Wynik zawiera `defeat`, Stage 2/3, jeden ukończony etap, wybraną broń i jedno ulepszenie. Po odświeżeniu zakończony run nie jest dostępny przez **Resume saved run**. Nowy zaczyna od etapu pierwszego, 100 HP, bez ulepszeń; Grot ma 20 nabojów.

### M3-08 Anulowanie i potwierdzenie restartu lub porzucenia · P0

Wykonaj w pauzie walki oraz na ekranie nagrody.

1. Zapisz etap, zdrowie, amunicję i ewentualną ofertę. Wybierz **Restart this round**, potem **Keep this round**.
2. Sprawdź zachowanie stanu; ponów restart i wybierz **Discard round**.
3. W osobnej próbie wybierz **Change weapon / round**. Najpierw anuluj, potem potwierdź odrzucenie.
4. Po powrocie do przygotowania odśwież stronę.

**Oczekiwane:** anulowanie zachowuje dokładnie bieżącą próbę/ofertę. Potwierdzony restart rozpoczyna świeży run od etapu pierwszego; zmiana broni/trybu wraca do przygotowania. Porzuconego runu nie można wznowić. Wcześniej zapisane mapowanie sterowania nadal obowiązuje.

### M3-09 Nowa próba po zwycięstwie · P0

1. Po zwycięstwie w M3-04 odśwież stronę. Sprawdź, czy nie ma aktywnego zapisu zakończonej próby.
2. Rozpocznij kolejny run tą samą bronią.

**Oczekiwane:** zakończony run nie wraca jako aktywny checkpoint. Nowy ma etap 1/3, 100 HP, brak bariery i ulepszeń, świeże liczniki; Grot startuje z 20 nabojami. Kolejna próba nie dziedziczy efektów poprzedniej.

## Zapis i wiele kart

### M3-10 Odświeżenie w trakcie walki · P0

1. W runie z Grot wybierz pierwszą nagrodę. Na wejściu drugiego etapu zapauzuj i zapisz zdrowie, naboje oraz ulepszenie.
2. Wznów, oddaj kilka strzałów, otrzymaj obrażenia i pokonaj jednego boksera.
3. Odśwież ikoną przeglądarki. W przygotowaniu wybierz **Resume saved run**, następnie szybko zapauzuj.

**Oczekiwane:** wraca **początek drugiego etapu** z trzema bokserami oraz zdrowiem/amunicją z jego wejścia. Wybrane wcześniej ulepszenie i broń zostają. Postęp bieżącej walki od ostatniego checkpointu zostaje cofnięty; zapis nie odwzorowuje każdej klatki ani ciosu. Wznowienie nie odtwarza trzymanego ataku, ruchu czy dashu.

### M3-11 Odświeżenie przy niewybranej nagrodzie · P0

1. Ukończ pierwszy lub drugi etap. Zapisz kolejność trzech ofert, zdrowie, naboje i posiadane ulepszenia.
2. Odśwież ikoną przeglądarki i wybierz **Resume saved run**.
3. Porównaj ekran, odśwież ponownie i dopiero potem wybierz nagrodę.

**Oczekiwane:** za każdym razem wraca ta sama oferta w tej samej kolejności i ten sam bezpieczny stan. Odświeżenie nie losuje nowych kart. Wybór przyznaje jeden efekt i rozpoczyna właściwy następny etap.

### M3-12 Zapis wybranej nagrody · P0

1. Wybierz pierwszą nagrodę i poczekaj na rozpoczęcie drugiego etapu.
2. Zapauzuj, zanotuj nazwę ulepszenia; odśwież i użyj **Resume saved run**.

**Oczekiwane:** odtwarza się wejście drugiego etapu z wybranym efektem. Pierwsza oferta nie pojawia się ponownie; efekt nie jest przyznany drugi raz. Krótki zachowany cooldown nie oznacza zablokowania sterowania.

### M3-13 Zamknięcie i ponowne otwarcie przeglądarki · P1

1. Zatrzymaj run na nagrodzie i zapisz ofertę.
2. Zamknij kartę oraz przeglądarkę. Otwórz ten sam adres w tym samym zwykłym profilu.
3. Użyj **Resume saved run**. Jeśli pozostała czasowa blokada poprzedniej karty, przeczytaj komunikat i jawnie wybierz **Take control in this tab**.

**Oczekiwane:** bezpieczny checkpoint pozostaje i oferta jest identyczna. Pojawienie się odzyskiwalnej blokady nie kasuje postępu. Test nie zakłada zachowania danych po zamknięciu ostatniego okna prywatnego.

### M3-14 Przejęcie runu i sesja bez zapisu · P0

1. W karcie A rozpocznij run. Otwórz ten sam adres w karcie B, w tym samym profilu.
2. W B wybierz **Take control in this tab**, następnie **Resume saved run**; ukończ etap.
3. Wróć do A, poczekaj na wykrycie konfliktu lub próbę zapisu. Wybierz **Play without saving in this tab** i rozpocznij/kontynuuj tymczasową grę.
4. Po grze tymczasowej odśwież A i sprawdź checkpoint zapisany przez B. W razie konfliktu przejmij go jawnie.

**Oczekiwane:** B wymaga świadomego przejęcia. A wykrywa utratę prawa zapisu i nie nadpisuje postępu B. Gra tymczasowa jasno informuje, że jej postęp nie jest zapisywany. Jej wynik ani porzucenie nie kasują checkpointu B.

### M3-15 Dwie karty bez aktywnego zapisu · P1

1. Zakończ lub porzuć run. Otwórz dwie karty tego samego adresu.
2. W obu uruchom **Dummy practice**, **Boxer encounter** oraz ustawienia.
3. Dopiero potem rozpocznij run M3 w A i spróbuj rozpocząć go w B.

**Oczekiwane:** odczyt pustego zapisu i trening nie blokują drugiej karty. Po rozpoczęciu zapisywanego runu konflikt chroni go przed nadpisaniem przez drugą kartę.

### M3-16 Zduplikowanie aktywnej karty · P1

1. W A rozpocznij zapisany run. Użyj funkcji przeglądarki duplikującej kartę.
2. W kopii spróbuj kontynuować bez przejęcia, a potem jawnie przejmij run.
3. Wróć do oryginału i sprawdź wykrycie konfliktu.

**Oczekiwane:** kopia nie uzyskuje wspólnego prawa zapisu przez skopiowaną tożsamość karty. Obowiązuje taki sam konflikt/przejęcie jak w M3-14; tylko jedna karta zapisuje run. Odczyt identyfikatorów można wykonać metodą techniczną z końca dokumentu.

## Pauza i sterowanie

### M3-17 Pauza, ustawienia i oczekiwanie na nagrodzie · P0

1. Podczas walki naciśnij Esc. Zanotuj zdrowie, naboje, pozycje i aktywny czas; poczekaj pięć sekund.
2. Otwórz **Controls and settings**, odczekaj i wróć. Zwolnij przyciski; świadomie wznów.
3. Na ekranie nagrody odczekaj pięć sekund przed wyborem.

**Oczekiwane:** pauza/ustawienia zatrzymują walkę, obrażenia, ruch, przeładowanie i timery efektów. Nagroda nie zużywa aktywnego czasu runu. Powrót z menu nie wykonuje samoczynnie akcji trzymanej przed jego otwarciem.

### M3-18 Utrata fokusu i ukryta karta · P0

1. W walce trzymaj ruch lub atak i użyj Alt+Tab. Poczekaj, zwolnij przyciski poza grą i wróć.
2. Osobno przełącz kartę przeglądarki i zminimalizuj okno. Za każdym razem wróć do gry.
3. Wznów świadomie i wykonaj nowe naciśnięcie ataku.

**Oczekiwane:** zwykła walka pauzuje; podczas nieobecności nie ubywa zdrowia ani amunicji. Powrót wymaga wznowienia, a stare przytrzymanie nie wywołuje ruchu/strzału. Ocena kończącego zamachu jest osobnym M3-25.

### M3-19 Remapping i trwałość profilu · P1

1. W **Controls and settings → Bindings** zmień **Primary attack** na wolny klawisz i zastosuj podgląd przez **Apply binding**.
2. Zmień potwierdzenie lub nawigację menu na inną poprawną konfigurację. Zamknij ustawienia.
3. Sprawdź atak i podpowiedzi, wybierz nagrodę nowym sterowaniem, odśwież stronę i sprawdź mapowania.
4. Potwierdź, że porzucenie/restart runu nie resetują profilu.

**Oczekiwane:** zmiany działają po zastosowaniu i po odświeżeniu na tym samym adresie. HUD/menu pokazują właściwe podpowiedzi, nagrodę da się wybrać bez myszy, a kluczowe akcje menu pozostają dostępne.

### M3-20 Konflikt mapowań, anulowanie i odzyskanie · P1

1. Spróbuj przypisać atak do klawisza innej akcji w tym samym kontekście. Sprawdź **Cancel**, potem **Swap bindings** dla pojedynczego konfliktu.
2. Osobno sprawdź **Replace conflicting binding** dla konfliktu opcjonalnych akcji. Spróbuj usunąć wymagane potwierdzenie/powrót menu.
3. Podczas przechwytywania przytrzymaj aktualny przycisk powrotu przez 1,2 s, aby anulować. Po zmianie zwolnij wszystkie przyciski przed powrotem do gry.
4. Sprawdź **Recover last working controls**, następnie **Restore this profile’s defaults** i odświeżenie.

**Oczekiwane:** anulowanie nie zmienia profilu; zamiana/replace mają opisany wynik i wymagają zatwierdzenia. Nie można pozostawić niedziałającego obowiązkowego sterowania menu. Odzyskanie daje używalny ostatni poprawny profil, defaults przywracają domyślne mapowania aktywnego profilu. Zamknięcie ustawień z trzymanym wejściem nie uruchamia ataku.

## Ciężki zamach kolumny

### M3-21 Osiem kierunków i dwie rozdzielczości · P0

1. Wybierz **Monument pillar → Dummy practice → Begin training** i stań w wolnej części sali.
2. Celuj kolejno w górę, dół, lewo, prawo i cztery przekątne względem ekranu. W każdym kierunku wykonaj pojedynczy zamach.
3. Powtórz dla obszaru strony 1280×720 oraz 1920×1080 przy zapisanym skalowaniu. Nagraj problematyczne kierunki.

**Oczekiwane:** w każdym kierunku widać przygotowanie całego ciała, ciężki zamach, wyhamowanie i powrót do gotowości. Obie dłonie trzymają kolumnę, nogi pozostają spójne z ruchem. Broń nie przeskakuje między pozami. Naturalne zasłonięcie jej części przez tułów przy kierunkach tylnych nie jest samo w sobie błędem; zanotuj, czy mimo tego zamach pozostaje czytelny.

### M3-22 Fazy, chybienie i powtarzane ataki · P1

1. W świeżym treningu wykonaj zamach poza manekina, potem trzy oddzielne trafienia.
2. Przytrzymaj atak dla kolejnych zamachów; wykonaj je także podczas chodzenia.
3. Obejrzyj nagranie w zwolnionym tempie.

**Oczekiwane:** bazowy cykl to około **0,55 s przygotowania, 0,15 s active, 0,80 s recovery**. Chybienie ma pełną animację i zero nowych trafień; trzy trafienia manekina dają 540/3. Ruch podczas bazowego ataku jest wyraźnie wolniejszy. Powtarzanie nie skraca recovery, a sama animacja nie dodaje obrażeń.

### M3-23 Anulowanie dashem i trafienie kilku bokserów · P1

1. W treningu użyj dashu podczas przygotowania; osobno podczas recovery po trafieniu.
2. Na nagraniu sprawdź próbę dashu w krótkiej fazie active. Powtarzaj anulowanie i próbę nowego ataku.
3. W **Boxer encounter** zgromadź kilku bokserów we wspólnym przednim łuku i wykonaj jeden zamach.

**Oczekiwane:** przygotowanie można anulować bez trafienia; recovery po trafieniu można przerwać dashem. Active pozostaje nieprzerywalne. Anulowanie nie pozwala rozpocząć kolejnego ataku przed pierwotnym końcem cyklu. Każdy objęty zamachem bokser dostaje najwyżej jedno trafienie. Bokser ma 100 HP, więc licznik damage dla zabitego celu pokazuje rzeczywistą utratę HP, a nie pełne 180 obrażeń broni.

### M3-24 Zamach kończący etap i niewidoczne potwierdzenie · P0

1. Kolumną ukończ pierwszy etap M3. Obserwuj zamach zabijający ostatniego boksera.
2. Podczas jego końcówki naciśnij Enter, zanim pojawią się karty nagrody. Zwolnij Enter.
3. Zaczekaj na menu i wybierz nagrodę nowym naciśnięciem. Powtórz obserwację po ostatnim etapie.

**Oczekiwane:** końcówka zamachu jest widoczna do powrotu do gotowości; karta nagrody/wyniku jej nie zasłania w zwykłym przebiegu. Po zabiciu ostatniego wroga obrażenia, liczba trafień i aktywny czas już nie rosną. Enter przy ukrytym menu nie wybiera nagrody. Po ostatnim etapie widoczny jest wynik zwycięstwa, bez dodatkowej oferty.

### M3-25 Zatrzymanie końcówki zamachu przez menu i utratę fokusu · P1

Wykonaj warianty w osobnych ukończeniach pierwszego lub drugiego etapu; krótka końcówka wymaga szybkiego działania lub powtórzenia.

1. Podczas kończącego zamachu naciśnij F2. Odczekaj, zamknij ustawienia przez Esc. W osobnym wariancie otwórz Esc potwierdzenie odrzucenia i wybierz **Keep this round**.
2. Osobno podczas końcówki użyj Alt+Tab, przełącz kartę lub zminimalizuj okno; poczekaj i wróć.
3. Sprawdź dokończenie pozy, ofertę i liczniki.

**Oczekiwane:** kosmetyczny zamach stoi przy otwartych ustawieniach/potwierdzeniu oraz bez fokusu lub w ukrytej karcie. Zakończona walka nie odżywa; nie ma dodatkowych trafień ani wyborów. Po zamknięciu menu/powrocie do karty prezentacja może się dokończyć, a ta sama oferta pozostaje dostępna. Menu może być widoczne podczas tego zatrzymania; nie wymagaj automatycznego ponownego uruchomienia walki.

## Siedem ulepszeń

Ulepszenia testuj **w runie M3 po rzeczywistym wyborze nagrody**. Oferty są losowane z siedmiu efektów; odświeżanie tej samej oferty ich nie zmieni. Jeśli potrzebnego efektu nie ma, rozpocznij kolejną próbę albo oznacz przypadek jako nieprzeprowadzony z powodu braku wylosowania. Przejście do Dummy practice rozpoczyna osobną sesję bez ulepszeń.

Porównuj z bazową bronią w nowej próbie; zanotuj drugi efekt, który może zmieniać pomiar. Wartości sekund/metrów/procentów poniżej są regułami prototypu; nagranie i odczyt diagnostyczny pomagają je sprawdzić dokładniej niż ocena na oko. HUD zaokrągla obrażenia do jednego miejsca po przecinku, więc np. dokładne 24,84 sprawdzaj diagnostycznie. Nie oceniaj bonusu obrażeń na ciosie, który dobija cel z małą ilością HP.

| ID / priorytet | Nagroda | Kroki po wybraniu | Oczekiwany wynik |
| --- | --- | --- | --- |
| U-01 · P1 | **Quiet Resolve** · Bóg | W następnym etapie przez co najmniej 4 s nie trać zdrowia; rękawicami lub Grot traf cel z odpowiednią ilością HP. Otrzymaj cios zmniejszający zdrowie, ponów atak, potem odczekaj 4 s i sprawdź ponownie. | Primary damage dostaje +15% po 4 s bez utraty HP; utrata HP resetuje bonus. Pierwszy bazowy cios rękawic: 20 → 23; Grot: 21,6 → 24,84 przed ograniczeniem przez HP celu. Timer może już być częściowo zapełniony; samo pochłonięcie ciosu przez barierę nie resetuje go. |
| U-02 · P1 | **Stand Firm** · Ojczyzna | Bez bariery stój nieruchomo co najmniej 0,5 s i przyjmij pojedynczy cios. W osobnej próbie przyjmij cios podczas ruchu, bez invulnerability dashu. | Bazowy cios boksera zmniejsza HP o 8 zamiast 10 po aktywacji ochrony. Rzeczywista zmiana pozycji/dash/przemieszczenie kończą ochronę. Naciskanie ruchu przy ścianie bez zmiany pozycji nie musi jej kończyć. |
| U-03 · P1 | **High View** · Orzeł Biały w koronie | Przed wyborem zanotuj granicę trafienia/łuk broni; po wyborze spróbuj trafić odrobinę dalej. Grot sprawdź też zza przeszkody. Powtórz dla dostępnych broni. | Zasięg rośnie o 15%: rękawice 1,95 → 2,2425 m, kolumna 2,6 → 2,99 m, Grot 12 → 13,8 m. Kąt melee i blokowanie przez osłony pozostają takie same. Brak miejsca na rzetelny pomiar pełnego zasięgu Grot zanotuj jako ograniczenie testu. |
| U-04 · P1 | **Slip Away** · Szacunek ulicy | W wolnej przestrzeni wykonaj dash i poruszaj się po jego zakończeniu. Powtórz dash, gdy minie jego bazowy cooldown, ale jeszcze przed końcem cooldownu efektu. Następnie powtórz po pełnym odnowieniu efektu. | Po zakończeniu dashu prędkość chodzenia rośnie o 15% przez 2 s. Efekt ma cooldown 3 s; zbyt szybki kolejny dash nie odnawia buffu. Po wygaśnięciu wraca zwykła prędkość. |
| U-05 · P1 | **Flowing Step** · Fryderyk Chopin | Porównaj chodzenie podczas ataku przed i po wyborze; powtórz w osobnych runach każdą bronią. Grot sprawdź również podczas przeładowania. | Ruch podczas ataku: Grot 80% → 100%, rękawice 70% → 90%, kolumna 35% → 55% zwykłej prędkości. Timing ataku i przeładowania bez zmian; ruch w przeładowaniu Grot nadal 80%. Efekt nie uruchamia muzyki. |
| U-06 · P1 | **Controlled Shield** · Maria Skłodowska-Curie | Kolumną traf jednego świeżego boksera i sprawdź HUD bariery. Pozostaw żywego przeciwnika i odczekaj 4 s **aktywnej walki** bez trafienia/nowego pulsu; osobno przy aktywnej barierze przyjmij cios. W kolejnym wariancie traf kilku bokserów jednym zamachem i porównaj przyrost bariery. | Jeden bokser o 100 HP daje jeden Impact, czyli +2 bariery. Cleave nie sumuje Impact ze wszystkich celów. Pełny puls dodaje 2, odświeża czas do 4 s; bariera absorbuje obrażenia przed HP i wygasa bez kolejnego pulsu. Czekanie na nagrodzie nie wygasza bariery. Limit wynosi 10; podpunkty dotyczące ułamkowego Impact/limitu oznacz jako nieprzeprowadzone, jeśli krótka próba nie dostarcza warunków. |
| U-07 · P1 | **Wider Orbit** · Mikołaj Kopernik | W wolnej przestrzeni porównaj odległość bazowego dashu z dashem po nagrodzie, celując w ten sam kierunek. Powtórz przy ścianie. | Droga rośnie z 3 do 3,6 m; czas nadal 0,30 s. Okno ochrony nadal 0,15 s, cooldown 1,20 s. Ściany nadal ograniczają drogę; do pomiaru długości nie używaj dashu zatrzymanego przez przeszkodę. |

## Fizyczne pady, interfejs i dłuższa sesja

### M3-26 Pad od treningu do wyniku · P1

1. Podłącz pad, naciśnij przycisk, sprawdź wykryty układ i podpowiedzi. Zweryfikuj ruch lewym drążkiem, celowanie prawym, atak, dash i przeładowanie Grot.
2. Bez myszy wybierz broń/tryb, uruchom M3, otwórz pauzę/ustawienia, przejdź obie nagrody i wynik.
3. Zmień jedną akcję pada i sprawdź trwałość po odświeżeniu.
4. Podczas trzymania ataku odłącz pad. Podłącz ponownie, zwolnij wejścia i świadomie wznów. Przy padzie niestandardowym sprawdź **Guided mapping** i **Use this profile for this controller**.

**Oczekiwane:** właściwe podpowiedzi, używalne menu i wszystkie akcje. Odłączenie pauzuje walkę, ponowne połączenie nie wywołuje samoistnego ataku. Dla niestandardowego mapowania gra wymaga konfiguracji/akceptacji zamiast zgadywania układu. Dryf drążka oceniaj razem z kalibracją i stanem sprzętu.

| Pad / połączenie | Domyślny atak / dash / reload | Domyślne potwierdzenie / powrót / pauza | Wynik manualny |
| --- | --- | --- | --- |
| DualShock 4 USB | R2 / L2 / Square | Cross / Circle / Options | Nieprzeprowadzony |
| DualShock 4 Bluetooth | R2 / L2 / Square | Cross / Circle / Options | Nieprzeprowadzony |
| Xbox One USB | RT / LT / X | A / B / Menu | Nieprzeprowadzony |
| Xbox One Bluetooth, model obsługujący Bluetooth | RT / LT / X | A / B / Menu | Nieprzeprowadzony |
| Xbox Series USB | RT / LT / X | A / B / Menu | Nieprzeprowadzony |
| Xbox Series Bluetooth | RT / LT / X | A / B / Menu | Nieprzeprowadzony |

Zapisz dokładny model oraz system/przeglądarkę osobno dla każdego połączenia. Wcześniejsze zgłoszenie działania DS4 USB nie jest wynikiem tego scenariusza na M3.

### M3-27 Rozmiar okna i nawigacja interfejsu · P1

1. Przy 1280×720 i 1920×1080 sprawdź przygotowanie, HUD walki, trzy karty nagrody, wynik i ustawienia.
2. Zmniejsz okno podczas gry, potem podczas nagrody. Sprawdź celowanie po zmianie rozmiaru.
3. Użyj Tab/Shift+Tab, aktualnych akcji nawigacji i przewijania długiej listy ustawień.

**Oczekiwane:** istotne informacje i przyciski pozostają dostępne; tekst nie nachodzi na wybory, ustawienia można przewinąć, fokus jest widoczny. Celowanie odpowiada nowemu położeniu kursora. Zmiana rozmiaru nie gubi oferty ani postępu.

### M3-28 Dłuższa sesja i subiektywny efekt kolumny · P2

1. Graj przez około 10 minut, przechodząc kilka prób, trening, restart, ustawienia i powroty do przygotowania.
2. Notuj zacięcia, opóźnienia wejścia, błędy renderowania i momenty pogorszenia płynności. Jeśli zbierasz FPS, zapisz sprzęt i warunki pomiaru.
3. Oceń kolumnę: czy przygotowanie sygnalizuje ciężar, moment kontaktu jest czytelny, a recovery daje odczuwalne wyhamowanie. Do uwag dołącz kierunek i nagranie.

**Oczekiwane:** brak zawieszenia, zablokowanego menu, utraty sterowania czy narastającego pogorszenia. Płynność i odczucie ciężaru zapisz jako obserwacje z warunkami, bez automatycznego uznania 60 FPS za wymaganie na każdym komputerze. Uwagi do stylu/feel oddziel od błędów reguł walki.

## Techniczne scenariusze awaryjne

Te przypadki ingerują wyłącznie w **dane osobnego profilu testowego**. Zamknij pozostałe karty gry. Zapis testowy znajduje się w IndexedDB: baza `krewetek-buldogul-m3-runs`, store `journal`, klucz `state`. Przygotuj dwie poprawne rewizje przez ukończenie etapu i wybór nagrody; zachowaj ich kopię. Edycję wykonaj przy zapauzowanej aplikacji, następnie odśwież ikoną przeglądarki. Podgląd IndexedDB w narzędziach przeglądarki może pozwalać tylko na odczyt; do edycji możesz użyć poniższej transakcji w konsoli **testowego adresu/profilu**:

```javascript
async function testJournal(change) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('krewetek-buldogul-m3-runs');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('journal', change ? 'readwrite' : 'readonly');
      const store = tx.objectStore('journal');
      const get = store.get('state');
      let result;
      get.onsuccess = () => {
        result = structuredClone(get.result);
        if (change) {
          try { change(result); store.put(result, 'state'); }
          catch (error) { tx.abort(); reject(error); }
        }
      };
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
const testJournalBackup = await testJournal();
```

Przed odświeżeniem wyświetl `JSON.stringify(testJournalBackup, null, 2)` i skopiuj wynik do notatki; zmienne konsoli nie przetrwają przeładowania. Przykład edycji dla pierwszego wariantu T-01:

```javascript
await testJournal(journal => { journal.current.checkpoint.carry.health = -1; });
```

Po odświeżeniu funkcję trzeba wkleić ponownie. Każdy wariant zacznij w odrębnym profilu testowym ze świeżym poprawnym runem; uszkodzonego/obcego zapisu nie da się zastąpić zwykłym rozpoczęciem nowej próby. Nie naprawiaj danych rzeczywistego gracza tą metodą.

### T-01 Uszkodzona najnowsza rewizja i kopia · P2

1. W rekordzie `state` zmień `current.checkpoint.carry.health` na `-1`; pozostaw poprawny `previous`.
2. Odśwież i wznów odzyskany zapis. Porównaj checkpoint z kopią `previous.checkpoint`: etap, fazę, stan gracza i ofertę; numery rewizji oraz blokada karty mogą się poprawnie zmienić przy odzyskiwaniu.
3. W osobnym wariancie uszkodź zdrowie zarówno w `current`, jak i `previous`, odśwież i wybierz grę bez zapisu.

**Oczekiwane:** pierwsza próba odzyskuje **poprzedni bezpieczny checkpoint**, który może być starszy od ostatniego wyboru nagrody. Dwie uszkodzone rewizje dają komunikat i możliwość sesji tymczasowej, bez awarii całej gry i bez udawania poprawnego zapisu.

### T-02 Zapis innej wersji · P2

1. Na poprawnej kopii ustaw `current.schemaVersion` na `99`; odśwież, sprawdź komunikat i próbę przejęcia.
2. Powtórz osobno dla obcego `current.contentVersion`.
3. Sprawdź wariant z uszkodzonym `current` i `previous.schemaVersion = 99`.
4. Porównaj rekord przed i po próbie przejęcia oraz sesji tymczasowej.

**Oczekiwane:** gra rozpoznaje niezgodność i zachowuje dane; przejęcie blokady nie konwertuje ani nie nadpisuje obcej wersji. Można grać bez zapisu. Nie należy przywracać uszkodzonej rewizji tylko dlatego, że druga pochodzi z nieobsługiwanej wersji.

### T-03 Niedostępny zapis · P2

Warunek: osobne środowisko testowe, które odmawia otwarcia IndexedDB **przed inicjalizacją aplikacji**. Sposób wymuszenia i komunikat błędu zapisz w raporcie. Jeśli nie masz takiego środowiska, oznacz przypadek jako nieprzeprowadzony; samo incognito ani podmiana API w konsoli po starcie go nie odtwarzają.

1. Otwórz grę w tych warunkach i rozpocznij M3.
2. Przejdź nagrodę, zakończ lub porzuć próbę; sprawdź trening i ustawienia.
3. Odśwież stronę, nadal przy odmowie zapisu.

**Oczekiwane:** gra informuje o braku zapisu, działa jako sesja tymczasowa i nie obiecuje wznowienia jej postępu. Obsługa menu/treningu pozostaje dostępna. Niedostępność zapisu runu nie jest dowodem niedostępności odrębnych ustawień w localStorage.

## Opcjonalny odczyt diagnostyczny

Do dokładnego porównania timerów otwórz adres z `?debug=1` **przed rozpoczęciem scenariusza**. Dodanie parametru w środku walki przeładuje stronę i cofnie ją do checkpointu. W konsoli dostępne są odczyty:

```javascript
window.__prototype.snapshot()
window.__prototype.pillarPose()
window.__prototype.metrics()
```

`snapshot().player` pokazuje m.in. zdrowie, amunicję, barierę i cooldown dashu, `snapshot().upgrades` — posiadane efekty, ułamkowy Impact i timery, a `snapshot().run.carry` — przenoszony stan bieżącego runu w pamięci. Podczas walki dyrektor aktualizuje ten stan; **nie jest to podgląd ostatniej rewizji na dysku**. Bezpieczny zapis na dysku nadal odpowiada wejściu etapu lub nagrodzie. Odczyt `pillarPose()` pomaga ocenić fazę/chwyt, `metrics()` — warunki renderowania. Te narzędzia nie przyznają ulepszeń i nie zastępują fizycznego pada.

Przy M3-16 można porównać `sessionStorage.getItem('krewetek-buldogul-m3-runs:tab-owner')` w obu kartach: aktywne dokumenty powinny mieć różne identyfikatory. Nie zmieniaj stanu symulacji ani ofert podczas scenariuszy zwykłego gracza.

## Zapis wyników i zgłaszanie błędów

Używaj statusów **Zaliczony**, **Niezaliczony**, **Nieprzeprowadzony** lub **Zablokowany**. Osobny wiersz prowadź dla każdej broni, przeglądarki i połączenia pada, dla których scenariusz powtarzasz. Brak sprzętu/wylosowania to powód braku wykonania; błąd poprzedniego etapu może zablokować dalszy test.

| Data / tester | Commit / adres | Scenariusz | Przeglądarka / obszar strony | Broń / wejście / ulepszenia | Status | Uwagi / nagranie / błąd |
| --- | --- | --- | --- | --- | --- | --- |
| — | — | M3-01 | — | — | Nieprzeprowadzony | — |

Zgłoszenie błędu powinno zawierać ID scenariusza, konkretne kroki, wynik oczekiwany i rzeczywisty, częstotliwość odtworzenia, wersję/adres oraz istotne warunki zapisu/fokusu. Do problemu animacji dołącz nagranie z widocznym HUD i kierunkiem ataku. Błąd uniemożliwiający pełny run, wznowienie lub wybór nagrody, a także niezamierzona utrata/nadpisanie postępu blokują zaliczenie P0.
