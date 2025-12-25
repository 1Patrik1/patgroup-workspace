# patgroup-workspace

Repository for PATGROUP workspace. Contains configuration and tooling (Prettier).

## Usage

- Run `npm run format` to format files with Prettier.
# PATGROUP Workspace

Krátký návod pro tým — obsahuje doporučení a základní příkazy.

## Doporučená rozšíření

-   github.copilot-chat
-   eamodio.gitlens
-   esbenp.prettier-vscode
-   dbaeumer.vscode-eslint
-   ms-python.python
-   redhat.vscode-yaml

VS Code by měl nabídnout instalaci doporučených rozšíření z `/.vscode/extensions.json`.

## Rychlé příkazy

-   Nainstalovat závislosti (pokud je projekt Node):

```bash
npm install
```

-   Naformátovat všechny soubory pomocí Prettier (použije `npx`, pokud Prettier není lokálně nainstalovaný):

```bash
npx prettier --write .
```

-   Spustit testy (pokud jsou definovány):

```bash
npm test
```

## Workspace nastavení

Konfigurace editoru a doporučená nastavení jsou v `/.vscode/settings.json` a `/.editorconfig`.

## Poznámky

-   Pokud chcete, mohu spustit `npx prettier --write .` teď.
