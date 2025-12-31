# patgroup-workspace

Repository for PATGROUP workspace. Contains configuration and tooling (Prettier).

## Usage

- Run `npm run format` to format files with Prettier.

# PATGROUP Workspace

Krátký návod pro tým — obsahuje doporučení a základní příkazy.

## Doporučená rozšíření

- github.copilot-chat
- eamodio.gitlens
- esbenp.prettier-vscode
- dbaeumer.vscode-eslint
- ms-python.python
- redhat.vscode-yaml

VS Code by měl nabídnout instalaci doporučených rozšíření z `/.vscode/extensions.json`.

## Rychlé příkazy

- Nainstalovat závislosti (pokud je projekt Node):

```bash
npm install
```

- Naformátovat všechny soubory pomocí Prettier (použije `npx`, pokud Prettier není lokálně nainstalovaný):

```bash
npx prettier --write .
```

- Spustit testy (pokud jsou definovány):

```bash
npm test
```

## Workspace nastavení

Konfigurace editoru a doporučená nastavení jsou v `/.vscode/settings.json` a `/.editorconfig`.

## Poznámky

- Pokud chcete, mohu spustit `npx prettier --write .` teď.

## Nasazení (Deployment)

Aplikace může být nasazena na různých platformách:

### Render.com

1. Připojte GitHub repozitář na [Render.com](https://render.com)
2. Render automaticky detekuje `render.yaml` konfiguraci
3. Aplikace se nasadí automaticky

### Docker

```bash
# Vytvořit Docker image
docker build -t patgroup-workspace .

# Spustit container
docker run -p 3000:3000 patgroup-workspace
```

### Railway / Heroku

Tyto platformy automaticky detekují Node.js aplikaci a použijí `npm start` příkaz z `package.json`.
