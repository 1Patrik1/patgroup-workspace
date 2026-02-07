# httpMyaPP — dokumentace a návrh

**Účel:**

-   Popisuje funkci `httpMyaPP`, jejímž cílem je poskytovat jednoduché HTTP API (GET/POST) pro demonstraci a testování v prostředí Azure Functions.

**Stručné shrnutí:**

-   Endpoint: registrovaný jako `httpMyaPP` v `app.http(...)`.
-   Podporované metody: `GET`, `POST`.
-   Autentizace: `anonymous` (řídí se nastavením v souboru `host.json` / konfiguraci Azure Functions).
-   Chování: vrací textovou odpověď `Hello, <name>!` kde `<name>` je získáno z query parametru `name` nebo z těla požadavku; výchozí hodnota `world`.

## Vstupy

-   Query parametry:
    -   `name` — (volitelně) řetězec; pokud je přítomen, použije se v odpovědi.
-   Tělo požadavku (POST):
    -   Pokud není query `name`, funkce se pokusí přečíst text z těla požadavku a použít ho jako `name`.
-   Hlavičky:
    -   Žádné speciální hlavičky nejsou vyžadovány; standardní `Content-Type` pro POST je doporučen (`text/plain` nebo `application/json`).

## Výstupy

-   HTTP odpověď obsahující prostý text, např. `Hello, Petra!`.
-   Obsah odpovědi: textová hodnota typu `text/plain` (výchozí Content-Type se nastaví platformou, pokud není explicitně definováno).

## Detaily implementace

-   Používá typy z `@azure/functions`: `app`, `HttpRequest`, `HttpResponseInit`, `InvocationContext`.
-   Logování: `context.log(...)` používá se pro základní trace/logging.
-   Asynchronní čtení těla: `await request.text()`.
-   Registrace funkce: volání `app.http('httpMyaPP', { methods: ['GET', 'POST'], authLevel: 'anonymous', handler: httpMyaPP })`.

## Chování podle HTTP metody

-   GET:
    -   Hledá `name` v query parametru.
    -   Pokud není, použije `world`.
-   POST:
    -   Nejprve zkontroluje query `name` (stejné jako GET).
    -   Pokud není, přečte text z těla požadavku a použije ho.
    -   Pokud ani tělo neobsahuje hodnotu, použije `world`.

## Příklad volání

-   GET:

```bash
curl "http://localhost:7071/api/httpMyaPP?name=Petra"
# Odpověď: Hello, Petra!
```

-   POST (text v těle):

```bash
curl -X POST -H "Content-Type: text/plain" --data "Karel" "http://localhost:7071/api/httpMyaPP"
# Odpověď: Hello, Karel!
```

## Chybové stavy a validace

-   Aktuální implementace neprovádí explicitní validaci vstupu a nevrací strukturované chyby; při chybě čtení těla nebo jiné neočekávané chybě funkce by platforma měla vrátit HTTP 500.
-   Doporučení:
    -   Přidat try/catch pro bezpečné zachycení chyb a vrácení JSON chyby ve tvaru `{ error: "message" }` s odpovídajícím status kódem.
    -   Validovat délku / formát `name`, pokud je to potřeba.

## Trace & monitoring

-   Používat `context.log` pro základní telemetry.
-   Pokud projekt používá OpenTelemetry (viz `tracing.js` v kořeni), obalit kritické sekce vlastními span/atributy, například při čtení těla nebo zpracování.

## Testování

-   Jednotkové testy: Mockovat `HttpRequest` a `InvocationContext`, ověřit chování pro:
    -   GET s parametrem `name`.
    -   GET bez parametru.
    -   POST s tělem.
    -   POST s prázdným tělem.
-   Integrační testy: spustit lokálně pomocí `func start` nebo `npm start` a volat endpointy přes `curl`/HTTP klient.

## Bezpečnostní poznámky

-   Aktuálně `authLevel: 'anonymous'` — v produkci zvážit omezení přístupu nebo přidání autentizace.
-   Ujistit se, že velikost těla je omezena (platforma/host.json) proti DoS útokům.

## Návrhy na vylepšení (TODO)

-   Přidat strukturované JSON odpovědi místo prostého textu (pro lepší strojové zpracování).
-   Přidat validaci vstupu a vhodné status kódy (400 pro špatný vstup).
-   Zaznamenávat více metrik (počet volání, prům. délka zpracování) pomocí OpenTelemetry.
-   Přidat jednotkové a integrační testy do CI.

---

_Vytvořeno automaticky jako základní dokumentace funkce `httpMyaPP`. Pokud chcete, mohu dokument upravit do specifického formátu (README, wiki stránka nebo čeština/angličtina) nebo přidat příklad integrace do `host.json`._
