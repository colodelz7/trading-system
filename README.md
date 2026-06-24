# Sistema Comercial - Colodel

Sistema interno de gestão comercial com módulos de orçamentos, contratos, clientes, leads, diagnósticos e relatórios. O frontend roda 100% no navegador sem necessidade de servidor, todos os dados ficam no `localStorage`. O backend é opcional e só entra em cena quando a integração de assinatura digital está configurada.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JavaScript puro (sem framework) |
| Storage | `localStorage` (navegador) |
| Backend | Node.js + Express |
| Assinatura digital | API Autentique (GraphQL) |
| Notificações | Nodemailer (Gmail) + CallMeBot (WhatsApp) |
| Deploy sugerido | Vercel (frontend) / Render (backend) |

## Estrutura

```
├── frontend/
│   ├── index.html      # Entrada da aplicação
│   ├── index.js        # Lógica de UI e negócio
│   ├── db.js           # Camada de dados (localStorage + auth)
│   └── style.css       # Estilos
│
└── backend/
    ├── back.js         # Servidor Express (integração Autentique)
    ├── package.json
    ├── .gitignore
    └── .env.example    # Variáveis de ambiente necessárias
```

## Rodando localmente

### Frontend

Sem build step, basta abrir o `index.html` no navegador ou servir a pasta com qualquer servidor estático:

```bash
npx serve frontend
```

Acesse `http://localhost:3000`.

**Login padrão:** `admin` / `colodel`

> Para adicionar ou alterar usuários, edite o objeto `USERS` em `db.js`.

### Backend (opcional)

Só é necessário se for usar assinatura digital via Autentique.

```bash
cd backend
npm install
cp .env.example .env
npm start
```

## Variáveis de ambiente (backend)

Copie `.env.example` para `.env` e preencha:

| Variável | Descrição |
|---|---|
| `AUTENTIQUE_TOKEN` | Token da API Autentique |
| `APP_TOKEN` | Token compartilhado entre frontend e backend |
| `WEBHOOK_SECRET` | Chave secreta da URL do webhook |
| `CRIADOR_EMAIL` | E-mail titular da conta Autentique |
| `ALLOWED_ORIGIN` | Domínio do frontend (CORS) |
| `PORT` | Porta do servidor (padrão: 3000) |
| `SUPABASE_URL` | URL do projeto Supabase (se usar) |
| `SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (nunca expor no frontend) |
| `MAIL_USER` | Gmail para envio de notificações |
| `MAIL_PASS` | Senha de app do Google |
| `MAIL_TO` | Destinatário dos avisos por e-mail |
| `WHATSAPP_PHONE` | Número com DDI para notificação WhatsApp |
| `CALLMEBOT_APIKEY` | Chave da API CallMeBot |

## Autenticação

O login é gerenciado pelo `db.js` com armazenamento em `localStorage`. As senhas são convertidas para **SHA-256** via Web Crypto API nativa antes de qualquer comparação, nunca ficam em plaintext no storage. A sessão expira automaticamente após 8 horas.

Para adicionar usuários, edite o objeto `USERS` em `db.js`:

```js
const USERS = {
  admin: { nome: 'Admin', senha: 'colodel' },
  pedro: { nome: 'Pedro', senha: 'outrasenha' },
};
```

## Storage

Todos os dados (orçamentos, contratos, clientes, leads, diagnósticos, relatórios) são salvos no `localStorage` sob o prefixo `colodel_`. Não há sincronização entre dispositivos, cada navegador tem sua própria base.

> Limpar os dados do navegador apaga tudo. Considere exportar backups periodicamente se necessário.

## Licença

Uso interno. Não possui licença de distribuição pública.
