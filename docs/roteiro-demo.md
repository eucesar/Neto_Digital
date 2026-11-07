# Roteiro da demo (vídeo-pitch técnico · até 5 min)

Persona: **Dona Gina, 78 anos**. Narração ao vivo com legendas e selos acendendo.

## Preparação (antes de gravar)

1. Abrir `index.html` com Live Server.
2. Conferir `js/config/config.js` (Gemini + Firebase).
3. Deixar o painel do apresentador visível.
4. Volume do PC em nível confortável; voz pt-BR disponível.

## Minuto a minuto

### 0:00–0:40 — Problema e proposta
- Mostrar a tela **Começar** com o logo.
- Falar: idosos travam em apps e caem em golpes; o Neto Digital narra o celular em linguagem simples.
- Citar CitizenTech e ODS 10 / ODS 4.

### 0:40–1:20 — Começar e desbloqueio
- Clicar **Começar a demonstração** (libera a voz).
- Narrador: “Boa tarde, Dona Gina…”
- Arrastar para cima → PIN `1234`.
- Mostrar selo **Cloud** ao criar sessão e **Análise de Dados** nos eventos.

### 1:20–2:10 — Uso geral + Visão / IA
- Abrir Telefone; digitar vários dígitos (mostrar agrupamento).
- Hesitar ~8 s → orientação + captura html2canvas.
- Apontar no painel o **JSON que a IA viu** e o selo **Visão Computacional** / **IA**.

### 2:10–3:20 — Golpe por ligação
- Painel: **Simular ligação de golpe**.
- Alerta antes de atender (número denunciado).
- Atender → legenda do golpista pedindo senha/Pix.
- Tela cheia vermelha + “Quer que eu ligue para o Cesar?” → **Sim**.

### 3:20–4:00 — Golpe no WhatsApp + acessibilidade
- **Simular mensagem de golpe**.
- Mostrar alerta mesmo após **Silenciar** (toque ou tecla **M**).
- Modo discreto: legenda grande.

### 4:00–4:40 — Painel da família
- Abrir `painel.html`.
- Gráficos Chart.js + linha do tempo + exportar CSV.
- Cards de chamadas à IA vs narrações locais.

### 4:40–5:00 — Fechamento
- Diferencial: voz humana + visão + cloud + custo baixo (regras locais).
- Roadmap: Android Accessibility Service, piloto Zona Leste SP.
- Assinatura: Cesar Iglesias Balseiro Neto · RM 98007 · 4SIOA.

## Checklist dos 4 requisitos na tela

| Tecnologia | Quando acende |
|------------|---------------|
| Visão Computacional | Troca de tela / hesitação (html2canvas → Gemini) |
| IA | Visão, frase natural ou classificação de golpe |
| Análise de Dados | Eventos → métricas / gráficos |
| Cloud | Gravação Firestore / onSnapshot |
