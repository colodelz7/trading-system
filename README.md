# Sistema Comercial - Colodel

Sistema interno de gestão comercial com módulos de orçamentos, contratos, clientes, leads, diagnósticos e relatórios.

## Tecnologias

| | |
| Frontend | HTML + CSS + JavaScript |
| Backend | Node.js + Express |
| Storage | `localStorage` |
| PDFs | jsPDF |
| APIs | BrasilAPI + ViaCEP + Autentique + Nodemailer + CallMeBot |

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

Basta abrir o `index.html` no navegador ou servir a pasta com qualquer servidor estático:

```bash
npx serve frontend
```

Acesse `http://localhost:3000`.

**Login padrão:** `admin` / `colodel`

### Backend (opcional)

Só é necessário se for usar assinatura digital via Autentique, recebimento de leads pelo formulário público, envio de notificações por e-mail e WhatsApp, ou recebimento de webhooks de assinatura.

```bash
cd backend
npm install
cp .env.example .env
npm start
```

