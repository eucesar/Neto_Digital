<div align="center">

<img src="assets/img/logo-full.png" alt="Neto Digital" width="320" />

# Neto Digital
### O narrador que fica do lado

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Bootstrap](https://img.shields.io/badge/Bootstrap_5-7952B3?style=flat-square&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/status-demo-blue?style=flat-square)](#)

Aplicativos modernos não foram feitos para as mãos que mais precisam de calma.  
O **Neto Digital** acompanha o idoso no celular e fala, em português simples, o que está acontecendo — antes que o golpe aconteça.

### Demo online

**[https://netodigital.vercel.app](https://netodigital.vercel.app)**

![Demo](docs/screenshots/demo.gif)

</div>

## Sumário

- [Demo online](#demo-online)
- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Requisitos da Global Solution](#requisitos-da-global-solution)
- [Arquitetura](#arquitetura)
- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Segurança e privacidade](#segurança-e-privacidade)
- [ODS da ONU](#ods-da-onu)
- [Roadmap](#roadmap)
- [Autor](#autor)
- [Licença](#licença)

## Sobre o projeto

Muitos idosos travam em telas pequenas, erram dígitos, não sabem o próximo passo e caem em golpes de falso parente ou falsa central. O problema não é “falta de vontade”: é **desigualdade digital** misturada com interfaces hostis e criminosos que exploram a urgência.

A inspiração é a **Dona Gina**, 78 anos, pouca familiaridade com tecnologia, que quer ligar para o neto Cesar, ler uma mensagem da filha Ana e não entregar a senha do banco para um estranho.

O Neto Digital é uma proposta **CitizenTech**: tecnologia a serviço do cidadão, começando pela necessidade real (autonomia e segurança) e só depois escolhendo as ferramentas (visão, IA, dados e nuvem).

## Funcionalidades

- 🗣️ **Narrador em voz alta** (Web Speech API, pt-BR) com fila e prioridades
- 👁️ **Visão da tela** com html2canvas + Gemini (JSON do que “vê”)
- 🛡️ **Alerta de golpe** em ligação e em mensagens (falso parente / número denunciado)
- 📵 **Silenciar** por botão, toque longo ou sacudir (tecla **M** no desktop)
- 🤫 **Modo discreto** com legenda grande e vibração quando disponível
- 📊 **Painel da família** com Chart.js, linha do tempo e CSV
- ☁️ **Firestore em tempo real** com fallback em localStorage
- 🎬 **Painel do apresentador** com selos dos 4 requisitos da GS

## Requisitos da Global Solution

| Tecnologia | Onde aparece no código | O que faz de verdade |
|------------|------------------------|----------------------|
| Visão Computacional | `js/services/vision.service.js` | Captura `#phone-bezel` e envia imagem ao Gemini |
| Inteligência Artificial | `js/services/gemini.service.js`, `js/narrator/scam-detector.js` | Orientação, JSON de tela e classificação de risco |
| Análise de Dados | `js/dashboard/metrics.js`, `painel.html` | Tempo por tarefa, erros, hesitação, golpes |
| Cloud | `js/services/firebase.service.js`, `firestore.rules` | Sessões, eventos e alertas no Firestore |

## Arquitetura

```mermaid
flowchart TB
  Celular[Celular simulado] --> Bus[event-bus]
  Bus --> Narrador
  Narrador --> Voz[speechSynthesis]
  Narrador --> Gemini[Google Gemini]
  Bus --> Firestore[(Cloud Firestore)]
  Gemini --> Apresentador
  Firestore --> PainelFamilia[Painel da família]
  Celular -->|html2canvas| Visao[vision.service]
  Visao --> Gemini
```

Detalhes em [docs/arquitetura.md](docs/arquitetura.md).  
Roteiro do vídeo em [docs/roteiro-demo.md](docs/roteiro-demo.md).

## Stack

| Camada | Tecnologia |
|--------|------------|
| Interface | HTML5, CSS3, Bootstrap 5 (CDN) |
| Lógica | JavaScript ES modules (sem build / sem npm) |
| Voz | Web Speech API (`speechSynthesis`) |
| IA | Google Gemini `gemini-2.5-flash` (camada reaproveitada do NexaTalk IA) |
| Visão | html2canvas (CDN) |
| Gráficos | Chart.js (CDN) |
| Nuvem | Firebase JS SDK modular — **somente Firestore** |
| Hosting | Vercel (demo) · Firebase Hosting (opcional) |

## Como rodar

> Demo publicada: [https://netodigital.vercel.app](https://netodigital.vercel.app)

### Pré-requisitos

- Navegador moderno (Chrome/Edge recomendados para voz)
- Extensão **Live Server** no VS Code (módulos ES não abrem via `file://`)
- Conta Google (chave Gemini) e projeto Firebase (Firestore)

### Passos

```bash
# 1. Entre na pasta do projeto
cd neto-digital

# 2. Copie a configuração
# Windows (PowerShell):
Copy-Item js\config\config.example.js js\config\config.js

# 3. Edite js/config/config.js
#    - GEMINI_API_KEY (mesma do NexaTalk IA / Google AI Studio)
#    - firebaseConfig do seu projeto

# 4. Abra com Live Server a pasta neto-digital (index.html)
```

### Publicar no Firebase Hosting

```bash
firebase login
firebase use SEU_PROJECT_ID
firebase deploy --only hosting
# opcional: firebase deploy --only firestore:rules
```

> Sem chave Gemini a demo **continua** com regras locais.  
> Sem Firestore a demo **continua** com localStorage.

## Estrutura de pastas

```
neto-digital/
├── index.html                 # demo: celular + narrador + apresentador
├── painel.html                # painel de dados da família
├── assets/img/                # logos
├── css/                       # base, phone, narrator, presenter, dashboard
├── js/
│   ├── config/                # config.example.js + config.js (gitignored)
│   ├── core/                  # app, state, event-bus
│   ├── services/              # gemini, vision, firebase, speech, storage
│   ├── narrator/              # motor, frases, memória, golpes
│   ├── phone/                 # telas do celular simulado
│   ├── accessibility/         # silenciar e modo discreto
│   ├── presenter/             # selos e simulações
│   ├── dashboard/             # métricas e gráficos
│   └── data/                  # contatos, números e roteiros
├── docs/                      # arquitetura, roteiro, screenshots
├── firestore.rules
├── firebase.json
├── LICENSE
└── README.md
```

## Segurança e privacidade

- **Não gravamos** imagens da tela, áudio, nomes reais, números completos nem o texto das mensagens — só metadados (`tipo`, `tela`, `alvo`, `risco`).
- A chave do Gemini fica em `js/config/config.js`, fora do Git.
- As `firestore.rules` permitem create restrito e bloqueiam update/delete.
- Em **produção**: chamada Gemini via backend/Cloud Function, Firebase App Check, autenticação, chave Gemini restrita por domínio e somente à API Generative Language, e LGPD com base legal + minimização de dados.

## ODS da ONU

- **ODS 10 — Redução das Desigualdades**: reduz a barreira de uso do celular e protege quem é alvo frequente de golpes digitais.
- **ODS 4 — Educação de Qualidade**: ensina o próximo passo em linguagem acessível, no momento da dúvida — educação contextual, sem infantilizar.

## Roadmap

- App Android nativo com **Serviço de Acessibilidade** (leitura real da tela)
- Piloto com idosos da **Zona Leste de São Paulo**
- Parcerias com bancos, operadoras, CRAS e UBS
- Modo cuidador com consentimento explícito e painel familiar autenticado

## Autor

**Cesar Iglesias Balseiro Neto**  
RM 98007 · Turma 4SIOA · Sistemas de Informação · FIAP  

LinkedIn: [cesar-iglesias-tecnologia](https://www.linkedin.com/in/cesar-iglesias-tecnologia/)

## Licença

Distribuído sob a licença [MIT](LICENSE).

---

<div align="center">

Projeto desenvolvido para a Global Solution do 2º semestre de 2026 da FIAP,  
tema **CitizenTech: Tecnologia a Serviço do Cidadão**.  
Entrega final em novembro de 2026.

</div>
