# Revisões App (RVA)

App de estudos para instalar no celular ou no computador. Ele abre pelo navegador e pode ser adicionado à tela inicial.

## O que já funciona (Etapa 1)

- **Entrada**: nome + login com Google, Apple ou e-mail. Sem o Firebase configurado, o app roda em *modo de teste*, salvando só no aparelho.
- **Revisões**: matérias e cartões de pergunta e resposta, com **revisão espaçada**. Acertou, o cartão volta em 1, 3, 7, 15, 30, 60 e depois 120 dias. Errou, volta amanhã e se repete na mesma sessão.
- **Início**: quantos cartões vencem hoje, os dias seguidos de estudo e o total de cartões.
- **Foco**: cronômetro de 25 min de foco + 5 de pausa, ajustável, com aviso sonoro. O player de música usa arquivos do próprio aparelho e toca só durante o foco (opcional).
- **Perfil**: nome, tema claro/escuro/automático, instalar o app e sair.
- **IA**: telas reservadas para o Chat, o Criar (Etapa 2) e os Slides (Etapa 3).

## Rodar no computador

```bash
npm install
npm run dev
```

## Ligar o login e a nuvem (Firebase)

1. Crie um projeto em https://console.firebase.google.com.
2. Em **Authentication → Método de login**, ative **Google**, **E-mail/senha** e, se quiser, **Apple**. A Apple exige uma conta Apple Developer, que é paga.
3. Em **Firestore Database**, crie o banco e cole o conteúdo de `firestore.rules` na aba **Regras**.
4. Em **Configurações do projeto → Seus apps**, adicione um app **Web** e copie os valores para um arquivo `.env`, usando `.env.example` como modelo.
5. Em **Authentication → Configurações → Domínios autorizados**, adicione o endereço onde o app for publicado.

## Publicar

Hospedagem gratuita na Vercel: importe o repositório em https://vercel.com, coloque as variáveis do `.env` em *Environment Variables* e publique. O comando de build é `npm run build` e a pasta de saída é `dist`.

## Ícone

RVA em branco sobre fundo preto. Para regerar os PNGs a partir do script: `npm run icones` (precisa de Python + Pillow).
