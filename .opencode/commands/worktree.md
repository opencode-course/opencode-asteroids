---
description: Crea un git worktree en .worktrees/ con nombre derivado del argumento
agent: build
---

Contexto del worktree: $ARGUMENTS

Instrucciones:

1. Deriva un nombre corto para el worktree a partir del contexto anterior (puede
   contener espacios). El nombre debe estar en kebab-case: minúsculas, sin
   acentos, palabras separadas por guiones. Si el contexto está vacío, pide el
   nombre al usuario antes de continuar.
2. Ejecuta exactamente este comando, sustituyendo <nombre> por el nombre derivado:

   git worktree add .worktrees/<nombre>

3. Si los argumentos son muy largos, simplificalo a un nombre significativo

No hagas nada más: no cambies de directorio, no crees ni modifiques archivos, no
hagas commits ni ninguna acción adicional. Solo ejecuta el comando y reporta el
resultado.
