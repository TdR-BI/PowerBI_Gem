
# Snake AI

Een Snake-spel als Microsoft Fabric-app. De agent gebruikt tabular Q-learning en traint automatisch zolang de app openstaat.

Kies **Zelf spelen** om met de pijltjestoetsen of WASD te sturen. De agent leert van de gekozen acties, het voedsel dat je pakt en botsingen. Schakel terug naar **AI** om de opgebouwde kennis zelf te laten toepassen.

## Lokaal starten

```powershell
npm install
npm run dev
```

De Q-table en trainingsstatistieken worden lokaal in de browser opgeslagen en blijven behouden na een paginaverversing. De knop 'Wis het geleerde model' verwijdert deze gegevens. De training wordt niet naar Fabric of een andere browser gesynchroniseerd.

## Techniek

- Rayfin 2.0 voor de Fabric-appstructuur en Fabric-authenticatie.
- Phaser 3.90.0 voor de game-loop en canvas-rendering.
- Q-learning met epsilon-greedy actie-selectie, een routebonus voor voedsel naderen en straf voor botsingen.

De app is nog niet naar een Fabric-workspace gedeployed.