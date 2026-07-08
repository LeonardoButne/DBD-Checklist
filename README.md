# Checklist QA · SmartIZI (Lab Cartões)

Painel web para gerir a checklist de testes do SmartIZI, com partilha em
tempo (quase) real entre colegas via link.

## Estrutura do projecto

```
/index.html         → a aplicação (frontend, tudo num único ficheiro)
/api/checklist.js    → função serverless que lê/escreve no Redis (Upstash)
/package.json        → dependência da SDK do Upstash Redis
```

## Como funciona a partilha

1. Fazes o onboarding e clicas "Começar checklist →".
2. A app cria automaticamente um registo partilhado (ex: `CHK-7F3K2Q`) e
   mostra-te um link para copiar.
3. Envias o link aos colegas (Slack, Teams, email...). Ao abrirem, entram
   directamente na mesma checklist — sem onboarding.
4. Qualquer alteração (estado OK/NOT OK/N/A, observações, edição da
   estrutura) é gravada e propagada aos outros num intervalo de ~2,5
   segundos (a app verifica sozinha, sem precisares de dar F5).
5. Quem tem o link edita livremente — não há login nem permissões.
6. As checklists partilhadas expiram automaticamente ao fim de **120 dias**
   sem uso (só para não acumular lixo na base de dados; exportar para Excel
   continua a funcionar a qualquer momento antes disso).

---

## Passo a passo do deploy

### 1. Preparar o repositório no GitHub

Cria um repositório novo e garante que fica **exactamente** com esta
estrutura na raiz (o nome `index.html` importa — é o que o Vercel serve por
omissão):

```
teu-repo/
├── index.html
├── package.json
├── .gitignore
└── api/
    └── checklist.js
```

Faz commit e push desses 4 itens.

### 2. Importar o projecto no Vercel

1. Em [vercel.com](https://vercel.com) → **Add New → Project**.
2. Escolhe o repositório que acabaste de criar.
3. Não precisas de configurar Build Command nem Output Directory — deixa
   tudo por omissão (o Vercel detecta sozinho: serve o `index.html` como
   página estática e o `api/checklist.js` como função serverless).
4. Clica **Deploy**. Vais ter um URL do género
   `https://o-teu-projecto.vercel.app` — nesta fase a app já abre, mas a
   partilha ainda não funciona (falta o Redis).

### 3. Ligar a base de dados (Upstash Redis)

1. Dentro do projecto no Vercel, vai ao separador **Storage**.
2. **Create Database** (ou **Browse Marketplace**) → escolhe **Upstash** →
   **Redis**.
3. Segue o assistente: cria uma base de dados nova (o tier gratuito chega
   perfeitamente para isto) e **liga-a a este projecto**.
4. Isto injecta automaticamente as variáveis de ambiente necessárias
   (`KV_REST_API_URL` e `KV_REST_API_TOKEN`) — não precisas de copiar nada
   à mão, o `api/checklist.js` já as lê sozinho via `Redis.fromEnv()`.
5. Volta ao separador **Deployments** e faz **Redeploy** do último deploy
   (para a função apanhar as novas variáveis de ambiente).

### 4. Testar

1. Abre o URL do projecto, faz o onboarding e clica "Começar checklist →".
2. Deve aparecer um modal com um link (`.../?id=CHK-XXXXXX`) e um botão
   "Copiar".
3. Abre esse link numa janela anónima/outro browser — deves cair
   directamente na mesma checklist.
4. Marca um item como OK numa janela e espera ~3 segundos — deve aparecer
   actualizado na outra.

Se o passo 4 não sincronizar, o suspeito principal é sempre o mesmo: as
variáveis de ambiente do Redis não chegaram à função (falta o redeploy do
passo 3.5) — confirma em **Project Settings → Environment Variables** que
`KV_REST_API_URL` e `KV_REST_API_TOKEN` aparecem lá.

---

## Notas importantes

- **Sem autenticação**: qualquer pessoa com o link edita livremente. Não há
  forma de saber quem alterou o quê. Para uma ferramenta interna de equipa
  pequena isto costuma ser aceitável — mas fica registado aqui caso um dia
  precises de evoluir para isso.
- **Sincronização por intervalo (polling), não instantânea**: as
  actualizações demoram até ~2,5 segundos a aparecer nos outros
  browsers. Não é um WebSocket em tempo real — foi uma escolha deliberada
  para manter a solução simples de montar e de manter.
- **Enquanto alguém escreve numa observação**, a app não aplica
  actualizações remotas nesse momento (para não apagar o que a pessoa está
  a escrever) — assim que ela sai do campo, volta a sincronizar
  normalmente.
- **Templates e observações frequentes continuam locais** a cada
  computador (não são partilhados) — só o conteúdo da checklist em si
  (estados, observações, estrutura) é que é partilhado.
