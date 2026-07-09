# Checklist QA · SmartIZI (Lab Cartões)

Painel web para gerir a checklist de testes do SmartIZI, com partilha em
tempo real entre colegas via link (Firebase Realtime Database).

## Estrutura do projecto

```
/index.html   → a aplicação inteira (frontend + ligação ao Firebase)
```

Não há função serverless nem base de dados própria a gerir — o `index.html`
fala directamente com o Firebase a partir do browser.

## Como funciona a partilha

1. Fazes o onboarding e clicas "Começar checklist →".
2. A app cria automaticamente um registo partilhado (ex: `CHK-7F3K2Q`) no
   Firebase Realtime Database e mostra-te um link para copiar.
3. Envias o link aos colegas. Ao abrirem, entram directamente na mesma
   checklist — sem onboarding.
4. Qualquer alteração (estado OK/NOT OK/N/A, observações, edição da
   estrutura) é **empurrada instantaneamente** para todos os colegas
   ligados a essa checklist — sem atraso, sem verificações periódicas.
5. Quem tem o link edita livremente — não há login nem permissões.

---

## Passo a passo do deploy

### 1. Criar o projecto Firebase e activar o Realtime Database

1. Em [console.firebase.google.com](https://console.firebase.google.com),
   cria (ou usa) o projecto.
2. No menu lateral: **Build → Realtime Database → Create Database**.
3. Escolhe a localização (qualquer uma serve para este caso) e começa em
   modo bloqueado — vamos definir as regras já a seguir.
4. Copia o **URL da base de dados**, que aparece no topo da página do
   Realtime Database (algo como
   `https://o-teu-projecto-default-rtdb.europe-west1.firebasedatabase.app`).
5. Abre o `index.html` e substitui `COLOCA_AQUI_O_TEU_DATABASE_URL` no
   objecto `firebaseConfig` (perto do topo do `<script type="module">`)
   por esse URL.

### 2. Definir as regras de acesso

No separador **Rules** do Realtime Database, substitui pelo seguinte (só
permite ler/escrever dentro de `/checklists/{id}` — não abre a base de
dados toda):

```json
{
  "rules": {
    "checklists": {
      "$id": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Clica **Publish**. Isto mantém o mesmo princípio que já combinámos: quem
tem o link de uma checklist específica edita-a livremente, sem login.

### 3. Publicar no Vercel

Continua exactamente como antes: faz commit/push do `index.html` para o
GitHub, e o Vercel volta a fazer deploy automaticamente. Já não é preciso
nenhuma configuração de Storage/Environment Variables no Vercel — essa
parte passou a ser tratada inteiramente pelo Firebase.

### 4. Testar

1. Abre o URL do projecto, faz o onboarding e clica "Começar checklist →".
2. Deve aparecer o link de partilha.
3. Abre esse link numa janela anónima/outro browser.
4. Marca um item como OK numa janela — deve aparecer **imediatamente** na
   outra (não há mais o atraso de ~2,5s de antes).

Se não sincronizar, os suspeitos mais prováveis são: o `databaseURL` não
foi substituído correctamente no `index.html`, ou as regras do passo 2
não foram publicadas.

---

## Notas importantes

- **Sem autenticação**: qualquer pessoa com o link edita livremente.
- **Sincronização instantânea (push), não por intervalo**: ao contrário
  da versão anterior (Vercel + Redis, que verificava a cada ~2,5s), esta
  versão usa uma ligação em tempo real do Firebase — as alterações
  aparecem assim que acontecem, e não há custo por "verificação".
- **Enquanto alguém escreve numa observação**, a app não aplica
  actualizações remotas nesse campo nesse momento (para não apagar o que
  a pessoa está a escrever) — assim que sai do campo, a app vai buscar
  automaticamente qualquer alteração que tenha ficado por aplicar.
- **Templates e observações frequentes continuam locais** a cada
  computador (não são partilhados) — só o conteúdo da checklist em si
  (estados, observações, estrutura) é que é partilhado via Firebase.
- **Plano gratuito (Spark)**: o Realtime Database inclui 100 ligações
  simultâneas e uma quota de dados generosa — para uma equipa pequena a
  usar isto ocasionalmente, está muito longe de ser atingido.
