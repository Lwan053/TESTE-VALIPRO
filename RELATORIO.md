# ValiPro — Relatório de Correções

## Arquivos alterados
- **firebase-config.js** — passou a ser a única fonte de config; exporta `auth`, `db` e as coleções (`produtosCollection`, `catalogoCollection`, `setoresCollection`, `colaboradoresCollection`).
- **script.js** — reescrito para importar de `firebase-config.js` (elimina duplicação). Correções:
  - Adicionada função `renderMarcadosTable()` que antes era chamada mas não existia (quebrava o card "MARCADOS").
  - Estrela de marcação agora fica dentro de `<td>` com `<button>` — HTML válido, evento estável.
  - `updateDoc` importado no topo (não mais import dinâmico dentro do clique).
  - Delegação de eventos em `tableBody`, `sectorTableBody`, `colaboradorTableBody` (não re-vincula listeners a cada snapshot).
  - `count-conferidos` agora significa "em dia (>10 dias)" — antes era igual a `count-coletados`.
  - Importação CSV com **deduplicação** por código de barras (reimportar o mesmo arquivo não gera duplicatas).
  - Logout usa `signOut(auth)` do Firebase Auth.
- **login-script.js** — substituído o `setTimeout` fake por `signInWithEmailAndPassword` real. Persistência respeita o "Lembrar meus dados". Tradução das mensagens de erro do Firebase para PT-BR. Se já tem sessão, redireciona direto para `painel.html`.
- **index.html** — adicionado `<link rel="manifest">`, `<meta name="theme-color">` e registro do Service Worker. Script de login carregado como `type="module"`.
- **painel.html** — adicionado *auth guard* em `<script type="module">` no `<head>`: se `onAuthStateChanged` retornar `null`, redireciona para `index.html`. Também: `<link rel="manifest">`, `theme-color`, registro do SW, `<th>` extra para coluna da estrela, IDs para contadores de Rebaixas/Lojas/Fornecedor (agora possíveis de popular sem editar HTML).
- **sw.js** — cache atualizado para incluir `painel.html`, `login-script.js`, `login-style.css`. `cache.addAll` substituído por `Promise.allSettled(cache.add)` — 404 em um arquivo não invalida a instalação inteira. Estratégia de fetch: **network-first** com fallback para cache, ignorando explicitamente hosts do Firebase (`googleapis.com`, `gstatic.com`) para não interferir com Firestore/Auth.

## Arquivo para apagar
- **login-script.html** — arquivo residual (era o painel antigo com nome errado). Não referenciado por nada.

## Pré-requisitos para funcionar
1. **Habilitar Email/Password** no console do Firebase: Authentication → Sign-in method → Email/Password → Enable.
2. **Cadastrar ao menos um usuário** em Authentication → Users → Add user.
3. Criar os ícones `logo192x192.png` e `logo512x512.png` referenciados no `manifest.json` (senão o "instalar app" não aparece em alguns navegadores).
4. Definir **regras de segurança do Firestore** — hoje qualquer um com o `apiKey` (pública) pode ler/escrever. Sugestão mínima:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

## Ainda pendente (não crítico)
- Contadores de **Rebaixas / Lojas / Fornecedor** — HTML já tem IDs prontos, mas ainda não há coleção Firestore correspondente.
- **Notificação (badge do sininho)** — hoje inicia oculta (`hidden`); ligar depois em `updateCounters` se quiser mostrar quantos vencem hoje/amanhã.
- **CSS grande** (`style.css`, 963 linhas) — mantido como está (você pediu para não mexer no visual).
